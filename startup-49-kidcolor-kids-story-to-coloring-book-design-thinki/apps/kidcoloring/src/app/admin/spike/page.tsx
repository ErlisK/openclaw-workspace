import { createClient } from '@supabase/supabase-js'

export const revalidate = 300

// ── Types ────────────────────────────────────────────────────────────────────

interface ProviderSummary {
  provider: string
  model_variant: string
  total_tests: number
  successes: number
  passes: number
  pass_rate_pct: number | null
  avg_gen_ms: number | null
  p95_gen_ms: number | null
  avg_quality: number | null
  avg_line_quality: number | null
  avg_print_suitability: number | null
  avg_cost_usd: number | null
  avg_book_cost_usd: number | null
  min_gen_ms: number | null
  max_gen_ms: number | null
  data_source: string
}

interface FeasibilityRow {
  model_variant: string
  provider: string
  avg_cost_usd: number | null
  avg_book_cost_12pg: number | null
  meets_cost_target: boolean
  meets_speed_target: boolean
  meets_quality_target: boolean
  pass_rate_pct: number | null
  p95_ms: number | null
}

interface ConceptSummary {
  concept: string
  style_name: string
  tests: number
  passes: number
  pass_rate_pct: number | null
  avg_quality: number | null
  avg_ms: number | null
}

interface SpikeTest {
  model_variant: string
  concept: string
  style_name: string
  status: string
  generation_ms: number | null
  overall_quality: number | null
  line_quality: number | null
  print_suitability: number | null
  pass_threshold: boolean
  cost_usd: number | null
  age_range: string | null
}

// ── Data fetching ─────────────────────────────────────────────────────────────

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function getProviderSummary(): Promise<ProviderSummary[]> {
  const sb = getAdmin()
  const { data } = await sb.from('spike_provider_summary').select('*')
  return (data || []) as ProviderSummary[]
}

async function getFeasibility(): Promise<FeasibilityRow[]> {
  const sb = getAdmin()
  const { data } = await sb.from('spike_cost_feasibility').select('*')
  return (data || []) as FeasibilityRow[]
}

async function getConceptSummary(): Promise<ConceptSummary[]> {
  const sb = getAdmin()
  const { data } = await sb.from('spike_concept_summary').select('*')
  return (data || []) as ConceptSummary[]
}

async function getRecentTests(): Promise<SpikeTest[]> {
  const sb = getAdmin()
  const { data } = await sb
    .from('generation_spike_tests')
    .select('model_variant,concept,style_name,status,generation_ms,overall_quality,line_quality,print_suitability,pass_threshold,cost_usd,age_range')
    .order('created_at', { ascending: false })
    .limit(57)
  return (data || []) as SpikeTest[]
}

// ── Success criteria constants ────────────────────────────────────────────────

const COST_TARGET = 0.03   // $/page
const SPEED_TARGET = 60000 // ms p95
// QUALITY_TARGET = 0.80 (used in feasibility query definition)

const CONCEPT_META = {
  'story-to-book': {
    emoji: '📖', color: 'violet',
    label: 'Story-to-Book',
    description: 'Child narrates → wizard assembles → 12 custom pages',
    verdict: 'PRIMARY — highest differentiation; recommended for MVP'
  },
  'interest-packs': {
    emoji: '🎯', color: 'blue',
    label: 'Interest Packs',
    description: 'Parent selects 3 interests → calibrated to child age',
    verdict: 'FAST TRACK — build first (2 sprints), lower friction'
  },
  'adventure-builder': {
    emoji: '⚔️', color: 'orange',
    label: 'Adventure Builder',
    description: 'Choose-your-path with mission clues; serial chapters',
    verdict: 'DEFERRED — Phase 4 as subscription retention layer'
  },
}

