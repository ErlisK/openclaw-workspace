import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function SessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: sessions } = await supabase
    .from('playtest_sessions')
    .select('*, projects(name), session_signups(count), rule_versions(version_label)')
    .eq('designer_id', user.id)
    .order('created_at', { ascending: false })

  const statusColors: Record<string, string> = {
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    recruiting: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    scheduled: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    running: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">All Sessions</h1>
        <p className="text-gray-400 text-sm mt-1">View and manage all your playtest sessions across projects.</p>
      </div>

      {!sessions || sessions.length === 0 ? (
        <div className="text-center py-20 bg-white/[0.02] border border-white/10 rounded-2xl">
          <div className="text-5xl mb-4">🎮</div>
          <h2 className="text-xl font-bold mb-2">No sessions yet</h2>
          <p className="text-gray-400 text-sm mb-6">Create sessions from a project page.</p>
          <Link href="/dashboard" className="text-orange-400 underline text-sm">Go to Projects →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s: any) => (
            <Link key={s.id} href={`/dashboard/sessions/${s.id}`}>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-orange-500/40 transition-colors group">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-medium group-hover:text-orange-400 transition-colors">{s.title}</h3>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {s.projects?.name}
                      {s.rule_versions?.version_label && ` — ${s.rule_versions.version_label}`}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[s.status] ?? statusColors.draft}`}>
                    {s.status}
                  </span>
                </div>
                <div className="flex items-center gap-6 text-xs text-gray-500">
                  <span>👥 {s.session_signups?.[0]?.count ?? 0} / {s.max_testers} testers</span>
                  {s.scheduled_at && <span>📅 {new Date(s.scheduled_at).toLocaleDateString()}</span>}
                  {s.platform && <span>🖥 {s.platform}</span>}
                  <span className="ml-auto font-mono text-gray-600">
                    /recruit/{s.id.slice(0, 8)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
