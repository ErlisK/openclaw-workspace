import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { trackServer } from '@/lib/analytics'

/**
 * POST /api/clips/[id]/publish/linkedin
 * 
 * Uploads a clip to LinkedIn as a native video post.
 * Uses LinkedIn Videos API (2024+) with resumable upload.
 * Falls back to ugcPosts v2 if Videos API unavailable.
 * 
 * LinkedIn OAuth scopes required:
 *   openid, profile, email, w_member_social, r_basicprofile
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { caption_override } = body

  const { data: clip } = await supabase
    .from('clip_outputs')
    .select('id, title, export_url, preview_url, hashtags, transcript_excerpt, duration_sec, platform')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!clip) return NextResponse.json({ error: 'Clip not found' }, { status: 404 })

  const videoUrl = clip.export_url || clip.preview_url
  if (!videoUrl) {
    return NextResponse.json({
      error: 'No video available. Approve the clip to trigger a full render first.',
    }, { status: 400 })
  }

  const svc = createServiceClient()
  const { data: conn } = await svc
    .from('oauth_connections')
    .select('access_token, refresh_token, provider_user_id, token_expires_at, scope')
    .eq('user_id', user.id)
    .eq('provider', 'linkedin')
    .single()

  if (!conn) {
    return NextResponse.json({
      error: 'LinkedIn not connected',
      connect_url: '/api/connect/linkedin/auth',
      action_required: 'connect',
    }, { status: 403 })
  }

  // Attempt token refresh if expired or expiring soon
  let accessToken = conn.access_token
  const isExpired = conn.token_expires_at && new Date(conn.token_expires_at) < new Date(Date.now() + 120_000)

  if (isExpired) {
    if (conn.refresh_token) {
      const refreshed = await refreshLinkedInToken(conn.refresh_token, user.id, svc)
      if (refreshed) {
        accessToken = refreshed
      } else {
        return NextResponse.json({
          error: 'LinkedIn token expired and refresh failed. Please reconnect.',
          connect_url: '/api/connect/linkedin/auth',
          action_required: 'reconnect',
        }, { status: 403 })
      }
    } else {
      return NextResponse.json({
        error: 'LinkedIn token expired. Please reconnect.',
        connect_url: '/api/connect/linkedin/auth',
        action_required: 'reconnect',
      }, { status: 403 })
    }
  }

  const memberId = conn.provider_user_id
  if (!memberId) {
    return NextResponse.json({
      error: 'LinkedIn member ID missing. Please reconnect.',
      connect_url: '/api/connect/linkedin/auth',
      action_required: 'reconnect',
    }, { status: 403 })
  }

  const tags = parseHashtags(clip.hashtags)
  const caption = caption_override || buildLinkedInCaption(clip.title || 'New clip', clip.transcript_excerpt, tags)

  // Create publish log entry
  const { data: logEntry } = await svc.from('publish_log').insert({
    user_id: user.id,
    clip_id: id,
    platform: 'LinkedIn',
    provider: 'linkedin',
    status: 'uploading',
    metadata: {
      caption: caption.slice(0, 200),
      member_id: memberId,
      video_url: videoUrl,
    },
    analytics_consent: true,
  }).select().single()

  try {
    const result = await uploadToLinkedIn({
      accessToken,
      memberId,
      videoUrl,
      caption,
      clipTitle: clip.title || 'ClipSpark clip',
    })

    const postedUrl = `https://www.linkedin.com/feed/update/${result.postUrn}/`

    await Promise.all([
      supabase.from('clip_outputs').update({
        is_posted: true,
        posted_url: postedUrl,
        updated_at: new Date().toISOString(),
      }).eq('id', id),
      svc.from('publish_log').update({
        status: 'published',
        provider_post_id: result.postUrn,
        provider_video_id: result.assetUrn,
        posted_url: postedUrl,
        updated_at: new Date().toISOString(),
      }).eq('id', logEntry?.id),
    ])

    trackServer(user.id, 'export_completed', {
      platform: 'LinkedIn',
      provider: 'linkedin',
      clip_id: id,
      posted_url: postedUrl,
    })

    return NextResponse.json({
      ok: true,
      posted_url: postedUrl,
      urn: result.postUrn,
      asset_urn: result.assetUrn,
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Upload failed'

    if (logEntry?.id) {
      await svc.from('publish_log').update({
        status: 'failed',
        error_message: msg,
        updated_at: new Date().toISOString(),
      }).eq('id', logEntry.id)
    }

    console.error('[LINKEDIN_PUBLISH]', msg)

    // Classify error type for better UX
    const isAuthError = msg.includes('401') || msg.includes('403') || msg.includes('token')
    if (isAuthError) {
      return NextResponse.json({
        error: 'LinkedIn authorization error. Please reconnect your account.',
        connect_url: '/api/connect/linkedin/auth',
        action_required: 'reconnect',
        detail: msg,
      }, { status: 403 })
    }

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ── LinkedIn video upload ────────────────────────────────────────────────────
async function uploadToLinkedIn({
  accessToken,
  memberId,
  videoUrl,
  caption,
  clipTitle,
}: {
  accessToken: string
  memberId: string
  videoUrl: string
  caption: string
  clipTitle: string
}) {
  const authorUrn = `urn:li:person:${memberId}`

  // Download video
  const videoRes = await fetch(videoUrl, { signal: AbortSignal.timeout(30000) })
  if (!videoRes.ok) throw new Error(`Could not download video: ${videoRes.status}`)
  const videoBuffer = await videoRes.arrayBuffer()
  const videoBytes = new Uint8Array(videoBuffer)
  const fileSize = videoBytes.length

  // ── Step 1: Register upload (LinkedIn Videos API 2024) ───────────────────
  const registerRes = await fetch('https://api.linkedin.com/rest/videos?action=initializeUpload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202401',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: authorUrn,
        fileSizeBytes: fileSize,
        uploadCaptions: false,
        uploadThumbnail: false,
      },
    }),
  })

  // Fallback to legacy API if new endpoint unavailable
  if (!registerRes.ok && registerRes.status === 404) {
    return uploadToLinkedInLegacy({ accessToken, memberId, videoBytes, caption })
  }

  if (!registerRes.ok) {
    const errText = await registerRes.text()
    throw new Error(`LinkedIn initializeUpload failed: ${registerRes.status} ${errText.slice(0, 200)}`)
  }

  const registerData = await registerRes.json()
  const { value: { uploadInstructions, video: videoUrn } } = registerData

  if (!uploadInstructions?.length) throw new Error('LinkedIn: no upload instructions returned')

  // ── Step 2: Upload chunks ────────────────────────────────────────────────
  const etags: string[] = []
  for (const instruction of uploadInstructions) {
    const { uploadUrl, firstByte, lastByte } = instruction
    const chunk = videoBytes.slice(firstByte, lastByte + 1)
    const chunkRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: chunk,
    })
    if (!chunkRes.ok && chunkRes.status !== 200) {
      throw new Error(`LinkedIn chunk upload failed: ${chunkRes.status}`)
    }
    const etag = chunkRes.headers.get('etag') || chunkRes.headers.get('ETag') || ''
    etags.push(etag)
  }

  // ── Step 3: Finalize upload ───────────────────────────────────────────────
  const finalizeRes = await fetch('https://api.linkedin.com/rest/videos?action=finalizeUpload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202401',
    },
    body: JSON.stringify({
      finalizeUploadRequest: {
        video: videoUrn,
        uploadToken: '',
        uploadedPartIds: etags,
      },
    }),
  })

  if (!finalizeRes.ok) {
    const errText = await finalizeRes.text()
    throw new Error(`LinkedIn finalizeUpload failed: ${finalizeRes.status} ${errText.slice(0, 200)}`)
  }

  // ── Step 4: Create post ───────────────────────────────────────────────────
  const postRes = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202401',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: authorUrn,
      commentary: caption,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      content: {
        media: {
          title: clipTitle.slice(0, 200),
          id: videoUrn,
        },
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    }),
  })

  if (!postRes.ok) {
    const errText = await postRes.text()
    throw new Error(`LinkedIn create post failed: ${postRes.status} ${errText.slice(0, 200)}`)
  }

  const postUrn = postRes.headers.get('x-restli-id') || postRes.headers.get('X-RestLi-Id') || ''
  return { postUrn, assetUrn: videoUrn }
}

// ── Legacy LinkedIn API (ugcPosts v2) ─────────────────────────────────────────
async function uploadToLinkedInLegacy({
  accessToken,
  memberId,
  videoBytes,
  caption,
}: {
  accessToken: string
  memberId: string
  videoBytes: Uint8Array
  caption: string
}) {
  const authorUrn = `urn:li:person:${memberId}`

  const registerRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-video'],
        owner: authorUrn,
        serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }],
      },
    }),
  })

  if (!registerRes.ok) throw new Error(`LinkedIn register upload failed: ${registerRes.status}`)
  const reg = await registerRes.json()
  const uploadUrl = reg.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl
  const assetUrn = reg.value?.asset
  if (!uploadUrl || !assetUrn) throw new Error('LinkedIn: no upload URL from legacy API')

  const upRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: Buffer.from(videoBytes),
  })
  if (!upRes.ok && upRes.status !== 201) throw new Error(`LinkedIn upload failed: ${upRes.status}`)

  const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: caption },
          shareMediaCategory: 'VIDEO',
          media: [{ status: 'READY', media: assetUrn }],
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  })
  if (!postRes.ok) throw new Error(`LinkedIn ugcPosts failed: ${postRes.status}`)
  const d = await postRes.json()
  return { postUrn: d.id, assetUrn }
}

// ── LinkedIn token refresh ────────────────────────────────────────────────────
async function refreshLinkedInToken(
  refreshToken: string,
  userId: string,
  svc: ReturnType<typeof createServiceClient>
): Promise<string | null> {
  try {
    const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
    })
    if (!res.ok) return null
    const { access_token, expires_in, refresh_token: new_refresh } = await res.json()
    await svc.from('oauth_connections').update({
      access_token,
      ...(new_refresh ? { refresh_token: new_refresh } : {}),
      token_expires_at: new Date(Date.now() + (expires_in || 5183944) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId).eq('provider', 'linkedin')
    return access_token
  } catch {
    return null
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildLinkedInCaption(title: string, excerpt: string | null, tags: string[]): string {
  const hashtagLine = tags.slice(0, 5).map(t => `#${t}`).join(' ')
  return [title, '', excerpt?.slice(0, 500) || '', '', hashtagLine].filter(Boolean).join('\n').trim().slice(0, 3000)
}

function parseHashtags(h: unknown): string[] {
  if (!h) return []
  if (Array.isArray(h)) return h.map((t: string) => t.replace(/^#/, ''))
  if (typeof h === 'string') {
    try { return JSON.parse(h).map((t: string) => t.replace(/^#/, '')) } catch {}
    return h.split(/\s+/).filter(t => t.startsWith('#')).map(t => t.replace(/^#/, ''))
  }
  return []
}
