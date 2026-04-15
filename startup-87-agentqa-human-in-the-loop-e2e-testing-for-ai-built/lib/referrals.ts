/**
 * lib/referrals.ts — Referral code generation and credit grant logic
 */
import { createAdminClient } from '@/lib/supabase/server'

/** Generate a unique referral code (6-char alphanumeric) */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

/**
 * Get or create the referral code for a user.
 * Idempotent — multiple calls return the same code.
 */
export async function getOrCreateReferralCode(userId: string): Promise<{ code: string; id: string } | null> {
  const admin = createAdminClient()

  // Check for existing
  const { data: existing } = await admin
    .from('referrals')
    .select('id, code')
    .eq('referrer_id', userId)
    .limit(1)
    .single()

  if (existing) return existing

  // Generate unique code
  let code = generateCode()
  let attempts = 0
  while (attempts < 5) {
    const { error } = await admin.from('referrals').insert({
      referrer_id: userId,
      code,
      credits_per_referral: 3,
    })
    if (!error) break
    if (error.code !== '23505') return null // not a uniqueness violation
    code = generateCode()
    attempts++
  }

  const { data: created } = await admin
    .from('referrals')
    .select('id, code')
    .eq('referrer_id', userId)
    .single()

  return created ?? null
}

/**
 * Apply a referral code during signup (stores it on the user row for later).
 * The actual credit grant happens on first_purchase via applyReferralCredits().
 */
export async function storeReferralCode(userId: string, code: string): Promise<boolean> {
  const admin = createAdminClient()

  // Validate code exists
  const { data: referral } = await admin
    .from('referrals')
    .select('id, referrer_id, max_uses, uses_count')
    .eq('code', code.toUpperCase().trim())
    .single()

  if (!referral) return false
  if (referral.referrer_id === userId) return false // can't refer yourself
  if (referral.max_uses !== null && referral.uses_count >= referral.max_uses) return false

  const { error } = await admin
    .from('users')
    .update({ referred_by_code: code.toUpperCase().trim() })
    .eq('id', userId)

  return !error
}

/**
 * Grant referral credits to both sides on first purchase.
 * Called from the Stripe webhook after a successful payment.
 * Safe to call multiple times — idempotent via referral_credited_at.
 */
export async function applyReferralCredits(userId: string): Promise<{
  applied: boolean
  referrerGranted?: number
  refereeGranted?: number
  error?: string
}> {
  const admin = createAdminClient()

  // Check if already credited
  const { data: user } = await admin
    .from('users')
    .select('referred_by_code, referral_credited_at')
    .eq('id', userId)
    .single()

  if (!user) return { applied: false, error: 'User not found' }
  if (user.referral_credited_at) return { applied: false } // already done
  if (!user.referred_by_code) return { applied: false } // no referral code

  // Find the referral record
  const { data: referral } = await admin
    .from('referrals')
    .select('id, referrer_id, credits_per_referral')
    .eq('code', user.referred_by_code)
    .single()

  if (!referral) return { applied: false, error: 'Referral code not found' }

  const creditsToGrant = referral.credits_per_referral ?? 3

  // Grant to referee (the new user)
  const { data: referee } = await admin
    .from('users')
    .select('credits_balance')
    .eq('id', userId)
    .single()

  if (!referee) return { applied: false, error: 'Referee user not found' }

  const newRefereeBalance = (referee.credits_balance ?? 0) + creditsToGrant

  await admin
    .from('users')
    .update({ credits_balance: newRefereeBalance, referral_credited_at: new Date().toISOString() })
    .eq('id', userId)

  const { data: refereeTx } = await admin
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount_cents: creditsToGrant * 100,
      balance_after: newRefereeBalance,
      kind: 'referral_bonus',
      description: `Referral bonus — ${creditsToGrant} credits for using invite code`,
    })
    .select('id')
    .single()

  // Grant to referrer
  const { data: referrerUser } = await admin
    .from('users')
    .select('credits_balance')
    .eq('id', referral.referrer_id)
    .single()

  let referrerTxId: string | undefined
  if (referrerUser) {
    const newReferrerBalance = (referrerUser.credits_balance ?? 0) + creditsToGrant

    await admin
      .from('users')
      .update({ credits_balance: newReferrerBalance })
      .eq('id', referral.referrer_id)

    const { data: referrerTx } = await admin
      .from('credit_transactions')
      .insert({
        user_id: referral.referrer_id,
        amount_cents: creditsToGrant * 100,
        balance_after: newReferrerBalance,
        kind: 'referral_bonus',
        description: `Referral bonus — ${creditsToGrant} credits for referring a new user`,
      })
      .select('id')
      .single()

    referrerTxId = referrerTx?.id
  }

  // Record the referral event
  await admin.from('referral_events').insert({
    referral_id: referral.id,
    referee_id: userId,
    referrer_credit_tx_id: referrerTxId ?? null,
    referee_credit_tx_id: refereeTx?.id ?? null,
    triggered_by: 'first_purchase',
  })

  // Increment uses_count
  await admin
    .from('referrals')
    .update({ uses_count: (referral as any).uses_count + 1 })
    .eq('id', referral.id)

  return { applied: true, referrerGranted: creditsToGrant, refereeGranted: creditsToGrant }
}

/** Validate a referral code (for the landing page) */
export async function validateReferralCode(code: string): Promise<{
  valid: boolean
  referrerName?: string
  creditsBonus?: number
}> {
  if (!code) return { valid: false }
  const admin = createAdminClient()
  const { data } = await admin
    .from('referrals')
    .select('id, credits_per_referral, max_uses, uses_count, referrer_id')
    .eq('code', code.toUpperCase().trim())
    .single()

  if (!data) return { valid: false }
  if (data.max_uses !== null && data.uses_count >= data.max_uses) return { valid: false }

  return { valid: true, creditsBonus: data.credits_per_referral ?? 3 }
}
