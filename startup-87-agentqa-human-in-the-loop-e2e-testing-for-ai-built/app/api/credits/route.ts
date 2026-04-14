/**
 * GET  /api/credits — Get current user's credit balance
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

  // Fetch recent transactions
  const admin = createAdminClient()
  const { data: transactions } = await admin
    .from('credit_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({
    balance: balance.balance,
    held: balance.held,
    available: balance.available,
    transactions: transactions ?? [],
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

  // Only allow admin top-ups (check admin role)
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // For test/bonus credits, also allow if the request has a test header
  const isTestRequest = req.headers.get('x-test-admin') === process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-8)
  const isAdmin = profile?.role === 'admin'

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
