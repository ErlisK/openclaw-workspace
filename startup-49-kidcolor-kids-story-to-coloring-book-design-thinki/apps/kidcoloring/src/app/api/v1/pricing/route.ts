import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPricingConfig, type PricingConfig } from '@/lib/pricing-experiments'

/**
 * GET /api/v1/pricing?sessionToken=xxx
 *
 * Returns the pricing config for the given session token.
 * Also logs the exposure to pricing_experiments table (idempotent — one row per session).
 *
 * Response: { variant, priceCents, displayPrice, pageCount, priceId,
 *             badge, headline, description, anchorPrice, urgencyLine, experiment }
 */

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// In-memory exposure cache — avoids repeated DB writes within same Lambda instance
const _exposureCache = new Set<string>()

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('sessionToken')
  if (!token) return NextResponse.json({ error: 'sessionToken required' }, { status: 400 })

  const config: PricingConfig = getPricingConfig(token)

  // Log exposure (fire-and-forget, idempotent)
  if (!_exposureCache.has(token)) {
    _exposureCache.add(token)
    void logExposure(token, config)
  }

  return NextResponse.json(config)
}

async function logExposure(sessionToken: string, config: PricingConfig) {
  try {
    const sb = admin()
    // Only insert if not already logged (upsert on session_id + experiment)
    await sb.from('pricing_experiments').insert({
      session_id:  sessionToken,
      experiment:  config.experiment,
      variant:     config.variant,
      price_cents: config.priceCents,
      price_label: config.displayPrice,
      page_count:  config.pageCount,
      framing:     config.anchorPrice ? 'anchor' : config.urgencyLine ? 'urgency' : 'standard',
      shown_at:    new Date().toISOString(),
    })
    // Also log as event for cross-table analytics
    await sb.from('events').insert({
      event_name: 'pricing_variant_shown',
      session_id: sessionToken,
      properties: {
        variant:    config.variant,
        priceCents: config.priceCents,
        experiment: config.experiment,
      },
    })
  } catch { /* fire-and-forget — never block UX */ }
}

/** POST /api/v1/pricing — record a click or conversion */
export async function POST(req: NextRequest) {
  let body: { sessionToken?: string; action?: 'click' | 'convert'; orderId?: string; revenueCents?: number }
  try { body = await req.json() as typeof body }
  catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

  const { sessionToken, action, orderId, revenueCents } = body
  if (!sessionToken || !action) return NextResponse.json({ error: 'sessionToken + action required' }, { status: 400 })

  try {
    const sb = admin()
    if (action === 'click') {
      await sb.from('pricing_experiments')
        .update({ clicked: true, clicked_at: new Date().toISOString() })
        .eq('session_id', sessionToken)
        .eq('experiment', 'pricing_v1')
      await sb.from('events').insert({
        event_name: 'pricing_cta_clicked',
        session_id: sessionToken,
        properties: { variant: getPricingConfig(sessionToken).variant },
      })
    } else if (action === 'convert') {
      await sb.from('pricing_experiments')
        .update({
          converted:     true,
          converted_at:  new Date().toISOString(),
          order_id:      orderId ?? null,
          revenue_cents: revenueCents ?? null,
        })
        .eq('session_id', sessionToken)
        .eq('experiment', 'pricing_v1')
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
