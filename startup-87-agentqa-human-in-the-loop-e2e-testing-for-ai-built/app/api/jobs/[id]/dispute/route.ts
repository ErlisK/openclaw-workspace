/**
 * POST /api/jobs/[id]/dispute
 * Opens a dispute for a completed job.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/get-client'
import { createAdminClient } from '@/lib/supabase/server'
import { emailNotifications } from '@/lib/email/resend'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params
  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reason } = await req.json()
  if (!reason?.trim()) return NextResponse.json({ error: 'Reason is required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: job } = await admin
    .from('test_jobs')
    .select('id, title, client_id, status')
    .eq('id', jobId)
    .single()

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (job.client_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!['complete', 'assigned'].includes(job.status)) {
    return NextResponse.json({ error: 'Can only dispute completed or in-progress jobs' }, { status: 400 })
  }

  // Log dispute in platform_feedback table
  await admin.from('platform_feedback').insert({
    user_id: user.id,
    feedback_type: 'dispute',
    message: reason,
    metadata: { job_id: jobId, job_title: job.title },
  })

  // Notify admin
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@agentqa.ai'
  await emailNotifications.disputeOpened(adminEmail, job.title, jobId, reason)

  return NextResponse.json({ ok: true })
}
