import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // All sessions for this designer
  const { data: sessions } = await supabase
    .from('playtest_sessions')
    .select(`
      id, title, status, scheduled_at, platform,
      projects ( name, game_type ),
      rule_versions ( version_label )
    `)
    .eq('designer_id', user.id)
    .order('scheduled_at', { ascending: false })

  const sessionIds = (sessions ?? []).map((s: any) => s.id)

  // Signups for all sessions
  const { data: signups } = sessionIds.length > 0
    ? await supabase
        .from('session_signups')
        .select('id, session_id, status, consent_given, pre_survey_completed')
        .in('session_id', sessionIds)
    : { data: [] }

  // Feedback for all sessions
  const { data: feedback } = sessionIds.length > 0
    ? await supabase
        .from('session_feedback')
        .select('id, session_id, overall_rating, clarity_rating, fun_rating, would_play_again, submitted_at')
        .in('session_id', sessionIds)
    : { data: [] }

  // Reward codes
  const { data: projects } = await supabase
    .from('projects')
    .select('id')
    .eq('designer_id', user.id)

  const projectIds = (projects ?? []).map((p: any) => p.id)

  const { data: rewards } = projectIds.length > 0
    ? await supabase
        .from('reward_codes')
        .select('id, status, reward_type, project_id')
        .in('project_id', projectIds)
    : { data: [] }

  // ─── Aggregate metrics ────────────────────────────────────────────────────

  const totalSessions = sessions?.length ?? 0
  const completedSessions = sessions?.filter((s: any) => s.status === 'completed').length ?? 0
  const totalSignups = signups?.length ?? 0
  const attended = signups?.filter((s: any) => s.status === 'attended') ?? []
  const showUpRate = totalSignups > 0 ? Math.round((attended.length / totalSignups) * 100) : 0
  const feedbackCount = feedback?.length ?? 0
  const surveyRate = attended.length > 0 ? Math.round((feedbackCount / attended.length) * 100) : 0

  const avgOverall = feedback && feedback.length > 0
    ? (feedback.reduce((sum: number, f: any) => sum + (f.overall_rating ?? 0), 0) / feedback.length).toFixed(1)
    : null
  const avgClarity = feedback && feedback.length > 0
    ? (feedback.reduce((sum: number, f: any) => sum + (f.clarity_rating ?? 0), 0) / feedback.filter((f: any) => f.clarity_rating).length || 0).toFixed(1)
    : null
  const wouldPlayAgain = feedback?.filter((f: any) => f.would_play_again === true).length ?? 0
  const wouldPlayPct = feedbackCount > 0 ? Math.round((wouldPlayAgain / feedbackCount) * 100) : 0

  const totalRewards = rewards?.length ?? 0
  const assignedRewards = rewards?.filter((r: any) => r.status === 'assigned').length ?? 0
  const availableRewards = rewards?.filter((r: any) => r.status === 'available').length ?? 0

  // Session-level breakdown
  type SessionRow = {
    id: string
    title: string
    status: string
    scheduled_at?: string
    platform?: string
    projects?: any
    signupCount: number
    attendedCount: number
    feedbackCount: number
    avgRating: string | null
  }

  const sessionStats: SessionRow[] = (sessions ?? []).map((s: any) => {
    const sSignups = (signups ?? []).filter((sg: any) => sg.session_id === s.id)
    const sAttended = sSignups.filter((sg: any) => sg.status === 'attended')
    const sFeedback = (feedback ?? []).filter((f: any) => f.session_id === s.id)
    const avgRating = sFeedback.length > 0
      ? (sFeedback.reduce((sum: number, f: any) => sum + (f.overall_rating ?? 0), 0) / sFeedback.length).toFixed(1)
      : null

    return {
      id: s.id,
      title: s.title,
      status: s.status,
      scheduled_at: s.scheduled_at,
      platform: s.platform,
      projects: s.projects,
      signupCount: sSignups.length,
      attendedCount: sAttended.length,
      feedbackCount: sFeedback.length,
      avgRating,
    }
  })

  const statusColor: Record<string, string> = {
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    recruiting: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    scheduled: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    running: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  }

  function Stat({ label, value, sub, color = 'text-white' }: { label: string; value: string | number; sub?: string; color?: string }) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <div className={`text-3xl font-bold ${color}`}>{value}</div>
        <div className="text-sm text-gray-400 mt-1">{label}</div>
        {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="text-xs text-gray-500">All-time · {totalSessions} sessions</div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Completed sessions" value={completedSessions} sub={`of ${totalSessions} total`} color="text-green-400" />
        <Stat label="Show-up rate" value={`${showUpRate}%`} sub={`${attended.length} of ${totalSignups} signups`} color="text-blue-400" />
        <Stat label="Survey completion" value={`${surveyRate}%`} sub={`${feedbackCount} of ${attended.length} attended`} color="text-orange-400" />
        <Stat label="Avg overall rating" value={avgOverall ? `${avgOverall}/5` : '—'} sub={`${feedbackCount} responses`} color="text-yellow-400" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Avg rules clarity" value={avgClarity && parseFloat(avgClarity) > 0 ? `${avgClarity}/5` : '—'} />
        <Stat label="Would play again" value={`${wouldPlayPct}%`} sub={`${wouldPlayAgain} of ${feedbackCount}`} color="text-green-400" />
        <Stat label="Reward codes issued" value={assignedRewards} sub={`${availableRewards} available`} color="text-purple-400" />
        <Stat label="Total signups" value={totalSignups} color="text-white" />
      </div>

      {/* Success criteria tracker */}
      <div className="bg-white/4 border border-white/10 rounded-2xl p-5">
        <h2 className="font-semibold mb-4">Phase 2 Success Criteria</h2>
        <div className="space-y-3">
          {[
            {
              label: '≥5 designer teams onboarded',
              actual: '—',
              target: 5,
              current: 1,
              unit: 'teams',
            },
            {
              label: '≥10 completed sessions',
              target: 10,
              current: completedSessions,
              unit: 'sessions',
            },
            {
              label: '≥60% tester show-up rate',
              target: 60,
              current: showUpRate,
              unit: '%',
            },
            {
              label: '≥80% survey completion rate',
              target: 80,
              current: surveyRate,
              unit: '%',
            },
          ].map((crit) => {
            const pct = Math.min((crit.current / crit.target) * 100, 100)
            const met = crit.current >= crit.target
            return (
              <div key={crit.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-300">{crit.label}</span>
                  <span className={met ? 'text-green-400 font-semibold' : 'text-gray-400'}>
                    {crit.current}{crit.unit !== 'teams' ? crit.unit : ''} / {crit.target}{crit.unit}
                    {met ? ' ✓' : ''}
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${met ? 'bg-green-400' : 'bg-orange-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Session breakdown table */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Session Breakdown</h2>
        {sessionStats.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-8">
            No sessions yet. <Link href="/dashboard/sessions" className="text-orange-400 hover:underline">Create one →</Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/3 border-b border-white/10 text-xs text-gray-500 text-left">
                  <th className="px-4 py-3">Session</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Signups</th>
                  <th className="px-4 py-3 text-right">Attended</th>
                  <th className="px-4 py-3 text-right">Show-up</th>
                  <th className="px-4 py-3 text-right">Feedback</th>
                  <th className="px-4 py-3 text-right">Avg ⭐</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sessionStats.map((s) => {
                  const showUp = s.signupCount > 0 ? Math.round((s.attendedCount / s.signupCount) * 100) : 0
                  return (
                    <tr key={s.id} className="hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/sessions/${s.id}`} className="font-medium hover:text-orange-400 transition-colors">
                          {s.title}
                        </Link>
                        <div className="text-gray-500 text-xs">{s.projects?.name}</div>
                        {s.scheduled_at && (
                          <div className="text-gray-600 text-xs">
                            {new Date(s.scheduled_at).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor[s.status]}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{s.signupCount}</td>
                      <td className="px-4 py-3 text-right">{s.attendedCount}</td>
                      <td className={`px-4 py-3 text-right font-medium ${showUp >= 60 ? 'text-green-400' : showUp > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                        {s.signupCount > 0 ? `${showUp}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">{s.feedbackCount}</td>
                      <td className={`px-4 py-3 text-right font-medium ${s.avgRating && parseFloat(s.avgRating) >= 4 ? 'text-green-400' : s.avgRating ? 'text-orange-400' : 'text-gray-500'}`}>
                        {s.avgRating ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
