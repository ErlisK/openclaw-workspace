import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/get-client'
import { createAdminClient } from '@/lib/supabase/server'
import { validateTransition, isJobExpired } from '@/lib/job-lifecycle'
import { holdCredits, spendCredits, releaseCredits } from '@/lib/credits'
import { captureServerEvent } from '@/lib/analytics/events'
import { emailNotifications } from '@/lib/email/resend'
import { fireWebhook } from '@/lib/webhook'
import type { JobStatus } from '@/lib/types'

/**
 * POST /api/jobs/[id]/transition
 * Body: { to: JobStatus, assignment_id?: string }
 *
 * Enforces the job lifecycle state machine + credit gating:
 * - draft → published:  hold credits (gate if insufficient)
 * - published → complete:  spend held credits
 * - published → expired/cancelled:  release held credits
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

  const admin = createAdminClient()

  // Fetch the job with admin client (ensures client_id visible regardless of RLS)
  const { data: job, error: jobError } = await admin
    .from('test_jobs')
    .select('id, status, client_id, published_at, tier')
    .eq('id', jobId)
    .single()

  if (jobError || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const isClient = job.client_id === user.id

  // For tester actions, verify assignment
  let isTester = false
  if (!isClient && assignment_id) {
    const { data: asgn } = await admin
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
    // Auto-expire + release credits
    await supabase.from('test_jobs').update({ status: 'expired' as JobStatus }).eq('id', jobId)
    if (isClient) await releaseCredits(user.id, jobId, job.tier)
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

  // ── Credit gating ─────────────────────────────────────────────────────────

  if (to === 'published' && isClient) {
    // Hold credits — gate publish if insufficient
    const holdResult = await holdCredits(user.id, jobId, job.tier)
    if (!holdResult.ok) {
      return NextResponse.json(
        {
          error: holdResult.error,
          code: 'INSUFFICIENT_CREDITS',
          credits_required: true,
        },
        { status: 402 }  // Payment Required
      )
    }
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

  const { data: updated, error: updateError } = await admin
    .from('test_jobs')
    .update(updates)
    .eq('id', jobId)
    .select()
    .single()

  if (updateError) {
    // Rollback hold if publish DB update failed
    if (to === 'published' && isClient) {
      await releaseCredits(user.id, jobId, job.tier)
    }
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // ── Post-transition credit actions ────────────────────────────────────────

  // Complete → spend credits from the job owner's account
  // (tester completes the job, but credits are deducted from the client)
  if (to === 'complete') {
    await spendCredits(job.client_id, jobId, job.tier)
    captureServerEvent('stop_session', user.id, { job_id: jobId, assignment_id, reason: 'complete' }).catch(() => {})
  }

  // Expired/cancelled → release held credits from job owner's account
  if (to === 'expired' || to === 'cancelled') {
    await releaseCredits(job.client_id, jobId, job.tier)
    captureServerEvent('stop_session', user.id, { job_id: jobId, reason: to }).catch(() => {})
  }

  // publish_job event
  if (to === 'published') {
    captureServerEvent('publish_job', user.id, { job_id: jobId, tier: job.tier }).catch(() => {})
  }

  // If completing, also mark assignment as submitted
  if (to === 'complete' && assignment_id) {
    await supabase
      .from('job_assignments')
      .update({ status: 'submitted', submitted_at: now })
      .eq('id', assignment_id)
      .eq('tester_id', user.id)
  }

  // ── Email notifications ───────────────────────────────────────────────────
  // Fetch requester email for notifications
  const notifyEmail = async () => {
    const { data: requester } = await admin.from('users').select('email').eq('id', job.client_id).single()
    const email = requester?.email
    const title = (updated as { title?: string })?.title ?? 'your job'
    if (!email) return
    if (to === 'published') await emailNotifications.jobPublished(email, title, jobId)
    if (to === 'assigned') await emailNotifications.jobAssigned(email, title, jobId)
    if (to === 'complete') await emailNotifications.testComplete(email, title, jobId)
    if (to === 'expired') await emailNotifications.jobExpired(email, title, jobId)
  }
  notifyEmail().catch(() => {})

  // ── Webhook notifications ─────────────────────────────────────────────────
  // Fire webhook for status transitions relevant to API consumers (assigned, complete, expired, cancelled)
  if (['assigned', 'complete', 'expired', 'cancelled'].includes(to)) {
    const { data: jobWithWebhook } = await admin
      .from('test_jobs')
      .select('webhook_url, title')
      .eq('id', jobId)
      .single()
    if (jobWithWebhook?.webhook_url) {
      fireWebhook(jobWithWebhook.webhook_url, {
        event: `job.${to}`,
        job_id: jobId,
        status: to,
        title: jobWithWebhook.title ?? '',
        timestamp: new Date().toISOString(),
      }).catch(() => {})
    }
  }

  return NextResponse.json({
    job: updated,
    transition: { from: job.status, to },
  })
}
