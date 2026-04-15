import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: dbUser } = await admin.from('users').select('role').eq('id', user.id).single()
  if (dbUser?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Fetch all views in parallel
  const [metrics, dailySignups, dailyJobs, dailyRevenue, referrals] = await Promise.all([
    admin.from('admin_metrics').select('*').single(),
    admin.from('admin_daily_signups').select('*').limit(30),
    admin.from('admin_daily_jobs').select('*').limit(30),
    admin.from('admin_daily_revenue').select('*').limit(30),
    admin.from('referral_events').select('id, triggered_by, created_at').limit(50).order('created_at', { ascending: false }),
  ])

  return NextResponse.json({
    metrics: metrics.data,
    dailySignups: dailySignups.data ?? [],
    dailyJobs: dailyJobs.data ?? [],
    dailyRevenue: dailyRevenue.data ?? [],
    recentReferrals: referrals.data ?? [],
    fetchedAt: new Date().toISOString(),
  })
}
