import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// POST /api/v1/pages — record a completed page (called from client after image loads)
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as {
    sessionId: string
    pageNumber: number
    imageUrl: string
    latencyMs?: number
    subject?: string
  }

  const { sessionId, pageNumber, imageUrl, latencyMs, subject } = body
  if (!sessionId || !pageNumber || !imageUrl) {
    return NextResponse.json({ error: 'sessionId, pageNumber, imageUrl required' }, { status: 400 })
  }

  const sb = getAdmin()
  const now = new Date().toISOString()

  // Update the page row
  const { error: pageErr } = await sb
    .from('trial_pages')
    .update({
      image_url: imageUrl,
      status: 'complete',
      latency_ms: latencyMs || null,
      completed_at: now,
    })
    .eq('session_id', sessionId)
    .eq('page_number', pageNumber)

  if (pageErr) return NextResponse.json({ error: pageErr.message }, { status: 500 })

  // Update session: first_page_at + preview_image_url if page 1
  if (pageNumber === 1) {
    await sb.from('trial_sessions').update({
      first_page_at: now,
      preview_image_url: imageUrl,
      status: 'generating',
    }).eq('id', sessionId)
  }

  // Check if all pages complete → mark session complete
  const { data: pages } = await sb
    .from('trial_pages')
    .select('status, page_number')
    .eq('session_id', sessionId)

  const allDone = pages?.every(p => p.status === 'complete' || p.status === 'failed')
  if (allDone) {
    await sb.from('trial_sessions').update({ status: 'complete', complete_at: now }).eq('id', sessionId)
  }

  // Log telemetry
  const eventName = pageNumber === 1 ? 'first_page_ready' : pageNumber === (pages?.length || 4) ? 'book_complete' : 'page_ready'
  await sb.from('events').insert({
    event_name: eventName,
    session_id: sessionId,
    properties: { page_number: pageNumber, latency_ms: latencyMs, subject },
  })

  return NextResponse.json({ ok: true, allDone: allDone ?? false })
}
