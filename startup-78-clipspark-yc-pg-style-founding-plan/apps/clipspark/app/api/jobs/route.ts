import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/jobs — list user's processing jobs
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('processing_jobs')
    .select(`
      id, status, created_at, queued_at, preview_ready_at, done_at, tat_sec,
      clips_requested, target_platforms, template_id, error_message,
      total_cost_usd,
      media_assets(id, title, duration_min, source_type)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/jobs — create processing job
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { asset_id, clips_requested = 3, target_platforms, template_id = 'podcast-pro-v02' } = body

  if (!asset_id) return NextResponse.json({ error: 'asset_id required' }, { status: 400 })
  if (!target_platforms?.length) return NextResponse.json({ error: 'target_platforms required' }, { status: 400 })

  // Verify asset
  const { data: asset } = await supabase
    .from('media_assets')
    .select('id, user_id')
    .eq('id', asset_id)
    .eq('user_id', user.id)
    .single()
  if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 })

  // Check quota
  const { data: canCreate } = await supabase
    .rpc('can_create_clips', { p_user_id: user.id, p_count: clips_requested })

  if (canCreate === false) {
    return NextResponse.json({
      error: 'Clip quota exceeded. Upgrade your plan or purchase credits.',
      upgrade_url: '/pricing',
    }, { status: 402 })
  }

  // Create job
  const { data: job, error } = await supabase
    .from('processing_jobs')
    .insert({
      user_id: user.id,
      asset_id,
      clips_requested,
      target_platforms,
      template_id,
      heuristic_version: 'v0.2',
      status: 'queued',
      queued_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Create placeholder clip records
  const clipRows = Array.from({ length: clips_requested }, (_, i) => ({
    job_id: job.id,
    user_id: user.id,
    asset_id,
    clip_index: i + 1,
    platform: target_platforms[0],
    template_id,
    render_status: 'pending' as const,
    heuristic_signals: [],
    hashtags: [],
    transcript_excerpt: '[placeholder]',
  }))
  await supabase.from('clip_outputs').insert(clipRows)

  // Bump usage ledger
  await supabase.from('usage_ledger')
    .upsert({
      user_id: user.id,
      period_start: new Date().toISOString().slice(0, 7) + '-01',
      clips_used: clips_requested,
    }, { onConflict: 'user_id,period_start', ignoreDuplicates: false })

  return NextResponse.json(job, { status: 201 })
}
