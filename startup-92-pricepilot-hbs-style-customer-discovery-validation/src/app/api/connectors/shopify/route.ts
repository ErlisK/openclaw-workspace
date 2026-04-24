import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export const maxDuration = 30

// Shopify Orders CSV format: Name,Email,Financial Status,Fulfillment Status,Currency,Subtotal,Shipping,Taxes,Total,Discount Code,Discount Amount,Created at,Lineitem quantity,Lineitem name,Lineitem price,...

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file uploaded. Use field name "file".' }, { status: 400 })

  const text = await file.text()
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return NextResponse.json({ error: 'CSV is empty or has no data rows' }, { status: 400 })

  const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSV(lines[i])
    const get = (key: string) => {
      const idx = header.indexOf(key)
      return idx >= 0 ? (cols[idx] ?? '').trim().replace(/^"|"$/g, '') : ''
    }

    const orderId = get('name') || get('order') || get('id') || `row_${i}`
    const email = get('email') || get('billing email') || ''
    const total = parseFloat(get('total') || get('subtotal') || get('amount') || '0')
    const currency = (get('currency') || 'USD').toUpperCase()
    const createdAt = get('created at') || get('created_at') || get('date')
    const productName = get('lineitem name') || get('product') || get('title') || null
    const financialStatus = get('financial status') || 'paid'
    const status = financialStatus === 'refunded' ? 'refunded' : financialStatus === 'paid' ? 'succeeded' : financialStatus

    if (!orderId || total === 0) continue

    rows.push({
      user_id: user.id,
      external_id: `shopify_${orderId.replace(/[^a-zA-Z0-9_]/g, '_')}`.slice(0, 128),
      source: 'shopify',
      amount: total,
      currency,
      status,
      customer_email: email || null,
      product_name: productName,
      description: `Shopify order ${orderId}`,
      transaction_date: parseDateSafe(createdAt),
      metadata: { order_id: orderId, financial_status: financialStatus },
    })
  }

  if (rows.length === 0) return NextResponse.json({ error: 'No valid rows found. Check CSV format matches Shopify orders export.' }, { status: 400 })

  const { error: upsertErr } = await supabase
    .from('transactions')
    .upsert(rows, { onConflict: 'user_id,external_id', ignoreDuplicates: true })

  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })

  return NextResponse.json({ imported: rows.length, source: 'shopify', message: `Imported ${rows.length} Shopify orders` })
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
  try {
    const d = new Date(s)
    if (!isNaN(d.getTime())) return d.toISOString()
  } catch {}
  return new Date().toISOString()
}
