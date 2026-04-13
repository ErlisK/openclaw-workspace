import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ── Config ────────────────────────────────────────────────────────────────────

const STYLE_PROMPTS: Record<string, string> = {
  'coloring-book-thick':
    "children's coloring book page, thick bold black outlines only, pure white background, no shading, no gray, no color fill, simple enclosed regions, printable line art",
  'coloring-book-standard':
    "kids coloring book illustration, black outlines on white background, no shading, no color, clean line drawing, printable, child-friendly",
  'sketch-outline':
    "pencil sketch outline only, black lines on white, no fill, no shading, simple coloring page",
  'manga-simple':
    "simple manga line art, thick black outlines, white background, no color, no shading, cute characters, coloring book page",
}

const AGE_PROMPTS: Record<string, string> = {
  '4-6':  'very simple large shapes, minimal detail, bold thick lines',
  '6-8':  'moderate detail, 8-12 colorable regions, clear outlines',
  '8-11': 'more detail, decorative patterns, clean closed lines',
}

const NEGATIVE_PROMPT =
  'color fill, shading, gray tones, cross-hatching, photorealistic, 3D, scary, ' +
  'violent, text, watermark, blurry, open paths, dark background'

function buildPrompt(subject: string, style: string, age: string): string {
  const styleDesc = STYLE_PROMPTS[style] || STYLE_PROMPTS['coloring-book-thick']
  const ageDesc   = AGE_PROMPTS[age]   || AGE_PROMPTS['6-8']
  return `${subject}, ${styleDesc}, ${ageDesc}`
}

function buildPollinationsUrl(prompt: string, model: string, seed: number): string {
  const enc = encodeURIComponent(prompt)
  return (
    `https://image.pollinations.ai/prompt/${enc}` +
    `?model=${model}&width=768&height=768&nologo=true&seed=${seed}&negative_prompt=${encodeURIComponent(NEGATIVE_PROMPT)}`
  )
}

// ── POST /api/sandbox/generate ────────────────────────────────────────────────

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as {
    subject?: string
    concept?: string
    style?: string
    age_range?: string
    provider?: string
    model?: string
    test_run?: string
  }

  const {
    subject    = 'cute dinosaur in space',
    concept    = 'story-to-book',
    style      = 'coloring-book-thick',
    age_range  = '6-8',
    provider   = 'pollinations',
    model      = 'flux',
    test_run   = 'sandbox-live',
  } = body

  if (!subject || subject.length < 3) {
    return NextResponse.json({ error: 'subject is required (min 3 chars)' }, { status: 400 })
  }

  const prompt   = buildPrompt(subject, style, age_range)
  const seed     = Math.floor(Math.random() * 100000)
  const imageUrl = buildPollinationsUrl(prompt, model, seed)

  const t0 = Date.now()
  let success    = false
  let latency_ms = 0
  let fileSizeBytes = 0
  let errorMessage: string | null = null
  let finalImageUrl: string | null = null

  try {
    const resp = await fetch(imageUrl, {
      signal: AbortSignal.timeout(90_000),
    })
    latency_ms = Date.now() - t0

    if (resp.ok && (resp.headers.get('content-type') || '').startsWith('image/')) {
      const buf = await resp.arrayBuffer()
      fileSizeBytes = buf.byteLength
      success = fileSizeBytes > 10_000  // sanity: at least 10KB
      finalImageUrl = imageUrl           // Pollinations CDN caches on URL
    } else {
      const txt = await resp.text().catch(() => '')
      errorMessage = `HTTP ${resp.status}: ${txt.slice(0, 200)}`
    }
  } catch (err) {
    latency_ms    = Date.now() - t0
    errorMessage  = String(err).slice(0, 200)
  }

  // ── Persist to gen_tests ──────────────────────────────────────────────────
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const row = {
    test_run,
    provider,
    model_id:      `${provider}/${model}`,
    model_variant: `${provider}/${model}`,
    concept,
    style,
    subject:       subject.slice(0, 100),
    age_range,
    prompt:        prompt.slice(0, 500),
    prompt_template: `${concept}-${style}`,
    latency_ms:    success ? latency_ms : 0,
    success,
    cost_estimate: 0,         // Pollinations is free
    safety_passed: true,
    image_url:     finalImageUrl || '',
    artifacts:     {
      image_url:        finalImageUrl || '',
      width:            768,
      height:           768,
      file_size_bytes:  fileSizeBytes,
      content_type:     'image/jpeg',
      prompt_url:       imageUrl,
    },
    data_source:  'live',
    error_message: errorMessage || undefined,
    notes:        `Live test from sandbox UI. Provider: ${provider}/${model}`,
  }

  const { data: inserted, error: dbErr } = await sb
    .from('gen_tests')
    .insert(row)
    .select('id')
    .single()

  if (dbErr) console.error('[sandbox/generate] DB error:', dbErr.message)

  return NextResponse.json({
    id:          inserted?.id || null,
    success,
    latency_ms,
    image_url:   finalImageUrl,
    prompt,
    seed,
    provider:    `${provider}/${model}`,
    file_size_bytes: fileSizeBytes,
    error:       errorMessage,
    message:     success
      ? `Generated in ${(latency_ms / 1000).toFixed(1)}s (${(fileSizeBytes / 1024).toFixed(0)}KB)`
      : `Failed: ${errorMessage}`,
  })
}

// ── GET /api/sandbox/generate — fetch recent tests ───────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(50, Number(searchParams.get('limit') || 20))

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data, error } = await sb
    .from('gen_tests')
    .select('id,model_variant,concept,style,subject,success,latency_ms,overall_quality,pass_threshold,cost_estimate,image_url,data_source,created_at')
    .eq('data_source', 'live')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tests: data || [] })
}
