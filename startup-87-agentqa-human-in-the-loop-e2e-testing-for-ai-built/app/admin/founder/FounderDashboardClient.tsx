'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface KPIs {
  total_users: number
  signups_7d: number
  signups_30d: number
  total_jobs: number
  jobs_7d: number
  completed_jobs: number
  total_sessions: number
  revenue_all_cents: number
  revenue_30d_cents: number
  revenue_7d_cents: number
  paying_users: number
  referral_conversions: number
}

interface DailySignup { day: string; signups: number; referred_signups: number }
interface DailyJob { day: string; jobs_created: number; published: number; completed: number; abandoned: number }
interface DailyRevenue { day: string; revenue_cents: number; purchases: number; unique_buyers: number }
interface UserRow {
  id: string
  email: string
  role: string
  credits_balance: number
  created_at: string
  referred_by_code: string | null
  jobs_created: number
  sessions_run: number
  total_spent_cents: number
}

interface Props {
  kpis: KPIs | null
  signupsDaily: DailySignup[]
  jobsDaily: DailyJob[]
  revenueDaily: DailyRevenue[]
  users: UserRow[]
  from: string
  to: string
  page: number
  pageSize: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function money(cents: number) { return `$${(cents / 100).toFixed(2)}` }
function fmt(n: number) { return new Intl.NumberFormat().format(n ?? 0) }
function pct(a: number, b: number) { return b === 0 ? '—' : `${((a / b) * 100).toFixed(1)}%` }

function SparkBar({ data, valueKey, color = 'indigo' }: {
  data: Record<string, unknown>[]
  valueKey: string
  color?: string
}) {
  if (!data.length) return <div className="text-xs text-gray-400 py-4 text-center">No data</div>
  const vals = data.map(d => Number(d[valueKey]) || 0)
  const max = Math.max(...vals, 1)
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
    orange: 'bg-orange-400',
  }
  return (
    <div className="flex items-end gap-px h-14 w-full" data-testid="spark-chart">
      {data.map((d, i) => {
        const v = Number(d[valueKey]) || 0
        return (
          <div
            key={i}
            className={`flex-1 rounded-t-sm ${colors[color] ?? 'bg-indigo-500'} opacity-80`}
            style={{ height: `${Math.max((v / max) * 100, 3)}%` }}
            title={`${d.day}: ${v}`}
          />
        )
      })}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FounderDashboardClient({ kpis, signupsDaily, jobsDaily, revenueDaily, users, from, to, page, pageSize }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [fromVal, setFromVal] = useState(from)
  const [toVal, setToVal] = useState(to)
  const [tab, setTab] = useState<'overview' | 'jobs' | 'revenue' | 'users'>('overview')
  const m = kpis ?? {} as KPIs

  function applyFilter() {
    const params = new URLSearchParams()
    if (fromVal) params.set('from', fromVal)
    if (toVal) params.set('to', toVal)
    router.push(`${pathname}?${params.toString()}`)
  }

  function exportCSV() {
    const params = new URLSearchParams()
    if (fromVal) params.set('from', fromVal)
    if (toVal) params.set('to', toVal)
    params.set('export', 'csv')
    window.open(`/api/admin/founder?${params.toString()}`, '_blank')
  }

  const topStatCards = [
    { label: 'Total users', value: fmt(m.total_users), sub: `+${fmt(m.signups_7d)} this week`, color: 'indigo', testid: 'stat-users' },
    { label: 'Paying users', value: fmt(m.paying_users), sub: `${pct(m.paying_users, m.total_users)} conversion`, color: 'green', testid: 'stat-paying' },
    { label: 'Revenue (all time)', value: money(m.revenue_all_cents ?? 0), sub: `${money(m.revenue_30d_cents ?? 0)} last 30d`, color: 'purple', testid: 'stat-revenue' },
    { label: 'Revenue (7d)', value: money(m.revenue_7d_cents ?? 0), sub: 'last 7 days', color: 'blue', testid: 'stat-revenue-7d' },
    { label: 'Total jobs', value: fmt(m.total_jobs), sub: `${fmt(m.jobs_7d)} this week`, color: 'orange', testid: 'stat-jobs' },
    { label: 'Completed jobs', value: fmt(m.completed_jobs), sub: `${pct(m.completed_jobs, m.total_jobs)} completion`, color: 'green', testid: 'stat-completed' },
    { label: 'Total sessions', value: fmt(m.total_sessions), sub: 'tester sessions', color: 'blue', testid: 'stat-sessions' },
    { label: 'Referral conversions', value: fmt(m.referral_conversions), sub: 'via invite codes', color: 'pink', testid: 'stat-referrals' },
  ]

  const colorBg: Record<string, string> = {
    indigo: 'border-indigo-100 bg-indigo-50',
    green: 'border-green-100 bg-green-50',
    purple: 'border-purple-100 bg-purple-50',
    blue: 'border-blue-100 bg-blue-50',
    orange: 'border-orange-100 bg-orange-50',
    pink: 'border-pink-100 bg-pink-50',
  }
  const colorText: Record<string, string> = {
    indigo: 'text-indigo-700',
    green: 'text-green-700',
    purple: 'text-purple-700',
    blue: 'text-blue-700',
    orange: 'text-orange-700',
    pink: 'text-pink-700',
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="founder-dashboard">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-gray-500 hover:text-indigo-600">← Admin</Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-lg font-bold text-gray-900">Founder Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/metrics" className="text-sm text-gray-500 hover:text-indigo-600">Metrics</Link>
            <Link href="/admin/credits" className="text-sm text-gray-500 hover:text-indigo-600">Credits</Link>
            <button
              onClick={exportCSV}
              data-testid="export-csv-btn"
              className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 font-medium"
            >
              ↓ Export CSV
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Date filter */}
        <div className="flex items-center gap-3 mb-6 flex-wrap" data-testid="date-filter">
          <span className="text-sm font-medium text-gray-700">Filter by date:</span>
          <input
            type="date"
            value={fromVal}
            onChange={e => setFromVal(e.target.value)}
            data-testid="filter-from"
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={toVal}
            onChange={e => setToVal(e.target.value)}
            data-testid="filter-to"
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={applyFilter}
            data-testid="apply-filter-btn"
            className="text-sm bg-gray-800 text-white px-4 py-1.5 rounded-lg hover:bg-gray-900"
          >
            Apply
          </button>
          {(fromVal || toVal) && (
            <button
              onClick={() => { setFromVal(''); setToVal(''); router.push(pathname) }}
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              Clear
            </button>
          )}
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {topStatCards.map(({ label, value, sub, color, testid }) => (
            <div key={testid} className={`border rounded-xl p-4 ${colorBg[color]}`} data-testid={testid}>
              <div className="text-xs text-gray-500 mb-1">{label}</div>
              <div className={`text-2xl font-bold ${colorText[color]}`}>{value}</div>
              <div className="text-xs text-gray-400 mt-1">{sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
          {(['overview', 'jobs', 'revenue', 'users'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              data-testid={`tab-${t}`}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg capitalize transition-all ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-sm text-gray-800 mb-3">Daily signups (90d)</h3>
              <SparkBar data={signupsDaily} valueKey="signups" color="indigo" />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{signupsDaily.at(0)?.day ?? ''}</span>
                <span>{signupsDaily.at(-1)?.day ?? ''}</span>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                Referred signups: {fmt(signupsDaily.reduce((s, d) => s + Number(d.referred_signups), 0))}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-sm text-gray-800 mb-3">Daily revenue (90d)</h3>
              <SparkBar data={revenueDaily} valueKey="revenue_cents" color="purple" />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{revenueDaily.at(0)?.day ?? ''}</span>
                <span>{revenueDaily.at(-1)?.day ?? ''}</span>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                Total purchases: {fmt(revenueDaily.reduce((s, d) => s + Number(d.purchases), 0))}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-sm text-gray-800 mb-3">Daily jobs (90d)</h3>
              <SparkBar data={jobsDaily} valueKey="jobs_created" color="green" />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{jobsDaily.at(0)?.day ?? ''}</span>
                <span>{jobsDaily.at(-1)?.day ?? ''}</span>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                Completion rate: {pct(
                  jobsDaily.reduce((s, d) => s + Number(d.completed), 0),
                  jobsDaily.reduce((s, d) => s + Number(d.jobs_created), 0)
                )}
              </div>
            </div>
          </div>
        )}

        {/* Jobs tab */}
        {tab === 'jobs' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-sm text-gray-800">Jobs by day (90d)</h3>
            </div>
            <table className="w-full text-sm" data-testid="jobs-table">
              <thead><tr className="bg-gray-50">
                <th className="text-left px-4 py-2 text-xs text-gray-500">Day</th>
                <th className="text-right px-4 py-2 text-xs text-gray-500">Created</th>
                <th className="text-right px-4 py-2 text-xs text-gray-500">Published</th>
                <th className="text-right px-4 py-2 text-xs text-gray-500">Completed</th>
                <th className="text-right px-4 py-2 text-xs text-gray-500">Abandoned</th>
                <th className="text-right px-4 py-2 text-xs text-gray-500">Completion %</th>
              </tr></thead>
              <tbody>
                {jobsDaily.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-xs">No data</td></tr>
                ) : jobsDaily.slice().reverse().map(row => (
                  <tr key={row.day} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700">{row.day}</td>
                    <td className="px-4 py-2 text-right">{row.jobs_created}</td>
                    <td className="px-4 py-2 text-right text-blue-600">{row.published}</td>
                    <td className="px-4 py-2 text-right text-green-600">{row.completed}</td>
                    <td className="px-4 py-2 text-right text-red-500">{row.abandoned}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{pct(Number(row.completed), Number(row.jobs_created))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Revenue tab */}
        {tab === 'revenue' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-sm text-gray-800">Revenue by day (90d)</h3>
            </div>
            <table className="w-full text-sm" data-testid="revenue-table">
              <thead><tr className="bg-gray-50">
                <th className="text-left px-4 py-2 text-xs text-gray-500">Day</th>
                <th className="text-right px-4 py-2 text-xs text-gray-500">Revenue</th>
                <th className="text-right px-4 py-2 text-xs text-gray-500">Purchases</th>
                <th className="text-right px-4 py-2 text-xs text-gray-500">Unique buyers</th>
              </tr></thead>
              <tbody>
                {revenueDaily.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-xs">No revenue data</td></tr>
                ) : revenueDaily.slice().reverse().map(row => (
                  <tr key={row.day} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700">{row.day}</td>
                    <td className="px-4 py-2 text-right text-purple-700 font-medium">{money(Number(row.revenue_cents))}</td>
                    <td className="px-4 py-2 text-right">{row.purchases}</td>
                    <td className="px-4 py-2 text-right text-blue-600">{row.unique_buyers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Users tab */}
        {tab === 'users' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden" data-testid="users-table-wrapper">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-sm text-gray-800">Users</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{users.length} shown</span>
                <button
                  onClick={exportCSV}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Export CSV
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]" data-testid="users-table">
                <thead><tr className="bg-gray-50">
                  <th className="text-left px-4 py-2 text-xs text-gray-500">Email</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-500">Role</th>
                  <th className="text-right px-4 py-2 text-xs text-gray-500">Credits</th>
                  <th className="text-right px-4 py-2 text-xs text-gray-500">Jobs</th>
                  <th className="text-right px-4 py-2 text-xs text-gray-500">Sessions</th>
                  <th className="text-right px-4 py-2 text-xs text-gray-500">Spent</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-500">Ref code</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-500">Joined</th>
                </tr></thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-xs">No users found</td></tr>
                  ) : users.map(u => (
                    <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-800 max-w-[200px] truncate">{u.email}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          u.role === 'admin' ? 'bg-red-100 text-red-700' :
                          u.role === 'tester' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {u.role ?? 'client'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-gray-600">{u.credits_balance ?? 0}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{u.jobs_created ?? 0}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{u.sessions_run ?? 0}</td>
                      <td className="px-4 py-2 text-right text-purple-700 font-medium">{money(Number(u.total_spent_cents) || 0)}</td>
                      <td className="px-4 py-2 text-xs text-gray-400 font-mono">{u.referred_by_code ?? '—'}</td>
                      <td className="px-4 py-2 text-xs text-gray-400">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">Page {page}</span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={`?from=${fromVal}&to=${toVal}&page=${page - 1}`}
                    className="text-xs text-indigo-600 hover:underline">← Prev</Link>
                )}
                {users.length === pageSize && (
                  <Link href={`?from=${fromVal}&to=${toVal}&page=${page + 1}`}
                    className="text-xs text-indigo-600 hover:underline">Next →</Link>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
