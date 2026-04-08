import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// GET: arbitration cases
export async function GET(req: NextRequest) {
  const db = sb()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'open'
  const arbiterId = searchParams.get('arbiter_id')

  let q = db.from('cc_arbitration_cases')
    .select('*')
    .order('filed_at', { ascending: false })
    .limit(50)

  if (status !== 'all') q = q.eq('status', status)
  if (arbiterId) q = q.eq('arbiter_id', arbiterId)

  const { data } = await q
  const byStatus = { open: 0, assigned: 0, resolved: 0, escalated: 0 }
  data?.forEach(c => { if (c.status in byStatus) (byStatus as Record<string,number>)[c.status]++ })

  return NextResponse.json({ cases: data || [], byStatus })
}

// POST: file arbitration case
export async function POST(req: NextRequest) {
  const db = sb()
  const body = await req.json()
  const { review_id, microtask_id, claim_text, original_verdict, dispute_reason, filed_by } = body

  if (!dispute_reason || !filed_by) {
    return NextResponse.json({ error: 'dispute_reason and filed_by required' }, { status: 400 })
  }

  const { data, error } = await db.from('cc_arbitration_cases').insert({
    review_id, microtask_id, claim_text, original_verdict,
    dispute_reason, filed_by, status: 'open',
  }).select('id,status,filed_at').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

// PATCH: resolve arbitration
export async function PATCH(req: NextRequest) {
  const db = sb()
  const body = await req.json()
  const { id, arbiter_id, arbiter_verdict, arbiter_rationale, outcome, status } = body

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (arbiter_id) updates.arbiter_id = arbiter_id
  if (arbiter_verdict) updates.arbiter_verdict = arbiter_verdict
  if (arbiter_rationale) updates.arbiter_rationale = arbiter_rationale
  if (outcome) updates.outcome = outcome
  if (status) {
    updates.status = status
    if (status === 'resolved') updates.resolved_at = new Date().toISOString()
    if (status === 'assigned') updates.arbiter_id = arbiter_id
  }

  const { data, error } = await db.from('cc_arbitration_cases').update(updates).eq('id', id).select('id,status,outcome').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
