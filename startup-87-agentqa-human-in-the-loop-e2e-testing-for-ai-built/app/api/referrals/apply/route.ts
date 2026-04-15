import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/get-client'
import { storeReferralCode } from '@/lib/referrals'

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await req.json().catch(() => ({}))
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })

  const ok = await storeReferralCode(user.id, code)
  if (!ok) return NextResponse.json({ error: 'Invalid or expired referral code' }, { status: 400 })

  return NextResponse.json({ ok: true, message: `Referral code ${code.toUpperCase()} applied — you'll earn +3 credits on your first purchase!` })
}
