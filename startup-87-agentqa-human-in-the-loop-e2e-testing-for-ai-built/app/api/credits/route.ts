/**
 * GET  /api/credits — Get current user's credit balance + transaction history
 * POST /api/credits — Admin: manually add credits
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/get-client'
import { createAdminClient } from '@/lib/supabase/server'
import { getBalance, addCredits } from '@/lib/credits'
import { CREDIT_PACKS, TIER_CREDITS } from '@/lib/stripe'

// Simple in-memory rate limiter for admin credit endpoint (5 req/min per admin)
const adminRateLimits = new Map<string, { count: number; resetAt: number }>()
function checkAdminRateLimit(userId: string): boolean {
  const now = Date.now()
  const key = `credits:${userId}`
  const bucket = adminRateLimits.get(key)
  if (!bucket || now > bucket.resetAt) {
    adminRateLimits.set(key, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (bucket.count >= 5) return false
  bucket.count++
  return true
}

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const balance = await getBalance(user.id)
  if (!balance.ok) return NextResponse.json({ error: balance.error }, { status: 500 })

  // Fetch recent transactions — map amount_cents to amount for UI
  const admin = createAdminClient()
  const { data: rawTxns } = await admin
    .from('credit_transactions')
    .select('id, user_id, amount_cents, balance_after, kind, description, job_id, stripe_payment_intent_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const transactions = (rawTxns ?? []).map((tx: { id: string; user_id: string; amount_cents: number; balance_after: number; kind: string; description: string | null; job_id: string | null; stripe_payment_intent_id: string | null; created_at: string }) => ({
    ...tx,
    amount: Math.round(tx.amount_cents / 100),
  }))

  return NextResponse.json({
    balance: balance.balance,
    held: balance.held,
    available: balance.available,
    transactions,
    packs: CREDIT_PACKS.map(p => ({
      id: p.id,
      name: p.name,
      credits: p.credits,
      price_cents: p.price_cents,
      description: p.description,
      badge: p.badge,
    })),
    tier_costs: TIER_CREDITS,
  })
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Strictly gate to admin role — no backdoor headers
  const admin = createAdminClient()
  const { data: dbUser } = await admin
    .from('users')
    .select('role, email')
    .eq('id', user.id)
    .single()

  if (dbUser?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  // Rate limiting: 5 req/min per admin
  if (!checkAdminRateLimit(user.id)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
  }

  const body = await req.json()
  const { amount, description, target_user_id } = body as { amount?: number; description?: string; target_user_id?: string }

  if (!amount || amount < 1 || amount > 1000) {
    return NextResponse.json({ error: 'amount must be between 1 and 1000' }, { status: 400 })
  }

  const recipientId = target_user_id ?? user.id

  const result = await addCredits(recipientId, amount, {
    description: description ?? `Admin bonus: ${amount} credits`,
  })

  if (!result.ok) return NextResponse.json({ error: 'Internal error' }, { status: 500 })

  // Audit log
  console.log(JSON.stringify({
    audit: 'credits_admin_add',
    admin_id: user.id,
    admin_email: dbUser?.email,
    recipient_id: recipientId,
    amount,
    description,
    ts: new Date().toISOString(),
  }))

  return NextResponse.json({ balance: result.balance }, { status: 200 })
}
