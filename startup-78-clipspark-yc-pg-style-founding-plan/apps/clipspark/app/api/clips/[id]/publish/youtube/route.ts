import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { trackServer } from '@/lib/analytics'

// POST /api/clips/[id]/publish/youtube
// Uploads the export_url video to YouTube as a Short
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get clip
  const { data: clip } = await supabase
    .from('clip_outputs')
    .select('id, title, export_url, preview_url, hashtags, transcript_excerpt, duration_sec, platform')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!clip) return NextResponse.json({ error: 'Clip not found' }, { status: 404 })

  const videoUrl = clip.export_url || clip.preview_url
  if (!videoUrl) return NextResponse.json({ error: 'No video available for export' }, { status: 400 })

  // Get YouTube access token
  const svc = createServiceClient()
  const { data: conn } = await svc
    .from('oauth_connections')
    .select('access_token, refresh_token, token_expires_at')
    .eq('user_id', user.id)
    .eq('provider', 'youtube')
    .single()

  if (!conn) {
    return NextResponse.json({
      error: 'YouTube not connected',
      connect_url: '/api/connect/youtube/auth',
    }, { status: 403 })
  }

  // Refresh token if expired
  let accessToken = conn.access_token
  if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date(Date.now() + 60_000)) {
    const refreshed = await refreshGoogleToken(conn.refresh_token, user.id, svc)
    if (!refreshed) {
      return NextResponse.json({
        error: 'YouTube token expired. Please reconnect.',
        connect_url: '/api/connect/youtube/auth',
      }, { status: 403 })
    }
    accessToken = refreshed
  }

  // Parse hashtags
  const tags = parseHashtags(clip.hashtags)
  const title = (clip.title || 'ClipSpark Short').slice(0, 100)
  const description = [
    clip.transcript_excerpt?.slice(0, 300) || '',
    '',
    tags.join(' '),
    '',
    '#Shorts',
  ].join('\n').trim()

  // Create publish_log entry
  const { data: logEntry } = await svc.from('publish_log').insert({
    user_id: user.id,
    clip_id: id,
    platform: 'YouTube Shorts',
    provider: 'youtube',
    status: 'uploading',
    metadata: { title, tags: tags.slice(0, 15) },
  }).select().single()

  // Upload video to YouTube
  try {
    const youtubePostId = await uploadToYouTube({
      accessToken,
      videoUrl,
      title,
      description,
      tags: tags.slice(0, 15),
    })

    const postedUrl = `https://www.youtube.com/shorts/${youtubePostId}`

    // Update clip + publish log
    await Promise.all([
      supabase.from('clip_outputs').update({
        is_posted: true,
        posted_url: postedUrl,
        updated_at: new Date().toISOString(),
      }).eq('id', id),
      svc.from('publish_log').update({
        status: 'published',
        provider_post_id: youtubePostId,
        posted_url: postedUrl,
        updated_at: new Date().toISOString(),
      }).eq('id', logEntry?.id),
    ])

    trackServer(user.id, 'export_completed', {
      platform: 'YouTube Shorts',
      provider: 'youtube',
      clip_id: id,
      posted_url: postedUrl,
    })

    return NextResponse.json({ ok: true, posted_url: postedUrl, video_id: youtubePostId })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Upload failed'
    if (logEntry?.id) {
      await svc.from('publish_log').update({
        status: 'failed',
        error_message: msg,
        updated_at: new Date().toISOString(),
      }).eq('id', logEntry.id)
    }
    console.error('[YOUTUBE_PUBLISH]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ── YouTube upload via resumable upload API ─────────────────────────────────
async function uploadToYouTube({
  accessToken,
  videoUrl,
  title,
  description,
  tags,
}: {
  accessToken: string
  videoUrl: string
  title: string
  description: string
  tags: string[]
}) {
  // Download video bytes
  const videoRes = await fetch(videoUrl)
  if (!videoRes.ok) throw new Error(`Could not download video: ${videoRes.status}`)
  const videoBuffer = await videoRes.arrayBuffer()
  const videoBytes = new Uint8Array(videoBuffer)
  const contentType = videoRes.headers.get('content-type') || 'video/mp4'

  // Step 1: initiate resumable upload session
  const metadata = {
    snippet: {
      title,
      description,
      tags,
      categoryId: '22', // People & Blogs — suitable for Shorts
      defaultLanguage: 'en',
    },
    status: {
      privacyStatus: 'public',
      selfDeclaredMadeForKids: false,
    },
  }

  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': contentType,
        'X-Upload-Content-Length': String(videoBytes.length),
      },
      body: JSON.stringify(metadata),
    }
  )

  if (!initRes.ok) {
    const err = await initRes.text()
    throw new Error(`YouTube initiate upload failed: ${initRes.status} ${err.slice(0, 200)}`)
  }

  const uploadUrl = initRes.headers.get('location')
  if (!uploadUrl) throw new Error('No upload URL from YouTube')

  // Step 2: upload video bytes
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(videoBytes.length),
    },
    body: videoBytes,
  })

  if (!uploadRes.ok && uploadRes.status !== 201) {
    const err = await uploadRes.text()
    throw new Error(`YouTube upload failed: ${uploadRes.status} ${err.slice(0, 200)}`)
  }

  const result = await uploadRes.json()
  return result.id as string
}

// ── Google token refresh ────────────────────────────────────────────────────
async function refreshGoogleToken(
  refreshToken: string | null,
  userId: string,
  svc: ReturnType<typeof createServiceClient>
): Promise<string | null> {
  if (!refreshToken) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) return null

  const { access_token, expires_in } = await res.json()
  await svc.from('oauth_connections').update({
    access_token,
    token_expires_at: new Date(Date.now() + (expires_in || 3600) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId).eq('provider', 'youtube')

  return access_token
}

// ── Parse hashtags ─────────────────────────────────────────────────────────
function parseHashtags(h: unknown): string[] {
  if (!h) return []
  if (Array.isArray(h)) return h.map(t => t.replace(/^#/, ''))
  if (typeof h === 'string') {
    try { return JSON.parse(h).map((t: string) => t.replace(/^#/, '')) } catch {}
    return h.split(/\s+/).filter(t => t.startsWith('#')).map(t => t.replace(/^#/, ''))
  }
  return []
}
