'use client'
/**
 * /admin/growth — Phase 7 Growth Dashboard
 *
 * Success criteria:
 *   - Paid conversion ≥8% of activated families
 *   - Month-2 repeat creation ≥25% of paid families
 *   - Parent NPS ≥4.5/5 (emoji scale, n≥50)
 *
 * Tabs: Overview · NPS · Funnel · Retention
 */
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type Tab = 'overview' | 'nps' | 'funnel' | 'retention'

interface Summary {
  period:  { days: number }
  metrics: {
    totalSessions:   number
    activationRate:  number
    exportRate:      number
    paidConversions: number
    conversionRate:  number
    referralConverts: number
    shareClicks:     number
  }
  nps: {
    count:       number
    avg:         number | null
    npsScore:    number | null
    promoters:   number
    detractors:  number
    distribution: Array<{ score: number; emoji: string; count: number; pct: number }>
    target:      number
    onTarget:    boolean
    sampleSufficient: boolean
  }
}

function MetricCard({ label, value, sub, target, status = 'neutral' }: {
  label: string; value: string | number; sub?: string; target?: string; status?: 'good' | 'warn' | 'bad' | 'neutral'
}) {
  const bg = status === 'good' ? 'border-green-200 bg-green-50' :
             status === 'warn' ? 'border-amber-200 bg-amber-50' :
             status === 'bad'  ? 'border-red-200 bg-red-50' :
             'border-gray-100 bg-white'
  const vc = status === 'good' ? 'text-green-700' :
             status === 'warn' ? 'text-amber-700' :
             status === 'bad'  ? 'text-red-600' : 'text-gray-900'
  return (
    <div className={`rounded-2xl border shadow-sm p-5 ${bg}`}>
      <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-extrabold ${vc}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      {target && (
        <p className={`text-xs mt-1.5 font-semibold ${status === 'good' ? 'text-green-600' : 'text-gray-500'}`}>
          Target: {target} {status === 'good' ? '✅' : ''}
        </p>
      )}
    </div>
  )
}

