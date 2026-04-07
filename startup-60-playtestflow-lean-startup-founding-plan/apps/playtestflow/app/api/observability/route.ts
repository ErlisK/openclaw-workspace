import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/admin'

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
  // Admin-only: require either a valid CRON_SECRET bearer or an admin user session
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET ?? 'ptf-cron-dev'
  const isInternal = authHeader === `Bearer ${cronSecret}`

  if (!isInternal) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdmin(user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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
