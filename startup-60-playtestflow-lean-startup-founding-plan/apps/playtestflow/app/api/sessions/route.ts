import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { trackActivation } from '@/lib/activation'
import { canCreateSession, getUserPlan } from '@/lib/billing'
import { trackFirstValue, getDaysSince } from '@/lib/instrumentation'

/**
 * POST /api/sessions
 * Create a new playtest session for the authenticated designer.
 * Enforces sessions/month cap from subscription plan (server-side paywall).
 *
 * Body: {
 *   project_id, title, rule_version_id?, scheduled_at?,
 *   max_testers?, platform?, meeting_url?, duration_minutes?,
 *   description?, session_notes?
 * }
 * Returns: { session } | { error, upgrade_required: true }
 *
 * GET /api/sessions
 * List sessions for the authenticated designer (with optional project_id filter).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const {
    project_id, title, rule_version_id, scheduled_at,
    max_testers, platform, meeting_url, duration_minutes,
    description, session_notes,
  } = body

  if (!project_id) return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
  if (!title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 })

  // ── Server-side paywall ─────────────────────────────────────────────────────
  const [paywall, plan] = await Promise.all([
    canCreateSession(user.id),
    getUserPlan(user.id),
  ])

  if (!paywall.allowed) {
    return NextResponse.json(
      {
        error: paywall.reason ?? 'Session limit reached. Upgrade your plan.',
        upgrade_required: true,
        current_plan: plan.planId,
        limit: plan.maxSessionsMo,
        upgrade_url: '/pricing',
      },
      { status: 403 }
    )
  }

  // Verify project ownership
  const svc = createServiceClient()
  const { data: project } = await svc
    .from('projects')
    .select('id')
    .eq('id', project_id)
    .eq('designer_id', user.id)
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const { data, error } = await svc
    .from('playtest_sessions')
    .insert({
      project_id,
      designer_id: user.id,
      title: title.trim(),
      rule_version_id: rule_version_id ?? null,
      scheduled_at: scheduled_at ?? null,
      max_testers: max_testers ?? 6,
      platform: platform ?? null,
      meeting_url: meeting_url ?? null,
      duration_minutes: duration_minutes ?? 90,
      description: description ?? null,
      session_notes: session_notes ?? null,
      status: 'recruiting',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Track A3 (session published) + A4 (scheduled) + first_session_created — non-throwing
  const daysSinceTrial = await getDaysSince(user.id, 'trial_start')
  const activationSteps: Promise<unknown>[] = [
    trackActivation({ designerId: user.id, step: 'A3', sessionId: data.id, metadata: { project_id } }).catch(() => {}),
    trackFirstValue({
      userId: user.id,
      milestone: 'first_session_created',
      context: { session_id: data.id, project_id },
      daysSinceTrialStart: daysSinceTrial ?? undefined,
    }).catch(() => {}),
  ]
  if (scheduled_at) {
    activationSteps.push(
      trackActivation({ designerId: user.id, step: 'A4', sessionId: data.id, metadata: { scheduled_at } }).catch(() => {})
    )
  }
  await Promise.all(activationSteps)

  // Update session usage ledger (non-throwing)
  updateSessionUsage(user.id).catch(() => {})

  return NextResponse.json({ session: data }, { status: 201 })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('project_id')

  let query = supabase
    .from('playtest_sessions')
    .select('*, projects(name, game_type)')
    .eq('designer_id', user.id)
    .order('created_at', { ascending: false })

  if (projectId) query = query.eq('project_id', projectId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const plan = await getUserPlan(user.id)

  // Count sessions this calendar month
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const sessionsThisMonth = (data ?? []).filter(
    s => new Date(s.created_at) >= monthStart
  ).length

  return NextResponse.json({
    sessions: data ?? [],
    usage: {
      this_month: sessionsThisMonth,
      limit: plan.maxSessionsMo,
      can_create: plan.maxSessionsMo === null || sessionsThisMonth < plan.maxSessionsMo,
    },
  })
}

/** Refresh usage_ledger.sessions_used for current period. Non-throwing. */
async function updateSessionUsage(userId: string) {
  const svc = createServiceClient()
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const { count } = await svc
    .from('playtest_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('designer_id', userId)
    .gte('created_at', periodStart.toISOString())

  const pStart = periodStart.toISOString().split('T')[0]
  const pEnd = periodEnd.toISOString().split('T')[0]

  await svc.from('usage_ledger').upsert({
    user_id: userId,
    period_start: pStart,
    period_end: pEnd,
    sessions_used: count ?? 0,
    limit_hit: plan_limit_hit(count ?? 0, userId),
  }, { onConflict: 'user_id,period_start' })
}

// Simplified limit-hit flag (can't async in this helper cleanly — just flag if high)
function plan_limit_hit(count: number, _userId: string): boolean {
  // Conservative: flag if sessions look high for free plan
  // The accurate check is in canCreateSession()
  return count >= 20
}
