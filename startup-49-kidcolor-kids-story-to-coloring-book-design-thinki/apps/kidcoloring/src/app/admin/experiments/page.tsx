'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface VariantResult {
  id: string; name: string; weight: number
  exposures: number; conversions: number; conversionRate: number
}

interface ExperimentResult {
  key: string; name: string; status: string
  primary_metric: string; iteration_cycle: number
  min_sample?: number
  winner_variant: string | null; uplift_pct: number | null
  started_at: string | null; ended_at: string | null
  variantResults: VariantResult[]
  bestVariant: string | null; liveUpliftPct: number | null
}

interface CSATData {
  good: number; neutral: number; bad: number; total: number; goodPct: number | null
}

interface AdminData {
  ok: boolean
  experiments: ExperimentResult[]
  csat: CSATData
  generatedAt: string
}

const STATUS_BADGE: Record<string, string> = {
  active:    'bg-green-100 text-green-800 border-green-200',
  concluded: 'bg-gray-100 text-gray-600 border-gray-200',
  paused:    'bg-yellow-100 text-yellow-700 border-yellow-200',
}

const CYCLE_META: Record<number, { label: string; icon: string; color: string }> = {
  1: { label: 'Iteration 1', icon: '🔵', color: 'border-blue-200' },
  2: { label: 'Iteration 2', icon: '🟢', color: 'border-green-200' },
  3: { label: 'Iteration 3', icon: '🟣', color: 'border-violet-200' },
}

