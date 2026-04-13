import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { trackServer } from '@/lib/analytics'

/**
 * POST /api/partners/rss/import
 * 
 * Import a podcast episode from an RSS feed URL.
 * Creates a processing_job + triggers the ingest pipeline.
 * 
 * Body: { rss_url, episode_index? (default 0 = latest) }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { rss_url, episode_index = 0 } = body

  if (!rss_url?.trim()) {
    return NextResponse.json({ error: 'rss_url required' }, { status: 400 })
  }

  // Validate URL
  let parsedUrl: URL
  try { parsedUrl = new URL(rss_url) } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: 'URL must be http or https' }, { status: 400 })
  }

  // Fetch and parse RSS feed
  let feedXml: string
  try {
    const res = await fetch(rss_url, {
      headers: { 'User-Agent': 'ClipSpark/1.0 (+https://clipspark-tau.vercel.app)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`Feed returned ${res.status}`)
    feedXml = await res.text()
  } catch (e) {
    return NextResponse.json({ error: `Failed to fetch RSS feed: ${(e as Error).message}` }, { status: 422 })
  }

  // Parse episodes from RSS
  const episodes = parseRssEpisodes(feedXml)
  if (episodes.length === 0) {
    return NextResponse.json({ error: 'No episodes found in RSS feed' }, { status: 422 })
  }

  const episode = episodes[Math.min(episode_index, episodes.length - 1)]
  if (!episode.enclosureUrl) {
    return NextResponse.json({ error: 'Episode has no audio/video enclosure' }, { status: 422 })
  }

  // Check quota before creating job
  const { data: usage } = await supabase
    .from('usage_ledger')
    .select('clips_used, credits_bal')
    .eq('user_id', user.id)
    .single()

  const svc = createServiceClient()

  // Create job
  const { data: job, error: jobError } = await svc
    .from('processing_jobs')
    .insert({
      user_id: user.id,
      source_url: episode.enclosureUrl,
      source_type: 'rss',
      title: episode.title || 'RSS Episode',
      description: episode.description?.slice(0, 500),
      status: 'pending',
      metadata: {
        rss_feed_url: rss_url,
        episode_index,
        episode_title: episode.title,
        episode_duration: episode.duration,
        partner: 'rss',
      },
    })
    .select()
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: jobError?.message || 'Failed to create job' }, { status: 500 })
  }

  // Log partner integration use
  await svc.from('partner_integrations').upsert({
    partner_slug: 'rss',
    partner_name: 'RSS Feed',
    user_id: user.id,
    integration_type: 'import',
    last_used_at: new Date().toISOString(),
    total_imports: 1,
  }, { onConflict: 'partner_slug,user_id' })

  trackServer(user.id, 'partner_import', { partner: 'rss', job_id: job.id })

  return NextResponse.json({
    job_id: job.id,
    episode_title: episode.title,
    episode_url: episode.enclosureUrl,
    total_episodes: episodes.length,
    redirect_to: `/jobs/${job.id}`,
  }, { status: 201 })
}

// Simple RSS episode parser
function parseRssEpisodes(xml: string): Array<{
  title: string
  enclosureUrl: string | null
  description: string | null
  duration: string | null
  pubDate: string | null
}> {
  const episodes: ReturnType<typeof parseRssEpisodes> = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1]

    const title = extractTag(item, 'title')
    const description = extractTag(item, 'description') || extractTag(item, 'itunes:summary')
    const duration = extractTag(item, 'itunes:duration')
    const pubDate = extractTag(item, 'pubDate')

    // Extract enclosure URL
    const enclosureMatch = item.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*>/)
    const enclosureUrl = enclosureMatch?.[1] || null

    episodes.push({ title: title || 'Unknown Episode', enclosureUrl, description, duration, pubDate })
  }

  return episodes
}

function extractTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}(?:[^>]*)><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}(?:[^>]*)>([^<]*)</${tag}>`))
  return match?.[1] || match?.[2] || null
}

// GET /api/partners/rss/import — list episodes from a feed
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rss_url = req.nextUrl.searchParams.get('rss_url')
  if (!rss_url) return NextResponse.json({ error: 'rss_url required' }, { status: 400 })

  try {
    const res = await fetch(rss_url, {
      headers: { 'User-Agent': 'ClipSpark/1.0' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`Feed returned ${res.status}`)
    const xml = await res.text()

    const showTitle = xml.match(/<channel>[\s\S]*?<title>(?:<!\[CDATA\[)?([^\]<]+)(?:\]\]>)?<\/title>/)?.[1] || 'Unknown Show'
    const episodes = parseRssEpisodes(xml)

    return NextResponse.json({
      show_title: showTitle,
      episode_count: episodes.length,
      episodes: episodes.slice(0, 10).map((e, i) => ({
        index: i,
        title: e.title,
        duration: e.duration,
        pub_date: e.pubDate,
        has_audio: !!e.enclosureUrl,
      })),
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 })
  }
}
