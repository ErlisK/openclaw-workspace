import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import { grantCredits } from '@/app/api/referral/route'
import { trackServer } from '@/lib/analytics'
import { sendEmail } from '@/lib/email-sequences'

const REFERRAL_CREDITS_REFERRER = 5

// POST /api/referral/activate — called when a referred user makes their first upload
// Should be called server-side from ingest route after job is created
export async function POST(request: Request) {
  // Only callable internally (no user auth needed — called from ingest)
  const body = await request.json()
  const { user_id } = body

  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const svc = createServiceClient()

  // Check if this user was referred and referral is still pending
  const { data: referral } = await svc
    .from('referrals')
    .select('id, referrer_id, referee_id, status')
    .eq('referee_id', user_id)
    .eq('status', 'pending')
    .single()

  if (!referral) {
    return NextResponse.json({ activated: false, reason: 'No pending referral found' })
  }

  // Mark referral as activated
  await svc.from('referrals').update({
    status: 'activated',
    activated_at: new Date().toISOString(),
  }).eq('id', referral.id)

  // Mark in users table
  await svc.from('users').update({
    referral_activated_at: new Date().toISOString(),
  }).eq('id', user_id)

  // Grant credits to referrer
  await grantCredits(
    svc,
    referral.referrer_id,
    REFERRAL_CREDITS_REFERRER,
    'referral_activation',
    referral.id,
  )

  // Update referral record
  await svc.from('referrals').update({
    status: 'credited',
    credited_at: new Date().toISOString(),
    referrer_credits_granted: REFERRAL_CREDITS_REFERRER,
  }).eq('id', referral.id)

  // Notify the referrer by email
  const { data: referrer } = await svc
    .from('users')
    .select('email, full_name')
    .eq('id', referral.referrer_id)
    .single()

  const { data: referee } = await svc
    .from('users')
    .select('email, full_name')
    .eq('id', user_id)
    .single()

  if (referrer?.email) {
    const refereeName = referee?.full_name?.split(' ')[0] || 'Your friend'
    await sendEmail({
      to: referrer.email,
      subject: `🎉 ${refereeName} just made their first clip — you earned ${REFERRAL_CREDITS_REFERRER} clips!`,
      body: `Hi ${referrer.full_name?.split(' ')[0] || 'there'},

Great news — ${refereeName} just made their first clip using your referral link!

You've earned ${REFERRAL_CREDITS_REFERRER} bonus clips added to your account. They're available immediately.

→ Check your credits: https://clipspark-tau.vercel.app/settings

Keep sharing your link to earn more:
https://clipspark-tau.vercel.app/settings#referral

Thanks for spreading the word!
— ClipSpark team`,
    })
  }

  trackServer(referral.referrer_id, 'referral_credited', {
    referee_id: user_id,
    credits_granted: REFERRAL_CREDITS_REFERRER,
    referral_id: referral.id,
  })

  return NextResponse.json({
    activated: true,
    referral_id: referral.id,
    referrer_credits_granted: REFERRAL_CREDITS_REFERRER,
  })
}
