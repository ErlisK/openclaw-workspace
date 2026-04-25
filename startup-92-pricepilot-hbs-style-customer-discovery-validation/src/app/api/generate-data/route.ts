/**
 * POST /api/generate-data
 * Generate synthetic transaction data using the datagen library.
 * Auth required — inserts into the authenticated user's account.
 *
 * Body:
 *   scenario        string  — use a pre-built scenario (see DEMO_SCENARIOS)
 *   product_name    string
 *   base_price      number
 *   monthly_sales   number
 *   elasticity      number  (default -1.0)
 *   n_months        number  (3-24)
 *   price_changes   number  (0-4)
 *   noise_sd        number  (0.0-0.5)
 *   pattern         string  (steady|growth|launch_decay|seasonal|appsumo|volatile)
 *   cohorts         object  { channel?, coupon?, coupon_discount_pct? }
 *   channel_split   object  { channel: fraction }
 *   dry_run         boolean (return preview, no DB writes)
 *   seed            number  (for reproducible output)
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { generateTransactions, DEMO_SCENARIOS, DataGenConfig, DemandPattern } from '@/lib/datagen'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))

  // ── Resolve config: named scenario or custom ────────────────────────
  let cfg: DataGenConfig
  if (body.scenario && DEMO_SCENARIOS[body.scenario]) {
    cfg = {
      ...DEMO_SCENARIOS[body.scenario],
      // Allow overrides on top of scenario
      ...(body.n_months     && { n_months:      Number(body.n_months) }),
      ...(body.price_changes && { price_changes: Number(body.price_changes) }),
      ...(body.noise_sd      && { noise_sd:      Number(body.noise_sd) }),
    }
  } else {
    cfg = {
      product_name:   body.product_name    ?? 'Demo Product',
      base_price:     Number(body.base_price    ?? 29),
      monthly_sales:  Number(body.monthly_sales ?? 50),
      elasticity:     Number(body.elasticity    ?? -1.0),
      n_months:       Number(body.n_months      ?? 6),
      price_changes:  Number(body.price_changes ?? 2),
      noise_sd:       Number(body.noise_sd      ?? 0.15),
      pattern:        (body.pattern as DemandPattern) ?? 'steady',
      cohorts:        body.cohorts ?? {},
      channel_split:  body.channel_split,
    }
  }

  const seed = body.seed ? Number(body.seed) : undefined
  const dryRun = body.dry_run ?? false

  // ── Generate ─────────────────────────────────────────────────────────
  const result = generateTransactions(cfg, seed)

  if (dryRun) {
    return NextResponse.json({
      dry_run: true,
      product_name: result.product_name,
      n_months: result.n_months,
      price_schedule: result.price_schedule,
      pattern: result.pattern,
      cohorts: result.cohorts,
      n_transactions: result.n_transactions,
      sample: result.transactions.slice(0, 5),
    })
  }

  // ── Create or find product ───────────────────────────────────────────
  let productId: string
  const { data: existingProduct } = await supabase
    .from('products')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', result.product_name)
    .maybeSingle()

  if (existingProduct) {
    productId = existingProduct.id
  } else {
    const { data: newProduct, error: pErr } = await supabase
      .from('products')
      .insert({
        user_id: user.id,
        name: result.product_name,
        current_price_cents: Math.round(cfg.base_price * 100),
        platform: 'synthetic',
        platform_product_id: `synthetic-${Date.now()}`,
      })
      .select('id')
      .single()
    if (pErr || !newProduct) {
      return NextResponse.json({ error: `Failed to create product: ${pErr?.message}` }, { status: 500 })
    }
    productId = newProduct.id
  }

  // ── Insert transactions in batches ────────────────────────────────────
  const rows = result.transactions.map(t => ({
    user_id: user.id,
    product_id: productId,
    platform: t.platform,
    platform_txn_id: t.platform_txn_id,
    amount_cents: t.amount_cents,
    currency: t.currency,
    is_refunded: t.is_refunded,
    customer_key: t.customer_key,
    purchased_at: t.purchased_at,
    is_spike_cohort: t.is_spike_cohort,
    metadata: t.metadata,
  }))

  const BATCH = 100
  let inserted = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase.from('transactions').insert(rows.slice(i, i + BATCH))
    if (!error) inserted += Math.min(BATCH, rows.length - i)
  }

  // ── Audit log ────────────────────────────────────────────────────────
  await supabase.from('audit_log').insert({
    user_id: user.id,
    entity_type: 'product',
    entity_id: productId,
    action: 'data_generated',
    new_value: {
      product_name: result.product_name,
      n_transactions: inserted,
      n_months: result.n_months,
      pattern: result.pattern,
      elasticity: cfg.elasticity,
      base_price: cfg.base_price,
      cohorts: result.cohorts,
    },
  })

  return NextResponse.json({
    success: true,
    product_id: productId,
    product_name: result.product_name,
    n_transactions: inserted,
    n_months: result.n_months,
    price_schedule: result.price_schedule,
    pattern: result.pattern,
    cohorts: result.cohorts,
    next_step: '/api/elasticity',
  })
}
