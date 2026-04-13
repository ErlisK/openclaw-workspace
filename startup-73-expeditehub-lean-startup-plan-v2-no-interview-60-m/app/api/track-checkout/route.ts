import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/track-checkout
 * Logs checkout_view, checkout_success, checkout_abandon events to checkout_events table.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const body = await req.json()
  const {
    session_id,
    email,
    event_type,
    stripe_session_id,
    price_id,
    amount_cents,
    utm_source,
    utm_medium,
    utm_campaign,
    metadata,
  } = body

  if (!session_id || !event_type) {
    return NextResponse.json({ error: 'session_id and event_type required' }, { status: 400 })
  }

  const validTypes = ['checkout_view', 'checkout_success', 'checkout_abandon']
  if (!validTypes.includes(event_type)) {
    return NextResponse.json({ error: 'invalid event_type' }, { status: 400 })
  }

  const { error } = await supabase.from('checkout_events').insert({
    session_id,
    email: email || null,
    event_type,
    stripe_session_id: stripe_session_id || null,
    price_id: price_id || null,
    amount_cents: amount_cents || null,
    utm_source: utm_source || null,
    utm_medium: utm_medium || null,
    utm_campaign: utm_campaign || null,
    metadata: metadata || {},
  })

  if (error) {
    console.error('[track-checkout] insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