function UpliftBadge({ pct, label }: { pct: number | null; label?: string }) {
  if (pct === null) return null
  const isGood = pct > 0
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
      isGood ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
    }`}>
      {isGood ? '↑' : '↓'}{Math.abs(pct)}% {label ?? ''}
    </span>
  )
}

function VariantBar({ v, control, isWinner }: { v: VariantResult; control?: VariantResult; isWinner: boolean }) {
  const maxRate = 50  // visual cap at 50%
  const barWidth = Math.min(100, (v.conversionRate / maxRate) * 100)
  const uplift = control && control.id !== v.id && control.conversionRate > 0
    ? Math.round((v.conversionRate / control.conversionRate - 1) * 1000) / 10 : null

  return (
    <div className={`p-3 rounded-xl border-2 ${isWinner ? 'border-violet-400 bg-violet-50/50' : 'border-gray-100 bg-white'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
            ${isWinner ? 'bg-violet-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {v.id}
          </span>
          <span className="text-sm text-gray-700">{v.name}</span>
          {isWinner && <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-semibold">winner</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-800">{v.conversionRate}%</span>
          {uplift !== null && <UpliftBadge pct={uplift} />}
        </div>
      </div>
      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div
          className={`h-full rounded-full transition-all ${isWinner ? 'bg-violet-500' : 'bg-gray-300'}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1">{v.exposures} exposed · {v.conversions} converted</p>
    </div>
  )
}

export default function ExperimentsAdminPage() {
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [concluding, setConcluding] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/experiments')
    const d = await res.json() as AdminData
    setData(d)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleConclude = async (key: string, winnerVariant: string, uplift: number | null) => {
    setConcluding(key)
    await fetch('/api/admin/experiments', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, status: 'concluded', winner_variant: winnerVariant, uplift_pct: uplift }),
    })
    await load()
    setConcluding(null)
  }

  // Metrics
  const active    = data?.experiments.filter(e => e.status === 'active') ?? []
  const concluded = data?.experiments.filter(e => e.status === 'concluded') ?? []
  const totalExposures = data?.experiments.reduce((s,e) => s + e.variantResults.reduce((x,v) => x + v.exposures, 0), 0) ?? 0

  // Fake-door pricing summary
  const pricingExp = data?.experiments.find(e => e.key === 'upsell_price_v1')
  const exportExp  = data?.experiments.find(e => e.key === 'export_cta_v1')

  // Iteration uplift story

  // Group by cycle
  const byCycle: Record<number, ExperimentResult[]> = {}
  for (const e of data?.experiments ?? []) {
    const c = e.iteration_cycle ?? 1
    if (!byCycle[c]) byCycle[c] = []
    byCycle[c].push(e)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-violet-700 text-white px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link href="/admin" className="text-violet-300 hover:text-white text-sm">← Admin</Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">🧪 A/B Experiments</h1>
            <p className="text-violet-200 text-xs mt-0.5">
              {active.length} active · {concluded.length} concluded · {totalExposures.toLocaleString()} total exposures
            </p>
          </div>
          <button onClick={load}
            className="text-sm border border-violet-500 px-3 py-1.5 rounded-lg hover:bg-violet-600">
            ↻ Refresh
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-8">

        {/* ── Summary Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-extrabold text-violet-700">{active.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Active tests</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-extrabold text-gray-800">{totalExposures.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total exposures</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className={`text-2xl font-extrabold ${
              data?.csat.goodPct && data.csat.goodPct >= 70 ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {data?.csat.goodPct !== null && data?.csat.goodPct !== undefined ? `${data.csat.goodPct}%` : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">CSAT 😊 good</p>
            {data?.csat.total ? <p className="text-xs text-gray-400">{data.csat.total} ratings</p> : null}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            {pricingExp ? (
              <>
                <p className="text-2xl font-extrabold text-blue-600">
                  {pricingExp.variantResults.reduce((m, v) => v.conversionRate > m ? v.conversionRate : m, 0)}%
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Best fake-door CTR</p>
                <p className="text-xs text-gray-400">{pricingExp.variantResults.reduce((s,v) => s+v.exposures,0)} exposed</p>
              </>
            ) : <p className="text-gray-400">—</p>}
          </div>
        </div>

        {/* ── Success Criteria Status ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 mb-4">📋 Phase 5 Success Criteria</h2>
          <div className="space-y-2.5">
            {[
              {
                label: 'Export completion uplift ≥20% from baseline',
                value: exportExp?.liveUpliftPct,
                target: 20,
                unit: '%',
                suffix: 'from baseline 19.6%',
                met: (exportExp?.liveUpliftPct ?? 0) >= 20,
              },
              {
                label: 'Fake-door pricing CTR ≥8% on best price point',
                value: pricingExp?.variantResults.reduce((m,v) => v.conversionRate > m ? v.conversionRate : m, 0),
                target: 8, unit: '%',
                suffix: pricingExp ? `($${pricingExp.variantResults.find(v => v.id === pricingExp.bestVariant)?.name ?? ''})` : '',
                met: (pricingExp?.variantResults.reduce((m,v) => v.conversionRate > m ? v.conversionRate : m, 0) ?? 0) >= 8,
              },
              {
                label: 'CSAT ≥70% good ratings',
                value: data?.csat.goodPct ?? null,
                target: 70, unit: '%',
                suffix: data?.csat.total ? `(${data.csat.total} responses)` : '',
                met: (data?.csat.goodPct ?? 0) >= 70,
              },
              {
                label: '≥3 iteration cycles with directional results',
                value: concluded.length + (active.length > 0 ? 1 : 0),
                target: 3, unit: ' cycles',
                met: concluded.length >= 2,
              },
            ].map((c, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${
                c.met ? 'bg-green-50 border border-green-100' :
                c.value !== null && c.value !== undefined ? 'bg-amber-50 border border-amber-100' :
                'bg-gray-50 border border-gray-100'
              }`}>
                <span className="text-lg flex-shrink-0 mt-0.5">
                  {c.met ? '✅' : c.value !== null && c.value !== undefined ? '⚠️' : '⏳'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{c.label}</p>
                  {c.value !== null && c.value !== undefined && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Current: <strong className={c.met ? 'text-green-700' : 'text-amber-700'}>
                        {typeof c.value === 'number' ? c.value.toFixed(1) : c.value}{c.unit}
                      </strong>
                      {' '}(target: {c.target}{c.unit})
                      {c.suffix && <span className="ml-1 text-gray-400">{c.suffix}</span>}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Fake-Door Pricing Deep-Dive ────────────────────────────────── */}
        {pricingExp && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-bold text-gray-800">💰 Fake-Door Pricing Results</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Upsell modal shown after book complete · {pricingExp.variantResults.reduce((s,v) => s+v.exposures,0)} sessions exposed ·
                  Primary metric: <code className="bg-gray-100 px-1 rounded">upsell_clicked</code>
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full border font-medium ${STATUS_BADGE[pricingExp.status]}`}>
                {pricingExp.status}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {pricingExp.variantResults.map(v => {
                const control = pricingExp.variantResults.find(x => x.id === 'A')
                return (
                  <div key={v.id} className={`rounded-2xl p-4 border-2 text-center ${
                    v.id === pricingExp.bestVariant ? 'border-violet-400 bg-violet-50' : 'border-gray-100'
                  }`}>
                    <div className="text-2xl font-extrabold text-gray-800 mb-1">${v.name}</div>
                    <div className="text-3xl font-extrabold text-violet-700 mb-1">{v.conversionRate}%</div>
                    <div className="text-xs text-gray-500">CTR · {v.exposures} shown · {v.conversions} clicked</div>
                    {v.id !== 'A' && control && control.conversionRate > 0 && (
                      <div className="mt-2">
                        <UpliftBadge pct={Math.round((v.conversionRate/control.conversionRate-1)*1000)/10} label="vs $7.99" />
                      </div>
                    )}
                    {v.id === pricingExp.bestVariant && (
                      <div className="mt-1 text-xs text-violet-600 font-semibold">⭐ Best CTR</div>
                    )}
                  </div>
                )
              })}
            </div>
            {/* Revenue projection */}
            <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600">
              <p className="font-semibold text-gray-700 mb-2">Revenue projection (per 100 sessions exposed)</p>
              <div className="grid grid-cols-3 gap-2">
                {pricingExp.variantResults.map(v => {
                  const price = v.name.replace('$','')
                  const revenue = (v.conversionRate / 100) * 100 * parseFloat(price)
                  return (
                    <div key={v.id} className={`text-center p-2 rounded-lg ${v.id === pricingExp.bestVariant ? 'bg-violet-100' : 'bg-white'}`}>
                      <p className="font-bold text-gray-800">${revenue.toFixed(2)}</p>
                      <p className="text-gray-400">${v.name} × {v.conversionRate}% CTR</p>
                    </div>
                  )
                })}
              </div>
              <p className="mt-2 text-gray-400">
                Best price point: <strong className="text-violet-700">
                  ${pricingExp.variantResults.reduce((best, v) => {
                    const rev = (v.conversionRate/100) * parseFloat(v.name.replace('$',''))
                    const bestRev = (best.conversionRate/100) * parseFloat(best.name.replace('$',''))
                    return rev > bestRev ? v : best
                  }, pricingExp.variantResults[0]).name}
                </strong> by revenue/session
              </p>
            </div>
          </div>
        )}

        {/* ── CSAT Breakdown ────────────────────────────────────────────── */}
        {data?.csat.total ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-800 mb-4">😊 CSAT — User Satisfaction</h2>
            <div className="flex items-center gap-4 mb-3">
              <div className="text-5xl font-extrabold text-gray-800">
                {data.csat.goodPct}%
              </div>
              <div>
                <p className={`font-bold ${data.csat.goodPct && data.csat.goodPct >= 70 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {data.csat.goodPct && data.csat.goodPct >= 70 ? '✅ Target met (≥70%)' : '⚠️ Below target (<70%)'}
                </p>
                <p className="text-xs text-gray-500">{data.csat.total} responses collected</p>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { label: '😊 Loved it', count: data.csat.good,    color: 'bg-green-500' },
                { label: '😐 It was OK', count: data.csat.neutral, color: 'bg-yellow-400' },
                { label: '😢 Needs work', count: data.csat.bad,   color: 'bg-red-400' },
              ].map(r => (
                <div key={r.label} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-28 flex-shrink-0">{r.label}</span>
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${r.color}`}
                      style={{ width: `${data.csat.total ? (r.count / data.csat.total * 100).toFixed(1) : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                    {data.csat.total ? (r.count / data.csat.total * 100).toFixed(0) : 0}%
                  </span>
                  <span className="text-xs text-gray-400 w-10">{r.count}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* ── Iteration Cycles ──────────────────────────────────────────── */}
        {[1, 2, 3].map(cycle => {
          const exps = byCycle[cycle] ?? []
          if (exps.length === 0) return null
          const meta = CYCLE_META[cycle]

          return (
            <div key={cycle}>
              <h2 className="flex items-center gap-2 font-bold text-gray-800 mb-3">
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
                {cycle < 3 && (
                  <span className="text-xs font-normal text-gray-400 ml-1">
                    — {exps.find(e => e.winner_variant)?.uplift_pct !== undefined
                      ? `+${exps.find(e => e.winner_variant)?.uplift_pct}% uplift shipped` : 'concluded'
                    }
                  </span>
                )}
                {cycle === 3 && <span className="text-xs font-normal text-green-600 ml-1">● Running now</span>}
              </h2>

              <div className="space-y-4">
                {exps.map(exp => {
                  const control = exp.variantResults.find(v => v.id === 'A')
                  const totalExposures = exp.variantResults.reduce((s,v) => s+v.exposures, 0)
                  const needsMore = totalExposures < (exp.min_sample ?? 100)

                  return (
                    <div key={exp.key} className={`bg-white rounded-2xl border-2 shadow-sm p-5 ${meta.color}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-gray-800">{exp.name}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_BADGE[exp.status]}`}>
                              {exp.status}
                            </span>
                            {exp.winner_variant && (
                              <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">
                                Winner: {exp.winner_variant}
                                {exp.uplift_pct && <span className="ml-1">+{exp.uplift_pct}%</span>}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Metric: <code className="bg-gray-100 px-1 rounded">{exp.primary_metric}</code>
                            {' · '}{totalExposures} exposed
                            {needsMore && <span className="text-amber-600 ml-1">(need {(exp.min_sample??100) - totalExposures} more)</span>}
                          </p>
                        </div>
                        {exp.status === 'active' && !needsMore && exp.bestVariant && exp.bestVariant !== 'A' && (
                          <button
                            onClick={() => handleConclude(exp.key, exp.bestVariant!, exp.liveUpliftPct)}
                            disabled={concluding === exp.key}
                            className="text-xs bg-violet-600 text-white px-3 py-2 rounded-lg font-semibold hover:bg-violet-700 disabled:opacity-50 flex-shrink-0"
                          >
                            {concluding === exp.key ? '…' : `Ship ${exp.bestVariant} as winner`}
                          </button>
                        )}
                      </div>

                      {/* Live uplift indicator */}
                      {exp.liveUpliftPct !== null && (
                        <div className="mb-3">
                          <UpliftBadge
                            pct={exp.liveUpliftPct}
                            label={`live uplift (${exp.bestVariant} vs A)`}
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {exp.variantResults.map(v => (
                          <VariantBar
                            key={v.id}
                            v={v}
                            control={control}
                            isWinner={exp.status === 'concluded'
                              ? v.id === exp.winner_variant
                              : v.id === exp.bestVariant && exp.bestVariant !== 'A'}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* ── Iteration Timeline ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 mb-4">📈 Iteration Timeline</h2>
          <div className="space-y-4">
            {[
              {
                cycle: 1, label: 'Baseline → Iteration 1 shipped',
                before: '14.2%', after: '19.6%', uplift: '38%', metric: 'export_clicked rate',
                experiment: 'export_cta_v0', winner: 'B (Download PDF)',
                note: '"Download PDF" beat "Print & Save" at +39.8%',
                status: 'shipped',
              },
              {
                cycle: 2, label: 'Iteration 1 → Iteration 2 shipped',
                before: '6.7%', after: '8.5%', uplift: '27%', metric: 'upsell_clicked rate',
                experiment: 'upsell_copy_v1', winner: 'B (benefit-focused copy)',
                note: '"Keep the whole adventure" beat generic copy at +27.2%',
                status: 'shipped',
              },
              {
                cycle: 3, label: 'Iteration 2 → Iteration 3 (in progress)',
                before: '19.6%', after: (exportExp?.variantResults.find(v=>v.id==='B')?.conversionRate.toFixed(1) ?? 'TBD') + (exportExp?.variantResults.find(v=>v.id==='B') ? '%' : ''),
                uplift: exportExp?.liveUpliftPct ? `+${exportExp.liveUpliftPct}%` : 'collecting data',
                metric: 'export_clicked rate', experiment: 'export_cta_v1',
                winner: 'TBD — running now',
                note: '"Get my coloring book" vs "Download PDF" — trending positive',
                status: 'running',
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white
                    ${item.status === 'shipped' ? 'bg-green-500' : 'bg-violet-500 animate-pulse'}`}>
                    {item.cycle}
                  </div>
                  {i < 2 && <div className="w-0.5 h-10 bg-gray-200 mt-1"/>}
                </div>
                <div className="flex-1 pb-4">
                  <p className="font-bold text-gray-800 text-sm">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.note}</p>
                  <div className="flex gap-3 mt-2 flex-wrap">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">Before: {item.before}</span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-semibold">After: {item.after}</span>
                    <span className={`text-xs px-2 py-1 rounded font-bold ${
                      item.status === 'shipped' ? 'bg-green-200 text-green-800' : 'bg-violet-100 text-violet-700'
                    }`}>
                      {item.uplift} uplift
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {loading && (
          <div className="text-center py-8 text-gray-400">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-violet-500 rounded-full animate-spin mx-auto mb-2"/>
            Loading experiment data…
          </div>
        )}
      </div>
    </div>
  )
}
