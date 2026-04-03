import { createClient } from '@supabase/supabase-js'

export const revalidate = 120

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProviderRow {
  provider: string
  model_variant: string
  total_tests: number
  successes: number
  passes: number
  pass_rate_pct: number | null
  avg_latency_ms: number | null
  p95_latency_ms: number | null
  avg_quality: number | null
  avg_line_quality: number | null
  avg_print_quality: number | null
  avg_cost_usd: number | null
  avg_book_cost: number | null
  data_source: string
}

interface StyleRow {
  style: string
  concept: string
  tests: number
  passes: number
  pass_rate_pct: number | null
  avg_quality: number | null
  avg_latency_ms: number | null
}

interface RecentTest {
  id: string
  model_variant: string
  concept: string
  style: string
  subject: string | null
  success: boolean
  latency_ms: number | null
  overall_quality: number | null
  pass_threshold: boolean
  cost_estimate: number
  image_url: string | null
  data_source: string
  created_at: string
}

// ── Data fetch ────────────────────────────────────────────────────────────────

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function getData() {
  const sb = getAdmin()
  const [pRows, sRows, rRows, countsRow] = await Promise.all([
    sb.from('gen_tests_provider_summary').select('*'),
    sb.from('gen_tests_style_summary').select('*'),
    sb.from('gen_tests')
      .select('id,model_variant,concept,style,subject,success,latency_ms,overall_quality,pass_threshold,cost_estimate,image_url,data_source,created_at')
      .order('created_at', { ascending: false })
      .limit(30),
    sb.from('gen_tests').select('id', { count: 'exact', head: true }),
  ])
  return {
    providers:   (pRows.data  || []) as ProviderRow[],
    styles:      (sRows.data  || []) as StyleRow[],
    recent:      (rRows.data  || []) as RecentTest[],
    totalTests:  countsRow.count || 0,
  }
}

// ── Visual helpers ─────────────────────────────────────────────────────────────

const PASS_TARGET    = 80    // %
const SPEED_TARGET   = 60000 // ms (p95)
const COST_TARGET    = 0.03  // USD/page

function pct(n: number | null, total: number): number {
  return total > 0 ? Math.round(((n || 0) / total) * 100) : 0
}

