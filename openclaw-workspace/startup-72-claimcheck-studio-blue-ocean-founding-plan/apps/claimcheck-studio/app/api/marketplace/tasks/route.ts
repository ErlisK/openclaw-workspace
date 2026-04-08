import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { emitTelemetry } from '@/lib/jobs'

/**
 * GET /api/marketplace/tasks
 * Returns open microtasks queue for the reviewer UI.
 * Query params: status, task_type, limit (default 20)
 *
 * POST /api/marketplace/tasks
 * Creates microtasks from a session's claims (batch enqueue).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'open'
  const taskType = searchParams.get('task_type')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const reviewerId = searchParams.get('reviewer_id')

  const supabase = getSupabaseAdmin()

  let query = supabase
    .from('cc_microtasks')
    .select(`
      id, task_type, priority, reward_cents, status, sla_hours,
      opens_at, expires_at, assignments_count, required_reviews, completed_reviews,
      consensus_verdict, kappa_pair,
      claim_text, claim_type, confidence_band, risk_flags,
      created_at, completed_at
    `)
    .eq('status', status)
    .order('priority', { ascending: true })
    .order('opens_at', { ascending: true })
    .limit(limit)

  if (taskType) query = query.eq('task_type', taskType)

  // Exclude tasks the reviewer already has
  if (reviewerId) {
    const { data: existing } = await supabase
      .from('cc_task_assignments')
      .select('task_id')
      .eq('reviewer_id', reviewerId)
    const excludeIds = (existing || []).map(e => e.task_id)
    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`)
    }
  }

  const { data: tasks, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Queue stats
  const { data: stats } = await supabase
    .from('cc_microtasks')
    .select('status')

  const queueStats = {
    open: 0, assigned: 0, in_review: 0, completed: 0, expired: 0,
  }
  for (const s of stats || []) {
    if (s.status in queueStats) queueStats[s.status as keyof typeof queueStats]++
  }

  return NextResponse.json({ tasks, queueStats })
}

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    sessionId: string
    taskType?: string
    rewardCents?: number
    slaHours?: number
    requiredReviews?: number
  }

  const { sessionId, taskType = 'evidence_check', rewardCents = 50, slaHours = 12, requiredReviews = 2 } = body
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const supabase = getSupabaseAdmin()

  // Get all scored claims for this session
  const { data: claims } = await supabase
    .from('claims')
    .select('id, text, claim_type, confidence_band, risk_detail, evidence_count')
    .eq('session_id', sessionId)
    .order('position_index', { ascending: true })

  if (!claims?.length) {
    return NextResponse.json({ error: 'No claims found for session' }, { status: 404 })
  }

  // Create microtasks for claims that don't already have open tasks
  const { data: existing } = await supabase
    .from('cc_microtasks')
    .select('claim_id')
    .eq('session_id', sessionId)
    .in('status', ['open', 'assigned', 'in_review'])

  const existingClaimIds = new Set((existing || []).map(e => e.claim_id))

  const newClaims = claims.filter(c => !existingClaimIds.has(c.id))
  if (!newClaims.length) {
    return NextResponse.json({ message: 'All claims already have open tasks', created: 0 })
  }

  const rows = newClaims.map(c => ({
    session_id: sessionId,
    claim_id: c.id,
    task_type: taskType,
    reward_cents: rewardCents,
    sla_hours: slaHours,
    required_reviews: requiredReviews,
    expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    claim_text: c.text,
    claim_type: c.claim_type,
    confidence_band: c.confidence_band,
    risk_flags: (c.risk_detail as Record<string, unknown> | null)?.earlyRiskFlags || [],
    instructions: `Review this ${c.claim_type || 'factual'} claim. Check whether the evidence supports it, assess the confidence rating, and flag any regulatory or methodological issues.`,
  }))

  const { data: created, error } = await supabase
    .from('cc_microtasks')
    .insert(rows)
    .select('id, claim_text, task_type, reward_cents')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await emitTelemetry({
    eventType: 'marketplace.tasks_created',
    sessionId,
    metadata: { count: created?.length, taskType, sessionId },
  })

  return NextResponse.json({ created: created?.length, tasks: created }, { status: 201 })
}
