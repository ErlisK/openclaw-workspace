import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateAndStore } from '@/lib/generator'

export const maxDuration = 120  // Vercel Pro allows up to 300s

/**
 * POST /api/v1/generate/batch
 *
 * Server-side batch generation for all pending pages in a session.
 * Called once by the client when the preview page loads and pages are 'pending'.
 *
 * Body: { sessionId }
 *
 * Flow:
 *   1. Load all 'pending' pages for the session
 *   2. Mark session as 'generating'
 *   3. Generate pages sequentially (Pollinations rate-limit friendly)
 *      - Each page: generateAndStore() → updates DB → Realtime broadcasts to client
 *   4. Mark session 'complete' when all done
 *   5. Return summary: { ok, pages: [{pageNumber, imageUrl, latencyMs, attempts}] }
 *
 * The client uses Supabase Realtime to receive page updates in real-time
 * without polling — each DB row update auto-broadcasts to subscribed clients.
 */

type Page = {
  id: string
  page_number: number
  sort_order: number
  prompt: string | null
  subject: string | null
  status: string
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  let body: { sessionId?: string }
  try {
    body = await req.json() as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { sessionId } = body
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  }

  const sb = admin()

  // Load session
  const { data: session, error: sessErr } = await sb
    .from('trial_sessions')
    .select('id, status, page_count, config')
    .eq('id', sessionId)
    .single()

  if (sessErr || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // Load pending pages
  const { data: pages, error: pagesErr } = await sb
    .from('trial_pages')
    .select('id, page_number, sort_order, prompt, subject, status')
    .eq('session_id', sessionId)
    .in('status', ['pending', 'failed'])   // allow retry of failed pages too
    .order('sort_order', { ascending: true })

  if (pagesErr) {
    return NextResponse.json({ error: pagesErr.message }, { status: 500 })
  }

  if (!pages || pages.length === 0) {
    return NextResponse.json({ ok: true, pages: [], message: 'No pending pages' })
  }

  // Mark session as generating
  await sb.from('trial_sessions')
    .update({ status: 'generating' })
    .eq('id', sessionId)

  await sb.from('events').insert({
    event_name: 'generation_started',
    session_id: sessionId,
    properties: { page_count: pages.length, server_side: true },
  })

  const results: { pageNumber: number; imageUrl: string | null; latencyMs: number; attempts: number; error?: string }[] = []
  const model  = (session as { config?: { model?: string } }).config?.model ?? 'flux'

  for (const page of pages as Page[]) {
    const prompt = page.prompt ?? page.subject ?? 'cute friendly coloring page, children coloring book style'
    const seed   = Math.abs(Math.floor(Math.random() * 2_000_000))

    try {
      const result = await generateAndStore(sessionId, page.page_number, prompt, seed, { model })
      results.push({
        pageNumber: page.page_number,
        imageUrl:   result.imageUrl,
        latencyMs:  result.latencyMs,
        attempts:   result.attempts,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[batch] page=${page.page_number} session=${sessionId} error:`, msg)
      results.push({ pageNumber: page.page_number, imageUrl: null, latencyMs: 0, attempts: 3, error: msg })
    }

    // Small breathing room between pages to be rate-limit friendly
    if (page.page_number < pages.length) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  // Determine final session status
  const anyComplete = results.some(r => r.imageUrl !== null)
  const allComplete = results.every(r => r.imageUrl !== null)
  const finalStatus = allComplete ? 'complete' : anyComplete ? 'partial' : 'failed'

  await sb.from('trial_sessions')
    .update({
      status:      finalStatus,
      complete_at: allComplete ? new Date().toISOString() : null,
    })
    .eq('id', sessionId)

  if (allComplete) {
    await sb.from('events').insert({
      event_name: 'book_complete',
      session_id: sessionId,
      properties: {
        page_count:   results.length,
        total_ms:     results.reduce((s, r) => s + r.latencyMs, 0),
        avg_ms:       Math.round(results.reduce((s, r) => s + r.latencyMs, 0) / results.length),
        server_side:  true,
      },
    })
  }

  return NextResponse.json({
    ok:           allComplete,
    status:       finalStatus,
    pages:        results,
    completedCount: results.filter(r => r.imageUrl).length,
    failedCount:    results.filter(r => !r.imageUrl).length,
  })
}
