'use client'
/**
 * /admin/cohorts
 *
 * Cohort analytics dashboard — D1/D7/D14 retention, activation funnel,
 * conversion pipeline, and unit economics.
 *
 * Tabs: Overview · Retention · Activation · Conversion · Unit Economics
 */
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type Tab = 'overview' | 'retention' | 'activation' | 'conversion' | 'unit_economics'

interface SummaryData {
  period:        { days: number }
  funnel:        { sessions: number; activated: number; activationRate: number; completed: number; completionRate: number; paywallReached: number; paywallRate: number; paid: number; overallConvRate: number; upsellShown: number; exported: number }
  timing:        { medianTtaMin: number | null; medianTtcMin: number | null }
  revenue:       { totalOrders: number; totalRevDollars: string; arpu: number; arppu: number }
  satisfaction:  { csatRate: number | null; csatN: number; npsAvg: number | null; npsN: number }
  okr:           { signups: { target: number; actual: number; pct: number; met: boolean }; conversion: { target: number; actual: number; met: boolean }; nps: { target: number; actual: number | null; met: boolean }; repeat: { target: number; met: boolean; note: string } }
}

interface RetentionRow {
  week: string; n: number; d1: number; d3: number; d7: number; d14: number; d30: number
}

interface RetentionData {
  cohorts: RetentionRow[]; overall: { d1: number; d3: number; d7: number; d14: number; d30: number }; totalSessions: number
}

interface FunnelStep {
  step: string; n: number; pct: number
}

interface ConversionData {
  funnel: FunnelStep[]
  rates: { landingToActivate: number; activateToComplete: number; completeToUpsell: number; upsellToClick: number; clickToPaid: number; overallConvRate: number }
  revenue: { paid: number; revDollars: string }
  daily: { date: string; sessions: number; upsell: number; payClick: number; paid: number; rev: number; convRate: number }[]
}

interface DailyRow {
  date: string; sessions: number; activated: number; completed: number; exported: number; paywall: number; paid: number; rev: number; activationRate: number; convRate: number; revDollars: string; avgSessions7d: number
}

interface UnitData {
  unit: { cac: { dollars: string; source: string }; avgOrderValue: { dollars: string }; ltv: { m1: string; m3: string; m12: string }; grossMarginPct: number; arpu: { dollars: string }; paybackDays: number }
  revenue: { totalOrders: number; totalRevDollars: string; mrr: number }
  satisfaction: { npsAvg: number | null; npsScore: number | null; npsN: number; csatRate: number | null; csatN: number; promoters: number; detractors: number; passives: number }
  costStructure: Record<string, string>
  assumptions: Record<string, string>
}

const COLORS = ['bg-violet-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500']



function retentionColor(pct: number) {
  if (pct >= 30) return 'bg-green-500 text-white'
  if (pct >= 15) return 'bg-green-300 text-green-900'
  if (pct >= 5)  return 'bg-yellow-200 text-yellow-900'
  if (pct > 0)   return 'bg-red-100 text-red-700'
  return 'bg-gray-50 text-gray-300'
}

