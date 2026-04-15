import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import FounderDashboardClient from './FounderDashboardClient'

export const metadata = { title: 'Founder Dashboard — AgentQA Admin' }

export default async function FounderDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; page?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin/founder')

  const admin = createAdminClient()
  const { data: dbUser } = await admin.from('users').select('role').eq('id', user.id).single()

  if (dbUser?.role !== 'admin') {
    return (
      <div data-testid="admin-forbidden" className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🚫</div>
          <h1 className="text-xl font-bold">Access denied</h1>
          <p className="text-gray-500 mt-2">Admin role required.</p>
        </div>
      </div>
    )
  }

  const sp = await searchParams
  const from = sp.from ?? ''
  const to = sp.to ?? ''
  const page = parseInt(sp.page ?? '1')
  const pageSize = 50
  const offset = (page - 1) * pageSize

  let userQuery = admin
    .from('founder_user_list')
    .select('*')
    .range(offset, offset + pageSize - 1)
    .order('created_at', { ascending: false })

  if (from) userQuery = userQuery.gte('created_at', from)
  if (to) userQuery = userQuery.lte('created_at', to + 'T23:59:59')

  const [kpis, signupsDaily, jobsDaily, revenueDaily, users] = await Promise.all([
    admin.from('founder_kpis').select('*').single(),
    admin.from('founder_signups_daily').select('*'),
    admin.from('founder_jobs_daily').select('*'),
    admin.from('founder_revenue_daily').select('*'),
    userQuery,
  ])

  return (
    <FounderDashboardClient
      kpis={kpis.data}
      signupsDaily={signupsDaily.data ?? []}
      jobsDaily={jobsDaily.data ?? []}
      revenueDaily={revenueDaily.data ?? []}
      users={users.data ?? []}
      from={from}
      to={to}
      page={page}
      pageSize={pageSize}
    />
  )
}
