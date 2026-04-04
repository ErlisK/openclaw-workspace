import { checkRateLimit, rateLimit429 } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateAndStore } from '@/lib/generator'

export const maxDuration = 55  // Vercel Pro: up to 300s; Hobby: 60s

/**
 * POST /api/v1/generate/worker
 *
 * Server-side single-page generation worker.
 * Called by the batch endpoint or directly from the client for retries.
 *
 * Body: { sessionId, pageNumber, prompt, seed?, subject?, model?, width?, height? }
 *
 * Flow:
 *   1. Validate session exists
 *   2. Call generateAndStore() — fetches from Pollinations, uploads to Storage, updates DB
 *   3. Supabase Realtime auto-broadcasts the trial_pages UPDATE to subscribed clients
 *   4. Log page_generated event
 *   5. Return { ok, imageUrl, latencyMs, attempts }
 */

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  const _ip = getClientIp(req.headers) ?? 'unknown'
  const _rl = await checkRateLimit(_ip, 'generate')
  if (!_rl.allowed) return rateLimit429(_rl)

  let body: {
    sessionId?: string
    pageNumber?: number
    prompt?: string
    seed?: number
    subject?: string
    model?: string
    width?: number
    height?: number
  }

  try {
    body = await req.json() as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { sessionId, pageNumber, prompt, seed, subject, model, width, height } = body

  if (!sessionId || !pageNumber || !prompt) {
    return NextResponse.json(
      { error: 'sessionId, pageNumber, and prompt are required' },
      { status: 400 }
    )
  }

  const sb = admin()

  // Verify session exists
  const { data: session, error: sessionErr } = await sb
    .from('trial_sessions')
    .select('id, status, page_count')
    .eq('id', sessionId)
    .single()

  if (sessionErr || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  try {
    const result = await generateAndStore(sessionId, pageNumber, prompt, seed, {
      model:  model  ?? process.env.POLLINATIONS_MODEL ?? 'flux',
      width:  width  ?? 768,
      height: height ?? 1024,
    })

    // Log event (fire-and-forget)
    const isLastPage = pageNumber === (session as { page_count: number }).page_count
    sb.from('events').insert({
      event_name: isLastPage ? 'book_complete' : (pageNumber === 1 ? 'first_page_ready' : 'page_generated'),
      session_id: sessionId,
      properties: {
        page_number:  pageNumber,
        latency_ms:   result.latencyMs,
        attempts:     result.attempts,
        subject:      subject ?? null,
        storage_path: result.storagePath,
        server_side:  true,
      },
    })

    // If last page, mark session complete
    if (isLastPage) {
      await sb.from('trial_sessions')
        .update({ status: 'complete', complete_at: new Date().toISOString() })
        .eq('id', sessionId)
    }

    return NextResponse.json({
      ok:         true,
      imageUrl:   result.imageUrl,
      latencyMs:  result.latencyMs,
      attempts:   result.attempts,
      pageNumber,
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[worker] page=${pageNumber} session=${sessionId} error:`, msg)

    return NextResponse.json(
      { ok: false, error: msg, pageNumber },
      { status: 500 }
    )
  }
}
