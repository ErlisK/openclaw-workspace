import { createClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import SessionStatusUpdater from '@/components/SessionStatusUpdater'
import RewardAssigner from '@/components/RewardAssigner'

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
    .select('*, session_feedback(overall_rating, clarity_rating, fun_rating, submitted_at)')
    .eq('session_id', id)
    .order('created_at', { ascending: true })

  const { data: rewards } = await supabase
    .from('reward_codes')
    .select('*')
    .eq('session_id', id)
    .order('created_at', { ascending: true })

  const { data: allRewards } = await supabase
    .from('reward_codes')
    .select('*')
    .eq('project_id', session.project_id ?? session.projects?.id)
    .eq('status', 'available')

  const attended = signups?.filter((s: any) => s.status === 'attended') ?? []
  const feedbackCount = signups?.filter((s: any) => s.session_feedback?.length > 0).length ?? 0

  const statusColors: Record<string, string> = {
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    recruiting: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    scheduled: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    running: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  }

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
            <div className="flex items-center gap-3 mt-2">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[session.status]}`}>
                {session.status}
              </span>
              {session.rule_versions?.version_label && (
                <span className="text-xs text-gray-400">
                  📄 {session.rule_versions.version_label}
                </span>
              )}
              {session.platform && (
                <span className="text-xs text-gray-400">🖥 {session.platform}</span>
              )}
            </div>
          </div>
          <SessionStatusUpdater sessionId={id} currentStatus={session.status} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Signed up', value: signups?.length ?? 0, color: 'text-white' },
          { label: 'Attended', value: attended.length, color: 'text-green-400' },
          { label: 'Show-up rate', value: signups?.length ? `${Math.round((attended.length / signups.length) * 100)}%` : '—', color: 'text-blue-400' },
          { label: 'Feedback received', value: feedbackCount, color: 'text-orange-400' },
        ].map((s) => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recruit link */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-blue-300">Recruit link</p>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            /recruit/{id}
          </p>
        </div>
        <a
          href={`/recruit/${id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 underline"
        >
          Open →
        </a>
      </div>

      {/* Tester roster */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Tester Roster ({signups?.length ?? 0})</h2>
        {!signups || signups.length === 0 ? (
          <p className="text-gray-500 text-sm">No signups yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-gray-500 text-left">
                  <th className="pb-3 pr-4">Tester</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Feedback</th>
                  <th className="pb-3">Reward</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {signups.map((s: any) => (
                  <tr key={s.id}>
                    <td className="py-3 pr-4">
                      <div className="font-medium">{s.tester_name}</div>
                      <div className="text-gray-500 text-xs">{s.tester_email}</div>
                    </td>
                    <td className="py-3 pr-4 text-gray-400 text-xs">{s.role || '—'}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        s.status === 'attended' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                        s.status === 'no_show' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        s.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                        'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs">
                      {s.session_feedback?.length > 0 ? (
                        <span className="text-green-400">
                          ⭐ {s.session_feedback[0].overall_rating}/5
                        </span>
                      ) : (
                        <span className="text-gray-600">Pending</span>
                      )}
                    </td>
                    <td className="py-3">
                      <RewardAssigner
                        signupId={s.id}
                        signupName={s.tester_name}
                        availableRewards={allRewards ?? []}
                        assignedReward={rewards?.find((r: any) => r.assigned_to_signup === s.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
