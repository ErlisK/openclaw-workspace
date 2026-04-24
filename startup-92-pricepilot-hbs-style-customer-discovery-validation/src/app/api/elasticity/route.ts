/**
 * POST /api/elasticity
 *
 * Full Bayesian elasticity analysis + tier generation + persist to suggestions.
 * Returns: elasticity posterior, 2-3 price tiers with confidence & projected ROI.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { runEngine, Transaction } from '@/lib/engine'
import { generateNarrative } from '@/lib/narrative'

export const maxDuration = 30

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const { product_id } = body

    // ── Fetch products ──────────────────────────────────────────────────────
    let pq = supabase.from('products').select('*').eq('user_id', user.id)
    if (product_id) pq = pq.eq('id', product_id)
    const { data: products, error: pErr } = await pq
    if (pErr) throw pErr

    if (!products || products.length === 0) {
      return NextResponse.json({
        tiers: [],
        products: [],
        message: 'No products found. Import some sales data first.',
      })
    }

    const analysisResults = []

    for (const product of products) {
      // ── Fetch transactions ────────────────────────────────────────────────
      const { data: txns } = await supabase
        .from('transactions')
        .select('amount_cents, purchased_at, is_refunded, metadata')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .eq('is_refunded', false)
        .order('purchased_at', { ascending: true })

      if (!txns || txns.length < 3) {
        analysisResults.push({
          product_id: product.id,
          product_name: product.name,
          current_price_cents: product.current_price_cents,
          n_transactions: txns?.length || 0,
          action: 'insufficient_data',
          message: `Need at least 3 transactions (have ${txns?.length || 0})`,
          tiers: [],
          elasticity: null,
        })
        continue
      }

      // ── Group into price×period observation windows ───────────────────────
      // Strategy: group by (calendar_month, price) to get Q(p, t) pairs
      const windows = groupIntoWindows(txns)

      // ── Build multi-tier analysis ─────────────────────────────────────────
      const currentPriceCents = product.current_price_cents
      const currentPrice = currentPriceCents / 100

      // Run engine (gets posterior + best conservative price)
      const engineInput: Transaction[] = windows.map(w => ({
        price: w.price_cents / 100,
        quantity: w.quantity,
        period_days: w.days,
        cohort_tag: 'organic',
      }))

      const engineResult = runEngine(engineInput)

      // ── Generate 2-3 price tiers from posterior ───────────────────────────
      const tiers = buildTiers(
        currentPrice,
        engineResult,
        windows,
        product.name
      )

      // ── Persist suggestions ───────────────────────────────────────────────
      for (const tier of tiers) {
        if (tier.action !== 'test_higher') continue
        await supabase.from('suggestions').upsert({
          user_id: user.id,
          product_id: product.id,
          suggestion_type: tier.tier_type,
          current_price_cents: currentPriceCents,
          suggested_price_cents: Math.round(tier.price * 100),
          title: tier.title,
          rationale: tier.rationale,
          confidence_score: tier.confidence,
          confidence_label: tier.confidence_label,
          proj_monthly_lift_p50: tier.roi_p50_cents,
          rule_flags: tier.rules_applied,
          caveats: tier.caveats,
          status: 'pending',
          metadata: {
            elasticity_mean: engineResult.elasticity_mean,
            elasticity_sd: engineResult.elasticity_sd,
            revenue_ref: engineResult.revenue_ref_monthly,
            tier_tag: tier.tier_tag,
            n_observations: engineResult.n_observations,
          },
        }, { onConflict: 'user_id,product_id,suggestion_type', ignoreDuplicates: false })
      }

      // ── Generate AI narrative (non-blocking, best-effort) ─────────────────
      let narrative = ''
      try {
        narrative = await generateNarrative({
          productName: product.name,
          currentPrice,
          tiers,
          elasticityMean: engineResult.elasticity_mean,
          nObservations: engineResult.n_observations,
          action: engineResult.action,
        })
      } catch {
        // AI narrative is enhancement only — don't fail the whole request
        narrative = engineResult.why_text
      }

      analysisResults.push({
        product_id: product.id,
        product_name: product.name,
        current_price_cents: currentPriceCents,
        n_transactions: txns.length,
        n_windows: windows.length,
        action: engineResult.action,
        elasticity: {
          mean: engineResult.elasticity_mean,
          sd: engineResult.elasticity_sd,
          n_observations: engineResult.n_observations,
          spike_fraction: engineResult.spike_fraction,
          confidence_label: engineResult.confidence_label,
        },
        tiers,
        narrative,
        caveats: engineResult.caveats,
        conservative_rules: engineResult.conservative_rules_applied,
      })
    }

    return NextResponse.json({
      products: analysisResults,
      generated_at: new Date().toISOString(),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[/api/elasticity]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// Also expose GET for easy polling
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('product_id')

  let q = supabase
    .from('suggestions')
    .select(`
      *,
      products ( name, current_price_cents, platform )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (productId) q = q.eq('product_id', productId)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ suggestions: data || [] })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

interface Window {
  price_cents: number
  quantity: number
  days: number
  month_key: string
}

function groupIntoWindows(txns: {
  amount_cents: number
  purchased_at: string
  metadata?: { quantity?: number } | null
}[]): Window[] {
  const map: Record<string, { quantity: number; days: number }> = {}

  for (const t of txns) {
    const d = new Date(t.purchased_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}_${t.amount_cents}`
    if (!map[key]) map[key] = { quantity: 0, days: 30 }
    const qty = (t.metadata as { quantity?: number } | null)?.quantity || 1
    map[key].quantity += qty
  }

  return Object.entries(map).map(([key, v]) => ({
    price_cents: parseInt(key.split('_')[1]),
    quantity: v.quantity,
    days: v.days,
    month_key: key.split('_')[0],
  }))
}

interface Tier {
  tier_tag: 'conservative' | 'moderate' | 'aggressive'
  tier_type: string
  price: number
  title: string
  rationale: string
  action: 'test_higher' | 'stable' | 'insufficient_data'
  confidence: number
  confidence_label: string
  roi_p50_cents: number   // projected monthly lift at p50, in cents
  roi_p05_cents: number   // worst-case p05 monthly lift
  roi_p95_cents: number   // best-case p95 monthly lift
  rules_applied: string[]
  caveats: string[]
}

function buildTiers(
  currentPrice: number,
  engine: ReturnType<typeof runEngine>,
  _windows: Window[],
  productName: string
): Tier[] {
  const tiers: Tier[] = []

  if (engine.action === 'insufficient_data' || !engine.revenue_dist || !engine.price_proposed) {
    // Return a single "no-change" tier
    tiers.push({
      tier_tag: 'conservative',
      tier_type: 'price_hold',
      price: currentPrice,
      title: `Keep at $${currentPrice.toFixed(0)}`,
      rationale: engine.why_text,
      action: 'insufficient_data',
      confidence: 0,
      confidence_label: engine.confidence_label,
      roi_p50_cents: 0,
      roi_p05_cents: 0,
      roi_p95_cents: 0,
      rules_applied: [],
      caveats: engine.caveats,
    })
    return tiers
  }

  const ε = engine.elasticity_mean!
  const refRevenue = engine.revenue_ref_monthly
  const distRef = engine.revenue_dist

  // ── Tier 1: Conservative (+10% or engine's proposed, whichever is smaller) ─
  const conservativeMultiplier = Math.min(1.10, engine.price_proposed / currentPrice)
  const conservativePrice = round2(currentPrice * conservativeMultiplier)
  const consRev = simulateRevenue(currentPrice, conservativePrice, refRevenue, ε)
  tiers.push({
    tier_tag: 'conservative',
    tier_type: 'price_increase',
    price: conservativePrice,
    title: `Test $${conservativePrice.toFixed(2)} — conservative`,
    rationale: `A ${pct(conservativeMultiplier - 1)} price increase (${formatUsd(conservativePrice)}) ` +
      `is estimated to yield $${centsToUsd(consRev.p50_cents)} more revenue/month (p50), ` +
      `with only ${pct(Math.max(0, 1 - distRef.prob_above_current))} chance of being worse than current. ` +
      `Based on elasticity ε≈${ε.toFixed(2)} from ${engine.n_observations} price windows.`,
    action: 'test_higher',
    confidence: Math.min(0.9, distRef.prob_above_current),
    confidence_label: confidenceLabel(distRef.prob_above_current),
    roi_p50_cents: consRev.p50_cents,
    roi_p05_cents: consRev.p05_cents,
    roi_p95_cents: consRev.p95_cents,
    rules_applied: engine.conservative_rules_applied,
    caveats: engine.caveats,
  })

  // ── Tier 2: Moderate (+20% or engine's proposed, whichever is bigger, capped at +30%) ─
  const moderateMultiplier = Math.min(1.30, Math.max(1.15, engine.price_proposed / currentPrice))
  const moderatePrice = round2(currentPrice * moderateMultiplier)
  if (moderatePrice > conservativePrice) {
    const modRev = simulateRevenue(currentPrice, moderatePrice, refRevenue, ε)
    const modConfidence = Math.max(0.3, distRef.prob_above_current - 0.10)
    tiers.push({
      tier_tag: 'moderate',
      tier_type: 'price_increase',
      price: moderatePrice,
      title: `Test $${moderatePrice.toFixed(2)} — moderate`,
      rationale: `A ${pct(moderateMultiplier - 1)} increase to ${formatUsd(moderatePrice)} ` +
        `could lift monthly revenue by $${centsToUsd(modRev.p50_cents)} (p50). ` +
        `Slightly more risk — we recommend running this as an A/B split experiment.`,
      action: 'test_higher',
      confidence: modConfidence,
      confidence_label: confidenceLabel(modConfidence),
      roi_p50_cents: modRev.p50_cents,
      roi_p05_cents: modRev.p05_cents,
      roi_p95_cents: modRev.p95_cents,
      rules_applied: ['30pct_cap'],
      caveats: [...engine.caveats, 'Higher variance — A/B test recommended'],
    })
  }

  // ── Tier 3: Bundle / Aggressive (only if enough confidence) ──────────────
  if (distRef.prob_above_current >= 0.55 && Math.abs(ε) > 0.3) {
    const aggressivePrice = round2(currentPrice * 1.40)
    const aggRev = simulateRevenue(currentPrice, aggressivePrice, refRevenue, ε)
    const aggConf = Math.max(0.25, distRef.prob_above_current - 0.20)
    tiers.push({
      tier_tag: 'aggressive',
      tier_type: 'price_increase',
      price: aggressivePrice,
      title: `Test $${aggressivePrice.toFixed(2)} — high-upside`,
      rationale: `Pushing to ${formatUsd(aggressivePrice)} (+40%) may lift revenue by ` +
        `$${centsToUsd(aggRev.p95_cents)}/mo (p95) but carries more conversion risk. ` +
        `Only proceed if demand signals remain strong.`,
      action: 'test_higher',
      confidence: aggConf,
      confidence_label: confidenceLabel(aggConf),
      roi_p50_cents: aggRev.p50_cents,
      roi_p05_cents: aggRev.p05_cents,
      roi_p95_cents: aggRev.p95_cents,
      rules_applied: ['speculative'],
      caveats: [...engine.caveats, 'Speculative: requires > 100 transactions to trust'],
    })
  }

  return tiers
}

function simulateRevenue(
  currentPrice: number,
  newPrice: number,
  refRevenue: number,
  ε: number
): { p05_cents: number; p50_cents: number; p95_cents: number } {
  const priceRatio = newPrice / currentPrice
  const quantityRatio = Math.pow(priceRatio, ε)  // ε is negative = demand drops with price
  const newRevenue = newPrice * (refRevenue / currentPrice) * quantityRatio
  const lift = newRevenue - refRevenue

  // Add ±30% uncertainty band (reflects posterior variance)
  const uncertainty = Math.abs(lift) * 0.3 + refRevenue * 0.05
  return {
    p05_cents: Math.round((lift - uncertainty) * 100),
    p50_cents: Math.round(lift * 100),
    p95_cents: Math.round((lift + uncertainty) * 100),
  }
}

function round2(x: number): number { return Math.round(x * 100) / 100 }
function pct(x: number): string { return `${x >= 0 ? '+' : ''}${(x * 100).toFixed(0)}%` }
function formatUsd(x: number): string { return `$${x.toFixed(2)}` }
function centsToUsd(c: number): string {
  const usd = c / 100
  return usd >= 0 ? `+${usd.toFixed(0)}` : usd.toFixed(0)
}
function confidenceLabel(p: number): string {
  if (p >= 0.80) return 'High confidence'
  if (p >= 0.60) return 'Medium confidence'
  if (p >= 0.40) return 'Low confidence'
  return 'Very low confidence'
}
