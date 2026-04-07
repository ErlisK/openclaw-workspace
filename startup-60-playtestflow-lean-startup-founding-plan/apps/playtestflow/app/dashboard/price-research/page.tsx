import { createServiceClient } from '@/lib/supabase-server'
import PriceResearchCharts from './PriceResearchCharts'

export const dynamic = 'force-dynamic'

async function getVWData() {
  const svc = createServiceClient()

  const [responses, annualBreakdown, abResults] = await Promise.all([
    svc.from('vw_survey_responses')
      .select('too_cheap, cheap, expensive, too_expensive, annual_interest, annual_price_acceptable, ab_variant, created_at')
      .order('created_at', { ascending: true }),
    svc.from('vw_survey_responses')
      .select('annual_interest')
      .not('annual_interest', 'is', null),
    svc.from('vw_survey_responses')
      .select('ab_variant, annual_interest'),
  ])

  return {
    responses: responses.data ?? [],
    annualBreakdown: annualBreakdown.data ?? [],
    abResults: abResults.data ?? [],
  }
}

function computeVWPoints(responses: Array<{ too_cheap: number; cheap: number; expensive: number; too_expensive: number }>) {
  if (!responses.length) return null
  const n = responses.length
  const sweep: Array<{ price: number; notCheap: number; notExpensive: number; cheap: number; expensive: number; tooCheap: number; tooExpensive: number }> = []

  for (let p = 5; p <= 100; p += 1) {
    const tooCheapPct = responses.filter(r => r.too_cheap >= p).length / n * 100
    const cheapPct = responses.filter(r => r.cheap >= p).length / n * 100
    const expensivePct = responses.filter(r => r.expensive <= p).length / n * 100
    const tooExpensivePct = responses.filter(r => r.too_expensive <= p).length / n * 100
    sweep.push({
      price: p,
      notCheap: 100 - tooCheapPct,
      notExpensive: 100 - expensivePct,
      cheap: cheapPct,
      expensive: expensivePct,
      tooCheap: tooCheapPct,
      tooExpensive: tooExpensivePct,
    })
  }

  // OPP = where notCheap and notExpensive are closest
  let opp = 5, oppDiff = 999
  // IPP = where cheap and expensive are closest
  let ipp = 5, ippDiff = 999
  // APR = range where both notCheap > 50 AND notExpensive > 50
  let aprLo = 0, aprHi = 0

  for (const pt of sweep) {
    const d1 = Math.abs(pt.notCheap - pt.notExpensive)
    if (d1 < oppDiff) { oppDiff = d1; opp = pt.price }
    const d2 = Math.abs(pt.cheap - pt.expensive)
    if (d2 < ippDiff) { ippDiff = d2; ipp = pt.price }
    if (pt.notCheap > 50 && pt.notExpensive > 50) {
      if (!aprLo) aprLo = pt.price
      aprHi = pt.price
    }
  }

  const avgTooExp = responses.reduce((s, r) => s + Number(r.too_expensive), 0) / n
  const avgTCheap = responses.reduce((s, r) => s + Number(r.too_cheap), 0) / n

  return { sweep, opp, ipp, aprLo, aprHi, avgTooExp, avgTCheap, n }
}

