/**
 * LinkedIn Analytics fetcher using connected OAuth token.
 */

export interface LinkedInVideoStats {
  urn: string
  impressions: number
  views: number
  likes: number
  comments: number
  shares: number
  ctr: number
  fetched_at: string
}

/** Extract LinkedIn URN / share ID from URL */
export function extractLinkedInUrn(url: string): string | null {
  // LinkedIn video activity URLs: https://www.linkedin.com/feed/update/urn:li:activity:xxx
  const activityMatch = url.match(/urn:li:activity:(\d+)/)
  if (activityMatch) return `urn:li:activity:${activityMatch[1]}`

  // Also handle share URLs
  const shareMatch = url.match(/activity-(\d+)/)
  if (shareMatch) return `urn:li:activity:${shareMatch[1]}`

  return null
}

export async function fetchLinkedInPostStats(
  activityUrn: string,
  accessToken: string,
): Promise<LinkedInVideoStats | null> {
  try {
    const encodedUrn = encodeURIComponent(activityUrn)

    // Fetch post metrics via LinkedIn API v2
    const res = await fetch(
      `https://api.linkedin.com/v2/organizationalEntityShareStatistics?q=organizationalEntity&shares[0]=${encodedUrn}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'LinkedIn-Version': '202304',
          'X-RestLi-Protocol-Version': '2.0.0',
        }
      }
    )

    if (!res.ok) {
      // Try the ugcPosts endpoint instead
      const ugcRes = await fetch(
        `https://api.linkedin.com/v2/socialMetadata/${encodedUrn}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'LinkedIn-Version': '202304',
            'X-RestLi-Protocol-Version': '2.0.0',
          }
        }
      )
      if (!ugcRes.ok) return null

      const ugcData = await ugcRes.json()
      const totalSocialActivity = ugcData.totalSocialActivityCounts || {}
      return {
        urn: activityUrn,
        impressions: 0,
        views: 0,
        likes: totalSocialActivity.numLikes || 0,
        comments: totalSocialActivity.numComments || 0,
        shares: totalSocialActivity.numShares || 0,
        ctr: 0,
        fetched_at: new Date().toISOString(),
      }
    }

    const data = await res.json()
    const element = data.elements?.[0]?.totalShareStatistics || {}

    return {
      urn: activityUrn,
      impressions: element.impressionCount || 0,
      views: element.videoViews || element.uniqueImpressionsCount || 0,
      likes: element.likeCount || 0,
      comments: element.commentCount || 0,
      shares: element.shareCount || 0,
      ctr: element.clickCount && element.impressionCount
        ? element.clickCount / element.impressionCount
        : 0,
      fetched_at: new Date().toISOString(),
    }
  } catch {
    return null
  }
}
