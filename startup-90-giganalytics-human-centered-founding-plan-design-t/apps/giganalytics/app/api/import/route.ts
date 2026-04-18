import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ImportRow {
  date?: string
  amount?: string
  net_amount?: string
  fee_amount?: string
  description?: string
  source_id?: string
  currency?: string
}

function parseAmount(v: string | undefined): number | null {
  if (!v) return null
  const n = parseFloat(v.replace(/[$,]/g, ''))
  return isNaN(n) ? null : Math.abs(n)
}

function parseDate(v: string | undefined): string | null {
  if (!v) return null
  const d = new Date(v)
  if (isNaN(d.getTime())) return null
  return d.toISOString().split('T')[0]
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { rows, streamId, platform, streamName } = body as {
    rows: ImportRow[]
    streamId?: string
    platform?: string
    streamName?: string
  }

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }

  // Resolve or create stream
  let resolvedStreamId = streamId
  if (!resolvedStreamId) {
    const name = streamName || (platform === 'stripe' ? 'Stripe' : platform === 'paypal' ? 'PayPal' : platform === 'upwork' ? 'Upwork' : 'Imported')
    const { data: existing } = await supabase
      .from('streams')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name)
      .single()

    if (existing) {
      resolvedStreamId = existing.id
    } else {
      const { data: created } = await supabase
        .from('streams')
        .insert({ user_id: user.id, name, platform: platform ?? 'other' })
        .select('id')
        .single()
      resolvedStreamId = created?.id
    }
  }

  // Build transaction rows
  const txRows = rows.map((row, i) => {
    const amount = parseAmount(row.amount) ?? 0
    const netAmount = parseAmount(row.net_amount) ?? amount
    const feeAmount = parseAmount(row.fee_amount) ?? Math.abs(amount - netAmount)
    const txDate = parseDate(row.date) ?? new Date().toISOString().split('T')[0]
    return {
      user_id: user.id,
      stream_id: resolvedStreamId,
      amount: Math.abs(amount),
      net_amount: Math.abs(netAmount),
      fee_amount: Math.abs(feeAmount),
      description: row.description ?? null,
      transaction_date: txDate,
      source_platform: platform ?? null,
      source_id: row.source_id ?? `import-${platform}-${Date.now()}-${i}`,
      currency: row.currency ?? 'usd',
    }
  }).filter(r => r.amount > 0 && r.transaction_date)

  if (txRows.length === 0) {
    return NextResponse.json({ error: 'No valid transactions found after filtering' }, { status: 400 })
  }

  // Upsert with dedup on source_id
  const { data, error } = await supabase
    .from('transactions')
    .upsert(txRows, { onConflict: 'source_id', ignoreDuplicates: true })
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    imported: data?.length ?? txRows.length,
    total: rows.length,
    streamId: resolvedStreamId,
    platform: platform ?? 'custom',
  })
}
