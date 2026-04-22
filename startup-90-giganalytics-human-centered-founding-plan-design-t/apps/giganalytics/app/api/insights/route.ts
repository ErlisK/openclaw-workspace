import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch recent transactions to build insights
  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount, net_amount, fee_amount, transaction_date, source_platform, stream_id')
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: false })
    .limit(200)

  const { data: streams } = await supabase
    .from('streams')
    .select('id, name, platform, hourly_rate')
    .eq('user_id', user.id)

  const { data: timerEntries } = await supabase
    .from('timer_entries')
    .select('stream_id, duration_seconds, started_at')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(100)

  // Compute basic insights
  const totalEarnings = (transactions ?? []).reduce((sum, t) => sum + (t.net_amount ?? t.amount ?? 0), 0)
  const totalHours = (timerEntries ?? []).reduce((sum, e) => sum + ((e.duration_seconds ?? 0) / 3600), 0)
  const trueHourlyRate = totalHours > 0 ? totalEarnings / totalHours : null
  const totalFees = (transactions ?? []).reduce((sum, t) => sum + (t.fee_amount ?? 0), 0)
  const feeRate = totalEarnings > 0 ? totalFees / (totalEarnings + totalFees) : 0

  // Per-stream breakdown
  const streamMap = new Map((streams ?? []).map((s) => [s.id, s]))
  const streamEarnings: Record<string, number> = {}
  for (const t of transactions ?? []) {
    if (t.stream_id) {
      streamEarnings[t.stream_id] = (streamEarnings[t.stream_id] ?? 0) + (t.net_amount ?? t.amount ?? 0)
    }
  }
  const streamBreakdown = Object.entries(streamEarnings).map(([id, earnings]) => ({
    id,
    name: streamMap.get(id)?.name ?? 'Unknown',
    earnings: Math.round(earnings * 100) / 100,
  }))

  // Top recommendation
  const recommendations: string[] = []
  if (trueHourlyRate !== null && trueHourlyRate < 25) {
    recommendations.push('Your true hourly rate is below $25/hr. Consider raising prices or reducing low-ROI platforms.')
  }
  if (feeRate > 0.1) {
    recommendations.push(`Platform fees are taking ${Math.round(feeRate * 100)}% of gross revenue. Explore direct client channels to reduce fees.`)
  }
  if ((transactions ?? []).length === 0) {
    recommendations.push('Import your first payment data to unlock personalized insights and ROI analysis.')
  }
  if (recommendations.length === 0) {
    recommendations.push('Your income streams look healthy! Keep logging time to improve hourly rate accuracy.')
  }

  return NextResponse.json({
    summary: {
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      totalHours: Math.round(totalHours * 10) / 10,
      trueHourlyRate: trueHourlyRate !== null ? Math.round(trueHourlyRate * 100) / 100 : null,
      feeRate: Math.round(feeRate * 1000) / 10,
      transactionCount: (transactions ?? []).length,
      streamCount: (streams ?? []).length,
    },
    streamBreakdown,
    recommendations,
  })
}
