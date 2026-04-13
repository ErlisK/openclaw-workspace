import { createAdminClient } from '@/lib/supabase'

interface PainPoint {
  id: string
  title: string
  description: string
  journey_stage_slug: string
  persona_segments: string[]
  severity: number
  urgency: number
  frequency: string
  source_type: string
  community_source: string
  citation_url: string
  citation_text: string
  tags: string[]
  created_at: string
}

const SEV_COLOR: Record<number, string> = {
  5: 'bg-red-900/60 text-red-300 border-red-700/50',
  4: 'bg-orange-900/60 text-orange-300 border-orange-700/50',
  3: 'bg-yellow-900/60 text-yellow-300 border-yellow-700/50',
  2: 'bg-green-900/60 text-green-300 border-green-700/50',
  1: 'bg-blue-900/60 text-blue-300 border-blue-700/50',
}
const SEV_LABEL: Record<number, string> = { 5: 'Critical', 4: 'High', 3: 'Medium', 2: 'Low', 1: 'Minimal' }
const SOURCE_ICONS: Record<string, string> = {
  reddit: '🟠', twitter: '🐦', linkedin: '💼', quora: '❓',
  producthunt: '🚀', indiehackers: '🛠️', survey: '📊', interview: '🎙️',
}
const STAGE_LABELS: Record<string, string> = {
  discovery: 'Discovery', eligibility: 'Eligibility', 'funder-research': 'Funder Research',
  planning: 'Planning', writing: 'Writing', review: 'Review', compliance: 'Compliance',
  submission: 'Submission', tracking: 'Tracking', 'award-management': 'Award Mgmt', reporting: 'Reporting',
}

export const dynamic = 'force-dynamic'

export default async function PainPointsPage() {
  const supabase = createAdminClient()
  const { data: painPoints } = await supabase
    .from('pain_points')
    .select('*')
    .order('severity', { ascending: false })

  const all: PainPoint[] = painPoints || []

  // Aggregates
  const byStage = all.reduce<Record<string, PainPoint[]>>((acc, p) => {
    acc[p.journey_stage_slug] = acc[p.journey_stage_slug] || []
    acc[p.journey_stage_slug].push(p)
    return acc
  }, {})

  const bySeverity = all.reduce<Record<number, number>>((acc, p) => {
    acc[p.severity] = (acc[p.severity] || 0) + 1
    return acc
  }, {})

  const bySource = all.reduce<Record<string, number>>((acc, p) => {
    acc[p.source_type] = (acc[p.source_type] || 0) + 1
    return acc
  }, {})

  const criticalHigh = all.filter(p => p.severity >= 4)
  const avgSev = (all.reduce((s, p) => s + p.severity, 0) / all.length).toFixed(1)

  // Stage breakdown sorted by count desc
  const stageBreakdown = Object.entries(byStage)
    .sort((a, b) => b[1].length - a[1].length)

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <a href="/research" className="hover:text-gray-300">Research</a>
          <span>›</span>
          <span className="text-gray-300">Pain Points</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Pain Points Database</h1>
        <p className="text-gray-400 max-w-3xl">
          {all.length} prioritized pain points mined from public community sources — Reddit, Twitter/X, LinkedIn, Quora, ProductHunt.
          Each entry is tagged by journey stage, severity/urgency, affected personas, and source citation.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <div className="text-3xl font-bold text-white">{all.length}</div>
          <div className="text-sm text-gray-400 mt-1">Total Pain Points</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <div className="text-3xl font-bold text-red-400">{criticalHigh.length}</div>
          <div className="text-sm text-gray-400 mt-1">Critical / High (S4–5)</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <div className="text-3xl font-bold text-orange-400">{avgSev}</div>
          <div className="text-sm text-gray-400 mt-1">Avg Severity</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <div className="text-3xl font-bold text-blue-400">{Object.keys(bySource).length}</div>
          <div className="text-sm text-gray-400 mt-1">Source Types</div>
        </div>
      </div>

      {/* Breakdown panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* By severity */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">By Severity</h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(sev => {
              const n = bySeverity[sev] || 0
              const pct = Math.round((n / all.length) * 100)
              return (
                <div key={sev} className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${SEV_COLOR[sev]} w-20 text-center`}>
                    S{sev} {SEV_LABEL[sev]}
                  </span>
                  <div className="flex-1 bg-gray-800 rounded-full h-2">
                    <div className="h-2 rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm text-gray-300 w-8 text-right">{n}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* By stage */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">By Journey Stage</h3>
          <div className="space-y-1.5">
            {stageBreakdown.map(([slug, pts]) => (
              <div key={slug} className="flex items-center justify-between">
                <a href={`/research/journey#stage-${slug}`}
                  className="text-sm text-blue-400 hover:text-blue-300">{STAGE_LABELS[slug] || slug}</a>
                <span className="text-sm text-gray-300">{pts.length}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By source */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">By Source</h3>
          <div className="space-y-1.5">
            {Object.entries(bySource).sort((a, b) => b[1] - a[1]).map(([src, n]) => (
              <div key={src} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{SOURCE_ICONS[src] || '🔗'} {src}</span>
                <span className="text-sm text-gray-400">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold text-white">All Pain Points — Sorted by Severity × Urgency</h2>
          <span className="text-sm text-gray-500">{all.length} entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
                <th className="text-left px-4 py-3 w-8">#</th>
                <th className="text-left px-4 py-3">Pain Point</th>
                <th className="text-center px-3 py-3 w-10">Sev</th>
                <th className="text-center px-3 py-3 w-10">Urg</th>
                <th className="text-left px-3 py-3 w-28">Stage</th>
                <th className="text-left px-3 py-3 w-24">Source</th>
                <th className="text-left px-3 py-3 w-20">Freq</th>
              </tr>
            </thead>
            <tbody>
              {all.map((p, i) => (
                <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 text-gray-600 text-xs">{i + 1}</td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-white mb-1 leading-snug">{p.title}</div>
                    <div className="text-xs text-gray-400 leading-relaxed mb-1.5 max-w-2xl line-clamp-2">{p.description}</div>
                    {p.citation_text && (
                      <blockquote className="text-xs text-gray-500 italic border-l-2 border-gray-700 pl-2 line-clamp-2 max-w-2xl">
                        {p.citation_text}
                      </blockquote>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(p.persona_segments || []).slice(0, 3).map(seg => (
                        <span key={seg} className="text-xs bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">{seg}</span>
                      ))}
                      {(p.tags || []).slice(0, 4).map(tag => (
                        <span key={tag} className="text-xs bg-gray-800/50 text-gray-600 px-1.5 py-0.5 rounded">#{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-block w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${SEV_COLOR[p.severity]}`}>
                      {p.severity}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-block w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${SEV_COLOR[p.urgency]}`}>
                      {p.urgency}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-full">
                      {STAGE_LABELS[p.journey_stage_slug] || p.journey_stage_slug}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <a href={p.citation_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                      {SOURCE_ICONS[p.source_type] || '🔗'} <span className="truncate max-w-[80px]">{p.community_source}</span>
                    </a>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500 capitalize">{p.frequency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-800 text-center text-xs text-gray-600">
        {all.length} pain points · Phase 2 Signal Mining Complete · 3 community sources (Reddit, Twitter/X, LinkedIn/Quora)
      </div>
    </div>
  )
}
