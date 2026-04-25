/**
 * GET /api/cron/weekly-signals
 * Weekly cron job: scrapes public pricing signals and stores them in Supabase.
 * Sources: Hacker News (Ask HN / Show HN pricing), IndieHackers pricing threads.
 * Secured by CRON_SECRET header.
 *
 * Vercel cron: runs every Monday at 09:00 UTC
 */
import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const CRON_SECRET = process.env.CRON_SECRET ?? 'dev-cron-secret'

function getSupabaseAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

interface HNItem {
  objectID: string
  title: string
  url?: string
  story_text?: string
  author: string
  points: number
  num_comments: number
  created_at: string
}

interface HNHit {
  objectID: string
  title: string
  url?: string
  story_text?: string
  author: string
  points: number
  num_comments: number
  created_at: string
}

async function scrapeHackerNews(query: string, tags: string): Promise<HNItem[]> {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=${tags}&hitsPerPage=10&numericFilters=created_at_i>%3D${Math.floor((Date.now() / 1000) - 7 * 86400)}`
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!resp.ok) return []
    const data = await resp.json()
    return (data.hits ?? []) as HNItem[]
  } catch {
    return []
  }
}

function extractPriceContext(text: string): string {
  const priceRegex = /\$[\d,]+(?:\.\d{2})?(?:\/(?:mo|month|yr|year|user))?|\d+(?:\.\d{2})?\s*(?:dollars|USD|per month|\/mo)/gi
  const matches = text.match(priceRegex) ?? []
  return matches.slice(0, 5).join(', ')
}

export async function GET(request: Request) {
  // Verify cron secret (Vercel sets Authorization: Bearer <CRON_SECRET>)
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const weekLabel = new Date().toISOString().slice(0, 10)
  const signals: Array<{
    source: string
    signal_type: string
    title: string
    url: string | null
    summary: string | null
    price_context: string | null
    week_label: string
  }> = []

  // ── Hacker News: pricing discussions ────────────────────────────────
  const hnQueries = [
    { q: 'pricing strategy SaaS indie',  tag: 'story' },
    { q: 'price increase subscription',  tag: 'story' },
    { q: 'Gumroad pricing revenue',       tag: 'story' },
    { q: 'micro SaaS pricing experiments',tag: 'story' },
  ]

  for (const { q, tag } of hnQueries) {
    const hits = await scrapeHackerNews(q, tag)
    for (const hit of hits.slice(0, 3)) {
      const text = [hit.title, hit.story_text ?? ''].join(' ')
      signals.push({
        source: 'hacker_news',
        signal_type: 'pricing_discussion',
        title: hit.title,
        url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
        summary: `${hit.points} points · ${hit.num_comments} comments by ${hit.author}`,
        price_context: extractPriceContext(text) || null,
        week_label: weekLabel,
      })
    }
  }

  // ── Hacker News: Ask HN pricing specifically ─────────────────────────
  const askHits = await scrapeHackerNews('pricing', 'ask_hn')
  for (const hit of askHits.slice(0, 5)) {
    const text = [hit.title, hit.story_text ?? ''].join(' ')
    signals.push({
      source: 'hacker_news_ask',
      signal_type: 'ask_pricing',
      title: hit.title,
      url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      summary: `Ask HN · ${hit.points} pts · ${hit.num_comments} comments`,
      price_context: extractPriceContext(text) || null,
      week_label: weekLabel,
    })
  }

  // ── Product Hunt: recent pricing tools launched ──────────────────────
  try {
    const phResp = await fetch(
      'https://api.producthunt.com/v2/api/graphql',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.PRODUCT_HUNT_API_TOKEN ?? ''}`,
        },
        body: JSON.stringify({
          query: `{
            posts(order: NEWEST, after: null, first: 5, topic: "pricing") {
              nodes { id name tagline url votesCount }
            }
          }`,
        }),
        signal: AbortSignal.timeout(5000),
      }
    )
    if (phResp.ok) {
      const phData = await phResp.json()
      const posts = phData?.data?.posts?.nodes ?? []
      for (const post of posts) {
        signals.push({
          source: 'product_hunt',
          signal_type: 'new_tool',
          title: post.name,
          url: post.url,
          summary: `${post.tagline} · ${post.votesCount} votes`,
          price_context: null,
          week_label: weekLabel,
        })
      }
    }
  } catch {
    // PH optional — skip on timeout
  }

  // ── Deduplicate by URL ───────────────────────────────────────────────
  const seen = new Set<string>()
  const dedupedSignals = signals.filter(s => {
    const key = s.url ?? s.title
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // ── Insert into Supabase ─────────────────────────────────────────────
  let inserted = 0
  if (dedupedSignals.length > 0) {
    const { error } = await supabase
      .from('public_signals')
      .upsert(dedupedSignals, { onConflict: 'source,title', ignoreDuplicates: true })
    if (!error) inserted = dedupedSignals.length
  }

  return NextResponse.json({
    success: true,
    week: weekLabel,
    scraped: signals.length,
    deduplicated: dedupedSignals.length,
    inserted,
    sources: [...new Set(dedupedSignals.map(s => s.source))],
  })
}
