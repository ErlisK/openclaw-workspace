import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface JourneyStage {
  id: string
  stage_number: number
  stage_name: string
  stage_slug: string
  description: string
  actor: string
  jobs_to_be_done: string[]
  pain_points_summary: string[]
  opportunity_flags: string[]
  grantpilot_coverage: string
}

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
  citation_url: string
  citation_text: string
  community_source: string
  tags: string[]
}

interface StageNeed {
  id: string
  stage_slug: string
  need_title: string
  need_description: string
  actor_role: string
  current_solution: string
  solution_gaps: string[]
  source_citations: string[]
  urgency_score: number
}

interface StageTool {
  id: string
  stage_slug: string
  tool_name: string
  tool_category: string
  tool_url: string
  used_by_personas: string[]
  strengths: string[]
  weaknesses: string[]
  pricing: string
  grant_pilot_replaces: boolean
  notes: string
}

async function getData() {
  const supabase = createAdminClient()
  const [stagesRes, painRes, needsRes, toolsRes] = await Promise.all([
    supabase.from('journey_stages').select('*').order('stage_number'),
    supabase.from('pain_points').select('*').order('severity', { ascending: false }),
    supabase.from('stage_needs').select('*').order('urgency_score', { ascending: false }),
    supabase.from('stage_tools').select('*').order('tool_name'),
  ])
  return {
    stages: (stagesRes.data || []) as JourneyStage[],
    painPoints: (painRes.data || []) as PainPoint[],
    needs: (needsRes.data || []) as StageNeed[],
    tools: (toolsRes.data || []) as StageTool[],
  }
}

function SeverityBar({ value, max = 5 }: { value: number; max?: number }) {
  const colors = ['', 'bg-green-400', 'bg-lime-400', 'bg-yellow-400', 'bg-orange-500', 'bg-red-500']
  return (
    <div className="flex gap-0.5 items-center">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={`h-2 w-3 rounded-sm ${i < value ? (colors[value] || 'bg-gray-300') : 'bg-gray-200'}`}
        />
      ))}
    </div>
  )
}

