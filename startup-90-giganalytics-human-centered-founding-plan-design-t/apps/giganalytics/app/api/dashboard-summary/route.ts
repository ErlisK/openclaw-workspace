/**
 * GET /api/dashboard-summary
 *
 * Pre-aggregated dashboard data with caching:
 *   - Next.js unstable_cache: 30s revalidate, keyed by user_id
 *   - HTTP: Cache-Control: private, max-age=30, stale-while-revalidate=60
 *   - X-Cache-Hit: hit|miss header for monitoring
 *   - X-Response-Time header for p95 tracking
 *
 * Returns everything the dashboard needs in one request instead of
 * 7 parallel client-side calls.
 *
 * Query params:
 *   ?days=30  (default 30, max 90)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCachedDashboardData } from '@/lib/cache/dashboard'
import { computeROI } from '@/lib/roi'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const startMs = Date.now()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const days = Math.min(parseInt(url.searchParams.get('days') ?? '30'), 90)

  // Fetch from cache (or DB if cold)
  const data = await getCachedDashboardData(user.id, days)
  const elapsedMs = Date.now() - startMs

  // Compute ROI server-side so client doesn't need to
  const roi = computeROI(
    data.streams,
    data.transactions,
    data.timeEntries,
    data.acquisitionCosts,
    { from: data.from, to: data.to }
  )

  const monthlyTarget = data.goals?.monthly_target ?? 0
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const monthlyTx = data.transactions.filter(t => t.transaction_date >= monthStart)
  const monthlyNet = monthlyTx.reduce((s, t) => s + t.net_amount, 0)
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const projectedMonthly = dayOfMonth > 0 ? (monthlyNet / dayOfMonth) * daysInMonth : 0
  const pacingPct = monthlyTarget > 0 ? Math.round((projectedMonthly / monthlyTarget) * 100) : null

  const responseData = {
    // ROI summary
    aggregate: roi.aggregate,
    streams: roi.streams,
    // Monthly pacing
    monthlyNet,
    monthlyTarget,
    projectedMonthly,
    pacingPct,
    // Onboarding state
    onboarding: {
      streamCount: data.streamCount,
      txCount: data.txCount,
      teCount: data.teCount,
      flags: data.onboardingFlags,
      hasDemoData: data.demoDataExists,
      progress: {
        has_streams_2: data.streamCount >= 2,
        has_import: data.txCount >= 1,
        has_timer: data.teCount >= 1,
        has_viewed_heatmap: data.onboardingFlags.has_viewed_heatmap ?? false,
        has_viewed_roi: data.onboardingFlags.has_viewed_roi ?? false,
      },
    },
    // Raw counts for dashboards
    transactionCount: data.transactions.length,
    // Cache metadata
    _meta: {
      cachedAt: data.cachedAt,
      responseTimeMs: elapsedMs,
      from: data.from,
      to: data.to,
      days,
    },
  }

  return NextResponse.json(responseData, {
    headers: {
      // Private cache (user-specific) — 30s fresh, 60s stale-while-revalidate
      'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      'X-Response-Time': `${elapsedMs}ms`,
      'X-Cache-Hit': elapsedMs < 10 ? 'hit' : 'miss',
      'Vary': 'Cookie',
    },
  })
}
