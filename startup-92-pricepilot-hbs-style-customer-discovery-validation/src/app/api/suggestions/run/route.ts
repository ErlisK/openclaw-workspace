/**
 * POST /api/suggestions/run
 * Convenience alias for /api/engine/recommend — triggers the Bayesian engine
 * and returns the upserted suggestions for the current user.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { runEngine, Transaction } from '@/lib/engine'

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)

    if (!products || products.length === 0) {
      // Return a safe default suggestion so UI never gets empty results
      return NextResponse.json([{
        product_id: null,
        current_price: null,
        suggested_price: null,
        confidence: 10,
        projected_roi: null,
        rationale: 'No products found. Import your sales data first, then run analysis again.',
      }])
    }

    const output = []

    for (const product of products) {
      const { data: txns } = await supabase
        .from('transactions')
        .select('amount_cents, purchased_at, is_refunded')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .eq('is_refunded', false)
        .order('purchased_at', { ascending: true })

      if (!txns || txns.length === 0) continue

      // Group transactions into monthly windows for engine input
      const grouped = groupByMonth(txns)
      const engineInput: Transaction[] = grouped.map(g => ({
        price: g.price / 100,
        quantity: g.count,
        period_days: 30,
        cohort_tag: 'organic',
      }))

      const result = runEngine(engineInput)

      if (result.action === 'test_higher' && result.price_proposed) {
        const suggestedCents = Math.round(result.price_proposed * 100)
        const confidence = Math.round((result.revenue_dist?.prob_above_current ?? 0.5) * 100)
        const projRoi = result.revenue_dist
          ? Math.round((result.revenue_dist.p50 - result.revenue_ref_monthly) * 100) / 100
          : null

        // Upsert suggestion into DB
        await supabase.from('suggestions').delete()
          .eq('user_id', user.id).eq('product_id', product.id).eq('status', 'pending')

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
          proj_monthly_lift_p50: projRoi !== null ? Math.round(projRoi * 100) : null,
          rule_flags: result.conservative_rules_applied,
          caveats: result.caveats,
          status: 'pending',
        })

        output.push({
          product_id: product.id,
          current_price: product.current_price_cents / 100,
          suggested_price: result.price_proposed,
          confidence,
          projected_roi: projRoi,
          rationale: result.why_text,
        })
      } else if (result.action === 'stable') {
        output.push({
          product_id: product.id,
          current_price: product.current_price_cents / 100,
          suggested_price: product.current_price_cents / 100,
          confidence: 40,
          projected_roi: 0,
          rationale: result.why_text || 'Current pricing appears optimal based on available data.',
        })
      } else {
        // insufficient_data — still return a safe +10% suggestion with low confidence
        const safe = Math.round(product.current_price_cents * 1.1)
        output.push({
          product_id: product.id,
          current_price: product.current_price_cents / 100,
          suggested_price: safe / 100,
          confidence: 15,
          projected_roi: null,
          rationale: 'Insufficient data for a confident recommendation. A conservative +10% test is suggested as a starting point.',
        })
      }
    }

    if (output.length === 0) {
      // Fallback: no transactions found for any product
      return NextResponse.json([{
        product_id: null,
        current_price: null,
        suggested_price: null,
        confidence: 10,
        projected_roi: null,
        rationale: 'No transaction data found. Import your sales data first.',
      }])
    }

    return NextResponse.json(output)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[suggestions/run] error:', msg)
    return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 400 })
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
