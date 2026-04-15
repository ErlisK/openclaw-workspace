/**
 * POST /api/jobs/claim
 * Atomically claims a published job for the authenticated tester using
 * the claim_job RPC (prevents race conditions).
 * Body: { job_id }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/get-client'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { job_id } = body as { job_id: string }

  if (!job_id) return NextResponse.json({ error: 'job_id is required' }, { status: 400 })

  // Check tester is not the job owner
  const admin = createAdminClient()
  const { data: job } = await admin
    .from('test_jobs')
    .select('client_id, status')
    .eq('id', job_id)
    .single()

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (job.client_id === user.id) return NextResponse.json({ error: 'Cannot claim your own job' }, { status: 400 })
  if (job.status !== 'published') return NextResponse.json({ error: 'Job is not available' }, { status: 409 })

  // Use atomic RPC to claim
  const { data, error } = await admin.rpc('claim_job', {
    p_tester: user.id,
    p_job: job_id,
  })

  if (error) {
    const msg = error.message ?? 'Failed to claim job'
    const status = msg.includes('no longer available') || msg.includes('already have') ? 409 : 500
    return NextResponse.json({ error: msg }, { status })
  }

  const assignmentId = data?.[0]?.assignment_id
  if (!assignmentId) {
    return NextResponse.json({ error: 'Job was claimed by another tester' }, { status: 409 })
  }

  return NextResponse.json({ assignment_id: assignmentId }, { status: 201 })
}
