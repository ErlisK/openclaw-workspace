import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PipelineBoard from '@/components/PipelineBoard'

export default async function DashboardHome() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, game_type, status, created_at')
    .eq('designer_id', user.id)
    .order('created_at', { ascending: false })

  const projectIds = (projects ?? []).map((p: any) => p.id)

  // Recent/active sessions
  const { data: sessions } = await supabase
    .from('playtest_sessions')
    .select(`
      id, title, status, scheduled_at, max_testers, platform, created_at,
      projects ( id, name, game_type )
    `)
    .eq('designer_id', user.id)
    .in('status', ['recruiting', 'scheduled', 'running', 'completed'])
    .order('scheduled_at', { ascending: false })
    .limit(10)

  const sessionIds = (sessions ?? []).map((s: any) => s.id)

  // All signups for active sessions
  const { data: signups } = sessionIds.length > 0
    ? await supabase
        .from('session_signups')
        .select('id, session_id, tester_name, tester_id, status, consent_given, pre_survey_completed, created_at')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  // Feedback for active sessions
  const { data: feedback } = sessionIds.length > 0
    ? await supabase
        .from('session_feedback')
        .select('id, session_id, overall_rating, clarity_rating, fun_rating, would_play_again, submitted_at')
        .in('session_id', sessionIds)
        .order('submitted_at', { ascending: false })
    : { data: [] }

  // Available rewards
  const { data: rewards } = projectIds.length > 0
    ? await supabase
        .from('reward_codes')
        .select('id, status, project_id')
        .in('project_id', projectIds)
    : { data: [] }

  // ─── Aggregate top-level stats ────────────────────────────────────────────
  const totalSignups = signups?.length ?? 0
  const attended = (signups ?? []).filter((s: any) => s.status === 'attended')
  const consented = (signups ?? []).filter((s: any) => s.consent_given)
  const preSurveyDone = (signups ?? []).filter((s: any) => s.pre_survey_completed)
  const feedbackCount = feedback?.length ?? 0
  const availableRewards = (rewards ?? []).filter((r: any) => r.status === 'available').length
  const activeSessions = (sessions ?? []).filter((s: any) => ['recruiting', 'scheduled', 'running'].includes(s.status))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Tester pipeline & feedback at a glance.</p>
        </div>
        <Link
          href="/dashboard/projects/new"
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + New Project
        </Link>
      </div>

      {/* Pipeline funnel */}
      {totalSignups > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Tester Pipeline — Active Sessions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { label: 'Signed Up', value: totalSignups, color: 'text-white', bg: 'bg-white/5', icon: '📝' },
              { label: 'Consented', value: consented.length, pct: totalSignups ? Math.round((consented.length / totalSignups) * 100) : 0, color: 'text-blue-400', bg: 'bg-blue-500/10', icon: '✅' },
              { label: 'Pre-Survey', value: preSurveyDone.length, pct: totalSignups ? Math.round((preSurveyDone.length / totalSignups) * 100) : 0, color: 'text-purple-400', bg: 'bg-purple-500/10', icon: '📋' },
              { label: 'Attended', value: attended.length, pct: totalSignups ? Math.round((attended.length / totalSignups) * 100) : 0, color: 'text-green-400', bg: 'bg-green-500/10', icon: '🎮' },
              { label: 'Feedback', value: feedbackCount, pct: attended.length ? Math.round((feedbackCount / attended.length) * 100) : 0, color: 'text-orange-400', bg: 'bg-orange-500/10', icon: '⭐' },
            ].map((step, i) => (
              <div key={step.label} className={`${step.bg} border border-white/10 rounded-xl p-4 relative`}>
                {i > 0 && (
                  <span className="absolute -left-3 top-1/2 -translate-y-1/2 text-gray-600 hidden sm:block text-lg">›</span>
                )}
                <div className="text-xl mb-1">{step.icon}</div>
                <div className={`text-2xl font-bold ${step.color}`}>{step.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{step.label}</div>
                {'pct' in step && (
                  <div className={`text-xs font-medium mt-1 ${step.color} opacity-70`}>{step.pct}%</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick stats row */}
      {(projects ?? []).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-2xl font-bold">{(projects ?? []).length}</div>
            <div className="text-xs text-gray-500 mt-1">Projects</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-400">{activeSessions.length}</div>
            <div className="text-xs text-gray-500 mt-1">Active Sessions</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-2xl font-bold text-orange-400">
              {feedbackCount > 0 && attended.length > 0
                ? (((feedback ?? []).reduce((sum: number, f: any) => sum + (f.overall_rating ?? 0), 0)) / feedbackCount).toFixed(1)
                : '—'}
            </div>
            <div className="text-xs text-gray-500 mt-1">Avg Rating</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-2xl font-bold text-purple-400">{availableRewards}</div>
            <div className="text-xs text-gray-500 mt-1">Reward Codes Available</div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {(projects ?? []).length === 0 && (
        <div className="text-center py-20 bg-white/[0.02] border border-white/10 rounded-2xl">
          <div className="text-5xl mb-4">🎲</div>
          <h2 className="text-xl font-bold mb-2">Create your first project</h2>
          <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
            A project holds your game's rule versions, playtest sessions, and tester feedback.
          </p>
          <Link href="/dashboard/projects/new"
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors">
            Create Project
          </Link>
        </div>
      )}

      {/* Pipeline board — per session */}
      {(sessions ?? []).length > 0 && (
        <PipelineBoard
          sessions={sessions as any[]}
          signups={signups as any[]}
          feedback={feedback as any[]}
        />
      )}

      {/* Projects grid */}
      {(projects ?? []).length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Projects</h2>
            <Link href="/dashboard/projects/new" className="text-xs text-gray-400 hover:text-white transition-colors">
              + New
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(projects ?? []).map((p: any) => (
              <Link key={p.id} href={`/dashboard/projects/${p.id}`}>
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-orange-500/40 transition-colors group">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">
                      {p.game_type === 'ttrpg' ? '🐉' : p.game_type === 'card_game' ? '🃏' : '🎲'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      p.status === 'active'
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                    }`}>{p.status}</span>
                  </div>
                  <h3 className="font-semibold group-hover:text-orange-400 transition-colors">{p.name}</h3>
                  <div className="text-xs text-gray-500 mt-2">
                    Created {new Date(p.created_at).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
