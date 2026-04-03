import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const revalidate = 3600

interface Experiment {
  id: string
  name: string
  description: string
  hypothesis: string
  status: string
  variants: Array<{ name: string; weight: number; description: string }>
  primary_metric: string
  result: string | null
}

async function getExperiments(): Promise<Experiment[]> {
  const { data } = await supabase
    .from('experiments')
    .select('*')
    .order('created_at')
  return (data || []) as Experiment[]
}


const POV_STATEMENTS = [
  {
    persona: 'Emma — The Kid Creator',
    emoji: '🎨',
    color: 'purple',
    need: 'Turn her bedtime story into a physical coloring book she can hold and color herself',
    insight: 'Self-authored content produces dramatically deeper engagement than any pre-made alternative',
    failure: 'Every existing coloring product forces her to color someone else\'s story',
    evidence: ['1efbe7ee', '664cfac8', '08e0f5a4'],
    target: 'Make a 7-year-old feel like the AUTHOR of the book — not the recipient of a customized product',
  },
  {
    persona: 'Maya — The Parent Buyer',
    emoji: '👩',
    color: 'blue',
    need: 'Produce a high-quality, perfectly-matched coloring book in under 30 minutes on a weeknight',
    insight: 'The gap between "generic" and "exactly right" is the difference between a coloring session and an iPad session',
    failure: 'Every option is too slow (5–10 days), too expensive ($30–45), or too wrong (adult AI tools)',
    evidence: ['ca377940', 'd14a48a2', 'ea0e18b0'],
    target: 'Close the time gap from "mental note at school drop-off" to "printed pages on the kitchen table" to under 30 minutes',
  },
  {
    persona: 'Marcus — The Classroom Teacher',
    emoji: '🍎',
    color: 'green',
    need: 'Generate curriculum-aligned coloring activities at exact right complexity for 6–7 year olds in under 5 minutes',
    insight: 'He does not want more catalog options — he wants to stop searching entirely',
    failure: '30–60 min/week lost searching TPT for content that is never quite right',
    evidence: ['797f40c5', 'd733ea62', 'a8ca4553'],
    target: 'Replace a 22-minute TPT search session with a 90-second generation prompt',
  },
]

const HMW_LIST = [
  { id: 'A1', cluster: 'Story Input', color: 'purple',
    prompt: 'Help a 5-year-old communicate their exact story characters without typing',
    assumption: 'Voice/guided questions produce richer prompts than a blank text field',
    type: 'Desirability', test: 'A/B: wizard vs blank field — measure avg word count' },
  { id: 'A2', cluster: 'Story Input', color: 'purple',
    prompt: 'Make every book feel authored by the child, not produced for them',
    assumption: 'Story-driven books produce ≥2× longer coloring sessions than generic',
    type: 'Desirability', test: '30-day survey: session_duration_reported, N=200' },
  { id: 'A3', cluster: 'Story Input', color: 'purple',
    prompt: 'Maintain consistent character design across all 12 pages',
    assumption: 'Character inconsistency is the #1 complaint that will drive refunds',
    type: 'Feasibility', test: 'Generate 5×12-page books, rate main character consistency' },
  { id: 'B1', cluster: 'Speed', color: 'orange',
    prompt: 'Deliver the first preview page within 60 seconds of story submission',
    assumption: 'Any wait over 90 seconds causes a significant abandonment spike',
    type: 'Feasibility', test: 'Infrastructure benchmark: first_page_ms at p95' },
  { id: 'B2', cluster: 'Speed', color: 'orange',
    prompt: 'Enable print with zero quality degradation on a standard home printer',
    assumption: 'Print failure is a stronger negative signal than any other quality issue',
    type: 'Feasibility', test: 'Print test on 10 common printers; user print_quality_rated survey' },
  { id: 'C1', cluster: 'Safety', color: 'red',
    prompt: 'Make COPPA compliance visible at every decision point',
    assumption: 'Absence of visible safety signal is the primary reason parents choose worse competitors',
    type: 'Desirability', test: 'A/B: COPPA badge above fold vs footer — measure story_wizard_started rate' },
  { id: 'C2', cluster: 'Safety', color: 'red',
    prompt: 'Prevent inappropriate content generation from story inputs',
    assumption: 'A single high-profile incident would be existentially damaging to the brand',
    type: 'Feasibility', test: 'Red-team 200 adversarial prompts before any beta' },
  { id: 'D1', cluster: 'Monetization', color: 'green',
    prompt: 'Price so a parent pays first time and returns for a second purchase',
    assumption: '$9.99/book is the price where both conditions are simultaneously met',
    type: 'Viability', test: '3-price A/B: $7.99/$9.99/$12.99 at 1,000 visitors' },
  { id: 'D2', cluster: 'Monetization', color: 'green',
    prompt: 'Design party pack as the primary viral growth engine',
    assumption: 'One 20-book party pack exposes product to 4+ new paying customers within 30 days',
    type: 'Viability', test: 'Referral codes in first 50 party pack orders; track 30-day conversions' },
  { id: 'D3', cluster: 'Monetization', color: 'green',
    prompt: 'Convert single-book buyers into subscribers',
    assumption: 'The 2nd book creation is the moment where subscription value clicks',
    type: 'Viability', test: 'A/B subscription prompt: post-1st download vs start-of-2nd-book' },
  { id: 'E1', cluster: 'Teacher', color: 'teal',
    prompt: 'Make KidColoring the first tool a teacher opens on Sunday evening',
    assumption: 'The first tool used in a planning session captures >70% of that teacher\'s content spend',
    type: 'Desirability', test: 'Measure Sunday session rate at 4 weeks for teacher cohort' },
]

