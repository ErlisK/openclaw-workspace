import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/v1/referral-credits?userId=xxx
 *   Returns credit balance + referral stats
 *
 * POST /api/v1/referral-credits
 *   Body: { action: 'redeem', userId, sessionId }
 *     Redeems 1 credit (= 1 free book download)
 *     Returns: { ok, creditsRemaining, orderId }
 *
 * CREDIT RULES:
 *   - 1 credit = 1 free book PDF download
 *   - Credits earned when referred user completes their first export
 *   - 1 credit per conversion (configurable via credit_per_conversion)
 *   - Milestone bonus: 3 conversions = 3 credits (1:1 ratio by default)
 *   - Credits tracked in profiles.referral_credits
 *   - Full redemption history in orders table (status='credited')
 *
 * REFERRAL FLOW:
 *   1. User A shares /refer/CODE link
 *   2. User B clicks → lands on /refer/CODE (tracked as 'click')
 *   3. User B creates session → session gets referral_code in metadata
 *   4. User B exports book → POST /api/v1/referral with action='convert'
 *   5. System awards 1 credit to User A via this endpoint
 */

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const sb = admin()

  // Get profile credits
  const { data: profile } = await sb
    .from('profiles')
    .select('referral_credits, total_referrals')
    .eq('id', userId)
    .single()

  // Get referral stats
  const { data: referral } = await sb
    .from('referrals')
    .select('referral_code, clicks, conversions, credits_awarded, credits_redeemed')
    .eq('referrer_id', userId)
    .single()

  // Get redemption history
  const { data: redemptions } = await sb
    .from('orders')
    .select('id, created_at, price_id, status')
    .eq('user_id', userId)
    .eq('status', 'credited')
    .order('created_at', { ascending: false })
    .limit(20)

  const p  = profile as { referral_credits?: number; total_referrals?: number } | null
  const r  = referral as { referral_code?: string; clicks?: number; conversions?: number; credits_awarded?: number; credits_redeemed?: number } | null

  return NextResponse.json({
    credits:         p?.referral_credits ?? 0,
    totalReferrals:  p?.total_referrals ?? 0,
    referralCode:    r?.referral_code ?? null,
    stats: {
      clicks:         r?.clicks ?? 0,
      conversions:    r?.conversions ?? 0,
      creditsAwarded: r?.credits_awarded ?? 0,
      creditsRedeemed: r?.credits_redeemed ?? 0,
    },
    redemptions: redemptions ?? [],
    // Progress toward next credit (3 invites = 1 free book)
    nextCreditAt:    ((r?.conversions ?? 0) % 3 === 0 && (r?.conversions ?? 0) > 0)
      ? 0
      : 3 - ((r?.conversions ?? 0) % 3),
    invitesNeeded:   Math.max(0, 3 - ((r?.conversions ?? 0) % 3)),
  })
}

export async function POST(req: NextRequest) {
  let body: { action?: string; userId?: string; sessionId?: string }
  try { body = await req.json() as typeof body }
  catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

  const { action, userId, sessionId } = body
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const sb = admin()

  if (action === 'redeem') {
    // Check balance
    const { data: profile } = await sb
      .from('profiles')
      .select('referral_credits')
      .eq('id', userId)
      .single()

    const credits = (profile as { referral_credits?: number } | null)?.referral_credits ?? 0
    if (credits < 1) {
      return NextResponse.json({ error: 'insufficient_credits', credits }, { status: 402 })
    }

    // Deduct 1 credit
    await sb.from('profiles')
      .update({ referral_credits: credits - 1 })
      .eq('id', userId)

    // Create a 'credited' order (free download)
    const { data: order } = await sb.from('orders').insert({
      user_id:      userId,
      session_id:   sessionId ?? null,
      price_id:     'referral_credit',
      amount_cents: 0,
      currency:     'usd',
      status:       'credited',
      metadata:     { credit_redemption: true, credits_before: credits },
    }).select('id').single()

    // Update referral credits_redeemed
    const { data: refRow } = await sb.from('referrals').select('credits_redeemed').eq('referrer_id', userId).single()
    const currCredits = (refRow as { credits_redeemed?: number } | null)?.credits_redeemed ?? 0
    await sb.from('referrals').update({ credits_redeemed: currCredits + 1 }).eq('referrer_id', userId)

    await sb.from('events').insert({
      event_name: 'referral_credit_redeemed',
      session_id: sessionId ?? null,
      properties: { user_id: userId, credits_before: credits },
    })

    return NextResponse.json({
      ok:               true,
      creditsRemaining: credits - 1,
      orderId:          (order as { id?: string } | null)?.id ?? null,
    })
  }

  if (action === 'award') {
    // Award a credit to referrer when their referral converts
    // Called internally by the export/payment flow
    const { userId: referrerId, sessionId: convertedSessionId } = body as {
      userId: string; sessionId?: string
    }

    const { data: profile } = await sb
      .from('profiles')
      .select('referral_credits, total_referrals')
      .eq('id', referrerId)
      .single()

    const curr      = (profile as { referral_credits?: number } | null)?.referral_credits ?? 0
    const totalRefs = (profile as { total_referrals?: number } | null)?.total_referrals ?? 0

    await sb.from('profiles')
      .update({ referral_credits: curr + 1, total_referrals: totalRefs + 1 })
      .eq('id', referrerId)

    await sb.from('events').insert({
      event_name: 'referral_credit_awarded',
      session_id: convertedSessionId ?? null,
      properties: { referrer_id: referrerId, credits_after: curr + 1 },
    })

    return NextResponse.json({ ok: true, creditsAwarded: 1, totalCredits: curr + 1 })
  }

  return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 })
}
