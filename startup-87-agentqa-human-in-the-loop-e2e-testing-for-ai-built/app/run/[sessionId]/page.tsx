import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import SandboxRunner from './SandboxRunner'

interface Props {
  params: Promise<{ sessionId: string }>
}

export default async function RunPage({ params }: Props) {
  const { sessionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=/run/${sessionId}`)

  const admin = createAdminClient()

  // Fetch session with job details
  const { data: session, error } = await admin
    .from('test_sessions')
    .select(`
      id, status, tester_id, assignment_id, job_id,
      test_jobs (
        id, title, url, tier, instructions, client_id
      )
    `)
    .eq('id', sessionId)
    .single()

  if (error || !session) notFound()

  // Verify access
  const job = session.test_jobs as {
    id: string; title: string; url: string; tier: string; instructions: string; client_id: string
  } | null

  if (!job) notFound()

  const isOwner = session.tester_id === user.id
  const isClient = job.client_id === user.id
  if (!isOwner && !isClient) redirect('/dashboard')

  if (session.status !== 'active') {
    // Session already ended — show a message
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">
            {session.status === 'complete' ? '✅' : '⚠️'}
          </div>
          <h1 className="text-xl font-bold mb-2">
            Session {session.status}
          </h1>
          <p className="text-gray-400 mb-6">
            This test session has already ended.
          </p>
          <a href="/dashboard" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Back to Dashboard
          </a>
        </div>
      </div>
    )
  }

  return (
    <SandboxRunner
      sessionId={sessionId}
      job={job}
      assignmentId={session.assignment_id}
    />
  )
}
