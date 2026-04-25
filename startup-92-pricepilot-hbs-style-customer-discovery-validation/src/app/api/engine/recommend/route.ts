import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { runEngine, Transaction } from '@/lib/engine'
import { createRatelimit, checkRateLimit } from '@/lib/ratelimit'

const engineLimiter = createRatelimit(5, 60)

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { limited, headers: rlHeaders } = await checkRateLimit(engineLimiter, user.id)
  if (limited) return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429, headers: rlHeaders })

  try {
    const body = await request.json().catch(() => ({}))
    const productId = body.product_id

    // Fetch products for this user
    let productsQuery = supabase.from('products').select('*').eq('user_id', user.id)
    if (productId) productsQuery = productsQuery.eq('id', productId)

    const { data: products } = await productsQuery
    if (!products || products.length === 0) {
      return NextResponse.json({
        action: 'insufficient_data',
        why_text: 'No products found. Import some sales data first.',
        caveats: ['No products'],
        conservative_rules_applied: [],
        confidence_label: 'No data',
        n_observations: 0,
        spike_fraction: 0,
        suggestions: [],
      })
    }

    const results = []
    for (const product of products) {
      // Fetch transactions
      const { data: txns } = await supabase
        .from('transactions')
        .select('amount_cents, purchased_at, is_refunded')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .eq('is_refunded', false)
        .order('purchased_at', { ascending: true })

      if (!txns || txns.length === 0) continue

      // Group into 30-day windows
      const grouped = groupByMonth(txns)
      const engineInput: Transaction[] = grouped.map(g => ({
        price: g.price / 100,
        quantity: g.count,
        period_days: g.days,
        cohort_tag: 'organic',
      }))

      const result = runEngine(engineInput)
      results.push({
        product_id: product.id,
        product_name: product.name,
        current_price_cents: product.current_price_cents,
        ...result,
      })

      // Store suggestion in DB
      if (result.action === 'test_higher' && result.price_proposed) {
        // Delete any existing pending suggestion for this product first
        await supabase.from('suggestions').delete()
          .eq('user_id', user.id).eq('product_id', product.id).eq('status', 'pending')
        const { error: sgErr } = await supabase.from('suggestions').insert({
          user_id: user.id,
          product_id: product.id,
          suggestion_type: 'price_increase',
          current_price_cents: product.current_price_cents,
          suggested_price_cents: Math.round(result.price_proposed * 100),
          title: `Test $${result.price_proposed} vs $${(product.current_price_cents / 100).toFixed(0)}`,
          rationale: result.why_text,
          confidence_score: result.revenue_dist?.prob_above_current || null,
          confidence_label: result.confidence_label,
          proj_monthly_lift_p50: result.revenue_dist
            ? Math.round((result.revenue_dist.p50 - result.revenue_ref_monthly) * 100)
            : null,
          rule_flags: result.conservative_rules_applied,
          caveats: result.caveats,
          status: 'pending',
        })
        if (sgErr) console.error('Failed to insert suggestion:', sgErr.message)
      }
    }

    return NextResponse.json({ suggestions: results })
  } catch (err: unknown) {
    console.error('[engine/recommend] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 })
  }
}

function groupByMonth(txns: { amount_cents: number; purchased_at: string }[]) {
  const months: Record<string, { count: number; price: number; dates: Date[] }> = {}
  for (const t of txns) {
    const d = new Date(t.purchased_at)
    const key = `${d.getFullYear()}-${d.getMonth()}-${t.amount_cents}`
    if (!months[key]) months[key] = { count: 0, price: t.amount_cents, dates: [] }
    months[key].count++
    months[key].dates.push(d)
  }
  return Object.values(months).map(m => ({
    price: m.price,
    count: m.count,
    days: 30,
  }))
}