const TOP_ASSUMPTIONS = [
  { rank: 1, id: 'A-2', name: 'AI line art quality', c: 5, u: 5, t: 2, priority: 12.5 },
  { rank: 2, id: 'A-5', name: 'Character consistency', c: 4, u: 5, t: 2, priority: 10.0 },
  { rank: 3, id: 'A-8', name: 'Party pack K-factor', c: 4, u: 5, t: 3, priority: 6.7 },
  { rank: 4, id: 'A-3', name: '60s generation at p95', c: 4, u: 4, t: 3, priority: 5.3 },
  { rank: 5, id: 'A-9', name: 'Subscription conversion 8%', c: 4, u: 4, t: 3, priority: 5.3 },
  { rank: 6, id: 'A-7', name: 'Safety filter ≥99.5%', c: 5, u: 4, t: 4, priority: 5.0 },
  { rank: 7, id: 'A-1', name: 'WTP $9.99 without objection', c: 5, u: 4, t: 5, priority: 4.0 },
  { rank: 8, id: 'A-4', name: '2× engagement story-driven', c: 5, u: 3, t: 4, priority: 3.75 },
  { rank: 9, id: 'A-6', name: 'COPPA badge lifts conversion', c: 3, u: 4, t: 5, priority: 2.4 },
  { rank: 10, id: 'A-10', name: 'Wizard > blank field', c: 3, u: 3, t: 5, priority: 1.8 },
]

const SCHEMA_TABLES = [
  { name: 'profiles', purpose: 'Parent/teacher accounts. No child PII. COPPA consent tracked.', phase: 'v0' },
  { name: 'children', purpose: 'Child profiles: nickname + age only. No child auth.', phase: 'v0' },
  { name: 'stories', purpose: 'Story inputs. Safety-scored before generation triggers.', phase: 'v0' },
  { name: 'books', purpose: 'Generated books. Status: queued→generating→preview_ready→purchased→delivered.', phase: 'v0' },
  { name: 'pages', purpose: 'Individual pages per book. First 2 are preview pages.', phase: 'v0' },
  { name: 'events', purpose: 'Analytics stream. All funnel events. Implements full event taxonomy.', phase: 'v0' },
  { name: 'satisfaction_ratings', purpose: 'Post-delivery quality signals. Tests A2, A3, B2.', phase: 'v0' },
  { name: 'referrals', purpose: 'Referral codes + K-factor tracking. Tests D2.', phase: 'v0' },
  { name: 'experiments', purpose: 'A/B experiment registry. Links to POV assumptions.', phase: 'v0' },
  { name: 'schema_migrations', purpose: 'Migration version history.', phase: 'v0' },
]

