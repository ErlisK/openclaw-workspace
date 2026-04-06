import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import RecruitForm from '@/components/RecruitForm'

export default async function RecruitPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>
  searchParams: { embed?: string }
}) {
  const supabase = await createClient()
  const { sessionId } = await params
  const isEmbed = searchParams.embed === '1'

  const { data: session } = await supabase
    .from('playtest_sessions')
    .select('*, projects(name, game_type, description), rule_versions(version_label)')
    .eq('id', sessionId)
    .in('status', ['recruiting', 'scheduled'])
    .single()

  if (!session) notFound()

  const { count: signupCount } = await supabase
    .from('session_signups')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .in('status', ['registered', 'confirmed'])

  const spotsLeft = session.max_testers - (signupCount ?? 0)

  return (
    <div className={`${isEmbed ? '' : 'min-h-screen'} bg-[#0d1117] text-white`}>
      <div className={`${isEmbed ? 'p-4' : 'max-w-lg mx-auto px-6 py-12'}`}>
        {!isEmbed && (
          <div className="text-center mb-2">
            <span className="text-2xl">🎲</span>
            <span className="font-bold text-lg text-orange-400 ml-2">PlaytestFlow</span>
          </div>
        )}

        <div className={`bg-white/5 border border-white/10 rounded-2xl ${isEmbed ? 'p-5' : 'p-8'}`}>
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">
                Open for signup
              </span>
              {spotsLeft <= 3 && spotsLeft > 0 && (
                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/30">
                  Only {spotsLeft} spot{spotsLeft > 1 ? 's' : ''} left!
                </span>
              )}
            </div>
            <h1 className={`font-bold text-white ${isEmbed ? 'text-lg' : 'text-2xl'} mb-1`}>
              {session.title}
            </h1>
            <p className="text-gray-400 text-sm">
              {session.projects?.name} {session.rule_versions?.version_label ? `— ${session.rule_versions.version_label}` : ''}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { label: 'Platform', value: session.platform ?? 'TBD' },
              { label: 'Spots available', value: spotsLeft > 0 ? `${spotsLeft} of ${session.max_testers}` : 'Full' },
              session.scheduled_at
                ? { label: 'Scheduled', value: new Date(session.scheduled_at).toLocaleString() }
                : null,
              session.rule_versions?.version_label
                ? { label: 'Rules version', value: session.rule_versions.version_label }
                : null,
            ].filter(Boolean).map((item) => (
              <div key={item!.label} className="bg-white/5 rounded-lg px-3 py-2">
                <div className="text-xs text-gray-500">{item!.label}</div>
                <div className="text-sm text-white font-medium">{item!.value}</div>
              </div>
            ))}
          </div>

          {spotsLeft > 0 ? (
            <RecruitForm sessionId={sessionId} />
          ) : (
            <div className="text-center py-6 bg-white/5 rounded-xl">
              <p className="text-gray-400">This session is full.</p>
              <p className="text-gray-500 text-sm mt-1">Check back for future sessions.</p>
            </div>
          )}
        </div>

        {!isEmbed && (
          <p className="text-center text-gray-600 text-xs mt-4">
            Powered by <a href="https://playtestflow.vercel.app" className="text-orange-400 hover:underline">PlaytestFlow</a>
          </p>
        )}
      </div>
    </div>
  )
}
