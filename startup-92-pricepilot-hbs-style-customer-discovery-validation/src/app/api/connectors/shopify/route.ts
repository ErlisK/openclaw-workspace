import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file (field: file)' }, { status: 400 })

  const text = await file.text()
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return NextResponse.json({ error: 'CSV empty' }, { status: 400 })

  const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
  const rows: Record<string, unknown>[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSV(lines[i])
    const get = (key: string) => {
      const idx = header.findIndex(h => h.includes(key))
      return idx >= 0 ? (cols[idx] ?? '').trim().replace(/^"|"$/g, '') : ''
    }
    const orderId = get('name') || get('order') || get('id') || `row_${i}`
    const email = get('email') || get('billing') || null
    const total = parseFloat(get('total') || get('subtotal') || '0')
    const currency = (get('currency') || 'USD').toUpperCase()
    const createdAt = get('created at') || get('created_at') || get('date') || ''
    const productName = get('lineitem name') || get('product') || null
    const financialStatus = (get('financial status') || 'paid').toLowerCase()
    const isRefunded = financialStatus === 'refunded'
    if (!orderId || total === 0) continue

    rows.push({
      user_id: user.id,
      platform: 'shopify',
      platform_txn_id: `shopify_${orderId.replace(/[^a-zA-Z0-9_]/g, '_')}`.slice(0, 128),
      amount_cents: Math.round(total * 100),
      currency,
      is_refunded: isRefunded,
      customer_key: email,
      purchased_at: parseDateSafe(createdAt),
      metadata: { order_id: orderId, financial_status: financialStatus, product_name: productName },
    })
  }

  if (rows.length === 0) return NextResponse.json({ error: 'No valid rows. Template: /templates/shopify-orders-template.csv' }, { status: 400 })
  const { error: upsertErr } = await supabase
    .from('transactions')
    .upsert(rows, { onConflict: 'user_id,platform,platform_txn_id', ignoreDuplicates: true })
  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  return NextResponse.json({ imported: rows.length, source: 'shopify', message: `Imported ${rows.length} Shopify orders` })
}

function splitCSV(line: string): string[] {
  const result: string[] = []; let cur = ''; let inQ = false
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ }
    else if (ch === ',' && !inQ) { result.push(cur); cur = '' }
    else cur += ch
  }
  result.push(cur); return result
}
function parseDateSafe(s: string): string {
  try { const d = new Date(s); if (!isNaN(d.getTime())) return d.toISOString() } catch {}
  return new Date().toISOString()
}
