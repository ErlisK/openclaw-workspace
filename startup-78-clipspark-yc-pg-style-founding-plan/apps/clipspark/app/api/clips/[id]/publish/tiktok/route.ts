import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { trackServer } from '@/lib/analytics'

/**
 * POST /api/clips/[id]/publish/tiktok
 * 
 * TikTok Publishing — two paths depending on availability:
 * 
 * Path A: TikTok Content Posting API (requires approved developer access)
 *   - POST /v2/post/publish/video/init/ → multipart upload
 *   - Requires scope: video.publish
 *   - App must be approved at developers.tiktok.com
 * 
 * Path B: Buffer API (buffer.com)
 *   - POST /1/updates/create.json with media attachment
 *   - Requires BUFFER_ACCESS_TOKEN env var
 *   - Buffer handles TikTok OAuth on behalf of user
 * 
 * Path C: Deep-link fallback
 *   - Returns a download URL + deep-link for manual posting
 *   - Always available, no extra credentials needed
 * 
 * Current implementation: Path C (deep-link) with Path B (Buffer) if configured.
 * TikTok Content API (Path A) requires app approval — see PUBLISHING_DOCS.md.
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
    .select('id, title, export_url, preview_url, hashtags, caption_style, platform, duration_sec')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!clip) return NextResponse.json({ error: 'Clip not found' }, { status: 404 })

  const videoUrl = clip.export_url || clip.preview_url
  if (!videoUrl) {
    return NextResponse.json({
      error: 'No video available. Approve the clip first.',
    }, { status: 400 })
  }

  const tags = parseHashtags(clip.hashtags)
  const caption = caption_override || buildTikTokCaption(clip.title, tags)

  const svc = createServiceClient()

  // ── Path B: Buffer API ────────────────────────────────────────────────────
  const bufferToken = process.env.BUFFER_ACCESS_TOKEN
  if (bufferToken) {
    try {
      const result = await postViaBuffer({
        accessToken: bufferToken,
        videoUrl,
        caption,
        platform: 'tiktok',
      })

      const { data: logEntry } = await svc.from('publish_log').insert({
        user_id: user.id,
        clip_id: id,
        platform: 'TikTok',
        provider: 'buffer',
        status: 'scheduled',
        provider_post_id: result.update_id,
        metadata: { caption, via: 'buffer' },
      }).select().single()

      trackServer(user.id, 'export_completed', {
        platform: 'TikTok',
        provider: 'buffer',
        clip_id: id,
      })

      return NextResponse.json({
        ok: true,
        method: 'buffer',
        scheduled: true,
        update_id: result.update_id,
        caption,
        video_url: videoUrl,
        note: 'Scheduled via Buffer. Check your Buffer queue to confirm timing.',
      })
    } catch (bufferErr) {
      console.warn('[TIKTOK_PUBLISH] Buffer failed, falling back to deep-link:', (bufferErr as Error).message)
    }
  }

  // ── Path C: Deep-link fallback ────────────────────────────────────────────
  await svc.from('publish_log').insert({
    user_id: user.id,
    clip_id: id,
    platform: 'TikTok',
    provider: 'manual',
    status: 'pending_manual',
    metadata: { caption, via: 'deeplink', video_url: videoUrl },
  })

  trackServer(user.id, 'clip_exported', {
    platform: 'TikTok',
    provider: 'manual',
    clip_id: id,
    method: 'deeplink',
  })

  // Build TikTok deep-link (opens TikTok video upload on mobile)
  const tiktokDeepLink = `tiktok://upload?source=${encodeURIComponent(videoUrl)}`
  const tiktokWebLink = 'https://www.tiktok.com/upload'

  return NextResponse.json({
    ok: true,
    method: 'deeplink',
    download_url: videoUrl,
    caption,
    tiktok_deeplink: tiktokDeepLink,
    tiktok_web: tiktokWebLink,
    steps: [
      '1. Download the video using the download_url',
      '2. Open TikTok → + button → Upload',
      '3. Select the downloaded video',
      '4. Paste the caption below',
    ],
    note: 'TikTok Content Posting API requires app approval at developers.tiktok.com. See /docs/publishing for setup instructions.',
  })
}

// Buffer API integration
async function postViaBuffer({
  accessToken,
  videoUrl,
  caption,
  platform,
}: {
  accessToken: string
  videoUrl: string
  caption: string
  platform: string
}) {
  // Get Buffer profiles
  const profilesRes = await fetch('https://api.bufferapp.com/1/profiles.json', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!profilesRes.ok) throw new Error(`Buffer profiles failed: ${profilesRes.status}`)
  const profiles = await profilesRes.json()
  const tiktokProfile = profiles.find((p: { service: string; id: string }) => p.service === platform || p.service === 'tiktok')
  if (!tiktokProfile) throw new Error('No TikTok profile found in Buffer')

  // Create update
  const updateRes = await fetch('https://api.bufferapp.com/1/updates/create.json', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      text: caption,
      profile_ids: tiktokProfile.id,
      media: JSON.stringify({ video: videoUrl }),
      shorten: 'false',
    }),
  })
  if (!updateRes.ok) throw new Error(`Buffer create update failed: ${updateRes.status}`)
  const data = await updateRes.json()
  return { update_id: data.updates?.[0]?.id }
}

function buildTikTokCaption(title: string | null, tags: string[]): string {
  const hashtagLine = tags.slice(0, 8).map(t => `#${t}`).join(' ')
  return [(title || '').slice(0, 100), hashtagLine].filter(Boolean).join('\n').trim().slice(0, 2200)
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