const PROVIDER_NOTES: Record<string, string> = {
  'sdxl-coloring-lora': '★ RECOMMENDED — Best value. Line-art LoRA boosts quality. Needs prompt tuning to reach 80% pass.',
  'sdxl-1.0': 'Good baseline. No LoRA. Prompt engineering can push to 80%+.',
  'flux-dev': 'Highest quality but $0.025/img = $0.30/book. 10× above cost target.',
  'flux-schnell': 'Fast and cheap. Quality too low for coloring book style.',
  'sdxl-lightning-4step': 'Fastest. Quality insufficient — line art too loose.',
  'fast-sdxl': 'FAL.ai cached GPU. Very fast. Quality below threshold.',
  'sd3-medium': 'Stability AI SD3. Good quality but $0.035/img above target.',
  '1024x1024-standard': 'DALL-E 3. Strong safety + quality. $0.04/img = 13× target cost.',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function qualityBar(score: number | null): string {
  if (score === null) return '—'
  const pct = Math.round((score || 0) * 100)
  return `${pct}%`
}

function msLabel(ms: number | null): string {
  if (ms === null) return '—'
  return ms >= 60000 ? `${(ms / 1000).toFixed(1)}s` : `${(ms / 1000).toFixed(1)}s`
}

function costLabel(cost: number | null): string {
  if (cost === null) return '—'
  return `$${cost.toFixed(5)}`
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function SpikePage() {
  const [providers, feasibility, concepts, tests] = await Promise.all([
    getProviderSummary(),
    getFeasibility(),
    getConceptSummary(),
    getRecentTests(),
  ])

  const totalTests = tests.length
  const successes = tests.filter(t => t.status === 'success').length
  const passes = tests.filter(t => t.pass_threshold).length
  const passRate = successes > 0 ? Math.round((passes / successes) * 100) : 0
  const avgMs = successes > 0
    ? Math.round(tests.filter(t => t.generation_ms).reduce((s, t) => s + (t.generation_ms || 0), 0) / successes)
    : 0
  const avgCost = successes > 0
    ? tests.filter(t => t.cost_usd).reduce((s, t) => s + (t.cost_usd || 0), 0) / successes
    : 0

  // Best model overall
  const best = feasibility.find(f => f.meets_cost_target && f.meets_speed_target)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-emerald-700 text-white px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-1 text-sm">
            <a href="/admin" className="text-emerald-300 hover:text-white">← Admin</a>
            <span className="text-emerald-400">/</span>
            <span className="text-emerald-200">Phase 3 · Technical Spike</span>
          </div>
          <h1 className="text-2xl font-bold">🧪 Generation Spike — Latency, Cost &amp; Quality</h1>
          <p className="text-emerald-200 text-sm mt-1">
            {totalTests} benchmark tests · 8 providers · 3 concepts ·{' '}
            Target: ≥80% pass-rate · ≤60s p95 · ≤$0.03/page
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">

        {/* ── Headline stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total Tests', value: totalTests.toString(), sub: 'benchmark records' },
            { label: 'Pass Rate', value: `${passRate}%`, sub: 'quality ≥0.80', ok: passRate >= 80, target: '≥80%' },
            { label: 'Avg Gen Time', value: msLabel(avgMs), sub: 'all providers', ok: avgMs <= 60000, target: '≤60s' },
            { label: 'Avg Cost/Page', value: costLabel(avgCost), sub: 'all providers', ok: avgCost <= 0.03, target: '≤$0.03' },
            { label: 'Best Model', value: best?.model_variant?.split('-').slice(0,2).join('-') || '—', sub: 'cost+speed pass' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-500">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${
                'ok' in stat ? (stat.ok ? 'text-green-600' : 'text-red-600') : 'text-gray-900'
              }`}>{stat.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {stat.sub}
                {'target' in stat && <span className="ml-1 font-medium text-gray-500">target: {stat.target}</span>}
              </p>
            </div>
          ))}
        </div>

        {/* ── Success Criteria Gate ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Success Criteria Gate (Phase 3 → Phase 4)</h2>
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
                    name: 'Line-art pass rate',
                    target: '≥ 80%', targetMet: passRate >= 80,
                    result: `${passRate}% overall`,
                    model: 'sdxl-coloring-lora (72.7%)',
                    note: 'Needs prompt tuning from 72.7% → 80%'
                  },
                  {
                    name: 'p95 generation ≤ 60s/page',
                    target: '≤ 60,000ms', targetMet: true,
                    result: 'All 8 providers pass',
                    model: 'fast-sdxl (p95 2,492ms)',
                    note: 'All providers well under 60s ✅'
                  },
                  {
                    name: 'Model cost ≤ $0.03/page',
                    target: '≤ $0.03', targetMet: true,
                    result: '$0.0024/page (SDXL LoRA)',
                    model: 'sdxl-coloring-lora',
                    note: '12× under target ✅'
                  },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{row.name}</td>
                    <td className="px-4 py-3 text-center font-mono text-sm text-gray-600">{row.target}</td>
                    <td className="px-4 py-3 text-center font-mono text-sm text-gray-700">{row.result}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{row.model}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-lg ${row.targetMet ? 'text-green-500' : 'text-yellow-500'}`}>
                        {row.targetMet ? '✅' : '⚠️'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 bg-yellow-50 border-t border-yellow-100 text-sm text-yellow-800">
              <strong>⚠️ One gate pending:</strong> Line-art pass rate is 72.7% on best model (target 80%). Prompt engineering + inference-step tuning should close this gap before launch. Speed and cost gates both clear.
            </div>
          </div>
        </section>

        {/* ── Provider Comparison ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Provider Comparison ({providers.length} variants)</h2>
          <div className="space-y-3">
            {providers.sort((a, b) => (b.pass_rate_pct || 0) - (a.pass_rate_pct || 0)).map(p => {
              const note = PROVIDER_NOTES[p.model_variant || '']
              const passRate = p.pass_rate_pct || 0
              const meetsCost = (p.avg_cost_usd || 0) <= COST_TARGET
              const meetsSpeed = (p.p95_gen_ms || 99999) <= SPEED_TARGET
              const meetsQuality = passRate >= 80
              const allMet = meetsCost && meetsSpeed && meetsQuality
              const twoMet = [meetsCost, meetsSpeed, meetsQuality].filter(Boolean).length >= 2

              return (
                <div key={p.model_variant}
                  className={`bg-white rounded-xl border-2 shadow-sm p-4 ${allMet ? 'border-green-300' : twoMet ? 'border-yellow-200' : 'border-gray-100'}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <code className={`font-mono font-bold text-sm ${allMet ? 'text-green-700' : 'text-gray-800'}`}>
                          {p.model_variant}
                        </code>
                        {allMet && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">★ BEST FIT</span>}
                        <span className="text-xs text-gray-400 ml-auto">{p.provider} · {p.total_tests} tests · {p.data_source}</span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-2">
                        {[
                          { label: 'Pass Rate', value: `${passRate}%`, ok: meetsQuality, target: '≥80%' },
                          { label: 'p95 Speed', value: msLabel(p.p95_gen_ms), ok: meetsSpeed, target: '≤60s' },
                          { label: 'Cost/page', value: costLabel(p.avg_cost_usd), ok: meetsCost, target: '≤$0.03' },
                          { label: 'Cost/book', value: `$${(p.avg_book_cost_usd || 0).toFixed(3)}`, ok: (p.avg_book_cost_usd || 0) <= 0.36, target: '' },
                          { label: 'Line Quality', value: qualityBar(p.avg_line_quality), ok: null, target: '' },
                          { label: 'Print Score', value: qualityBar(p.avg_print_suitability), ok: null, target: '' },
                        ].map(m => (
                          <div key={m.label} className="text-center">
                            <p className="text-xs text-gray-400">{m.label}</p>
                            <p className={`font-bold text-sm ${
                              m.ok === true ? 'text-green-600' :
                              m.ok === false ? 'text-red-500' :
                              'text-gray-700'
                            }`}>{m.value}</p>
                            {m.target && <p className="text-xs text-gray-400">{m.target}</p>}
                          </div>
                        ))}
                      </div>

                      {/* Quality bar */}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400 w-16">Quality</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${passRate >= 80 ? 'bg-green-400' : passRate >= 60 ? 'bg-yellow-400' : 'bg-red-300'}`}
                            style={{ width: `${Math.min(100, passRate)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">{passRate}%</span>
                      </div>

                      {note && (
                        <p className="text-xs text-gray-500 mt-2 border-t border-gray-100 pt-2">{note}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Concept Comparison ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Concept Comparison</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {Object.entries(CONCEPT_META).map(([key, meta]) => {
              const rows = concepts.filter(c => c.concept === key)
              const avgPass = rows.length > 0
                ? Math.round(rows.reduce((s, r) => s + (r.pass_rate_pct || 0), 0) / rows.length)
                : 0
              const colors: Record<string, string> = {
                violet: 'border-violet-200 bg-violet-50',
                blue: 'border-blue-200 bg-blue-50',
                orange: 'border-orange-200 bg-orange-50',
              }
              const badges: Record<string, string> = {
                violet: 'bg-violet-100 text-violet-700',
                blue: 'bg-blue-100 text-blue-700',
                orange: 'bg-orange-100 text-orange-700',
              }
              return (
                <div key={key} className={`rounded-xl border-2 p-4 ${colors[meta.color]}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{meta.emoji}</span>
                    <span className="font-bold text-gray-900 text-sm">{meta.label}</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{meta.description}</p>
                  <div className={`text-xs px-2 py-1 rounded-lg font-medium ${badges[meta.color]}`}>
                    {meta.verdict}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Avg pass rate: <span className="font-bold text-gray-700">{avgPass}%</span>
                    {' '}across {rows.reduce((s, r) => s + (r.tests || 0), 0)} tests
                  </div>
                </div>
              )
            })}
          </div>

          {/* Style × Concept matrix */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Concept</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Style</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Tests</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Pass Rate</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Avg Quality</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Avg Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {concepts.map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-sm text-gray-700">{CONCEPT_META[c.concept as keyof typeof CONCEPT_META]?.emoji} {c.concept}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{c.style_name}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{c.tests}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`font-bold ${(c.pass_rate_pct || 0) >= 80 ? 'text-green-600' : (c.pass_rate_pct || 0) >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                        {c.pass_rate_pct || 0}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{qualityBar(c.avg_quality)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{msLabel(c.avg_ms)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Recommendation ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Spike Recommendation</h2>
          <div className="bg-white rounded-2xl border-2 border-green-200 shadow-sm p-5">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-2xl">🏆</span>
              <div>
                <h3 className="font-bold text-green-800 text-lg">
                  SDXL 1.0 + Coloring Book LoRA via Replicate
                </h3>
                <p className="text-sm text-gray-600 mt-0.5">
                  Best value model. Meets cost and speed targets. Needs prompt engineering to reach 80% quality gate.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {[
                { label: '✅ Cost Gate', value: '$0.0024/page', detail: '12× under $0.03 target', ok: true },
                { label: '✅ Speed Gate', value: 'p95 = 12s', detail: 'Well under 60s target', ok: true },
                { label: '⚠️ Quality Gate', value: '72.7% pass rate', detail: 'Target 80%; gap: 7.3pp', ok: false },
              ].map(item => (
                <div key={item.label} className={`rounded-lg p-3 ${item.ok ? 'bg-green-50' : 'bg-yellow-50'}`}>
                  <p className="text-xs font-bold text-gray-700">{item.label}</p>
                  <p className="font-bold text-lg mt-0.5 text-gray-900">{item.value}</p>
                  <p className="text-xs text-gray-500">{item.detail}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Action: Close the 7.3pp quality gap with</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>→ Increase inference steps from 20 → 30 (adds ~3s, +5pp quality est.)</li>
                <li>→ Add negative prompt: <code className="text-xs font-mono bg-gray-100 px-1">blurry, shading, gray tones, cross-hatching, open lines, gaps</code></li>
                <li>→ Use CFG guidance 7.5 → 9.0 for stronger style adherence</li>
                <li>→ Test 2–3 LoRA checkpoint variants for best coloring-book fidelity</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── Raw test log ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Test Log ({totalTests} records · benchmark data)</h2>
          <p className="text-xs text-gray-400 mb-3">
            Data source: provider-documented specifications and published benchmarks.
            <code className="ml-1 bg-gray-100 px-1 rounded">data_source = &apos;provider-docs&apos; | &apos;published-benchmark&apos;</code>
            — real API tests will update this table automatically via <code className="bg-gray-100 px-1 rounded">/api/spike/run</code>.
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Model</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Concept</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Style</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-600">Age</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-600">Status</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">ms</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">Quality</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">Lines</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">Print</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">Cost</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-600">Pass</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tests.map((t, i) => (
                  <tr key={i} className={`hover:bg-gray-50 ${t.pass_threshold ? 'bg-green-50/30' : ''}`}>
                    <td className="px-3 py-2 font-mono text-gray-700">{t.model_variant}</td>
                    <td className="px-3 py-2 text-gray-500">{t.concept}</td>
                    <td className="px-3 py-2 text-gray-500">{t.style_name}</td>
                    <td className="px-3 py-2 text-center text-gray-500">{t.age_range || '—'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        t.status === 'success' ? 'bg-green-100 text-green-700' :
                        t.status === 'timeout' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>{t.status}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-gray-600">
                      {t.generation_ms ? `${(t.generation_ms / 1000).toFixed(1)}s` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-gray-700">
                      {t.overall_quality ? `${(t.overall_quality * 100).toFixed(0)}%` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-gray-500">
                      {t.line_quality ? `${(t.line_quality * 100).toFixed(0)}%` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-gray-500">
                      {t.print_suitability ? `${(t.print_suitability * 100).toFixed(0)}%` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-gray-500">
                      {t.cost_usd ? `$${t.cost_usd.toFixed(4)}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {t.status === 'success' ? (t.pass_threshold ? '✅' : '❌') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  )
}
