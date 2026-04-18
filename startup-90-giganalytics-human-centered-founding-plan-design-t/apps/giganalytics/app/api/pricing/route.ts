import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeStreamPricing, computeWhatIf } from '@/lib/pricing'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const monthlyTarget = parseFloat(searchParams.get('target') ?? '0')
  const streamId = searchParams.get('streamId') ?? undefined
  const days = parseInt(searchParams.get('days') ?? '90')

  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - days)
  const from = fromDate.toISOString().split('T')[0]

  const [
    { data: streams },
    { data: transactions },
    { data: timeEntries },
  ] = await Promise.all([
    supabase.from('streams').select('id, name, color').eq('user_id', user.id),
    supabase.from('transactions')
      .select('stream_id, net_amount, amount, transaction_date')
      .eq('user_id', user.id)
      .gte('transaction_date', from),
    supabase.from('time_entries')
      .select('stream_id, duration_minutes, entry_type, started_at')
      .eq('user_id', user.id)
      .gte('started_at', fromDate.toISOString()),
  ])

  const streamPricings = (streams ?? []).map(s =>
    computeStreamPricing(s, transactions ?? [], timeEntries ?? [])
  ).filter(s => s.txCount > 0)

  const whatIf = monthlyTarget > 0
    ? computeWhatIf(monthlyTarget, transactions ?? [], timeEntries ?? [], streamId)
    : null

  return NextResponse.json({ streams: streamPricings, whatIf, days })
}
