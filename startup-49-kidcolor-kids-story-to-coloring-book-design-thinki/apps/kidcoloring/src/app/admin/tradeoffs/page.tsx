import { createClient } from '@supabase/supabase-js'

export const revalidate = 300

// ── Types ─────────────────────────────────────────────────────────────────────
interface ConceptEval {
  concept: string; dimension: string; score: number; weight: number
  evidence: string | null; detail: string | null
}
interface ProviderTradeoff {
  model_variant: string; provider: string
  meets_cost_target: boolean; meets_speed_target: boolean; meets_quality_target: boolean
  quality_score: number; cost_score: number; speed_score: number
  safety_score: number; ops_score: number; weighted_total: number
  pass_rate_pct: number; p95_latency_ms: number
  cost_per_page_usd: number; cost_per_book_usd: number
  safety_model: string; vendor_risk: string; prod_readiness: string
  recommendation: string; rationale: string
}
interface StyleQuality {
  style: string; concept: string; pass_rate_pct: number | null
  avg_latency_ms: number | null; tests: number
}

// ── Data ─────────────────────────────────────────────────────────────────────
function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function getTradeoffData() {
  const sb = getAdmin()
  const [ce, pt, sq] = await Promise.all([
    sb.from('concept_evaluations').select('*').order('concept').order('dimension'),
    sb.from('provider_tradeoffs').select('*').order('weighted_total', { ascending: false }),
    sb.from('gen_tests_style_summary').select('*').order('pass_rate_pct', { ascending: false }),
  ])
  return {
    evals:     (ce.data || []) as ConceptEval[],
    providers: (pt.data || []) as ProviderTradeoff[],
    styles:    (sq.data || []) as StyleQuality[],
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const CONCEPTS    = ['story-to-book', 'interest-packs', 'adventure-builder'] as const
const DIMENSIONS  = ['quality','cost','safety','complexity','differentiation','time_to_mvp'] as const
const DIM_LABELS: Record<string, string> = {
  quality: '⭐ Quality', cost: '💵 Cost', safety: '🔒 Safety',
  complexity: '🔧 Ease', differentiation: '🎯 Differentiation', time_to_mvp: '⚡ Speed to MVP',
}
const DIM_WEIGHTS: Record<string, number> = {
  quality: 0.25, cost: 0.15, safety: 0.25,
  complexity: 0.15, differentiation: 0.10, time_to_mvp: 0.10,
}
const CONCEPT_META: Record<string, { emoji: string; color: string; badge: string; bgClass: string; borderClass: string }> = {
  'story-to-book':     { emoji: '📖', color: 'violet', badge: '★ PRIMARY',    bgClass: 'bg-violet-50', borderClass: 'border-violet-300' },
  'interest-packs':    { emoji: '🎯', color: 'blue',   badge: '⚡ FAST TRACK', bgClass: 'bg-blue-50',   borderClass: 'border-blue-300' },
  'adventure-builder': { emoji: '⚔️',  color: 'orange', badge: 'DEFERRED → Phase 4', bgClass: 'bg-orange-50', borderClass: 'border-orange-200' },
}
const CONCEPT_DECISIONS: Record<string, string> = {
  'story-to-book': 'CHOSEN: Build in Sprint 3–4 on top of Interest Packs pipeline.',
  'interest-packs': 'CHOSEN: Build first in Sprint 1–2 to validate pipeline + pricing.',
  'adventure-builder': 'DEFERRED: Phase 4 subscription product. Too complex for MVP.',
}

function ScoreBar({ score, max = 10, colorClass }: { score: number; max?: number; colorClass: string }) {
  const w = Math.round((score / max) * 100)
  return (
    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${w}%` }} />
    </div>
  )
}

function scoreColor(score: number): string {
  if (score >= 8) return 'text-green-700'
  if (score >= 6) return 'text-yellow-700'
  return 'text-red-600'
}
function barColor(score: number): string {
  if (score >= 8) return 'bg-green-400'
  if (score >= 6) return 'bg-yellow-400'
  return 'bg-red-300'
}
function msLabel(ms: number | null): string {
  if (!ms) return '—'
  return `${(ms / 1000).toFixed(1)}s`
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function TradeoffsPage() {
  const { evals, providers, styles } = await getTradeoffData()

  // Build weighted totals from evals
  const conceptScores: Record<string, Record<string, number>> = {}
  for (const e of evals) {
    if (!conceptScores[e.concept]) conceptScores[e.concept] = {}
    conceptScores[e.concept][e.dimension] = e.score
  }
  const conceptTotals: Record<string, number> = {}
  for (const c of CONCEPTS) {
    let total = 0
    for (const d of DIMENSIONS) {
      total += (conceptScores[c]?.[d] || 0) * (DIM_WEIGHTS[d] || 0)
    }
    conceptTotals[c] = Math.round(total * 10) / 10
  }

  // Style × concept for heatmap
  const styleConceptMap: Record<string, Record<string, StyleQuality>> = {}
  for (const s of styles) {
    if (!styleConceptMap[s.style]) styleConceptMap[s.style] = {}
    styleConceptMap[s.style][s.concept] = s
  }
  const styleNames = ['coloring-book-thick','coloring-book-standard','sketch-outline','manga-simple']

  const chosenProvider = providers.find(p => p.recommendation === 'chosen')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-800 text-white px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-1 text-sm text-indigo-300">
            <a href="/admin" className="hover:text-white">← Admin</a>
            <span className="text-indigo-500">/</span>
            <span>Trade-Off Analysis</span>
          </div>
          <h1 className="text-2xl font-bold">🧭 Concept Trade-Off Analysis &amp; Concept Selection</h1>
          <p className="text-indigo-200 text-sm mt-1">
            Quality × Cost × Safety decision matrix · 3 concepts · 7 providers · Evidence from 112 tests
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">

        {/* ── DECISION BANNER ── */}
        <section>
          <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-sm p-6">
            <h2 className="text-xl font-bold text-indigo-900 mb-4">✅ Final Decision</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CONCEPTS.map(c => {
                const meta = CONCEPT_META[c]
                const total = conceptTotals[c]
                const isChosen = c !== 'adventure-builder'
                return (
                  <div key={c}
                    className={`rounded-xl border-2 p-4 ${isChosen ? meta.borderClass : 'border-gray-200'} ${isChosen ? meta.bgClass : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{meta.emoji}</span>
                      <span className="font-bold text-gray-900 text-sm">{c}</span>
                    </div>
                    <div className={`text-xs font-bold px-2 py-1 rounded-lg mb-2 inline-block ${
                      c === 'story-to-book' ? 'bg-violet-200 text-violet-800' :
                      c === 'interest-packs' ? 'bg-blue-200 text-blue-800' :
                      'bg-gray-200 text-gray-600'
                    }`}>{meta.badge}</div>
                    <p className="text-xs text-gray-600 mt-1">{CONCEPT_DECISIONS[c]}</p>
                    <p className="text-lg font-bold mt-3 text-gray-900">
                      {total}/10 <span className="text-xs font-normal text-gray-400">weighted</span>
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Chosen model */}
            {chosenProvider && (
              <div className="mt-4 bg-green-50 rounded-xl border border-green-200 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🤖</span>
                  <div className="flex-1">
                    <p className="font-bold text-green-800">
                      Chosen Model: <code className="font-mono">{chosenProvider.model_variant}</code> via {chosenProvider.provider}
                    </p>
                    <p className="text-sm text-green-700 mt-1">{chosenProvider.rationale}</p>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-green-600">
                      <span>💵 ${chosenProvider.cost_per_page_usd.toFixed(4)}/page</span>
                      <span>⏱ p95={msLabel(chosenProvider.p95_latency_ms)}</span>
                      <span>📊 {chosenProvider.pass_rate_pct}% pass rate</span>
                      <span>🔒 {chosenProvider.safety_model}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── CONCEPT SCORING MATRIX ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Concept Scoring Matrix</h2>
          <p className="text-sm text-gray-500 mb-4">
            Weighted scores 0–10. Quality + Safety weighted 25% each (most critical for a child product).
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Dimension</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Weight</th>
                  {CONCEPTS.map(c => (
                    <th key={c} className="text-center px-4 py-3 font-semibold text-gray-600">
                      {CONCEPT_META[c].emoji} {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {DIMENSIONS.map(dim => {
                  const evalsByDim = evals.filter(e => e.dimension === dim)
                  const byConc: Record<string, ConceptEval> = {}
                  for (const e of evalsByDim) byConc[e.concept] = e
                  return (
                    <tr key={dim} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-800">{DIM_LABELS[dim]}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-500 font-medium">
                        {Math.round(DIM_WEIGHTS[dim] * 100)}%
                      </td>
                      {CONCEPTS.map(c => {
                        const e = byConc[c]
                        const s = e?.score ?? 0
                        return (
                          <td key={c} className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-base w-8 ${scoreColor(s)}`}>{s}</span>
                              <div className="flex-1">
                                <ScoreBar score={s} colorClass={barColor(s)} />
                              </div>
                            </div>
                            {e?.evidence && (
                              <p className="text-xs text-gray-400 mt-1 leading-tight">{e.evidence}</p>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
                {/* Totals row */}
                <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
                  <td className="px-4 py-3 text-gray-900">Weighted Total</td>
                  <td className="px-4 py-3 text-center text-xs text-gray-400">100%</td>
                  {CONCEPTS.map(c => (
                    <td key={c} className="px-4 py-3 text-center">
                      <span className={`text-xl font-bold ${conceptTotals[c] >= 8 ? 'text-green-600' : conceptTotals[c] >= 6.5 ? 'text-yellow-600' : 'text-gray-500'}`}>
                        {conceptTotals[c]}
                      </span>
                      <span className="text-xs text-gray-400">/10</span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ── QUALITY TRADE-OFFS ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Quality Trade-Offs</h2>
          <p className="text-sm text-gray-500 mb-4">
            Style × Concept pass-rate heatmap from 112 gen_tests. Target: ≥80% (green).
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Heatmap */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 pt-4 pb-2 border-b border-gray-50">
                <h3 className="font-semibold text-gray-800 text-sm">Pass Rate Heatmap (quality ≥ 0.80)</h3>
              </div>
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-gray-500">Style</th>
                    {CONCEPTS.map(c => (
                      <th key={c} className="text-center px-3 py-2 text-gray-500">{CONCEPT_META[c].emoji}</th>
                    ))}
                    <th className="text-center px-3 py-2 text-gray-500">Avg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {styleNames.map(s => {
                    const cells = CONCEPTS.map(c => styleConceptMap[s]?.[c]?.pass_rate_pct ?? null)
                    const validCells = cells.filter(v => v !== null) as number[]
                    const avg = validCells.length > 0 ? validCells.reduce((a, b) => a + b, 0) / validCells.length : null
                    return (
                      <tr key={s}>
                        <td className="px-3 py-2.5 font-mono text-gray-700">{s}</td>
                        {cells.map((v, ci) => {
                          const bg = v === null ? '' :
                            v >= 90 ? 'bg-green-200 text-green-900' :
                            v >= 80 ? 'bg-green-100 text-green-800' :
                            v >= 60 ? 'bg-yellow-100 text-yellow-800' :
                            v >= 30 ? 'bg-orange-100 text-orange-700' :
                                      'bg-red-100 text-red-700'
                          return (
                            <td key={ci} className={`px-3 py-2.5 text-center font-bold ${bg}`}>
                              {v !== null ? `${v}%` : '—'}
                            </td>
                          )
                        })}
                        <td className={`px-3 py-2.5 text-center font-bold ${
                          avg !== null && avg >= 80 ? 'text-green-700' :
                          avg !== null && avg >= 60 ? 'text-yellow-700' : 'text-gray-400'
                        }`}>{avg !== null ? `${avg.toFixed(0)}%` : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="px-4 py-3 bg-amber-50 border-t border-amber-100 text-xs text-amber-800">
                ⭐ <strong>coloring-book-thick</strong> is the only style clearing 80%+ on both chosen concepts.
                Launch with this style only — other styles deferred.
              </div>
            </div>

            {/* Quality gap closure */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h3 className="font-semibold text-gray-800 text-sm mb-3">Quality Gap Closure Plan</h3>
              <p className="text-xs text-gray-500 mb-3">
                Current overall pass rate: <strong>61.5%</strong> (sdxl-coloring-lora, all styles).
                Target: <strong>80%</strong>. Gap: 18.5pp.
              </p>
              <div className="space-y-2">
                {[
                  { step: 'Lock coloring-book-thick style only', gain: '+8pp (context)', effort: 'Zero — already in spec', color: 'bg-green-400' },
                  { step: 'Inference steps 20 → 30', gain: '+4–6pp', effort: 'Low — API param', color: 'bg-green-400' },
                  { step: 'CFG guidance 7.5 → 9.0', gain: '+2–3pp', effort: 'Low — API param', color: 'bg-green-400' },
                  { step: 'Add negative prompt', gain: '+3–5pp', effort: 'Low — text param', color: 'bg-yellow-400' },
                  { step: 'LoRA weight 0.8 → 0.9', gain: '+1–2pp', effort: 'Low — API param', color: 'bg-yellow-400' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-50">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${item.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800">{item.step}</p>
                      <p className="text-xs text-gray-500">{item.effort}</p>
                    </div>
                    <span className="text-xs font-bold text-green-700 flex-shrink-0">{item.gain}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-2.5 bg-green-50 rounded-lg border border-green-100">
                <p className="text-xs font-bold text-green-800">
                  Expected total: +18–24pp → 80–85% pass rate ✅
                </p>
                <p className="text-xs text-green-600 mt-0.5">
                  story-to-book + coloring-book-thick already at 100% (no tuning needed for primary concept)
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── COST TRADE-OFFS ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Cost Trade-Offs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Cost/page (chosen)', value: '$0.0035', sub: 'sdxl-lora, 30 steps', ok: true },
              { label: 'Cost/12-page book', value: '$0.049', sub: 'incl. safety check', ok: true },
              { label: 'Gross margin at $9.99', value: '99.5%', sub: 'AI + safety costs', ok: true },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-2xl font-bold text-green-600 mt-0.5">{s.value}</p>
                <p className="text-xs text-gray-400">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Cost stack table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 bg-gray-50">
              <h3 className="font-semibold text-sm text-gray-700">Full Cost Stack (chosen model, tuned, per 12-page book)</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left px-4 py-2.5 text-gray-600 font-semibold">Component</th>
                  <th className="text-right px-4 py-2.5 text-gray-600 font-semibold">$/book</th>
                  <th className="text-left px-4 py-2.5 text-gray-600 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {[
                  ['Generation (sdxl-lora, 30 steps)', '$0.035', '12 × $0.0029 (tuned from $0.0023)'],
                  ['Safety check (Google Vision, /page)', '$0.012', '12 × $0.001 — mandatory for COPPA'],
                  ['Storage (Supabase + CDN)', '$0.002', 'pg row + S3-compatible object storage'],
                  ['PDF assembly (Vercel Function)', '$0.000', 'Included in Vercel plan'],
                  ['OpenAI Moderation (input check)', '$0.000', 'Free API'],
                ].map(([item, cost, note], i) => (
                  <tr key={i} className={`hover:bg-gray-50 ${i === 4 ? 'border-t-2 border-gray-200' : ''}`}>
                    <td className="px-4 py-2.5 text-gray-700">{item}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-gray-800">{cost}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">{note}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                  <td className="px-4 py-3 text-gray-900">Total COGS / book</td>
                  <td className="px-4 py-3 text-right font-mono text-green-700 text-base">$0.049</td>
                  <td className="px-4 py-3 text-xs text-green-600">99.5% margin at $9.99 ✅</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ── SAFETY TRADE-OFFS ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Safety Trade-Offs</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Safety by concept */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 pt-4 pb-2 border-b border-gray-50">
                <h3 className="font-semibold text-sm text-gray-800">Safety Profile by Concept</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  {
                    concept: 'interest-packs',
                    attack: 'Zero — icon tiles only, no user text',
                    injection: 'None (no text input)',
                    output: 'Low (structured topic prompts)',
                    overall: 'Lowest risk ⭐',
                    overallColor: 'text-green-700',
                  },
                  {
                    concept: 'story-to-book',
                    attack: 'Low — voice → wizard JSON',
                    injection: 'Low (wizard sanitizes + allowlists)',
                    output: 'Low (structured scene prompts)',
                    overall: 'Acceptable ✅',
                    overallColor: 'text-green-600',
                  },
                  {
                    concept: 'adventure-builder',
                    attack: 'Medium — hero builder + serial context',
                    injection: 'Low-Medium (serial context drift)',
                    output: 'Medium (adventure = violence-adjacent)',
                    overall: 'Monitor ⚠️',
                    overallColor: 'text-yellow-600',
                  },
                ].map(row => {
                  const meta = CONCEPT_META[row.concept]
                  return (
                    <div key={row.concept} className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span>{meta.emoji}</span>
                        <span className="font-semibold text-sm text-gray-800">{row.concept}</span>
                        <span className={`ml-auto text-xs font-bold ${row.overallColor}`}>{row.overall}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                        <div><span className="text-gray-400 block">Input surface</span>{row.attack}</div>
                        <div><span className="text-gray-400 block">Injection risk</span>{row.injection}</div>
                        <div><span className="text-gray-400 block">Output risk</span>{row.output}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 3-Layer safety */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 pt-4 pb-2 border-b border-gray-50">
                <h3 className="font-semibold text-sm text-gray-800">3-Layer Safety Architecture</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  {
                    layer: 'Layer 1', name: 'Input Classifier', api: 'OpenAI Moderation API',
                    latency: '+150ms', cost: '$0.000', color: 'bg-red-500',
                    desc: '10 harm categories. Block threshold 0.001–0.05. Raw text never reaches image model.',
                  },
                  {
                    layer: 'Layer 2', name: 'Prompt Assembly', api: 'Server-side deterministic',
                    latency: '+0ms', cost: '$0.000', color: 'bg-yellow-500',
                    desc: 'Wizard JSON → structured prompt. Character/setting/action allowlists. Negative prompt injected.',
                  },
                  {
                    layer: 'Layer 3', name: 'Output Classifier', api: 'Google Vision SafeSearch',
                    latency: '+300ms', cost: '$0.001', color: 'bg-blue-500',
                    desc: 'Block adult/violence ≥ LIKELY. Automatic refund if flagged. Append-only audit log.',
                  },
                ].map(l => (
                  <div key={l.layer} className="px-4 py-3 flex items-start gap-3">
                    <div className={`w-2 flex-shrink-0 self-stretch rounded-full ${l.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-500">{l.layer}</span>
                        <span className="font-semibold text-sm text-gray-800">{l.name}</span>
                        <code className="text-xs bg-gray-100 px-1 rounded ml-auto">{l.api}</code>
                      </div>
                      <p className="text-xs text-gray-500">{l.desc}</p>
                      <div className="flex gap-3 mt-1 text-xs text-gray-400">
                        <span>⏱ {l.latency}</span>
                        <span>💵 {l.cost}/call</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 bg-indigo-50 border-t border-indigo-100">
                <p className="text-xs font-medium text-indigo-800">
                  COPPA note: If legal review requires <em>built-in</em> moderation (not custom),
                  DALL-E 3 becomes the only viable option. Flag as blocker in Issue #12.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── PROVIDER SELECTION MATRIX ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Provider Selection Matrix</h2>
          <div className="space-y-3">
            {providers.map(p => {
              const isChosen   = p.recommendation === 'chosen'
              const isFallback = p.recommendation === 'fallback'
              // const isRuled = p.recommendation === "ruled-out"
              return (
                <div key={p.model_variant}
                  className={`bg-white rounded-xl border-2 shadow-sm p-4 ${
                    isChosen ? 'border-green-300 bg-green-50/30' :
                    isFallback ? 'border-yellow-200' :
                    'border-gray-100'
                  }`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <code className="font-mono font-bold text-sm text-gray-800">{p.model_variant}</code>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          isChosen ? 'bg-green-100 text-green-700' :
                          isFallback ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>{p.recommendation.toUpperCase()}</span>
                        <span className="text-xs text-gray-400">{p.provider}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          p.safety_model === 'builtin' ? 'bg-green-100 text-green-700' :
                          p.safety_model === 'custom-required' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-red-100 text-red-600'
                        }`}>safety: {p.safety_model}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          p.vendor_risk === 'low' ? 'bg-gray-100 text-gray-500' :
                          p.vendor_risk === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-red-100 text-red-600'
                        }`}>vendor risk: {p.vendor_risk}</span>
                      </div>

                      {/* Score bars row */}
                      <div className="grid grid-cols-5 gap-3 my-3">
                        {[
                          { label: 'Quality', val: p.quality_score },
                          { label: 'Cost', val: p.cost_score },
                          { label: 'Speed', val: p.speed_score },
                          { label: 'Safety', val: p.safety_score },
                          { label: 'Ops', val: p.ops_score },
                        ].map(s => (
                          <div key={s.label}>
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="text-gray-400">{s.label}</span>
                              <span className={`font-bold ${scoreColor(s.val)}`}>{s.val}</span>
                            </div>
                            <ScoreBar score={s.val} colorClass={barColor(s.val)} />
                          </div>
                        ))}
                      </div>

                      <p className="text-xs text-gray-500 mt-1">{p.rationale}</p>

                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                        <span className={`font-medium ${p.meets_cost_target ? 'text-green-600' : 'text-red-500'}`}>
                          {p.meets_cost_target ? '✅' : '❌'} Cost ${p.cost_per_page_usd.toFixed(4)}/page
                        </span>
                        <span className={`font-medium ${p.meets_speed_target ? 'text-green-600' : 'text-orange-500'}`}>
                          {p.meets_speed_target ? '✅' : '⚠️'} p95 {msLabel(p.p95_latency_ms)}
                        </span>
                        <span className={`font-medium ${p.meets_quality_target ? 'text-green-600' : 'text-yellow-600'}`}>
                          {p.meets_quality_target ? '✅' : '⚠️'} Pass rate {p.pass_rate_pct}%
                        </span>
                        <span className="font-bold text-gray-700">
                          Weighted: {p.weighted_total}/10
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── CONCEPT DEEP DIVES ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Concept Deep Dives</h2>
          <div className="space-y-4">
            {CONCEPTS.map(c => {
              const meta = CONCEPT_META[c]
              const cEvals = evals.filter(e => e.concept === c)
              const total = conceptTotals[c]
              const isChosen = c !== 'adventure-builder'
              return (
                <div key={c} className={`bg-white rounded-2xl border-2 shadow-sm p-6 ${isChosen ? meta.borderClass : 'border-gray-100'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-xl text-gray-900 flex items-center gap-2">
                        <span>{meta.emoji}</span> {c}
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          c === 'story-to-book' ? 'bg-violet-100 text-violet-800' :
                          c === 'interest-packs' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-500'
                        }`}>{meta.badge}</span>
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">{CONCEPT_DECISIONS[c]}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-3xl font-bold text-gray-900">{total}</p>
                      <p className="text-xs text-gray-400">/ 10 weighted</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {cEvals.map(e => (
                      <div key={e.dimension} className="bg-gray-50 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-gray-600">{DIM_LABELS[e.dimension]}</span>
                          <span className={`text-sm font-bold ${scoreColor(e.score)}`}>{e.score}/10</span>
                        </div>
                        <ScoreBar score={e.score} colorClass={barColor(e.score)} />
                        {e.evidence && (
                          <p className="text-xs text-gray-400 mt-2 leading-relaxed">{e.evidence}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── RISK REGISTER ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Top Risks for Chosen Concepts</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Risk</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Likelihood</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Impact</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Mitigation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { risk: 'COPPA legal review requires built-in moderation → DALL-E 3 only option', l: 'Low', i: 'Critical', m: 'Pre-file for COPPA safe harbor; document 3-layer custom moderation for legal review (Issue #12)' },
                  { risk: 'Replicate API key unavailable at MVP launch', l: 'Low', i: 'High', m: 'Pollinations.ai for dev/staging; sdxl-1.0 as interim fallback' },
                  { risk: 'Quality gate not met after prompt tuning (still <80%)', l: 'Low', i: 'High', m: 'Lock to coloring-book-thick style (story-to-book already at 100%); fail-fast in sprint 1' },
                  { risk: 'Web Speech API not available on target device (iOS Safari)', l: 'Medium', i: 'Medium', m: 'Keyboard fallback always available; wizard works without voice' },
                  { risk: 'Pollinations rate-limit in dev environment blocks testing', l: 'High', i: 'Low', m: 'Already documented; dev uses provider-docs benchmark data; Vercel IP pool not rate-limited' },
                  { risk: 'Parent confused by handoff screen at generation end', l: 'Medium', i: 'High', m: 'Usability test protocol in kid-ui-spec.md; 5-parent test before launch' },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 max-w-xs">{row.risk}</td>
                    <td className={`px-4 py-3 text-center font-medium text-xs ${row.l === 'High' ? 'text-red-600' : row.l === 'Medium' ? 'text-yellow-600' : 'text-green-600'}`}>{row.l}</td>
                    <td className={`px-4 py-3 text-center font-medium text-xs ${row.i === 'Critical' ? 'text-red-700 font-bold' : row.i === 'High' ? 'text-red-500' : 'text-yellow-600'}`}>{row.i}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{row.m}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Navigation */}
        <div className="flex flex-wrap gap-3 pb-6">
          {[
            { href: '/admin/sandbox', label: '📊 Sandbox Dashboard' },
            { href: '/admin/spike',   label: '🧪 Tech Spike' },
            { href: '/sandbox',       label: '🎨 Try Sandbox' },
            { href: '/admin',         label: '← Admin Home' },
          ].map(l => (
            <a key={l.href} href={l.href}
              className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 shadow-sm">
              {l.label}
            </a>
          ))}
        </div>

      </div>
    </div>
  )
}
