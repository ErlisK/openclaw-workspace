import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { trackActivation } from '@/lib/activation'
import { canCreateProject, getUserPlan } from '@/lib/billing'

/**
 * POST /api/projects
 * Create a new project for the authenticated designer.
 * Enforces project cap from subscription plan (server-side paywall).
 *
 * Body: { name, description?, game_type }
 * Returns: { project } | { error, upgrade_required: true }
 *
 * GET /api/projects
 * List all projects for the authenticated designer.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { name, description, game_type } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
  }

  // ── Server-side paywall ─────────────────────────────────────────────────────
  const [paywall, plan] = await Promise.all([
    canCreateProject(user.id),
    getUserPlan(user.id),
  ])

  if (!paywall.allowed) {
    return NextResponse.json(
      {
        error: paywall.reason ?? 'Project limit reached. Upgrade your plan.',
        upgrade_required: true,
        current_plan: plan.planId,
        limit: plan.maxProjects,
      },
      { status: 403 }
    )
  }

  // Use service client so we bypass RLS for the insert (paywall enforced above)
  const svc = createServiceClient()
  const { data, error } = await svc
    .from('projects')
    .insert({
      name: name.trim(),
      description: description?.trim() ?? null,
      game_type: game_type ?? 'board_game',
      designer_id: user.id,
      status: 'active',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Track A1 activation (non-throwing)
  trackActivation({
    designerId: user.id,
    step: 'A1',
    projectId: data.id,
    metadata: { game_type: game_type ?? 'board_game' },
  }).catch(() => {})

  // Update usage ledger (non-throwing)
  updateProjectUsage(user.id).catch(() => {})

  return NextResponse.json({ project: data }, { status: 201 })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // user's auth client — RLS filters to their own projects
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, description, game_type, status, recruit_widget_enabled, created_at, updated_at')
    .eq('designer_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const plan = await getUserPlan(user.id)
  const activeCount = (data ?? []).filter(p => p.status === 'active').length

  return NextResponse.json({
    projects: data ?? [],
    usage: {
      active: activeCount,
      limit: plan.maxProjects,
      can_create: plan.maxProjects === null || activeCount < plan.maxProjects,
    },
  })
}

/** Refresh usage_ledger.projects_active for current period. Non-throwing. */
async function updateProjectUsage(userId: string) {
  const svc = createServiceClient()
  const { count } = await svc
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('designer_id', userId)
    .eq('status', 'active')

  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  await svc.from('usage_ledger').upsert({
    user_id: userId,
    period_start: periodStart,
    period_end: periodEnd,
    projects_active: count ?? 0,
  }, { onConflict: 'user_id,period_start' })
}
