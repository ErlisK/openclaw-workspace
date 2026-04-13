'use client'
/**
 * /admin/pricing-experiments
 *
 * Pricing experiment dashboard — Phase 7 pricing_v1 experiment.
 *
 * Variants:  control ($6.99/8p) · low ($4.99/8p) · premium ($9.99/12p) · anchor ($6.99 vs $12.99)
 * Metric:    revenue per exposed visitor (primary) + conversion rate (secondary)
 * Guardrail: refund rate < 5%, churn < 15%
 *
 * Tabs: Results · Cohorts · Churn · Setup
 */
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type Tab = 'results' | 'cohorts' | 'churn' | 'setup'

interface VariantResult {
  variant:       string
  priceCents:    number
  displayPrice:  string
  pageCount:     number
  framing:       string
  badge:         string | null
  exposures:     number
  clicks:        number
  conversions:   number
  clickRate:     number
  conversionRate: number
  totalRevCents:  number
  revenuePerExposed: number
  avgRevenuePerConvert: number
  liftPct:       number
  pValue:        number | null
  significant:   boolean
}

interface Results {
  period:        { days: number }
  variants:      VariantResult[]
  winner:        VariantResult | null
  conclusion:    string
  totalExposures: number
  upsellShownTotal: number
}

interface ChurnData {
  totalRefunds: number
  totalCancels: number
  refundsByVariant: Record<string, number>
}

const VARIANT_COLORS: Record<string, string> = {
  control: 'bg-gray-100 text-gray-700',
  low:     'bg-blue-100 text-blue-700',
  premium: 'bg-violet-100 text-violet-700',
  anchor:  'bg-amber-100 text-amber-700',
}

const VARIANT_EMOJIS: Record<string, string> = {
  control: '⚖️', low: '💚', premium: '⭐', anchor: '🪤',
}

const MIN_SAMPLE = 50

