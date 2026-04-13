import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { trackServer } from '@/lib/analytics'
import { fetchYouTubeVideoStats, extractYouTubeVideoId } from '@/lib/performance-fetch'
import { fetchLinkedInPostStats, extractLinkedInUrn } from '@/lib/linkedin-performance'

// POST /api/performance/fetch — trigger performance fetch for a published clip
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { publish_log_id, clip_id, posted_url, platform, provider } = body

  if (!clip_id) return NextResponse.json({ error: 'clip_id required' }, { status: 400 })

  // Check analytics consent
  const { data: userRow } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!userRow) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Get OAuth token for the platform
  const { data: conn } = await supabase
    .from('oauth_connections')
    .select('access_token, token_expires_at, provider')
    .eq('user_id', user.id)
    .eq('provider', provider || platform?.toLowerCase()?.split(' ')[0])
    .single()

  let stats: Record<string, unknown> | null = null
  let dataSource = 'api'

  if (conn?.access_token && (!conn.token_expires_at || new Date(conn.token_expires_at) > new Date())) {
    if ((provider === 'youtube' || platform === 'YouTube Shorts') && posted_url) {
      const videoId = extractYouTubeVideoId(posted_url)
      if (videoId) {
        const ytStats = await fetchYouTubeVideoStats(videoId, conn.access_token)
        if (ytStats) {
          stats = {
            views: ytStats.views,
            likes: ytStats.likes,
            comments: ytStats.comments,
            impressions: ytStats.impressions,
            completion_rate: ytStats.average_view_percentage / 100,
            ctr: ytStats.impression_ctr,
            watch_time_sec: ytStats.watch_time_sec,
            provider_post_id: ytStats.video_id,
          }
        }
      }
    } else if ((provider === 'linkedin' || platform === 'LinkedIn') && posted_url) {
      const urn = extractLinkedInUrn(posted_url)
      if (urn) {
        const liStats = await fetchLinkedInPostStats(urn, conn.access_token)
        if (liStats) {
          stats = {
            views: liStats.views,
            likes: liStats.likes,
            comments: liStats.comments,
            shares: liStats.shares,
            impressions: liStats.impressions,
            ctr: liStats.ctr,
            provider_post_id: urn,
          }
        }
      }
    }
  }

  if (!stats) {
    return NextResponse.json({
      error: 'Could not fetch stats automatically',
      hint: 'Connect your account or enter metrics manually',
      connected: !!conn,
    }, { status: 422 })
  }

  // Compute hours since publish
  let hoursAfterPublish: number | null = null
  if (publish_log_id) {
    const { data: pl } = await supabase
      .from('publish_log')
      .select('created_at')
      .eq('id', publish_log_id)
      .single()
    if (pl?.created_at) {
      hoursAfterPublish = (Date.now() - new Date(pl.created_at).getTime()) / 3600000
    }
  }

  // Store in clip_performance
  const { data: perf, error } = await supabase
    .from('clip_performance')
    .insert({
      user_id: user.id,
      clip_id,
      publish_log_id: publish_log_id || null,
      platform: platform || 'Unknown',
      provider: provider || null,
      provider_post_id: stats.provider_post_id as string || null,
      measured_at: new Date().toISOString(),
      hours_after_publish: hoursAfterPublish,
      views: stats.views as number || 0,
      likes: stats.likes as number || 0,
      comments: stats.comments as number || 0,
      shares: stats.shares as number || 0,
      impressions: stats.impressions as number || 0,
      completion_rate: stats.completion_rate as number || null,
      ctr: stats.ctr as number || null,
      watch_time_sec: stats.watch_time_sec as number || null,
      data_source: dataSource,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Also update publish_log with latest stats
  if (publish_log_id) {
    await supabase.from('publish_log').update({
      perf_views: stats.views as number,
      perf_likes: stats.likes as number,
      perf_comments: stats.comments as number,
      perf_shares: stats.shares as number,
      perf_impressions: stats.impressions as number,
      perf_completion_rate: stats.completion_rate as number,
      perf_ctr: stats.ctr as number,
      perf_fetched_at: new Date().toISOString(),
      perf_source: dataSource,
      provider_video_id: stats.provider_post_id as string,
    }).eq('id', publish_log_id)
  }

  // Update clip_outputs with avg performance for heuristic feedback
  await updateClipAvgPerformance(supabase, clip_id)

  trackServer(user.id, 'performance_fetched', {
    clip_id,
    platform,
    provider,
    views: stats.views,
    data_source: dataSource,
  })

  return NextResponse.json(perf)
}

// Helper: recompute avg perf on clip and its template
async function updateClipAvgPerformance(supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>, clipId: string) {
  const { data: allPerf } = await supabase
    .from('clip_performance')
    .select('views, likes, completion_rate, impressions')
    .eq('clip_id', clipId)

  if (!allPerf || allPerf.length === 0) return

  const avgViews = allPerf.reduce((s, p) => s + (p.views || 0), 0) / allPerf.length
  const avgCompletion = allPerf.filter(p => p.completion_rate).length > 0
    ? allPerf.reduce((s, p) => s + (p.completion_rate || 0), 0) / allPerf.filter(p => p.completion_rate).length
    : null

  // Update clip_outputs
  await supabase.from('clip_outputs').update({
    avg_views_48h: avgViews,
    avg_completion_rate: avgCompletion,
  }).eq('id', clipId)

  // Get template_id and update template performance too
  const { data: clip } = await supabase
    .from('clip_outputs')
    .select('template_id')
    .eq('id', clipId)
    .single()

  if (clip?.template_id) {
    // Recompute template averages across all clips using this template
    const { data: tmplClips } = await supabase
      .from('clip_outputs')
      .select('avg_views_48h, avg_completion_rate')
      .eq('template_id', clip.template_id)
      .not('avg_views_48h', 'is', null)

    if (tmplClips && tmplClips.length > 0) {
      const tmplAvgViews = tmplClips.reduce((s, c) => s + (c.avg_views_48h || 0), 0) / tmplClips.length
      const tmplAvgCompletion = tmplClips.filter(c => c.avg_completion_rate).length > 0
        ? tmplClips.reduce((s, c) => s + (c.avg_completion_rate || 0), 0) / tmplClips.filter(c => c.avg_completion_rate).length
        : null

      await supabase.from('templates').update({
        avg_views_48h: tmplAvgViews,
        avg_completion: tmplAvgCompletion,
      }).eq('id', clip.template_id)
    }
  }
}
