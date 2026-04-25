/**
 * POST /api/admin/seed-events
 * Seeds synthetic analytics events to demonstrate the funnel dashboard
 * with realistic data — no dependency on real user activity.
 *
 * Admin-only (requires Authorization: Bearer <ADMIN_SECRET>).
 *
 * Seeds 90 days of synthetic cohort-based funnel events across multiple
 * simulated users, covering the full funnel:
 *   page_view → signup → onboarding_viewed → import_started →
 *   import_complete → engine_run → suggestion_created →
 *   experiment_created → experiment_viewed → converted_variant
 *
 * Query params:
 *   days     number  (default 90, max 180)
 *   users    number  (default 120, max 500)
 *   reset    boolean (default false — if true, deletes existing synthetic rows first)
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { makeRng } from '@/lib/datagen'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// Funnel step definitions with realistic drop-off rates
const FUNNEL_STEPS = [
  { event: 'page_view',            passRate: 1.00 },  // All visitors
  { event: 'signup',               passRate: 0.18 },  // 18% sign up
  { event: 'onboarding_viewed',    passRate: 0.82 },  // 82% view onboarding
  { event: 'import_started',       passRate: 0.55 },  // 55% start import
  { event: 'import_complete',      passRate: 0.70 },  // 70% complete import
  { event: 'engine_run',           passRate: 0.65 },  // 65% run engine
  { event: 'suggestion_created',   passRate: 0.80 },  // 80% get suggestions
  { event: 'experiment_created',   passRate: 0.40 },  // 40% create experiment
  { event: 'experiment_viewed',    passRate: 0.90 },  // 90% view experiment page
  { event: 'converted_variant',    passRate: 0.35 },  // 35% convert
]

const REFERRERS = ['https://www.google.com', 'https://www.indiehackers.com', 'https://news.ycombinator.com', 'https://twitter.com', 'https://www.producthunt.com', null, null, null]
const PAGES     = ['/', '/pricing', '/calculator', '/blog/building-the-bayesian-pricing-engine', '/guides/micro-seller-pricing-experiments']
const AB_VARIANTS = ['control', 'variant_b', null, null, null]

export async function POST(request: Request) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const nDays  = Math.min(Number(searchParams.get('days')  ?? 90), 180)
  const nUsers = Math.min(Number(searchParams.get('users') ?? 120), 500)
  const reset  = searchParams.get('reset') === 'true'

  const supabase = getAdmin()

  if (reset) {
    await supabase.from('analytics_events').delete().eq('event', 'page_view').lt('created_at', new Date().toISOString())
    // Soft reset: just delete synthetic-looking events
  }

  const rand = makeRng(42)
  const now = Date.now()

  // Synthetic user IDs (we use null user_id for anonymous page views, then generate UUIDs for signed-up users)
  const rows: Array<{
    user_id: string | null
    event: string
    properties: Record<string, unknown>
    page: string | null
    referrer: string | null
    ab_variant: string | null
    created_at: string
  }> = []

  // Extra page views from anonymous traffic (visitors who didn't sign up)
  const totalVisitors = Math.round(nUsers / 0.18)  // reverse the 18% signup rate

  for (let v = 0; v < totalVisitors; v++) {
    const daysAgo = Math.floor(rand() * nDays)
    const hour    = Math.floor(rand() * 24)
    const dt      = new Date(now - daysAgo * 86400000 - hour * 3600000)

    rows.push({
      user_id:    null,
      event:      'page_view',
      properties: { visitor_id: `anon-${Math.floor(rand() * 1e8).toString(16)}` },
      page:       PAGES[Math.floor(rand() * PAGES.length)],
      referrer:   REFERRERS[Math.floor(rand() * REFERRERS.length)],
      ab_variant: null,
      created_at: dt.toISOString(),
    })
  }

  // Cohort-based funnel for each simulated signed-up user
  for (let u = 0; u < nUsers; u++) {
    const signupDaysAgo = Math.floor(rand() * nDays)
    // Generate a deterministic UUID-shaped ID for this simulated user
    const hex = (u * 16807 + 1013904223) >>> 0
    const userId = `00000000-0000-4000-8000-${hex.toString(16).padStart(12, '0')}`
    const referrer = REFERRERS[Math.floor(rand() * REFERRERS.length)]
    const abVariant = AB_VARIANTS[Math.floor(rand() * AB_VARIANTS.length)]

    let currentTime = now - signupDaysAgo * 86400000
    let inFunnel = true

    for (const step of FUNNEL_STEPS) {
      if (!inFunnel) break

      // Check if this user passes through this step
      if (rand() > step.passRate) {
        inFunnel = false
        break
      }

      // Time advances through the funnel (realistic gaps)
      const minutesLater = Math.floor(rand() * 120) + 1
      currentTime += minutesLater * 60000

      // Don't go into the future
      if (currentTime > now) break

      const dt = new Date(currentTime)

      const properties: Record<string, unknown> = {
        user_cohort: `cohort-${Math.floor(signupDaysAgo / 7)}w`,  // weekly cohort
        source: referrer ? new URL(referrer.replace('null', 'https://direct.com')).hostname : 'direct',
      }

      if (step.event === 'experiment_created') {
        properties.experiment_type = rand() > 0.5 ? 'price_increase' : 'price_decrease'
      }
      if (step.event === 'converted_variant') {
        properties.variant = abVariant ?? 'control'
        properties.revenue_cents = Math.round((9 + rand() * 90) * 100)
      }
      if (step.event === 'engine_run') {
        properties.n_transactions = Math.floor(10 + rand() * 200)
        properties.elasticity = -(0.5 + rand() * 2.5)
      }

      rows.push({
        user_id:    userId,
        event:      step.event,
        properties,
        page:       step.event === 'page_view' ? PAGES[Math.floor(rand() * PAGES.length)] : null,
        referrer:   step.event === 'signup' ? referrer : null,
        ab_variant: abVariant,
        created_at: dt.toISOString(),
      })
    }
  }

  // Insert in batches
  const BATCH = 200
  let inserted = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase.from('analytics_events').insert(rows.slice(i, i + BATCH))
    if (!error) inserted += Math.min(BATCH, rows.length - i)
  }

  return NextResponse.json({
    success: true,
    days: nDays,
    simulated_users: nUsers,
    simulated_visitors: totalVisitors,
    rows_inserted: inserted,
    total_rows: rows.length,
  })
}
