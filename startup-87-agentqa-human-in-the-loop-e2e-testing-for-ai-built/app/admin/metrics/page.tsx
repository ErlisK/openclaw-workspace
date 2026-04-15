import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import AdminMetricsClient from './AdminMetricsClient'

export const metadata = { title: 'Admin — Metrics Dashboard' }

export default async function AdminMetricsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin/metrics')

  const admin = createAdminClient()
  const { data: dbUser } = await admin.from('users').select('role').eq('id', user.id).single()

  if (dbUser?.role !== 'admin') {
    return (
      <div data-testid="admin-forbidden" className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🚫</div>
          <h1 className="text-xl font-bold text-gray-900">Access denied</h1>
          <p className="text-gray-500 mt-2">Admin role required.</p>
        </div>
      </div>
    )
  }

  // Fetch data server-side
  const [metrics, dailySignups, dailyJobs, dailyRevenue, recentReferrals] = await Promise.all([
    admin.from('admin_metrics').select('*').single(),
    admin.from('admin_daily_signups').select('*').limit(30),
    admin.from('admin_daily_jobs').select('*').limit(30),
    admin.from('admin_daily_revenue').select('*').limit(30),
    admin.from('referral_events').select('id, triggered_by, created_at').limit(10).order('created_at', { ascending: false }),
  ])

  return (
    <AdminMetricsClient
      metrics={metrics.data}
      dailySignups={dailySignups.data ?? []}
      dailyJobs={dailyJobs.data ?? []}
      dailyRevenue={dailyRevenue.data ?? []}
      recentReferrals={recentReferrals.data ?? []}
    />
  )
}
