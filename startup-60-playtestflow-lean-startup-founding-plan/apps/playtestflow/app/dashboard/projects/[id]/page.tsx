import { createClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import RuleUploader from '@/components/RuleUploader'
import SessionCreator from '@/components/SessionCreator'
import RecruitWidgetEmbed from '@/components/RecruitWidgetEmbed'
import Link from 'next/link'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { id } = await params

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('designer_id', user.id)
    .single()

  if (!project) notFound()

  const { data: ruleVersions } = await supabase
    .from('rule_versions')
    .select('*')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })

  const { data: sessions } = await supabase
    .from('playtest_sessions')
    .select('*, session_signups(count)')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })

  const latestVersion = ruleVersions?.[0] ?? null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/dashboard" className="hover:text-white transition-colors">Projects</Link>
            <span>/</span>
            <span className="text-white">{project.name}</span>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <span>{project.game_type === 'ttrpg' ? '🐉' : project.game_type === 'card_game' ? '🃏' : '🎲'}</span>
            {project.name}
          </h1>
          {project.description && (
            <p className="text-gray-400 text-sm mt-1">{project.description}</p>
          )}
        </div>
        <span className={`text-xs px-3 py-1 rounded-full border ${
          project.status === 'active'
            ? 'bg-green-500/20 text-green-400 border-green-500/30'
            : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
        }`}>
          {project.status}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Rule Versions', value: ruleVersions?.length ?? 0 },
          { label: 'Sessions', value: sessions?.length ?? 0 },
          { label: 'Total Signups', value: sessions?.reduce((acc: number, s: any) => acc + (s.session_signups?.[0]?.count ?? 0), 0) ?? 0 },
        ].map((stat) => (
          <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">{stat.value}</div>
            <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Rule Versions */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            📄 Rule Versions
            <span className="text-xs text-gray-500 font-normal">Upload versioned PDFs</span>
          </h2>

          <RuleUploader projectId={project.id} />

          {ruleVersions && ruleVersions.length > 0 ? (
            <div className="mt-4 space-y-3">
              {ruleVersions.map((v: any) => (
                <div
                  key={v.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-orange-400">{v.version_label}</span>
                      {v.id === latestVersion?.id && (
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">
                          latest
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-xs mt-0.5">{v.file_name}</p>
                    {v.notes && <p className="text-gray-500 text-xs mt-1">{v.notes}</p>}
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <div>{v.file_size_bytes ? `${(v.file_size_bytes / 1024).toFixed(0)} KB` : ''}</div>
                    <div>{new Date(v.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 text-center py-8 bg-white/[0.02] border border-dashed border-white/10 rounded-xl">
              <p className="text-gray-500 text-sm">No rule versions yet</p>
              <p className="text-gray-600 text-xs mt-1">Upload your first PDF above</p>
            </div>
          )}
        </div>

        {/* Right: Sessions */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            🎮 Playtest Sessions
          </h2>

          <SessionCreator projectId={project.id} ruleVersions={ruleVersions ?? []} />

          {sessions && sessions.length > 0 ? (
            <div className="mt-4 space-y-3">
              {sessions.map((s: any) => (
                <Link key={s.id} href={`/dashboard/sessions/${s.id}`}>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-orange-500/40 transition-colors group">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-sm group-hover:text-orange-400 transition-colors">
                        {s.title}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        s.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                        s.status === 'recruiting' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                        s.status === 'scheduled' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                        'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      }`}>
                        {s.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{s.session_signups?.[0]?.count ?? 0} / {s.max_testers} signups</span>
                      {s.scheduled_at && (
                        <span>{new Date(s.scheduled_at).toLocaleDateString()}</span>
                      )}
                      {s.platform && <span>{s.platform}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-4 text-center py-8 bg-white/[0.02] border border-dashed border-white/10 rounded-xl">
              <p className="text-gray-500 text-sm">No sessions yet</p>
              <p className="text-gray-600 text-xs mt-1">Create your first playtest session above</p>
            </div>
          )}
        </div>
      </div>

      {/* Recruit Widget */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          🔗 Recruit Widget
          <span className="text-xs text-gray-500 font-normal">Embed on your blog or share the link</span>
        </h2>
        <RecruitWidgetEmbed projectId={project.id} projectName={project.name} sessions={sessions ?? []} />
      </div>
    </div>
  )
}
