'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface AnchorResult {
  anchor_id: string
  variant_id: string
  billing: string
  price_cents: number
  views: number
  clicks: number
  ctr: number
  revenuePerSession: number
}

interface PaywallData {
  ok: boolean
  results: AnchorResult[]
  summary: {
    totalViews: number
    totalClicks: number
    overallCtr: number
    bestAnchor: string
    bestCtr: number
    meetsTarget: boolean
  }
}

const ANCHOR_LABELS: Record<string, { name: string; price: string; type: string; icon: string }> = {
  per_book_699:     { name: 'Single Book',  price: '$6.99',  type: 'one-time',    icon: '📖' },
  per_book_799:     { name: 'Premium Book', price: '$7.99',  type: 'one-time',    icon: '⭐' },
  subscription_799: { name: 'Unlimited',    price: '$7.99/mo', type: 'monthly',   icon: '♾️' },
}

const VARIANT_LABELS: Record<string, string> = {
  A: 'Price-First',
  B: 'Benefit-First',
}

export default function PaywallAnalyticsPage() {
  const [data, setData]     = useState<PaywallData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/v1/paywall')
    const d   = await res.json() as PaywallData
    setData(d)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Aggregate by anchor (across variants)
  const byAnchor: Record<string, { views: number; clicks: number; price_cents: number; billing: string }> = {}
  for (const r of data?.results ?? []) {
    if (!byAnchor[r.anchor_id]) byAnchor[r.anchor_id] = { views: 0, clicks: 0, price_cents: r.price_cents, billing: r.billing }
    byAnchor[r.anchor_id].views  += r.views
    byAnchor[r.anchor_id].clicks += r.clicks
  }
  const anchorTotals = Object.entries(byAnchor).map(([id, d]) => ({
    anchor_id: id, ...d,
    ctr: d.views > 0 ? Math.round(1000 * d.clicks / d.views) / 10 : 0,
    revenuePerSession: d.views > 0 ? Math.round((d.clicks / d.views) * d.price_cents) : 0,
  })).sort((a, b) => b.ctr - a.ctr)

  // Best by revenue
  const bestRevenue = [...anchorTotals].sort((a,b) => b.revenuePerSession - a.revenuePerSession)[0]

  // Variant A vs B comparison (across all anchors)
  const variantTotals: Record<string, { views: number; clicks: number }> = { A: {views:0,clicks:0}, B: {views:0,clicks:0} }
  for (const r of data?.results ?? []) {
    if (variantTotals[r.variant_id]) {
      variantTotals[r.variant_id].views  += r.views
      variantTotals[r.variant_id].clicks += r.clicks
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-violet-700 text-white px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link href="/admin" className="text-violet-300 hover:text-white text-sm">← Admin</Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">💰 Fake-Door Paywall Analytics</h1>
            <p className="text-violet-200 text-xs mt-0.5">
              Post-export paywall · 3 price anchors · A/B layout test · no real charges
            </p>
          </div>
          <button onClick={load} className="text-sm border border-violet-500 px-3 py-1.5 rounded-lg hover:bg-violet-600">
            ↻ Refresh
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">

        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-violet-500 rounded-full animate-spin mx-auto mb-3"/>
            Loading paywall data…
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                <p className="text-2xl font-extrabold text-gray-800">{data?.summary.totalViews.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-0.5">Paywall views</p>
                {(data?.summary.totalViews ?? 0) >= 200 && (
                  <p className="text-xs text-green-600 font-semibold mt-1">✅ ≥200 target met</p>
                )}
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                <p className="text-2xl font-extrabold text-gray-800">{data?.summary.totalClicks}</p>
                <p className="text-xs text-gray-500 mt-0.5">CTA clicks</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                <p className={`text-2xl font-extrabold ${data?.summary.meetsTarget ? 'text-green-600' : 'text-amber-600'}`}>
                  {data?.summary.bestCtr?.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Best anchor CTR</p>
                {data?.summary.meetsTarget
                  ? <p className="text-xs text-green-600 font-semibold mt-1">✅ ≥8% target met</p>
                  : <p className="text-xs text-amber-600 mt-1">Target: ≥8%</p>}
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                <p className="text-2xl font-extrabold text-violet-700">
                  ${bestRevenue ? (bestRevenue.revenuePerSession / 100).toFixed(2) : '—'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Revenue / session</p>
                <p className="text-xs text-gray-400 mt-0.5">{ANCHOR_LABELS[bestRevenue?.anchor_id ?? '']?.name ?? '—'}</p>
              </div>
            </div>

            {/* Best anchor call-out */}
            {data?.summary.bestAnchor && (
              <div className={`rounded-2xl p-4 border flex items-center gap-4 ${
                data.summary.meetsTarget
                  ? 'bg-green-50 border-green-200'
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <span className="text-3xl">{ANCHOR_LABELS[data.summary.bestAnchor]?.icon ?? '💰'}</span>
                <div>
                  <p className="font-bold text-gray-800">
                    Best anchor: {ANCHOR_LABELS[data.summary.bestAnchor]?.name ?? data.summary.bestAnchor}{' '}
                    ({ANCHOR_LABELS[data.summary.bestAnchor]?.price ?? ''})
                  </p>
                  <p className="text-sm text-gray-600">
                    {data.summary.bestCtr?.toFixed(1)}% CTR ·{' '}
                    {data.summary.meetsTarget ? '✅ Meets ≥8% success target' : '⚠️ Below 8% target'}
                  </p>
                </div>
              </div>
            )}

            {/* Anchor CTR comparison */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 mb-1">📊 CTR by Price Anchor</h2>
              <p className="text-xs text-gray-500 mb-4">All variants combined · primary metric: cta_click / paywall_view</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {anchorTotals.map((anchor) => {
                  const meta = ANCHOR_LABELS[anchor.anchor_id]
                  const isBest = anchor.anchor_id === data?.summary.bestAnchor
                  return (
                    <div key={anchor.anchor_id}
                      className={`rounded-2xl p-4 border-2 text-center ${
                        isBest ? 'border-violet-400 bg-violet-50' : 'border-gray-100'
                      }`}>
                      <div className="text-3xl mb-1">{meta?.icon ?? '💰'}</div>
                      <p className="font-bold text-gray-800">{meta?.name}</p>
                      <p className="text-gray-500 text-sm">{meta?.price}</p>
                      <div className={`text-4xl font-extrabold mt-2 ${
                        anchor.ctr >= 8 ? 'text-green-600' : isBest ? 'text-violet-700' : 'text-gray-700'
                      }`}>{anchor.ctr.toFixed(1)}%</div>
                      <p className="text-xs text-gray-400 mt-1">
                        {anchor.clicks}/{anchor.views} · ${(anchor.revenuePerSession/100).toFixed(2)}/session
                      </p>
                      {isBest && <p className="text-xs text-violet-600 font-semibold mt-1">⭐ Best CTR</p>}
                      {anchor.ctr >= 8 && <p className="text-xs text-green-600 font-semibold mt-0.5">✅ Meets target</p>}
                    </div>
                  )
                })}
              </div>

              {/* Horizontal bar chart */}
              <div className="space-y-2">
                {anchorTotals.map(anchor => {
                  const meta = ANCHOR_LABELS[anchor.anchor_id]
                  const barPct = Math.min(100, anchor.ctr * 5)  // scale: 20% CTR = full bar
                  return (
                    <div key={anchor.anchor_id} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-28 flex-shrink-0">{meta?.name}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${anchor.ctr >= 8 ? 'bg-green-500' : 'bg-violet-400'}`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold w-14 text-right ${anchor.ctr >= 8 ? 'text-green-700' : 'text-gray-700'}`}>
                        {anchor.ctr.toFixed(1)}%
                      </span>
                    </div>
                  )
                })}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-red-500 w-28 flex-shrink-0">Target (8%)</span>
                  <div className="flex-1 h-0.5 relative">
                    <div className="absolute h-4 border-l-2 border-dashed border-red-400" style={{ left: '40%', top: '-6px' }}/>
                  </div>
                  <span className="text-xs text-red-400 w-14 text-right">8.0%</span>
                </div>
              </div>
            </div>

            {/* A/B variant comparison */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 mb-1">🔬 Layout Variant A/B</h2>
              <p className="text-xs text-gray-500 mb-4">paywall_layout_v1 · A = price-first · B = benefit-first</p>

              <div className="grid grid-cols-2 gap-4">
                {Object.entries(variantTotals).map(([vid, stats]) => {
                  const ctr = stats.views > 0 ? Math.round(1000 * stats.clicks / stats.views) / 10 : 0
                  const isWinner = vid === (variantTotals['A']?.clicks / (variantTotals['A']?.views||1) > variantTotals['B']?.clicks / (variantTotals['B']?.views||1) ? 'A' : 'B')
                  return (
                    <div key={vid} className={`rounded-2xl p-4 border-2 text-center ${
                      isWinner ? 'border-violet-400 bg-violet-50' : 'border-gray-100'
                    }`}>
                      <div className="text-lg font-bold text-gray-700 mb-0.5">
                        Variant {vid} {isWinner && '👑'}
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{VARIANT_LABELS[vid]}</p>
                      <div className={`text-4xl font-extrabold ${isWinner ? 'text-violet-700' : 'text-gray-700'}`}>
                        {ctr.toFixed(1)}%
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{stats.clicks}/{stats.views} conversions</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Granular breakdown table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="font-bold text-gray-800">📋 Breakdown by Anchor × Variant</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-gray-600 font-semibold">Anchor</th>
                      <th className="text-center px-4 py-3 text-gray-600 font-semibold">Variant</th>
                      <th className="text-center px-4 py-3 text-gray-600 font-semibold">Billing</th>
                      <th className="text-center px-4 py-3 text-gray-600 font-semibold">Views</th>
                      <th className="text-center px-4 py-3 text-gray-600 font-semibold">Clicks</th>
                      <th className="text-center px-4 py-3 text-gray-600 font-semibold">CTR</th>
                      <th className="text-center px-4 py-3 text-gray-600 font-semibold">Rev/Session</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(data?.results ?? []).map((r) => {
                      const meta = ANCHOR_LABELS[r.anchor_id]
                      const isBest = r.ctr === data?.summary.bestCtr && r.anchor_id === data?.summary.bestAnchor
                      return (
                        <tr key={r.anchor_id + r.variant_id} className={isBest ? 'bg-violet-50' : 'hover:bg-gray-50/50'}>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span>{meta?.icon}</span>
                              <div>
                                <p className="font-semibold text-gray-800">{meta?.name}</p>
                                <p className="text-xs text-gray-400">{meta?.price}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              r.variant_id === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {r.variant_id} — {VARIANT_LABELS[r.variant_id]}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-500 text-xs">
                            {r.billing === 'monthly' ? '📅 monthly' : '🔁 one-time'}
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-700">{r.views}</td>
                          <td className="px-4 py-2.5 text-center text-gray-700">{r.clicks}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`font-bold ${r.ctr >= 8 ? 'text-green-600' : 'text-gray-700'}`}>
                              {r.ctr.toFixed(1)}%
                              {r.ctr >= 8 && ' ✅'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-600">
                            ${(r.revenuePerSession / 100).toFixed(3)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Revenue model */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 mb-4">📈 Revenue Projections</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {anchorTotals.map(anchor => {
                  const meta = ANCHOR_LABELS[anchor.anchor_id]
                  const priceUSD = anchor.price_cents / 100
                  const rev100 = ((anchor.ctr / 100) * 100 * priceUSD).toFixed(2)
                  const rev1000 = ((anchor.ctr / 100) * 1000 * priceUSD).toFixed(0)
                  return (
                    <div key={anchor.anchor_id} className="bg-gray-50 rounded-xl p-4">
                      <p className="font-semibold text-gray-700 mb-2">{meta?.icon} {meta?.name} @ {anchor.ctr.toFixed(1)}% CTR</p>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>100 sessions → <strong className="text-gray-800">${rev100}</strong></p>
                        <p>1,000 sessions → <strong className="text-gray-800">${rev1000}</strong></p>
                        <p className="text-xs text-gray-400 mt-1">{meta?.price} × CTR × sessions</p>
                      </div>
                    </div>
                  )
                })}
              </div>
              {bestRevenue && (
                <p className="text-xs text-gray-500 mt-3 p-3 bg-violet-50 rounded-xl">
                  💡 Best revenue/session: <strong className="text-violet-700">
                    {ANCHOR_LABELS[bestRevenue.anchor_id]?.name} (${(bestRevenue.revenuePerSession/100).toFixed(3)}/session)
                  </strong> — recommended anchor to optimize for
                </p>
              )}
            </div>

            {/* Live paywall link */}
            <div className="bg-violet-50 rounded-xl p-4 text-xs text-violet-700 border border-violet-100">
              <strong>Live paywall URL:</strong>{' '}
              <code className="bg-violet-100 px-1.5 py-0.5 rounded">
                /create/preview/[sessionId]/paywall?pdf=[pdfUrl]
              </code>
              {' · '}Shown automatically after successful PDF export.
              {' · '}Raw data API: <a href="/api/v1/paywall" target="_blank" className="underline">/api/v1/paywall</a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