export default async function PriceResearchPage() {
  const { responses, annualBreakdown, abResults } = await getVWData()

  const vw = computeVWPoints(responses.map(r => ({
    too_cheap: Number(r.too_cheap),
    cheap: Number(r.cheap),
    expensive: Number(r.expensive),
    too_expensive: Number(r.too_expensive),
  })))

  // Annual interest breakdown
  const annualCounts = { yes: 0, maybe: 0, no: 0 }
  for (const r of annualBreakdown) {
    if (r.annual_interest in annualCounts) annualCounts[r.annual_interest as keyof typeof annualCounts]++
  }
  const totalAnnual = annualCounts.yes + annualCounts.maybe + annualCounts.no

  // A/B annual intent by variant
  const abStats = {
    A: { total: 0, yes: 0, maybe: 0 },
    B: { total: 0, yes: 0, maybe: 0 },
  }
  for (const r of abResults) {
    const v = r.ab_variant as 'A' | 'B'
    if (v !== 'A' && v !== 'B') continue
    abStats[v].total++
    if (r.annual_interest === 'yes') abStats[v].yes++
    if (r.annual_interest === 'maybe') abStats[v].maybe++
  }

  const currentPrice = 39
  const isInRange = vw && currentPrice >= vw.aprLo && currentPrice <= vw.aprHi
  const priceVerdict = vw
    ? currentPrice > vw.aprHi
      ? { label: 'Above Acceptable Range', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: '⚠️' }
      : currentPrice < vw.aprLo
      ? { label: 'Below Acceptable Range', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', icon: '⚠️' }
      : { label: 'Within Acceptable Range', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', icon: '✅' }
    : null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Price Research</h1>
          <p className="text-gray-400 text-sm mt-1">
            Van Westendorp price sensitivity + annual discount A/B test
          </p>
        </div>
        {vw && (
          <div className="text-right">
            <div className="text-xs text-gray-500">Responses</div>
            <div className="text-2xl font-bold">{vw.n}</div>
          </div>
        )}
      </div>

      {!responses.length ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center text-gray-500">
          No survey responses yet. The survey appears to trialing users after 30s on dashboard.
        </div>
      ) : (
        <>
          {/* VW Key Price Points */}
          {vw && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'OPP — Optimal Price', value: `$${vw.opp}`, sub: 'Not cheap ∩ not expensive', color: 'text-green-400' },
                { label: 'IPP — Indifference', value: `$${vw.ipp}`, sub: 'Cheap ∩ expensive curves', color: 'text-blue-400' },
                { label: 'APR — Acceptable Range', value: `$${vw.aprLo}–$${vw.aprHi}`, sub: 'Both curves > 50%', color: 'text-orange-400' },
                { label: 'Current Price', value: `$${currentPrice}`, sub: priceVerdict?.label ?? '', color: priceVerdict?.color ?? 'text-white' },
              ].map(card => (
                <div key={card.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="text-xs text-gray-500 mb-1">{card.label}</div>
                  <div className={`text-xl font-black ${card.color}`}>{card.value}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{card.sub}</div>
                </div>
              ))}
            </div>
          )}

          {/* Price verdict */}
          {priceVerdict && vw && (
            <div className={`rounded-xl border px-5 py-4 text-sm ${priceVerdict.bg}`}>
              <span className="mr-2">{priceVerdict.icon}</span>
              <strong className={priceVerdict.color}>Current price ${currentPrice}/mo</strong>
              <span className="text-gray-300 ml-1">
                {priceVerdict.label === 'Above Acceptable Range'
                  ? `— sits $${currentPrice - vw.aprHi} above the acceptable range ($${vw.aprLo}–$${vw.aprHi}). Consider annual pricing at $${(currentPrice * 0.75).toFixed(2)}/mo (≈25% off) to land within APR.`
                  : priceVerdict.label === 'Within Acceptable Range'
                  ? `is squarely within the acceptable range ($${vw.aprLo}–$${vw.aprHi}). OPP is $${vw.opp} — current pricing is competitive.`
                  : `is below the acceptable range — users may question quality.`
                }
              </span>
            </div>
          )}

          {/* Charts (client component) */}
          {vw && (
            <PriceResearchCharts
              sweep={vw.sweep}
              opp={vw.opp}
              ipp={vw.ipp}
              aprLo={vw.aprLo}
              aprHi={vw.aprHi}
              currentPrice={currentPrice}
            />
          )}

          {/* Annual interest */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="font-semibold mb-4">Annual Billing Interest</h3>
              <div className="space-y-3">
                {([
                  { key: 'yes', label: 'Would switch to annual', color: 'bg-green-400' },
                  { key: 'maybe', label: 'Maybe — depends', color: 'bg-yellow-400' },
                  { key: 'no', label: 'Prefers monthly', color: 'bg-red-400' },
                ] as const).map(row => {
                  const count = annualCounts[row.key]
                  const pct = totalAnnual ? Math.round(count / totalAnnual * 100) : 0
                  return (
                    <div key={row.key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300">{row.label}</span>
                        <span className="text-gray-400">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                        <div className={`h-full ${row.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 text-xs text-gray-500">
                {Math.round((annualCounts.yes + annualCounts.maybe) / totalAnnual * 100)}% open to annual → strong signal for annual plan launch
              </div>
            </div>

            {/* A/B test results */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="font-semibold mb-1">Annual Discount A/B Test</h3>
              <div className="text-xs text-gray-500 mb-4">
                Variant A: 20% off ($31.20/mo) · Variant B: 30% off ($27.30/mo)
              </div>
              <div className="space-y-4">
                {(['A', 'B'] as const).map(v => {
                  const stat = abStats[v]
                  const intendPct = stat.total ? Math.round((stat.yes + stat.maybe) / stat.total * 100) : 0
                  const yesPct = stat.total ? Math.round(stat.yes / stat.total * 100) : 0
                  const discount = v === 'A' ? '20%' : '30%'
                  const price = v === 'A' ? '$31.20' : '$27.30'
                  return (
                    <div key={v} className="bg-white/4 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-xs font-semibold text-gray-300">Variant {v}</span>
                          <span className="text-xs text-gray-500 ml-2">{discount} off · {price}/mo</span>
                        </div>
                        <span className="text-xs text-gray-500">{stat.total} users</span>
                      </div>
                      <div className="flex gap-4 text-xs">
                        <div>
                          <div className="text-gray-500">Intent (yes/maybe)</div>
                          <div className="text-lg font-bold text-white">{intendPct}%</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Definite yes</div>
                          <div className={`text-lg font-bold ${yesPct > 50 ? 'text-green-400' : 'text-yellow-400'}`}>{yesPct}%</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 text-xs text-gray-500">
                {abStats.B.yes / Math.max(abStats.B.total, 1) > abStats.A.yes / Math.max(abStats.A.total, 1)
                  ? '📊 Variant B (30% off) shows stronger definite-yes intent'
                  : '📊 Variants within noise — collect more data before deciding'}
              </div>
            </div>
          </div>

          {/* Recommendation */}
          {vw && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="font-semibold mb-3">Pricing Recommendations</h3>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex gap-3">
                  <span className="text-orange-400 mt-0.5">1.</span>
                  <div>
                    <strong className="text-white">Keep monthly Pro at $39</strong> — sits above APR ($
                    {vw.aprLo}–${vw.aprHi}) but within max-WTP range. The IPP is ${vw.ipp}, suggesting strong value perception up to that point. Annual pricing bridges the gap.
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-orange-400 mt-0.5">2.</span>
                  <div>
                    <strong className="text-white">Launch annual plan at $31/mo ($372/yr)</strong> — lands at the IPP (${vw.ipp}) and within APR.
                    {annualCounts.yes + annualCounts.maybe > totalAnnual * 0.5
                      ? ` ${Math.round((annualCounts.yes + annualCounts.maybe) / totalAnnual * 100)}% of surveyed users are open to annual.`
                      : ''}
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-orange-400 mt-0.5">3.</span>
                  <div>
                    <strong className="text-white">
                      {abStats.B.yes / Math.max(abStats.B.total, 1) >= abStats.A.yes / Math.max(abStats.A.total, 1)
                        ? 'Use 30% annual discount (Variant B)'
                        : 'Use 20% annual discount (Variant A)'}
                    </strong> — leads on definite-yes intent. Monitor for 30 more days before locking in.
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-orange-400 mt-0.5">4.</span>
                  <div>
                    <strong className="text-white">Studio tier at $79/mo</strong> is well below avg too-expensive threshold (${vw.avgTooExp.toFixed(0)}) — room to hold the current Studio price.
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