const clusterColors: Record<string, string> = {
  purple: 'bg-purple-50 border-purple-200 text-purple-800',
  orange: 'bg-orange-50 border-orange-200 text-orange-800',
  red: 'bg-red-50 border-red-200 text-red-800',
  green: 'bg-green-50 border-green-200 text-green-800',
  teal: 'bg-teal-50 border-teal-200 text-teal-800',
}

const badgeColors: Record<string, string> = {
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
  red: 'bg-red-100 text-red-700',
  green: 'bg-green-100 text-green-700',
  teal: 'bg-teal-100 text-teal-700',
}

export default async function DefinePage() {
  const experiments = await getExperiments()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-violet-700 text-white px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-1 text-sm">
            <a href="/admin" className="text-violet-300 hover:text-white">← Admin</a>
            <span className="text-violet-400">/</span>
            <span className="text-violet-200">Phase 2: Define</span>
          </div>
          <h1 className="text-2xl font-bold">Define Phase — POV, HMW & Assumptions</h1>
          <p className="text-violet-200 text-sm mt-1">
            POV statements · 11 HMW prompts · 10 testable assumptions · Schema migration v0 ·{' '}
            {experiments.length} experiments seeded
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">

        {/* ── POV Statements ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Point-of-View Statements</h2>
          <p className="text-sm text-gray-500 mb-4">
            Each POV names a specific user, their verified need, and the insight that makes the problem worth solving.
          </p>
          <div className="space-y-4">
            {POV_STATEMENTS.map(pov => (
              <div key={pov.persona} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">{pov.emoji}</span>
                  <div>
                    <h3 className="font-bold text-gray-900">{pov.persona}</h3>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Evidence: {pov.evidence.map(e => (
                        <code key={e} className="font-mono text-gray-400 mr-1">[{e}]</code>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-600 mb-1">NEED</p>
                    <p className="text-gray-800">{pov.need}</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-yellow-600 mb-1">INSIGHT</p>
                    <p className="text-gray-800">{pov.insight}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-red-600 mb-1">FAILURE MODE</p>
                    <p className="text-gray-800">{pov.failure}</p>
                  </div>
                </div>
                <div className="mt-3 bg-violet-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-violet-600 mb-1">🎯 DESIGN TARGET</p>
                  <p className="text-sm text-violet-900 font-medium">{pov.target}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── HMW Prompts ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-1">How Might We Prompts</h2>
          <p className="text-sm text-gray-500 mb-4">
            Each HMW names the <em>assumption being tested</em>, not just the solution direction.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {HMW_LIST.map(h => (
              <div key={h.id}
                className={`rounded-xl border p-4 ${clusterColors[h.color] || 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColors[h.color] || 'bg-gray-100 text-gray-600'}`}>
                    {h.id}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${badgeColors[h.color] || 'bg-gray-100 text-gray-600'}`}>
                    {h.cluster}
                  </span>
                  <span className="text-xs text-gray-500 ml-auto">{h.type}</span>
                </div>
                <p className="font-semibold text-sm text-gray-900 mb-2">
                  HMW {h.prompt}?
                </p>
                <div className="text-xs space-y-1">
                  <p><span className="font-medium text-gray-600">Assuming: </span>{h.assumption}</p>
                  <p><span className="font-medium text-gray-600">Test: </span>{h.test}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Top 10 Assumptions ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Top 10 Assumptions by Priority</h2>
          <p className="text-sm text-gray-500 mb-4">
            Priority = C(riticality) × U(ncertainty) ÷ T(estability). Test highest first.
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Assumption</th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-600">C</th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-600">U</th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-600">T</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {TOP_ASSUMPTIONS.map(a => (
                  <tr key={a.rank} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        a.rank <= 3 ? 'bg-red-100 text-red-700' :
                        a.rank <= 6 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{a.rank}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{a.name}</td>
                    <td className="px-3 py-3 text-center text-gray-600">{a.c}</td>
                    <td className="px-3 py-3 text-center text-gray-600">{a.u}</td>
                    <td className="px-3 py-3 text-center text-gray-600">{a.t}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${
                        a.priority >= 8 ? 'text-red-600' :
                        a.priority >= 5 ? 'text-yellow-600' :
                        'text-gray-600'
                      }`}>{a.priority}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            C=Criticality, U=Uncertainty, T=Testability (all 1–5). Red = test immediately; Yellow = test pre-launch.
          </p>
        </section>

        {/* ── Schema Migration ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Schema Migration v0</h2>
          <p className="text-sm text-gray-500 mb-4">
            10 tables live in Supabase. Designed to measure every assumption in the HMW list.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SCHEMA_TABLES.map(t => (
              <div key={t.name} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-sm font-mono font-bold text-violet-700">{t.name}</code>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-auto">
                    ✅ {t.phase}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{t.purpose}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Experiments ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-1">A/B Experiments Seeded</h2>
          <p className="text-sm text-gray-500 mb-4">
            Ready to activate. Each experiment tests a specific assumption from the HMW list.
          </p>
          <div className="space-y-3">
            {experiments.map(exp => (
              <div key={exp.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-sm font-mono font-bold text-violet-700">{exp.name}</code>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        exp.status === 'active' ? 'bg-green-100 text-green-700' :
                        exp.status === 'concluded' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{exp.status}</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-1">{exp.description}</p>
                    <p className="text-xs text-gray-500">
                      <span className="font-medium">Hypothesis:</span> {exp.hypothesis}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className="font-medium">Metric:</span> {exp.primary_metric}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {exp.variants.map((v: { name: string; weight: number; description: string }) => (
                        <span key={v.name} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          {v.name} ({Math.round(v.weight * 100)}%) — {v.description}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Success Criteria ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Success Criteria</h2>
          <p className="text-sm text-gray-500 mb-4">Measurable bars for each HMW</p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">HMW</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Metric</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Minimum Bar</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  ['A1', 'Story prompt word count by variant', 'Wizard > blank +30%', 'Wizard > blank +60%'],
                  ['A2', 'Coloring session duration (survey)', '≥30 min avg', '≥45 min avg'],
                  ['A3', '% pages with consistent character', '≥85%', '≥95%'],
                  ['B1', 'Time to first preview page (p95)', '≤90 seconds', '≤60 seconds'],
                  ['B2', '% books rated "clean print"', '≥90%', '≥97%'],
                  ['C1', 'Story start rate: badge above fold', '+5% lift', '+15% lift'],
                  ['C2', 'Adversarial prompt filter pass rate', '≥99.5%', '100%'],
                  ['D1', '30-day LTV at $9.99', '> $9.99', '> $14 (via repeat)'],
                  ['D2', 'Referrals per 10 party packs', '≥2 new customers', '≥4 new customers'],
                  ['D3', 'Subscription conversion at 2nd book', 'Beats post-1st by ≥40%', 'Beats post-1st by ≥60%'],
                  ['E1', 'Sunday session rate at 4 weeks', '≥30% teachers', '≥50% teachers'],
                ].map(([hmw, metric, min, target]) => (
                  <tr key={hmw} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs font-bold text-violet-600">{hmw}</td>
                    <td className="px-4 py-2.5 text-gray-700">{metric}</td>
                    <td className="px-4 py-2.5 text-amber-700 text-xs">{min}</td>
                    <td className="px-4 py-2.5 text-green-700 text-xs font-medium">{target}</td>
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
