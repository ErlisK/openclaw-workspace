import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import ResultsClient from './ResultsClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function JobResultsPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/jobs/${id}/results`)

  const admin = createAdminClient()

  // Verify requester owns this job
  const { data: job } = await admin
    .from('test_jobs')
    .select('id, title, url, tier, instructions, status, client_id, completed_at, price_cents')
    .eq('id', id)
    .single()

  if (!job) notFound()
  if (job.client_id !== user.id) redirect('/dashboard')

  // Load feedback with bugs
  const { data: feedbackRows } = await admin
    .from('feedback')
    .select(`
      id, overall_rating, summary, repro_steps, expected_behavior, actual_behavior,
      created_at, tester_id,
      feedback_bugs (
        id, title, description, severity, repro_steps, expected_behavior, actual_behavior, screenshot_urls
      )
    `)
    .eq('job_id', id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Load assignment + session info
  const { data: assignments } = await admin
    .from('job_assignments')
    .select('id, status, assigned_at, completed_at, tester_id')
    .eq('job_id', id)

  const assignmentId = assignments?.[0]?.id

  // Load session events for the assignment
  let sessionId: string | null = null
  let sessionEvents: unknown[] = []
  if (assignmentId) {
    const { data: session } = await admin
      .from('test_sessions')
      .select('id, status, started_at, ended_at, notes')
      .eq('assignment_id', assignmentId)
      .maybeSingle()

    if (session) {
      sessionId = session.id
      const { data: events } = await admin
        .from('session_events')
        .select('id, event_type, payload, created_at')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true })
        .limit(500)
      sessionEvents = events ?? []
    }
  }

  // Load AI summary if available
  const { data: aiSummary } = await admin
    .from('session_summaries')
    .select('summary_text, bug_count, severity, created_at')
    .eq('job_id', id)
    .maybeSingle()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
          ← Dashboard
        </Link>
        <span className="text-gray-300">/</span>
        <Link href={`/jobs/${id}`} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
          {job.title}
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium text-sm">Results</span>
      </header>

      <ResultsClient
        job={job}
        feedback={feedbackRows ?? []}
        sessionEvents={sessionEvents as Array<{ id: string; event_type: string; payload: unknown; created_at: string }>}
        sessionId={sessionId}
        aiSummary={aiSummary}
        assignments={assignments ?? []}
      />
    </div>
  )
}
