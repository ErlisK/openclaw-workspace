import { NextRequest, NextResponse } from 'next/server'
import { validateReferralCode } from '@/lib/referrals'

/** Public — no auth required. Used by the /invite/[code] landing page. */
export async function GET(req: NextRequest) {
  const code = new URL(req.url).searchParams.get('code')
  if (!code) return NextResponse.json({ valid: false, error: 'code required' }, { status: 400 })

  const result = await validateReferralCode(code)
  return NextResponse.json(result)
}
