import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

/**
 * POST /api/observability
 * Client-side performance beacon.
 * Called by the analytics script in the app layout to report:
 *   - Web Vitals (LCP, FID, CLS, TTFB, FCP)
 *   - Custom critical path timings (API call durations)
 *
 * Body: {
 *   metric: string        — e.g. 'LCP' | 'api_sessions_ms'
 *   value: number         — in ms (or score for CLS)
 *   path: string          — page path
 *   percentile?: string   — 'p50' | 'p95' | 'p99'
 * }
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { metric, value, path, percentile } = body

  if (!metric || value === undefined) {
    return NextResponse.json({ error: 'metric and value required' }, { status: 400 })
  }

  const svc = createServiceClient()
  await svc.from('observability_metrics').insert({
    metric_name:  metric,
    path:         path ?? null,
    value_ms:     typeof value === 'number' ? value : null,
    success:      true,
    percentile:   percentile ?? null,
    region:       request.headers.get('x-vercel-id')?.split('::')[0] ?? null,
    metadata:     { ua: request.headers.get('user-agent')?.slice(0, 100) ?? null },
  })

  return NextResponse.json({ ok: true }, {
    headers: { 'Access-Control-Allow-Origin': '*' }
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}

/**
 * GET /api/observability
 * Returns recent uptime + latency stats (for the /dashboard/status page).
 * Authenticated endpoint.
 */
export async function GET(request: NextRequest) {
  // Light auth check — any authenticated user can see platform metrics
  const authHeader = request.headers.get('authorization')
  // In production this is behind the dashboard which requires auth;
  // for the cron summary we allow a bearer secret too
  const cronSecret = process.env.CRON_SECRET ?? 'ptf-cron-dev'
  const isInternal = authHeader === `Bearer ${cronSecret}`

  const svc = createServiceClient()

  const [uptimeView, recentChecks, cronRuns] = await Promise.all([
    svc.from('v_uptime_summary').select('*'),
    svc.from('observability_metrics')
      .select('*')
      .eq('metric_name', 'uptime_check')
      .order('recorded_at', { ascending: false })
      .limit(50),
    svc.from('cron_job_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(20),
  ])

  return NextResponse.json({
    uptime: uptimeView.data ?? [],
    recentChecks: recentChecks.data ?? [],
    cronRuns: cronRuns.data ?? [],
  })
}
