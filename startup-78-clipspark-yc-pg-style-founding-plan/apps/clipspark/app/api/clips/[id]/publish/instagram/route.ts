import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { trackServer } from '@/lib/analytics'

/**
 * POST /api/clips/[id]/publish/instagram
 * 
 * Instagram Reels Publishing — paths:
 * 
 * Path A: Meta Graph API (requires Facebook App approval)
 *   - POST /{ig-user-id}/media (create container)
 *   - POST /{ig-user-id}/media_publish (publish)
 *   - Requires: instagram_basic, instagram_content_publish
 *   - Requires Facebook App with Instagram permissions + business account
 * 
 * Path B: Buffer API (buffer.com)
 *   - Same Buffer integration as TikTok
 *   - Requires BUFFER_ACCESS_TOKEN + connected Instagram account
 * 
 * Path C: Deep-link fallback (always available)
 *   - Returns download URL + Instagram deep-link for manual posting
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
    .select('id, title, export_url, preview_url, hashtags, platform, duration_sec')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!clip) return NextResponse.json({ error: 'Clip not found' }, { status: 404 })

  const videoUrl = clip.export_url || clip.preview_url
  if (!videoUrl) {
    return NextResponse.json({ error: 'No video available. Approve the clip first.' }, { status: 400 })
  }

  const tags = parseHashtags(clip.hashtags)
  const caption = caption_override || buildInstagramCaption(clip.title, tags)

  const svc = createServiceClient()

  // ── Path A: Meta Graph API ────────────────────────────────────────────────
  const igToken = process.env.INSTAGRAM_ACCESS_TOKEN
  const igUserId = process.env.INSTAGRAM_USER_ID
  if (igToken && igUserId) {
    try {
      const reelsUrl = await publishInstagramReels({ accessToken: igToken, userId: igUserId, videoUrl, caption })

      await svc.from('publish_log').insert({
        user_id: user.id,
        clip_id: id,
        platform: 'Instagram Reels',
        provider: 'instagram',
        status: 'published',
        posted_url: reelsUrl,
        metadata: { caption, via: 'graph_api' },
      })

      trackServer(user.id, 'export_completed', { platform: 'Instagram Reels', provider: 'instagram', clip_id: id })

      return NextResponse.json({ ok: true, method: 'meta_graph', posted_url: reelsUrl })
    } catch (err) {
      console.warn('[INSTAGRAM] Meta Graph API failed:', (err as Error).message)
    }
  }

  // ── Path B: Buffer API ────────────────────────────────────────────────────
  const bufferToken = process.env.BUFFER_ACCESS_TOKEN
  if (bufferToken) {
    try {
      const profilesRes = await fetch('https://api.bufferapp.com/1/profiles.json', {
        headers: { Authorization: `Bearer ${bufferToken}` },
      })
      if (profilesRes.ok) {
        const profiles = await profilesRes.json()
        const igProfile = profiles.find((p: { service: string; id: string }) => p.service === 'instagram')
        if (igProfile) {
          const updateRes = await fetch('https://api.bufferapp.com/1/updates/create.json', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${bufferToken}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              text: caption,
              profile_ids: igProfile.id,
              media: JSON.stringify({ video: videoUrl }),
            }),
          })
          if (updateRes.ok) {
            const data = await updateRes.json()
            await svc.from('publish_log').insert({
              user_id: user.id, clip_id: id,
              platform: 'Instagram Reels', provider: 'buffer',
              status: 'scheduled',
              provider_post_id: data.updates?.[0]?.id,
              metadata: { caption, via: 'buffer' },
            })
            return NextResponse.json({ ok: true, method: 'buffer', scheduled: true, caption, video_url: videoUrl })
          }
        }
      }
    } catch (bufferErr) {
      console.warn('[INSTAGRAM] Buffer failed:', (bufferErr as Error).message)
    }
  }

  // ── Path C: Deep-link fallback ────────────────────────────────────────────
  await svc.from('publish_log').insert({
    user_id: user.id,
    clip_id: id,
    platform: 'Instagram Reels',
    provider: 'manual',
    status: 'pending_manual',
    metadata: { caption, via: 'deeplink', video_url: videoUrl },
  })

  trackServer(user.id, 'clip_exported', { platform: 'Instagram Reels', provider: 'manual', clip_id: id, method: 'deeplink' })

  return NextResponse.json({
    ok: true,
    method: 'deeplink',
    download_url: videoUrl,
    caption,
    instagram_deeplink: 'instagram://camera',
    steps: [
      '1. Download the video using the download_url',
      '2. Open Instagram → + → Reel → Upload',
      '3. Select the video',
      '4. Paste the caption below',
      '5. Post as Reel',
    ],
    note: 'Instagram Reels API requires Meta App approval. See /docs/publishing for setup.',
  })
}

// Meta Graph API: Reels upload
async function publishInstagramReels({
  accessToken,
  userId,
  videoUrl,
  caption,
}: {
  accessToken: string
  userId: string
  videoUrl: string
  caption: string
}) {
  // Step 1: Create media container
  const containerRes = await fetch(
    `https://graph.facebook.com/v19.0/${userId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'REELS',
        video_url: videoUrl,
        caption,
        share_to_feed: true,
        access_token: accessToken,
      }),
    }
  )
  if (!containerRes.ok) throw new Error(`Meta: create container failed: ${containerRes.status}`)
  const { id: creationId } = await containerRes.json()

  // Step 2: Poll for processing
  let ready = false
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 3000))
    const statusRes = await fetch(
      `https://graph.facebook.com/v19.0/${creationId}?fields=status_code&access_token=${accessToken}`
    )
    if (statusRes.ok) {
      const s = await statusRes.json()
      if (s.status_code === 'FINISHED') { ready = true; break }
      if (s.status_code === 'ERROR') throw new Error('Meta: video processing failed')
    }
  }
  if (!ready) throw new Error('Meta: video processing timed out')

  // Step 3: Publish
  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${userId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: creationId, access_token: accessToken }),
    }
  )
  if (!publishRes.ok) throw new Error(`Meta: publish failed: ${publishRes.status}`)
  const { id: postId } = await publishRes.json()
  return `https://www.instagram.com/p/${postId}/`
}

function buildInstagramCaption(title: string | null, tags: string[]): string {
  const hashtagLine = tags.slice(0, 10).map(t => `#${t}`).join(' ')
  return [(title || '').slice(0, 150), '', hashtagLine].filter(Boolean).join('\n').trim().slice(0, 2200)
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
