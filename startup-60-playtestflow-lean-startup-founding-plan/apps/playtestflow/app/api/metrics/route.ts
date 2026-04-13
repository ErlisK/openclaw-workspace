import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/admin'

/**
 * GET /api/metrics?format=json|csv&scope=all|session&session_id=...
 * Designer-authenticated. Returns comprehensive session + event metrics.
 * 
 * Supports CSV download for:
 * - sessions: session completion, show-up, survey, ratings
 * - events: time-on-task, failure points, confusion areas
 * - tester_pipeline: per-tester funnel stages
 * - task_performance: per-task completion times, failure rates
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') ?? 'json'
  const scope = searchParams.get('scope') ?? 'all'
  const sessionId = searchParams.get('session_id')
  const csvType = searchParams.get('csv_type') ?? 'sessions' // sessions|events|tester_pipeline|task_performance

  const svc = createServiceClient()

  // ── Fetch data ─────────────────────────────────────────────────────────────

  // Sessions
  let sessQuery = supabase
    .from('playtest_sessions')
    .select(`
      id, title, status, scheduled_at, platform, duration_minutes,
      projects(name, game_type),
      rule_versions(version_label, semver)
    `)
    .eq('designer_id', user.id)
    .order('scheduled_at', { ascending: false })

  if (sessionId) sessQuery = sessQuery.eq('id', sessionId)
  const { data: sessions } = await sessQuery

  const sessionIds = (sessions ?? []).map((s: any) => s.id)
  if (sessionIds.length === 0) {
    if (format === 'csv') return csvResponse('', 'metrics-empty.csv')
    return NextResponse.json({ metrics: null, sessions: [], message: 'No sessions found' })
  }

  // Signups
  const { data: signups } = await svc
    .from('session_signups')
    .select('id, session_id, tester_id, tester_name, status, consent_given, pre_survey_completed, created_at, last_confirmation_sent_at, last_reminder_sent_at, last_post_session_sent_at')
    .in('session_id', sessionIds)

  // Feedback
  const { data: feedback } = await svc
    .from('session_feedback')
    .select('id, session_id, signup_id, tester_id, overall_rating, clarity_rating, fun_rating, would_play_again, confusion_areas, submitted_at, time_played_minutes')
    .in('session_id', sessionIds)

  // Events
  const { data: events } = await svc
    .from('events')
    .select('id, session_id, tester_id, event_type, elapsed_seconds, failure_point, task_id, timing_block_id, event_data, created_at')
    .in('session_id', sessionIds)
    .order('created_at', { ascending: true })

  // Test runs
  const { data: testRuns } = await svc
    .from('test_runs')
    .select('id, session_id, status, started_at, ended_at, tester_count, attended_count, feedback_count, avg_overall_rating, show_up_rate, survey_completion_rate')
    .in('session_id', sessionIds)

  // ── Compute aggregates ─────────────────────────────────────────────────────

  const signupsBySession = groupBy(signups ?? [], 'session_id')
  const feedbackBySession = groupBy(feedback ?? [], 'session_id')
  const eventsBySession = groupBy(events ?? [], 'session_id')
  const runsBySession = groupBy(testRuns ?? [], 'session_id')

  // Pipeline drop-off (global)
  const allSignups = signups ?? []
  const pipeline = {
    signed_up: allSignups.length,
    consented: allSignups.filter((s: any) => s.consent_given).length,
    pre_surveyed: allSignups.filter((s: any) => s.pre_survey_completed).length,
    attended: allSignups.filter((s: any) => s.status === 'attended').length,
    no_show: allSignups.filter((s: any) => s.status === 'no_show').length,
    feedback_submitted: (feedback ?? []).length,
    consent_rate: pct(allSignups.filter((s: any) => s.consent_given).length, allSignups.length),
    pre_survey_rate: pct(allSignups.filter((s: any) => s.pre_survey_completed).length, allSignups.filter((s: any) => s.consent_given).length),
    show_up_rate: pct(allSignups.filter((s: any) => s.status === 'attended').length, allSignups.length),
    feedback_rate: pct((feedback ?? []).length, allSignups.filter((s: any) => s.status === 'attended').length),
  }

  // Time-on-task from events
  const taskEvents = (events ?? []).filter((e: any) => e.event_type === 'task_complete' && e.elapsed_seconds != null)
  const taskTimeByTask = groupBy(taskEvents, 'task_id')
  const taskPerformance = Object.entries(taskTimeByTask).map(([taskId, evs]: [string, any[]]) => ({
    task_id: taskId,
    completions: evs.length,
    avg_elapsed_sec: Math.round(avg(evs.map((e: any) => e.elapsed_seconds))),
    median_elapsed_sec: Math.round(median(evs.map((e: any) => e.elapsed_seconds))),
    min_elapsed_sec: Math.round(Math.min(...evs.map((e: any) => e.elapsed_seconds))),
    max_elapsed_sec: Math.round(Math.max(...evs.map((e: any) => e.elapsed_seconds))),
    failure_count: evs.filter((e: any) => e.failure_point).length,
  })).sort((a, b) => b.completions - a.completions)

  // Failure points
  const failureEvents = (events ?? []).filter((e: any) => e.failure_point)
  const failureByType = Object.entries(groupBy(failureEvents, 'event_type'))
    .map(([type, evs]: [string, any[]]) => ({ event_type: type, count: evs.length }))
    .sort((a, b) => b.count - a.count)

  // Confusion / rule references from event_data
  const confusionEvents = (events ?? []).filter((e: any) => e.event_type === 'rule_confusion')
  const confusionByRule: Record<string, number> = {}
  for (const ev of confusionEvents) {
    const ref = ev.event_data?.rule_reference ?? 'Unknown'
    confusionByRule[ref] = (confusionByRule[ref] ?? 0) + 1
  }
  const topConfusionAreas = Object.entries(confusionByRule)
    .map(([rule, count]) => ({ rule, count }))
    .sort((a, b) => b.count - a.count)

  // Per-session breakdown
  const sessionBreakdown = (sessions ?? []).map((s: any) => {
    const sess_signups = signupsBySession[s.id] ?? []
    const sess_feedback = feedbackBySession[s.id] ?? []
    const sess_events = eventsBySession[s.id] ?? []
    const sess_runs = runsBySession[s.id] ?? []
    const attended_n = sess_signups.filter((su: any) => su.status === 'attended').length
    const fb_ratings = sess_feedback.map((f: any) => f.overall_rating).filter((r: any) => r != null)
    const task_completes = sess_events.filter((e: any) => e.event_type === 'task_complete')
    const failures = sess_events.filter((e: any) => e.failure_point)

    return {
      session_id: s.id,
      title: s.title,
      project: s.projects?.name,
      game_type: s.projects?.game_type,
      status: s.status,
      platform: s.platform,
      rule_version: s.rule_versions?.version_label,
      scheduled_at: s.scheduled_at,
      duration_minutes: s.duration_minutes,
      signups: sess_signups.length,
      consented: sess_signups.filter((su: any) => su.consent_given).length,
      pre_surveyed: sess_signups.filter((su: any) => su.pre_survey_completed).length,
      attended: attended_n,
      no_show: sess_signups.filter((su: any) => su.status === 'no_show').length,
      feedback_count: sess_feedback.length,
      show_up_rate: pct(attended_n, sess_signups.length),
      consent_rate: pct(sess_signups.filter((su: any) => su.consent_given).length, sess_signups.length),
      survey_completion_rate: pct(sess_feedback.length, attended_n),
      avg_overall_rating: fb_ratings.length > 0 ? round(avg(fb_ratings), 2) : null,
      avg_clarity_rating: round(avg(sess_feedback.map((f: any) => f.clarity_rating).filter(notNull)), 2),
      avg_fun_rating: round(avg(sess_feedback.map((f: any) => f.fun_rating).filter(notNull)), 2),
      would_play_again_pct: pct(sess_feedback.filter((f: any) => f.would_play_again).length, sess_feedback.length),
      total_events: sess_events.length,
      task_completions: task_completes.length,
      failure_events: failures.length,
      avg_task_time_sec: task_completes.length > 0 ? Math.round(avg(task_completes.map((e: any) => e.elapsed_seconds).filter(notNull))) : null,
      test_run_count: sess_runs.length,
      completed_runs: sess_runs.filter((r: any) => r.status === 'completed').length,
    }
  })

  // Global KPIs
  const allFeedback = feedback ?? []
  const allRatings = allFeedback.map((f: any) => f.overall_rating).filter(notNull)
  const kpis = {
    total_sessions: (sessions ?? []).length,
    completed_sessions: (sessions ?? []).filter((s: any) => s.status === 'completed').length,
    total_signups: allSignups.length,
    ...pipeline,
    avg_overall_rating: allRatings.length > 0 ? round(avg(allRatings), 2) : null,
    would_play_again_pct: pct(allFeedback.filter((f: any) => f.would_play_again).length, allFeedback.length),
    total_events: (events ?? []).length,
    total_failure_events: failureEvents.length,
    total_confusion_events: confusionEvents.length,
    end_to_end_success_rate: pct(allFeedback.length, allSignups.length),
  }

  // ── Format response ────────────────────────────────────────────────────────

  if (format === 'csv') {
    return buildCSV(csvType, { sessionBreakdown, taskPerformance, allSignups, allFeedback, events: events ?? [], topConfusionAreas, failureByType })
  }

  return NextResponse.json({
    kpis,
    pipeline,
    session_breakdown: sessionBreakdown,
    task_performance: taskPerformance,
    failure_points: failureByType,
    confusion_areas: topConfusionAreas,
    generated_at: new Date().toISOString(),
  }, { headers: { 'Cache-Control': 'no-store' } })
}

// ─── CSV builder ──────────────────────────────────────────────────────────────

function buildCSV(type: string, data: any): NextResponse {
  let rows: string[][] = []
  let filename = 'metrics.csv'

  if (type === 'sessions') {
    filename = 'playtestflow-sessions.csv'
    const headers = ['session_id','title','project','game_type','status','platform','rule_version',
      'scheduled_at','signups','consented','pre_surveyed','attended','no_show','feedback_count',
      'show_up_rate','consent_rate','survey_completion_rate','avg_overall_rating','avg_clarity_rating',
      'avg_fun_rating','would_play_again_pct','total_events','task_completions','failure_events',
      'avg_task_time_sec','completed_runs']
    rows = [headers, ...data.sessionBreakdown.map((s: any) => headers.map((h: string) => s[h] ?? ''))]

  } else if (type === 'task_performance') {
    filename = 'playtestflow-task-performance.csv'
    const headers = ['task_id','completions','avg_elapsed_sec','median_elapsed_sec','min_elapsed_sec','max_elapsed_sec','failure_count']
    rows = [headers, ...data.taskPerformance.map((t: any) => headers.map((h: string) => t[h] ?? ''))]

  } else if (type === 'tester_pipeline') {
    filename = 'playtestflow-tester-pipeline.csv'
    const headers = ['signup_id','session_id','tester_id','tester_name','status','consent_given','pre_survey_completed','last_confirmation_sent_at','last_reminder_sent_at','last_post_session_sent_at']
    rows = [headers, ...data.allSignups.map((s: any) => headers.map((h: string) => String(s[h] ?? '')))]

  } else if (type === 'events') {
    filename = 'playtestflow-events.csv'
    const headers = ['id','session_id','tester_id','event_type','elapsed_seconds','failure_point','task_id','timing_block_id','created_at']
    rows = [headers, ...data.events.map((e: any) => headers.map((h: string) => String(e[h] ?? '')))]

  } else if (type === 'confusion') {
    filename = 'playtestflow-confusion-areas.csv'
    rows = [['rule','confusion_count'], ...data.topConfusionAreas.map((c: any) => [c.rule, c.count])]

  } else if (type === 'feedback') {
    filename = 'playtestflow-feedback.csv'
    const headers = ['id','session_id','tester_id','overall_rating','clarity_rating','fun_rating','would_play_again','time_played_minutes','submitted_at']
    rows = [headers, ...data.allFeedback.map((f: any) => headers.map((h: string) => String(f[h] ?? '')))]
  }

  const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  return csvResponse(csv, filename)
}

function csvResponse(csv: string, filename: string) {
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function groupBy<T extends Record<string, any>>(arr: T[], key: string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = item[key]
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

function avg(nums: number[]) {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function median(nums: number[]) {
  if (nums.length === 0) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function pct(num: number, denom: number) {
  if (!denom || denom === 0) return 0
  return Math.round((num / denom) * 100)
}

function round(n: number, d = 1) {
  if (isNaN(n) || !isFinite(n)) return null
  return Math.round(n * 10 ** d) / 10 ** d
}

function notNull(v: any) { return v != null && v !== undefined }
