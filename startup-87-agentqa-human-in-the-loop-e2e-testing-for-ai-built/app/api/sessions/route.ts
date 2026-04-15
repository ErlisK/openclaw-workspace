import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/get-client'
import { createAdminClient } from '@/lib/supabase/server'
import { captureServerEvent } from '@/lib/analytics/events'

/**
 * POST /api/sessions — Create a test session for an assignment
 * Body: { assignment_id, job_id, browser?, viewport_width?, viewport_height? }
 */
export async function POST(req: NextRequest) {
  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { assignment_id, job_id, browser = 'chromium', viewport_width = 1280, viewport_height = 800 } = body

  if (!assignment_id || !job_id) {
    return NextResponse.json({ error: 'assignment_id and job_id are required' }, { status: 400 })
  }

  // Verify tester owns this assignment
  const admin = createAdminClient()
  const { data: assignment } = await admin
    .from('job_assignments')
    .select('id, status, tester_id, job_id')
    .eq('id', assignment_id)
    .single()

  if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  if (assignment.tester_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (assignment.status !== 'active') {
    return NextResponse.json({ error: `Assignment is not active (status: ${assignment.status})` }, { status: 409 })
  }

  // Check if there's already an active session for this assignment
  const { data: existing } = await admin
    .from('test_sessions')
    .select('id, status')
    .eq('assignment_id', assignment_id)
    .eq('status', 'active')
    .maybeSingle()

  if (existing) {
    // Return the existing session
    return NextResponse.json({ session: existing, resumed: true })
  }

  const { data: session, error: sessionError } = await admin
    .from('test_sessions')
    .insert({
      assignment_id,
      job_id,
      tester_id: user.id,
      browser,
      viewport_width,
      viewport_height,
      started_at: new Date().toISOString(),
      status: 'active',
    })
    .select()
    .single()

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 })

  // Track session start
  captureServerEvent('start_session', user.id, {
    session_id: session.id,
    job_id: job_id,
    assignment_id,
  }).catch(() => {})

  return NextResponse.json({ session }, { status: 201 })
}

/**
 * GET /api/sessions?assignment_id=xxx — list sessions for assignment
 */
export async function GET(req: NextRequest) {
  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const assignment_id = searchParams.get('assignment_id')
  const job_id = searchParams.get('job_id')

  const admin = createAdminClient()
  let query = admin.from('test_sessions').select('*').eq('tester_id', user.id)
  if (assignment_id) query = query.eq('assignment_id', assignment_id)
  if (job_id) query = query.eq('job_id', job_id)

  const { data, error } = await query.order('started_at', { ascending: false }).limit(20)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sessions: data })
}
