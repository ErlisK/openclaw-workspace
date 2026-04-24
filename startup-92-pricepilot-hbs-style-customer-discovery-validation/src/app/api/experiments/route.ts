import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// GET /api/experiments
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('experiments')
    .select('*, products(name, current_price_cents)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json(data || [])
}

// POST /api/experiments — create new experiment
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { product_id, variant_a_price_cents, variant_b_price_cents, split_pct_b = 0.5 } = body

    if (!product_id || !variant_a_price_cents || !variant_b_price_cents) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check no active experiment for this product
    const { data: existing } = await supabase
      .from('experiments')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', product_id)
      .eq('status', 'active')
      .single()

    if (existing) {
      return NextResponse.json({
        error: 'An active experiment already exists for this product'
      }, { status: 409 })
    }

    // Generate slug
    const slug = `exp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

    const { data: exp, error: expErr } = await supabase
      .from('experiments')
      .insert({
        user_id: user.id,
        product_id,
        slug,
        variant_a_price_cents,
        variant_b_price_cents,
        split_pct_b,
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (expErr) return NextResponse.json({ error: expErr.message }, { status: 500 })
    return NextResponse.json(exp, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
