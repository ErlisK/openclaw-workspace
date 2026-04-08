export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const { visitorId, variant, page = 'pricing', event, metadata = {} } = await request.json()
  if (!visitorId || !variant || !event) {
    return NextResponse.json({ error: 'visitorId, variant, event required' }, { status: 400 })
  }
  const supabase = getSupabaseAdmin()
  await supabase.from('cc_pricing_ab').insert({ visitor_id: visitorId, variant, page, event, metadata })
  return NextResponse.json({ tracked: true })
}

export async function GET() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('cc_pricing_ab')
    .select('variant, event, metadata, created_at')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const variants = ['a', 'b', 'c']
  const stats = Object.fromEntries(variants.map(v => {
    const rows = data?.filter(r => r.variant === v) || []
    const views = rows.filter(r => r.event === 'view').length
    const clicks = rows.filter(r => r.event === 'cta_click').length
    const checkouts = rows.filter(r => r.event === 'checkout_start').length
    return [v, {
      views,
      clicks,
      checkouts,
      ctr: views > 0 ? (clicks / views).toFixed(3) : '0',
      checkoutRate: views > 0 ? (checkouts / views).toFixed(3) : '0',
    }]
  }))

  return NextResponse.json({ total: data?.length || 0, variants: stats })
}
