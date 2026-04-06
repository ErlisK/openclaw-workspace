import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: projects } = await supabase
    .from('projects')
    .select('*, playtest_sessions(count)')
    .eq('designer_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Your Projects</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your playtest projects and rule versions.</p>
        </div>
        <Link
          href="/dashboard/projects/new"
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + New Project
        </Link>
      </div>

      {!projects || projects.length === 0 ? (
        <div className="text-center py-20 bg-white/[0.02] border border-white/10 rounded-2xl">
          <div className="text-5xl mb-4">🎲</div>
          <h2 className="text-xl font-bold mb-2">Create your first project</h2>
          <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
            A project holds your game's rule versions, playtest sessions, and tester feedback.
          </p>
          <Link
            href="/dashboard/projects/new"
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            Create Project
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p: any) => (
            <Link key={p.id} href={`/dashboard/projects/${p.id}`}>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-orange-500/40 transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {p.game_type === 'ttrpg' ? '🐉' : p.game_type === 'card_game' ? '🃏' : '🎲'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      p.status === 'active'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                </div>
                <h3 className="font-semibold text-lg group-hover:text-orange-400 transition-colors mb-1">
                  {p.name}
                </h3>
                {p.description && (
                  <p className="text-gray-400 text-sm line-clamp-2 mb-3">{p.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{p.playtest_sessions?.[0]?.count ?? 0} sessions</span>
                  <span>Created {new Date(p.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
