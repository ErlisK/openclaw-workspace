/**
 * lib/credits.ts — Credit ledger operations
 *
 * All mutations use the admin client (service role) to bypass RLS.
 * Functions return { ok, error, balance } for consistent error handling.
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
  const { data, error } = await admin
    .from('profiles')
    .select('credits_balance, credits_held')
    .eq('id', userId)
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? 'Profile not found' }

  return {
    ok: true,
    balance: data.credits_balance,
    held: data.credits_held,
    available: data.credits_balance - data.credits_held,
  }
}

/** Add credits after successful purchase (called from webhook) */
export async function addCredits(
  userId: string,
  amount: number,
  opts: { checkoutId?: string; paymentIntent?: string; description?: string }
): Promise<CreditResult> {
  const admin = createAdminClient()

  // Fetch current balance
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('credits_balance, credits_held')
    .eq('id', userId)
    .single()

  if (profileError || !profile) return { ok: false, error: 'Profile not found' }

  const newBalance = profile.credits_balance + amount

  // Update balance
  const { error: updateError } = await admin
    .from('profiles')
    .update({ credits_balance: newBalance })
    .eq('id', userId)

  if (updateError) return { ok: false, error: updateError.message }

  // Record transaction
  await admin.from('credit_transactions').insert({
    user_id: userId,
    amount,
    balance_after: newBalance,
    kind: 'purchase',
    description: opts.description ?? `Purchased ${amount} credits`,
    stripe_checkout_id: opts.checkoutId ?? null,
    stripe_payment_intent: opts.paymentIntent ?? null,
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

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('credits_balance, credits_held')
    .eq('id', userId)
    .single()

  if (profileError || !profile) return { ok: false, error: 'Profile not found' }

  const available = profile.credits_balance - profile.credits_held
  if (available < cost) {
    return { ok: false, error: `Insufficient credits: need ${cost}, have ${available} available` }
  }

  const newHeld = profile.credits_held + cost

  const { error: updateError } = await admin
    .from('profiles')
    .update({ credits_held: newHeld })
    .eq('id', userId)

  if (updateError) return { ok: false, error: updateError.message }

  await admin.from('credit_transactions').insert({
    user_id: userId,
    amount: -cost,
    balance_after: profile.credits_balance,
    kind: 'job_hold',
    description: `Held ${cost} credits for job`,
    job_id: jobId,
  })

  return { ok: true, balance: profile.credits_balance, held: newHeld, available: available - cost }
}

/** Spend credits when a job completes (deduct from balance + release hold) */
export async function spendCredits(
  userId: string,
  jobId: string,
  tier: string
): Promise<CreditResult> {
  const admin = createAdminClient()
  const cost = TIER_CREDITS[tier] ?? 5

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('credits_balance, credits_held')
    .eq('id', userId)
    .single()

  if (profileError || !profile) return { ok: false, error: 'Profile not found' }

  const newBalance = Math.max(0, profile.credits_balance - cost)
  const newHeld = Math.max(0, profile.credits_held - cost)

  const { error: updateError } = await admin
    .from('profiles')
    .update({ credits_balance: newBalance, credits_held: newHeld })
    .eq('id', userId)

  if (updateError) return { ok: false, error: updateError.message }

  await admin.from('credit_transactions').insert({
    user_id: userId,
    amount: -cost,
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

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('credits_balance, credits_held')
    .eq('id', userId)
    .single()

  if (profileError || !profile) return { ok: false, error: 'Profile not found' }

  const newHeld = Math.max(0, profile.credits_held - cost)

  const { error: updateError } = await admin
    .from('profiles')
    .update({ credits_held: newHeld })
    .eq('id', userId)

  if (updateError) return { ok: false, error: updateError.message }

  await admin.from('credit_transactions').insert({
    user_id: userId,
    amount: cost,
    balance_after: profile.credits_balance,
    kind: 'job_release',
    description: `Released ${cost} held credits (job expired/cancelled)`,
    job_id: jobId,
  })

  return { ok: true, balance: profile.credits_balance, held: newHeld, available: profile.credits_balance - newHeld }
}
