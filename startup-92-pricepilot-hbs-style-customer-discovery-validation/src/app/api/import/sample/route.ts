import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { parseCSVWithMapping } from '@/lib/csv-parser'
import { runEngine, Transaction } from '@/lib/engine'
import { readFileSync } from 'fs'
import { join } from 'path'

// POST /api/import/sample — loads the bundled sample CSV and immediately runs the engine
export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const csvPath = join(process.cwd(), 'public', 'sample-data.csv')
    const csvText = readFileSync(csvPath, 'utf8')

    const { mappingResult, rows, skipped } = parseCSVWithMapping(csvText)

    if (mappingResult.errors.length > 0) {
      return NextResponse.json({ error: 'Sample data parse failed', errors: mappingResult.errors }, { status: 500 })
    }

    const productNames = [...new Set(rows.map(r => r.product_name))]
    const productMap: Record<string, string> = {}

    for (const name of productNames) {
      const latestPrice = rows.filter(r => r.product_name === name)
        .sort((a, b) => b.purchased_at.getTime() - a.purchased_at.getTime())[0].price

      const { data: existing } = await supabase
        .from('products').select('id')
        .eq('user_id', user.id).eq('name', name).single()

      if (existing) {
        productMap[name] = existing.id
        // Update current price to latest
        await supabase.from('products').update({
          current_price_cents: Math.round(latestPrice * 100),
        }).eq('id', existing.id)
      } else {
        const { data: newProd } = await supabase.from('products').insert({
          user_id: user.id, name, platform: 'csv',
          current_price_cents: Math.round(latestPrice * 100), currency: 'usd',
        }).select('id').single()
        if (newProd) productMap[name] = newProd.id
      }
    }

    let imported = 0
    for (const row of rows) {
      const productId = productMap[row.product_name]
      if (!productId) continue
      const txnId = `sample_${user.id.slice(0,8)}_${row.customer_key}_${Math.round(row.price*100)}_${row.purchased_at.toISOString().slice(0,10)}`
      const { error: txErr } = await supabase.from('transactions').upsert({
        user_id: user.id, product_id: productId, platform: 'csv',
        platform_txn_id: txnId,
        amount_cents: Math.round(row.price * 100), currency: 'usd',
        is_refunded: false, customer_key: row.customer_key,
        purchased_at: row.purchased_at.toISOString(),
        metadata: { quantity: row.quantity, coupon_code: row.coupon_code },
      }, { onConflict: 'user_id,platform,platform_txn_id', ignoreDuplicates: true })
      if (!txErr) imported++
    }

    // ── Auto-run the engine immediately ──────────────────────────────────────
    const suggestions: Array<{
      product_name: string
      current_price: number
      suggested_price: number | null
      confidence_label: string
      rationale: string
    }> = []

    const { data: products } = await supabase
      .from('products').select('*').eq('user_id', user.id)

    for (const product of (products || [])) {
      const { data: txns } = await supabase
        .from('transactions')
        .select('amount_cents, purchased_at, is_refunded')
        .eq('user_id', user.id).eq('product_id', product.id).eq('is_refunded', false)
        .order('purchased_at', { ascending: true })

      if (!txns || txns.length === 0) continue

      const grouped = groupByMonth(txns)
      const engineInput: Transaction[] = grouped.map(g => ({
        price: g.price / 100,
        quantity: g.count,
        period_days: 30,
        cohort_tag: 'organic',
      }))

      const result = runEngine(engineInput)

      // Clear old pending suggestions for this product
      await supabase.from('suggestions').delete()
        .eq('user_id', user.id).eq('product_id', product.id).eq('status', 'pending')

      if (result.action === 'test_higher' && result.price_proposed) {
        const suggestedCents = Math.round(result.price_proposed * 100)
        await supabase.from('suggestions').insert({
          user_id: user.id,
          product_id: product.id,
          suggestion_type: 'price_increase',
          current_price_cents: product.current_price_cents,
          suggested_price_cents: suggestedCents,
          title: `Test $${result.price_proposed.toFixed(0)} vs $${(product.current_price_cents / 100).toFixed(0)}`,
          rationale: result.why_text,
          confidence_score: result.revenue_dist?.prob_above_current ?? null,
          confidence_label: result.confidence_label,
          proj_monthly_lift_p50: result.revenue_dist
            ? Math.round((result.revenue_dist.p50 - result.revenue_ref_monthly) * 100)
            : null,
          rule_flags: result.conservative_rules_applied,
          caveats: result.caveats,
          status: 'pending',
        })
        suggestions.push({
          product_name: product.name,
          current_price: product.current_price_cents / 100,
          suggested_price: result.price_proposed,
          confidence_label: result.confidence_label,
          rationale: result.why_text,
        })
      } else {
        // stable or insufficient_data — still create a suggestion card so the user sees something
        const safePrice = result.action === 'insufficient_data'
          ? Math.round(product.current_price_cents * 1.1) / 100
          : (product.current_price_cents / 100)
        const safePriceCents = Math.round(safePrice * 100)

        await supabase.from('suggestions').insert({
          user_id: user.id,
          product_id: product.id,
          suggestion_type: result.action === 'stable' ? 'hold' : 'price_increase',
          current_price_cents: product.current_price_cents,
          suggested_price_cents: safePriceCents,
          title: result.action === 'stable'
            ? `Current pricing looks solid for ${product.name}`
            : `Conservative +10% test for ${product.name}`,
          rationale: result.why_text,
          confidence_score: result.revenue_dist?.prob_above_current ?? 0.4,
          confidence_label: result.confidence_label,
          proj_monthly_lift_p50: result.revenue_dist
            ? Math.round((result.revenue_dist.p50 - result.revenue_ref_monthly) * 100)
            : null,
          rule_flags: result.conservative_rules_applied,
          caveats: result.caveats,
          status: 'pending',
        })
        suggestions.push({
          product_name: product.name,
          current_price: product.current_price_cents / 100,
          suggested_price: safePrice,
          confidence_label: result.confidence_label,
          rationale: result.why_text,
        })
      }
    }

    return NextResponse.json({
      success: true, imported, products: productNames.length, skipped,
      suggestions,
      message: `Loaded ${imported} sample transactions across ${productNames.length} products — ${suggestions.length} price suggestion${suggestions.length !== 1 ? 's' : ''} ready!`,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[import/sample] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function groupByMonth(txns: { amount_cents: number; purchased_at: string }[]) {
  const months: Record<string, { count: number; price: number }> = {}
  for (const t of txns) {
    const d = new Date(t.purchased_at)
    const key = `${d.getFullYear()}-${d.getMonth()}-${t.amount_cents}`
    if (!months[key]) months[key] = { count: 0, price: t.amount_cents }
    months[key].count++
  }
  return Object.values(months)
}