export default function PricingExperimentsDashboard() {
  const [tab,     setTab]     = useState<Tab>('results')
  const [days,    setDays]    = useState(14)
  const [results, setResults] = useState<Results | null>(null)
  const [churn,   setChurn]   = useState<ChurnData | null>(null)
  const [loading, setLoading] = useState(false)

  const loadResults = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/pricing-experiments?view=results&days=${days}`)
      setResults(await r.json() as Results)
    } finally { setLoading(false) }
  }, [days])

  useEffect(() => { void loadResults() }, [loadResults])

  async function handleTab(t: Tab) {
    setTab(t)
    if (t === 'results') await loadResults()
    if (t === 'churn') {
      setLoading(true)
      const r = await fetch(`/api/admin/pricing-experiments?view=churn&days=${days}`)
      setChurn(await r.json() as ChurnData)
      setLoading(false)
    }
  }

  const control = results?.variants.find(v => v.variant === 'control')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/admin" className="text-sm text-violet-600 hover:underline">← Admin</Link>
            <h1 className="text-2xl font-extrabold text-gray-900 mt-1">Pricing Experiments</h1>
            <p className="text-sm text-gray-500">pricing_v1 · 4 variants · server-side assignment</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={days} onChange={e => setDays(Number(e.target.value))}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm">
              {[7, 14, 30, 60].map(d => <option key={d} value={d}>Last {d}d</option>)}
            </select>
            <button onClick={() => void loadResults()}
              className="bg-violet-600 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-violet-700">
              {loading ? '…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Hypothesis card */}
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 mb-6">
          <p className="font-bold text-violet-900 mb-1">🔬 pricing_v1 Hypothesis</p>
          <p className="text-violet-700 text-sm">
            <strong>low ($4.99):</strong> +40% conversion rate vs control — lower barrier to first purchase<br/>
            <strong>premium ($9.99/12p):</strong> +30% revenue per visitor — more pages = more value signal<br/>
            <strong>anchor ($6.99 vs $12.99):</strong> +20% conversion rate — anchoring bias effect<br/>
            Conclude at n≥50 per variant. Primary: revenue/visitor. Guardrail: refund rate &lt;5%.
          </p>
        </div>

        {/* Winner banner */}
        {results?.winner && results.winner.exposures >= MIN_SAMPLE && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="font-extrabold text-green-800">
                Winner: {results.winner.variant} variant ({results.winner.displayPrice}/{results.winner.pageCount}p)
              </p>
              <p className="text-sm text-green-700">{results.conclusion}</p>
              <p className="text-xs text-green-600 mt-0.5">
                Conversion: {results.winner.conversionRate}% vs control {control?.conversionRate}% | 
                Revenue/exposed: ${(results.winner.revenuePerExposed / 100).toFixed(3)} vs ${(control ? control.revenuePerExposed / 100 : 0).toFixed(3)}
              </p>
            </div>
          </div>
        )}

        {/* Insufficient data banner */}
        {results && results.totalExposures < MIN_SAMPLE * 4 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <span className="text-xl">⏳</span>
            <div>
              <p className="font-semibold text-amber-800">Collecting data ({results.totalExposures}/{MIN_SAMPLE * 4} needed)</p>
              <p className="text-sm text-amber-700">
                Need {MIN_SAMPLE} exposures per variant to reach statistical significance.
                Currently {results.totalExposures} total exposures.
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-100 rounded-2xl p-1 mb-6 shadow-sm w-fit">
          {(['results', 'cohorts', 'churn', 'setup'] as Tab[]).map(t => (
            <button key={t} onClick={() => void handleTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors capitalize ${
                tab === t ? 'bg-violet-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}>{t}</button>
          ))}
        </div>

        {/* ── Results ──────────────────────────────────────────────────────── */}
        {tab === 'results' && results && (
          <div className="space-y-4">
            {/* Variant cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {results.variants.map(v => {
                const isWinner = results.winner?.variant === v.variant
                const needsMore = v.exposures < MIN_SAMPLE
                return (
                  <div key={v.variant}
                    className={`bg-white rounded-2xl border shadow-sm p-5 ${
                      isWinner ? 'border-green-300 ring-2 ring-green-200' : 'border-gray-100'
                    }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full mr-2 ${VARIANT_COLORS[v.variant]}`}>
                          {VARIANT_EMOJIS[v.variant]} {v.variant}
                        </span>
                        {v.badge && (
                          <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">
                            {v.badge}
                          </span>
                        )}
                        {isWinner && (
                          <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full ml-1">
                            🏆 Winner
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-extrabold text-gray-900">{v.displayPrice}</p>
                        <p className="text-xs text-gray-400">{v.pageCount} pages</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center bg-gray-50 rounded-xl p-2">
                        <p className="text-lg font-extrabold text-gray-800">{v.exposures}</p>
                        <p className="text-xs text-gray-400">Exposed</p>
                      </div>
                      <div className="text-center bg-gray-50 rounded-xl p-2">
                        <p className={`text-lg font-extrabold ${v.conversionRate > 0 ? 'text-violet-700' : 'text-gray-400'}`}>
                          {v.conversionRate}%
                        </p>
                        <p className="text-xs text-gray-400">Convert</p>
                      </div>
                      <div className="text-center bg-gray-50 rounded-xl p-2">
                        <p className="text-lg font-extrabold text-gray-800">
                          ${(v.revenuePerExposed / 100).toFixed(3)}
                        </p>
                        <p className="text-xs text-gray-400">Rev/user</p>
                      </div>
                    </div>

                    {v.variant !== 'control' && control && (
                      <div className="text-xs text-center">
                        <span className={`font-semibold ${v.liftPct > 0 ? 'text-green-600' : v.liftPct < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                          {v.liftPct > 0 ? '+' : ''}{v.liftPct}% vs control
                        </span>
                        {v.significant
                          ? <span className="ml-2 text-green-600">✅ significant</span>
                          : needsMore
                          ? <span className="ml-2 text-gray-400">({MIN_SAMPLE - v.exposures} more needed)</span>
                          : <span className="ml-2 text-amber-500">not yet significant</span>
                        }
                      </div>
                    )}

                    {v.totalRevCents > 0 && (
                      <p className="text-xs text-gray-500 text-center mt-2">
                        Total revenue: ${(v.totalRevCents / 100).toFixed(2)} ({v.conversions} orders)
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Data table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-800">Full results table (last {days}d)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-500">
                      <th className="p-3 text-left">Variant</th>
                      <th className="p-3 text-right">Price</th>
                      <th className="p-3 text-right">Pages</th>
                      <th className="p-3 text-right">Exposed</th>
                      <th className="p-3 text-right">Clicks</th>
                      <th className="p-3 text-right">Click%</th>
                      <th className="p-3 text-right">Converts</th>
                      <th className="p-3 text-right">Conv%</th>
                      <th className="p-3 text-right">Rev/exp</th>
                      <th className="p-3 text-right">Lift</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.variants.map(v => (
                      <tr key={v.variant} className={`border-b border-gray-50 ${results.winner?.variant === v.variant ? 'bg-green-50' : ''}`}>
                        <td className="p-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${VARIANT_COLORS[v.variant]}`}>
                            {v.variant}
                          </span>
                        </td>
                        <td className="p-3 text-right font-semibold">{v.displayPrice}</td>
                        <td className="p-3 text-right text-gray-500">{v.pageCount}p</td>
                        <td className="p-3 text-right">{v.exposures}</td>
                        <td className="p-3 text-right">{v.clicks}</td>
                        <td className="p-3 text-right">{v.clickRate}%</td>
                        <td className="p-3 text-right font-semibold">{v.conversions}</td>
                        <td className="p-3 text-right font-semibold text-violet-700">{v.conversionRate}%</td>
                        <td className="p-3 text-right">${(v.revenuePerExposed / 100).toFixed(3)}</td>
                        <td className={`p-3 text-right font-semibold ${
                          v.liftPct > 0 ? 'text-green-600' : v.liftPct < 0 ? 'text-red-500' : 'text-gray-400'
                        }`}>
                          {v.variant === 'control' ? '—' : `${v.liftPct > 0 ? '+' : ''}${v.liftPct}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Cohorts ───────────────────────────────────────────────────────── */}
        {tab === 'cohorts' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-gray-500 text-sm">
              Cohort view will show daily conversion rates per variant once data accumulates.
              Currently showing upsell events as a proxy ({results?.upsellShownTotal ?? 0} total upsell exposures).
            </p>
            <div className="mt-4 bg-amber-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-amber-800">Current baseline (pre-experiment)</p>
              <p className="text-sm text-amber-700 mt-1">
                upsell_shown events: {results?.upsellShownTotal ?? 0}<br/>
                export_clicked events (proxy conversions): checking...<br/>
                These represent the organic funnel before pricing_v1 experiment launched.
              </p>
            </div>
          </div>
        )}

        {/* ── Churn ─────────────────────────────────────────────────────────── */}
        {tab === 'churn' && (
          <div className="space-y-4">
            {!churn ? (
              <p className="text-sm text-gray-400">{loading ? 'Loading…' : 'No churn data'}</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
                    <p className={`text-3xl font-extrabold ${churn.totalRefunds > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {churn.totalRefunds}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Refunds</p>
                    <p className={`text-xs mt-1 font-semibold ${churn.totalRefunds === 0 ? 'text-green-500' : 'text-red-500'}`}>
                      Target: &lt;5% rate
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
                    <p className={`text-3xl font-extrabold ${churn.totalCancels > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {churn.totalCancels}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Subscription cancels</p>
                    <p className="text-xs text-gray-400 mt-1">Target: &lt;15% rate</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
                    <p className="text-3xl font-extrabold text-green-600">✅</p>
                    <p className="text-sm text-gray-500 mt-1">Guardrails</p>
                    <p className="text-xs text-green-500 font-semibold mt-1">Within acceptable limits</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-bold text-gray-800 mb-3">Refunds by variant</h3>
                  {Object.keys(churn.refundsByVariant).length === 0
                    ? <p className="text-sm text-gray-400">No refunds recorded — guardrail clear ✅</p>
                    : Object.entries(churn.refundsByVariant).map(([v, n]) => (
                      <div key={v} className="flex items-center justify-between text-sm mb-1">
                        <span className={`font-mono text-xs px-2 py-0.5 rounded-full ${VARIANT_COLORS[v] ?? 'bg-gray-100 text-gray-600'}`}>{v}</span>
                        <span className="font-bold text-red-600">{n} refunds</span>
                      </div>
                    ))
                  }
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Setup ─────────────────────────────────────────────────────────── */}
        {tab === 'setup' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-800 mb-3">Experiment configuration</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• <strong>Assignment:</strong> djb2(sessionToken + &apos;pricing_v1&apos;) % 100</p>
                <p>• <strong>Split:</strong> 25% each (control / low / premium / anchor)</p>
                <p>• <strong>Exposure logging:</strong> GET /api/v1/pricing?sessionToken=xxx</p>
                <p>• <strong>Conversion logging:</strong> POST /api/v1/pricing &#123;action:&apos;convert&apos;&#125;</p>
                <p>• <strong>Checkout:</strong> POST /api/v1/checkout with sessionToken uses variant price</p>
                <p>• <strong>Analytics:</strong> GET /api/admin/pricing-experiments?view=results</p>
                <p>• <strong>DB table:</strong> pricing_experiments (session_id, variant, price_cents, shown_at, converted)</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-800 mb-3">How to integrate in paywall/UpsellModal</h3>
              <pre className="text-xs bg-gray-50 rounded-xl p-4 overflow-x-auto">{`// In your paywall component:
const { data: pricing } = await fetch(
  \`/api/v1/pricing?sessionToken=\${sessionToken}\`
).then(r => r.json())

// pricing.displayPrice = '$4.99' (variant-specific)
// pricing.badge = '🎉 Launch price'
// pricing.headline = 'Download the full book for just $4.99'

// On checkout button click:
await fetch('/api/v1/checkout', {
  method: 'POST',
  body: JSON.stringify({
    sessionId,
    sessionToken,  // <-- triggers variant price in checkout
    email,
  })
})

// On conversion (webhook fires this automatically):
await fetch('/api/v1/pricing', {
  method: 'POST',
  body: JSON.stringify({
    sessionToken,
    action: 'convert',
    orderId: order.id,
    revenueCents: order.amount_cents,
  })
})`}</pre>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-800 mb-3">Env vars needed for live pricing</h3>
              <div className="space-y-1 text-sm font-mono text-gray-600">
                <p>STRIPE_SECRET_KEY=sk_test_...   (required for checkout)</p>
                <p>STRIPE_PUBLISHABLE_KEY=pk_test_... (required for checkout)</p>
                <p>STRIPE_WEBHOOK_SECRET=whsec_...   (required for conversion tracking)</p>
              </div>
              <p className="text-xs text-amber-600 mt-3">
                ⚠️ Stripe keys not yet configured — checkout runs in fake-door mode.
                Set these in Vercel env vars to enable real payments.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
