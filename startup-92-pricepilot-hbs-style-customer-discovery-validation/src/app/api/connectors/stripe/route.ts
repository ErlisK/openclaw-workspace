import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import { requirePro, getEntitlement } from '@/lib/entitlements'
import { hashCustomerKey } from '@/lib/hash'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const source = request.nextUrl.searchParams.get('source') || 'api'

  if (source === 'csv') {
    // CSV import is available on all plans
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return handleCSVImport(request, supabase, user.id)
  }

  // Live Stripe API pull requires Pro
  const entResult = await requirePro()
  if (entResult instanceof NextResponse) return entResult

  const supabase = await createClient()
  return handleAPIImport(request, supabase, entResult.user.id)
}

async function handleAPIImport(request: NextRequest, supabase: any, userId: string) {
  const body = await request.json().catch(() => ({}))
  const limit = Math.min(Number(body.limit) || 100, 500)
  const rows: any[] = []
  let hasMore = true
  let startingAfter: string | undefined

  try {
    while (hasMore && rows.length < limit) {
      const charges: any = await stripe.charges.list({
        limit: Math.min(100, limit - rows.length),
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      })
      for (const ch of charges.data) {
        rows.push({
          user_id: userId,
          platform: 'stripe',
          platform_txn_id: ch.id,
          amount_cents: ch.amount ?? 0,
          currency: (ch.currency ?? 'usd').toUpperCase(),
          is_refunded: ch.refunded ?? false,
          customer_key: hashCustomerKey(ch.billing_details?.email ?? ch.receipt_email ?? null, userId),
          purchased_at: new Date((ch.created ?? 0) * 1000).toISOString(),
          metadata: { description: ch.description, product_name: ch.metadata?.product_name ?? ch.description },
        })
      }
      hasMore = charges.has_more
      if (charges.data.length > 0) startingAfter = charges.data[charges.data.length - 1].id
      else hasMore = false
    }

    if (rows.length === 0) {
      return NextResponse.json({ imported: 0, message: 'No Stripe charges found. Use ?source=csv with a Stripe charges CSV export.' })
    }

    const { error: upsertErr } = await supabase
      .from('transactions')
      .upsert(rows, { onConflict: 'user_id,platform,platform_txn_id', ignoreDuplicates: true })
    if (upsertErr) throw upsertErr

    return NextResponse.json({ imported: rows.length, source: 'stripe-api', message: `Imported ${rows.length} transactions from Stripe API` })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

async function handleCSVImport(request: NextRequest, supabase: any, userId: string) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file uploaded (field name: file)' }, { status: 400 })

  const text = await file.text()
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return NextResponse.json({ error: 'CSV empty' }, { status: 400 })

  const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
  const rows: any[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSV(lines[i])
    const get = (key: string) => {
      const idx = header.findIndex(h => h.includes(key))
      return idx >= 0 ? (cols[idx] ?? '').trim().replace(/^"|"$/g, '') : ''
    }
    const id = get('id') || `row_${i}`
    const amount = parseFloat(get('amount') || '0')
    if (!id || amount === 0) continue
    const currency = (get('currency') || 'USD').toUpperCase()
    const status = (get('status') || 'Paid').toLowerCase()
    const isRefunded = get('amount refunded') && parseFloat(get('amount refunded')) > 0 ? true : status === 'refunded'
    const email = get('email') || get('customer email') || null
    const created = get('created') || get('date') || ''
    const productName = get('product_name') || get('product name') || get('description') || null

    rows.push({
      user_id: userId,
      platform: 'stripe',
      platform_txn_id: `csv_${id}`.slice(0, 128),
      amount_cents: Math.round(amount * 100),
      currency,
      is_refunded: isRefunded,
      customer_key: hashCustomerKey(email, userId),
      purchased_at: parseDateSafe(created),
      metadata: { product_name: productName, csv_row: i },
    })
  }

  if (rows.length === 0) return NextResponse.json({ error: 'No valid rows. Download template: /templates/stripe-charges-template.csv' }, { status: 400 })

  const { error: upsertErr } = await supabase
    .from('transactions')
    .upsert(rows, { onConflict: 'user_id,platform,platform_txn_id', ignoreDuplicates: true })
  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })

  return NextResponse.json({ imported: rows.length, source: 'stripe-csv', message: `Imported ${rows.length} Stripe transactions from CSV` })
}

function splitCSV(line: string): string[] {
  const result: string[] = []
  let cur = ''; let inQ = false
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ }
    else if (ch === ',' && !inQ) { result.push(cur); cur = '' }
    else cur += ch
  }
  result.push(cur)
  return result
}

function parseDateSafe(s: string): string {
  try { const d = new Date(s); if (!isNaN(d.getTime())) return d.toISOString() } catch {}
  return new Date().toISOString()
}
