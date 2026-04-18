import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Aggregate transaction counts by day-of-week and hour
  const { data, error } = await supabase
    .from('transactions')
    .select('transaction_date, created_at')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Build heatmap: [day][hour] = count
  const heatmap: Record<number, Record<number, number>> = {}
  for (let d = 0; d < 7; d++) {
    heatmap[d] = {}
    for (let h = 0; h < 24; h++) heatmap[d][h] = 0
  }

  for (const tx of data ?? []) {
    const dt = new Date(tx.created_at ?? tx.transaction_date)
    const day = dt.getUTCDay()
    const hour = dt.getUTCHours()
    heatmap[day][hour] = (heatmap[day][hour] ?? 0) + 1
  }

  return NextResponse.json({ heatmap, total: data?.length ?? 0 })
}
