import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/get-client'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/sessions/[id]/events — ingest log events from the sandbox runner
 *
 * Body: single event OR array of events:
 * {
 *   event_type: 'network_request' | 'network_response' | 'console_log' | 'navigation' | ...
 *   ts?: string          // ISO timestamp, defaults to now
 *   method?: string      // HTTP method
 *   request_url?: string
 *   status_code?: number
 *   response_time_ms?: number
 *   log_level?: 'log' | 'info' | 'warn' | 'error'
 *   log_message?: string
 *   payload?: object     // arbitrary extra data stored as JSON
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params
  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Verify session belongs to this tester
  const { data: session } = await admin
    .from('test_sessions')
    .select('id, job_id, status, tester_id')
    .eq('id', sessionId)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.tester_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const events = Array.isArray(body) ? body : [body]

  if (events.length === 0) return NextResponse.json({ inserted: 0 })
  if (events.length > 500) return NextResponse.json({ error: 'Max 500 events per batch' }, { status: 400 })

  const now = new Date().toISOString()
  const rows = events.map(ev => ({
    session_id: sessionId,
    job_id: session.job_id,
    event_type: ev.event_type ?? 'custom',
    ts: ev.ts ?? now,
    method: ev.method ?? null,
    request_url: ev.request_url ?? null,
    status_code: ev.status_code ?? null,
    response_time_ms: ev.response_time_ms ?? null,
    request_headers: ev.request_headers ?? null,
    response_headers: ev.response_headers ?? null,
    request_body: ev.request_body ?? null,
    response_body: ev.response_body ?? null,
    log_level: ev.log_level ?? null,
    log_message: ev.log_message ?? null,
    element_selector: ev.element_selector ?? (ev.event_type === 'click' && ev.log_message ? ev.log_message : null),
    element_text: ev.element_text ?? (ev.payload?.text ?? null),
    page_url: ev.page_url ?? ev.request_url ?? null,
    payload: ev.payload ?? null,
  }))

  const { data, error } = await admin
    .from('session_events')
    .insert(rows)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ inserted: data?.length ?? 0 }, { status: 201 })
}

/**
 * GET /api/sessions/[id]/events — fetch events for a session
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params
  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Verify access: session belongs to this tester OR job belongs to this client
  const { data: session } = await admin
    .from('test_sessions')
    .select('id, job_id, tester_id')
    .eq('id', sessionId)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  // Check if user is the tester or the job's client
  let hasAccess = session.tester_id === user.id
  if (!hasAccess) {
    const { data: job } = await admin
      .from('test_jobs')
      .select('client_id')
      .eq('id', session.job_id)
      .single()
    hasAccess = job?.client_id === user.id
  }
  if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '200'), 500)
  const type = searchParams.get('type')

  let query = admin
    .from('session_events')
    .select('*')
    .eq('session_id', sessionId)
    .order('ts', { ascending: true })
    .limit(limit)

  if (type) query = query.eq('event_type', type)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ events: data, count: data?.length ?? 0 })
}
