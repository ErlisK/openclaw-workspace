import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { trackServer } from '@/lib/analytics'

// POST /api/performance/manual — manually enter performance metrics for any platform
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    clip_id,
    publish_log_id,
    platform,
    views = 0,
    likes = 0,
    comments = 0,
    shares = 0,
    impressions = 0,
    completion_rate,
    ctr,
    watch_time_sec,
    measured_at,
    hours_after_publish,
  } = body

  if (!clip_id) return NextResponse.json({ error: 'clip_id required' }, { status: 400 })

  // Verify clip belongs to user
  const { data: clip } = await supabase
    .from('clip_outputs')
    .select('id, job_id')
    .eq('id', clip_id)
    .single()

  if (!clip) return NextResponse.json({ error: 'Clip not found' }, { status: 404 })

  const { data: job } = await supabase
    .from('processing_jobs')
    .select('user_id')
    .eq('id', clip.job_id)
    .single()

  if (job?.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: perf, error } = await supabase
    .from('clip_performance')
    .insert({
      user_id: user.id,
      clip_id,
      publish_log_id: publish_log_id || null,
      platform: platform || 'Manual',
      measured_at: measured_at || new Date().toISOString(),
      hours_after_publish: hours_after_publish || null,
      views: parseInt(views) || 0,
      likes: parseInt(likes) || 0,
      comments: parseInt(comments) || 0,
      shares: parseInt(shares) || 0,
      impressions: parseInt(impressions) || 0,
      completion_rate: completion_rate ? parseFloat(completion_rate) : null,
      ctr: ctr ? parseFloat(ctr) : null,
      watch_time_sec: watch_time_sec ? parseInt(watch_time_sec) : null,
      data_source: 'manual',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update publish_log perf columns if linked
  if (publish_log_id) {
    await supabase.from('publish_log').update({
      perf_views: parseInt(views) || 0,
      perf_likes: parseInt(likes) || 0,
      perf_comments: parseInt(comments) || 0,
      perf_impressions: parseInt(impressions) || 0,
      perf_completion_rate: completion_rate ? parseFloat(completion_rate) : null,
      perf_ctr: ctr ? parseFloat(ctr) : null,
      perf_fetched_at: new Date().toISOString(),
      perf_source: 'manual',
    }).eq('id', publish_log_id)
  }

  // Recompute template/clip averages
  await recomputeClipPerformance(supabase, clip_id)

  trackServer(user.id, 'performance_manual_entry', {
    clip_id,
    platform,
    views: parseInt(views) || 0,
  })

  return NextResponse.json(perf, { status: 201 })
}

// GET /api/performance/manual?clip_id=xxx — get all performance entries for a clip
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const clip_id = searchParams.get('clip_id')

  let query = supabase
    .from('clip_performance')
    .select('*')
    .eq('user_id', user.id)
    .order('measured_at', { ascending: false })

  if (clip_id) query = query.eq('clip_id', clip_id)

  const { data, error } = await query.limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

async function recomputeClipPerformance(supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>, clipId: string) {
  const { data: allPerf } = await supabase
    .from('clip_performance')
    .select('views, completion_rate')
    .eq('clip_id', clipId)

  if (!allPerf || allPerf.length === 0) return

  const avgViews = allPerf.reduce((s, p) => s + (Number(p.views) || 0), 0) / allPerf.length
  const withCompletion = allPerf.filter(p => p.completion_rate != null)
  const avgCompletion = withCompletion.length > 0
    ? withCompletion.reduce((s, p) => s + Number(p.completion_rate), 0) / withCompletion.length
    : null

  await supabase.from('clip_outputs').update({
    avg_views_48h: avgViews,
    avg_completion_rate: avgCompletion,
  }).eq('id', clipId)

  // Update template
  const { data: clip } = await supabase.from('clip_outputs').select('template_id').eq('id', clipId).single()
  if (clip?.template_id) {
    const { data: tmplClips } = await supabase
      .from('clip_outputs')
      .select('avg_views_48h, avg_completion_rate')
      .eq('template_id', clip.template_id)
      .not('avg_views_48h', 'is', null)

    if (tmplClips && tmplClips.length > 0) {
      const tmplAvgViews = tmplClips.reduce((s, c) => s + (Number(c.avg_views_48h) || 0), 0) / tmplClips.length
      await supabase.from('templates').update({ avg_views_48h: tmplAvgViews }).eq('id', clip.template_id)
    }
  }
}
