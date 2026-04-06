import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

/**
 * POST /api/events
 * Ingest time-on-task and other session events from testers or facilitators.
 * Public endpoint — no auth required (events are validated by session_id presence).
 * 
 * Supports batch ingestion: { events: [...] } or single event.
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const supabase = createServiceClient()

  // Support batch and single
  const rawEvents: any[] = Array.isArray(body.events) ? body.events : [body]

  if (rawEvents.length === 0) {
    return NextResponse.json({ success: false, error: 'No events provided' }, { status: 400 })
  }
  if (rawEvents.length > 100) {
    return NextResponse.json({ success: false, error: 'Max 100 events per request' }, { status: 400 })
  }

  // Validate all events have session_id and event_type
  const invalid = rawEvents.filter((e) => !e.session_id || !e.event_type)
  if (invalid.length > 0) {
    return NextResponse.json({ success: false, error: 'Each event requires session_id and event_type' }, { status: 400 })
  }

  // Verify all session_ids exist (prevent spam)
  const sessionIds = [...new Set(rawEvents.map((e) => e.session_id))]
  const { data: sessions } = await supabase
    .from('playtest_sessions')
    .select('id')
    .in('id', sessionIds)

  const validSessionIds = new Set((sessions ?? []).map((s: any) => s.id))
  const rows = rawEvents
    .filter((e) => validSessionIds.has(e.session_id))
    .map((e) => ({
      session_id: e.session_id,
      test_run_id: e.test_run_id ?? null,
      signup_id: e.signup_id ?? null,
      tester_id: e.tester_id ?? null,
      event_type: e.event_type,
      event_data: e.event_data ?? {},
      timing_block_id: e.timing_block_id ?? null,
      task_id: e.task_id ?? null,
      elapsed_seconds: e.elapsed_seconds ?? null,
      failure_point: e.failure_point ?? false,
      client_ts: e.client_ts ? new Date(e.client_ts).toISOString() : null,
      session_seq: e.session_seq ?? null,
    }))

  if (rows.length === 0) {
    return NextResponse.json({ success: false, error: 'No valid session_ids matched' }, { status: 400 })
  }

  const { data, error } = await supabase.from('events').insert(rows).select('id')

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    inserted: data?.length ?? 0,
    skipped: rawEvents.length - rows.length,
  })
}

/**
 * GET /api/events?session_id=...&event_type=...&limit=100
 * Designer-authenticated: fetch events for a session.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')
  const eventType = searchParams.get('event_type')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '200'), 1000)
  const failureOnly = searchParams.get('failure_only') === 'true'

  if (!sessionId) {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  let query = supabase
    .from('events')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (eventType) query = query.eq('event_type', eventType)
  if (failureOnly) query = query.eq('failure_point', true)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    events: data ?? [],
    count: data?.length ?? 0,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
