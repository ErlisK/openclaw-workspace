/**
 * POST /api/test/credit-topup
 *
 * Test-only route that mints / resets credits for E2E automation without Stripe.
 * Guarded by:
 *   1. NODE_ENV !== 'production'  OR  E2E_TEST_SECRET header match
 *   2. Valid Supabase JWT (authenticated user) OR explicit user_id in body with secret
 *
 * Request body (mutually exclusive: use amount OR set_to, not both):
 *   { amount: number, description? }                         — add N credits to authed user
 *   { set_to: number, description? }                         — set exact balance for authed user
 *   { user_id: string, amount: number, description? }        — add N credits (requires secret)
 *   { user_id: string, set_to: number, description? }        — set exact balance (requires secret)
 *
 * Returns:
 *   { ok, balance, held, available, transaction_id, user_id }
 *
 * Security:
 *   - Returns 404 in production without E2E_TEST_SECRET header match
 *   - Returns 401 if no auth and no secret-with-user_id
 *   - Returns 400 for invalid amounts (amount: 1–10000; set_to: 0–10000)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/get-client'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const MAX_CREDITS = 10000

export async function POST(req: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production'
  const e2eSecret = process.env.E2E_TEST_SECRET
  const reqSecret = req.headers.get('x-e2e-secret')

  if (isProduction && (!e2eSecret || reqSecret !== e2eSecret)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const secretValid = e2eSecret ? reqSecret === e2eSecret : true

  let body: { user_id?: string; amount?: number; set_to?: number; description?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { user_id: targetUserId, amount, set_to, description } = body

  // Validate: must have exactly one of amount / set_to
  const hasAmount = amount !== undefined
  const hasSetTo = set_to !== undefined

  if (!hasAmount && !hasSetTo) {
    return NextResponse.json(
      { error: 'amount or set_to is required' },
      { status: 400 }
    )
  }
  if (hasAmount && hasSetTo) {
    return NextResponse.json(
      { error: 'provide amount or set_to, not both' },
      { status: 400 }
    )
  }
  if (hasAmount) {
    if (typeof amount !== 'number' || amount < 1 || amount > MAX_CREDITS) {
      return NextResponse.json(
        { error: `amount must be a number between 1 and ${MAX_CREDITS}` },
        { status: 400 }
      )
    }
  }
  if (hasSetTo) {
    if (typeof set_to !== 'number' || set_to < 0 || set_to > MAX_CREDITS) {
      return NextResponse.json(
        { error: `set_to must be a number between 0 and ${MAX_CREDITS}` },
        { status: 400 }
      )
    }
  }

  const admin = createAdminClient()
  let resolvedUserId: string

  if (targetUserId) {
    if (!secretValid) {
      return NextResponse.json(
        { error: 'x-e2e-secret header required when specifying user_id' },
        { status: 401 }
      )
    }
    resolvedUserId = targetUserId
  } else {
    const supabase = await getSupabaseClient(req)
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized — provide JWT or user_id+secret' }, { status: 401 })
    }
    resolvedUserId = user.id
  }

  // Fetch current state
  const { data: dbUser, error: fetchError } = await admin
    .from('users')
    .select('credits_balance, credits_held')
    .eq('id', resolvedUserId)
    .single()

  if (fetchError || !dbUser) {
    return NextResponse.json({ error: `User not found: ${resolvedUserId}` }, { status: 404 })
  }

  const currentBalance = dbUser.credits_balance ?? 0
  const held = dbUser.credits_held ?? 0

  let newBalance: number
  let delta: number
  let txDescription: string

  if (hasSetTo) {
    newBalance = set_to!
    delta = newBalance - currentBalance
    txDescription = description ?? `E2E set_to: ${newBalance} credits (was ${currentBalance})`
  } else {
    delta = amount!
    newBalance = currentBalance + delta
    txDescription = description ?? `E2E top-up: +${delta} credits`
  }

  // Update balance (and reset held to 0 on set_to for clean slate)
  const updateFields: Record<string, number> = { credits_balance: newBalance }
  if (hasSetTo) updateFields.credits_held = 0

  const { error: updateError } = await admin
    .from('users')
    .update(updateFields)
    .eq('id', resolvedUserId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Record transaction (skip for no-op set_to with same balance)
  let transactionId: string | null = null
  if (delta !== 0) {
    const { data: txRow, error: txError } = await admin
      .from('credit_transactions')
      .insert({
        user_id: resolvedUserId,
        amount_cents: delta * 100,
        balance_after: newBalance,
        kind: 'adjustment',
        description: txDescription,
      })
      .select('id')
      .single()

    if (txError) {
      console.warn('credit-topup: tx insert failed:', txError.message)
    } else {
      transactionId = txRow?.id ?? null
    }
  }

  const effectiveHeld = hasSetTo ? 0 : held

  return NextResponse.json({
    ok: true,
    balance: newBalance,
    held: effectiveHeld,
    available: newBalance - effectiveHeld,
    transaction_id: transactionId,
    user_id: resolvedUserId,
  }, { status: 200 })
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
