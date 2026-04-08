import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { emitTelemetry } from '@/lib/jobs'

/**
 * GET /api/marketplace/tasks/[id]  — task detail with evidence context
 * POST /api/marketplace/tasks/[id] — submit review verdict
 * PATCH /api/marketplace/tasks/[id] — update assignment status (start, dispute)
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = getSupabaseAdmin()

  const { data: task, error } = await supabase
    .from('cc_microtasks')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  // Fetch full claim + evidence sources for context
  let claim: Record<string, unknown> | null = null
  let sources: Record<string, unknown>[] = []
  let riskFlags: unknown[] = []
  if (task.claim_id) {
    const [{ data: c }, { data: s }, { data: rf }] = await Promise.all([
      supabase.from('claims').select('*').eq('id', task.claim_id).single(),
      supabase.from('evidence_sources')
        .select('id,doi,title,authors,year,journal,pmid,source_db,study_type,abstract_snippet,oa_full_text_url,scite_support,scite_contrast,retracted')
        .eq('claim_id', task.claim_id)
        .order('relevance_score', { ascending: false })
        .limit(8),
      supabase.from('cc_risk_flags')
        .select('flag_type,severity,detail,suggestion')
        .eq('claim_id', task.claim_id),
    ])
    claim = c; sources = s || []; riskFlags = rf || []
  }

  // Existing assignments (for kappa context — show count only, not verdicts)
  const { data: assignments } = await supabase
    .from('cc_task_assignments')
    .select('id, status, submitted_at')
    .eq('task_id', id)

  return NextResponse.json({
    task,
    claim,
    sources,
    riskFlags,
    assignmentCount: assignments?.length || 0,
    completedCount: assignments?.filter(a => a.status === 'submitted').length || 0,
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params
  const body = await request.json() as {
    reviewerId: string
    verdict: string          // agree | disagree | uncertain | flag
    confidence: number       // 0.0–1.0
    notes?: string
    suggestedFix?: string
    evidenceUsed?: string[]  // source IDs
    timeSpentSec?: number
  }

  const { reviewerId, verdict, confidence, notes, suggestedFix, evidenceUsed, timeSpentSec } = body

  if (!reviewerId) return NextResponse.json({ error: 'reviewerId required' }, { status: 400 })
  if (!verdict) return NextResponse.json({ error: 'verdict required' }, { status: 400 })
  if (!['agree', 'disagree', 'uncertain', 'flag'].includes(verdict)) {
    return NextResponse.json({ error: 'verdict must be agree|disagree|uncertain|flag' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // Find the assignment
  const { data: assignment } = await supabase
    .from('cc_task_assignments')
    .select('id, status, reward_cents, task_id, expires_at')
    .eq('task_id', taskId)
    .eq('reviewer_id', reviewerId)
    .single()

  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found — pick up the task first' }, { status: 404 })
  }
  if (assignment.status === 'submitted') {
    return NextResponse.json({ error: 'Review already submitted' }, { status: 409 })
  }

  const { data: task } = await supabase
    .from('cc_microtasks')
    .select('id, reward_cents, required_reviews, completed_reviews, status')
    .eq('id', taskId)
    .single()

  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  if (new Date() > new Date(assignment.expires_at || '')) {
    return NextResponse.json({ error: 'Assignment has expired' }, { status: 410 })
  }

  const rewardCents = task.reward_cents || 50

  // Submit the assignment
  await supabase
    .from('cc_task_assignments')
    .update({
      status: 'submitted',
      verdict,
      confidence,
      notes: notes || null,
      suggested_fix: suggestedFix || null,
      evidence_used: evidenceUsed || [],
      time_spent_sec: timeSpentSec || null,
      submitted_at: new Date().toISOString(),
      reward_cents: rewardCents,
    })
    .eq('id', assignment.id)

  const newCompletedCount = (task.completed_reviews || 0) + 1
  const isTaskComplete = newCompletedCount >= (task.required_reviews || 2)

  // Update task completion
  const taskUpdate: Record<string, unknown> = {
    completed_reviews: newCompletedCount,
    status: isTaskComplete ? 'completed' : 'in_review',
  }
  if (isTaskComplete) taskUpdate.completed_at = new Date().toISOString()

  await supabase.from('cc_microtasks').update(taskUpdate).eq('id', taskId)

  // Compute kappa if we have 2+ submissions
  let kappaResult = null
  if (isTaskComplete) {
    const { data: allSubmissions } = await supabase
      .from('cc_task_assignments')
      .select('id, verdict')
      .eq('task_id', taskId)
      .eq('status', 'submitted')

    if (allSubmissions && allSubmissions.length >= 2) {
      const pairs: Array<{ a: typeof allSubmissions[0]; b: typeof allSubmissions[0] }> = []
      for (let i = 0; i < allSubmissions.length - 1; i++) {
        for (let j = i + 1; j < allSubmissions.length; j++) {
          pairs.push({ a: allSubmissions[i], b: allSubmissions[j] })
        }
      }
      const agree = pairs.filter(p => p.a.verdict === p.b.verdict).length
      const kappaApprox = pairs.length > 0 ? agree / pairs.length : 0

      // Record kappa sample
      if (pairs.length > 0) {
        await supabase.from('cc_kappa_samples').insert({
          task_id: taskId,
          assignment_a: pairs[0].a.id,
          assignment_b: pairs[0].b.id,
          verdict_a: pairs[0].a.verdict,
          verdict_b: pairs[0].b.verdict,
          agree: pairs[0].a.verdict === pairs[0].b.verdict,
          kappa_pair: kappaApprox,
        })
        await supabase.from('cc_microtasks').update({ kappa_pair: kappaApprox, consensus_verdict: allSubmissions[0].verdict }).eq('id', taskId)
      }

      kappaResult = { kappa: kappaApprox, agree: agree === pairs.length }
    }
  }

  // Update reviewer stats (direct update)
  await getSupabaseAdmin()
    .from('cc_profiles')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', reviewerId)
    .then(() => {}, () => {})

  // Increment counters with raw SQL (Supabase JS v2 doesn't support arithmetic updates)
  await getSupabaseAdmin().rpc('exec_sql' as never, {
    sql: `UPDATE cc_profiles SET tasks_completed = COALESCE(tasks_completed,0) + 1, total_earned_cents = COALESCE(total_earned_cents,0) + ${rewardCents}, last_active_at = NOW() WHERE id = '${reviewerId}'`
  } as never).then(() => {}, () => {})

  // Check and award badges
  const badges = await checkAndAwardBadges(reviewerId, supabase)

  await emitTelemetry({
    eventType: 'marketplace.review_submitted',
    sessionId: taskId,
    metadata: { taskId, reviewerId, verdict, rewardCents, isTaskComplete, kappa: kappaResult?.kappa },
  })

  return NextResponse.json({
    submitted: true,
    assignmentId: assignment.id,
    verdict,
    rewardCents,
    taskComplete: isTaskComplete,
    kappa: kappaResult,
    badgesAwarded: badges,
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params
  const body = await request.json() as {
    reviewerId: string
    action: 'start' | 'dispute'
    disputeReason?: string
  }

  const { reviewerId, action, disputeReason } = body
  if (!reviewerId || !action) {
    return NextResponse.json({ error: 'reviewerId and action required' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  if (action === 'start') {
    await supabase.from('cc_task_assignments')
      .update({ status: 'started', started_at: new Date().toISOString() })
      .eq('task_id', taskId)
      .eq('reviewer_id', reviewerId)
      .eq('status', 'assigned')
    return NextResponse.json({ started: true })
  }

  if (action === 'dispute') {
    if (!disputeReason) return NextResponse.json({ error: 'disputeReason required' }, { status: 400 })
    await supabase.from('cc_task_assignments')
      .update({ status: 'disputed', disputed_at: new Date().toISOString(), dispute_reason: disputeReason })
      .eq('task_id', taskId)
      .eq('reviewer_id', reviewerId)
    await getSupabaseAdmin().rpc('exec_sql' as never, {
      sql: `UPDATE cc_profiles SET tasks_disputed = COALESCE(tasks_disputed,0) + 1 WHERE id = '${reviewerId}'`
    } as never).then(() => {}, () => {})
    return NextResponse.json({ disputed: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

// ── Badge checker ─────────────────────────────────────────────────────────────

async function checkAndAwardBadges(
  reviewerId: string,
  supabase: ReturnType<typeof getSupabaseAdmin>
): Promise<string[]> {
  try {
    const { data: profile } = await supabase
      .from('cc_profiles')
      .select('tasks_completed, kappa_score, kappa_sample_count, tasks_disputed, orcid_id')
      .eq('id', reviewerId)
      .single()

    if (!profile) return []

    const { data: allBadges } = await supabase.from('cc_badges').select('*')
    const { data: existing } = await supabase.from('cc_reviewer_badges')
      .select('badge_id').eq('reviewer_id', reviewerId)

    const existingIds = new Set((existing || []).map(b => b.badge_id))
    const toAward: string[] = []
    const toInsert: Array<{ reviewer_id: string; badge_id: string; evidence: Record<string, unknown> }> = []

    for (const badge of allBadges || []) {
      if (existingIds.has(badge.id)) continue
      const c = badge.criteria as Record<string, number | boolean>
      let qualifies = true

      if (c.tasks_completed && (profile.tasks_completed || 0) < c.tasks_completed) qualifies = false
      if (c.kappa_score && (profile.kappa_score || 0) < c.kappa_score) qualifies = false
      if (c.kappa_sample_count && (profile.kappa_sample_count || 0) < c.kappa_sample_count) qualifies = false
      if (c.tasks_disputed === 0 && (profile.tasks_disputed || 0) > 0) qualifies = false
      if (c.orcid_verified && !profile.orcid_id) qualifies = false

      if (qualifies) {
        toInsert.push({ reviewer_id: reviewerId, badge_id: badge.id, evidence: { profile_snapshot: profile } })
        toAward.push(badge.slug)
      }
    }

    if (toInsert.length > 0) {
      await supabase.from('cc_reviewer_badges').insert(toInsert)
    }

    return toAward
  } catch {
    return []
  }
}