export default function CohortsDashboard() {
  const [tab,      setTab]      = useState<Tab>('overview')
  const [days,     setDays]     = useState(30)
  const [summary,  setSummary]  = useState<SummaryData | null>(null)
  const [retention,setRetention]= useState<RetentionData | null>(null)
  const [conv,     setConv]     = useState<ConversionData | null>(null)
  const [daily,    setDaily]    = useState<DailyRow[] | null>(null)
  const [unit,     setUnit]     = useState<UnitData | null>(null)
  const [loading,  setLoading]  = useState(false)

  const load = useCallback(async (t: Tab) => {
    setLoading(true)
    try {
      const viewMap: Record<Tab, string> = {
        overview: 'summary', retention: 'retention',
        activation: 'activation', conversion: 'conversion',
        unit_economics: 'unit_economics',
      }
      const view = viewMap[t]
      const r = await fetch(`/api/admin/cohorts?view=${view}&days=${days}`)
      const data = await r.json()
      if (t === 'overview')        setSummary(data as SummaryData)
      else if (t === 'retention')  setRetention(data as RetentionData)
      else if (t === 'conversion') setConv(data as ConversionData)
      else if (t === 'unit_economics') setUnit(data as UnitData)
      // Also load daily for the sparklines
      if (t === 'overview' || t === 'activation') {
        const dr = await fetch(`/api/admin/cohorts?view=daily&days=${days}`)
        const dd = await dr.json() as { daily: DailyRow[] }
        setDaily(dd.daily)
      }
    } finally { setLoading(false) }
  }, [days])

  useEffect(() => { void load(tab) }, [load, tab])

  const handleTabChange = (t: Tab) => { setTab(t); void load(t) }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/admin" className="text-sm text-violet-600 hover:underline">← Admin</Link>
            <h1 className="text-2xl font-extrabold text-gray-900 mt-1">Cohort Analytics</h1>
            <p className="text-sm text-gray-500">D1/D7 retention · Activation · Conversion · Unit Economics</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={days} onChange={e => { setDays(Number(e.target.value)); void load(tab) }}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm bg-white">
              {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>Last {d}d</option>)}
            </select>
            <button onClick={() => void load(tab)}
              className="bg-violet-600 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-violet-700">
              {loading ? '…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* OKR Status Bar */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              {
                label: 'Signups',
                value: `${summary.okr.signups.actual} / ${summary.okr.signups.target}`,
                sub: `${summary.okr.signups.pct}% of target`,
                met: summary.okr.signups.met,
                color: summary.okr.signups.pct >= 50 ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50',
              },
              {
                label: 'Conversion',
                value: `${summary.okr.conversion.actual}%`,
                sub: `Target: ≥${summary.okr.conversion.target}%`,
                met: summary.okr.conversion.met,
                color: summary.okr.conversion.met ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50',
              },
              {
                label: 'NPS',
                value: summary.okr.nps.actual !== null ? `${summary.okr.nps.actual}/5` : 'n/a',
                sub: `${summary.satisfaction.npsN} responses (need 50)`,
                met: summary.okr.nps.met,
                color: summary.okr.nps.met ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white',
              },
              {
                label: 'CSAT',
                value: summary.satisfaction.csatRate !== null ? `${summary.satisfaction.csatRate}%` : 'n/a',
                sub: `${summary.satisfaction.csatN} responses (target 70%)`,
                met: (summary.satisfaction.csatRate ?? 0) >= 70,
                color: (summary.satisfaction.csatRate ?? 0) >= 70 ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white',
              },
            ].map(o => (
              <div key={o.label} className={`rounded-2xl border p-4 ${o.color}`}>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{o.label}</p>
                <p className={`text-2xl font-extrabold ${o.met ? 'text-green-700' : 'text-gray-800'}`}>
                  {o.met ? '✅ ' : ''}{o.value}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{o.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-100 rounded-2xl p-1 mb-6 shadow-sm flex-wrap">
          {(['overview','retention','activation','conversion','unit_economics'] as Tab[]).map(t => (
            <button key={t} onClick={() => handleTabChange(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors capitalize ${
                tab === t ? 'bg-violet-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}>
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ──────────────────────────────────────────────── */}
        {tab === 'overview' && summary && (
          <div className="space-y-6">
            {/* Funnel big numbers */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Sessions',       v: summary.funnel.sessions,       sub: '' },
                { label: 'Activated',      v: summary.funnel.activated,      sub: `${summary.funnel.activationRate}%` },
                { label: 'Completed',      v: summary.funnel.completed,      sub: `${summary.funnel.completionRate}% of activated` },
                { label: 'Upsell shown',   v: summary.funnel.upsellShown,    sub: '' },
                { label: 'Paywall clicks', v: summary.funnel.paywallReached, sub: `${summary.funnel.paywallRate}% of completed` },
                { label: 'Paid',           v: summary.funnel.paid,           sub: `${summary.funnel.overallConvRate}% CVR` },
              ].map((m, i) => (
                <div key={m.label} className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center`}>
                  <div className={`w-2 h-2 rounded-full mx-auto mb-2 ${COLORS[Math.min(i, COLORS.length - 1)]}`} />
                  <p className={`text-2xl font-extrabold ${i === 5 ? 'text-green-700' : 'text-gray-800'}`}>{m.v}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{m.label}</p>
                  {m.sub && <p className="text-xs text-gray-400">{m.sub}</p>}
                </div>
              ))}
            </div>

            {/* Funnel chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-800 mb-4">Full conversion funnel</h3>
              <div className="space-y-3">
                {[
                  { step: 'Landed on site', n: summary.funnel.sessions, max: summary.funnel.sessions },
                  { step: 'Started creating (activated)', n: summary.funnel.activated, max: summary.funnel.sessions },
                  { step: 'Book completed', n: summary.funnel.completed, max: summary.funnel.sessions },
                  { step: 'Upsell modal shown', n: summary.funnel.upsellShown, max: summary.funnel.sessions },
                  { step: 'Paywall / checkout clicked', n: summary.funnel.paywallReached, max: summary.funnel.sessions },
                  { step: 'Paid order', n: summary.funnel.paid, max: summary.funnel.sessions },
                ].map((row, i) => {
                  const barPct = row.max > 0 ? Math.round(row.n / row.max * 100) : 0
                  return (
                    <div key={row.step} className="flex items-center gap-3">
                      <div className="w-40 flex-shrink-0 text-xs text-gray-600 text-right pr-2">{row.step}</div>
                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden relative">
                        <div className={`h-full rounded-full ${COLORS[Math.min(i, COLORS.length-1)]}`}
                          style={{ width: `${barPct}%`, minWidth: row.n > 0 ? '2%' : '0' }} />
                      </div>
                      <div className="w-20 text-right">
                        <span className="text-sm font-bold text-gray-800">{row.n}</span>
                        <span className="text-xs text-gray-400 ml-1">({barPct}%)</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Timing + Revenue */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="font-bold text-gray-700 mb-3">⏱ Timing</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Median time-to-activate</span>
                    <span className="font-bold">{summary.timing.medianTtaMin !== null ? `${summary.timing.medianTtaMin}m` : 'n/a'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Median book creation time</span>
                    <span className="font-bold">{summary.timing.medianTtcMin !== null ? `${summary.timing.medianTtcMin}m` : 'n/a'}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="font-bold text-gray-700 mb-3">💰 Revenue</p>
                <p className="text-3xl font-extrabold text-green-700">${summary.revenue.totalRevDollars}</p>
                <div className="space-y-1 text-xs text-gray-500 mt-2">
                  <div className="flex justify-between"><span>Orders</span><span className="font-bold">{summary.revenue.totalOrders}</span></div>
                  <div className="flex justify-between"><span>ARPU</span><span className="font-bold">${(summary.revenue.arpu / 100).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>ARPPU</span><span className="font-bold">${(summary.revenue.arppu / 100).toFixed(2)}</span></div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="font-bold text-gray-700 mb-3">😊 Satisfaction</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">CSAT (good)</span>
                    <span className="font-bold">{summary.satisfaction.csatRate !== null ? `${summary.satisfaction.csatRate}%` : 'n/a'} ({summary.satisfaction.csatN})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">NPS avg (1-5)</span>
                    <span className="font-bold">{summary.satisfaction.npsAvg !== null ? summary.satisfaction.npsAvg : 'n/a'} ({summary.satisfaction.npsN})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily sessions sparkline */}
            {daily && daily.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-800 mb-4">Daily sessions (last {days}d)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-400 text-left border-b border-gray-100">
                        {['Date','Sessions','Activated','Completed','Paywall','Paid','Rev','Act%','Conv%'].map(h => (
                          <th key={h} className="py-2 pr-4 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {daily.slice(-14).map(d => (
                        <tr key={d.date} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-1.5 pr-4 font-mono text-gray-600">{d.date}</td>
                          <td className="pr-4 font-bold">{d.sessions}</td>
                          <td className="pr-4">{d.activated}</td>
                          <td className="pr-4">{d.completed}</td>
                          <td className="pr-4">{d.paywall}</td>
                          <td className="pr-4 text-green-700 font-bold">{d.paid}</td>
                          <td className="pr-4 text-green-600">${d.revDollars}</td>
                          <td className={`pr-4 font-semibold ${d.activationRate >= 30 ? 'text-green-600' : 'text-gray-500'}`}>{d.activationRate}%</td>
                          <td className={`font-semibold ${d.convRate >= 8 ? 'text-green-600' : d.convRate > 0 ? 'text-yellow-600' : 'text-gray-300'}`}>{d.convRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── RETENTION ──────────────────────────────────────────────── */}
        {tab === 'retention' && (
          <div className="space-y-6">
            {!retention ? (
              <p className="text-gray-400 text-sm">{loading ? 'Loading…' : 'No data'}</p>
            ) : (
              <>
                {/* Overall rates */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="font-bold text-gray-800 mb-4">Overall retention rates ({retention.totalSessions} sessions)</h3>
                  <div className="flex gap-6 flex-wrap">
                    {[
                      { label: 'D1 (≤2d)', val: retention.overall.d1 },
                      { label: 'D3 (≤4d)', val: retention.overall.d3 },
                      { label: 'D7 (≤8d)', val: retention.overall.d7 },
                      { label: 'D14',      val: retention.overall.d14 },
                      { label: 'D30',      val: retention.overall.d30 },
                    ].map(r => (
                      <div key={r.label} className="text-center">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-extrabold mx-auto ${retentionColor(r.val)}`}>
                          {r.val}%
                        </div>
                        <p className="text-xs text-gray-500 mt-1 font-semibold">{r.label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-4">
                    Retention = session returned (page_view, configure, book_complete) within window.
                    Note: With {retention.totalSessions} sessions and data from April 2026 only, D7+ cohorts are still forming.
                    Low numbers expected until launch traffic accumulates.
                  </p>
                </div>

                {/* Cohort table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-100">
                    <h3 className="font-bold text-gray-800">Weekly cohort retention (%)</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Colour intensity = retention rate</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-400 border-b border-gray-100">
                          <th className="p-3 text-left">Cohort week</th>
                          <th className="p-3 text-center">N</th>
                          <th className="p-3 text-center">D1</th>
                          <th className="p-3 text-center">D3</th>
                          <th className="p-3 text-center">D7</th>
                          <th className="p-3 text-center">D14</th>
                          <th className="p-3 text-center">D30</th>
                        </tr>
                      </thead>
                      <tbody>
                        {retention.cohorts.map(c => (
                          <tr key={c.week} className="border-b border-gray-50">
                            <td className="p-3 font-mono text-xs text-gray-600">{c.week}</td>
                            <td className="p-3 text-center font-bold">{c.n}</td>
                            {[c.d1, c.d3, c.d7, c.d14, c.d30].map((val, i) => (
                              <td key={i} className="p-2 text-center">
                                <span className={`inline-block w-10 text-xs font-bold py-1 rounded-lg ${retentionColor(val)}`}>
                                  {val > 0 ? `${val}%` : '—'}
                                </span>
                              </td>
                            ))}
                          </tr>
                        ))}
                        {/* Overall row */}
                        <tr className="bg-violet-50 border-t-2 border-violet-200">
                          <td className="p-3 font-bold text-violet-700">Overall</td>
                          <td className="p-3 text-center font-bold">{retention.totalSessions}</td>
                          {[retention.overall.d1, retention.overall.d3, retention.overall.d7, retention.overall.d14, retention.overall.d30].map((val, i) => (
                            <td key={i} className="p-2 text-center">
                              <span className={`inline-block w-10 text-xs font-extrabold py-1 rounded-lg ${retentionColor(val)}`}>
                                {val > 0 ? `${val}%` : '—'}
                              </span>
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                  <p className="text-sm font-semibold text-amber-800">📊 Interpretation</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Coloring book creation is inherently <strong>low-frequency</strong> (parents create for birthdays, holidays, special occasions).
                    D7 retention &gt;15% would be strong. D30 retention &gt;25% (via subscription) is the Phase 8 goal.
                    Current data is pre-launch; meaningful cohorts will form after Product Hunt / Reddit distribution.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ACTIVATION ──────────────────────────────────────────────── */}
        {tab === 'activation' && daily && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h3 className="font-bold text-gray-800">Daily activation funnel</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      {['Date','Sessions','Activated','Act%','Completed','Comp%','Exported','7d avg'].map(h => (
                        <th key={h} className="p-3 text-right first:text-left font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {daily.slice(-21).map(d => (
                      <tr key={d.date} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="p-3 font-mono text-xs text-gray-600">{d.date}</td>
                        <td className="p-3 text-right font-bold">{d.sessions}</td>
                        <td className="p-3 text-right">{d.activated}</td>
                        <td className={`p-3 text-right font-semibold ${d.activationRate >= 40 ? 'text-green-600' : d.activationRate >= 25 ? 'text-yellow-600' : 'text-red-500'}`}>
                          {d.activationRate}%
                        </td>
                        <td className="p-3 text-right">{d.completed}</td>
                        <td className="p-3 text-right text-gray-500">
                          {d.activated > 0 ? `${Math.round(d.completed / d.activated * 100)}%` : '—'}
                        </td>
                        <td className="p-3 text-right">{d.exported}</td>
                        <td className="p-3 text-right text-violet-600 font-semibold">{d.avgSessions7d}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── CONVERSION ──────────────────────────────────────────────── */}
        {tab === 'conversion' && (
          <div className="space-y-6">
            {!conv ? (
              <p className="text-gray-400 text-sm">{loading ? 'Loading…' : 'No data'}</p>
            ) : (
              <>
                {/* Funnel waterfall */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="font-bold text-gray-800 mb-5">Conversion funnel</h3>
                  <div className="space-y-4">
                    {conv.funnel.map((step, i) => (
                      <div key={step.step}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-600">{step.step}</span>
                          <span className="text-sm font-bold text-gray-800">{step.n} ({step.pct}%)</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${COLORS[Math.min(i, COLORS.length-1)]}`}
                            style={{ width: `${step.pct}%`, minWidth: step.n > 0 ? '1%' : '0' }} />
                        </div>
                        {i < conv.funnel.length - 1 && (
                          <p className="text-xs text-gray-400 mt-0.5 pl-1">
                            ↓ drop-off: {100 - (conv.funnel[i+1]?.pct ?? 0)}% lost
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Step-by-step rates */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="font-bold text-gray-800 mb-4">Step-by-step conversion rates</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'Land → Activate',    val: conv.rates.landingToActivate,  target: 30, unit: '%' },
                      { label: 'Activate → Complete', val: conv.rates.activateToComplete, target: 70, unit: '%' },
                      { label: 'Complete → Upsell',   val: conv.rates.completeToUpsell,   target: 80, unit: '%' },
                      { label: 'Upsell → Click',      val: conv.rates.upsellToClick,      target: 20, unit: '%' },
                      { label: 'Click → Paid',        val: conv.rates.clickToPaid,        target: 40, unit: '%' },
                      { label: 'Overall CVR',         val: conv.rates.overallConvRate,    target: 8,  unit: '%' },
                    ].map(m => (
                      <div key={m.label} className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-400 mb-1">{m.label}</p>
                        <p className={`text-2xl font-extrabold ${m.val >= m.target ? 'text-green-700' : m.val > 0 ? 'text-amber-700' : 'text-gray-300'}`}>
                          {m.val}{m.unit}
                        </p>
                        <p className="text-xs text-gray-400">Target: ≥{m.target}%</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Revenue summary */}
                <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
                  <p className="font-bold text-green-800 mb-2">Revenue summary</p>
                  <div className="flex gap-8">
                    <div>
                      <p className="text-3xl font-extrabold text-green-700">${conv.revenue.revDollars}</p>
                      <p className="text-xs text-green-600">{conv.revenue.paid} paid orders</p>
                    </div>
                    {conv.revenue.paid === 0 && (
                      <div className="text-sm text-amber-700 bg-amber-50 rounded-xl p-3 border border-amber-100">
                        ⚠️ Stripe keys not yet configured — all orders in fake-door mode.
                        Set STRIPE_SECRET_KEY in Vercel env to enable real payments.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── UNIT ECONOMICS ──────────────────────────────────────────── */}
        {tab === 'unit_economics' && (
          <div className="space-y-6">
            {!unit ? (
              <p className="text-gray-400 text-sm">{loading ? 'Loading…' : 'No data'}</p>
            ) : (
              <>
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                  <p className="text-sm font-semibold text-amber-800">⚠️ Projections only</p>
                  <p className="text-sm text-amber-700 mt-1">{unit.assumptions.note}</p>
                </div>

                {/* Key metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'CAC',           value: `$${unit.unit.cac.dollars}`,           sub: unit.unit.cac.source, color: 'text-green-700' },
                    { label: 'Avg Order Value', value: `$${unit.unit.avgOrderValue.dollars}`, sub: 'one-time purchase',   color: 'text-gray-800' },
                    { label: 'ARPU',           value: `$${unit.unit.arpu.dollars}`,          sub: 'per session',         color: 'text-gray-800' },
                    { label: 'Gross Margin',   value: `${unit.unit.grossMarginPct}%`,         sub: 'digital good',        color: 'text-green-700' },
                    { label: 'Payback Period', value: unit.unit.paybackDays === 0 ? 'Instant' : `${unit.unit.paybackDays}d`, sub: 'CAC = $0', color: 'text-green-700' },
                    { label: 'MRR',           value: `$${unit.revenue.mrr.toFixed(2)}`,     sub: 'No subscriptions yet', color: 'text-gray-400' },
                  ].map(m => (
                    <div key={m.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <p className="text-xs text-gray-400 mb-1 font-semibold">{m.label}</p>
                      <p className={`text-2xl font-extrabold ${m.color}`}>{m.value}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{m.sub}</p>
                    </div>
                  ))}
                </div>

                {/* LTV scenarios */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="font-bold text-gray-800 mb-4">LTV projections (assume 15% repeat rate)</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'LTV M1', value: unit.unit.ltv.m1, note: 'First purchase only' },
                      { label: 'LTV M3', value: unit.unit.ltv.m3, note: '+ 15% repeat in M2' },
                      { label: 'LTV M12', value: unit.unit.ltv.m12, note: '+ 3× repeat over year' },
                    ].map(m => (
                      <div key={m.label} className="text-center bg-violet-50 rounded-2xl p-5">
                        <p className="text-3xl font-extrabold text-violet-700">${m.value}</p>
                        <p className="text-sm font-semibold text-violet-600 mt-1">{m.label}</p>
                        <p className="text-xs text-violet-400 mt-0.5">{m.note}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-3 text-center">
                    LTV/CAC = ∞ (zero-spend launch). Remains profitable at any CAC &lt; ${unit.unit.ltv.m12}.
                  </p>
                </div>

                {/* Satisfaction */}
                {unit.satisfaction.npsAvg !== null || unit.satisfaction.csatRate !== null ? (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="font-bold text-gray-800 mb-4">Satisfaction metrics</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-extrabold text-violet-700">{unit.satisfaction.npsAvg ?? 'n/a'}/5</p>
                        <p className="text-xs text-gray-500">NPS avg (n={unit.satisfaction.npsN})</p>
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold text-green-700">{unit.satisfaction.npsScore !== null ? unit.satisfaction.npsScore : 'n/a'}</p>
                        <p className="text-xs text-gray-500">Net Promoter Score</p>
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold text-blue-700">{unit.satisfaction.csatRate !== null ? `${unit.satisfaction.csatRate}%` : 'n/a'}</p>
                        <p className="text-xs text-gray-500">CSAT good (n={unit.satisfaction.csatN})</p>
                      </div>
                      <div>
                        <p className="text-lg font-extrabold text-gray-700">
                          {unit.satisfaction.promoters}P / {unit.satisfaction.passives}Pa / {unit.satisfaction.detractors}D
                        </p>
                        <p className="text-xs text-gray-500">Promoter/Passive/Detractor</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Cost structure */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="font-bold text-gray-800 mb-4">Cost structure</h3>
                  <div className="space-y-2">
                    {Object.entries(unit.costStructure).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-sm">
                        <span className="text-gray-600 capitalize">{k}</span>
                        <span className={`font-semibold ${v.startsWith('$0') ? 'text-green-600' : 'text-gray-800'}`}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
