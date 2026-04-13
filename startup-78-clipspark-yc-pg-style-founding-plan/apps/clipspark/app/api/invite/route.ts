import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// Invite code catalog: code → { months, source }
const INVITE_CODES: Record<string, { months: number; source: string; maxUses?: number }> = {
  'HN2025':     { months: 3, source: 'hackernews', maxUses: 50 },
  'PH2025':     { months: 3, source: 'producthunt', maxUses: 100 },
  'PODCAST25':  { months: 2, source: 'reddit-podcasting', maxUses: 75 },
  'NEWTUBERS':  { months: 2, source: 'reddit-newtubers', maxUses: 50 },
  'TWITCH25':   { months: 2, source: 'reddit-twitch', maxUses: 50 },
  'SMALLYT':    { months: 2, source: 'reddit-smallyt', maxUses: 50 },
  'IH2025':     { months: 3, source: 'indiehackers', maxUses: 100 },
  'BETALIST25': { months: 2, source: 'betalist', maxUses: 100 },
  'TWITTER25':  { months: 2, source: 'twitter' },
  'LINKEDIN25': { months: 3, source: 'linkedin', maxUses: 100 },
  'BETAOPEN':   { months: 2, source: 'general' },
}

// POST /api/invite — redeem an invite code
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const code = (body.code || '').trim().toUpperCase()

  if (!code) return NextResponse.json({ error: 'No code provided' }, { status: 400 })

  const config = INVITE_CODES[code]
  if (!config) return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 })

  const svc = createServiceClient()

  // Check use count if there's a max
  if (config.maxUses) {
    const { count } = await svc
      .from('invite_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('code', code)

    if ((count || 0) >= config.maxUses) {
      return NextResponse.json({ error: 'This code has reached its usage limit' }, { status: 400 })
    }
  }

  // Check if this user already redeemed a code
  const { data: existing } = await svc
    .from('invite_redemptions')
    .select('id, code')
    .eq('user_id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({
      error: `You already redeemed invite code ${existing.code}`,
    }, { status: 400 })
  }

  // Apply pro months to subscription
  const now = new Date()

  // Get current subscription
  const { data: sub } = await svc
    .from('subscriptions')
    .select('id, plan, trial_end, current_period_end')
    .eq('user_id', user.id)
    .single()

  // Calculate new period end
  const baseDate = sub?.current_period_end
    ? new Date(sub.current_period_end)
    : now
  const newEnd = new Date(baseDate)
  newEnd.setMonth(newEnd.getMonth() + config.months)

  if (sub) {
    await svc.from('subscriptions').update({
      plan: 'pro',
      current_period_end: newEnd.toISOString(),
      trial_end: newEnd.toISOString(),
      updated_at: now.toISOString(),
    }).eq('id', sub.id)
  } else {
    await svc.from('subscriptions').insert({
      user_id: user.id,
      plan: 'pro',
      status: 'trialing',
      current_period_start: now.toISOString(),
      current_period_end: newEnd.toISOString(),
      trial_end: newEnd.toISOString(),
      minutes_per_month: 600,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
  }

  // Record redemption
  await svc.from('invite_redemptions').insert({
    user_id: user.id,
    code,
    source: config.source,
    months_granted: config.months,
    redeemed_at: now.toISOString(),
  })

  return NextResponse.json({
    ok: true,
    message: `🎉 ${config.months} months of Pro activated! Enjoy ClipSpark.`,
    months: config.months,
    pro_until: newEnd.toISOString(),
    source: config.source,
  })
}

// GET /api/invite?code=XXX — validate a code without redeeming
export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get('code') || '').toUpperCase()
  const config = INVITE_CODES[code]
  if (!config) return NextResponse.json({ valid: false }, { status: 404 })

  let usesLeft: number | null = null
  if (config.maxUses) {
    const svc = createServiceClient()
    const { count } = await svc
      .from('invite_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('code', code)
    usesLeft = config.maxUses - (count || 0)
    if (usesLeft <= 0) return NextResponse.json({ valid: false, reason: 'limit_reached' })
  }

  return NextResponse.json({
    valid: true,
    months: config.months,
    source: config.source,
    uses_left: usesLeft,
  })
}
