import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ALL_VARIANTS, getPricingConfigForVariant } from '@/lib/pricing-experiments'

/**
 * GET /api/admin/pricing-experiments
 *
 * Returns pricing experiment analytics.
 * Query params:
 *   view = results | cohorts | churn | raw  (default: results)
 *   days = 7 | 14 | 30 (default: 14)
 *
 * Key metrics per variant:
 *   exposures        - unique sessions shown that price
 *   clicks           - CTA clicks (paywall → checkout)
 *   conversions      - paid orders completed
 *   click_rate       - clicks / exposures
 *   conversion_rate  - conversions / exposures
 *   revenue_per_exposed - total revenue / exposures
 *   avg_revenue_per_convert - revenue / conversions
 */

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function daysAgo(d: number) {
  return new Date(Date.now() - d * 86_400_000).toISOString()
}

export async function GET(req: NextRequest) {
  const p    = req.nextUrl.searchParams
  const view = p.get('view') ?? 'results'
  const days = Math.min(90, Math.max(1, Number(p.get('days') ?? 14)))
  const sb   = admin()
  const since = daysAgo(days)

  // ── results ──────────────────────────────────────────────────────────────
  if (view === 'results') {
    // Pull raw counts from pricing_experiments
    const { data: raw } = await sb
      .from('pricing_experiments')
      .select('variant, price_cents, clicked, converted, revenue_cents')
      .gte('created_at', since)

    // Also pull from events (some exposure logs may predate pricing_experiments table)
    const { data: evExposures } = await sb
      .from('events')
      .select('session_id, properties')
      .eq('event_name', 'pricing_variant_shown')
      .gte('created_at', since)

    const { data: evClicks } = await sb
      .from('events')
      .select('session_id, properties')
      .eq('event_name', 'pricing_cta_clicked')
      .gte('created_at', since)

    // Also cross-reference with upsell_shown events which have price data
    const { data: evUpsell } = await sb
      .from('events')
      .select('session_id, properties')
      .eq('event_name', 'upsell_shown')
      .gte('created_at', since)

    // Build per-variant stats
    const variantStats = ALL_VARIANTS.map(variant => {
      const config  = getPricingConfigForVariant(variant)
      const rows    = (raw ?? []).filter(r => r.variant === variant)
      
      const exposures   = rows.length
      const clicks      = rows.filter(r => r.clicked).length
      const conversions = rows.filter(r => r.converted).length
      const totalRev    = rows.reduce((s, r) => s + (r.revenue_cents ?? 0), 0)

      // Supplement with event data for sessions that got variant but pre-date table
      const evExp = (evExposures ?? [])
        .filter(e => (e.properties as Record<string, unknown>)?.variant === variant).length
      const evClk = (evClicks ?? [])
        .filter(e => (e.properties as Record<string, unknown>)?.variant === variant).length
      
      const totalExposures   = Math.max(exposures, evExp)
      const totalClicks      = Math.max(clicks, evClk)

      return {
        variant,
        priceCents:     config.priceCents,
        displayPrice:   config.displayPrice,
        pageCount:      config.pageCount,
        framing:        config.anchorPrice ? 'anchor' : config.urgencyLine ? 'urgency' : 'standard',
        badge:          config.badge,
        exposures:      totalExposures,
        clicks:         totalClicks,
        conversions,
        clickRate:      totalExposures > 0 ? Math.round((totalClicks / totalExposures) * 1000) / 10 : 0,
        conversionRate: totalExposures > 0 ? Math.round((conversions / totalExposures) * 1000) / 10 : 0,
        totalRevCents:  totalRev,
        revenuePerExposed: totalExposures > 0 ? Math.round(totalRev / totalExposures) : 0,
        avgRevenuePerConvert: conversions > 0 ? Math.round(totalRev / conversions) : 0,
      }
    })

    // Statistical significance (Chi-squared approximation)
    const control = variantStats.find(v => v.variant === 'control')
    const withSig = variantStats.map(v => {
      if (v.variant === 'control' || !control) return { ...v, liftPct: 0, pValue: null, significant: false }
      const n1 = control.exposures, c1 = control.conversions
      const n2 = v.exposures,       c2 = v.conversions
      const p1 = n1 > 0 ? c1 / n1 : 0
      const p2 = n2 > 0 ? c2 / n2 : 0
      const liftPct = p1 > 0 ? Math.round(((p2 - p1) / p1) * 100) : 0
      // Simple z-test (normal approximation)
      const pooled = n1 + n2 > 0 ? (c1 + c2) / (n1 + n2) : 0
      const se = pooled > 0 ? Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2)) : 0
      const z  = se > 0 ? Math.abs(p2 - p1) / se : 0
      const pValue = z > 0 ? Math.round(Math.max(0, 1 - (z * 0.3989)) * 100) / 100 : null  // approximation
      return {
        ...v,
        liftPct,
        pValue,
        significant: Math.min(n1, n2) >= 50 && z > 1.96,  // 95% confidence, n≥50 each
      }
    })

    // Recommended winner
    const minSampleForConclusion = 50
    const viable = withSig.filter(v => v.exposures >= minSampleForConclusion)
    const winner = viable.length >= 2
      ? viable.reduce((best, v) => v.revenuePerExposed > best.revenuePerExposed ? v : best, viable[0])
      : null

    return NextResponse.json({
      period:    { days, since },
      variants:  withSig,
      control,
      winner,
      conclusion: winner ? `${winner.variant} variant recommended (highest revenue/exposed: $${(winner.revenuePerExposed / 100).toFixed(2)})` : `Collecting data — need ${minSampleForConclusion} exposures per variant`,
      totalExposures: variantStats.reduce((s, v) => s + v.exposures, 0),
      // upsell event context (pre-experiment baseline)
      upsellShownTotal: (evUpsell ?? []).length,
    })
  }

  // ── cohorts (time-series) ─────────────────────────────────────────────────
  if (view === 'cohorts') {
    const { data } = await sb
      .from('pricing_experiments')
      .select('variant, converted, clicked, created_at, revenue_cents')
      .gte('created_at', since)
      .order('created_at', { ascending: true })

    // Bucket by day
    const byDay: Record<string, Record<string, { exposed: number; clicks: number; converts: number; revenue: number }>> = {}
    for (const row of (data ?? [])) {
      const day = row.created_at.slice(0, 10)
      if (!byDay[day]) byDay[day] = {}
      if (!byDay[day][row.variant]) byDay[day][row.variant] = { exposed: 0, clicks: 0, converts: 0, revenue: 0 }
      byDay[day][row.variant].exposed++
      if (row.clicked) byDay[day][row.variant].clicks++
      if (row.converted) {
        byDay[day][row.variant].converts++
        byDay[day][row.variant].revenue += row.revenue_cents ?? 0
      }
    }

    return NextResponse.json({
      cohorts: Object.entries(byDay).map(([date, variants]) => ({ date, ...variants })),
      days,
    })
  }

  // ── churn (paid → cancelled) ──────────────────────────────────────────────
  if (view === 'churn') {
    // Look at orders with status=refunded or subscriptions cancelled
    const { data: refunds } = await sb
      .from('orders')
      .select('id, price_id, status, metadata, created_at, paid_at')
      .in('status', ['refunded', 'disputed'])
      .gte('created_at', since)

    const { data: subs } = await sb
      .from('subscriptions')
      .select('id, status, metadata, created_at, updated_at')
      .in('status', ['canceled', 'cancelled'])
      .gte('created_at', since)

    // Cross-ref with pricing variant from orders.metadata
    const refundsByVariant: Record<string, number> = {}
    for (const r of (refunds ?? [])) {
      const variant = (r.metadata as Record<string, unknown>)?.pricing_variant as string ?? 'unknown'
      refundsByVariant[variant] = (refundsByVariant[variant] ?? 0) + 1
    }

    return NextResponse.json({
      refunds:           refunds ?? [],
      refundsByVariant,
      cancelledSubs:     subs ?? [],
      totalRefunds:      refunds?.length ?? 0,
      totalCancels:      subs?.length ?? 0,
    })
  }

  // ── raw data ──────────────────────────────────────────────────────────────
  if (view === 'raw') {
    const { data } = await sb
      .from('pricing_experiments')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500)
    return NextResponse.json({ rows: data ?? [], count: data?.length ?? 0 })
  }

  return NextResponse.json({ error: 'unknown view' }, { status: 400 })
}
