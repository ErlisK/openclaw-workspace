/**
 * lib/credits.ts — Server-side credit/reward wallet logic
 * 
 * Credit model:
 *   1 credit = $1 tester reward (e.g. $5 gift card = 5 credits)
 *   Credits are earned via plan grants (monthly) or Stripe top-up purchases.
 *   Credits are spent when a completed session triggers a tester reward.
 *
 * Non-throwing: all functions return { ok, error } or a fallback value.
 */
import { createServiceClient } from '@/lib/supabase-server'

export interface CreditBalance {
  balance: number
  totalEarned: number
  totalSpent: number
}

export interface CreditTransaction {
  id: string
  amount: number
  type: string
  description: string | null
  referenceId: string | null
  balanceAfter: number
  createdAt: string
}

export interface TopupPackage {
  id: string
  credits: number
  priceCents: number
  label: string
  popular: boolean
  stripePriceId: string | null
}

/** Get current credit balance for a user. Returns 0-balance on error. */
export async function getCreditBalance(userId: string): Promise<CreditBalance> {
  try {
    const svc = createServiceClient()
    const { data } = await svc
      .from('credit_balances')
      .select('balance, total_earned, total_spent')
      .eq('user_id', userId)
      .single()

    return {
      balance: data?.balance ?? 0,
      totalEarned: data?.total_earned ?? 0,
      totalSpent: data?.total_spent ?? 0,
    }
  } catch {
    return { balance: 0, totalEarned: 0, totalSpent: 0 }
  }
}

/** Get recent credit transactions for a user. */
export async function getCreditTransactions(userId: string, limit = 20): Promise<CreditTransaction[]> {
  try {
    const svc = createServiceClient()
    const { data } = await svc
      .from('credit_transactions')
      .select('id, amount, type, description, reference_id, balance_after, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    return (data ?? []).map(r => ({
      id: r.id,
      amount: r.amount,
      type: r.type,
      description: r.description,
      referenceId: r.reference_id,
      balanceAfter: r.balance_after,
      createdAt: r.created_at,
    }))
  } catch {
    return []
  }
}

/** Get all available top-up packages. */
export async function getTopupPackages(): Promise<TopupPackage[]> {
  try {
    const svc = createServiceClient()
    const { data } = await svc
      .from('credit_topup_packages')
      .select('id, credits, price_cents, label, popular, stripe_price_id')
      .order('credits')

    return (data ?? []).map(r => ({
      id: r.id,
      credits: r.credits,
      priceCents: r.price_cents,
      label: r.label,
      popular: r.popular,
      stripePriceId: r.stripe_price_id,
    }))
  } catch {
    return []
  }
}

/**
 * Debit 1 credit when a tester session completes with a reward.
 * Idempotent: won't debit if referenceId already exists as session_reward.
 * Returns { ok, newBalance, error }.
 */
export async function spendCredit({
  userId,
  sessionId,
  description,
}: {
  userId: string
  sessionId: string
  description?: string
}): Promise<{ ok: boolean; newBalance: number; error?: string }> {
  try {
    const svc = createServiceClient()

    // Idempotency check
    const { data: existing } = await svc
      .from('credit_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('reference_id', sessionId)
      .eq('type', 'session_reward')
      .single()

    if (existing) return { ok: true, newBalance: -1, error: 'Already rewarded' }

    // Get current balance
    const { data: bal } = await svc
      .from('credit_balances')
      .select('balance')
      .eq('user_id', userId)
      .single()

    const current = bal?.balance ?? 0
    if (current < 1) {
      return { ok: false, newBalance: current, error: 'Insufficient credits' }
    }

    const newBalance = current - 1

    // Update balance
    await svc.from('credit_balances').upsert({
      user_id: userId,
      balance: newBalance,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    // Record transaction
    await svc.from('credit_transactions').insert({
      user_id: userId,
      amount: -1,
      type: 'session_reward',
      description: description ?? 'Tester reward paid',
      reference_id: sessionId,
      balance_after: newBalance,
    })

    return { ok: true, newBalance }
  } catch (err) {
    console.error('[spendCredit] error', err)
    return { ok: false, newBalance: 0, error: 'Internal error' }
  }
}

/**
 * Add credits after a successful Stripe top-up checkout.
 * Called from webhook handler.
 */
export async function addCredits({
  userId,
  amount,
  type,
  description,
  referenceId,
  stripePaymentIntentId,
}: {
  userId: string
  amount: number
  type: 'topup_stripe' | 'plan_grant' | 'refund' | 'adjustment'
  description: string
  referenceId?: string
  stripePaymentIntentId?: string
}): Promise<{ ok: boolean; newBalance: number; error?: string }> {
  try {
    const svc = createServiceClient()

    // Idempotency: prevent double-grant on webhook retry
    if (stripePaymentIntentId) {
      const { data: existing } = await svc
        .from('credit_transactions')
        .select('id, balance_after')
        .eq('stripe_payment_intent_id', stripePaymentIntentId)
        .single()
      if (existing) return { ok: true, newBalance: existing.balance_after }
    }

    // Upsert balance
    const { data: current } = await svc
      .from('credit_balances')
      .select('balance, total_earned')
      .eq('user_id', userId)
      .single()

    const prevBalance = current?.balance ?? 0
    const prevEarned = current?.total_earned ?? 0
    const newBalance = prevBalance + amount

    await svc.from('credit_balances').upsert({
      user_id: userId,
      balance: newBalance,
      total_earned: prevEarned + amount,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    await svc.from('credit_transactions').insert({
      user_id: userId,
      amount,
      type,
      description,
      reference_id: referenceId ?? null,
      balance_after: newBalance,
      stripe_payment_intent_id: stripePaymentIntentId ?? null,
    })

    return { ok: true, newBalance }
  } catch (err) {
    console.error('[addCredits] error', err)
    return { ok: false, newBalance: 0, error: 'Internal error' }
  }
}

/** Check whether a user has enough credits to reward a tester. */
export async function canRewardTester(userId: string): Promise<{ canReward: boolean; balance: number }> {
  const { balance } = await getCreditBalance(userId)
  return { canReward: balance >= 1, balance }
}
