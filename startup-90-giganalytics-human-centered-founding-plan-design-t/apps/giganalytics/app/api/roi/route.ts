import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeROI } from '@/lib/roi'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') ?? '90')
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - days)
  const from = fromDate.toISOString().split('T')[0]
  const to = new Date().toISOString().split('T')[0]

  const [
    { data: streams },
    { data: transactions },
    { data: timeEntries },
    { data: acquisitionCosts },
  ] = await Promise.all([
    supabase.from('streams').select('id, name, color, platform').eq('user_id', user.id),
    supabase.from('transactions')
      .select('stream_id, net_amount, amount, fee_amount, transaction_date')
      .eq('user_id', user.id)
      .gte('transaction_date', from)
      .lte('transaction_date', to),
    supabase.from('time_entries')
      .select('stream_id, duration_minutes, entry_type, started_at')
      .eq('user_id', user.id)
      .gte('started_at', fromDate.toISOString()),
    supabase.from('acquisition_costs')
      .select('stream_id, channel, amount, period_start, period_end')
      .eq('user_id', user.id)
      .gte('period_start', from),
  ])

  const snapshot = computeROI(
    streams ?? [],
    transactions ?? [],
    timeEntries ?? [],
    acquisitionCosts ?? [],
    { from, to }
  )

  return NextResponse.json(snapshot)
}
