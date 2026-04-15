/**
 * /tester/sessions/new?assignment=<assignment_id>
 * Creates a test session for the given assignment and redirects to /run/<session_id>
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

interface Props {
  searchParams: Promise<{ assignment?: string }>
}

export default async function NewTesterSessionPage({ searchParams }: Props) {
  const { assignment: assignmentId } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (!assignmentId) redirect('/marketplace')

  const admin = createAdminClient()

  // Verify this tester owns the assignment
  const { data: assignment } = await admin
    .from('job_assignments')
    .select('id, status, tester_id, job_id')
    .eq('id', assignmentId)
    .single()

  if (!assignment || assignment.tester_id !== user.id) redirect('/marketplace')
  if (assignment.status !== 'active') redirect('/dashboard')

  // Check for existing active session
  const { data: existing } = await admin
    .from('test_sessions')
    .select('id')
    .eq('assignment_id', assignmentId)
    .eq('status', 'active')
    .maybeSingle()

  if (existing) {
    redirect(`/run/${existing.id}`)
  }

  // Create a new session
  const { data: session, error } = await admin
    .from('test_sessions')
    .insert({
      assignment_id: assignmentId,
      job_id: assignment.job_id,
      tester_id: user.id,
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Failed to start session</h1>
          <p className="text-sm text-gray-500 mb-4">{error?.message ?? 'Unknown error'}</p>
          <a href="/dashboard" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">
            Back to Dashboard
          </a>
        </div>
      </div>
    )
  }

  redirect(`/run/${session.id}`)
}
