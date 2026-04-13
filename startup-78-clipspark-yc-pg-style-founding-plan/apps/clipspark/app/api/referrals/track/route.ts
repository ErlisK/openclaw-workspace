import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * POST /api/referrals/track
 * Body: { code: string, event: 'click' | 'signup' | 'convert' }
 * 
 * Track referral funnel events and update viral coefficient data.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { code, event } = body

  if (!code || !['click', 'signup', 'convert'].includes(event)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  const svc = createServiceClient()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: referral } = await svc
    .from('referrals')
    .select('id, status, referrer_id')
    .eq('code', code)
    .single()

  if (!referral) return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })

  if (event === 'signup' && user) {
    await svc.from('referrals').update({
      referred_id: user.id,
      status: 'converted',
      converted_at: new Date().toISOString(),
    }).eq('id', referral.id).eq('status', 'pending')

    // Give referrer a credit bonus
    await svc.from('creator_credits').upsert({
      user_id: referral.referrer_id,
      balance: 10, // will be additive via trigger ideally
      total_earned: 10,
      total_spent: 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  }

  if (event === 'convert') {
    await svc.from('referrals').update({
      status: 'rewarded',
      converted_at: new Date().toISOString(),
    }).eq('id', referral.id)
  }

  return NextResponse.json({ ok: true, event, code })
}

/**
 * GET /api/referrals/track
 * Returns the current user's referral code and stats.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = createServiceClient()
  const { data: referrals } = await svc
    .from('referrals')
    .select('code, status, created_at, converted_at')
    .eq('referrer_id', user.id)
    .order('created_at', { ascending: false })

  const total = referrals?.length || 0
  const converted = referrals?.filter(r => ['converted','rewarded'].includes(r.status)).length || 0

  // Generate code if none exists
  let code = referrals?.[0]?.code
  if (!code) {
    code = `CS-${user.id.slice(0, 8).toUpperCase()}`
    await svc.from('referrals').insert({
      referrer_id: user.id,
      code,
      status: 'pending',
      source: 'auto',
    })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clipspark-tau.vercel.app'

  return NextResponse.json({
    code,
    referral_url: `${appUrl}/?ref=${code}`,
    total_referrals: total,
    converted_referrals: converted,
    conversion_rate: total > 0 ? Math.round((converted / total) * 100) : 0,
  })
}
