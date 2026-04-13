import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/admin/payments
 *   Returns order summary + recent orders for admin dashboard
 *   ?view=orders&limit=50&offset=0
 *   ?view=stats
 *   ?view=subscriptions
 */

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const view   = searchParams.get('view') ?? 'stats'
  const limit  = parseInt(searchParams.get('limit')  ?? '50')
  const offset = parseInt(searchParams.get('offset') ?? '0')
  const sb     = admin()

  if (view === 'stats') {
    const [totalRes, paidRes, subRes, revenueRes] = await Promise.all([
      sb.from('orders').select('*', { count: 'exact', head: true }),
      sb.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
      sb.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      sb.from('orders').select('amount_cents').eq('status', 'paid'),
    ])

    const revenueData = (revenueRes.data ?? []) as { amount_cents: number }[]
    const totalRevCents = revenueData.reduce((s, r) => s + (r.amount_cents ?? 0), 0)

    // Revenue by price_id
    const { data: byPrice } = await sb
      .from('orders')
      .select('price_id, amount_cents, status')
      .eq('status', 'paid')

    const priceBreakdown: Record<string, { count: number; revenueCents: number }> = {}
    for (const r of (byPrice ?? []) as { price_id: string; amount_cents: number }[]) {
      if (!priceBreakdown[r.price_id]) priceBreakdown[r.price_id] = { count: 0, revenueCents: 0 }
      priceBreakdown[r.price_id].count++
      priceBreakdown[r.price_id].revenueCents += r.amount_cents ?? 0
    }

    // Recent 7d trend
    const { data: recent7d } = await sb
      .from('orders')
      .select('created_at, status, amount_cents')
      .gte('created_at', new Date(Date.now() - 7 * 86_400_000).toISOString())

    return NextResponse.json({
      totalOrders:       totalRes.count   ?? 0,
      paidOrders:        paidRes.count    ?? 0,
      activeSubscriptions: subRes.count   ?? 0,
      totalRevenueCents: totalRevCents,
      totalRevenueUsd:   (totalRevCents / 100).toFixed(2),
      conversionRate:    totalRes.count
        ? ((paidRes.count ?? 0) / (totalRes.count ?? 1) * 100).toFixed(1) + '%'
        : '0%',
      priceBreakdown,
      recent7dCount:     (recent7d ?? []).length,
      recent7dRevenue:   ((recent7d ?? []) as { amount_cents: number; status: string }[])
        .filter(r => r.status === 'paid')
        .reduce((s, r) => s + r.amount_cents, 0) / 100,
    })
  }

  if (view === 'orders') {
    const { data, count, error } = await sb
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ orders: data ?? [], total: count ?? 0 })
  }

  if (view === 'subscriptions') {
    const { data, count } = await sb
      .from('subscriptions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    return NextResponse.json({ subscriptions: data ?? [], total: count ?? 0 })
  }

  return NextResponse.json({ error: 'Unknown view' }, { status: 400 })
}
