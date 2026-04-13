import { createAdminClient } from '@/lib/supabase'
import type { Persona, ResearchItem } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function getPersonasWithSignals(): Promise<
  (Persona & { signals: ResearchItem[]; signalBreakdown: Record<string, number> })[]
> {
  const admin = createAdminClient()
  const [{ data: personas }, { data: allSignals }] = await Promise.all([
    admin.from('personas').select('*').order('priority_rank', { ascending: true }),
    admin.from('research_items').select('*'),
  ])

  if (!personas || !allSignals) return []

  return personas.map((p) => {
    // Cluster signals: match by persona_relevance field OR name match
    const relevant = allSignals.filter(
      (s) =>
        s.persona_relevance?.some(
          (r: string) =>
            r.toLowerCase().includes(p.name.toLowerCase().split(' ')[0].toLowerCase()) ||
            r.toLowerCase().replace(/[^a-z]/g, '').includes(
              p.segment.toLowerCase().split(' ').slice(0, 2).join('').replace(/[^a-z]/g, '').slice(0, 8)
            )
        )
    )
    const breakdown = relevant.reduce((acc: Record<string, number>, s) => {
      acc[s.signal_type] = (acc[s.signal_type] ?? 0) + 1
      return acc
    }, {})
    return { ...p, signals: relevant.slice(0, 6), signalBreakdown: breakdown }
  })
}

const RANK_BORDER: Record<number, string> = {
  1: 'border-l-4 border-red-500',
  2: 'border-l-4 border-orange-400',
  3: 'border-l-4 border-yellow-400',
  4: 'border-l-4 border-blue-400',
  5: 'border-l-4 border-purple-400',
}
const URGENCY_BADGE: Record<number, string> = {
  9: 'bg-red-100 text-red-700',
  8: 'bg-orange-100 text-orange-700',
  7: 'bg-yellow-100 text-yellow-700',
  6: 'bg-blue-100 text-blue-700',
}
const SIGNAL_DOT: Record<string, string> = {
  pain_point: 'bg-red-400',
  opportunity: 'bg-green-400',
  competitor_mention: 'bg-orange-400',
  persona_signal: 'bg-purple-400',
}
const SIGNAL_LABEL: Record<string, string> = {
  pain_point: 'pain',
  opportunity: 'opp',
  competitor_mention: 'comp',
  persona_signal: 'signal',
}
const SENTIMENT_ICON: Record<string, string> = {
  positive: '↑',
  negative: '↓',
  mixed: '~',
  neutral: '–',
}
const SENTIMENT_COLOR: Record<string, string> = {
  positive: 'text-green-600',
  negative: 'text-red-500',
  mixed: 'text-yellow-600',
  neutral: 'text-gray-400',
}

