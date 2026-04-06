import { createClient, createServiceClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import PreSurveyForm from './PreSurveyForm'

export default async function PreSurveyPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: signup } = await supabase
    .from('session_signups')
    .select(`
      id, tester_name, tester_id, consent_given, pre_survey_completed,
      playtest_sessions (
        id, title, platform, scheduled_at,
        projects ( name, game_type )
      )
    `)
    .eq('consent_token', token)
    .single()

  if (!signup) notFound()

  // Must consent before survey
  if (!signup.consent_given) {
    redirect(`/consent/${token}`)
  }

  const session = signup.playtest_sessions as any
  const project = session?.projects as any

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <div className="max-w-lg mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <span className="text-2xl">🎲</span>
          <span className="font-bold text-lg text-orange-400 ml-2">PlaytestFlow</span>
          <div className="mt-4 flex items-center justify-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
              Signed up
            </span>
            <span className="text-white/20">──</span>
            <span className="flex items-center gap-1">
              <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
              Consented
            </span>
            <span className="text-white/20">──</span>
            <span className="flex items-center gap-1">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${signup.pre_survey_completed ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}`}>
                {signup.pre_survey_completed ? '✓' : '3'}
              </span>
              <span className={signup.pre_survey_completed ? '' : 'text-white font-medium'}>Pre-survey</span>
            </span>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-3 mb-6 flex items-center gap-3">
          <span className="text-xl">{project?.game_type === 'ttrpg' ? '🐉' : '🎲'}</span>
          <div>
            <p className="font-medium text-sm">{session?.title}</p>
            <p className="text-gray-500 text-xs">{project?.name}</p>
          </div>
          {session?.scheduled_at && (
            <div className="ml-auto text-right">
              <p className="text-xs text-gray-400">
                {new Date(session.scheduled_at).toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric',
                })}
              </p>
            </div>
          )}
        </div>

        {signup.pre_survey_completed ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-xl font-bold mb-2">Pre-survey complete!</h2>
            <p className="text-gray-400 text-sm">
              Thanks, {signup.tester_name}. You'll receive session details by email.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-xl font-bold">Pre-Session Survey</h1>
              <p className="text-gray-400 text-sm mt-1">
                ~2 minutes · Helps the designer prepare the right experience for you.
              </p>
            </div>
            <PreSurveyForm
              token={token}
              signupId={signup.id}
              sessionId={session?.id}
              testerId={signup.tester_id}
            />
          </>
        )}
      </div>
    </div>
  )
}
