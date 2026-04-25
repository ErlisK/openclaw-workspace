/**
 * GET /api/demo-data?scenario=<name>&seed=<number>
 * Public endpoint — returns pre-generated demo transaction data.
 * No auth required. Used for docs, landing page demos, and Playwright fixtures.
 *
 * Query params:
 *   scenario  string  (default: indie_template_pack) — see DEMO_SCENARIOS
 *   seed      number  (default: 42) — reproducible output
 *   summary   boolean (default: false) — return only stats, not full transactions
 */

import { NextResponse } from 'next/server'
import { generateTransactions, DEMO_SCENARIOS } from '@/lib/datagen'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const scenarioKey = searchParams.get('scenario') ?? 'indie_template_pack'
  const seed        = Number(searchParams.get('seed') ?? 42)
  const summaryOnly = searchParams.get('summary') === 'true'

  const scenario = DEMO_SCENARIOS[scenarioKey]
  if (!scenario) {
    return NextResponse.json({
      error: `Unknown scenario '${scenarioKey}'. Available: ${Object.keys(DEMO_SCENARIOS).join(', ')}`,
    }, { status: 400 })
  }

  const result = generateTransactions(scenario, seed)

  // Compute summary stats
  const amounts = result.transactions.map(t => t.amount_cents / 100)
  const channels = result.transactions.reduce<Record<string, number>>((acc, t) => {
    const ch = t.metadata.channel ?? 'unknown'
    acc[ch] = (acc[ch] ?? 0) + 1
    return acc
  }, {})
  const coupons = result.transactions.reduce<Record<string, number>>((acc, t) => {
    const c = t.metadata.coupon
    if (c && c !== 'none') acc[c] = (acc[c] ?? 0) + 1
    return acc
  }, {})
  const refundRate = result.transactions.filter(t => t.is_refunded).length / Math.max(result.transactions.length, 1)
  const totalRevenue = amounts.reduce((a, b) => a + b, 0)
  const avgPrice = amounts.length > 0 ? totalRevenue / amounts.length : 0
  const spikeCount = result.transactions.filter(t => t.is_spike_cohort).length

  const summary = {
    scenario: scenarioKey,
    product_name: result.product_name,
    n_transactions: result.n_transactions,
    n_months: result.n_months,
    price_schedule: result.price_schedule,
    pattern: result.pattern,
    total_revenue: Math.round(totalRevenue * 100) / 100,
    avg_price: Math.round(avgPrice * 100) / 100,
    refund_rate_pct: Math.round(refundRate * 1000) / 10,
    spike_transactions: spikeCount,
    by_channel: channels,
    by_coupon: coupons,
    cohorts: result.cohorts,
    available_scenarios: Object.keys(DEMO_SCENARIOS),
    seed,
  }

  if (summaryOnly) {
    return NextResponse.json(summary)
  }

  return NextResponse.json({
    ...summary,
    transactions: result.transactions,
  })
}
