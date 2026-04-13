import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

async function getDashboardData() {
  const admin = createAdminClient()
  const [competitors, research, personas, hypotheses, sources, painPoints, journeyStages, mvpScope] = await Promise.all([
    admin.from('competitors').select('count', { count: 'exact', head: true }),
    admin.from('research_items').select('count', { count: 'exact', head: true }),
    admin.from('personas').select('count', { count: 'exact', head: true }),
    admin.from('hypotheses').select('count', { count: 'exact', head: true }),
    admin.from('research_sources').select('count', { count: 'exact', head: true }),
    admin.from('pain_points').select('count', { count: 'exact', head: true }),
    admin.from('journey_stages').select('count', { count: 'exact', head: true }),
    admin.from('mvp_scope').select('count', { count: 'exact', head: true }),
    admin.from('mvp_constraints').select('count', { count: 'exact', head: true }),
  ])

  const { data: signalTypes } = await admin.from('research_items').select('signal_type')
  const signalBreakdown = signalTypes?.reduce((acc: Record<string, number>, r: { signal_type: string }) => {
    acc[r.signal_type] = (acc[r.signal_type] ?? 0) + 1
    return acc
  }, {} as Record<string, number>) ?? {}

  return {
    counts: {
      competitors: competitors.count ?? 0,
      research: research.count ?? 0,
      personas: personas.count ?? 0,
      hypotheses: hypotheses.count ?? 0,
      sources: sources.count ?? 0,
      painPoints: painPoints.count ?? 0,
      journeyStages: journeyStages.count ?? 0,
      mvpScope: mvpScope.count ?? 0,
    },
    signalBreakdown,
  }
}

const SIGNAL_COLORS: Record<string, string> = {
  pain_point: 'bg-red-100 text-red-700',
  opportunity: 'bg-green-100 text-green-700',
  competitor_mention: 'bg-orange-100 text-orange-700',
  persona_signal: 'bg-purple-100 text-purple-700',
}

export default async function ResearchWorkspace() {
  const { counts, signalBreakdown } = await getDashboardData()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">GP</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <a href="/" className="text-sm text-gray-500 hover:text-gray-700">GrantPilot</a>
                  <span className="text-gray-300">/</span>
                  <h1 className="text-sm font-semibold text-gray-900">Research Workspace</h1>
                </div>
                <p className="text-xs text-gray-400">Admin — Phase 2 HBS Signal Mining & Journey Mapping</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span>
              Admin Access
            </div>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { href: '/research', label: 'Overview', active: true },
              { href: '/research/journey', label: `Journey Map (${counts.journeyStages})` },
              { href: '/research/pain-points', label: `Pain Points (${counts.painPoints})` },
              { href: '/research/mvp', label: `MVP Scope (${counts.mvpScope})` },
              { href: '/research/personas', label: `Personas (${counts.personas})` },
              { href: '/research/hypotheses', label: `Hypotheses (${counts.hypotheses})` },
              { href: '/research/competitors', label: `Competitors (${counts.competitors})` },
              { href: '/research/signals', label: `Signals (${counts.research})` },
            ].map(n => (
              <a
                key={n.href}
                href={n.href}
                className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                  n.active
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {n.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Research Overview</h2>
          <p className="text-sm text-gray-500 mt-1">
            Phase 2: Signal Mining &amp; Journey Mapping — HBS Steps 3–4 · {counts.painPoints} pain points across {counts.journeyStages} grant lifecycle stages
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Pain Points', value: counts.painPoints, href: '/research/pain-points', emoji: '🔴' },
            { label: 'Journey Stages', value: counts.journeyStages, href: '/research/journey', emoji: '🗺️' },
            { label: 'MVP Features', value: counts.mvpScope, href: '/research/mvp', emoji: '🎯' },
            { label: 'Personas', value: counts.personas, href: '/research/personas', emoji: '👥' },
          ].map(s => (
            <a
              key={s.label}
              href={s.href}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-300 transition-colors"
            >
              <div className="text-xl mb-1">{s.emoji}</div>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </a>
          ))}
        </div>

        {/* Signal breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Signal Breakdown ({counts.research} items)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(signalBreakdown as Record<string, number>).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} className="text-center">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${SIGNAL_COLORS[type] ?? 'bg-gray-100 text-gray-700'}`}>
                  {type.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Phase 2 quick links */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Phase 2 — Journey Mapping & Pain Points</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <a href="/research/journey" className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 transition-colors group">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">Journey Map →</h3>
                  <p className="text-sm text-gray-500 mt-1">{counts.journeyStages} stages from discovery to renewal, with pain points and opportunity flags per stage</p>
                </div>
                <span className="text-3xl">🗺️</span>
              </div>
            </a>
            <a href="/research/pain-points" className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 transition-colors group">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">Pain Points Table →</h3>
                  <p className="text-sm text-gray-500 mt-1">{counts.painPoints} prioritized entries with severity/urgency scores and linked citations</p>
                </div>
                <span className="text-3xl">🔴</span>
              </div>
            </a>
            <a href="/research/mvp" className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 transition-colors group">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">MVP Scope →</h3>
                  <p className="text-sm text-gray-500 mt-1">{counts.mvpScope} features with acceptance criteria, persona targeting, and pain points addressed</p>
                </div>
                <span className="text-3xl">🎯</span>
              </div>
            </a>
          </div>
        </div>

        {/* Phase 1 quick links */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Phase 1 — Personas, Hypotheses & Competitors</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <a href="/research/personas" className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 transition-colors group">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">Persona Cards →</h3>
                  <p className="text-sm text-gray-500 mt-1">{counts.personas} personas ranked by urgency × ability-to-pay with pain points and purchase triggers</p>
                </div>
                <span className="text-3xl">👥</span>
              </div>
            </a>
            <a href="/research/competitors" className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 transition-colors group">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">Competitor Map →</h3>
                  <p className="text-sm text-gray-500 mt-1">{counts.competitors} products scanned with strengths, weaknesses, pricing, and strategic notes</p>
                </div>
                <span className="text-3xl">🔍</span>
              </div>
            </a>
            <a href="/research/hypotheses" className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 transition-colors group">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">Hypotheses →</h3>
                  <p className="text-sm text-gray-500 mt-1">{counts.hypotheses} versioned hypotheses across customer, problem, solution, channel &amp; revenue categories</p>
                </div>
                <span className="text-3xl">🧪</span>
              </div>
            </a>
            <a href="/research/signals" className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 transition-colors group">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">Signal Feed →</h3>
                  <p className="text-sm text-gray-500 mt-1">{counts.research} tagged items from Reddit, LinkedIn, job boards, G2/Capterra, and news</p>
                </div>
                <span className="text-3xl">📡</span>
              </div>
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