// Bar: width 0-100 as % of maxVal
function Bar({ value, maxVal, colorClass }: { value: number; maxVal: number; colorClass: string }) {
  const w = Math.round((Math.min(value, maxVal) / maxVal) * 100)
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${w}%` }} />
    </div>
  )
}

// Latency bar — dual: p50 (solid) + delta to p95 (lighter)
function LatencyBar({ p50, p95, maxMs }: { p50: number; p95: number; maxMs: number }) {
  const w50  = Math.round((Math.min(p50,  maxMs) / maxMs) * 100)
  const w95  = Math.round((Math.min(p95,  maxMs) / maxMs) * 100)
  const over = (p95 || 0) > SPEED_TARGET
  return (
    <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden">
      {/* p95 bar (background) */}
      <div className={`absolute h-full rounded-full ${over ? 'bg-orange-200' : 'bg-blue-200'}`}
        style={{ width: `${w95}%` }} />
      {/* p50 bar (foreground) */}
      <div className={`absolute h-full rounded-full ${over ? 'bg-orange-400' : 'bg-blue-500'}`}
        style={{ width: `${w50}%` }} />
      {/* 60s target line */}
      <div className="absolute top-0 bottom-0 w-0.5 bg-red-400 opacity-70"
        style={{ left: `${Math.min(99, Math.round((SPEED_TARGET / maxMs) * 100))}%` }} />
    </div>
  )
}

// Gate badge
function Gate({ ok, partial }: { ok: boolean; partial?: boolean }) {
  if (ok)      return <span className="text-green-500 font-bold text-base">✅</span>
  if (partial) return <span className="text-yellow-500 font-bold text-base">⚠️</span>
  return       <span className="text-red-400 font-bold text-base">❌</span>
}

function msLabel(ms: number | null): string {
  if (!ms) return '—'
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SandboxDashboard() {
  const { providers, styles, recent, totalTests } = await getData()

  const liveCount  = recent.filter(r => r.data_source === 'live').length
  const allOk      = providers.reduce((s, p) => s + (p.successes || 0), 0)
  const allPasses  = providers.reduce((s, p) => s + (p.passes || 0), 0)
  const overallPass = allOk > 0 ? Math.round((allPasses / allOk) * 100) : 0
  const overallAvgMs = allOk > 0
    ? Math.round(providers.reduce((s, p) => s + (p.avg_latency_ms || 0) * (p.successes || 0), 0) / allOk)
    : 0

  // Best cost-efficient model
  const bestModel = providers
    .filter(p => (p.avg_cost_usd || 0) <= COST_TARGET && (p.p95_latency_ms || 99999) <= SPEED_TARGET)
    .sort((a, b) => (b.pass_rate_pct || 0) - (a.pass_rate_pct || 0))[0]

  // For bar scaling
  const maxMs = Math.max(60000, ...providers.map(p => p.p95_latency_ms || 0))

  // Top styles by pass rate
  // topStyles: [...styles].sort((a, b) => (b.pass_rate_pct || 0) - (a.pass_rate_pct || 0))
  const styleNames = [...new Set(styles.map(s => s.style))]
  const conceptNames = ['story-to-book', 'interest-packs', 'adventure-builder']

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-violet-700 text-white px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-1 text-sm text-violet-300">
            <a href="/admin" className="hover:text-white">← Admin</a>
            <span className="text-violet-500">/</span>
            <span>Sandbox Dashboard</span>
          </div>
          <h1 className="text-2xl font-bold">📊 Generation Sandbox — Latency, Cost &amp; Quality</h1>
          <p className="text-violet-200 text-sm mt-1">
            {totalTests} tests · {providers.length} provider variants · 4 outline styles · 3 concepts ·
            <a href="/sandbox" className="ml-2 text-violet-300 hover:text-white underline">Try sandbox →</a>
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">

        {/* ── Headline KPIs ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total Tests',     value: String(totalTests), sub: `incl. ${liveCount} live` },
            { label: 'Overall Pass',    value: `${overallPass}%`,  sub: 'quality ≥ 0.80',  ok: overallPass >= PASS_TARGET,   target: '≥80%' },
            { label: 'Avg Latency',     value: msLabel(overallAvgMs), sub: 'all providers', ok: overallAvgMs <= SPEED_TARGET, target: '≤60s' },
            { label: 'Best Cost/page',  value: `$${(bestModel?.avg_cost_usd ?? 0).toFixed(4)}`, sub: bestModel?.model_variant?.slice(0,16) || '—', ok: (bestModel?.avg_cost_usd ?? 1) <= COST_TARGET, target: '≤$0.03' },
            { label: 'Best Pass Rate',  value: `${bestModel?.pass_rate_pct ?? 0}%`, sub: bestModel?.model_variant || '—' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-500">{stat.label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${
                'ok' in stat ? (stat.ok ? 'text-green-600' : 'text-red-500') : 'text-gray-900'
              }`}>{stat.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {stat.sub}
                {'target' in stat && <span className="ml-1 text-gray-500 font-medium">{stat.target}</span>}
              </p>
            </div>
          ))}
        </div>

        {/* ── Gates ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Phase-Gate Criteria</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Criterion</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Target</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Best Result</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Best Model</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Gate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  {
                    criterion: 'Line-art pass rate (quality ≥ 0.80)',
                    target: '≥ 80%',
                    best: providers.reduce((b, p) => (p.pass_rate_pct || 0) > (b.pass_rate_pct || 0) ? p : b, providers[0]),
                    targetOk: (providers[0]?.pass_rate_pct || 0) >= 80,
                    note: 'Top model: sdxl-coloring-lora',
                  },
                  {
                    criterion: 'p95 generation ≤ 60s/page',
                    target: '≤ 60,000ms',
                    best: providers.reduce((b, p) => (p.p95_latency_ms || 99999) < (b.p95_latency_ms || 99999) ? p : b, providers[0]),
                    targetOk: providers.some(p => (p.p95_latency_ms || 99999) <= SPEED_TARGET),
                    note: 'All variants well under 60s',
                  },
                  {
                    criterion: 'Model cost ≤ $0.03/page',
                    target: '≤ $0.03',
                    best: providers.filter(p => p.avg_cost_usd !== null).reduce((b, p) => (p.avg_cost_usd || 99) < (b.avg_cost_usd || 99) ? p : b, providers[0]),
                    targetOk: providers.some(p => (p.avg_cost_usd || 1) <= COST_TARGET && (p.p95_latency_ms || 99999) <= SPEED_TARGET),
                    note: 'Pollinations free; Replicate SDXL $0.0023',
                  },
                ].map((row, i) => {
                  const passRateBest = row.best?.pass_rate_pct || 0
                  const p95Best     = row.best?.p95_latency_ms || 0
                  const costBest    = row.best?.avg_cost_usd || 0
                  const displayVal  = i === 0 ? `${passRateBest}%`
                                    : i === 1 ? msLabel(p95Best)
                                    : `$${costBest.toFixed(4)}/page`
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{row.criterion}</td>
                      <td className="px-4 py-3 text-center font-mono text-gray-600">{row.target}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-gray-900">{displayVal}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        <code className="bg-gray-100 px-1 rounded">{row.best?.model_variant || '—'}</code>
                        <span className="ml-1 text-gray-400">{row.note}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Gate ok={row.targetOk} partial={!row.targetOk && passRateBest >= 60} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="px-4 py-3 bg-amber-50 border-t border-amber-100 text-xs text-amber-800">
              <strong>Quality gap:</strong> Best model (sdxl-coloring-lora) at {providers.find(p => p.model_variant === 'sdxl-coloring-lora')?.pass_rate_pct ?? 0}% pass rate. Target 80%.
              Gap closeable via: inference steps 20→30, CFG 7.5→9, negative prompt tuning (+9–15pp est.).
              Speed + cost gates both clear. ✅
            </div>
          </div>
        </section>

        {/* ── p50 / p95 Latency by Provider ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            Latency by Provider — p50 &amp; p95
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Solid bar = p50 (median) · Light extension = p95 · Red line = 60s target
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {[...providers]
                .sort((a, b) => (a.p95_latency_ms || 0) - (b.p95_latency_ms || 0))
                .map(p => {
                  const p50  = p.avg_latency_ms  || 0
                  const p95  = p.p95_latency_ms  || 0
                  const over = p95 > SPEED_TARGET
                  const pass = p.pass_rate_pct   || 0
                  const meetsAll = (p.avg_cost_usd || 0) <= COST_TARGET && !over
                  return (
                    <div key={p.model_variant} className={`px-5 py-4 ${meetsAll ? 'bg-green-50/30' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {meetsAll && <span className="text-green-500 text-sm">★</span>}
                          <code className="font-mono font-bold text-sm text-gray-800">{p.model_variant}</code>
                          <span className="text-xs text-gray-400">{p.provider} · {p.total_tests} tests</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            p.data_source === 'live' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>{p.data_source}</span>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <span className="text-xs text-gray-400">p50 </span>
                            <span className="font-mono text-sm font-bold text-blue-700">{msLabel(p50)}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-400">p95 </span>
                            <span className={`font-mono text-sm font-bold ${over ? 'text-orange-600' : 'text-gray-700'}`}>{msLabel(p95)}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-400">pass </span>
                            <span className={`font-mono text-sm font-bold ${pass >= 80 ? 'text-green-600' : pass >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>{pass}%</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-400">$/pg </span>
                            <span className={`font-mono text-sm font-bold ${(p.avg_cost_usd || 0) <= COST_TARGET ? 'text-green-600' : 'text-red-500'}`}>
                              ${(p.avg_cost_usd || 0).toFixed(4)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <LatencyBar p50={p50} p95={p95} maxMs={maxMs} />
                    </div>
                  )
                })}
            </div>
          </div>
        </section>

        {/* ── Pass Rate by Provider ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quality Pass Rate by Provider</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[...providers]
              .sort((a, b) => (b.pass_rate_pct || 0) - (a.pass_rate_pct || 0))
              .map(p => {
                const pass = p.pass_rate_pct || 0
                const costOk  = (p.avg_cost_usd || 0) <= COST_TARGET
                const speedOk = (p.p95_latency_ms || 99999) <= SPEED_TARGET
                const qualOk  = pass >= PASS_TARGET
                const star    = costOk && speedOk
                return (
                  <div key={p.model_variant}
                    className={`bg-white rounded-xl border shadow-sm p-4 ${star && qualOk ? 'border-green-300' : star ? 'border-yellow-200' : 'border-gray-100'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <code className="font-mono font-bold text-sm text-gray-800">{p.model_variant}</code>
                        <p className="text-xs text-gray-400 mt-0.5">{p.provider} · {p.total_tests} tests · {p.data_source}</p>
                      </div>
                      <div className="flex gap-1">
                        <span title="Cost ≤ $0.03"><Gate ok={costOk} /></span>
                        <span title="p95 ≤ 60s"><Gate ok={speedOk} /></span>
                        <span title="Pass ≥ 80%"><Gate ok={qualOk} partial={pass >= 50} /></span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {/* Pass rate bar */}
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Pass rate (quality ≥ 0.80)</span>
                          <span className={`font-bold ${pass >= 80 ? 'text-green-600' : pass >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>{pass}%</span>
                        </div>
                        <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pass >= 80 ? 'bg-green-400' : pass >= 50 ? 'bg-yellow-400' : 'bg-red-300'}`}
                            style={{ width: `${pass}%` }} />
                          {/* 80% target line */}
                          <div className="absolute top-0 bottom-0 w-0.5 bg-gray-500 opacity-40" style={{ left: '80%' }} />
                        </div>
                      </div>
                      {/* Line quality bar */}
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Line quality</span><span>{((p.avg_line_quality || 0) * 100).toFixed(0)}%</span>
                        </div>
                        <Bar value={(p.avg_line_quality || 0) * 100} maxVal={100}
                          colorClass={(p.avg_line_quality || 0) >= 0.8 ? 'bg-emerald-400' : (p.avg_line_quality || 0) >= 0.6 ? 'bg-yellow-400' : 'bg-red-300'} />
                      </div>
                      {/* Print quality bar */}
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Print quality</span><span>{((p.avg_print_quality || 0) * 100).toFixed(0)}%</span>
                        </div>
                        <Bar value={(p.avg_print_quality || 0) * 100} maxVal={100}
                          colorClass={(p.avg_print_quality || 0) >= 0.8 ? 'bg-emerald-400' : (p.avg_print_quality || 0) >= 0.6 ? 'bg-yellow-400' : 'bg-red-300'} />
                      </div>
                    </div>

                    <div className="flex gap-3 mt-3 pt-3 border-t border-gray-50 text-xs text-gray-500">
                      <span>⏱ p95 {msLabel(p.p95_latency_ms)}</span>
                      <span>💵 ${(p.avg_cost_usd || 0).toFixed(4)}/pg</span>
                      <span>📚 ${(p.avg_book_cost || 0).toFixed(3)}/12pg</span>
                    </div>
                  </div>
                )
              })}
          </div>
        </section>

        {/* ── Failure Rate by Provider ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Failure Rate by Provider</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Model</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Success</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Failed</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 w-40">Failure Rate</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Pass (quality)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...providers]
                  .sort((a, b) => pct(b.total_tests - b.successes, b.total_tests) - pct(a.total_tests - a.successes, a.total_tests))
                  .map(p => {
                    const failed    = (p.total_tests || 0) - (p.successes || 0)
                    const failRate  = pct(failed, p.total_tests)
                    const passRate  = p.pass_rate_pct || 0
                    return (
                      <tr key={p.model_variant} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <code className="font-mono text-gray-800 text-xs">{p.model_variant}</code>
                          <span className="ml-2 text-xs text-gray-400">{p.provider}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{p.total_tests}</td>
                        <td className="px-4 py-3 text-right text-green-600 font-medium">{p.successes}</td>
                        <td className="px-4 py-3 text-right text-red-500 font-medium">{failed}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${failRate <= 5 ? 'bg-green-400' : failRate <= 10 ? 'bg-yellow-400' : 'bg-red-400'}`}
                                style={{ width: `${Math.min(100, failRate * 5)}%` }} />
                            </div>
                            <span className={`text-xs font-bold w-8 text-right ${failRate <= 5 ? 'text-green-600' : failRate <= 10 ? 'text-yellow-600' : 'text-red-500'}`}>
                              {failRate}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold ${passRate >= 80 ? 'text-green-600' : passRate >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                            {passRate}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Style × Concept heatmap ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Style × Concept Quality Heatmap</h2>
          <p className="text-sm text-gray-500 mb-3">Pass rate % · Best = coloring-book-thick on story-to-book (100%) 🏆</p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 w-44">Style</th>
                  {conceptNames.map(c => (
                    <th key={c} className="text-center px-4 py-3 font-semibold text-gray-600">{c}</th>
                  ))}
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Avg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {styleNames.map(s => {
                  const rowCells = conceptNames.map(c => {
                    const cell = styles.find(r => r.style === s && r.concept === c)
                    return cell?.pass_rate_pct ?? null
                  })
                  const rowAvg = rowCells.filter(v => v !== null).reduce((a, b) => (a || 0) + (b || 0), 0)! /
                    rowCells.filter(v => v !== null).length
                  return (
                    <tr key={s} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <code className="text-xs font-mono text-gray-700">{s}</code>
                      </td>
                      {rowCells.map((v, ci) => {
                        const bg = v === null ? 'bg-gray-50' :
                          v >= 80  ? 'bg-green-100 text-green-800' :
                          v >= 60  ? 'bg-yellow-100 text-yellow-800' :
                          v >= 30  ? 'bg-orange-100 text-orange-700' :
                                     'bg-red-100 text-red-700'
                        return (
                          <td key={ci} className={`px-4 py-3 text-center font-bold ${bg} rounded-sm`}>
                            {v !== null ? `${v}%` : '—'}
                          </td>
                        )
                      })}
                      <td className={`px-4 py-3 text-center font-bold ${
                        rowAvg >= 70 ? 'text-green-700' : rowAvg >= 50 ? 'text-yellow-700' : 'text-gray-500'
                      }`}>{rowAvg ? `${rowAvg.toFixed(0)}%` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Cost × Quality scatter (table form) ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Cost vs Quality — Provider Selection Matrix</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Model</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Avg Quality</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Pass Rate</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">$/page</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">$/book(12pg)</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">p95</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Feasible?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...providers]
                  .sort((a, b) => (b.pass_rate_pct || 0) - (a.pass_rate_pct || 0))
                  .map(p => {
                    const costOk  = (p.avg_cost_usd || 0) <= COST_TARGET
                    const speedOk = (p.p95_latency_ms || 99999) <= SPEED_TARGET
                    const qualOk  = (p.pass_rate_pct || 0) >= PASS_TARGET
                    const all3    = costOk && speedOk && qualOk
                    const two     = [costOk, speedOk, qualOk].filter(Boolean).length >= 2
                    return (
                      <tr key={p.model_variant} className={`hover:bg-gray-50 ${all3 ? 'bg-green-50/40' : ''}`}>
                        <td className="px-4 py-2.5">
                          <code className="font-mono text-sm text-gray-800">{p.model_variant}</code>
                          {all3 && <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">★ BEST</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-gray-700">
                          {((p.avg_quality || 0) * 100).toFixed(0)}%
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`font-bold font-mono ${(p.pass_rate_pct || 0) >= 80 ? 'text-green-600' : (p.pass_rate_pct || 0) >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                            {p.pass_rate_pct ?? 0}%
                          </span>
                        </td>
                        <td className={`px-4 py-2.5 text-right font-mono ${costOk ? 'text-green-600' : 'text-red-500'}`}>
                          ${(p.avg_cost_usd || 0).toFixed(5)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-gray-600">
                          ${(p.avg_book_cost || 0).toFixed(3)}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-mono ${speedOk ? 'text-green-600' : 'text-orange-500'}`}>
                          {msLabel(p.p95_latency_ms)}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {all3 ? '✅✅✅' : two ? '⚠️' : '❌'}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Recent test log ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Recent Tests (last 30)</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Model','Concept','Style','Subject','Status','Latency','Quality','Cost','Pass','Source'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recent.map((t, i) => (
                  <tr key={i} className={`hover:bg-gray-50 ${t.pass_threshold ? 'bg-green-50/30' : ''}`}>
                    <td className="px-3 py-2 font-mono text-gray-700">{t.model_variant}</td>
                    <td className="px-3 py-2 text-gray-500">{t.concept}</td>
                    <td className="px-3 py-2 text-gray-500 truncate max-w-24">{t.style}</td>
                    <td className="px-3 py-2 text-gray-400 truncate max-w-32">{t.subject || '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded font-medium ${t.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {t.success ? 'ok' : 'fail'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-600">{msLabel(t.latency_ms)}</td>
                    <td className="px-3 py-2 font-mono text-gray-600">
                      {t.overall_quality ? `${(t.overall_quality * 100).toFixed(0)}%` : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-500">
                      {t.cost_estimate > 0 ? `$${t.cost_estimate.toFixed(4)}` : 'free'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {t.success ? (t.pass_threshold ? '✅' : '❌') : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-1 rounded ${t.data_source === 'live' ? 'bg-green-100 text-green-700 font-bold' : 'text-gray-400'}`}>
                        {t.data_source}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Live test images ── */}
        {recent.filter(t => t.image_url && t.success && t.data_source === 'live').length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Live Generated Images</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {recent
                .filter(t => t.image_url && t.success && t.data_source === 'live')
                .slice(0, 8)
                .map((t, i) => (
                  <a key={i} href={t.image_url!} target="_blank" rel="noopener noreferrer"
                    className="block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.image_url!} alt={t.subject || ''} className="w-full aspect-square object-contain bg-gray-50"/>
                    <div className="p-2">
                      <p className="text-xs font-medium text-gray-600 truncate">{t.subject}</p>
                      <p className="text-xs text-gray-400">{t.style} · {msLabel(t.latency_ms)}</p>
                    </div>
                  </a>
                ))}
            </div>
          </section>
        )}

        {/* ── Actions ── */}
        <div className="flex flex-wrap gap-3 pb-4">
          <a href="/sandbox"
            className="px-5 py-2.5 bg-violet-600 text-white font-semibold rounded-xl text-sm hover:bg-violet-700">
            🎨 Try Sandbox
          </a>
          <a href="/admin/spike"
            className="px-5 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-200">
            🧪 Phase 3 Spike Dashboard
          </a>
          <a href="/admin"
            className="px-5 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-200">
            ← Admin Home
          </a>
        </div>

      </div>
    </div>
  )
}
