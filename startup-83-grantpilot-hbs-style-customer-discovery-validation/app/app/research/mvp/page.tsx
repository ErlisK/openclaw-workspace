import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface MvpFeature {
  id: string
  feature_name: string
  description: string
  priority: number
  status: string
  category: string
  rationale: string
  mvp_tier: string
  build_week: number
  impact_score: number
  ics_export: boolean
  effort_estimate: string
  journey_stages_covered: string[]
  personas_targeted: string[]
  acceptance_criteria: string[]
  pain_points_addressed: string[]
  linked_pain_points: string[]
  linked_journey_stages: string[]
  notes: string
}

async function getData() {
  const supabase = createAdminClient()
  const { data } = await supabase.from('mvp_scope').select('*').order('priority')
  return { features: (data || []) as MvpFeature[] }
}

const EFFORT_LABELS: Record<string, { label: string; color: string; weeks: string }> = {
  S:  { label: 'Small',   color: 'text-green-700 bg-green-100',   weeks: '~1 week' },
  M:  { label: 'Medium',  color: 'text-yellow-700 bg-yellow-100', weeks: '~2 weeks' },
  L:  { label: 'Large',   color: 'text-orange-700 bg-orange-100', weeks: '~3 weeks' },
  XL: { label: 'X-Large', color: 'text-red-700 bg-red-100',       weeks: '4+ weeks' },
}

const STAGE_EMOJIS: Record<string, string> = {
  discovery: '🔍', eligibility: '✅', 'funder-research': '🏦',
  planning: '📋', writing: '✏️', compliance: '📜',
  review: '👁️', submission: '🚀', tracking: '📊',
  'award-management': '🏆', reporting: '📝',
}

function ImpactBar({ score, max = 25 }: { score: number; max?: number }) {
  const pct = Math.round((score / max) * 100)
  const color = score >= 22 ? 'bg-red-500' : score >= 18 ? 'bg-orange-400' : 'bg-yellow-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-gray-900 w-6 text-right">{score}</span>
    </div>
  )
}

