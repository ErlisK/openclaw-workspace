import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { trackServer } from '@/lib/analytics'

// POST /api/jobs/[id]/approve-full-render
// Upgrades a preview-mode job to full render.
// Free users: requires active Pro subscription (paywall gate)
// Pro / alpha users: queues immediately

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch job + verify ownership
  const { data: job } = await supabase
    .from('processing_jobs')
    .select('id, user_id, render_mode, status, full_render_queued_at, asset_id')
    .eq('id', id)
    .single()

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (job.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (job.full_render_queued_at) {
    return NextResponse.json({ message: 'Full render already queued', job_id: id }, { status: 200 })
  }

  // Check plan
  const [{ data: sub }, { data: userRow }] = await Promise.all([
    supabase.from('subscriptions').select('plan, status').eq('user_id', user.id).eq('status', 'active').single(),
    supabase.from('users').select('is_alpha').eq('id', user.id).single(),
  ])

  const isPro = sub?.plan === 'pro' || userRow?.is_alpha
  if (!isPro) {
    return NextResponse.json({
      error: 'Full render requires a Pro subscription.',
      upgrade_url: '/pricing',
      hint: 'Upgrade to Pro to unlock full HD exports for all your clips.',
    }, { status: 402 })
  }

  // Queue the full render (set render_mode=full, enqueue)
  const { data: updated, error } = await supabase
    .from('processing_jobs')
    .update({
      render_mode: 'full',
      full_render_queued_at: new Date().toISOString(),
      status: job.status === 'done' ? 'preview_done' : job.status,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  trackServer(user.id, 'full_render_approved', { job_id: id })

  return NextResponse.json({
    job_id: id,
    render_mode: 'full',
    status: updated.status,
    message: 'Full render queued. Will be processed in the next batch window.',
    estimated_batch: getNextBatchWindow(),
  })
}

// Returns next off-peak batch window (2 AM UTC)
function getNextBatchWindow(): string {
  const now = new Date()
  const next = new Date(now)
  next.setUTCHours(2, 0, 0, 0)
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString()
}
