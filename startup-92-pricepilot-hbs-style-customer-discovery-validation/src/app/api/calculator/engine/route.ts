/**
 * POST /api/calculator/engine
 * Accept manual inputs from the calculator UI, synthesize transaction data,
 * and run the real Bayesian elasticity engine used by PricePilot internally.
 * No authentication required — this is a public tool endpoint.
 */
import { NextResponse } from 'next/server'
import { runEngine, Transaction } from '@/lib/engine'

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const currentPrice = Number(body.currentPrice)
  const currentSales = Number(body.currentSales)
  const elasticity   = Number(body.elasticity)
  const trialPrice   = Number(body.trialPrice)

  if (
    !isFinite(currentPrice) || currentPrice <= 0 ||
    !isFinite(currentSales) || currentSales <= 0 ||
    !isFinite(elasticity) || elasticity >= 0 ||
    !isFinite(trialPrice) || trialPrice <= 0
  ) {
    return NextResponse.json({ error: 'Invalid inputs' }, { status: 400 })
  }

  // Synthesize a plausible 90-day transaction history that reflects the
  // user's stated current price and sales volume, plus some historical
  // observations at nearby price points to give the engine price variation.
  //
  // We create 6–8 "periods" at slightly different prices anchored around
  // the user's current price, with quantities proportional to what the
  // stated elasticity predicts. This gives the engine real regression data
  // to fit, rather than a single point.

  const dailySales = currentSales / 30  // sales per day at current price
  const periodDays = 14

  const transactions: Transaction[] = []

  // Anchor the elasticity estimate by creating observations at ±20% of current price
  // so the engine has regression data (it needs price variation to fit ε)
  const priceMultipliers = [0.8, 0.85, 0.9, 0.95, 1.0, 1.0, 1.05, 1.1]
  for (const mult of priceMultipliers) {
    const p = Math.round(currentPrice * mult * 100) / 100
    // Quantity at this price predicted by user's stated elasticity
    const q = dailySales * Math.pow(mult, elasticity) * periodDays
    if (q > 0) {
      transactions.push({
        price: p,
        quantity: Math.max(1, Math.round(q)),
        period_days: periodDays,
        cohort_tag: 'organic',
      })
    }
  }

  const result = runEngine(transactions)

  // Return a clean subset of the result relevant for the calculator display
  return NextResponse.json({
    action: result.action,
    confidence_label: result.confidence_label,
    why_text: result.why_text,
    caveats: result.caveats,
    conservative_rules_applied: result.conservative_rules_applied,
    elasticity_mean: result.elasticity_mean,
    elasticity_sd: result.elasticity_sd,
    price_proposed: result.price_proposed,
    n_observations: result.n_observations,
  })
}
