import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import { trackServer } from '@/lib/analytics'

const REFERRAL_CREDITS = {
  referrer: 5,  // clips credited to the person who shared
  referee: 3,   // clips credited to the new user who signed up via referral
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://clipspark-tau.vercel.app'

// GET /api/referral — get current user's referral code, link, and stats
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get user's referral code (generate if missing)
  const { data: profile } = await supabase
    .from('users')
    .select('referral_code, full_name')
    .eq('id', user.id)
    .single()

  let referralCode = profile?.referral_code
  if (!referralCode) {
    // Generate one via DB function
    const svc = createServiceClient()
    const { data: generated } = await svc.rpc('generate_referral_code', { user_id: user.id })
    referralCode = generated as string
    if (referralCode) {
      await svc.from('users').update({ referral_code: referralCode }).eq('id', user.id)
    }
  }

  // Get referral stats
  const { data: referrals } = await supabase
    .from('referrals')
    .select('id, status, activated_at, credited_at, referrer_credits_granted, referee_credits_granted, created_at')
    .eq('referrer_id', user.id)
    .order('created_at', { ascending: false })

  const totalCreditsEarned = (referrals || [])
    .reduce((sum, r) => sum + (r.referrer_credits_granted || 0), 0)

  const stats = {
    total: (referrals || []).length,
    pending: (referrals || []).filter(r => r.status === 'pending').length,
    activated: (referrals || []).filter(r => r.status === 'activated' || r.status === 'credited').length,
    credited: (referrals || []).filter(r => r.status === 'credited').length,
    credits_earned: totalCreditsEarned,
  }

  return NextResponse.json({
    referral_code: referralCode,
    referral_url: `${APP_URL}?ref=${referralCode}`,
    credits: {
      you_earn: REFERRAL_CREDITS.referrer,
      they_get: REFERRAL_CREDITS.referee,
    },
    stats,
    recent_referrals: (referrals || []).slice(0, 10).map(r => ({
      id: r.id,
      status: r.status,
      activated_at: r.activated_at,
      credited_at: r.credited_at,
      credits_granted: r.referrer_credits_granted,
      created_at: r.created_at,
    })),
  })
}

// POST /api/referral/redeem — called when a new user signs up with a referral code
// Body: { referral_code }
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { referral_code } = await request.json()
  if (!referral_code) return NextResponse.json({ error: 'referral_code required' }, { status: 400 })

  const svc = createServiceClient()

  // Check if user already has a referral
  const { data: existingRef } = await svc
    .from('referrals')
    .select('id')
    .eq('referee_id', user.id)
    .single()

  if (existingRef) {
    return NextResponse.json({ error: 'Already used a referral code' }, { status: 409 })
  }

  // Find the referrer
  const { data: referrer } = await svc
    .from('users')
    .select('id, email, full_name')
    .eq('referral_code', referral_code.toUpperCase().trim())
    .single()

  if (!referrer) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })
  }

  if (referrer.id === user.id) {
    return NextResponse.json({ error: 'Cannot use your own referral code' }, { status: 400 })
  }

  // Create referral record
  const { data: referral, error } = await svc
    .from('referrals')
    .insert({
      referrer_id: referrer.id,
      referee_id: user.id,
      referral_code: referral_code.toUpperCase().trim(),
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Link referee → referrer in users table
  await svc.from('users').update({
    referred_by: referrer.id,
  }).eq('id', user.id)

  // Grant immediate bonus to referee (they get 3 extra clips just for signing up via referral)
  await grantCredits(svc, user.id, REFERRAL_CREDITS.referee, 'referral_signup', referral.id)

  trackServer(user.id, 'referral_redeemed', {
    referral_code,
    referrer_id: referrer.id,
    referee_credits_granted: REFERRAL_CREDITS.referee,
  })

  return NextResponse.json({
    success: true,
    referral_id: referral.id,
    credits_granted: REFERRAL_CREDITS.referee,
    message: `You got ${REFERRAL_CREDITS.referee} bonus clips! Your friend gets ${REFERRAL_CREDITS.referrer} when you make your first clip.`,
  }, { status: 201 })
}

/**
 * Grant credits to a user: adds to credits_bal in usage_ledger + logs to credit_transactions
 */
export async function grantCredits(
  svc: ReturnType<typeof createServiceClient>,
  userId: string,
  amount: number,
  reason: string,
  referenceId?: string,
  referenceType = 'referral',
) {
  const periodStart = new Date().toISOString().slice(0, 7) + '-01'

  // Upsert usage_ledger
  const { data: existing } = await svc
    .from('usage_ledger')
    .select('id, credits_bal')
    .eq('user_id', userId)
    .eq('period_start', periodStart)
    .single()

  if (existing) {
    await svc.from('usage_ledger').update({
      credits_bal: (existing.credits_bal || 0) + amount,
      updated_at: new Date().toISOString(),
    }).eq('id', existing.id)
  } else {
    await svc.from('usage_ledger').insert({
      user_id: userId,
      period_start: periodStart,
      clips_used: 0,
      credits_used: 0,
      credits_bal: amount,
      minutes_uploaded: 0,
      minutes_processed: 0,
    })
  }

  // Log transaction
  await svc.from('credit_transactions').insert({
    user_id: userId,
    amount,
    reason,
    reference_id: referenceId || null,
    reference_type: referenceType,
  })
}
