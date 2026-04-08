import { supabase } from '@/lib/supabase'

const THEME_COLORS: Record<string, string> = {
  hallucination_trust:       'border-red-500/30 bg-red-950/20 text-red-300',
  compliance_pain:           'border-amber-500/30 bg-amber-950/20 text-amber-300',
  research_to_content_gap:   'border-purple-500/30 bg-purple-950/20 text-purple-300',
  tool_fragmentation:        'border-gray-500/30 bg-gray-900/60 text-gray-300',
  paywall_access:            'border-blue-500/30 bg-blue-950/20 text-blue-300',
  pre_submission_check:      'border-orange-500/30 bg-orange-950/20 text-orange-300',
  citation_bundle_value:     'border-emerald-500/30 bg-emerald-950/20 text-emerald-300',
  multi_format_demand:       'border-teal-500/30 bg-teal-950/20 text-teal-300',
  cmo_review_bottleneck:     'border-pink-500/30 bg-pink-950/20 text-pink-300',
  mlr_speed_gap:             'border-red-500/30 bg-red-950/20 text-red-300',
  rapid_cycle_need:          'border-yellow-500/30 bg-yellow-950/20 text-yellow-300',
  batch_verification_gap:    'border-indigo-500/30 bg-indigo-950/20 text-indigo-300',
  regulatory_doc_workflow:   'border-violet-500/30 bg-violet-950/20 text-violet-300',
  evidence_currency:         'border-cyan-500/30 bg-cyan-950/20 text-cyan-300',
  audit_readiness:           'border-red-400/30 bg-red-950/20 text-red-200',
}

export default async function InterviewsPage() {
  const { data: interviews, error } = await supabase
    .from('claimcheck_interviews')
    .select('*')
    .order('date_conducted', { ascending: true })

  if (error) {
    return <div className="text-red-400 text-sm">Error loading interviews: {error.message}</div>
  }

  const segmentCounts: Record<string, number> = {}
  const themeCount: Record<string, number> = {}
  const toolCount: Record<string, number> = {}

  interviews?.forEach(iv => {
    const seg = iv.interviewee_role?.split(',')[0] ?? 'Other'
    segmentCounts[seg] = (segmentCounts[seg] ?? 0) + 1
    iv.themes?.forEach((t: string) => { themeCount[t] = (themeCount[t] ?? 0) + 1 })
    iv.tools_mentioned?.forEach((t: string) => { toolCount[t] = (toolCount[t] ?? 0) + 1 })
  })

  const topThemes = Object.entries(themeCount).sort((a, b) => b[1] - a[1]).slice(0, 12)
  const topTools = Object.entries(toolCount).sort((a, b) => b[1] - a[1]).slice(0, 10)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Interviews</h1>
          <p className="text-gray-400 text-sm mt-1">
            {interviews?.length ?? 0} interviews · 5 target segments · Synthesized from AMWA/ISMPP/Reddit/G2/LinkedIn signals
          </p>
        </div>
        <div className="text-xs text-gray-500 border border-gray-700 rounded-lg px-3 py-2">
          Phase 2: recruit live interviews ≥15
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Top themes */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Top Themes</h3>
          <div className="space-y-2">
            {topThemes.map(([theme, count]) => (
              <div key={theme} className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-gray-800">
                  <div
                    className="h-1.5 rounded-full bg-blue-600"
                    style={{ width: `${(count / (interviews?.length ?? 1)) * 100}%` }}
                  />
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded border ${THEME_COLORS[theme] ?? 'border-gray-700 bg-gray-800 text-gray-400'}`}>
                  {theme.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-gray-600 w-4 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top tools */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Tools Currently Used</h3>
          <div className="space-y-1.5">
            {topTools.map(([tool, count]) => (
              <div key={tool} className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-mono">{tool}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1 rounded-full bg-gray-800 w-16">
                    <div
                      className="h-1 rounded-full bg-amber-600"
                      style={{ width: `${(count / (interviews?.length ?? 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 w-4 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* WTP summary */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">WTP Ranges by Segment</h3>
          <div className="space-y-2 text-xs">
            {[
              { seg: 'Solo journalists/bloggers', wtp: '$20–60/mo', color: 'text-gray-400' },
              { seg: 'Health startup / digital health', wtp: '$49–1,500/mo', color: 'text-blue-400' },
              { seg: 'Med-Ed agencies (SMB)', wtp: '$500–5,000/mo', color: 'text-amber-400' },
              { seg: 'University/research funder', wtp: '$2,000–8,000/mo', color: 'text-purple-400' },
              { seg: 'Mid-size pharma/biotech', wtp: '$1,000–15,000/mo', color: 'text-orange-400' },
              { seg: 'Enterprise pharma', wtp: '$10,000–50,000/mo', color: 'text-red-400' },
            ].map(({ seg, wtp, color }) => (
              <div key={seg} className="flex items-start justify-between gap-2">
                <span className="text-gray-500 leading-snug">{seg}</span>
                <span className={`shrink-0 font-medium ${color}`}>{wtp}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interview cards */}
      <div className="space-y-4">
        {interviews?.map((iv, i) => (
          <div key={iv.id} className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 font-mono">SY-{String(i + 1).padStart(3, '0')}</span>
                  <span className="font-medium text-white text-sm">{iv.interviewee_role}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {iv.organization} · {iv.org_size} employees
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium text-emerald-400">{iv.willingness_to_pay}</div>
                <div className="text-xs text-gray-600 mt-0.5">{iv.date_conducted}</div>
              </div>
            </div>

            {/* Key pains */}
            {iv.key_pains?.length > 0 && (
              <div className="mb-3">
                <span className="text-xs text-gray-600 uppercase tracking-wider">Pain Points</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {iv.key_pains.map((p: string) => (
                    <span key={p} className="text-xs bg-red-950/40 border border-red-700/30 text-red-300 px-2 py-0.5 rounded-full">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quotes */}
            {iv.quotes?.slice(0, 2).map((q: string, qi: number) => (
              <blockquote key={qi} className="text-xs text-gray-400 italic border-l-2 border-gray-700 pl-3 mb-2 leading-relaxed">
                &ldquo;{q}&rdquo;
              </blockquote>
            ))}

            {/* JTBD */}
            {iv.jtbd?.length > 0 && (
              <div className="mt-3">
                <span className="text-xs text-gray-600 uppercase tracking-wider">Jobs-to-be-Done</span>
                <ul className="mt-1.5 space-y-1">
                  {iv.jtbd.map((j: string) => (
                    <li key={j} className="text-xs text-gray-500 flex items-start gap-1.5">
                      <span className="text-blue-500 mt-0.5">→</span>
                      {j}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Themes */}
            {iv.themes?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {iv.themes.map((t: string) => (
                  <span
                    key={t}
                    className={`text-xs px-2 py-0.5 rounded-full border ${THEME_COLORS[t] ?? 'border-gray-700 bg-gray-800 text-gray-400'}`}
                  >
                    {t.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
