/**
 * GET  /api/credits — Get current user's credit balance + transaction history
 * POST /api/credits — Admin: manually add credits (for testing/bonus)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/get-client'
import { createAdminClient } from '@/lib/supabase/server'
import { getBalance, addCredits } from '@/lib/credits'
import { CREDIT_PACKS, TIER_CREDITS } from '@/lib/stripe'

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
    amount: Math.round(tx.amount_cents / 100), // credits (not cents)
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

  const body = await req.json()
  const { amount, description } = body as { amount?: number; description?: string }

  // Allow admin role or test header
  const admin = createAdminClient()
  const { data: dbUser } = await admin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const isTestRequest = req.headers.get('x-test-admin') === process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-8)
  const isAdmin = dbUser?.role === 'admin'

  if (!isAdmin && !isTestRequest) {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  if (!amount || amount < 1 || amount > 1000) {
    return NextResponse.json({ error: 'amount must be between 1 and 1000' }, { status: 400 })
  }

  const result = await addCredits(user.id, amount, {
    description: description ?? `Admin bonus: ${amount} credits`,
  })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })

  return NextResponse.json({ balance: result.balance }, { status: 200 })
}
