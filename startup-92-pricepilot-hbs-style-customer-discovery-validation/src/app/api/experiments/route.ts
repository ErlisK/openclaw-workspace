import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

function slugify(str: string): string {
  return str.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40)
}

function randomSuffix(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(5))
  return Array.from(bytes).map(b => b.toString(36).padStart(2, '0')).join('').slice(0, 8)
}

// GET /api/experiments — list all experiments for user
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 50), 1), 200)
  const offset = Math.max(Number(searchParams.get('offset') ?? 0), 0)

  let q = supabase
    .from('experiments')
    .select('*, products(name, current_price_cents)', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) q = q.eq('status', status)

  const { data, error, count } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    experiments: data || [],
    total: count ?? (data?.length ?? 0),
    limit,
    offset,
  })
}

// POST /api/experiments — create a new experiment
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    product_id,
    variant_a_price_cents,
    variant_b_price_cents,
    split_pct_b = 0.5,
    headline,
    description,
    cta_text,
    cta_url,
    variant_a_label = 'Control',
    variant_b_label = 'Variant',
    suggestion_id,
  } = body

  // Validate required fields
  if (!product_id || !variant_a_price_cents || !variant_b_price_cents) {
    return NextResponse.json({
      error: 'product_id, variant_a_price_cents, and variant_b_price_cents are required',
    }, { status: 422 })
  }

  // Verify product belongs to user
  const { data: product } = await supabase
    .from('products')
    .select('id, name')
    .eq('id', product_id)
    .eq('user_id', user.id)
    .single()

  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  // Generate unique slug
  const base = slugify(product.name)
  const slug = `${base}-${randomSuffix()}`

  // Create experiment in draft status
  const { data: exp, error: createErr } = await supabase
    .from('experiments')
    .insert({
      user_id: user.id,
      product_id,
      recommendation_id: suggestion_id || null,
      slug,
      variant_a_price_cents: Math.round(variant_a_price_cents),
      variant_b_price_cents: Math.round(variant_b_price_cents),
      split_pct_b,
      headline: headline || product.name,
      description: description || null,
      cta_text: cta_text || `Get ${product.name}`,
      cta_url: cta_url || null,
      variant_a_label,
      variant_b_label,
      status: 'draft',
      alpha_a: 1, beta_a: 1, alpha_b: 1, beta_b: 1,
      views_a: 0, views_b: 0,
      conversions_a: 0, conversions_b: 0,
      revenue_a_cents: 0, revenue_b_cents: 0,
    })
    .select()
    .single()

  if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })

  return NextResponse.json({
    experiment: exp,
    preview_url_a: `/x/${slug}?preview=A`,
    preview_url_b: `/x/${slug}?preview=B`,
    live_url: `/x/${slug}`,
    message: `Experiment created (draft). Preview at /x/${slug}?preview=A`,
  }, { status: 201 })
}