export default async function PersonasPage() {
  const personas = await getPersonasWithSignals()
  const totalSignals = personas.reduce((n, p) => n + p.signals.length, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm">
            <a href="/" className="text-gray-500 hover:text-gray-700">GrantPilot</a>
            <span className="text-gray-300">/</span>
            <a href="/research" className="text-gray-500 hover:text-gray-700">Research</a>
            <span className="text-gray-300">/</span>
            <span className="font-medium text-gray-900">Personas</span>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { href: '/research', label: 'Overview' },
              { href: '/research/personas', label: `Personas (${personas.length})`, active: true },
              { href: '/research/hypotheses', label: 'Hypotheses' },
              { href: '/research/competitors', label: 'Competitors' },
              { href: '/research/signals', label: 'Signals' },
            ].map((n) => (
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Persona Cards</h1>
          <p className="text-sm text-gray-500 mt-1">
            {personas.length} personas clustered from {115} public signals — ranked by Urgency × Ability-to-Pay.
            Each card shows the supporting evidence from ingested research items.
          </p>
        </div>

        {/* Priority matrix legend */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Priority Matrix — Urgency × Ability to Pay</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Rank</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Persona</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Segment</th>
                  <th className="text-center py-2 px-2 font-medium text-red-600">Urgency</th>
                  <th className="text-center py-2 px-2 font-medium text-blue-600">ATP</th>
                  <th className="text-center py-2 px-2 font-medium text-indigo-600">Score</th>
                  <th className="text-center py-2 px-2 font-medium text-gray-600">Signals</th>
                  <th className="text-left py-2 pl-4 font-medium text-gray-600">Beachhead?</th>
                </tr>
              </thead>
              <tbody>
                {personas.map((p) => {
                  const score = p.urgency_score * p.ability_to_pay_score
                  const sigCount = Object.values(p.signalBreakdown).reduce((a, b) => a + b, 0)
                  return (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 pr-4 font-bold text-gray-400">#{p.priority_rank}</td>
                      <td className="py-2 pr-4 font-medium text-gray-900">{p.name}</td>
                      <td className="py-2 pr-4 text-gray-500 text-xs">{p.segment.split(' ').slice(0, 4).join(' ')}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-block w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${URGENCY_BADGE[p.urgency_score] ?? 'bg-gray-100 text-gray-600'}`}>
                          {p.urgency_score}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className="inline-block w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          {p.ability_to_pay_score}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-indigo-700">{score}</td>
                      <td className="py-2 px-2 text-center text-gray-500 text-xs">{sigCount}</td>
                      <td className="py-2 pl-4">
                        {p.priority_rank === 1 && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                            ← Beachhead
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Full persona cards */}
        <div className="space-y-8">
          {personas.map((p) => {
            const score = p.urgency_score * p.ability_to_pay_score
            const sigCount = Object.values(p.signalBreakdown).reduce((a, b) => a + b, 0)
            return (
              <div
                key={p.id}
                className={`bg-white rounded-xl border border-gray-200 ${RANK_BORDER[p.priority_rank] ?? ''} overflow-hidden`}
              >
                {/* Card header */}
                <div className="p-6 pb-4">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                          RANK #{p.priority_rank}
                        </span>
                        {p.priority_rank === 1 && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                            Beachhead Segment
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-gray-900">{p.name}</h2>
                      <p className="text-gray-700 font-medium">{p.job_title}</p>
                      <p className="text-sm text-gray-400">{p.segment}</p>
                    </div>
                    <div className="flex gap-4 text-center">
                      <div>
                        <div className={`text-3xl font-bold ${p.urgency_score >= 8 ? 'text-red-600' : p.urgency_score >= 7 ? 'text-orange-500' : 'text-blue-600'}`}>
                          {p.urgency_score}
                        </div>
                        <div className="text-xs text-gray-500">Urgency</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-blue-600">{p.ability_to_pay_score}</div>
                        <div className="text-xs text-gray-500">ATP</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-indigo-700">{score}</div>
                        <div className="text-xs text-gray-500">Score</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-purple-600">{sigCount}</div>
                        <div className="text-xs text-gray-500">Signals</div>
                      </div>
                    </div>
                  </div>

                  {/* Org context strip */}
                  <div className="flex flex-wrap gap-3 text-xs mb-5">
                    <span className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
                      📊 <strong>Budget:</strong> {p.annual_budget_range}
                    </span>
                    <span className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
                      👥 <strong>Size:</strong> {p.org_size_range}
                    </span>
                    <span className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
                      💰 <strong>WTP:</strong> {p.willingness_to_pay}
                    </span>
                  </div>

                  {/* Three columns: pain points / goals / triggers */}
                  <div className="grid md:grid-cols-3 gap-5 mb-5">
                    <div>
                      <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <span>▼</span> Pain Points
                      </p>
                      <ul className="space-y-1.5">
                        {p.pain_points?.map((pp: string, i: number) => (
                          <li key={i} className="flex gap-1.5 text-xs text-gray-700">
                            <span className="text-red-400 flex-shrink-0 mt-0.5">•</span>
                            <span>{pp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <span>▲</span> Goals
                      </p>
                      <ul className="space-y-1.5">
                        {p.goals?.map((g: string, i: number) => (
                          <li key={i} className="flex gap-1.5 text-xs text-gray-700">
                            <span className="text-green-500 flex-shrink-0 mt-0.5">◦</span>
                            <span>{g}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <span>⚡</span> Purchase Triggers
                      </p>
                      <ul className="space-y-1.5">
                        {p.purchase_triggers?.map((pt: string, i: number) => (
                          <li key={i} className="flex gap-1.5 text-xs text-gray-700">
                            <span className="text-indigo-400 flex-shrink-0 mt-0.5">→</span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Attributes */}
                  {p.attributes && (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {Object.entries(p.attributes)
                        .filter(([, v]) => typeof v === 'string' || typeof v === 'boolean' || typeof v === 'number')
                        .map(([k, v]) => (
                          <span
                            key={k}
                            className="text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded"
                          >
                            {k.replace(/_/g, ' ')}: <strong>{String(v)}</strong>
                          </span>
                        ))}
                    </div>
                  )}
                </div>

                {/* Signal cluster panel */}
                {p.signals.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Clustered Evidence ({sigCount} signals)
                        </p>
                        {/* Signal type breakdown dots */}
                        <div className="flex gap-1.5">
                          {Object.entries(p.signalBreakdown).map(([type, count]) => (
                            <span
                              key={type}
                              className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white border border-gray-200`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${SIGNAL_DOT[type] ?? 'bg-gray-400'}`} />
                              {SIGNAL_LABEL[type] ?? type}: {count}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-2">
                      {p.signals.map((s) => (
                        <div key={s.id} className="bg-white rounded-lg border border-gray-200 p-3">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${SIGNAL_DOT[s.signal_type] ?? 'bg-gray-400'}`} />
                              <a
                                href={s.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-medium text-gray-800 hover:text-indigo-600 line-clamp-1"
                              >
                                {s.title}
                              </a>
                            </div>
                            <span className={`text-xs flex-shrink-0 font-medium ${SENTIMENT_COLOR[s.sentiment] ?? ''}`}>
                              {SENTIMENT_ICON[s.sentiment]} {s.sentiment}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2 pl-3">{s.content}</p>
                          <div className="flex items-center gap-1 mt-1.5 pl-3">
                            <span className="text-xs text-gray-400">{s.source}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Methodology note */}
        <div className="mt-8 bg-indigo-50 border border-indigo-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-indigo-900 mb-2">Clustering Methodology</h3>
          <p className="text-xs text-indigo-700 leading-relaxed">
            Personas were derived by clustering 115 ingested public signals (Reddit threads, LinkedIn posts, job
            descriptions, G2/Capterra reviews, industry surveys, Twitter discussions, and press coverage) by
            recurring job-to-be-done patterns, pain point language, and tool-stack mentions. Each persona card
            surfaces the supporting signal evidence clustered to that archetype. Signals tagged with{' '}
            <code className="bg-indigo-100 px-1 rounded">persona_relevance</code> are matched to persona names and
            segment keywords. Urgency and ATP scores are derived from signal sentiment, job description salary data,
            procurement cycle analysis, and sector research on willingness-to-pay.
          </p>
        </div>
      </main>
    </div>
  )
}
