/**
 * GET  /api/referrals          — get the current user's referral code (create if missing)
 * POST /api/referrals/apply    — store a referral code for the current user (pre-purchase)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/get-client'
import { getOrCreateReferralCode } from '@/lib/referrals'

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await getOrCreateReferralCode(user.id)
  if (!result) return NextResponse.json({ error: 'Failed to generate referral code' }, { status: 500 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://betawindow.com'
  return NextResponse.json({
    code: result.code,
    link: `${baseUrl}/invite/${result.code}`,
  })
}
