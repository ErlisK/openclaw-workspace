import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface CsvRow {
  stream_name?: string
  amount?: string
  net_amount?: string
  fee_amount?: string
  date?: string
  description?: string
  source_id?: string
  platform?: string
}

function parseAmount(v: string | undefined): number | null {
  if (!v) return null
  const n = parseFloat(v.replace(/[$,]/g, ''))
  return isNaN(n) ? null : n
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
  const { rows, streamId, platform }: { rows: CsvRow[]; streamId?: string; platform?: string } = body

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }

  // Ensure stream exists or create default
  let resolvedStreamId = streamId
  if (!resolvedStreamId) {
    const streamName = platform ?? 'Imported'
    const { data: existing } = await supabase
      .from('streams')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', streamName)
      .single()

    if (existing) {
      resolvedStreamId = existing.id
    } else {
      const { data: created } = await supabase
        .from('streams')
        .insert({ user_id: user.id, name: streamName, platform: platform ?? 'other' })
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
      source_id: row.source_id ?? `import-${Date.now()}-${i}`,
      currency: 'usd',
    }
  }).filter(r => r.amount > 0 && r.transaction_date)

  if (txRows.length === 0) {
    return NextResponse.json({ error: 'No valid transactions found' }, { status: 400 })
  }

  // Upsert (dedup by source_id)
  const { data, error } = await supabase
    .from('transactions')
    .upsert(txRows, { onConflict: 'source_id', ignoreDuplicates: true })
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    imported: data?.length ?? 0,
    total: txRows.length,
    streamId: resolvedStreamId,
  })
}
