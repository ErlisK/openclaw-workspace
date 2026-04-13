import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import FeedbackTable from '@/components/FeedbackTable'

export default async function SessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: sessions } = await supabase
    .from('playtest_sessions')
    .select(`
      id, title, status, scheduled_at, max_testers, platform, created_at,
      projects ( id, name, game_type ),
      rule_versions ( version_label )
    `)
    .eq('designer_id', user.id)
    .order('created_at', { ascending: false })

  const sessionIds = (sessions ?? []).map((s: any) => s.id)

  // Signups with consent + survey status
  const { data: signups } = sessionIds.length > 0
    ? await supabase
        .from('session_signups')
        .select(`
          id, session_id, tester_name, tester_email, tester_id, role, status,
          consent_given, pre_survey_completed, consent_token, created_at
        `)
        .in('session_id', sessionIds)
        .order('created_at', { ascending: true })
    : { data: [] }

  // All feedback
  const { data: feedback } = sessionIds.length > 0
    ? await supabase
        .from('session_feedback')
        .select(`
          id, session_id, tester_id, overall_rating, clarity_rating, fun_rating,
          would_play_again, confusion_areas, rules_clarity_notes, suggested_changes,
          most_enjoyed, time_played_minutes, submitted_at
        `)
        .in('session_id', sessionIds)
        .order('submitted_at', { ascending: false })
    : { data: [] }

  const statusColors: Record<string, string> = {
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    recruiting: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    scheduled: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    running: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  }

  const sessionsFeedback = (sessions ?? []).reduce<Record<string, any[]>>((acc, s: any) => {
    acc[s.id] = (feedback ?? []).filter((f: any) => f.session_id === s.id)
    return acc
  }, {})

  const sessionsSignups = (sessions ?? []).reduce<Record<string, any[]>>((acc, s: any) => {
    acc[s.id] = (signups ?? []).filter((sg: any) => sg.session_id === s.id)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sessions</h1>
          <p className="text-gray-400 text-sm mt-1">Tester pipeline and feedback for all sessions.</p>
        </div>
        <Link href="/dashboard" className="text-xs text-gray-400 hover:text-white transition-colors">
          ← Dashboard
        </Link>
      </div>

      {!sessions || sessions.length === 0 ? (
        <div className="text-center py-20 bg-white/[0.02] border border-white/10 rounded-2xl">
          <div className="text-5xl mb-4">🎮</div>
          <h2 className="text-xl font-bold mb-2">No sessions yet</h2>
          <p className="text-gray-400 text-sm mb-6">Create sessions from a project page.</p>
          <Link href="/dashboard" className="text-orange-400 underline text-sm">Go to Projects →</Link>
        </div>
      ) : (
        <div className="space-y-8">
          {(sessions ?? []).map((s: any) => {
            const sSignups = sessionsSignups[s.id] ?? []
            const sFeedback = sessionsFeedback[s.id] ?? []
            const attended = sSignups.filter((sg: any) => sg.status === 'attended')
            const consented = sSignups.filter((sg: any) => sg.consent_given)
            const avgRating = sFeedback.length > 0
              ? (sFeedback.reduce((sum: number, f: any) => sum + (f.overall_rating ?? 0), 0) / sFeedback.length).toFixed(1)
              : null

            return (
              <div key={s.id} className="bg-white/3 border border-white/10 rounded-2xl overflow-hidden">
                {/* Session header */}
                <div className="px-6 py-4 border-b border-white/8 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/dashboard/sessions/${s.id}`}
                        className="font-semibold hover:text-orange-400 transition-colors"
                      >
                        {s.title}
                      </Link>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColors[s.status] ?? statusColors.draft}`}>
                        {s.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                      <span>{s.projects?.name}</span>
                      {s.rule_versions?.version_label && <span>· {s.rule_versions.version_label}</span>}
                      {s.platform && <span>· {s.platform}</span>}
                      {s.scheduled_at && (
                        <span>· {new Date(s.scheduled_at).toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric',
                        })}</span>
                      )}
                    </div>
                  </div>

                  {/* Mini KPIs */}
                  <div className="flex items-center gap-4 text-center shrink-0">
                    {[
                      { v: sSignups.length, l: 'signed up', c: 'text-white' },
                      { v: `${attended.length}/${sSignups.length}`, l: 'attended', c: 'text-green-400' },
                      { v: sFeedback.length, l: 'feedback', c: 'text-orange-400' },
                      avgRating ? { v: `⭐${avgRating}`, l: 'avg', c: 'text-yellow-400' } : null,
                    ].filter(Boolean).map((kpi: any) => (
                      <div key={kpi.l}>
                        <div className={`text-sm font-bold ${kpi.c}`}>{kpi.v}</div>
                        <div className="text-[10px] text-gray-600">{kpi.l}</div>
                      </div>
                    ))}
                    <Link
                      href={`/dashboard/sessions/${s.id}`}
                      className="text-xs text-gray-400 hover:text-orange-400 transition-colors"
                    >
                      Manage →
                    </Link>
                  </div>
                </div>

                {/* Tester roster */}
                {sSignups.length > 0 && (
                  <div className="px-6 py-4 border-b border-white/5">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Tester Roster ({sSignups.length}/{s.max_testers})
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {sSignups.map((sg: any) => (
                        <div
                          key={sg.id}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
                            sg.status === 'attended'
                              ? 'bg-green-500/8 border-green-500/20'
                              : sg.status === 'no_show'
                              ? 'bg-red-500/8 border-red-500/20'
                              : sg.consent_given
                              ? 'bg-blue-500/8 border-blue-500/20'
                              : 'bg-white/4 border-white/10'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            sg.status === 'attended' ? 'bg-green-500/30 text-green-300' :
                            sg.status === 'no_show' ? 'bg-red-500/30 text-red-300' :
                            sg.consent_given ? 'bg-blue-500/30 text-blue-300' : 'bg-white/15 text-gray-400'
                          }`}>
                            {sg.tester_name.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-white/80">{sg.tester_name}</div>
                            <div className="flex gap-1 mt-0.5">
                              <span className={sg.consent_given ? 'text-green-400' : 'text-gray-600'} title="Consent">C</span>
                              <span className={sg.pre_survey_completed ? 'text-green-400' : 'text-gray-600'} title="Pre-survey">P</span>
                              <span className={sg.status === 'attended' ? 'text-green-400' : sg.status === 'no_show' ? 'text-red-400' : 'text-gray-600'} title="Attendance">A</span>
                              <span className={
                                sFeedback.some((f: any) => f.tester_id === sg.tester_id) ? 'text-green-400' : 'text-gray-600'
                              } title="Feedback">F</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-600 mt-2">C = consent · P = pre-survey · A = attended · F = feedback</p>
                  </div>
                )}

                {/* Feedback table */}
                {sFeedback.length > 0 && (
                  <div className="px-6 py-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Feedback ({sFeedback.length} response{sFeedback.length !== 1 ? 's' : ''})
                    </h3>
                    <FeedbackTable feedback={sFeedback} signups={sSignups} />
                  </div>
                )}

                {sSignups.length === 0 && (
                  <div className="px-6 py-4 text-center">
                    <p className="text-gray-600 text-sm">No testers yet.</p>
                    <a
                      href={`/recruit/${s.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-400 text-xs hover:underline mt-1 inline-block"
                    >
                      Share recruit link →
                    </a>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
