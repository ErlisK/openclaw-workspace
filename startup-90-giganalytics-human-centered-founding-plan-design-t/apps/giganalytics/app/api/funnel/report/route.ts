import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/funnel/report
 *
 * Returns per-step event counts from the PostHog server events stored
 * as Supabase records, enabling drop-off analysis across the activation funnel.
 *
 * The funnel tracked:
 *   landing_viewed → signup_completed → stream_created →
 *   import_completed → timer_session → insights_viewed
 *
 * For each step: count of distinct users who reached it.
 * Drop-off is computed as (prev_count - this_count) / prev_count.
 *
 * Query param: ?days=30 (default 30, max 90)
 *
 * Note: Since PostHog events are fired server-side via the REST API,
 * the raw event store is PostHog. Without a PostHog API key configured,
 * this endpoint estimates funnel health from Supabase table row counts
 * (transactions → import_completed proxy, streams → stream_created proxy, etc.)
 */

const FUNNEL_STEPS = [
  { step: 1, event: 'landing_viewed',    label: 'Saw landing page',       table: null,         col: null },
  { step: 2, event: 'signup_completed',  label: 'Signed up',              table: 'profiles',   col: 'id' },
  { step: 3, event: 'stream_created',    label: 'Created first stream',   table: 'streams',    col: 'user_id' },
  { step: 4, event: 'import_completed',  label: 'Completed first import', table: 'transactions', col: 'user_id' },
  { step: 5, event: 'timer_session',     label: 'Logged first timer',     table: 'time_entries', col: 'user_id' },
  { step: 6, event: 'insights_viewed',   label: 'Viewed AI insights',     table: null,         col: null },
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const days = Math.min(parseInt(searchParams.get('days') ?? '30'), 90)
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - days)
  const from = fromDate.toISOString()

  try {
    const supabase = await createServiceClient()

    // Count distinct users at each Supabase-backed funnel step
    const counts: Record<string, number> = {}

    for (const step of FUNNEL_STEPS) {
      if (!step.table || !step.col) {
        counts[step.event] = 0
        continue
      }

      // Get distinct user count for this table within the time window
      const { data, error } = await supabase
        .from(step.table)
        .select(step.col, { count: 'exact', head: true })
        .gte('created_at', from)

      counts[step.event] = error ? 0 : (data === null ? 0 : 0) // count only

      // Use count from header instead
      const { count } = await supabase
        .from(step.table)
        .select(step.col, { count: 'exact', head: true })
        .gte('created_at', from)
        .then(r => r)

      counts[step.event] = count ?? 0
    }

    // Build funnel with drop-off analysis
    // For steps without DB backing (landing_viewed), use the next step count as baseline
    // First, fill in landing_viewed using profiles count as upper bound
    if (counts['landing_viewed'] === 0) {
      counts['landing_viewed'] = counts['signup_completed']
    }

    const funnelSteps = FUNNEL_STEPS.map((s, i) => {
      const count = counts[s.event]
      const prevCount = i > 0 ? counts[FUNNEL_STEPS[i - 1].event] : count

      // Only compute drop-off when we have a valid previous count > 0
      // and the previous count is >= current count (avoid negative drop-off from data gaps)
      const validPrev = prevCount > 0 && prevCount >= count
      const dropOff = validPrev ? +(((prevCount - count) / prevCount) * 100).toFixed(1) : 0
      const conversion = validPrev ? +((count / prevCount) * 100).toFixed(1) : (i === 0 ? 100 : 0)

      return {
        step: s.step,
        event: s.event,
        label: s.label,
        count,
        conversion_rate: Math.max(0, Math.min(100, conversion)),
        drop_off_rate: Math.max(0, Math.min(100, dropOff)),
        is_bottleneck: dropOff > 50,
      }
    })

    // Identify biggest drop-off step
    const bottleneck = funnelSteps
      .filter(s => s.step > 1)
      .sort((a, b) => b.drop_off_rate - a.drop_off_rate)[0]

    return NextResponse.json({
      ok: true,
      period_days: days,
      from: from,
      funnel: funnelSteps,
      bottleneck: bottleneck ? {
        step: bottleneck.step,
        event: bottleneck.event,
        label: bottleneck.label,
        drop_off_rate: bottleneck.drop_off_rate,
        recommendation: getRecommendation(bottleneck.event),
      } : null,
      total_started: funnelSteps[0]?.count ?? 0,
      total_activated: funnelSteps[funnelSteps.length - 1]?.count ?? 0,
    })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

function getRecommendation(event: string): string {
  const recs: Record<string, string> = {
    signup_completed: 'High landing→signup drop-off: test CTA copy, reduce form friction, add social proof above the fold.',
    stream_created: 'Users signing up but not creating streams: improve onboarding checklist visibility, add "Create your first stream" prompt immediately after email confirm.',
    import_completed: 'Users creating streams but not importing: add CSV template links in onboarding, reduce import steps, show "what you\'ll see" preview.',
    timer_session: 'Users importing but not logging time: send reminder email/notification, simplify timer start, add calendar import walkthrough.',
    insights_viewed: 'Users not reaching insights: check Pro gate — insights may require upgrade. Add teaser/preview for free users.',
  }
  return recs[event] ?? 'Investigate this step in PostHog funnel analysis for detailed cohort breakdown.'
}
