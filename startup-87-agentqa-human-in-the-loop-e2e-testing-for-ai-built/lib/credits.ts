/**
 * lib/credits.ts — Credit ledger operations
 *
 * Maps to the actual DB schema:
 *   users table: credits_balance, credits_held, stripe_customer_id
 *   credit_transactions: amount_cents, balance_after, kind, stripe_payment_intent_id
 */

import { createAdminClient } from '@/lib/supabase/server'
import { TIER_CREDITS } from '@/lib/stripe'

interface CreditResult {
  ok: boolean
  error?: string
  balance?: number
  held?: number
  available?: number
}

/** Get credit balance for a user */
export async function getBalance(userId: string): Promise<CreditResult> {
  const admin = createAdminClient()
  let { data, error } = await admin
    .from('users')
    .select('credits_balance, credits_held')
    .eq('id', userId)
    .single()

  // If user row doesn't exist yet (race on signup trigger), create it
  if (error?.code === 'PGRST116' || (!data && !error)) {
    const upsert = await admin.from('users').upsert(
      { id: userId, credits_balance: 0, credits_held: 0 },
      { onConflict: 'id', ignoreDuplicates: true }
    )
    if (!upsert.error) {
      const retry = await admin.from('users').select('credits_balance, credits_held').eq('id', userId).single()
      data = retry.data; error = retry.error
    }
  }

  if (error || !data) return { ok: false, error: error?.message ?? 'User not found' }

  const held = data.credits_held ?? 0
  return {
    ok: true,
    balance: data.credits_balance,
    held,
    available: data.credits_balance - held,
  }
}

/** Add credits after successful purchase (called from webhook) */
export async function addCredits(
  userId: string,
  amount: number,
  opts: { checkoutId?: string; paymentIntent?: string; description?: string }
): Promise<CreditResult> {
  const admin = createAdminClient()

  const { data: user, error: userError } = await admin
    .from('users')
    .select('credits_balance, credits_held')
    .eq('id', userId)
    .single()

  if (userError || !user) return { ok: false, error: 'User not found' }

  const newBalance = user.credits_balance + amount

  const { error: updateError } = await admin
    .from('users')
    .update({ credits_balance: newBalance })
    .eq('id', userId)

  if (updateError) return { ok: false, error: updateError.message }

  // Record transaction (amount_cents = amount * 100 for display compatibility)
  await admin.from('credit_transactions').insert({
    user_id: userId,
    amount_cents: amount * 100,
    balance_after: newBalance,
    kind: 'purchase',
    description: opts.description ?? `Purchased ${amount} credits`,
    stripe_payment_intent_id: opts.paymentIntent ?? opts.checkoutId ?? null,
  })

  return { ok: true, balance: newBalance }
}

/** Hold credits when a job is published (reserve from available) */
export async function holdCredits(
  userId: string,
  jobId: string,
  tier: string
): Promise<CreditResult> {
  const admin = createAdminClient()
  const cost = TIER_CREDITS[tier] ?? 5

  const { data: user, error: userError } = await admin
    .from('users')
    .select('credits_balance, credits_held')
    .eq('id', userId)
    .single()

  if (userError || !user) return { ok: false, error: 'User not found' }

  const held = user.credits_held ?? 0
  const available = user.credits_balance - held

  if (available < cost) {
    return { ok: false, error: `Insufficient credits: need ${cost}, have ${available} available` }
  }

  const newHeld = held + cost

  const { error: updateError } = await admin
    .from('users')
    .update({ credits_held: newHeld })
    .eq('id', userId)

  if (updateError) return { ok: false, error: updateError.message }

  await admin.from('credit_transactions').insert({
    user_id: userId,
    amount_cents: -cost * 100,
    balance_after: user.credits_balance,
    kind: 'job_hold',
    description: `Held ${cost} credits for job`,
    job_id: jobId,
  })

  return { ok: true, balance: user.credits_balance, held: newHeld, available: available - cost }
}

/** Spend credits when a job completes (deduct from balance + release hold) */
export async function spendCredits(
  userId: string,
  jobId: string,
  tier: string
): Promise<CreditResult> {
  const admin = createAdminClient()
  const cost = TIER_CREDITS[tier] ?? 5

  const { data: user, error: userError } = await admin
    .from('users')
    .select('credits_balance, credits_held')
    .eq('id', userId)
    .single()

  if (userError || !user) return { ok: false, error: 'User not found' }

  const newBalance = Math.max(0, user.credits_balance - cost)
  const newHeld = Math.max(0, (user.credits_held ?? 0) - cost)

  const { error: updateError } = await admin
    .from('users')
    .update({ credits_balance: newBalance, credits_held: newHeld })
    .eq('id', userId)

  if (updateError) return { ok: false, error: updateError.message }

  await admin.from('credit_transactions').insert({
    user_id: userId,
    amount_cents: -cost * 100,
    balance_after: newBalance,
    kind: 'job_spend',
    description: `Spent ${cost} credits for completed job`,
    job_id: jobId,
  })

  return { ok: true, balance: newBalance, held: newHeld, available: newBalance - newHeld }
}

/** Release held credits when a job expires/cancelled without completion */
export async function releaseCredits(
  userId: string,
  jobId: string,
  tier: string
): Promise<CreditResult> {
  const admin = createAdminClient()
  const cost = TIER_CREDITS[tier] ?? 5

  const { data: user, error: userError } = await admin
    .from('users')
    .select('credits_balance, credits_held')
    .eq('id', userId)
    .single()

  if (userError || !user) return { ok: false, error: 'User not found' }

  const newHeld = Math.max(0, (user.credits_held ?? 0) - cost)

  const { error: updateError } = await admin
    .from('users')
    .update({ credits_held: newHeld })
    .eq('id', userId)

  if (updateError) return { ok: false, error: updateError.message }

  await admin.from('credit_transactions').insert({
    user_id: userId,
    amount_cents: cost * 100,
    balance_after: user.credits_balance,
    kind: 'job_release',
    description: `Released ${cost} held credits (job expired/cancelled)`,
    job_id: jobId,
  })

  return { ok: true, balance: user.credits_balance, held: newHeld, available: user.credits_balance - newHeld }
}
