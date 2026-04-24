import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export const maxDuration = 30

// Gumroad CSV format: Sale Date, Product Name, Seller, Email, Price, Currency, Refunded, Partial Refund, Discover Fee, Gumroad Fee, Taxes, Net Total, Zip/Postal Code, Country, IP Country
// This matches the Gumroad "Sales" export CSV

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
    if (cols.length < 5) continue

    const get = (key: string) => {
      const idx = header.indexOf(key)
      return idx >= 0 ? (cols[idx] ?? '').trim().replace(/^"|"$/g, '') : ''
    }

    const saleDate = get('sale date') || get('date') || get('created_at')
    const productName = get('product name') || get('product') || get('title')
    const email = get('email') || get('buyer email') || get('customer email')
    const price = parseFloat(get('price') || get('amount') || get('net total') || '0')
    const currency = (get('currency') || 'USD').toUpperCase()
    const refunded = get('refunded') === 'true' || get('refunded') === 'yes' || get('refunded') === '1'

    if (!saleDate && !productName) continue

    rows.push({
      user_id: user.id,
      external_id: `gumroad_${i}_${saleDate}_${email}`.replace(/\s/g, '_').slice(0, 128),
      source: 'gumroad',
      amount: price,
      currency,
      status: refunded ? 'refunded' : 'succeeded',
      customer_email: email || null,
      product_name: productName || null,
      description: `Gumroad sale: ${productName}`,
      transaction_date: parseDateSafe(saleDate),
      metadata: { row: i },
    })
  }

  if (rows.length === 0) return NextResponse.json({ error: 'No valid rows found. Check CSV format matches Gumroad export.' }, { status: 400 })

  const { error: upsertErr } = await supabase
    .from('transactions')
    .upsert(rows, { onConflict: 'user_id,external_id', ignoreDuplicates: true })

  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })

  return NextResponse.json({ imported: rows.length, source: 'gumroad', message: `Imported ${rows.length} Gumroad transactions` })
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
