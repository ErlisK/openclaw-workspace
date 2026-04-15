import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/founder
 * Query params:
 *   ?from=2024-01-01  — start date (ISO)
 *   ?to=2024-12-31    — end date (ISO)
 *   ?export=csv       — stream CSV instead of JSON
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: dbUser } = await admin.from('users').select('role').eq('id', user.id).single()
  if (dbUser?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(req.url)
  const fromDate = url.searchParams.get('from')
  const toDate = url.searchParams.get('to')
  const exportMode = url.searchParams.get('export')
  const page = parseInt(url.searchParams.get('page') ?? '1')
  const pageSize = 50
  const offset = (page - 1) * pageSize

  // Build user list filter
  let userQuery = admin
    .from('founder_user_list')
    .select('*')
    .range(offset, offset + pageSize - 1)
    .order('created_at', { ascending: false })

  if (fromDate) userQuery = userQuery.gte('created_at', fromDate)
  if (toDate) userQuery = userQuery.lte('created_at', toDate + 'T23:59:59')

  const [kpis, signupsDaily, jobsDaily, revenueDaily, users] = await Promise.all([
    admin.from('founder_kpis').select('*').single(),
    admin.from('founder_signups_daily').select('*'),
    admin.from('founder_jobs_daily').select('*'),
    admin.from('founder_revenue_daily').select('*'),
    userQuery,
  ])

  // CSV export
  if (exportMode === 'csv' && users.data) {
    const rows = users.data
    const headers = Object.keys(rows[0] ?? {})
    const csvLines = [
      headers.join(','),
      ...rows.map(row =>
        headers.map(h => {
          const v = (row as Record<string, unknown>)[h]
          const s = v == null ? '' : String(v)
          return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
        }).join(',')
      ),
    ]
    return new NextResponse(csvLines.join('\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="agentqa-users-${new Date().toISOString().slice(0,10)}.csv"`,
      },
    })
  }

  return NextResponse.json({
    kpis: kpis.data,
    signupsDaily: signupsDaily.data ?? [],
    jobsDaily: jobsDaily.data ?? [],
    revenueDaily: revenueDaily.data ?? [],
    users: users.data ?? [],
    page,
    pageSize,
    fetchedAt: new Date().toISOString(),
  })
}