export default function GrowthDashboard() {
  const [tab,  setTab]  = useState<Tab>('overview')
  const [days, setDays] = useState(14)
  const [summary, setSummary]   = useState<Summary | null>(null)
  const [npsData, setNpsData]   = useState<{ ratings: Array<Record<string, unknown>>; timeSeries: Array<{ date: string; avg: number; count: number }>; total: number } | null>(null)
  const [funnel,  setFunnel]    = useState<{ funnel: Array<{ step: string; count: number }> } | null>(null)
  const [retention, setRetention] = useState<{ retention: { paidFamilies: number; repeatCreators: number; repeatRate: number; target: number; onTarget: boolean } } | null>(null)
  const [loading, setLoading]   = useState(false)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/growth?view=summary&days=${days}`)
      setSummary(await r.json() as Summary)
    } finally { setLoading(false) }
  }, [days])

  useEffect(() => { void fetchSummary() }, [fetchSummary])

  async function loadNps() {
    const r = await fetch(`/api/admin/growth?view=nps&days=${days}`)
    setNpsData(await r.json() as typeof npsData)
  }

  async function loadFunnel() {
    const r = await fetch(`/api/admin/growth?view=activation&days=${days}`)
    setFunnel(await r.json() as typeof funnel)
  }

  async function loadRetention() {
    const r = await fetch(`/api/admin/growth?view=retention&days=${days}`)
    setRetention(await r.json() as typeof retention)
  }

  async function handleTab(t: Tab) {
    setTab(t)
    if (t === 'nps')       await loadNps()
    if (t === 'funnel')    await loadFunnel()
    if (t === 'retention') await loadRetention()
  }

  const m   = summary?.metrics
  const nps = summary?.nps

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/admin" className="text-sm text-violet-600 hover:underline">← Admin</Link>
            <h1 className="text-2xl font-extrabold text-gray-900 mt-1">Phase 7 Growth Dashboard</h1>
            <p className="text-sm text-gray-500">Organic acquisition · Conversion · Retention · NPS</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={days} onChange={e => setDays(Number(e.target.value))}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm">
              {[7, 14, 30, 60].map(d => <option key={d} value={d}>Last {d} days</option>)}
            </select>
            <button onClick={() => void fetchSummary()}
              className="bg-violet-600 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-violet-700">
              {loading ? '…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Phase 7 OKR Status Banner */}
        {summary && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
            <p className="font-bold text-gray-800 mb-3 text-sm">Phase 7 Success Criteria ({days}d window)</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: 'Paid conversion ≥8%',
                  value: `${m?.conversionRate ?? 0}%`,
                  on: (m?.conversionRate ?? 0) >= 8,
                  detail: `${m?.paidConversions ?? 0} paid / ${m?.totalSessions ?? 0} sessions`,
                },
                {
                  label: 'Repeat creation ≥25%',
                  value: retention ? `${retention.retention.repeatRate}%` : '—',
                  on: retention ? retention.retention.onTarget : false,
                  detail: 'Month-2 paid families',
                },
                {
                  label: 'NPS ≥4.5/5 (n≥50)',
                  value: nps?.avg ? `${nps.avg}/5` : '—',
                  on:    nps?.onTarget && nps.sampleSufficient,
                  detail: `n=${nps?.count ?? 0} ratings`,
                },
              ].map(k => (
                <div key={k.label} className={`rounded-xl p-3 text-center ${
                  k.on ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                }`}>
                  <p className={`text-2xl font-extrabold mb-0.5 ${k.on ? 'text-green-700' : 'text-gray-700'}`}>
                    {k.on ? '✅' : '🔜'} {k.value}
                  </p>
                  <p className="text-xs font-semibold text-gray-700">{k.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{k.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-100 rounded-2xl p-1 mb-6 shadow-sm w-fit">
          {(['overview', 'nps', 'funnel', 'retention'] as Tab[]).map(t => (
            <button key={t} onClick={() => void handleTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors capitalize ${
                tab === t ? 'bg-violet-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {/* ── Overview ─────────────────────────────────────────────────────── */}
        {tab === 'overview' && m && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MetricCard label="Total sessions"    value={m.totalSessions}   sub={`Last ${days} days`} />
              <MetricCard label="Activation rate"   value={`${m.activationRate}%`}
                sub="Reached export step" target="≥40%"
                status={m.activationRate >= 40 ? 'good' : m.activationRate >= 20 ? 'warn' : 'bad'} />
              <MetricCard label="Paid conversions"  value={m.paidConversions}
                sub={`${m.conversionRate}% of activated`} target="≥8%"
                status={m.conversionRate >= 8 ? 'good' : m.conversionRate >= 4 ? 'warn' : 'bad'} />
              <MetricCard label="NPS (emoji)"       value={nps?.avg ? `${nps.avg}/5` : '—'}
                sub={`n=${nps?.count ?? 0} ratings`} target="≥4.5 (n≥50)"
                status={nps?.onTarget && nps.sampleSufficient ? 'good' : nps?.count ?? 0 < 10 ? 'neutral' : 'warn'} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <MetricCard label="Export rate"       value={`${m.exportRate}%`}  sub="Sessions that reached PDF export" />
              <MetricCard label="Referral converts" value={m.referralConverts}  sub="Successful referral conversions" />
              <MetricCard label="Share clicks"      value={m.shareClicks}       sub="Share link copy/click events" />
            </div>

            {/* NPS distribution */}
            {nps && nps.count > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800">NPS Distribution ({nps.count} ratings)</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">Avg: <strong>{nps.avg}</strong>/5</span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      nps.onTarget ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {nps.onTarget ? '✅ On target' : `${nps.avg ?? '—'}/5 (target 4.5+)`}
                    </span>
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  {nps.distribution.map(d => (
                    <div key={d.score} className="flex-1 text-center">
                      <div className="relative h-20 bg-gray-50 rounded-xl overflow-hidden mb-2">
                        <div
                          className={`absolute bottom-0 left-0 right-0 rounded-xl transition-all ${
                            d.score >= 4 ? 'bg-green-400' : d.score === 3 ? 'bg-amber-300' : 'bg-red-300'
                          }`}
                          style={{ height: `${Math.max(4, d.pct)}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
                          {d.pct > 0 ? `${d.pct}%` : ''}
                        </span>
                      </div>
                      <span className="text-xl">{d.emoji}</span>
                      <p className="text-xs text-gray-400 mt-0.5">{d.count}</p>
                    </div>
                  ))}
                </div>
                {!nps.sampleSufficient && (
                  <p className="text-xs text-amber-600 mt-3 text-center">
                    ⚠️ Need {50 - nps.count} more ratings to reach n=50 statistical target
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── NPS Detail ───────────────────────────────────────────────────── */}
        {tab === 'nps' && (
          <div className="space-y-4">
            {!npsData
              ? <p className="text-sm text-gray-400">Loading…</p>
              : (
                <>
                  {/* Time series */}
                  {npsData.timeSeries.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <h3 className="font-bold text-gray-800 mb-4">Daily NPS trend</h3>
                      <div className="flex items-end gap-1 h-24">
                        {npsData.timeSeries.map(d => (
                          <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-xs text-gray-500">{d.avg}</span>
                            <div
                              className={`w-full rounded-t ${d.avg >= 4.5 ? 'bg-green-400' : d.avg >= 3.5 ? 'bg-amber-300' : 'bg-red-300'}`}
                              style={{ height: `${Math.round((d.avg / 5) * 60)}px` }}
                            />
                            <span className="text-xs text-gray-300 rotate-45 origin-left">{d.date.slice(5)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent comments */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-gray-800 mb-3">Recent ratings ({npsData.total})</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {npsData.ratings.slice(0, 50).map((r, i) => {
                        const emojis = ['😢', '😕', '😐', '😊', '🤩']
                        const score  = Number(r.answer)
                        const comment = (r.properties as Record<string, unknown>)?.comment
                        return (
                          <div key={i} className="flex items-start gap-3 text-sm border-b border-gray-50 pb-2">
                            <span className="text-xl shrink-0">{emojis[score - 1] ?? '?'}</span>
                            <div className="flex-1 min-w-0">
                              {comment && <p className="text-gray-600 italic">&ldquo;{String(comment)}&rdquo;</p>}
                              <p className="text-xs text-gray-400">{new Date(r.createdAt as string).toLocaleDateString()}</p>
                            </div>
                          </div>
                        )
                      })}
                      {npsData.total === 0 && (
                        <p className="text-sm text-gray-400">No ratings yet — NPS widget triggers after book completion.</p>
                      )}
                    </div>
                  </div>
                </>
              )}
          </div>
        )}

        {/* ── Funnel ───────────────────────────────────────────────────────── */}
        {tab === 'funnel' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-4">Activation funnel ({days}d)</h3>
            {!funnel
              ? <p className="text-sm text-gray-400">Loading…</p>
              : funnel.funnel.map((step, i) => {
                const prev  = i > 0 ? funnel.funnel[i - 1].count : step.count
                const drop  = prev > 0 ? Math.round(((prev - step.count) / prev) * 100) : 0
                const width = funnel.funnel[0].count > 0 ? Math.round((step.count / funnel.funnel[0].count) * 100) : 0
                return (
                  <div key={step.step} className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600 font-mono text-xs">{step.step}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-900">{step.count.toLocaleString()}</span>
                        {i > 0 && drop > 0 && <span className="text-xs text-red-400">-{drop}%</span>}
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div className="h-3 bg-violet-500 rounded-full" style={{ width: `${width}%` }}/>
                    </div>
                  </div>
                )
              })}
          </div>
        )}

        {/* ── Retention ────────────────────────────────────────────────────── */}
        {tab === 'retention' && (
          <div className="space-y-4">
            {!retention
              ? <p className="text-sm text-gray-400">Loading…</p>
              : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-bold text-gray-800 mb-4">Repeat creation (paid families)</h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-3xl font-extrabold text-gray-900">{retention.retention.paidFamilies}</p>
                      <p className="text-xs text-gray-500">Paid families total</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-extrabold text-gray-900">{retention.retention.repeatCreators}</p>
                      <p className="text-xs text-gray-500">Created 2+ books</p>
                    </div>
                    <div className={`text-center rounded-xl p-2 ${retention.retention.onTarget ? 'bg-green-50' : 'bg-amber-50'}`}>
                      <p className={`text-3xl font-extrabold ${retention.retention.onTarget ? 'text-green-700' : 'text-amber-700'}`}>
                        {retention.retention.repeatRate}%
                      </p>
                      <p className="text-xs text-gray-500">Repeat rate (target ≥25%)</p>
                    </div>
                  </div>
                  {retention.retention.paidFamilies === 0 && (
                    <p className="text-sm text-amber-600">No paid families yet — this metric activates after first paid conversions.</p>
                  )}
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  )
}
