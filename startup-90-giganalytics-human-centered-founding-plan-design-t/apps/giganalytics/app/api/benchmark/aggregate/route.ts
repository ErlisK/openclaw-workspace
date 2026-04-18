import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/benchmark/aggregate?month=2024-01
// Protected: requires CRON_SECRET header or an admin user ID in ADMIN_USER_IDS env var.
// ADMIN_USER_IDS: comma-separated Supabase user UUIDs. Must be set; empty = nobody allowed.
// CRON_SECRET: shared secret for Vercel Cron job authentication.
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const presentedSecret = request.headers.get('x-cron-secret')
  const adminUserIds = (process.env.ADMIN_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean)

  if (cronSecret && presentedSecret === cronSecret) {
    // Cron job authenticated — proceed
  } else {
    // Require authenticated admin user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // Deny-by-default: if no admin IDs configured or user is not in the list, reject
    if (adminUserIds.length === 0 || !adminUserIds.includes(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get('month')

  const now = new Date()
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const month = monthParam ?? `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`

  const { error } = await supabase.rpc('aggregate_benchmark_snapshots' as never, { p_month: month })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

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
