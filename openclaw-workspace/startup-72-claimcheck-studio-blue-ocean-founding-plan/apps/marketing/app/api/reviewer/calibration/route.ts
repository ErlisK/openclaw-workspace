import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// GET: calibration tasks for a reviewer
export async function GET(req: NextRequest) {
  const db = sb()
  const { searchParams } = new URL(req.url)
  const reviewerId = searchParams.get('reviewer_id')
  const difficulty = searchParams.get('difficulty')
  const count = Math.min(parseInt(searchParams.get('count') || '5'), 20)

  // Get tasks not yet attempted by this reviewer
  let q = db.from('cc_calibration_tasks').select('id,claim_text,source_title,source_doi,difficulty,specialization').eq('active', true)
  if (difficulty) q = q.eq('difficulty', difficulty)
  q = q.limit(count)

  if (reviewerId) {
    const { data: done } = await db.from('cc_calibration_responses')
      .select('task_id').eq('reviewer_id', reviewerId)
    const doneIds = done?.map(d => d.task_id) || []
    if (doneIds.length > 0) q = q.not('id', 'in', `(${doneIds.map(id => `"${id}"`).join(',')})`)
  }

  const { data: tasks } = await q
  return NextResponse.json({ tasks: tasks || [] })
}

// POST: submit calibration response
export async function POST(req: NextRequest) {
  const db = sb()
  const body = await req.json()
  const { reviewer_id, task_id, verdict, rationale, confidence } = body

  if (!reviewer_id || !task_id || !verdict) {
    return NextResponse.json({ error: 'reviewer_id, task_id, verdict required' }, { status: 400 })
  }

  // Get expert verdict
  const { data: task } = await db.from('cc_calibration_tasks')
    .select('expert_verdict,expert_rationale').eq('id', task_id).single()

  const is_correct = task?.expert_verdict === verdict

  const { data, error } = await db.from('cc_calibration_responses').upsert({
    reviewer_id, task_id, verdict, rationale, confidence,
    is_correct, submitted_at: new Date().toISOString(),
  }).select('id,is_correct').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Check if reviewer has passed calibration (≥80% on last 5+ attempts)
  const { data: responses } = await db.from('cc_calibration_responses')
    .select('is_correct').eq('reviewer_id', reviewer_id).order('submitted_at', { ascending: false }).limit(10)

  const correct = responses?.filter(r => r.is_correct).length || 0
  const total = responses?.length || 0
  const passingScore = total >= 5 && (correct / total) >= 0.8

  if (passingScore) {
    await db.from('cc_reviewer_profiles').update({
      calibration_passed: true,
      tier: 'bronze',
      status: 'active',
    }).eq('id', reviewer_id).eq('calibration_passed', false)
  }

  return NextResponse.json({
    ...data,
    expert_verdict: task?.expert_verdict,
    expert_rationale: task?.expert_rationale,
    calibration_passed: passingScore,
    score: { correct, total, pct: total > 0 ? +(correct / total * 100).toFixed(0) : 0 },
  }, { status: 201 })
}