function WeekBadge({ week }: { week: number }) {
  const colors = ['', 'bg-blue-100 text-blue-800', 'bg-purple-100 text-purple-800',
    'bg-pink-100 text-pink-800', 'bg-orange-100 text-orange-800',
    'bg-red-100 text-red-800', 'bg-gray-100 text-gray-700']
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${colors[Math.min(week, 6)] || colors[6]}`}>
      Wk {week}
    </span>
  )
}

export default async function MvpPage() {
  const { features } = await getData()

  const coreFeatures = features.filter(f => f.mvp_tier === 'core')
  const supportingFeatures = features.filter(f => f.mvp_tier !== 'core')
  const icsFeatures = features.filter(f => f.ics_export)

  // Group by build week for timeline
  const byWeek = features.reduce((acc, f) => {
    const w = f.build_week || 0
    if (!acc[w]) acc[w] = []
    acc[w].push(f)
    return acc
  }, {} as Record<number, MvpFeature[]>)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <a href="/research" className="hover:text-blue-600">Research</a>
                <span>›</span>
                <span>MVP Scope</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">MVP Scope & Acceptance Criteria</h1>
              <p className="text-gray-500 mt-1">
                High-urgency slice: RFP parsing → narrative/budget → forms/checklists → export package → timeline reminders (ICS)
              </p>
            </div>
            <div className="flex gap-5">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{coreFeatures.length}</div>
                <div className="text-xs text-gray-500">Core Slice</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{supportingFeatures.length}</div>
                <div className="text-xs text-gray-500">Supporting</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{icsFeatures.length}</div>
                <div className="text-xs text-gray-500">ICS Export</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-8">

        {/* Core slice summary */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-200 p-5">
          <h2 className="text-base font-semibold text-red-900 mb-2">🎯 High-Urgency MVP Core Slice</h2>
          <p className="text-sm text-red-800 mb-4">
            Five features covering the highest-pain grant lifecycle stages: writing (avg score 13.8, 39 pain points), planning (14.2, 32 pts), submission (14.9, 20 pts), eligibility (13.3, 17 pts), and compliance (12.1, 24 pts). Together these eliminate 80% of the friction in getting from RFP discovery to submitted application.
          </p>
          <div className="flex flex-wrap gap-2">
            {coreFeatures.map(f => (
              <a key={f.id} href={`#feature-${f.priority}`} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-red-200 hover:border-red-400 transition-colors text-sm">
                <span className="font-bold text-red-600">{f.priority}</span>
                <span className="font-medium text-gray-900">{f.feature_name}</span>
                {f.ics_export && <span title="Exports .ics calendar files">📅</span>}
                <span className="text-xs text-gray-500">impact {f.impact_score}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Build timeline */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">🗓️ Build Timeline</h2>
          <div className="grid grid-cols-4 gap-3">
            {[1,2,3,4].map(week => {
              const wkFeatures = byWeek[week] || []
              return (
                <div key={week} className="rounded-lg border border-gray-200 p-3">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Week {week}</div>
                  <div className="space-y-1.5">
                    {wkFeatures.map(f => (
                      <div key={f.id} className={`text-xs p-1.5 rounded ${f.mvp_tier === 'core' ? 'bg-red-50 text-red-800 border border-red-100' : 'bg-blue-50 text-blue-800 border border-blue-100'}`}>
                        <span className="font-medium">{f.feature_name}</span>
                        {f.ics_export && <span className="ml-1">📅</span>}
                      </div>
                    ))}
                    {wkFeatures.length === 0 && <div className="text-xs text-gray-400 italic">-</div>}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-3 text-xs text-gray-500">
            Post-slice (Weeks 5–8): Funder Intelligence Engine · Grant Reporting Assistant · full portal connectors
          </div>
        </div>

        {/* ICS / Timeline Reminders callout */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
          <h2 className="text-base font-semibold text-blue-900 mb-2">📅 Timeline Reminders & ICS Export</h2>
          <p className="text-sm text-blue-800 mb-3">
            Three features generate <strong>.ics calendar files</strong> importable into Google Calendar, Outlook, and Apple Calendar. Deadline slippage is a 5×5 pain (score 25) — proactive ICS reminders are the lowest-effort, highest-impact trust signal for first-time users.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {icsFeatures.map(f => (
              <div key={f.id} className="bg-white rounded-lg border border-blue-200 p-3 text-xs">
                <div className="font-semibold text-gray-900 mb-1">{f.feature_name}</div>
                <ul className="space-y-0.5 text-gray-600">
                  {f.feature_name.includes('Pipeline') && (
                    <>
                      <li>• Submission deadline reminders</li>
                      <li>• 30/14/7/3/1 day alerts</li>
                      <li>• Renewal date reminders</li>
                    </>
                  )}
                  {f.feature_name.includes('Export') && (
                    <>
                      <li>• Submission confirmation .ics</li>
                      <li>• Report due date .ics</li>
                      <li>• Renewal deadline .ics</li>
                    </>
                  )}
                  {f.feature_name.includes('SAM') && (
                    <>
                      <li>• SAM.gov annual renewal alert</li>
                      <li>• 60/30/14/7 day pre-alerts</li>
                      <li>• State charity reg reminders</li>
                    </>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Feature cards */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-4">All Features — Acceptance Criteria</h2>
          <div className="space-y-5">
            {features.map(f => {
              const effort = EFFORT_LABELS[f.effort_estimate] || EFFORT_LABELS.M
              const isCore = f.mvp_tier === 'core'
              return (
                <div
                  id={`feature-${f.priority}`}
                  key={f.id}
                  className={`bg-white rounded-xl border overflow-hidden ${isCore ? 'border-red-200 shadow-sm' : 'border-gray-200'}`}
                >
                  {/* Feature header */}
                  <div className={`px-6 py-4 border-b ${isCore ? 'border-red-100 bg-gradient-to-r from-red-50 to-white' : 'border-gray-100'}`}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${isCore ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                          {f.priority}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-semibold text-gray-900">{f.feature_name}</h3>
                            {isCore && (
                              <span className="text-xs bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                                🎯 Core Slice
                              </span>
                            )}
                            {f.ics_export && (
                              <span className="text-xs bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                                📅 ICS Export
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">{f.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <WeekBadge week={f.build_week} />
                        <span className={`text-xs px-2 py-1 rounded font-medium ${effort.color}`}>
                          {effort.label}
                        </span>
                        <div className="w-28">
                          <div className="text-xs text-gray-400 mb-1">Impact</div>
                          <ImpactBar score={f.impact_score || 0} />
                        </div>
                      </div>
                    </div>

                    {/* Rationale */}
                    {f.rationale && (
                      <div className="mt-3 text-xs text-gray-600 bg-gray-50 rounded px-3 py-2 border border-gray-100">
                        <span className="font-medium text-gray-700">Why now: </span>{f.rationale}
                      </div>
                    )}

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {(f.journey_stages_covered || f.linked_journey_stages || []).map(s => (
                        <span key={s} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                          {STAGE_EMOJIS[s] || '📌'} {s}
                        </span>
                      ))}
                      {(f.personas_targeted || []).map(p => (
                        <span key={p} className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded">
                          👤 {p}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* AC + Pain Points */}
                  <div className="grid grid-cols-2 gap-0 text-sm">
                    <div className="px-6 py-4 border-r border-gray-100">
                      <div className="font-medium text-gray-700 mb-3">Acceptance Criteria</div>
                      <ul className="space-y-2">
                        {(f.acceptance_criteria || []).map((c, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-600 text-xs">
                            <span className={`w-5 h-5 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center text-xs ${isCore ? 'border-red-300 text-red-500' : 'border-gray-300 text-gray-400'}`}>
                              {i + 1}
                            </span>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="px-6 py-4">
                      <div className="font-medium text-gray-700 mb-3">Pain Points Addressed</div>
                      <ul className="space-y-1.5">
                        {(f.pain_points_addressed || f.linked_pain_points || []).map((p, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-600 text-xs">
                            <span className="text-red-400 flex-shrink-0">✕</span>
                            {p}
                          </li>
                        ))}
                      </ul>
                      {f.notes && (
                        <div className="mt-3 text-xs text-gray-500 italic border-t border-gray-100 pt-2">
                          {f.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
