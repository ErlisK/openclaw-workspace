import { createClient, createServiceClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import ConsentForm from './ConsentForm'

export default async function ConsentPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = createServiceClient()

  // Look up signup by consent token
  const { data: signup } = await supabase
    .from('session_signups')
    .select(`
      id, tester_name, tester_id, consent_given, consent_given_at, consent_version,
      pre_survey_completed, status,
      playtest_sessions (
        id, title, scheduled_at, platform, max_testers,
        projects ( name, game_type, description )
      )
    `)
    .eq('consent_token', token)
    .single()

  if (!signup) notFound()

  const session = signup.playtest_sessions as any
  const project = session?.projects as any

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <div className="max-w-lg mx-auto px-6 py-12">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-2xl">🎲</span>
            <span className="font-bold text-lg text-orange-400">PlaytestFlow</span>
          </div>
          <p className="text-gray-500 text-xs">Research Consent & Session Info</p>
        </div>

        {/* Session card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-3xl">
              {project?.game_type === 'ttrpg' ? '🐉' : project?.game_type === 'card_game' ? '🃏' : '🎲'}
            </span>
            <div>
              <h1 className="font-bold text-lg">{session?.title}</h1>
              <p className="text-gray-400 text-sm">{project?.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {session?.platform && (
              <div className="bg-white/5 rounded-lg px-3 py-2">
                <div className="text-xs text-gray-500">Platform</div>
                <div className="text-sm font-medium">{session.platform}</div>
              </div>
            )}
            {session?.scheduled_at && (
              <div className="bg-white/5 rounded-lg px-3 py-2">
                <div className="text-xs text-gray-500">Scheduled</div>
                <div className="text-sm font-medium">
                  {new Date(session.scheduled_at).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tester identity card */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-5 py-4 mb-6">
          <p className="text-blue-300 text-xs font-medium mb-1">Your Anonymous Tester ID</p>
          <code className="text-white font-mono text-sm">{signup.tester_id}</code>
          <p className="text-gray-500 text-xs mt-2">
            This ID is used to link your feedback to your signup without exposing your name or email
            to other participants. Only the designer can associate it with your registration.
          </p>
        </div>

        {/* Consent form or already-consented state */}
        <ConsentForm
          token={token}
          testerName={signup.tester_name}
          alreadyConsented={signup.consent_given}
          consentedAt={signup.consent_given_at}
          preSurveyCompleted={signup.pre_survey_completed}
          sessionId={session?.id}
        />
      </div>
    </div>
  )
}
