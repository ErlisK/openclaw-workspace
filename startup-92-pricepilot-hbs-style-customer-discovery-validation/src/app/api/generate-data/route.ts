/**
 * POST /api/generate-data
 * Generate synthetic transaction data for testing the Bayesian engine.
 * Supports cohort-tagged data (product_id, coupon, channel).
 * Auth required — inserts into the authenticated user's account.
 *
 * Body:
 *   product_name    string  (creates product if not exists)
 *   base_price      number  (USD, current price)
 *   monthly_sales   number  (baseline sales/mo at base_price)
 *   elasticity      number  (true elasticity, default -1.0)
 *   n_months        number  (months of history to generate, 3-24)
 *   price_changes   number  (number of price change events to simulate, 1-4)
 *   noise_sd        number  (noise standard deviation, default 0.15)
 *   cohorts         object  (optional cohort tags: { channel?, coupon? })
 *   dry_run         boolean (return data without inserting)
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

interface CohortConfig {
  channel?: string
  coupon?: string
}

interface GenerateDataBody {
  product_name?: string
  base_price?: number
  monthly_sales?: number
  elasticity?: number
  n_months?: number
  price_changes?: number
  noise_sd?: number
  cohorts?: CohortConfig
  dry_run?: boolean
}

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function normalRandom(rand: () => number): number {
  // Box-Muller transform
  const u1 = Math.max(rand(), 1e-10)
  const u2 = rand()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: GenerateDataBody = await request.json().catch(() => ({}))

  const productName   = body.product_name   ?? 'Test Product'
  const basePrice     = Math.max(body.base_price    ?? 29, 1)
  const monthlySales  = Math.max(body.monthly_sales ?? 50, 5)
  const elasticity    = body.elasticity ?? -1.0
  const nMonths       = Math.min(Math.max(body.n_months ?? 6, 3), 24)
  const priceChanges  = Math.min(Math.max(body.price_changes ?? 2, 1), 4)
  const noiseSd       = Math.min(Math.max(body.noise_sd ?? 0.15, 0.0), 0.5)
  const cohorts       = body.cohorts ?? {}
  const dryRun        = body.dry_run ?? false

  const rand = seededRandom(Date.now() % 1000000)

  // ── Create or find product ────────────────────────────────────────────
  let productId: string
  if (!dryRun) {
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', productName)
      .maybeSingle()

    if (existingProduct) {
      productId = existingProduct.id
    } else {
      const { data: newProduct, error: pErr } = await supabase
        .from('products')
        .insert({
          user_id: user.id,
          name: productName,
          current_price_cents: Math.round(basePrice * 100),
          platform: 'synthetic',
          platform_product_id: `synthetic-${Date.now()}`,
        })
        .select('id')
        .single()
      if (pErr || !newProduct) return NextResponse.json({ error: `Failed to create product: ${pErr?.message}` }, { status: 500 })
      productId = newProduct.id
    }
  } else {
    productId = 'dry-run-product-id'
  }

  // ── Generate price schedule ───────────────────────────────────────────
  const prices: number[] = [basePrice]
  const priceChangePts: number[] = []
  const monthsPerChange = Math.floor(nMonths / (priceChanges + 1))

  for (let i = 0; i < priceChanges; i++) {
    const month = (i + 1) * monthsPerChange
    priceChangePts.push(month)
    // Vary by -20% to +40% of previous price
    const prevPrice = prices[prices.length - 1]
    const factor = 0.8 + rand() * 0.6
    prices.push(Math.round(prevPrice * factor * 100) / 100)
  }

  // ── Generate transactions month by month ─────────────────────────────
  const transactions: Array<{
    user_id: string
    product_id: string
    platform: string
    platform_txn_id: string
    amount_cents: number
    currency: string
    is_refunded: boolean
    customer_key: string
    purchased_at: string
    is_spike_cohort: boolean
    metadata: Record<string, string>
  }> = []

  const now = new Date()
  let currentPriceIdx = 0

  for (let month = 0; month < nMonths; month++) {
    // Check if price changed this month
    if (priceChangePts.includes(month)) currentPriceIdx++
    const price = prices[Math.min(currentPriceIdx, prices.length - 1)]

    // Calculate expected quantity using elasticity
    const priceRatio = price / basePrice
    const logQMean = Math.log(monthlySales) + elasticity * Math.log(priceRatio)
    const noise = normalRandom(rand) * noiseSd
    const expectedQuantity = Math.max(1, Math.round(Math.exp(logQMean + noise)))

    // Generate individual transactions for this month
    const monthDate = new Date(now)
    monthDate.setMonth(monthDate.getMonth() - (nMonths - 1 - month))

    for (let t = 0; t < expectedQuantity; t++) {
      // Spread transactions through the month
      const txDate = new Date(monthDate)
      txDate.setDate(1 + Math.floor(rand() * 28))
      txDate.setHours(Math.floor(rand() * 24))

      const metadata: Record<string, string> = {}
      if (cohorts.channel) metadata.channel = cohorts.channel
      if (cohorts.coupon)  metadata.coupon  = cohorts.coupon

      transactions.push({
        user_id: user.id,
        product_id: productId,
        platform: 'synthetic',
        platform_txn_id: `syn-${month}-${t}-${Math.floor(rand() * 1e9)}`,
        amount_cents: Math.round(price * 100),
        currency: 'usd',
        is_refunded: rand() < 0.03,  // 3% refund rate
        customer_key: `cust-${Math.floor(rand() * 10000)}`,
        purchased_at: txDate.toISOString(),
        is_spike_cohort: false,
        metadata,
      })
    }
  }

  if (dryRun) {
    return NextResponse.json({
      dry_run: true,
      product_name: productName,
      product_id: productId,
      n_months: nMonths,
      price_schedule: prices.map((p, i) => ({ price: p, starts_month: i === 0 ? 0 : priceChangePts[i - 1] })),
      n_transactions: transactions.length,
      sample: transactions.slice(0, 3),
      cohorts,
    })
  }

  // ── Insert in batches ─────────────────────────────────────────────────
  const BATCH = 100
  let inserted = 0
  for (let i = 0; i < transactions.length; i += BATCH) {
    const { error } = await supabase.from('transactions').insert(transactions.slice(i, i + BATCH))
    if (!error) inserted += Math.min(BATCH, transactions.length - i)
  }

  // ── Audit log ─────────────────────────────────────────────────────────
  await supabase.from('audit_log').insert({
    user_id: user.id,
    entity_type: 'product',
    entity_id: productId,
    action: 'data_generated',
    new_value: {
      product_name: productName,
      n_transactions: inserted,
      n_months: nMonths,
      elasticity,
      base_price: basePrice,
      cohorts,
    },
  })

  return NextResponse.json({
    success: true,
    product_id: productId,
    product_name: productName,
    n_transactions: inserted,
    n_months: nMonths,
    price_schedule: prices.map((p, i) => ({
      price: p,
      starts_month: i === 0 ? 0 : priceChangePts[i - 1],
    })),
    cohorts,
    next_step: '/api/elasticity',
  })
}
