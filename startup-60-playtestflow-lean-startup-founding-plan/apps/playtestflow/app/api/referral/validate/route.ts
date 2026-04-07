import { NextRequest, NextResponse } from 'next/server'
import { lookupCode } from '@/lib/referral'

/**
 * GET /api/referral/validate?code=ALICE42
 * Public endpoint — validates a referral code and returns reward info.
 * Used by signup page to display "You were referred by X — $5 bonus awaits!"
 */
export async function GET(request: NextRequest) {
  const code = new URL(request.url).searchParams.get('code')
  if (!code) return NextResponse.json({ valid: false, error: 'code required' }, { status: 400 })

  const info = await lookupCode(code)
  if (!info) {
    return NextResponse.json({ valid: false, error: 'Code not found or expired' })
  }

  return NextResponse.json({
    valid: true,
    code: info.code,
    referredRewardType:  info.referredRewardType,
    referredRewardValue: info.referredRewardValue,
    // Human-readable reward description
    rewardDescription: info.referredRewardType === 'credits'
      ? `$${(info.referredRewardValue / 100).toFixed(0)} in free PlaytestFlow credits`
      : info.referredRewardType === 'month_off'
      ? '1 free month of Pro'
      : 'Welcome bonus',
  }, {
    headers: {
      'Cache-Control': 'public, max-age=60, s-maxage=60',
      'Access-Control-Allow-Origin': '*',
    }
  })
}
