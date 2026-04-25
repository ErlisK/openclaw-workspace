import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [products, transactions, suggestions, experiments] = await Promise.all([
      supabase.from('products').select('id, name, current_price_cents, created_at').eq('user_id', user.id),
      supabase.from('transactions').select('id, platform, amount_cents, currency, purchased_at, is_refunded').eq('user_id', user.id).limit(5000),
      supabase.from('suggestions').select('id, product_name, current_price_cents, suggested_price_cents, confidence_label, rationale, status, created_at').eq('user_id', user.id),
      supabase.from('experiments').select('id, status, variant_a_price_cents, variant_b_price_cents, created_at').eq('user_id', user.id),
    ])

    const exportData = {
      exported_at: new Date().toISOString(),
      account: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
      products: products.data || [],
      transactions: transactions.data || [],
      suggestions: suggestions.data || [],
      experiments: experiments.data || [],
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="pricepilot-export.json"',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Export failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
