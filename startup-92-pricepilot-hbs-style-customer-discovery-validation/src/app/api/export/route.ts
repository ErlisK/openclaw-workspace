/**
 * GET /api/export?format=csv|json
 * Pro-only: export all user transactions and suggestions as CSV or JSON.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { requirePro } from '@/lib/entitlements'

export const maxDuration = 30

export async function GET(request: NextRequest) {
  // Require Pro entitlement
  const entResult = await requirePro()
  if (entResult instanceof NextResponse) return entResult

  const supabase = await createClient()
  const format = request.nextUrl.searchParams.get('format') || 'csv'
  const what = request.nextUrl.searchParams.get('what') || 'transactions'

  if (what === 'transactions') {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', entResult.user.id)
      .order('purchased_at', { ascending: false })
      .limit(5000)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (format === 'json') {
      return NextResponse.json({ transactions: data, count: data?.length ?? 0 })
    }

    // CSV
    const rows = data ?? []
    if (rows.length === 0) return new NextResponse('No transactions found', { status: 200, headers: { 'Content-Type': 'text/plain' } })

    const headers = ['id', 'platform', 'platform_txn_id', 'amount_cents', 'currency', 'is_refunded', 'customer_key', 'purchased_at', 'created_at']
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')),
    ].join('\n')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="pricepilot-transactions-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  }

  if (what === 'suggestions') {
    const { data, error } = await supabase
      .from('suggestions')
      .select('*')
      .eq('user_id', entResult.user.id)
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (format === 'json') {
      return NextResponse.json({ suggestions: data, count: data?.length ?? 0 })
    }

    const rows = data ?? []
    if (rows.length === 0) return new NextResponse('No suggestions found', { status: 200, headers: { 'Content-Type': 'text/plain' } })

    const headers = ['id', 'product_id', 'suggested_price', 'confidence', 'projected_roi', 'status', 'created_at']
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')),
    ].join('\n')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="pricepilot-suggestions-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  }

  return NextResponse.json({ error: 'Invalid "what" param. Use: transactions | suggestions' }, { status: 400 })
}
