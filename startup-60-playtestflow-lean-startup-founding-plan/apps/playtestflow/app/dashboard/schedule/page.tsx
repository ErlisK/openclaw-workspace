import { createClient, createServiceClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SchedulingDashboard from '@/components/SchedulingDashboard'

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Get all sessions with signup counts and availability counts
  const { data: sessions } = await supabase
    .from('playtest_sessions')
    .select(`
      id, title, status, scheduled_at, duration_minutes, platform, meeting_url, max_testers,
      projects(name, id),
      session_signups(count)
    `)
    .eq('designer_id', user.id)
    .order('created_at', { ascending: false })

  const svc = createServiceClient()

  // Get availability response counts per session
  const sessionIds = (sessions ?? []).map((s: any) => s.id)
  let availabilityCounts: Record<string, number> = {}
  let emailLogCounts: Record<string, number> = {}

  if (sessionIds.length > 0) {
    const { data: avail } = await svc
      .from('tester_availability')
      .select('session_id')
      .in('session_id', sessionIds)
    for (const a of (avail ?? [])) {
      availabilityCounts[a.session_id] = (availabilityCounts[a.session_id] ?? 0) + 1
    }

    const { data: emails } = await svc
      .from('email_log')
      .select('session_id, email_type, status')
      .in('session_id', sessionIds)
    for (const e of (emails ?? [])) {
      emailLogCounts[e.session_id] = (emailLogCounts[e.session_id] ?? 0) + 1
    }
  }

  // Enrich sessions with counts
  const enriched = (sessions ?? []).map((s: any) => ({
    ...s,
    signup_count: s.session_signups?.[0]?.count ?? 0,
    availability_responses: availabilityCounts[s.id] ?? 0,
    emails_sent: emailLogCounts[s.id] ?? 0,
  }))

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playtestflow.vercel.app'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Scheduling & Notifications</h1>
        <p className="text-gray-400 text-sm mt-1">
          Send availability requests, confirmation emails, reminders, and calendar invites.
        </p>
      </div>

      {enriched.length === 0 ? (
        <div className="bg-white/4 border border-white/10 rounded-2xl p-8 text-center">
          <p className="text-gray-400 mb-4">No sessions yet. Create a session to start scheduling.</p>
          <Link href="/dashboard/sessions" className="text-orange-400 hover:underline text-sm">
            Go to Sessions →
          </Link>
        </div>
      ) : (
        <SchedulingDashboard sessions={enriched} siteUrl={siteUrl} />
      )}
    </div>
  )
}
