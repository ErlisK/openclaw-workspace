import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/benchmark/aggregate?month=2024-01
// Triggers the k-anonymized aggregation for a given month (admin/cron use)
// Also callable from a scheduled Vercel Cron job
// Protected: requires CRON_SECRET header or admin user
export async function POST(request: NextRequest) {
  // Check CRON_SECRET header (for Vercel Cron or internal calls)
  const cronSecret = process.env.CRON_SECRET
  const presentedSecret = request.headers.get('x-cron-secret')
  const adminUserIds = (process.env.ADMIN_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean)

  if (cronSecret && presentedSecret === cronSecret) {
    // Cron job authenticated — skip user check
  } else {
    // Otherwise require an authenticated admin user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (adminUserIds.length > 0 && !adminUserIds.includes(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const supabase = await createClient()

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