function CoverageTag({ coverage }: { coverage: string }) {
  const map: Record<string, string> = {
    full: 'bg-green-100 text-green-800 border-green-200',
    partial: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    none: 'bg-red-100 text-red-800 border-red-200',
  }
  const key = coverage?.toLowerCase() || 'none'
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${map[key] || map.none}`}>
      {coverage || 'No coverage'}
    </span>
  )
}

function ToolCard({ tool }: { tool: StageTool }) {
  return (
    <div className={`rounded-lg border p-3 text-xs ${tool.grant_pilot_replaces ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <a
          href={tool.tool_url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-gray-900 hover:text-blue-600"
        >
          {tool.tool_name} ↗
        </a>
        {tool.grant_pilot_replaces && (
          <span className="flex-shrink-0 text-xs bg-red-200 text-red-800 px-1.5 py-0.5 rounded font-medium">
            GP replaces
          </span>
        )}
      </div>
      <div className="text-gray-500 mb-1">{tool.pricing}</div>
      <div className="flex gap-1 flex-wrap mb-1.5">
        {(tool.strengths || []).map(s => (
          <span key={s} className="text-green-700 bg-green-50 border border-green-100 px-1 py-0.5 rounded">{s}</span>
        ))}
      </div>
      <div className="flex gap-1 flex-wrap">
        {(tool.weaknesses || []).map(w => (
          <span key={w} className="text-red-700 bg-red-50 border border-red-100 px-1 py-0.5 rounded">{w}</span>
        ))}
      </div>
      {tool.notes && (
        <div className="mt-1.5 text-gray-500 italic border-t border-gray-100 pt-1">{tool.notes}</div>
      )}
    </div>
  )
}

function NeedCard({ need }: { need: StageNeed }) {
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="font-semibold text-gray-900">{need.need_title}</div>
        <div className="flex-shrink-0 text-center">
          <div className="text-base font-bold text-blue-700">{need.urgency_score}</div>
          <div className="text-gray-400 text-xs leading-none">urgency</div>
        </div>
      </div>
      <div className="text-gray-600 mb-1.5">{need.need_description}</div>
      <div className="text-gray-500 mb-1"><span className="font-medium">Actor:</span> {need.actor_role}</div>
      <div className="text-gray-500 mb-1.5"><span className="font-medium">Current:</span> {need.current_solution}</div>
      {(need.solution_gaps || []).length > 0 && (
        <div>
          <div className="font-medium text-gray-600 mb-1">Gaps:</div>
          <ul className="space-y-0.5">
            {need.solution_gaps.map((g, i) => (
              <li key={i} className="flex gap-1.5 text-red-700">
                <span className="flex-shrink-0">✕</span>{g}
              </li>
            ))}
          </ul>
        </div>
      )}
      {(need.source_citations || []).length > 0 && (
        <div className="mt-1.5 flex gap-1 flex-wrap">
          {need.source_citations.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
               className="text-blue-500 hover:underline">
              [cite {i+1}] ↗
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

const STAGE_EMOJIS: Record<string, string> = {
  discovery: '🔍',
  eligibility: '✅',
  'funder-research': '🏦',
  planning: '📋',
  writing: '✏️',
  compliance: '📜',
  review: '👁️',
  submission: '🚀',
  tracking: '📊',
  'award-management': '🏆',
  reporting: '📝',
}

export default async function JourneyPage() {
  const { stages, painPoints, needs, tools } = await getData()

  const painByStage = painPoints.reduce((acc, p) => {
    if (!acc[p.journey_stage_slug]) acc[p.journey_stage_slug] = []
    acc[p.journey_stage_slug].push(p)
    return acc
  }, {} as Record<string, PainPoint[]>)

  const needsByStage = needs.reduce((acc, n) => {
    if (!acc[n.stage_slug]) acc[n.stage_slug] = []
    acc[n.stage_slug].push(n)
    return acc
  }, {} as Record<string, StageNeed[]>)

  const toolsByStage = tools.reduce((acc, t) => {
    if (!acc[t.stage_slug]) acc[t.stage_slug] = []
    acc[t.stage_slug].push(t)
    return acc
  }, {} as Record<string, StageTool[]>)

  const sourceStats = painPoints.reduce((acc, p) => {
    acc[p.source_type] = (acc[p.source_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <a href="/research" className="hover:text-blue-600">Research</a>
                <span>›</span>
                <span>Journey Map</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Grant Lifecycle Journey Map</h1>
              <p className="text-gray-500 mt-1">
                {stages.length} stages · {painPoints.length} pain points · {needs.length} unmet needs · {tools.length} incumbent tools mapped
              </p>
            </div>
            {/* Source stats */}
            <div className="flex gap-4 flex-wrap">
              {Object.entries(sourceStats).map(([src, n]) => (
                <div key={src} className="text-center">
                  <div className="text-lg font-bold text-gray-900">{n}</div>
                  <div className="text-xs text-gray-500 capitalize">{src}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stage nav pills */}
          <div className="flex flex-wrap gap-2 mt-5">
            {stages.map(s => {
              const stagePoints = painByStage[s.stage_slug] || []
              const avgSev = stagePoints.length
                ? (stagePoints.reduce((a, b) => a + b.severity, 0) / stagePoints.length).toFixed(1)
                : '—'
              return (
                <a
                  key={s.stage_slug}
                  href={`#stage-${s.stage_slug}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-800 transition-colors"
                >
                  <span>{STAGE_EMOJIS[s.stage_slug] || '📌'}</span>
                  <span className="text-gray-400">{s.stage_number}.</span>
                  {s.stage_name}
                  <span className="bg-white text-gray-600 px-1.5 py-0.5 rounded-full text-xs">
                    {stagePoints.length} · {avgSev}★
                  </span>
                </a>
              )
            })}
          </div>
        </div>
      </div>

      {/* Journey stages */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        {stages.map(stage => {
          const stagePoints = (painByStage[stage.stage_slug] || [])
            .sort((a, b) => (b.severity * b.urgency) - (a.severity * a.urgency))
          const stageNeeds = needsByStage[stage.stage_slug] || []
          const stageTools = toolsByStage[stage.stage_slug] || []
          const avgSev = stagePoints.length
            ? stagePoints.reduce((a, b) => a + b.severity, 0) / stagePoints.length
            : 0

          return (
            <div id={`stage-${stage.stage_slug}`} key={stage.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              {/* Stage header */}
              <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg flex-shrink-0">
                      {STAGE_EMOJIS[stage.stage_slug] || stage.stage_number}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        <span className="text-gray-400 font-normal text-sm mr-1">{stage.stage_number}.</span>
                        {stage.stage_name}
                      </h2>
                      <p className="text-sm text-gray-500 mt-0.5">{stage.actor}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-center">
                      <div className="text-xs text-gray-400 mb-1">Avg Severity</div>
                      <SeverityBar value={Math.round(avgSev)} />
                      <div className="text-xs text-gray-500 mt-0.5">{avgSev.toFixed(1)}/5</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400">Pain Points</div>
                      <div className="text-2xl font-bold text-gray-900">{stagePoints.length}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400">Unmet Needs</div>
                      <div className="text-2xl font-bold text-blue-600">{stageNeeds.length}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400 mb-1">GP Coverage</div>
                      <CoverageTag coverage={stage.grantpilot_coverage} />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-3 leading-relaxed">{stage.description}</p>
              </div>

              {/* Jobs & Opportunities */}
              <div className="grid grid-cols-2 gap-0 border-b border-gray-100 text-sm">
                <div className="px-6 py-4 border-r border-gray-100">
                  <div className="font-medium text-gray-700 mb-2">Jobs To Be Done</div>
                  <ul className="space-y-1.5">
                    {(stage.jobs_to_be_done || []).map((j, i) => (
                      <li key={i} className="text-gray-600 flex gap-2">
                        <span className="text-blue-400 flex-shrink-0">→</span>
                        {j}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="px-6 py-4">
                  <div className="font-medium text-gray-700 mb-2">Opportunity Flags</div>
                  <ul className="space-y-1.5">
                    {(stage.opportunity_flags || []).map((o, i) => (
                      <li key={i} className="text-gray-600 flex gap-2">
                        <span className="text-green-500 flex-shrink-0">✦</span>
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Unmet Needs */}
              {stageNeeds.length > 0 && (
                <div className="px-6 py-4 border-b border-gray-100">
                  <div className="text-sm font-medium text-gray-700 mb-3">
                    🎯 Unmet Needs ({stageNeeds.length}) — Validated from public signal mining
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {stageNeeds.map(n => <NeedCard key={n.id} need={n} />)}
                  </div>
                </div>
              )}

              {/* Incumbent Tools */}
              {stageTools.length > 0 && (
                <div className="px-6 py-4 border-b border-gray-100">
                  <div className="text-sm font-medium text-gray-700 mb-3">
                    🔧 Incumbent Tools ({stageTools.length}) — What people use today
                    {stageTools.filter(t => t.grant_pilot_replaces).length > 0 && (
                      <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                        {stageTools.filter(t => t.grant_pilot_replaces).length} GrantPilot replaces
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {stageTools.map(t => <ToolCard key={t.id} tool={t} />)}
                  </div>
                </div>
              )}

              {/* Top Pain Points */}
              {stagePoints.length > 0 && (
                <div className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-700 mb-3">
                    🔴 Top Pain Points ({stagePoints.length})
                  </div>
                  <div className="space-y-2">
                    {stagePoints.slice(0, 5).map(p => (
                      <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex-shrink-0 mt-1">
                          <SeverityBar value={p.severity} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">{p.title}</div>
                          <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{p.description}</div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {(p.tags || []).slice(0, 4).map(tag => (
                              <span key={tag} className="text-xs px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500">
                                {tag}
                              </span>
                            ))}
                            <span className="text-xs text-gray-400 self-center">{p.community_source}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-center">
                          <div className="text-xs text-gray-400">Sev×Urg</div>
                          <div className={`text-base font-bold ${p.severity * p.urgency >= 20 ? 'text-red-600' : p.severity * p.urgency >= 12 ? 'text-orange-600' : 'text-gray-700'}`}>
                            {p.severity * p.urgency}
                          </div>
                        </div>
                        {p.citation_url && (
                          <a href={p.citation_url} target="_blank" rel="noopener noreferrer"
                             className="text-gray-300 hover:text-blue-500 flex-shrink-0 mt-0.5 text-lg" title={p.citation_text}>
                            ↗
                          </a>
                        )}
                      </div>
                    ))}
                    {stagePoints.length > 5 && (
                      <div className="text-xs text-center text-gray-400 py-1">
                        +{stagePoints.length - 5} more —{' '}
                        <a href="/research/pain-points" className="text-blue-500 hover:underline">
                          see full table →
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer legend */}
      <div className="max-w-7xl mx-auto px-6 pb-12 text-xs text-gray-400 space-y-1">
        <div>Pain point score = Severity (1–5) × Urgency (1–5). Max 25.</div>
        <div>Unmet needs sourced from: Reddit (r/nonprofit, r/grants, r/civilengineering, r/publicadministration), Twitter/X, LinkedIn, Quora, ProductHunt, Indie Hackers.</div>
        <div>GrantPilot coverage: <span className="text-green-600">full</span> = feature built, <span className="text-yellow-600">partial</span> = partially addressed, <span className="text-red-600">none</span> = gap in current scope.</div>
      </div>
    </div>
  )
}
