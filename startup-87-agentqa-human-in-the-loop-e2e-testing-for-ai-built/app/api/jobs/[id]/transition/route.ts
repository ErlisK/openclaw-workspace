import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/get-client'
import { validateTransition, isJobExpired } from '@/lib/job-lifecycle'
import type { JobStatus } from '@/lib/types'

/**
 * POST /api/jobs/[id]/transition
 * Body: { to: JobStatus, assignment_id?: string }
 *
 * Enforces the job lifecycle state machine server-side.
 * RLS ensures the user can only act on jobs they own or are assigned to.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params
  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { to, assignment_id } = body as { to: JobStatus; assignment_id?: string }

  if (!to) return NextResponse.json({ error: 'to (target status) is required' }, { status: 400 })

  // Fetch the job — RLS will filter to what the user can see
  const { data: job, error: jobError } = await supabase
    .from('test_jobs')
    .select('id, status, client_id, published_at')
    .eq('id', jobId)
    .single()

  if (jobError || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const isClient = job.client_id === user.id

  // For tester actions, verify assignment
  let isTester = false
  if (!isClient && assignment_id) {
    const { data: asgn } = await supabase
      .from('job_assignments')
      .select('id, status')
      .eq('id', assignment_id)
      .eq('job_id', jobId)
      .eq('tester_id', user.id)
      .single()
    isTester = !!asgn && asgn.status === 'active'
  }

  if (!isClient && !isTester) {
    return NextResponse.json({ error: 'Forbidden — you do not own this job or have an active assignment' }, { status: 403 })
  }

  // Check expiry for published/assigned jobs
  if (['published', 'assigned'].includes(job.status) && isJobExpired(job.published_at)) {
    // Auto-expire
    await supabase.from('test_jobs').update({ status: 'expired' as JobStatus }).eq('id', jobId)
    return NextResponse.json({ error: 'Job has expired and cannot be transitioned' }, { status: 409 })
  }

  // Validate transition
  const validation = validateTransition(
    job.status as JobStatus,
    to,
    { actorIsClient: isClient, actorIsTester: isTester }
  )

  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.error, code: validation.code },
      { status: 422 }
    )
  }

  // Build the update payload
  const updates: Record<string, unknown> = { status: to }
  const now = new Date().toISOString()

  if (to === 'published') {
    updates.published_at = now
    updates.expires_at = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
  }
  if (to === 'complete') {
    updates.completed_at = now
  }

  const { data: updated, error: updateError } = await supabase
    .from('test_jobs')
    .update(updates)
    .eq('id', jobId)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // If completing, also mark assignment as submitted
  if (to === 'complete' && assignment_id) {
    await supabase
      .from('job_assignments')
      .update({ status: 'submitted', submitted_at: now })
      .eq('id', assignment_id)
      .eq('tester_id', user.id)
  }

  return NextResponse.json({
    job: updated,
    transition: { from: job.status, to },
  })
}
