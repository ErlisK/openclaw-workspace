'use client'
import { useState, useEffect } from 'react'
import { UNIT_ECONOMICS } from '@/lib/config'

interface EconData {
  history: EconRow[]
  latest: EconRow | null
  targets: typeof UNIT_ECONOMICS
  health: { ltvCacOk: boolean; marginOk: boolean; conversionOk: boolean; cacBelowTarget: boolean } | null
}

interface EconRow {
  period: string; mrr: number; arr: number; new_mrr: number; churned_mrr: number
  expansion_mrr: number; active_customers: number; trials: number
  trial_to_paid_rate: number; avg_revenue_per_user: number; cac: number
  ltv: number; ltv_cac_ratio: number; gross_margin: number; notes: string
}

interface ABData {
  total: number
  variants: Record<string, { views: number; clicks: number; checkouts: number; ctr: string; checkoutRate: string }>
}

interface VWData {
  n: number
  medians: { tooCheap: number; cheap: number; expensive: number; tooExpensive: number }
  vanWestendorp: { pmcPoint: number; pmePoint: number; iapRange: { low: number; high: number }; recommendedPrice: number }
}

const SEED_PERIODS = [
  { period: '2026-01', mrr: 0, new_mrr: 0, active_customers: 0, trials: 3, trial_to_paid_rate: 0, cac: 0, ltv: 0, gross_margin: 0, notes: 'Pre-launch beta' },
  { period: '2026-02', mrr: 448, new_mrr: 448, active_customers: 3, trials: 8, trial_to_paid_rate: 0.375, cac: 210, ltv: 1490, gross_margin: 0.72, notes: 'First 3 pilots @ avg $149/mo' },
  { period: '2026-03', mrr: 1247, new_mrr: 900, churned_mrr: 101, expansion_mrr: 0, active_customers: 8, trials: 15, trial_to_paid_rate: 0.33, cac: 180, ltv: 1800, gross_margin: 0.74, notes: 'Growth month: 5 new paid → includes enterprise pilot' },
]

