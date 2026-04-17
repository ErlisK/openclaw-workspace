/**
 * POST /api/promo
 * Redeem a promotional code for free credits (one-time per user).
 * Body: { code: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/get-client'
import { createAdminClient } from '@/lib/supabase/server'
import { addCredits } from '@/lib/credits'

const PROMO_CODES: Record<string, { credits: number; label: string; maxUses: number }> = {
  LAUNCH: { credits: 500, label: 'Launch Week — free Quick test', maxUses: 500 },
  FIRST5: { credits: 500, label: 'First 5 free', maxUses: 200 },
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const code = (body?.code ?? '').toString().trim().toUpperCase()

  const promo = PROMO_CODES[code]
  if (!promo) {
    return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Check if user already redeemed this code
  const { data: existing } = await admin
    .from('credit_transactions')
    .select('id')
    .eq('user_id', user.id)
    .like('description', `%${code}%`)
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'Promo code already redeemed' }, { status: 409 })
  }

  // Check global usage count
  const { count } = await admin
    .from('credit_transactions')
    .select('id', { count: 'exact', head: true })
    .like('description', `%promo:${code}%`)

  if ((count ?? 0) >= promo.maxUses) {
    return NextResponse.json({ error: 'Promo code has reached its limit' }, { status: 410 })
  }

  // Apply credits
  const result = await addCredits(user.id, promo.credits, {
    description: `Promo code redeemed: promo:${code} — ${promo.label}`,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'Failed to apply credits' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    credits_added: promo.credits,
    new_balance: result.balance,
    message: `🎉 ${promo.label} — ${promo.credits / 100} credits added to your account!`,
  })
}
