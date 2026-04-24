import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'

export const maxDuration = 60

// POST with ?source=api — pulls from Stripe API (live account charges)
// POST with ?source=csv and multipart file — parses Stripe charges CSV export
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const source = request.nextUrl.searchParams.get('source') || 'api'

  if (source === 'csv') {
    return handleCSVImport(request, supabase, user.id)
  }

  return handleAPIImport(request, supabase, user.id)
}

async function handleAPIImport(request: NextRequest, supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, userId: string) {
  const body = await request.json().catch(() => ({}))
  const limit = Math.min(Number(body.limit) || 100, 500)

  try {
    const transactions: Record<string, unknown>[] = []
    let hasMore = true
    let startingAfter: string | undefined

    while (hasMore && transactions.length < limit) {
      const charges = await stripe.charges.list({
        limit: Math.min(100, limit - transactions.length),
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      }) as unknown as { data: Record<string, unknown>[]; has_more: boolean }

      for (const ch of charges.data) {
        const c = ch as Record<string, unknown>
        transactions.push({
          user_id: userId,
          external_id: c.id as string,
          source: 'stripe',
          amount: ((c.amount as number) ?? 0) / 100,
          currency: ((c.currency as string) ?? 'usd').toUpperCase(),
          status: c.status as string,
          customer_email: (c.billing_details as Record<string, unknown>)?.email as string ?? null,
          product_name: (c.metadata as Record<string, unknown>)?.product_name as string ?? c.description as string ?? null,
          description: c.description as string ?? null,
          transaction_date: new Date(((c.created as number) ?? 0) * 1000).toISOString(),
          metadata: c.metadata ?? {},
        })
      }

      hasMore = charges.has_more
      if (charges.data.length > 0) startingAfter = charges.data[charges.data.length - 1].id as string
      else hasMore = false
    }

    if (transactions.length === 0) {
      return NextResponse.json({ imported: 0, message: 'No Stripe charges found. Use ?source=csv to import from a Stripe CSV export.' })
    }

    const { error: upsertErr } = await supabase.from('transactions').upsert(transactions, { onConflict: 'user_id,external_id', ignoreDuplicates: true })
    if (upsertErr) throw upsertErr

    return NextResponse.json({ imported: transactions.length, source: 'stripe-api', message: `Imported ${transactions.length} transactions from Stripe API` })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

async function handleCSVImport(request: NextRequest, supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, userId: string) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file uploaded. Use field name "file".' }, { status: 400 })

  const text = await file.text()
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return NextResponse.json({ error: 'CSV empty' }, { status: 400 })

  const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSV(lines[i])
    const get = (key: string) => {
      const idx = header.findIndex(h => h.includes(key))
      return idx >= 0 ? (cols[idx] ?? '').trim().replace(/^"|"$/g, '') : ''
    }

    const id = get('id') || `stripe_csv_${i}`
    const amount = parseFloat(get('amount') || '0')
    const currency = (get('currency') || 'USD').toUpperCase()
    const desc = get('description')
    const email = get('email')
    const created = get('created') || get('date')
    const status = (get('status') || 'Paid').toLowerCase() === 'paid' ? 'succeeded' : 'refunded'
    const productName = get('product_name') || get('product') || desc || null

    if (!id || amount === 0) continue

    rows.push({
      user_id: userId,
      external_id: `stripe_csv_${id}`.slice(0, 128),
      source: 'stripe',
      amount,
      currency,
      status,
      customer_email: email || null,
      product_name: productName,
      description: desc || null,
      transaction_date: parseDateSafe(created),
      metadata: { csv_row: i },
    })
  }

  if (rows.length === 0) return NextResponse.json({ error: 'No valid rows. Download the template from /templates/stripe-charges-template.csv' }, { status: 400 })

  const { error: upsertErr } = await supabase.from('transactions').upsert(rows, { onConflict: 'user_id,external_id', ignoreDuplicates: true })
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