export default function EconomicsPage() {
  const [data, setData] = useState<EconData | null>(null)
  const [ab, setAB] = useState<ABData | null>(null)
  const [vw, setVW] = useState<VWData | null>(null)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [eRes, abRes, vwRes] = await Promise.all([
      fetch('/api/economics').then(r => r.json()),
      fetch('/api/ab').then(r => r.json()),
      fetch('/api/survey').then(r => r.json()),
    ])
    setData(eRes)
    setAB(abRes)
    setVW(vwRes.n > 0 ? vwRes : null)
    setLoading(false)
  }

  async function seedEconomics() {
    setSeeding(true)
    for (const row of SEED_PERIODS) {
      await fetch('/api/economics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...row, newMrr: row.new_mrr, churnedMrr: row.churned_mrr || 0,
          expansionMrr: row.expansion_mrr || 0, activeCustomers: row.active_customers,
          trialToPaidRate: row.trial_to_paid_rate, grossMargin: row.gross_margin,
        }),
      })
    }
    await fetchAll()
    setSeeding(false)
  }

  const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`
  const fmtMoney = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`

  const healthColor = (ok: boolean | undefined) => ok ? 'text-emerald-400' : 'text-red-400'
  const healthIcon = (ok: boolean | undefined) => ok ? '✓' : '✗'

  if (loading) return <div className="pt-24 text-center text-gray-500 text-sm">Loading economics…</div>

  const latest = data?.latest
  const targets = data?.targets || UNIT_ECONOMICS

  return (
    <div className="pt-14">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-white">Unit Economics Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">Beta → paid conversion · LTV:CAC · margins · A/B pricing results</p>
          </div>
          <div className="flex gap-2">
            {!data?.history?.length && (
              <button onClick={seedEconomics} disabled={seeding}
                className="text-xs px-3 py-1.5 border border-gray-700 text-gray-400 rounded-lg hover:border-gray-500 transition-colors">
                {seeding ? 'Seeding…' : 'Seed sample data'}
              </button>
            )}
            <button onClick={fetchAll}
              className="text-xs px-3 py-1.5 bg-blue-950/50 border border-blue-700/40 text-blue-400 rounded-lg hover:bg-blue-950/80 transition-colors">
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Health scorecard */}
        {latest && data?.health && (
          <div className="grid grid-cols-4 gap-3 mb-8">
            {[
              { label: 'LTV:CAC ratio', value: `${latest.ltv_cac_ratio.toFixed(1)}x`, target: `≥${targets.targetLTVCACRatio}x`, ok: data.health.ltvCacOk },
              { label: 'Gross margin', value: fmtPct(latest.gross_margin), target: `≥${fmtPct(targets.targetGrossMargin)}`, ok: data.health.marginOk },
              { label: 'Trial→Paid', value: fmtPct(latest.trial_to_paid_rate), target: `≥${fmtPct(targets.targetTrialConversion)}`, ok: data.health.conversionOk },
              { label: 'CAC', value: fmtMoney(latest.cac), target: `≤$${targets.targetCAC}`, ok: data.health.cacBelowTarget },
            ].map(({ label, value, target, ok }) => (
              <div key={label} className={`rounded-xl border p-4 ${ok ? 'border-emerald-700/30 bg-emerald-950/10' : 'border-red-700/30 bg-red-950/10'}`}>
                <div className="flex justify-between items-start">
                  <div className="text-xl font-bold text-white">{value}</div>
                  <span className={`text-sm ${healthColor(ok)}`}>{healthIcon(ok)}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">{label}</div>
                <div className="text-xs text-gray-600">Target: {target}</div>
              </div>
            ))}
          </div>
        )}

        {/* MRR history */}
        {data?.history?.length ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 mb-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">MRR History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['Period','MRR','ARR','New MRR','Churned','Customers','Trials','Trial→Paid','ARPU','CAC','LTV','Notes'].map(h => (
                      <th key={h} className="px-2 py-2 text-left text-gray-500 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.history.map(r => (
                    <tr key={r.period} className="border-b border-gray-800/50">
                      <td className="px-2 py-2 font-mono text-gray-300">{r.period}</td>
                      <td className="px-2 py-2 text-emerald-400 font-semibold">{fmtMoney(r.mrr)}</td>
                      <td className="px-2 py-2 text-gray-400">{fmtMoney(r.arr)}</td>
                      <td className="px-2 py-2 text-blue-400">+{fmtMoney(r.new_mrr)}</td>
                      <td className="px-2 py-2 text-red-400">-{fmtMoney(r.churned_mrr || 0)}</td>
                      <td className="px-2 py-2 text-gray-300">{r.active_customers}</td>
                      <td className="px-2 py-2 text-gray-400">{r.trials}</td>
                      <td className="px-2 py-2 text-gray-300">{fmtPct(r.trial_to_paid_rate)}</td>
                      <td className="px-2 py-2 text-gray-400">{fmtMoney(r.avg_revenue_per_user || 0)}</td>
                      <td className="px-2 py-2 text-gray-400">{fmtMoney(r.cac)}</td>
                      <td className="px-2 py-2 text-gray-400">{fmtMoney(r.ltv)}</td>
                      <td className="px-2 py-2 text-gray-500 text-xs max-w-[150px] truncate">{r.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center mb-6">
            <div className="text-gray-600 text-sm">No economics data yet. Seed sample data or POST to /api/economics.</div>
          </div>
        )}

        {/* A/B test results */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 mb-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            A/B Pricing Test Results
            <span className="ml-2 text-gray-600 normal-case font-normal">({ab?.total || 0} events)</span>
          </h3>
          {ab && ab.total > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(ab.variants).map(([variant, stats]) => (
                <div key={variant} className={`rounded-lg border p-4 ${variant === 'a' ? 'border-blue-700/30 bg-blue-950/10' : 'border-gray-700'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-sm font-semibold text-white capitalize">Variant {variant.toUpperCase()}</div>
                      <div className="text-xs text-gray-500">
                        {variant === 'a' ? 'Value anchor ($49/$149/$499)' : variant === 'b' ? 'Mid-market ($39/$129/$449)' : 'Premium ($69/$199/$599)'}
                      </div>
                    </div>
                    {variant === 'a' && <span className="text-xs bg-blue-700 text-white px-1.5 py-0.5 rounded">Control</span>}
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-gray-500">Views</span><span className="text-white">{stats.views}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">CTA clicks</span><span className="text-white">{stats.clicks}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Checkout starts</span><span className="text-white">{stats.checkouts}</span></div>
                    <div className="flex justify-between border-t border-gray-800 pt-1.5">
                      <span className="text-gray-500">CTR</span>
                      <span className={stats.views > 0 ? 'text-emerald-400 font-semibold' : 'text-gray-500'}>{(parseFloat(stats.ctr) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Checkout rate</span>
                      <span className={stats.views > 0 ? 'text-blue-400 font-semibold' : 'text-gray-500'}>{(parseFloat(stats.checkoutRate) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-600 text-xs text-center py-4">
              No A/B events yet. Events tracked when visitors view/click pricing pages at /pricing, /pricing/b, /pricing/c.
            </div>
          )}
          <div className="mt-3 text-xs text-gray-600">
            Variants: <a href="/pricing" className="text-blue-500">A (control)</a> ·{' '}
            <a href="/pricing/b" className="text-blue-500">B (mid-market)</a> ·{' '}
            <a href="/pricing/c" className="text-blue-500">C (premium)</a>
          </div>
        </div>

        {/* Van Westendorp results */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 mb-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Van Westendorp Pricing Survey
            <span className="ml-2 text-gray-600 normal-case font-normal">({vw?.n || 0} responses)</span>
          </h3>
          {vw ? (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-xs font-medium text-gray-400 mb-3">Median price points</div>
                <div className="space-y-2">
                  {[
                    { label: 'Too cheap', val: vw.medians.tooCheap, color: 'text-red-400' },
                    { label: 'Cheap / bargain', val: vw.medians.cheap, color: 'text-amber-400' },
                    { label: 'Expensive', val: vw.medians.expensive, color: 'text-blue-400' },
                    { label: 'Too expensive', val: vw.medians.tooExpensive, color: 'text-purple-400' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="flex justify-between text-xs">
                      <span className="text-gray-500">{label}</span>
                      <span className={`font-mono font-semibold ${color}`}>${val}/mo</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-400 mb-3">Acceptable price range</div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Floor (PMC)</span>
                    <span className="font-mono text-white font-semibold">${vw.vanWestendorp.pmcPoint}/mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ceiling (PME)</span>
                    <span className="font-mono text-white font-semibold">${vw.vanWestendorp.pmePoint}/mo</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-800 pt-2">
                    <span className="text-gray-400 font-medium">Recommended price</span>
                    <span className="font-mono text-emerald-400 font-bold text-sm">${vw.vanWestendorp.recommendedPrice}/mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Acceptable range</span>
                    <span className="font-mono text-gray-300">${vw.vanWestendorp.iapRange.low} – ${vw.vanWestendorp.iapRange.high}/mo</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-600 text-xs">
              No survey responses yet.{' '}
              <a href="/survey" className="text-blue-400">Share the survey link →</a>
            </div>
          )}
        </div>

        {/* Targets reference */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Target Economics</h3>
          <div className="grid grid-cols-5 gap-3 text-xs text-center">
            {[
              { label: 'CAC Target', val: `≤$${targets.targetCAC}` },
              { label: 'LTV Target', val: `≥$${targets.targetLTV}` },
              { label: 'LTV:CAC', val: `≥${targets.targetLTVCACRatio}x` },
              { label: 'Gross Margin', val: `≥${(targets.targetGrossMargin * 100).toFixed(0)}%` },
              { label: 'Trial Conv.', val: `≥${(targets.targetTrialConversion * 100).toFixed(0)}%` },
            ].map(({ label, val }) => (
              <div key={label} className="rounded-lg bg-gray-800 p-3">
                <div className="text-gray-500 mb-1">{label}</div>
                <div className="font-semibold text-white">{val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
