import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * /api/v1/referral — Referral tracking API
 *
 * GET  /api/v1/referral?code=ABC123          — get referral stats by code
 * POST /api/v1/referral                       — track a click or conversion
 *   Body: { code, action: 'click'|'convert', sessionId?, referredEmail? }
 *
 * GET  /api/v1/referral?userId=xxx            — get user's referral code + stats
 */

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export async function GET(req: NextRequest) {
  const sb     = admin()
  const code   = req.nextUrl.searchParams.get('code')
  const userId = req.nextUrl.searchParams.get('userId')

  if (code) {
    const { data, error } = await sb
      .from('referrals')
      .select('*')
      .eq('referral_code', code)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Referral code not found' }, { status: 404 })
    return NextResponse.json({ referral: data })
  }

  if (userId) {
    // Get or create referral code for user
    const { data: existing } = await sb
      .from('referrals')
      .select('*')
      .eq('referrer_id', userId)
      .single()

    if (existing) {
      return NextResponse.json({ referral: existing })
    }

    // Create new referral code
    const newCode = generateCode()
    const { data: created, error: createErr } = await sb
      .from('referrals')
      .insert({
        referral_code: newCode,
        referrer_id:   userId,
        product_type:  'trial',
        clicks:        0,
        conversions:   0,
      })
      .select()
      .single()

    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })
    return NextResponse.json({ referral: created, created: true })
  }

  return NextResponse.json({ error: 'code or userId required' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const sb = admin()
  let body: { code?: string; action?: string; sessionId?: string }
  try { body = await req.json() as typeof body }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { code, action, sessionId } = body
  if (!code || !action) return NextResponse.json({ error: 'code and action required' }, { status: 400 })

  // Fetch referral
  const { data: referral, error } = await sb
    .from('referrals')
    .select('id, clicks, conversions')
    .eq('referral_code', code)
    .single()

  if (error || !referral) return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })

  const r = referral as { id: string; clicks: number; conversions: number }

  if (action === 'click') {
    await sb.from('referrals')
      .update({ clicks: (r.clicks ?? 0) + 1, last_click_at: new Date().toISOString() })
      .eq('id', r.id)

    // Log event
    await sb.from('events').insert({
      event_name: 'referral_click',
      session_id: sessionId ?? null,
      properties: { referral_code: code },
    })
    return NextResponse.json({ ok: true, action: 'click' })
  }

  if (action === 'convert') {
    const newConversions = (r.conversions ?? 0) + 1
    await sb.from('referrals')
      .update({
        conversions:  newConversions,
        converted_at: new Date().toISOString(),
        referred_session_id: sessionId ?? null,
      })
      .eq('id', r.id)

    await sb.from('events').insert({
      event_name: 'referral_convert',
      session_id: sessionId ?? null,
      properties: { referral_code: code, conversion_number: newConversions },
    })

    // Award referral credit: 1 free book credit per conversion
    // Look up referrer profile to award credit
    const { data: refRow } = await sb.from('referrals').select('referrer_id').eq('id', r.id).single()
    const referrerId = (refRow as { referrer_id?: string } | null)?.referrer_id
    if (referrerId) {
      const { data: prof } = await sb.from('profiles')
        .select('referral_credits, total_referrals').eq('id', referrerId).single()
      const cur  = (prof as { referral_credits?: number } | null)?.referral_credits ?? 0
      const refs = (prof as { total_referrals?: number } | null)?.total_referrals ?? 0
      await sb.from('profiles')
        .update({ referral_credits: cur + 1, total_referrals: refs + 1 })
        .eq('id', referrerId)
      // Update credits_awarded on referral row
      await sb.from('referrals')
        .update({ credits_awarded: newConversions })
        .eq('id', r.id)
    }

    return NextResponse.json({ ok: true, action: 'convert', creditAwarded: Boolean(referrerId) })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
}
