import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { lookupCode, recordConversion, grantConversionRewards } from '@/lib/referral'

/**
 * POST /api/referral/convert
 * Called after a new user completes signup to:
 *   1. Record the referral conversion
 *   2. Immediately grant rewards (credits to both parties)
 *
 * Body: {
 *   code: string           — referral code used
 *   source?: string        — 'discord' | 'embed' | 'direct' | 'email'
 *   landingUrl?: string
 *   utmSource?: string
 *   utmMedium?: string
 *   utmCampaign?: string
 * }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { code, source, landingUrl, utmSource, utmMedium, utmCampaign } = body

  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })

  // Prevent self-referral
  const codeInfo = await lookupCode(code)
  if (!codeInfo) return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
  if (codeInfo.ownerId === user.id) {
    return NextResponse.json({ error: 'Cannot use your own referral code' }, { status: 400 })
  }

  // Check if user already used a referral code
  const { data: existingConv } = await supabase
    .from('referral_conversions')
    .select('id')
    .eq('referred_user_id', user.id)
    .limit(1)
    .single()
  if (existingConv) {
    return NextResponse.json({ error: 'You have already used a referral code' }, { status: 409 })
  }

  // Record conversion
  const conversionId = await recordConversion({
    codeId:        codeInfo.id,
    code:          codeInfo.code,
    referrerId:    codeInfo.ownerId,
    referredUserId: user.id,
    referredEmail:  user.email,
    source:         source ?? 'direct',
    landingUrl,
    utmSource,
    utmMedium,
    utmCampaign,
  })

  if (!conversionId) {
    return NextResponse.json({ error: 'Failed to record conversion' }, { status: 500 })
  }

  // Grant rewards immediately
  const result = await grantConversionRewards(conversionId)

  // Tag the designer profile
  await supabase
    .from('designer_profiles')
    .update({
      referred_by_code: codeInfo.code,
      referred_by_user_id: codeInfo.ownerId,
    })
    .eq('user_id', user.id)

  return NextResponse.json({
    ok: result.ok,
    conversionId,
    rewardGranted: result.ok,
    reward: {
      type:  codeInfo.referredRewardType,
      value: codeInfo.referredRewardValue,
      description: codeInfo.referredRewardType === 'credits'
        ? `$${(codeInfo.referredRewardValue / 100).toFixed(0)} in credits added to your account`
        : '1 free Pro month added',
    },
    error: result.error,
  })
}
