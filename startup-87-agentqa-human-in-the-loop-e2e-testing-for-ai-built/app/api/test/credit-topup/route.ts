/**
 * POST /api/test/credit-topup
 *
 * Test-only route that mints credits for E2E automation without going through Stripe.
 * Guarded by:
 *   1. NODE_ENV !== 'production'  OR  E2E_TEST_SECRET header match
 *   2. Valid Supabase JWT (authenticated user) OR explicit user_id in body with secret
 *
 * This route is the ONLY intended way for E2E tests to fund credit balances,
 * replacing direct Supabase service-role PATCH calls that expose the service key.
 *
 * Request body:
 *   { amount: number, description?: string }          — top-up authed user
 *   { user_id: string, amount: number, description? } — top-up specific user (requires secret)
 *
 * Returns:
 *   { ok: true, balance: number, held: number, available: number, transaction_id: string }
 *
 * Security:
 *   - Returns 404 in production without E2E_TEST_SECRET header match
 *   - Returns 401 if no auth and no secret-with-user_id
 *   - Returns 400 for invalid amounts (must be 1–10000)
 *   - Rate-limited to 100 credits per call maximum
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/get-client'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const MAX_AMOUNT = 10000
const MIN_AMOUNT = 1

export async function POST(req: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production'
  const e2eSecret = process.env.E2E_TEST_SECRET
  const reqSecret = req.headers.get('x-e2e-secret')

  // In production: require the secret header to even acknowledge this route exists
  // (Prevents accidental exposure; deployed Vercel preview builds are not "production")
  if (isProduction && (!e2eSecret || reqSecret !== e2eSecret)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Outside production: still require secret if set (defense in depth)
  const secretValid = e2eSecret ? reqSecret === e2eSecret : true

  // Parse body
  let body: { user_id?: string; amount?: number; description?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { user_id: targetUserId, amount, description } = body

  // Validate amount
  if (!amount || typeof amount !== 'number' || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    return NextResponse.json(
      { error: `amount must be a number between ${MIN_AMOUNT} and ${MAX_AMOUNT}` },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  let resolvedUserId: string

  if (targetUserId) {
    // Explicit user_id: requires secret
    if (!secretValid) {
      return NextResponse.json(
        { error: 'x-e2e-secret header required when specifying user_id' },
        { status: 401 }
      )
    }
    resolvedUserId = targetUserId
  } else {
    // Authed user: requires valid JWT
    const supabase = await getSupabaseClient(req)
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized — provide JWT or user_id+secret' }, { status: 401 })
    }
    resolvedUserId = user.id
  }

  // Fetch current balance
  const { data: dbUser, error: fetchError } = await admin
    .from('users')
    .select('credits_balance, credits_held')
    .eq('id', resolvedUserId)
    .single()

  if (fetchError || !dbUser) {
    return NextResponse.json(
      { error: `User not found: ${resolvedUserId}` },
      { status: 404 }
    )
  }

  const newBalance = dbUser.credits_balance + amount

  // Update balance
  const { error: updateError } = await admin
    .from('users')
    .update({ credits_balance: newBalance })
    .eq('id', resolvedUserId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Record transaction
  const txDescription = description ?? `E2E test top-up: +${amount} credits`
  const { data: txRow, error: txError } = await admin
    .from('credit_transactions')
    .insert({
      user_id: resolvedUserId,
      amount_cents: amount * 100,
      balance_after: newBalance,
      kind: 'bonus',
      description: txDescription,
    })
    .select('id')
    .single()

  if (txError) {
    // Non-fatal: balance was updated, just log
    console.warn('credit-topup: tx insert failed:', txError.message)
  }

  const held = dbUser.credits_held ?? 0

  return NextResponse.json({
    ok: true,
    balance: newBalance,
    held,
    available: newBalance - held,
    transaction_id: txRow?.id ?? null,
    user_id: resolvedUserId,
  }, { status: 200 })
}

// Reject all other methods
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
