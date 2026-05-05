/**
 * GET /api/cron/weekly-signals
 * Weekly cron job: scrapes public pricing signals, clusters them with AI,
 * and updates research personas.
 * Sources: Hacker News (story/ask), Reddit r/SaaS, IndieHackers proxy searches.
 * Secured by CRON_SECRET header (Vercel injects automatically for cron routes).
 *
 * Vercel cron: runs every Monday at 09:00 UTC
 *
 * Enhancements over v1:
 * - AI clustering (Claude Haiku) assigns each signal to a theme cluster
 * - Persona update: after clustering, upserts research_personas rows
 * - Returns cluster breakdown in response
 */
import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createGateway } from '@ai-sdk/gateway'
const gateway = createGateway()
import { generateObject } from 'ai'
import { z } from 'zod'

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

async function scrapeHackerNews(query: string, tags: string): Promise<HNItem[]> {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=${tags}&hitsPerPage=10&numericFilters=created_at_i>=${Math.floor((Date.now() / 1000) - 7 * 86400)}`
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

// ── AI Clustering ─────────────────────────────────────────────────────────
const CLUSTER_LABELS = [
  'price_increase',      // Discussions about raising prices
  'price_experiment',    // A/B tests, freemium experiments
  'churn_risk',          // Price sensitivity & churn triggers
  'value_anchor',        // Value communication, anchoring
  'competitor_pricing',  // Competitor price moves
  'bundling',            // Bundle offers, tiering
  'new_tool',            // New pricing/billing tools launched
  'general_pricing',     // General pricing discussion
] as const

type ClusterLabel = typeof CLUSTER_LABELS[number]

const CLUSTER_DESCRIPTIONS: Record<ClusterLabel, { label: string; personaTag: string }> = {
  price_increase:    { label: '📈 Price Increases',       personaTag: 'price_optimizer' },
  price_experiment:  { label: '🧪 Price Experiments',     personaTag: 'experimenter' },
  churn_risk:        { label: '⚠️ Churn Risk',            personaTag: 'churn_conscious' },
  value_anchor:      { label: '💎 Value Communication',   personaTag: 'value_seller' },
  competitor_pricing:{ label: '🔍 Competitor Pricing',    personaTag: 'competitive_watcher' },
  bundling:          { label: '📦 Bundling & Tiering',    personaTag: 'bundle_builder' },
  new_tool:          { label: '🛠 New Tools',             personaTag: 'tool_adopter' },
  general_pricing:   { label: '💬 General Pricing',       personaTag: 'learner' },
}

async function clusterSignals(signals: Array<{ title: string; summary: string | null }>): Promise<ClusterLabel[]> {
  if (signals.length === 0) return []

  const bullets = signals.map((s, i) => `${i}: ${s.title}`).join('\n')

  try {
    const { object } = await generateObject({
      model: gateway('anthropic/claude-haiku-4-5'),
      schema: z.object({
        clusters: z.array(z.enum(CLUSTER_LABELS)).describe('One cluster label per signal, in the same order'),
      }),
      prompt: `You are a pricing research analyst. Classify each of the following discussion titles into exactly one cluster.

Available clusters:
- price_increase: someone raising prices or discussing if/when to raise
- price_experiment: A/B tests, freemium → paid, experiment results
- churn_risk: price sensitivity, cancellations, downgrade triggers
- value_anchor: value communication, ROI framing, anchoring
- competitor_pricing: competitor price moves or comparisons
- bundling: bundle deals, tiering, plan structure
- new_tool: new pricing/billing tool or service launched
- general_pricing: general pricing strategy discussion

Titles (one per line, index: title):
${bullets}

Return exactly ${signals.length} cluster labels in the same order as the input.`,
    })
    return object.clusters
  } catch {
    // Fallback: keyword matching
    return signals.map(s => {
      const t = (s.title + ' ' + (s.summary ?? '')).toLowerCase()
      if (/increas|rais|bump/i.test(t)) return 'price_increase'
      if (/experiment|a\/b|test|variant/i.test(t)) return 'price_experiment'
      if (/churn|cancel|downgrad|sensitiv/i.test(t)) return 'churn_risk'
      if (/value|roi|anchor|communic/i.test(t)) return 'value_anchor'
      if (/competitor|compet|rival/i.test(t)) return 'competitor_pricing'
      if (/bundle|tier|plan|package/i.test(t)) return 'bundling'
      if (/launch|tool|product hunt/i.test(t)) return 'new_tool'
      return 'general_pricing'
    })
  }
}

// ── Persona generation ────────────────────────────────────────────────────
async function updatePersonas(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  clusteredSignals: Array<{ title: string; cluster: ClusterLabel; price_context: string | null }>,
  weekLabel: string,
) {
  // Aggregate evidence per cluster
  const clusterEvidence: Record<string, string[]> = {}
  for (const s of clusteredSignals) {
    if (!clusterEvidence[s.cluster]) clusterEvidence[s.cluster] = []
    clusterEvidence[s.cluster].push(s.title)
  }

  const topClusters = Object.entries(clusterEvidence)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 4)

  if (topClusters.length === 0) return

  // Generate personas for dominant clusters using Claude Haiku
  try {
    const { object } = await generateObject({
      model: gateway('anthropic/claude-haiku-4-5'),
      schema: z.object({
        personas: z.array(z.object({
          name: z.string().describe('Short persona name like "The Cautious Raiser"'),
          segment: z.string().describe('Brief 1-sentence segment description'),
          pain_points: z.array(z.string()).describe('2-3 pricing pain points'),
          price_range: z.string().describe('Typical MRR range e.g. "$500–$3k MRR"'),
          key_signals: z.array(z.string()).describe('2-3 behavioral signals'),
        })).describe('One persona per dominant cluster theme'),
      }),
      prompt: `You are a B2B SaaS customer researcher for PricingSim, a pricing experiment tool.
Based on this week's public pricing discussion signals, generate ${topClusters.length} personas representing different micro-SaaS founders.

Cluster themes observed this week:
${topClusters.map(([cluster, titles]) => `\n${cluster} (${titles.length} signals):\n${titles.slice(0, 3).map(t => '  - ' + t).join('\n')}`).join('\n')}

Generate one realistic persona per cluster. Each persona is a solo founder selling digital products, templates, micro-SaaS, or consulting ($500–$10k MRR).`,
    })

    // Upsert personas (by name)
    for (let i = 0; i < object.personas.length; i++) {
      const p = object.personas[i]
      const cluster = topClusters[i]?.[0] ?? 'general_pricing'
      const personaTag = CLUSTER_DESCRIPTIONS[cluster as ClusterLabel]?.personaTag ?? 'learner'

      await supabase.from('research_personas').upsert({
        name: p.name,
        segment: p.segment,
        pain_points: p.pain_points,
        price_range: p.price_range,
        key_signals: p.key_signals,
        evidence_count: clusterEvidence[cluster]?.length ?? 0,
        updated_at: new Date().toISOString(),
        week_label: weekLabel,
      }, { onConflict: 'name' })
    }
  } catch {
    // Persona generation is optional — don't fail the cron if it fails
  }
}

export async function GET(request: Request) {
  // Verify cron secret (Vercel sets Authorization: Bearer <CRON_SECRET>)
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const weekLabel = new Date().toISOString().slice(0, 10)

  const rawSignals: Array<{
    source: string
    signal_type: string
    title: string
    url: string | null
    summary: string | null
    price_context: string | null
    week_label: string
  }> = []

  // ── Hacker News: pricing discussions ─────────────────────────────────
  const hnQueries = [
    { q: 'pricing SaaS', tag: 'story' },
    { q: 'price increase revenue', tag: 'story' },
    { q: 'pricing experiment conversion', tag: 'story' },
    { q: 'micro SaaS pricing', tag: 'story' },
  ]

  for (const { q, tag } of hnQueries) {
    const hits = await scrapeHackerNews(q, tag)
    for (const hit of hits.slice(0, 3)) {
      const text = [hit.title, hit.story_text ?? ''].join(' ')
      rawSignals.push({
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

  // ── Hacker News: Ask HN pricing ───────────────────────────────────────
  const askHits = await scrapeHackerNews('pricing', 'ask_hn')
  for (const hit of askHits.slice(0, 5)) {
    const text = [hit.title, hit.story_text ?? ''].join(' ')
    rawSignals.push({
      source: 'hacker_news_ask',
      signal_type: 'ask_pricing',
      title: hit.title,
      url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      summary: `Ask HN · ${hit.points} pts · ${hit.num_comments} comments`,
      price_context: extractPriceContext(text) || null,
      week_label: weekLabel,
    })
  }

  // ── Product Hunt: recent pricing tools ───────────────────────────────
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
        rawSignals.push({
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
    // PH optional
  }

  // ── Deduplicate by URL / title ────────────────────────────────────────
  const seen = new Set<string>()
  const dedupedSignals = rawSignals.filter(s => {
    const key = s.url ?? s.title
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // ── AI Clustering ─────────────────────────────────────────────────────
  const clusters = await clusterSignals(dedupedSignals.map(s => ({ title: s.title, summary: s.summary })))

  // Merge cluster into signals
  const clusteredSignals = dedupedSignals.map((s, i) => ({
    ...s,
    cluster: clusters[i] ?? 'general_pricing',
    persona_tags: [CLUSTER_DESCRIPTIONS[clusters[i] ?? 'general_pricing']?.personaTag ?? 'learner'],
  }))

  // Cluster summary
  const clusterCounts: Record<string, number> = {}
  for (const s of clusteredSignals) {
    clusterCounts[s.cluster] = (clusterCounts[s.cluster] ?? 0) + 1
  }

  // ── Insert into Supabase ──────────────────────────────────────────────
  let inserted = 0
  if (clusteredSignals.length > 0) {
    const { error } = await supabase
      .from('public_signals')
      .upsert(clusteredSignals, { onConflict: 'source,title', ignoreDuplicates: true })
    if (!error) inserted = clusteredSignals.length
  }

  // ── Update research personas ──────────────────────────────────────────
  await updatePersonas(supabase, clusteredSignals, weekLabel)

  return NextResponse.json({
    success: true,
    week: weekLabel,
    scraped: rawSignals.length,
    deduplicated: dedupedSignals.length,
    inserted,
    clusters: clusterCounts,
    sources: [...new Set(clusteredSignals.map(s => s.source))],
  })
}
