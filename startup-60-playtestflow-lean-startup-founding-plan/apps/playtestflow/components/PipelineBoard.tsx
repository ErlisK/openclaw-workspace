'use client'

interface Session {
  id: string
  title: string
  status: string
  scheduled_at?: string
  max_testers: number
  platform?: string
  projects?: { id: string; name: string; game_type?: string }
}

interface Signup {
  id: string
  session_id: string
  tester_name: string
  tester_id?: string
  status: string
  consent_given: boolean
  pre_survey_completed: boolean
  created_at: string
}

interface Feedback {
  id: string
  session_id: string
  overall_rating: number
  clarity_rating?: number
  fun_rating?: number
  would_play_again?: boolean
  submitted_at: string
}

const STATUS_ORDER = ['recruiting', 'scheduled', 'running', 'completed', 'cancelled']
const STATUS_STYLE: Record<string, string> = {
  recruiting: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  scheduled: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  running: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

function PipelineBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="h-1 bg-white/10 rounded-full overflow-hidden w-full">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function PipelineBoard({
  sessions,
  signups,
  feedback,
}: {
  sessions: Session[]
  signups: Signup[]
  feedback: Feedback[]
}) {
  const sorted = [...sessions].sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(a.status)
    const bi = STATUS_ORDER.indexOf(b.status)
    if (ai !== bi) return ai - bi
    return new Date(b.scheduled_at ?? b.id).getTime() - new Date(a.scheduled_at ?? a.id).getTime()
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Session Pipeline</h2>
        <a href="/dashboard/sessions" className="text-xs text-gray-400 hover:text-white transition-colors">
          View all →
        </a>
      </div>

      <div className="space-y-3">
        {sorted.map((s) => {
          const sSignups = signups.filter((sg) => sg.session_id === s.id)
          const consented = sSignups.filter((sg) => sg.consent_given)
          const preSurveyDone = sSignups.filter((sg) => sg.pre_survey_completed)
          const attended = sSignups.filter((sg) => sg.status === 'attended')
          const sFeedback = feedback.filter((f) => f.session_id === s.id)
          const avgRating = sFeedback.length > 0
            ? (sFeedback.reduce((sum, f) => sum + (f.overall_rating ?? 0), 0) / sFeedback.length).toFixed(1)
            : null

          const showUpRate = sSignups.length > 0
            ? Math.round((attended.length / sSignups.length) * 100)
            : null

          return (
            <a
              key={s.id}
              href={`/dashboard/sessions/${s.id}`}
              className="block bg-white/4 border border-white/10 rounded-xl p-5 hover:border-orange-500/40 transition-colors group"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium group-hover:text-orange-400 transition-colors truncate">
                      {s.title}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${STATUS_STYLE[s.status] ?? STATUS_STYLE.draft}`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{s.projects?.name}</span>
                    {s.platform && <span>· {s.platform}</span>}
                    {s.scheduled_at && (
                      <span>· {new Date(s.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    )}
                  </div>
                </div>

                {/* Compact metrics */}
                <div className="flex items-center gap-4 text-right shrink-0">
                  {avgRating && (
                    <div>
                      <div className="text-sm font-bold text-orange-400">{avgRating}/5</div>
                      <div className="text-[10px] text-gray-600">avg rating</div>
                    </div>
                  )}
                  {showUpRate !== null && (
                    <div>
                      <div className={`text-sm font-bold ${showUpRate >= 60 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {showUpRate}%
                      </div>
                      <div className="text-[10px] text-gray-600">show-up</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pipeline bar */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Signed up', value: sSignups.length, max: s.max_testers, bar: 'bg-blue-400', color: 'text-blue-400' },
                  { label: 'Consented', value: consented.length, max: sSignups.length, bar: 'bg-purple-400', color: 'text-purple-400' },
                  { label: 'Attended', value: attended.length, max: sSignups.length, bar: 'bg-green-400', color: 'text-green-400' },
                  { label: 'Feedback', value: sFeedback.length, max: Math.max(attended.length, 1), bar: 'bg-orange-400', color: 'text-orange-400' },
                ].map((step) => (
                  <div key={step.label}>
                    <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                      <span>{step.label}</span>
                      <span className={`font-semibold ${step.color}`}>{step.value}</span>
                    </div>
                    <PipelineBar value={step.value} max={step.max} color={step.bar} />
                  </div>
                ))}
              </div>

              {/* Recent signups preview */}
              {sSignups.length > 0 && (
                <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                  {sSignups.slice(0, 6).map((sg) => (
                    <span
                      key={sg.id}
                      title={sg.tester_name}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                        sg.status === 'attended'
                          ? 'bg-green-500/20 border-green-500/40 text-green-300'
                          : sg.status === 'no_show'
                          ? 'bg-red-500/20 border-red-500/40 text-red-300'
                          : sg.consent_given
                          ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                          : 'bg-white/8 border-white/15 text-gray-400'
                      }`}
                    >
                      {sg.tester_name.charAt(0).toUpperCase()}
                    </span>
                  ))}
                  {sSignups.length > 6 && (
                    <span className="text-[10px] text-gray-500">+{sSignups.length - 6} more</span>
                  )}
                  <span className="text-[10px] text-gray-600 ml-auto">
                    {sSignups.length}/{s.max_testers} spots
                  </span>
                </div>
              )}
            </a>
          )
        })}
      </div>
    </div>
  )
}
