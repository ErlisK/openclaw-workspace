/**
 * GET /api/admin/funnel
 * Platform-wide funnel metrics from analytics_events.
 * No dependency on real user activity — synthetic seed data is sufficient.
 *
 * Admin-only (requires Authorization: Bearer <ADMIN_SECRET>).
 *
 * Query params:
 *   days     number  (default 30, look-back window)
 *   cohort   string  (optional — filter by user_cohort property)
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const FUNNEL_STEPS = [
  'page_view',
  'signup',
  'onboarding_viewed',
  'import_started',
  'import_complete',
  'engine_run',
  'suggestion_created',
  'experiment_created',
  'experiment_viewed',
  'converted_variant',
]

export async function GET(request: Request) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const days   = Math.min(Number(searchParams.get('days') ?? 30), 365)
  const cutoff = new Date(Date.now() - days * 86400000).toISOString()

  const supabase = getAdmin()

  // ── 1. Funnel counts (unique users per step) ──────────────────────────
  const { data: rawEvents } = await supabase
    .from('analytics_events')
    .select('event, user_id, created_at, properties, referrer, ab_variant')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(50000)

  const events = rawEvents ?? []

  // Count unique users/visitors per event
  const byEvent: Record<string, Set<string>> = {}
  for (const e of events) {
    if (!byEvent[e.event]) byEvent[e.event] = new Set()
    // Use user_id if available; fall back to properties.visitor_id for synthetic/anon events
    const key = e.user_id
      ?? (e.properties?.visitor_id as string)
      ?? `anon-${(e.properties as Record<string, unknown>)?.visitor_id ?? Math.random()}`
    byEvent[e.event].add(key)
  }

  const funnelSteps = FUNNEL_STEPS.map((step, i) => {
    const count = byEvent[step]?.size ?? 0
    const prevCount = i > 0 ? (byEvent[FUNNEL_STEPS[i - 1]]?.size ?? 0) : count
    const dropoff = prevCount > 0 ? Math.round((1 - count / prevCount) * 100) : 0
    return { step, count, dropoff_pct: dropoff }
  })

  // ── 2. Events per day (activity trend) ────────────────────────────────
  const dayBuckets: Record<string, number> = {}
  const nDaysToShow = Math.min(days, 30)
  for (let d = nDaysToShow - 1; d >= 0; d--) {
    const dt = new Date(Date.now() - d * 86400000)
    dayBuckets[dt.toISOString().slice(0, 10)] = 0
  }
  for (const e of events) {
    const day = e.created_at?.slice(0, 10)
    if (day && day in dayBuckets) dayBuckets[day]++
  }

  // ── 3. Referrer breakdown (signup events only) ────────────────────────
  const referrerCounts: Record<string, number> = {}
  for (const e of events) {
    if (e.event !== 'signup') continue
    let ref = 'direct'
    if (e.referrer) {
      try { ref = new URL(e.referrer).hostname.replace('www.', '') }
      catch { ref = e.referrer }
    }
    referrerCounts[ref] = (referrerCounts[ref] ?? 0) + 1
  }
  const topReferrers = Object.entries(referrerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([source, count]) => ({ source, count }))

  // ── 4. A/B variant conversion rates ──────────────────────────────────
  const variantViews: Record<string, number> = {}
  const variantConversions: Record<string, number> = {}
  for (const e of events) {
    if (!e.ab_variant) continue
    if (e.event === 'experiment_viewed') {
      variantViews[e.ab_variant] = (variantViews[e.ab_variant] ?? 0) + 1
    }
    if (e.event === 'converted_variant') {
      variantConversions[e.ab_variant] = (variantConversions[e.ab_variant] ?? 0) + 1
    }
  }
  const variantPerf = Object.keys({ ...variantViews, ...variantConversions }).map(v => ({
    variant: v,
    views: variantViews[v] ?? 0,
    conversions: variantConversions[v] ?? 0,
    cvr: variantViews[v] > 0 ? Math.round((variantConversions[v] ?? 0) / variantViews[v] * 1000) / 10 : 0,
  }))

  // ── 5. Weekly cohort retention (signups per week) ─────────────────────
  const weeklySignups: Record<string, number> = {}
  for (const e of events) {
    if (e.event !== 'signup') continue
    const dt = new Date(e.created_at)
    const weekStart = new Date(dt.setDate(dt.getDate() - dt.getDay()))
    const wk = weekStart.toISOString().slice(0, 10)
    weeklySignups[wk] = (weeklySignups[wk] ?? 0) + 1
  }

  // ── 6. Key metrics summary ────────────────────────────────────────────
  const totalPageViews   = byEvent['page_view']?.size ?? 0
  const totalSignups     = byEvent['signup']?.size ?? 0
  const totalEngineRuns  = byEvent['engine_run']?.size ?? 0
  const totalExperiments = byEvent['experiment_created']?.size ?? 0
  const totalConversions = byEvent['converted_variant']?.size ?? 0
  const signupRate       = totalPageViews > 0 ? Math.round(totalSignups / totalPageViews * 1000) / 10 : 0
  const activationRate   = totalSignups > 0 ? Math.round(totalEngineRuns / totalSignups * 1000) / 10 : 0
  const experimentRate   = totalEngineRuns > 0 ? Math.round(totalExperiments / totalEngineRuns * 1000) / 10 : 0

  return NextResponse.json({
    period_days: days,
    generated_at: new Date().toISOString(),
    summary: {
      total_page_views: totalPageViews,
      total_signups: totalSignups,
      total_engine_runs: totalEngineRuns,
      total_experiments: totalExperiments,
      total_conversions: totalConversions,
      signup_rate_pct: signupRate,
      activation_rate_pct: activationRate,
      experiment_rate_pct: experimentRate,
    },
    funnel: funnelSteps,
    daily_activity: Object.entries(dayBuckets).map(([date, count]) => ({ date, count })),
    top_referrers: topReferrers,
    variant_performance: variantPerf,
    weekly_signups: Object.entries(weeklySignups).sort().map(([week, count]) => ({ week, count })),
  })
}
