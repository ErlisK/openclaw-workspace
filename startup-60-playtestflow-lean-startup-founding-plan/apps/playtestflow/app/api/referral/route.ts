import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { ensureReferralCode, getConversionStats, getConversions } from '@/lib/referral'

/**
 * GET /api/referral
 * Returns the current user's referral code, stats, and recent conversions.
 * Creates a code if one doesn't exist yet.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get display name for code generation
  const { data: profile } = await supabase
    .from('designer_profiles')
    .select('display_name')
    .eq('user_id', user.id)
    .single()

  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'USER'
  const code = await ensureReferralCode(user.id, displayName)
  const stats = await getConversionStats(user.id)
  const conversions = await getConversions(user.id, 20)

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://playtestflow.vercel.app'

  return NextResponse.json({
    code,
    stats,
    conversions,
    referralUrl: code ? `${APP_URL}/r/${code.code}` : null,
    shareText: code
      ? `Join me on PlaytestFlow — the best way to run playtests for your game! Use my link for $5 in free credits: ${APP_URL}/r/${code.code}`
      : null,
  })
}
