/**
 * POST /api/v1/paywall — log a paywall interaction (view or click)
 * GET  /api/v1/paywall?sessionId=… — get paywall analytics for a session
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const VALID_ACTIONS = new Set(['paywall_view', 'cta_click', 'dismiss', 'skip_to_download'])

const ANCHORS: Record<string, { priceCents: number; billing: string }> = {
  per_book_699:     { priceCents: 699,  billing: 'one_time' },
  per_book_799:     { priceCents: 799,  billing: 'one_time' },
  subscription_799: { priceCents: 799,  billing: 'monthly'  },
}

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      sessionId?: string
      anchorId?: string
      variantId?: string
      action?: string
      source?: string
      properties?: Record<string, unknown>
    }

    const {
      sessionId, anchorId = 'per_book_699', variantId = 'A',
      action = 'cta_click', source = 'post_export',
      properties = {},
    } = body

    if (!VALID_ACTIONS.has(action)) {
      return NextResponse.json({ error: 'invalid action' }, { status: 400 })
    }

    const anchor = ANCHORS[anchorId]
    if (!anchor && action !== 'dismiss' && action !== 'skip_to_download') {
      return NextResponse.json({ error: 'invalid anchorId' }, { status: 400 })
    }

    const client = sb()

    // Write to paywall_clicks for granular reporting
    await client.from('paywall_clicks').insert({
      session_id:  sessionId,
      anchor_id:   anchorId,
      price_cents: anchor?.priceCents ?? 0,
      billing:     anchor?.billing ?? 'none',
      variant_id:  variantId,
      source,
      action,
      properties,
    })

    // Also mirror to events table for cross-funnel analysis
    const eventName = action === 'paywall_view'       ? 'paywall_shown'
                    : action === 'cta_click'           ? 'upsell_clicked'
                    : action === 'skip_to_download'    ? 'upsell_dismissed'
                    : 'upsell_dismissed'

    await client.from('events').insert({
      event_name:  eventName,
      session_id:  sessionId,
      properties: {
        anchor_id:   anchorId,
        price_cents: anchor?.priceCents ?? 0,
        billing:     anchor?.billing ?? 'none',
        variant_id:  variantId,
        source,
        ...properties,
      },
    })

    return NextResponse.json({ ok: true, action, anchorId })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

export async function GET() {

  const client = sb()

  // Aggregate CTR by anchor and variant
  const { data, error } = await client
    .from('paywall_clicks')
    .select('anchor_id, variant_id, billing, price_cents, action')
    .order('created_at', { ascending: false })
    .limit(2000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aggregate
  const map: Record<string, { anchor_id: string; variant_id: string; billing: string; price_cents: number; views: number; clicks: number }> = {}
  for (const row of data ?? []) {
    const key = `${row.anchor_id}::${row.variant_id}`
    if (!map[key]) map[key] = { anchor_id: row.anchor_id, variant_id: row.variant_id, billing: row.billing, price_cents: row.price_cents, views: 0, clicks: 0 }
    if (row.action === 'paywall_view') map[key].views++
    if (row.action === 'cta_click')    map[key].clicks++
  }

  const results = Object.values(map).map(r => ({
    ...r,
    ctr: r.views > 0 ? Math.round(1000 * r.clicks / r.views) / 10 : 0,
    revenuePerSession: r.views > 0 ? Math.round((r.clicks / r.views) * r.price_cents) : 0,
  })).sort((a, b) => b.ctr - a.ctr)

  const totalViews  = results.reduce((s, r) => s + r.views, 0)
  const totalClicks = results.reduce((s, r) => s + r.clicks, 0)
  const bestAnchor  = results[0]

  return NextResponse.json({
    ok: true,
    results,
    summary: {
      totalViews, totalClicks,
      overallCtr: totalViews > 0 ? Math.round(1000 * totalClicks / totalViews) / 10 : 0,
      bestAnchor: bestAnchor?.anchor_id,
      bestCtr: bestAnchor?.ctr,
      meetsTarget: (bestAnchor?.ctr ?? 0) >= 8,
    },
  })
}
