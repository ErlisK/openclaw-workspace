import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Aggregate transaction counts AND earnings by day-of-week and hour
  const { data, error } = await supabase
    .from('transactions')
    .select('transaction_date, created_at, net_amount')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Build heatmap: [day][hour] = { count, earnings }
  const heatmap: Record<number, Record<number, { count: number; earnings: number }>> = {}
  for (let d = 0; d < 7; d++) {
    heatmap[d] = {}
    for (let h = 0; h < 24; h++) heatmap[d][h] = { count: 0, earnings: 0 }
  }

  for (const tx of data ?? []) {
    const dt = new Date(tx.created_at ?? tx.transaction_date)
    const day = dt.getUTCDay()
    const hour = dt.getUTCHours()
    heatmap[day][hour].count += 1
    heatmap[day][hour].earnings = Math.round(
      (heatmap[day][hour].earnings + (tx.net_amount ?? 0)) * 100
    ) / 100
  }

  // Find best slot by earnings
  let bestDay = 0, bestHour = 0, bestEarnings = 0
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      if (heatmap[d][h].earnings > bestEarnings) {
        bestEarnings = heatmap[d][h].earnings
        bestDay = d
        bestHour = h
      }
    }
  }

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const bestSlot = bestEarnings > 0
    ? { day: bestDay, dayName: DAYS[bestDay], hour: bestHour, earnings: bestEarnings }
    : null

  return NextResponse.json({
    heatmap,
    total: data?.length ?? 0,
    bestSlot,
  })
}
