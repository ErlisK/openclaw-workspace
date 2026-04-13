import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/ingest/url/validate?url=<youtube_url>
// Returns { valid, title, duration_sec, thumbnail_url, platform, error? }
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url param required' }, { status: 400 })

  const platform = detectPlatform(url)
  if (!platform) {
    return NextResponse.json({
      valid: false,
      error: 'Unsupported URL. Paste a YouTube, Spotify, or direct media URL.',
    }, { status: 422 })
  }

  // For YouTube: use oEmbed to get title + thumbnail (no API key needed)
  if (platform === 'youtube') {
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
        { signal: AbortSignal.timeout(5000) }
      )
      if (!oembedRes.ok) {
        return NextResponse.json({ valid: false, error: 'Video not found or private' }, { status: 422 })
      }
      const oembed = await oembedRes.json()
      const videoId = extractYouTubeId(url)
      return NextResponse.json({
        valid: true,
        title: oembed.title,
        author: oembed.author_name,
        thumbnail_url: videoId
          ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
          : oembed.thumbnail_url,
        platform: 'youtube',
        // duration not available via oEmbed; client shows unknown
        duration_sec: null,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return NextResponse.json({ valid: false, error: `YouTube lookup failed: ${message}` }, { status: 422 })
    }
  }

  // For direct audio/video URLs (mp3, mp4, wav): HEAD request to get content-length
  if (platform === 'direct') {
    try {
      const head = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
      const ct = head.headers.get('content-type') || ''
      const isMedia = ct.startsWith('audio/') || ct.startsWith('video/') || url.match(/\.(mp3|mp4|m4a|wav|ogg|aac|mov)(\?|$)/i)
      if (!isMedia) {
        return NextResponse.json({ valid: false, error: 'URL does not point to a media file' }, { status: 422 })
      }
      const size = head.headers.get('content-length')
      return NextResponse.json({
        valid: true,
        title: url.split('/').pop()?.split('?')[0] || 'Media File',
        platform: 'direct',
        file_size_bytes: size ? parseInt(size) : null,
        duration_sec: null,
        thumbnail_url: null,
      })
    } catch {
      return NextResponse.json({ valid: false, error: 'Could not reach that URL' }, { status: 422 })
    }
  }

  return NextResponse.json({ valid: true, platform, title: null, duration_sec: null })
}

function detectPlatform(url: string): string | null {
  if (url.match(/youtube\.com|youtu\.be/)) return 'youtube'
  if (url.match(/spotify\.com\/episode/)) return 'spotify'
  if (url.match(/\.(mp3|mp4|m4a|wav|ogg|aac|mov)(\?|$)/i)) return 'direct'
  if (url.match(/^https?:\/\//)) return 'direct' // try HEAD anyway
  return null
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}
