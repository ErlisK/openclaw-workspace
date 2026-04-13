import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/sandbox/batch  — queue N tests and return a job_id
// The caller polls GET /api/sandbox/batch?job=<job_id>
// Tests run sequentially server-side (Vercel function, 60s limit)

const STYLE_PROMPTS: Record<string, string> = {
  'coloring-book-thick':
    "children's coloring book, thick bold black outlines, white background, no shading, no color",
  'coloring-book-standard':
    "kids coloring book, black outlines on white, no shading, no color, line drawing",
  'sketch-outline':
    "pencil sketch outline, black on white, no fill, coloring page",
  'manga-simple':
    "manga line art, thick black outlines, white background, no color, cute, coloring book",
}

const AGE_PROMPTS: Record<string, string> = {
  '4-6': 'very simple large shapes, minimal detail, bold thick lines',
  '6-8': 'moderate detail, clear outlines, 8-12 colorable regions',
  '8-11': 'more detail, decorative patterns',
}

const BATCH_SUBJECTS = [
  { text: 'cute dinosaur and unicorn exploring outer space', concept: 'story-to-book' as const },
  { text: 'friendly dragon and brave knight at a magical castle', concept: 'story-to-book' as const },
  { text: 'little mermaid swimming with colorful fish', concept: 'story-to-book' as const },
  { text: 'wizard casting a rainbow spell in enchanted forest', concept: 'story-to-book' as const },
  { text: 'cute T-rex playing soccer on a sunny field', concept: 'interest-packs' as const },
  { text: 'happy astronaut floating near the moon with stars', concept: 'interest-packs' as const },
  { text: 'friendly robot building a rocket ship in a workshop', concept: 'interest-packs' as const },
  { text: 'colorful butterfly in a flower garden', concept: 'interest-packs' as const },
  { text: 'brave hero walking through a magical glowing forest', concept: 'adventure-builder' as const },
  { text: 'spaceship landing on a colorful alien planet', concept: 'adventure-builder' as const },
]

async function generateOne(
  subject: string, concept: string, style: string, age: string,
  model: string, seed: number
): Promise<{ success: boolean; latency_ms: number; image_url: string | null; file_size: number; error: string | null }> {
  const styleDesc = STYLE_PROMPTS[style] || STYLE_PROMPTS['coloring-book-thick']
  const ageDesc   = AGE_PROMPTS[age] || AGE_PROMPTS['6-8']
  const prompt    = `${subject}, ${styleDesc}, ${ageDesc}`
  const enc       = encodeURIComponent(prompt)
  const url       = `https://image.pollinations.ai/prompt/${enc}?model=${model}&width=768&height=768&nologo=true&seed=${seed}`

  const t0 = Date.now()
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(90_000) })
    const ms   = Date.now() - t0
    if (resp.ok && (resp.headers.get('content-type') || '').startsWith('image/')) {
      const buf = await resp.arrayBuffer()
      const ok  = buf.byteLength > 10_000
      return { success: ok, latency_ms: ms, image_url: ok ? url : null, file_size: buf.byteLength, error: null }
    }
    return { success: false, latency_ms: ms, image_url: null, file_size: 0, error: `HTTP ${resp.status}` }
  } catch (e) {
    return { success: false, latency_ms: Date.now() - t0, image_url: null, file_size: 0, error: String(e) }
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as {
    styles?: string[]
    age_range?: string
    model?: string
    limit?: number
    test_run?: string
  }

  const styles    = body.styles    || ['coloring-book-thick', 'coloring-book-standard']
  const age_range = body.age_range || '6-8'
  const model     = body.model     || 'flux'
  const limit     = Math.min(20, body.limit || 10)
  const test_run  = body.test_run  || `batch-${Date.now()}`

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const subjects = BATCH_SUBJECTS.slice(0, limit)
  const results: { subject: string; style: string; success: boolean; latency_ms: number; image_url: string | null }[] = []

  for (const subj of subjects) {
    for (const style of styles) {
      const seed   = Math.floor(Math.random() * 100000)
      const result = await generateOne(subj.text, subj.concept, style, age_range, model, seed)

      const row = {
        test_run,
        provider: 'pollinations',
        model_id: `pollinations/${model}`,
        model_variant: `pollinations/${model}`,
        concept: subj.concept,
        style,
        subject: subj.text.slice(0, 100),
        age_range,
        prompt: `${subj.text}, ${STYLE_PROMPTS[style]}, ${AGE_PROMPTS[age_range]}`.slice(0, 500),
        prompt_template: `${subj.concept}-${style}`,
        latency_ms: result.latency_ms,
        success: result.success,
        cost_estimate: 0,
        safety_passed: true,
        image_url: result.image_url || '',
        artifacts: { image_url: result.image_url || '', width: 768, height: 768,
                     file_size_bytes: result.file_size, content_type: 'image/jpeg' },
        data_source: 'live' as const,
        error_message: result.error || undefined,
        notes: `Batch test ${test_run}`,
      }
      await sb.from('gen_tests').insert(row)
      results.push({ subject: subj.text, style, success: result.success,
                     latency_ms: result.latency_ms, image_url: result.image_url })
    }
  }

  const successes = results.filter(r => r.success)
  return NextResponse.json({
    test_run,
    total:    results.length,
    success:  successes.length,
    results,
    message: `Batch complete: ${successes.length}/${results.length} succeeded`,
  })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const test_run = searchParams.get('test_run')
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
  const query = sb.from('gen_tests').select('*').eq('data_source', 'live').order('created_at', { ascending: false })
  if (test_run) query.eq('test_run', test_run)
  const { data, error } = await query.limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tests: data || [] })
}
