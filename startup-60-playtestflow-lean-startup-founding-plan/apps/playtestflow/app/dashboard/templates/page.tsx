import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import TemplateBuilder from '@/components/TemplateBuilder'

export default async function TemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, game_type')
    .eq('designer_id', user.id)
    .order('created_at', { ascending: false })

  const { data: templates } = await supabase
    .from('session_templates')
    .select(`
      id, name, description, duration_minutes, max_testers,
      roles, timing_blocks, scripted_tasks, version, created_at,
      projects ( id, name, game_type )
    `)
    .eq('designer_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Session Templates</h1>
          <p className="text-gray-400 text-sm mt-1">
            Define roles, timing blocks, and scripted tasks for repeatable playtests.
          </p>
        </div>
      </div>

      {/* Template list */}
      {templates && templates.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Your Templates</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {templates.map((t: any) => {
              const roles = t.roles ?? []
              const timingBlocks = t.timing_blocks ?? []
              const tasks = t.scripted_tasks ?? []
              return (
                <div key={t.id} className="bg-white/4 border border-white/10 rounded-xl p-5 hover:border-orange-500/30 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{t.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{t.projects?.name}</p>
                    </div>
                    <span className="text-[10px] text-gray-600 bg-white/5 px-2 py-0.5 rounded">v{t.version}</span>
                  </div>
                  {t.description && (
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">{t.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    <span>⏱ {t.duration_minutes}m</span>
                    <span>👥 {t.max_testers} testers</span>
                    <span>🎭 {roles.length} roles</span>
                    <span>📋 {timingBlocks.length} blocks</span>
                    <span>✅ {tasks.length} tasks</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Builder */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          {templates && templates.length > 0 ? 'Create New Template' : 'Create Your First Template'}
        </h2>
        {(projects ?? []).length === 0 ? (
          <div className="bg-white/4 border border-white/10 rounded-xl p-8 text-center">
            <p className="text-gray-400 mb-4">Create a project before building a template.</p>
            <Link href="/dashboard/projects/new"
              className="text-orange-400 hover:underline text-sm">
              Create a project →
            </Link>
          </div>
        ) : (
          <TemplateBuilder projects={projects as any[]} />
        )}
      </div>
    </div>
  )
}
