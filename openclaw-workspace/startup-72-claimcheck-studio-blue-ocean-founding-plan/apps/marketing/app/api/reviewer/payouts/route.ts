import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// GET: payout history + balance
export async function GET(req: NextRequest) {
  const db = sb()
  const { searchParams } = new URL(req.url)
  const reviewerId = searchParams.get('reviewer_id')

  if (!reviewerId) {
    // Admin: get all payouts summary
    const { data } = await db.from('cc_reviewer_payouts')
      .select('*').order('created_at', { ascending: false }).limit(100)
    const totalPaid = data?.filter(p => p.status === 'paid').reduce((s, p) => s + (p.net_cents || 0), 0) || 0
    const pending = data?.filter(p => p.status === 'pending').reduce((s, p) => s + (p.net_cents || 0), 0) || 0
    return NextResponse.json({ payouts: data || [], totalPaid, pending })
  }

  const { data: payouts } = await db.from('cc_reviewer_payouts')
    .select('*').eq('reviewer_id', reviewerId).order('created_at', { ascending: false })

  const { data: profile } = await db.from('cc_reviewer_profiles')
    .select('balance_cents,total_earned_cents,payout_method').eq('id', reviewerId).single()

  return NextResponse.json({ payouts: payouts || [], profile })
}

// POST: trigger payout run (admin)
export async function POST(req: NextRequest) {
  const db = sb()
  const body = await req.json()
  const { reviewer_id, period_start, period_end, tasks_count, gross_cents } = body

  const fee_cents = Math.round(gross_cents * 0.05) // 5% platform fee
  const net_cents = gross_cents - fee_cents

  const { data, error } = await db.from('cc_reviewer_payouts').insert({
    reviewer_id, period_start, period_end,
    tasks_count, gross_cents, fee_cents, net_cents,
    currency: 'usd', status: 'pending',
  }).select('id,net_cents,status').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Update reviewer balance
  await db.rpc('increment_reviewer_balance', { reviewer_id, amount: net_cents }).catch(() => {})

  return NextResponse.json(data, { status: 201 })
}
