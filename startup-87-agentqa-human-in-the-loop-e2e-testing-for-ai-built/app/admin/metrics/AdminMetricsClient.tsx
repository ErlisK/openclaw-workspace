'use client'
import Link from 'next/link'

interface DailySignup { day: string; signups: number }
interface DailyJob { day: string; jobs: number; completed: number }
interface DailyRevenue { day: string; revenue_cents: number; purchases: number }
interface ReferralEvent { id: string; triggered_by: string; created_at: string }

interface Metrics {
  total_users: number
  total_jobs: number
  completed_jobs: number
  active_jobs: number
  total_revenue_cents: number
  total_referral_codes: number
  total_referral_uses: number
  jobs_last_7d: number
  signups_last_7d: number
}

interface Props {
  metrics: Metrics | null
  dailySignups: DailySignup[]
  dailyJobs: DailyJob[]
  dailyRevenue: DailyRevenue[]
  recentReferrals: ReferralEvent[]
}

function fmt(n: number) {
  return new Intl.NumberFormat().format(n)
}

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function MiniBarChart({ data, valueKey, color = 'indigo' }: {
  data: Record<string, any>[]
  valueKey: string
  color?: string
}) {
  if (!data.length) return <div className="text-xs text-gray-400 py-4 text-center">No data yet</div>
  const maxVal = Math.max(...data.map(d => Number(d[valueKey]) || 0), 1)
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
  }
  const barColor = colorMap[color] ?? 'bg-indigo-500'

  return (
    <div className="flex items-end gap-0.5 h-16 w-full" data-testid="mini-chart">
      {data.slice(0, 30).reverse().map((d, i) => {
        const val = Number(d[valueKey]) || 0
        const pct = (val / maxVal) * 100
        return (
          <div
            key={i}
            className={`flex-1 rounded-t-sm ${barColor} opacity-80 hover:opacity-100 transition-opacity`}
            style={{ height: `${Math.max(pct, 4)}%` }}
            title={`${d.day}: ${val}`}
          />
        )
      })}
    </div>
  )
}

export default function AdminMetricsClient({ metrics, dailySignups, dailyJobs, dailyRevenue, recentReferrals }: Props) {
  const m = metrics ?? {} as Metrics

  const statCards = [
    { label: 'Total users', value: fmt(m.total_users ?? 0), sub: `+${m.signups_last_7d ?? 0} this week`, color: 'indigo' },
    { label: 'Total jobs', value: fmt(m.total_jobs ?? 0), sub: `${m.active_jobs ?? 0} active · ${m.completed_jobs ?? 0} completed`, color: 'blue' },
    { label: 'Jobs this week', value: fmt(m.jobs_last_7d ?? 0), sub: 'last 7 days', color: 'green' },
    { label: 'Revenue (all time)', value: formatMoney(m.total_revenue_cents ?? 0), sub: 'credit pack purchases', color: 'purple' },
    { label: 'Referral codes', value: fmt(m.total_referral_codes ?? 0), sub: `${m.total_referral_uses ?? 0} total uses`, color: 'pink' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-sm text-gray-500 hover:text-indigo-600">← Admin</Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-lg font-bold text-gray-900">Metrics Dashboard</h1>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/credits" className="text-sm text-gray-500 hover:text-indigo-600">Credits</Link>
          <Link href="/admin/feedback" className="text-sm text-gray-500 hover:text-indigo-600">Feedback</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8" data-testid="admin-metrics-page">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {statCards.map(({ label, value, sub, color }) => {
            const colorMap: Record<string, string> = {
              indigo: 'border-indigo-200 bg-indigo-50',
              blue: 'border-blue-200 bg-blue-50',
              green: 'border-green-200 bg-green-50',
              purple: 'border-purple-200 bg-purple-50',
              pink: 'border-pink-200 bg-pink-50',
            }
            const textMap: Record<string, string> = {
              indigo: 'text-indigo-700',
              blue: 'text-blue-700',
              green: 'text-green-700',
              purple: 'text-purple-700',
              pink: 'text-pink-700',
            }
            return (
              <div key={label} className={`border rounded-xl p-4 ${colorMap[color]}`}
                data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="text-xs text-gray-500 mb-1">{label}</div>
                <div className={`text-2xl font-bold ${textMap[color]}`}>{value}</div>
                <div className="text-xs text-gray-400 mt-1">{sub}</div>
              </div>
            )
          })}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Signups chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">Daily signups (30d)</h3>
            <MiniBarChart data={dailySignups} valueKey="signups" color="indigo" />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{dailySignups.at(-1)?.day ?? ''}</span>
              <span>{dailySignups.at(0)?.day ?? ''}</span>
            </div>
          </div>

          {/* Jobs chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">Daily jobs (30d)</h3>
            <MiniBarChart data={dailyJobs} valueKey="jobs" color="green" />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{dailyJobs.at(-1)?.day ?? ''}</span>
              <span>{dailyJobs.at(0)?.day ?? ''}</span>
            </div>
          </div>

          {/* Revenue chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">Daily revenue (30d)</h3>
            <MiniBarChart data={dailyRevenue} valueKey="revenue_cents" color="purple" />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{dailyRevenue.at(-1)?.day ?? ''}</span>
              <span>{dailyRevenue.at(0)?.day ?? ''}</span>
            </div>
          </div>
        </div>

        {/* Data tables */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Daily jobs table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm">Jobs by day</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="jobs-table">
                <thead><tr className="bg-gray-50">
                  <th className="text-left px-4 py-2 text-xs text-gray-500">Day</th>
                  <th className="text-right px-4 py-2 text-xs text-gray-500">Total</th>
                  <th className="text-right px-4 py-2 text-xs text-gray-500">Completed</th>
                </tr></thead>
                <tbody>
                  {dailyJobs.slice(0, 10).map(row => (
                    <tr key={row.day} className="border-t border-gray-50">
                      <td className="px-4 py-2 text-gray-700">{row.day}</td>
                      <td className="px-4 py-2 text-right text-gray-700">{row.jobs}</td>
                      <td className="px-4 py-2 text-right text-green-600">{row.completed}</td>
                    </tr>
                  ))}
                  {dailyJobs.length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400 text-xs">No data yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Referrals table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 text-sm">Recent referral events</h3>
              <span className="text-xs text-gray-400">{recentReferrals.length} total shown</span>
            </div>
            <div className="divide-y divide-gray-50" data-testid="referrals-list">
              {recentReferrals.length === 0 ? (
                <div className="px-5 py-6 text-center text-gray-400 text-xs">No referrals yet</div>
              ) : recentReferrals.map(r => (
                <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      {r.triggered_by}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mt-6">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 text-sm">Revenue by day</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="revenue-table">
              <thead><tr className="bg-gray-50">
                <th className="text-left px-4 py-2 text-xs text-gray-500">Day</th>
                <th className="text-right px-4 py-2 text-xs text-gray-500">Revenue</th>
                <th className="text-right px-4 py-2 text-xs text-gray-500">Purchases</th>
              </tr></thead>
              <tbody>
                {dailyRevenue.slice(0, 10).map(row => (
                  <tr key={row.day} className="border-t border-gray-50">
                    <td className="px-4 py-2 text-gray-700">{row.day}</td>
                    <td className="px-4 py-2 text-right text-purple-700 font-medium">{formatMoney(row.revenue_cents)}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{row.purchases}</td>
                  </tr>
                ))}
                {dailyRevenue.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400 text-xs">No revenue yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
