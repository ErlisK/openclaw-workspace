import { createServiceClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import SessionRunner from '@/components/SessionRunner'

/**
 * /session/[runId]?token=<consent_token>
 * 
 * Tester-facing participant flow for a test run.
 * Renders the template's timing blocks + scripted tasks with per-task timers.
 * Captures time-on-task events to Supabase realtime.
 */
export default async function SessionRunPage({
  params,
  searchParams,
}: {
  params: Promise<{ runId: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { runId } = await params
  const { token } = await searchParams

  const supabase = createServiceClient()

  // Load test run + template + session info
  const { data: run } = await supabase
    .from('test_runs')
    .select(`
      id, status, session_id, template_id, started_at,
      playtest_sessions (
        id, title, platform, meeting_url, duration_minutes,
        projects ( name, game_type )
      ),
      session_templates (
        id, name, duration_minutes, roles, timing_blocks, scripted_tasks,
        pre_survey_schema, post_survey_schema
      )
    `)
    .eq('id', runId)
    .single()

  if (!run) notFound()

  const session = run.playtest_sessions as any
  const template = run.session_templates as any

  // Resolve tester identity from consent token (optional — allows anon participation)
  let signup = null
  if (token) {
    const { data } = await supabase
      .from('session_signups')
      .select('id, tester_name, tester_id, consent_given, pre_survey_completed')
      .eq('consent_token', token)
      .eq('session_id', session?.id)
      .single()
    signup = data
  }

  // Run must be in pending or running state
  if (run.status === 'cancelled') {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-xl font-bold">Session Cancelled</h1>
          <p className="text-gray-400 mt-2">This playtest session has been cancelled.</p>
        </div>
      </div>
    )
  }

  const roles: any[] = Array.isArray(template?.roles) ? template.roles : []
  const timingBlocks: any[] = Array.isArray(template?.timing_blocks) ? template.timing_blocks : []
  const tasks: any[] = Array.isArray(template?.scripted_tasks) ? template.scripted_tasks : []

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎲</span>
            <div>
              <span className="font-bold text-orange-400 text-sm">PlaytestFlow</span>
              <span className="text-gray-600 mx-2">·</span>
              <span className="text-sm text-gray-300">{session?.title}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {run.status === 'running' && (
              <span className="flex items-center gap-1.5 text-xs text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Live
              </span>
            )}
            {session?.meeting_url && (
              <a
                href={session.meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-400 px-3 py-1.5 rounded-lg transition-colors"
              >
                Open {session?.platform ?? 'Meeting'} →
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Welcome card */}
        <div className="bg-white/4 border border-white/10 rounded-2xl p-6 mb-8">
          <h1 className="text-xl font-bold mb-1">{session?.title}</h1>
          <p className="text-gray-400 text-sm">{session?.projects?.name}</p>
          {signup && (
            <p className="text-sm mt-3">
              Welcome, <span className="text-orange-400 font-medium">{signup.tester_name}</span>
              {signup.tester_id && (
                <span className="text-gray-600 text-xs ml-2 font-mono">({signup.tester_id})</span>
              )}
            </p>
          )}
          <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-500">
            {template?.duration_minutes && (
              <span>⏱ ~{template.duration_minutes} minutes</span>
            )}
            {roles.length > 0 && (
              <span>🎭 {roles.length} role{roles.length > 1 ? 's' : ''}: {roles.map((r: any) => r.name).join(', ')}</span>
            )}
            {timingBlocks.length > 0 && (
              <span>📋 {timingBlocks.length} phases</span>
            )}
            {tasks.length > 0 && (
              <span>✅ {tasks.length} tasks</span>
            )}
          </div>
        </div>

        {/* Session Runner — client component with timer */}
        {timingBlocks.length === 0 && tasks.length === 0 ? (
          <div className="bg-white/4 border border-white/10 rounded-2xl p-8 text-center">
            <div className="text-3xl mb-3">📋</div>
            <h2 className="font-bold text-lg mb-2">No template loaded</h2>
            <p className="text-gray-400 text-sm">
              This session doesn't have a task template. Follow the facilitator's instructions.
            </p>
            {session?.meeting_url && (
              <a
                href={session.meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold text-sm"
              >
                Join Session →
              </a>
            )}
          </div>
        ) : (
          <SessionRunner
            runId={runId}
            sessionId={session?.id}
            signupId={signup?.id ?? null}
            testerId={signup?.tester_id ?? null}
            timingBlocks={timingBlocks}
            tasks={tasks}
            roles={roles}
            runStatus={run.status}
            meetingUrl={session?.meeting_url ?? null}
          />
        )}
      </div>
    </div>
  )
}
