import { createServiceClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import AvailabilityPicker from './AvailabilityPicker'

export default async function AvailabilityPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { sessionId } = await params
  const { token } = await searchParams
  const supabase = createServiceClient()

  const { data: session } = await supabase
    .from('playtest_sessions')
    .select(`
      id, title, scheduled_at, duration_minutes, platform, max_testers,
      projects(name, game_type)
    `)
    .eq('id', sessionId)
    .single()

  if (!session) notFound()

  // Resolve tester from consent token
  let testerName = ''
  let testerEmail = ''
  let signupId: string | null = null

  if (token) {
    const { data: signup } = await supabase
      .from('session_signups')
      .select('id, tester_name, tester_email')
      .eq('consent_token', token)
      .eq('session_id', sessionId)
      .single()
    if (signup) {
      testerName = signup.tester_name
      testerEmail = signup.tester_email
      signupId = signup.id
    }
  }

  const project = session.projects as any

  // Generate proposed time slots: next 14 days, hourly 08:00–22:00 UTC
  const now = new Date()
  const slots: Date[] = []
  for (let day = 1; day <= 14; day++) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() + day)
    d.setUTCHours(0, 0, 0, 0)
    for (let hour = 8; hour <= 21; hour++) {
      const slot = new Date(d)
      slot.setUTCHours(hour)
      slots.push(slot)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <div className="border-b border-white/10 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <span className="text-xl">🎲</span>
          <span className="font-bold text-orange-400">PlaytestFlow</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {/* Session info */}
        <div className="bg-white/4 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{project?.game_type === 'ttrpg' ? '🐉' : '🎲'}</span>
            <h1 className="text-xl font-bold">{session.title}</h1>
          </div>
          <p className="text-gray-400 text-sm">{project?.name}</p>
          {testerName && (
            <p className="text-sm mt-2">
              Hi <span className="text-orange-400 font-medium">{testerName}</span>! Please share when you're free.
            </p>
          )}
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
            {session.platform && <span>📡 {session.platform}</span>}
            {session.duration_minutes && <span>⏱ ~{session.duration_minutes} min</span>}
            {session.max_testers && <span>👥 {session.max_testers} spots</span>}
          </div>
        </div>

        {/* Availability picker */}
        <AvailabilityPicker
          sessionId={sessionId}
          token={token ?? null}
          testerName={testerName}
          testerEmail={testerEmail}
          slots={slots.map(s => s.toISOString())}
        />
      </div>
    </div>
  )
}
