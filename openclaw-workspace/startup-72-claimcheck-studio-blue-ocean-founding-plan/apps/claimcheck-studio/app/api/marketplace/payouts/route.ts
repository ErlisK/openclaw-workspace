import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { emitTelemetry } from '@/lib/jobs'

/**
 * GET  /api/marketplace/payouts?reviewer_id=xxx  — payout history
 * POST /api/marketplace/payouts                  — create payout batch
 *
 * Stripe Connect is stubbed — in production, replace the stub with
 * a real Stripe Transfer API call using the reviewer's connect account ID.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const reviewerId = searchParams.get('reviewer_id')
  if (!reviewerId) return NextResponse.json({ error: 'reviewer_id required' }, { status: 400 })

  const supabase = getSupabaseAdmin()

  const { data: payouts } = await supabase
    .from('cc_payouts')
    .select('*')
    .eq('reviewer_id', reviewerId)
    .order('created_at', { ascending: false })
    .limit(50)

  // Pending earnings (submitted but not yet paid)
  const { data: pending } = await supabase
    .from('cc_task_assignments')
    .select('reward_cents')
    .eq('reviewer_id', reviewerId)
    .eq('status', 'submitted')
    .is('payout_id', null)

  const pendingCents = (pending || []).reduce((sum, a) => sum + (a.reward_cents || 0), 0)

  return NextResponse.json({
    payouts: payouts || [],
    pendingCents,
    pendingCount: pending?.length || 0,
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    reviewerId: string
    method?: 'manual' | 'stripe_connect'
    notes?: string
  }

  const { reviewerId, method = 'manual', notes } = body
  if (!reviewerId) return NextResponse.json({ error: 'reviewerId required' }, { status: 400 })

  const supabase = getSupabaseAdmin()

  // Get all unpaid submitted assignments
  const { data: unpaidAssignments } = await supabase
    .from('cc_task_assignments')
    .select('id, reward_cents')
    .eq('reviewer_id', reviewerId)
    .eq('status', 'submitted')
    .is('payout_id', null)

  if (!unpaidAssignments?.length) {
    return NextResponse.json({ error: 'No unpaid assignments found' }, { status: 404 })
  }

  const totalCents = unpaidAssignments.reduce((sum, a) => sum + (a.reward_cents || 0), 0)
  const assignmentIds = unpaidAssignments.map(a => a.id)

  // Get reviewer payout info
  const { data: profile } = await supabase
    .from('cc_profiles')
    .select('stripe_connect_account_id, payout_email, display_name')
    .eq('id', reviewerId)
    .single()

  let stripeTransferId: string | null = null
  let payoutStatus: 'pending' | 'processing' | 'paid' = 'pending'
  let manualRef: string | null = null

  if (method === 'stripe_connect' && profile?.stripe_connect_account_id) {
    // ── Stripe Connect stub ────────────────────────────────────────────────
    // In production, call Stripe Transfers API:
    //
    //   const transfer = await stripe.transfers.create({
    //     amount: totalCents,
    //     currency: 'usd',
    //     destination: profile.stripe_connect_account_id,
    //     description: `ClaimCheck reviewer payout — ${assignmentIds.length} reviews`,
    //     metadata: { reviewer_id: reviewerId, assignment_count: String(assignmentIds.length) },
    //   })
    //   stripeTransferId = transfer.id
    //   payoutStatus = 'paid'
    //
    stripeTransferId = `stub_transfer_${Date.now()}`
    payoutStatus = 'processing'
  } else {
    // Manual payout — admin processes offline (bank transfer, PayPal, etc.)
    manualRef = `MANUAL-${Date.now()}-${reviewerId.slice(0, 8).toUpperCase()}`
    payoutStatus = 'pending'
  }

  // Create payout record
  const { data: payout, error } = await supabase
    .from('cc_payouts')
    .insert({
      reviewer_id: reviewerId,
      amount_cents: totalCents,
      currency: 'usd',
      method,
      status: payoutStatus,
      assignment_ids: assignmentIds,
      stripe_transfer_id: stripeTransferId,
      manual_ref: manualRef,
      manual_paid_by: method === 'manual' ? 'admin_pending' : null,
      notes: notes || null,
      processed_at: method === 'stripe_connect' ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Link assignments to payout
  await supabase
    .from('cc_task_assignments')
    .update({ payout_id: payout.id })
    .in('id', assignmentIds)

  await emitTelemetry({
    eventType: 'marketplace.payout_created',
    metadata: { reviewerId, totalCents, method, assignmentCount: assignmentIds.length },
  })

  return NextResponse.json({
    payoutId: payout.id,
    totalCents,
    assignmentCount: assignmentIds.length,
    method,
    status: payoutStatus,
    manualRef,
    stripeTransferId,
    note: method === 'manual'
      ? `Manual payout ref: ${manualRef}. Admin will process this offline within 5 business days.`
      : `Stripe transfer initiated: ${stripeTransferId}`,
  }, { status: 201 })
}
