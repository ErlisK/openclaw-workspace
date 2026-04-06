import { createClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import SessionStatusUpdater from '@/components/SessionStatusUpdater'
import RewardAssigner from '@/components/RewardAssigner'
import SessionActions from '@/components/SessionActions'
import FeedbackSummary from '@/components/FeedbackSummary'

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { id } = await params

  const { data: session } = await supabase
    .from('playtest_sessions')
    .select('*, projects(name, id), rule_versions(version_label, storage_path)')
    .eq('id', id)
    .eq('designer_id', user.id)
    .single()

  if (!session) notFound()

  const { data: signups } = await supabase
    .from('session_signups')
    .select(`
      id, tester_name, tester_email, tester_id, role, status,
      consent_given, pre_survey_completed, consent_token, created_at,
      session_feedback(overall_rating, clarity_rating, fun_rating, submitted_at, would_play_again, confusion_areas)
    `)
    .eq('session_id', id)
    .order('created_at', { ascending: true })

  const { data: allRewards } = await supabase
    .from('reward_codes')
    .select('*')
    .eq('project_id', session.project_id ?? session.projects?.id)
    .is('assigned_to_signup', null)
    .eq('status', 'available')

  const { data: assignedRewards } = await supabase
    .from('reward_codes')
    .select('*')
    .not('assigned_to_signup', 'is', null)
    .in('assigned_to_signup', (signups ?? []).map((s: any) => s.id))

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playtestflow.vercel.app'

  const attended = signups?.filter((s: any) => s.status === 'attended') ?? []
  const confirmed = signups?.filter((s: any) => s.status === 'confirmed') ?? []
  const feedbackReceived = signups?.filter((s: any) => (s.session_feedback ?? []).length > 0) ?? []
  const consentedCount = signups?.filter((s: any) => s.consent_given) ?? []

  const avgRating = feedbackReceived.length > 0
    ? (feedbackReceived.reduce((sum: number, s: any) => sum + (s.session_feedback?.[0]?.overall_rating ?? 0), 0) / feedbackReceived.length).toFixed(1)
    : null

  const statusColors: Record<string, string> = {
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    recruiting: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    scheduled: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    running: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  }

  // Aggregate confusion areas across all feedback
  const allConfusionAreas: string[] = feedbackReceived.flatMap((s: any) =>
    s.session_feedback?.[0]?.confusion_areas ?? []
  )

  return (
    <div className="space-y-8">
      {/* Breadcrumb + header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/dashboard" className="hover:text-white transition-colors">Projects</Link>
          <span>/</span>
          <Link href={`/dashboard/projects/${session.projects?.id}`} className="hover:text-white transition-colors">
            {session.projects?.name}
          </Link>
          <span>/</span>
          <span className="text-white">{session.title}</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{session.title}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[session.status]}`}>
                {session.status}
              </span>
              {session.rule_versions?.version_label && (
                <span className="text-xs text-gray-400">📄 {session.rule_versions.version_label}</span>
              )}
              {session.platform && (
                <span className="text-xs text-gray-400">🖥 {session.platform}</span>
              )}
              {session.scheduled_at && (
                <span className="text-xs text-gray-400">
                  📅 {new Date(session.scheduled_at).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              )}
            </div>
          </div>
          <SessionStatusUpdater sessionId={id} currentStatus={session.status} />
        </div>
      </div>

      {/* Session actions — ICS, emails, meeting link */}
      <SessionActions
        sessionId={id}
        sessionTitle={session.title}
        meetingUrl={session.meeting_url}
        scheduledAt={session.scheduled_at}
        status={session.status}
        siteUrl={siteUrl}
        confirmedCount={confirmed.length}
        attendedCount={attended.length}
        feedbackCount={feedbackReceived.length}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Signed up', value: signups?.length ?? 0, color: 'text-white' },
          { label: 'Attended', value: attended.length, color: 'text-green-400' },
          { label: 'Show-up rate', value: signups?.length ? `${Math.round((attended.length / (signups.length || 1)) * 100)}%` : '—', color: 'text-blue-400' },
          { label: 'Avg rating', value: avgRating ? `${avgRating}/5` : feedbackReceived.length === 0 ? '—' : '0/5', color: 'text-orange-400' },
        ].map((s) => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recruit + meeting links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-300">Recruit link</p>
            <p className="text-xs text-gray-400 font-mono mt-0.5">/recruit/{id.slice(0,8)}…</p>
          </div>
          <a href={`/recruit/${id}`} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 underline">Open →</a>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-purple-300">Calendar invite</p>
            <p className="text-xs text-gray-400 mt-0.5">Export .ics for Zoom/Google Meet</p>
          </div>
          <a href={`/api/sessions/${id}/ics`} download
            className="text-xs text-purple-400 hover:text-purple-300 underline">Download .ics →</a>
        </div>
      </div>

      {/* Feedback summary (only when feedback exists) */}
      {feedbackReceived.length > 0 && (
        <FeedbackSummary
          signups={feedbackReceived as any[]}
          confusionAreas={allConfusionAreas}
        />
      )}

      {/* Tester roster */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Tester Roster ({signups?.length ?? 0})</h2>
        {!signups || signups.length === 0 ? (
          <div className="bg-white/3 border border-white/8 rounded-xl p-8 text-center">
            <p className="text-gray-500 text-sm">No signups yet.</p>
            <a href={`/recruit/${id}`} target="_blank" rel="noopener noreferrer"
              className="text-orange-400 text-sm mt-2 inline-block hover:underline">
              Share recruit link →
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-gray-500 text-left bg-white/3">
                  <th className="px-4 py-3">Tester</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Consent</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Feedback</th>
                  <th className="px-4 py-3">Reward</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {signups.map((s: any) => {
                  const assigned = assignedRewards?.find((r: any) => r.assigned_to_signup === s.id)
                  return (
                    <tr key={s.id} className="hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">{s.tester_name}</div>
                        <div className="text-gray-500 text-xs">{s.tester_email}</div>
                        {s.tester_id && (
                          <code className="text-gray-600 text-[10px]">{s.tester_id}</code>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{s.role || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`text-[10px] ${s.consent_given ? 'text-green-400' : 'text-gray-600'}`}>
                            {s.consent_given ? '✓ Consented' : '○ Pending'}
                          </span>
                          <span className={`text-[10px] ${s.pre_survey_completed ? 'text-green-400' : 'text-gray-600'}`}>
                            {s.pre_survey_completed ? '✓ Pre-survey' : '○ Pre-survey'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          s.status === 'attended' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          s.status === 'no_show' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          s.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          'bg-gray-500/20 text-gray-400 border-gray-500/30'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {(s.session_feedback ?? []).length > 0 ? (
                          <div>
                            <span className="text-green-400 font-medium">
                              ⭐ {s.session_feedback[0].overall_rating}/5
                            </span>
                            {s.session_feedback[0].fun_rating && (
                              <span className="text-gray-500 text-[10px] ml-1">
                                fun: {s.session_feedback[0].fun_rating}
                              </span>
                            )}
                          </div>
                        ) : (
                          <a
                            href={`/survey/post/${s.consent_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-orange-400 transition-colors"
                          >
                            Pending ↗
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <RewardAssigner
                          signupId={s.id}
                          signupName={s.tester_name}
                          availableRewards={allRewards ?? []}
                          assignedReward={assigned}
                        />
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
