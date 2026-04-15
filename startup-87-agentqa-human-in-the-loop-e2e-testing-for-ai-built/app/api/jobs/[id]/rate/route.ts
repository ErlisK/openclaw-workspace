/**
 * POST /api/jobs/[id]/rate
 * Requester rates the quality of a completed test.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/get-client'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params
  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rating } = await req.json()
  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: job } = await admin
    .from('test_jobs')
    .select('id, client_id')
    .eq('id', jobId)
    .single()

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (job.client_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Update feedback row with requester rating
  await admin
    .from('feedback')
    .update({ requester_rating: rating, updated_at: new Date().toISOString() })
    .eq('job_id', jobId)

  return NextResponse.json({ ok: true })
}
