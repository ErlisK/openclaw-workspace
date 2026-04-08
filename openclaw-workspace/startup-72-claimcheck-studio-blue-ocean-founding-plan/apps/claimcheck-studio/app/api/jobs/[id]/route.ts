import { NextRequest, NextResponse } from 'next/server'
import { getJob, failJob } from '@/lib/jobs'
import { getSupabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/jobs/[id]
 * Returns job status, result, and error for polling.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const job = await getJob(id)
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  return NextResponse.json({ job })
}

/**
 * DELETE /api/jobs/[id]
 * Cancels a queued job (cannot cancel running/done jobs).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = getSupabaseAdmin()

  const { data: job } = await supabase
    .from('cc_jobs')
    .select('id, status')
    .eq('id', id)
    .single()

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (job.status !== 'queued') {
    return NextResponse.json({ error: `Cannot cancel job in status: ${job.status}` }, { status: 409 })
  }

  await supabase
    .from('cc_jobs')
    .update({ status: 'cancelled', completed_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({ cancelled: true })
}
