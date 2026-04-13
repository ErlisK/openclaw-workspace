/**
 * YouTube Analytics fetcher using connected OAuth token.
 * Fetches video stats for a published clip.
 */

export interface YouTubeVideoStats {
  video_id: string
  views: number
  likes: number
  comments: number
  impressions: number
  impression_ctr: number
  average_view_duration_sec: number
  average_view_percentage: number
  watch_time_sec: number
  fetched_at: string
}

export async function fetchYouTubeVideoStats(
  videoId: string,
  accessToken: string,
): Promise<YouTubeVideoStats | null> {
  try {
    // Fetch basic stats via YouTube Data API v3
    const statsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!statsRes.ok) return null
    const statsData = await statsRes.json()
    const item = statsData.items?.[0]
    if (!item) return null

    const stats = item.statistics || {}
    const views = parseInt(stats.viewCount || '0')
    const likes = parseInt(stats.likeCount || '0')
    const comments = parseInt(stats.commentCount || '0')

    // Fetch analytics (impressions, CTR, watch time) via YouTube Analytics API
    const today = new Date().toISOString().slice(0, 10)
    const startDate = '2020-01-01'

    const analyticsRes = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE` +
      `&startDate=${startDate}&endDate=${today}` +
      `&metrics=views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,impressions,impressionsClickThroughRate` +
      `&filters=video==${videoId}` +
      `&dimensions=video`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    let impressions = 0
    let impressionCtr = 0
    let avgViewDuration = 0
    let avgViewPct = 0
    let watchTimeSec = 0

    if (analyticsRes.ok) {
      const analyticsData = await analyticsRes.json()
      const row = analyticsData.rows?.[0]
      if (row) {
        // row indices: [video, views, estimatedMinutesWatched, avgViewDuration, avgViewPct, impressions, impressionsCtr]
        const headers = analyticsData.columnHeaders?.map((h: { name: string }) => h.name) || []
        const idx = (name: string) => headers.indexOf(name)
        avgViewDuration = row[idx('averageViewDuration')] || 0
        avgViewPct = row[idx('averageViewPercentage')] || 0
        impressions = row[idx('impressions')] || 0
        impressionCtr = row[idx('impressionsClickThroughRate')] || 0
        const estimatedMinutes = row[idx('estimatedMinutesWatched')] || 0
        watchTimeSec = Math.round(estimatedMinutes * 60)
      }
    }

    return {
      video_id: videoId,
      views,
      likes,
      comments,
      impressions,
      impression_ctr: impressionCtr,
      average_view_duration_sec: avgViewDuration,
      average_view_percentage: avgViewPct,
      watch_time_sec: watchTimeSec,
      fetched_at: new Date().toISOString(),
    }
  } catch {
    return null
  }
}

/** Extract YouTube video ID from URL */
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/,
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}
