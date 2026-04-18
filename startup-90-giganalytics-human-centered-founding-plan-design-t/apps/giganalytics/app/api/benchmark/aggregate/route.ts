import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/benchmark/aggregate?month=2024-01
// Triggers the k-anonymized aggregation for a given month (admin/cron use)
// Also callable from a scheduled Vercel Cron job
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get('month')

  // Default to previous month
  const now = new Date()
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const month = monthParam ?? `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`

  // Call the PostgreSQL function
  const { error } = await supabase.rpc('aggregate_benchmark_snapshots' as never, { p_month: month })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Count how many buckets were created
  const { count } = await supabase
    .from('benchmark_snapshots')
    .select('*', { count: 'exact', head: true })
    .eq('snapshot_month', month)
    .eq('is_synthetic', false)

  return NextResponse.json({
    ok: true,
    month,
    bucketsCreated: count ?? 0,
    note: 'Only buckets with ≥10 distinct opted-in users are published (k-anonymity)',
  })
}
