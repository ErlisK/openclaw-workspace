import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/get-client'
import { createAdminClient } from '@/lib/supabase/server'
import { captureServerEvent } from '@/lib/analytics/events'
import { emailNotifications } from '@/lib/email/resend'

/**
 *
 * Body:
 * {
 *   session_id: string
 *   job_id: string
 *   assignment_id: string
 *   overall_rating: 1-5
 *   summary: string
 *   repro_steps?: string
 *   expected_behavior?: string
 *   actual_behavior?: string
 *   screenshot_urls?: string[]
 *   bugs?: Array<{
 *     title: string
 *     description: string
 *     severity: 'low' | 'medium' | 'high' | 'critical'
 *     repro_steps?: string
 *     expected_behavior?: string
 *     actual_behavior?: string
 *     screenshot_urls?: string[]
 *     session_event_id?: string
 *   }>
 * }
 */
export async function POST(req: NextRequest) {
  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    session_id,
    job_id,
    assignment_id,
    overall_rating,
    summary,
    repro_steps,
    expected_behavior,
    actual_behavior,
    screenshot_urls,
    bugs = [],
  } = body

  if (!job_id || !assignment_id) {
    return NextResponse.json({ error: 'job_id and assignment_id are required' }, { status: 400 })
  }
  if (overall_rating !== undefined && (overall_rating < 1 || overall_rating > 5)) {
    return NextResponse.json({ error: 'overall_rating must be 1-5' }, { status: 400 })
  }
  if (bugs.length > 50) {
    return NextResponse.json({ error: 'Max 50 bugs per submission' }, { status: 400 })
  }

  // Input length limits
  if (summary && summary.length > 5000) {
    return NextResponse.json({ error: 'summary must be ≤5000 characters' }, { status: 400 })
  }
  if (repro_steps && repro_steps.length > 5000) {
    return NextResponse.json({ error: 'repro_steps must be ≤5000 characters' }, { status: 400 })
  }
  if (expected_behavior && expected_behavior.length > 2000) {
    return NextResponse.json({ error: 'expected_behavior must be ≤2000 characters' }, { status: 400 })
  }
  if (actual_behavior && actual_behavior.length > 2000) {
    return NextResponse.json({ error: 'actual_behavior must be ≤2000 characters' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify tester owns this assignment
  const { data: assignment } = await admin
    .from('job_assignments')
    .select('id, tester_id, job_id')
    .eq('id', assignment_id)
    .single()

  if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  if (assignment.tester_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Proof-of-work gating: verify session has sufficient duration and interaction
  if (session_id) {
    const { data: session } = await admin
      .from('test_sessions')
      .select('id, job_id, started_at, completed_at')
      .eq('id', session_id)
      .single()

    if (session) {
      // Get job tier for threshold
      const { data: jobData } = await admin
        .from('test_jobs')
        .select('tier')
        .eq('id', job_id)
        .single()

      const tier = jobData?.tier ?? 'quick'
      // Tier thresholds: quick=10min, standard=20min, deep=30min; 80% rule
      const TIER_MIN_MS: Record<string, number> = { quick: 8 * 60_000, standard: 16 * 60_000, deep: 24 * 60_000 }
      const minMs = TIER_MIN_MS[tier] ?? TIER_MIN_MS.quick

      const startedAt = session.started_at ? new Date(session.started_at).getTime() : null
      const now2 = Date.now()
      if (startedAt) {
        const durationMs = now2 - startedAt
        if (durationMs < minMs) {
          return NextResponse.json(
            { error: `Session too short. Minimum duration for ${tier} tier is ${Math.round(minMs / 60_000)} minutes.` },
            { status: 400 }
          )
        }
      }

      // Verify minimum interaction count (≥10 non-console events)
      const { count: eventCount } = await admin
        .from('session_events')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', session_id)
        .neq('event_type', 'console_log')

      if ((eventCount ?? 0) < 10) {
        return NextResponse.json(
          { error: 'Insufficient interaction recorded. At least 10 interactions required.' },
          { status: 400 }
        )
      }
    }
  }

  const now = new Date().toISOString()

  // Insert feedback
  const feedbackRow: Record<string, unknown> = {
    job_id,
    assignment_id,
    tester_id: user.id,
    summary: summary ?? '',
    bugs_found: bugs.length,
    submitted_at: now,
    created_at: now,
    updated_at: now,
  }
  if (session_id) feedbackRow.session_id = session_id
  if (overall_rating !== undefined) feedbackRow.overall_rating = overall_rating
  if (repro_steps) feedbackRow.repro_steps = repro_steps
  if (expected_behavior) feedbackRow.expected_behavior = expected_behavior
  if (actual_behavior) feedbackRow.actual_behavior = actual_behavior
  if (screenshot_urls?.length) feedbackRow.screenshot_urls = screenshot_urls

  const { data: feedback, error: fbError } = await admin
    .from('feedback')
    .insert(feedbackRow)
    .select()
    .single()

  if (fbError) return NextResponse.json({ error: fbError.message }, { status: 500 })

  // Insert bugs
  let insertedBugs: unknown[] = []
  if (bugs.length > 0) {
    const bugRows = bugs.map((bug: Record<string, unknown>) => ({
      feedback_id: feedback.id,
      job_id,
      title: bug.title ?? 'Untitled bug',
      description: bug.description ?? '',
      severity: (['low', 'medium', 'high', 'critical'].includes(bug.severity as string)
        ? bug.severity : 'medium') as string,
      repro_steps: bug.repro_steps ?? null,
      expected_behavior: bug.expected_behavior ?? null,
      actual_behavior: bug.actual_behavior ?? null,
      screenshot_urls: (bug.screenshot_urls as string[]) ?? [],
      screenshot_url: (bug.screenshot_urls as string[])?.[0] ?? null,
      session_event_id: bug.session_event_id ?? null,
      created_at: now,
    }))

    const { data: bugData, error: bugError } = await admin
      .from('feedback_bugs')
      .insert(bugRows)
      .select()

    if (bugError) return NextResponse.json({ error: bugError.message }, { status: 500 })
    insertedBugs = bugData ?? []
  }

  captureServerEvent('submit_feedback', user.id, {
    session_id: feedback.session_id,
    job_id: feedback.job_id,
    has_bugs: insertedBugs.length > 0,
    bug_count: insertedBugs.length,
  }).catch(() => {})

  // Notify requester that test is complete
  const notifyRequester = async () => {
    const { data: jobRow } = await admin.from('test_jobs').select('title, client_id').eq('id', feedback.job_id).single()
    if (!jobRow) return
    const { data: requester } = await admin.from('users').select('email').eq('id', jobRow.client_id).single()
    if (requester?.email) {
      await emailNotifications.testComplete(requester.email, jobRow.title, feedback.job_id, feedback.session_id)
    }
  }
  notifyRequester().catch(() => {})

  return NextResponse.json({ feedback, bugs: insertedBugs }, { status: 201 })
}

/**
 * GET /api/feedback — Returns feedback for a session or job (accessible by tester or client)
 */
export async function GET(req: NextRequest) {
  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const session_id = searchParams.get('session_id')
  const job_id = searchParams.get('job_id')

  if (!session_id && !job_id) {
    return NextResponse.json({ error: 'session_id or job_id is required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // If querying by job_id, verify requester is the job client
  if (job_id) {
    const { data: job } = await admin
      .from('test_jobs')
      .select('client_id')
      .eq('id', job_id)
      .single()
    if (job && job.client_id === user.id) {
      // Client can see all feedback for their job
      const { data, error } = await admin
        .from('feedback')
        .select('*, feedback_bugs(*)')
        .eq('job_id', job_id)
        .order('created_at', { ascending: false })
      if (error) return NextResponse.json({ error: 'Internal error' }, { status: 500 })
      return NextResponse.json({ feedback: data ?? [] })
    }
  }

  // Otherwise: only tester can see their own feedback rows
  let query = admin
    .from('feedback')
    .select('*, feedback_bugs(*)')
    .eq('tester_id', user.id)
    .order('created_at', { ascending: false })

  if (session_id) query = query.eq('session_id', session_id)
  if (job_id) query = query.eq('job_id', job_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Internal error' }, { status: 500 })

  return NextResponse.json({ feedback: data ?? [] })
}
