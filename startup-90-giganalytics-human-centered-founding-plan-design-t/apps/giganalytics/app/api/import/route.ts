import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { captureServerEvent } from '@/lib/posthog/server'

interface ImportRow {
  date?: string
  amount?: string | number
  net_amount?: string | number
  fee_amount?: string | number
  description?: string
  source_id?: string
  currency?: string
}

function parseAmount(v: string | number | undefined): number | null {
  if (v === undefined || v === null || v === '') return null
  if (typeof v === 'number') return isNaN(v) ? null : v
  const n = parseFloat(String(v).replace(/[$,]/g, ''))
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

    let body: { rows?: ImportRow[]; streamId?: string; platform?: string; streamName?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { rows, streamId, platform, streamName } = body

  const MAX_IMPORT_ROWS = 5000
  if ((rows?.length ?? 0) > MAX_IMPORT_ROWS) {
    return NextResponse.json({ error: "import_too_large", message: `Import limited to ${MAX_IMPORT_ROWS} rows per request.` }, { status: 400 })
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

  // Insert with dedup: try upsert first, fall back to plain insert
  let data: { id: string }[] | null = null
  let error: { message: string; code?: string } | null = null

  // Try upsert with source_id dedup (requires unique constraint)
  const upsertResult = await supabase
    .from('transactions')
    .upsert(txRows, { onConflict: 'source_id', ignoreDuplicates: true })
    .select('id')

  if (upsertResult.error?.code === '42P10' || upsertResult.error?.message?.includes('no unique or exclusion constraint')) {
    // No unique constraint on source_id — fall back to plain insert
    const insertResult = await supabase
      .from('transactions')
      .insert(txRows)
      .select('id')
    data = insertResult.data
    error = insertResult.error
  } else {
    data = upsertResult.data
    error = upsertResult.error
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const importedCount = data?.length ?? txRows.length

  // Fire PostHog event (best-effort)
  captureServerEvent(user.id, 'import_completed', {
    platform: platform ?? 'custom',
    row_count: importedCount,
    stream_id: resolvedStreamId,
    funnel: 'activation',
    funnel_step: 7,
  }).catch(() => {})

  // Activation funnel: check if this is the user's first import
  // and fire activation_complete if ROI data is now available
  captureServerEvent(user.id, 'import_started', {
    platform: platform ?? 'custom',
    funnel: 'activation',
    funnel_step: 6,
  }).catch(() => {})

  return NextResponse.json({
    imported: importedCount,
    total: rows.length,
    streamId: resolvedStreamId,
    platform: platform ?? 'custom',
  })
}
