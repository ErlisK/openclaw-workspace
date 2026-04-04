import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { purgeExpiredWindows } from '@/lib/rate-limit'

/**
 * GET /api/admin/observability
 *
 * Returns observability data for the admin dashboard.
 * Query params:
 *   view = errors | metrics | rate-limits | summary (default: summary)
 *   hours = 1..168 (default: 24)
 *   limit = 1..500 (default: 100)
 *
 * Uses service role — no auth check (admin routes are unprotected by convention).
 */

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString()
}

export async function GET(req: NextRequest) {
  const p     = req.nextUrl.searchParams
  const view  = p.get('view') ?? 'summary'
  const hours = Math.min(168, Math.max(1, Number(p.get('hours') ?? 24)))
  const limit = Math.min(500, Math.max(1, Number(p.get('limit')  ?? 100)))
  const sb    = admin()
  const since = hoursAgo(hours)

  // ── summary ────────────────────────────────────────────────────────────────
  if (view === 'summary') {
    const [errCount, metCount, rl429, recentErrors, topRoutes, topErrors] = await Promise.all([
      // Total errors
      sb.from('error_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', since),

      // Total API calls tracked
      sb.from('api_metrics')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', since),

      // Rate limit hits (429)
      sb.from('api_metrics')
        .select('*', { count: 'exact', head: true })
        .eq('status_code', 429)
        .gte('created_at', since),

      // Recent 10 errors
      sb.from('error_logs')
        .select('id, severity, error_type, error_message, route, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(10),

      // Top erroring routes
      sb.from('api_metrics')
        .select('endpoint, status_code')
        .gte('status_code', 400)
        .gte('created_at', since)
        .limit(200),

      // Top error messages
      sb.from('error_logs')
        .select('error_message, route, severity')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(200),
    ])

    // Aggregate top routes
    const routeCounts: Record<string, number> = {}
    for (const r of (topRoutes.data ?? [])) {
      const k = `${r.endpoint} (${r.status_code})`
      routeCounts[k] = (routeCounts[k] ?? 0) + 1
    }
    const topRoutesSorted = Object.entries(routeCounts)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([route, count]) => ({ route, count }))

    // Aggregate top error messages
    const errMsgCounts: Record<string, { count: number; route: string; severity: string }> = {}
    for (const e of (topErrors.data ?? [])) {
      const k = (e.error_message ?? '').slice(0, 100)
      if (!errMsgCounts[k]) errMsgCounts[k] = { count: 0, route: e.route ?? '', severity: e.severity ?? 'error' }
      errMsgCounts[k].count++
    }
    const topErrorsSorted = Object.entries(errMsgCounts)
      .sort((a, b) => b[1].count - a[1].count).slice(0, 10)
      .map(([message, d]) => ({ message, ...d }))

    return NextResponse.json({
      period:       { hours, since },
      totals: {
        errors:        errCount.count ?? 0,
        metricsLogged: metCount.count ?? 0,
        rateLimitHits: rl429.count ?? 0,
      },
      recentErrors:  recentErrors.data ?? [],
      topRoutes:     topRoutesSorted,
      topErrors:     topErrorsSorted,
    })
  }

  // ── errors ─────────────────────────────────────────────────────────────────
  if (view === 'errors') {
    const severity = p.get('severity')  // filter by severity
    let q = sb.from('error_logs')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (severity) q = q.eq('severity', severity)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ errors: data, hours, count: data?.length ?? 0 })
  }

  // ── metrics ────────────────────────────────────────────────────────────────
  if (view === 'metrics') {
    const endpoint = p.get('endpoint')
    let q = sb.from('api_metrics')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (endpoint) q = q.eq('endpoint', endpoint)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Compute p50/p95 per endpoint
    const grouped: Record<string, number[]> = {}
    for (const m of (data ?? [])) {
      if (!grouped[m.endpoint]) grouped[m.endpoint] = []
      grouped[m.endpoint].push(m.latency_ms)
    }
    const stats = Object.entries(grouped).map(([ep, latencies]) => {
      latencies.sort((a, b) => a - b)
      const p50 = latencies[Math.floor(latencies.length * 0.50)] ?? 0
      const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0
      const p99 = latencies[Math.floor(latencies.length * 0.99)] ?? 0
      return { endpoint: ep, count: latencies.length, p50, p95, p99, avg: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) }
    }).sort((a, b) => b.count - a.count)

    return NextResponse.json({ metrics: data, stats, hours })
  }

  // ── rate-limits ────────────────────────────────────────────────────────────
  if (view === 'rate-limits') {
    const [rl429, windows] = await Promise.all([
      sb.from('api_metrics')
        .select('endpoint, ip_hash, created_at')
        .eq('status_code', 429)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(limit),
      sb.from('rate_limit_windows')
        .select('key, window_key, count')
        .order('count', { ascending: false })
        .limit(50),
    ])

    // Purge expired windows (maintenance)
    const purged = await purgeExpiredWindows()

    return NextResponse.json({
      rateLimitHits:    rl429.data ?? [],
      activeWindows:    windows.data ?? [],
      purgedOldWindows: purged,
    })
  }

  return NextResponse.json({ error: 'unknown view' }, { status: 400 })
}

/** DELETE /api/admin/observability?action=purge — manual maintenance */
export async function DELETE(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action')
  if (action === 'purge') {
    const purged = await purgeExpiredWindows()
    const sb     = admin()
    // Also purge error_logs older than 30 days
    const { count: logsDeleted } = await sb.from('error_logs')
      .delete({ count: 'exact' as const })
      .lt('created_at', new Date(Date.now() - 30 * 86_400_000).toISOString())
    // Purge api_metrics older than 7 days
    const { count: metricsDeleted } = await sb.from('api_metrics')
      .delete({ count: 'exact' as const })
      .lt('created_at', new Date(Date.now() - 7 * 86_400_000).toISOString())
    return NextResponse.json({ purged, logsDeleted, metricsDeleted })
  }
  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
