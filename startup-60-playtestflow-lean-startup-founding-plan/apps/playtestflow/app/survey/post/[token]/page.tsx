import { createServiceClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import PostSurveyForm from './PostSurveyForm'
import RuleVersionDiff from '@/components/RuleVersionDiff'

export default async function PostSurveyPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: signup } = await supabase
    .from('session_signups')
    .select(`
      id, tester_name, tester_id, consent_given,
      playtest_sessions (
        id, title, scheduled_at, platform,
        rule_versions ( version_label ),
        projects ( name, game_type )
      )
    `)
    .eq('consent_token', token)
    .single()

  if (!signup) notFound()
  if (!signup.consent_given) redirect(`/consent/${token}`)

  // Check if already submitted post-session feedback
  const { data: existingFeedback } = await supabase
    .from('session_feedback')
    .select('id')
    .eq('signup_id', signup.id)
    .eq('feedback_type', 'post')
    .single()

  const session = signup.playtest_sessions as any
  const project = session?.projects as any

  // Fetch rule version diff
  let diff = null
  if (session?.id) {
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playtestflow.vercel.app'
      const res = await fetch(`${siteUrl}/api/rule-versions/diff?session_id=${session.id}`, {
        next: { revalidate: 300 },
      })
      const data = await res.json()
      diff = data.diff ?? null
    } catch { /* non-critical */ }
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <div className="max-w-lg mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <span className="text-2xl">🎲</span>
          <span className="font-bold text-lg text-orange-400 ml-2">PlaytestFlow</span>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-3 mb-6 flex items-center gap-3">
          <span className="text-xl">{project?.game_type === 'ttrpg' ? '🐉' : '🎲'}</span>
          <div>
            <p className="font-medium text-sm">{session?.title}</p>
            <p className="text-gray-500 text-xs">
              {project?.name}
              {session?.rule_versions?.version_label && ` · ${session.rule_versions.version_label}`}
            </p>
          </div>
        </div>

        {existingFeedback ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-xl font-bold mb-2">Feedback received!</h2>
            <p className="text-gray-400 text-sm">
              Thanks for your feedback, {signup.tester_name}. The designer will use it to improve the game.
            </p>
          </div>
        ) : (
          <>
            {/* Rule version diff — remind testers what changed */}
            {diff && diff.hasChanges && (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold">📄 Rules you tested</span>
                </div>
                <div className="bg-white/4 border border-white/10 rounded-xl p-4">
                  <RuleVersionDiff diff={diff} compact />
                </div>
              </div>
            )}
            <div className="mb-6">
              <h1 className="text-xl font-bold">Post-Session Feedback</h1>
              <p className="text-gray-400 text-sm mt-1">~5 minutes · Your honest feedback helps make better games.</p>
            </div>
            <PostSurveyForm
              token={token}
              signupId={signup.id}
              sessionId={session?.id}
              testerId={signup.tester_id}
              testerName={signup.tester_name}
            />
          </>
        )}
      </div>
    </div>
  )
}
