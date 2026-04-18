import { createClient } from '@/lib/supabase/server'
import { computeROI, fmt$, fmtRate } from '@/lib/roi'
import Link from 'next/link'
import { Suspense } from 'react'
import OnboardingChecklist from './OnboardingChecklist'
import FinancialDisclaimer from '@/components/FinancialDisclaimer'
import { captureServerEvent } from '@/lib/posthog/server'
import { getCachedDashboardData } from '@/lib/cache/dashboard'

function StatCard({ label, value, sub, color = 'blue' }: {
  label: string; value: string; sub?: string; color?: string
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100',
    green: 'bg-green-50 border-green-100',
    purple: 'bg-purple-50 border-purple-100',
    orange: 'bg-orange-50 border-orange-100',
    red: 'bg-red-50 border-red-100',
    gray: 'bg-gray-50 border-gray-100',
  }
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color] ?? colorMap.blue}`}>
      <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900 leading-tight">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fire activation funnel: onboarding_started (first dashboard visit)
  captureServerEvent(user.id, 'onboarding_started', {
    funnel: 'activation',
    funnel_step: 5,
  }).catch(() => {})

  const days = 30  // reduced from 90 — 30 days is the core use-case
  // ─── Cached data fetch (30s TTL, private per-user) ─────────────────────
  const cached = await getCachedDashboardData(user.id, days)
  const { streams, transactions, timeEntries, acquisitionCosts, goals } = {
    streams: cached.streams,
    transactions: cached.transactions,
    timeEntries: cached.timeEntries,
    acquisitionCosts: cached.acquisitionCosts,
    goals: cached.goals,
  }
  const from = cached.from
  const to = cached.to
  const fromDate = new Date(from)

  const roi = computeROI(
    streams ?? [],
    transactions ?? [],
    timeEntries ?? [],
    acquisitionCosts ?? [],
    { from, to }
  )

  const agg = roi.aggregate
  const hasData = roi.streams.length > 0 || (transactions?.length ?? 0) > 0

  // Fire activation funnel events based on data state
  if (hasData) {
    captureServerEvent(user.id, 'roi_viewed', {
      funnel: 'activation',
      funnel_step: 8,
      stream_count: roi.streams.length,
      has_data: true,
    }).catch(() => {})
    // activation_complete = has imported data AND viewed ROI
    captureServerEvent(user.id, 'activation_complete', {
      funnel: 'activation',
      funnel_step: 10,
      stream_count: roi.streams.length,
    }).catch(() => {})
  }

  // ─── Onboarding progress (from cache) ─────────────────────────────────
  const obFlags = cached.onboardingFlags
  const obProgress = {
    has_streams_2: cached.streamCount >= 2,
    has_import: cached.txCount >= 1,
    has_timer: cached.teCount >= 1,
    has_viewed_heatmap: obFlags.has_viewed_heatmap ?? false,
    has_viewed_roi: obFlags.has_viewed_roi ?? false,
  }
  const obCompleted = Object.values(obProgress).filter(Boolean).length
  const obTotal = Object.keys(obProgress).length
  const demoCheck = cached.demoDataExists ? [{ id: 'demo' }] : []

  // Monthly pacing
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthlyTx = (transactions ?? []).filter(t => t.transaction_date >= monthStart.toISOString().split('T')[0])
  const monthlyNet = monthlyTx.reduce((s, t) => s + t.net_amount, 0)
  const monthlyTarget = goals?.monthly_target ?? 0
  const pacePercent = monthlyTarget > 0 ? Math.min((monthlyNet / monthlyTarget) * 100, 100) : null

  // Day of month progress
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const timePercent = (dayOfMonth / daysInMonth) * 100

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ROI Dashboard</h1>
          <p className="text-sm text-gray-400">Last {days} days · {from} → {to}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/import" className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Import data
          </Link>
          <Link href="/timer" className="text-sm border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50">
            Timer
          </Link>
        </div>
      </div>

      {/* Onboarding checklist */}
      <OnboardingChecklist
        progress={obProgress}
        completed={obCompleted}
        total={obTotal}
        percentage={Math.round((obCompleted / obTotal) * 100)}
        isDone={obCompleted === obTotal}
        hasDemoData={(demoCheck?.length ?? 0) > 0}
      />

      {!hasData && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6 text-center">
          <div className="text-3xl mb-2">📊</div>
          <h2 className="font-semibold text-gray-800 mb-1">No data yet</h2>
          <p className="text-sm text-gray-500 mb-4">Import a CSV or start tracking time to see your ROI metrics.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/import" className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700">
              Import income data
            </Link>
            <Link href="/timer" className="border border-gray-300 px-5 py-2.5 rounded-lg text-sm hover:bg-gray-50">
              Log time
            </Link>
          </div>
        </div>
      )}

      {/* Monthly goal pacing */}
      {pacePercent !== null && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Monthly goal pacing</span>
            <span className="text-sm font-bold text-gray-900">
              {fmt$(monthlyNet)} / {fmt$(monthlyTarget)}
            </span>
          </div>
          <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="absolute h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${pacePercent}%` }} />
            {/* Time cursor */}
            <div className="absolute h-full w-0.5 bg-gray-400 opacity-50"
              style={{ left: `${timePercent}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{pacePercent.toFixed(0)}% earned</span>
            <span>{timePercent.toFixed(0)}% through month</span>
          </div>
        </div>
      )}

      {/* Aggregate stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Net Revenue" value={fmt$(agg.netRevenue)}
          sub={`${fmt$(agg.grossRevenue)} gross`} color="green" />
        <StatCard label="True Hourly Rate" value={agg.trueHourlyRate > 0 ? fmtRate(agg.trueHourlyRate) : '—'}
          sub={`${agg.totalHours.toFixed(1)}h logged`} color="blue" />
        <StatCard label="Billable Rate" value={agg.billableHourlyRate > 0 ? fmtRate(agg.billableHourlyRate) : '—'}
          sub={`${agg.billableHours.toFixed(1)}h billable`} color="purple" />
        <StatCard label="Effective Rate" value={agg.effectiveHourlyRate > 0 ? fmtRate(agg.effectiveHourlyRate) : '—'}
          sub={`after ${fmt$(agg.acquisitionCosts)} acq costs`} color="orange" />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Platform Fees" value={fmt$(agg.platformFees)}
          sub={agg.grossRevenue > 0 ? `${((agg.platformFees / agg.grossRevenue) * 100).toFixed(1)}% of gross` : ''}
          color="gray" />
        <StatCard label="Acquisition Costs" value={fmt$(agg.acquisitionCosts)} color="red" />
        <StatCard label="Net After All Costs" value={fmt$(agg.netAfterAllCosts)}
          sub={agg.netRevenue > 0 ? `${(((agg.netAfterAllCosts) / agg.netRevenue) * 100).toFixed(1)}% retained` : ''}
          color="green" />
      </div>

      {/* Per-stream breakdown */}
      {roi.streams.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 mb-5">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-gray-800">Per-stream breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Stream</th>
                  <th className="px-4 py-3 text-right">Net Revenue</th>
                  <th className="px-4 py-3 text-right">True $/hr</th>
                  <th className="px-4 py-3 text-right">Billable $/hr</th>
                  <th className="px-4 py-3 text-right">Hours</th>
                  <th className="px-4 py-3 text-right">Acq Cost</th>
                  <th className="px-4 py-3 text-right">Acq ROI</th>
                </tr>
              </thead>
              <tbody>
                {roi.streams.map(s => (
                  <tr key={s.streamId} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: s.color || '#6b7280' }} />
                        <span className="font-medium text-gray-800 text-sm">{s.name}</span>
                        {s.platform && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{s.platform}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt$(s.netRevenue)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${s.trueHourlyRate > 0 ? 'text-blue-700' : 'text-gray-400'}`}>
                        {s.trueHourlyRate > 0 ? fmtRate(s.trueHourlyRate) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {s.billableHourlyRate > 0 ? fmtRate(s.billableHourlyRate) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500">
                      {s.totalHours > 0 ? `${s.totalHours.toFixed(1)}h` : '—'}
                      {s.billableHours > 0 && s.billableHours !== s.totalHours && (
                        <span className="text-gray-400"> ({s.billableHours.toFixed(1)}b)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500">
                      {s.acquisitionCosts > 0 ? fmt$(s.acquisitionCosts) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {s.acquisitionCosts > 0 ? (
                        <span className={s.acquisitionROI >= 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                          {s.acquisitionROI >= 0 ? '+' : ''}{s.acquisitionROI.toFixed(0)}%
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Acquisition by source */}
      {roi.acquisitionBySource.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 mb-5">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Acquisition ROI by source</h2>
            <Link href="/roi/costs" className="text-xs text-blue-600 hover:underline">Add cost →</Link>
          </div>
          <div className="p-4 space-y-3">
            {roi.acquisitionBySource.map(src => (
              <div key={src.channel} className="flex items-center gap-4">
                <div className="w-24 text-sm font-medium text-gray-700 capitalize">{src.channel}</div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">{fmt$(src.totalSpend)} spend</span>
                    <span className={src.roi >= 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                      {src.roi >= 0 ? '+' : ''}{src.roi.toFixed(0)}% ROI · {src.roas.toFixed(1)}x ROAS
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${src.roi >= 0 ? 'bg-green-500' : 'bg-red-400'}`}
                      style={{ width: `${Math.min(Math.abs(src.roi) / 200 * 100, 100)}%` }} />
                  </div>
                </div>
                <div className="text-sm text-gray-600 w-20 text-right">{fmt$(src.linkedRevenue)} rev</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/heatmap" className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
          <div className="text-2xl mb-1">🗺️</div>
          <div className="font-medium text-gray-800 text-sm">Earnings Heatmap</div>
          <div className="text-xs text-gray-400">Best times to work</div>
        </Link>
        <Link href="/pricing" className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
          <div className="text-2xl mb-1">💡</div>
          <div className="font-medium text-gray-800 text-sm">Pricing Optimizer</div>
          <div className="text-xs text-gray-400">Target rate calculator</div>
        </Link>
      </div>

      <FinancialDisclaimer compact />
    </div>
  )
}
