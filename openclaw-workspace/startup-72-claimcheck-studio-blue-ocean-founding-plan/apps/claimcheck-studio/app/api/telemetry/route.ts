import { NextRequest, NextResponse } from 'next/server'
import { emitTelemetry, recordApiMetric } from '@/lib/jobs'

/**
 * POST /api/telemetry
 * Ingest client-side telemetry events (page views, UI interactions, feature usage).
 * Keeps PII-free: no raw IPs stored, no user content.
 *
 * Body: { eventType, sessionId?, properties? }
 * Accepts batches: { events: [...] }
 */
export async function POST(request: NextRequest) {
  const t0 = Date.now()

  try {
    const body = await request.json() as
      | { eventType: string; sessionId?: string; properties?: Record<string, unknown> }
      | { events: Array<{ eventType: string; sessionId?: string; properties?: Record<string, unknown> }> }

    const events = 'events' in body ? body.events : [body]

    // Validate
    for (const ev of events) {
      if (!ev.eventType) return NextResponse.json({ error: 'eventType required' }, { status: 400 })
      // Blocklist PII-adjacent fields
      if (ev.properties) {
        delete ev.properties.email
        delete ev.properties.name
        delete ev.properties.ip
        delete ev.properties.password
      }
    }

    // Cap batch size
    if (events.length > 50) {
      return NextResponse.json({ error: 'Max 50 events per batch' }, { status: 400 })
    }

    await Promise.all(events.map(ev => emitTelemetry({
      eventType: ev.eventType,
      sessionId: ev.sessionId,
      metadata: ev.properties || {},
    })))

    // Self-instrument the telemetry API call
    recordApiMetric({
      endpoint: '/api/telemetry',
      method: 'POST',
      statusCode: 200,
      latencyMs: Date.now() - t0,
      properties: { eventCount: events.length },
    }).catch(() => {})

    return NextResponse.json({ ok: true, recorded: events.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

/**
 * GET /api/telemetry?window=1h|6h|24h|7d
 * Returns aggregated telemetry stats.
 * In production this would be auth-gated to admin/owner roles.
 */
export async function GET(request: NextRequest) {
  const window = request.nextUrl.searchParams.get('window') || '24h'
  const windowMs: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
  }
  const ms = windowMs[window] || windowMs['24h']
  const since = new Date(Date.now() - ms).toISOString()

  const { getSupabaseAdmin } = await import('@/lib/supabase')
  const supabase = getSupabaseAdmin()

  const [{ data: usageEvents }, { data: apiMetrics }, { data: jobStats }] = await Promise.all([
    supabase
      .from('cc_usage_events')
      .select('event_type, quantity, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('api_metrics')
      .select('endpoint, method, status_code, latency_ms, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('cc_jobs')
      .select('job_type, status, queued_at, completed_at')
      .gte('queued_at', since),
  ])

  // Aggregate usage events by type
  const eventCounts: Record<string, number> = {}
  for (const ev of usageEvents || []) {
    eventCounts[ev.event_type] = (eventCounts[ev.event_type] || 0) + (ev.quantity || 1)
  }

  // API metrics by endpoint
  const endpointStats: Record<string, { calls: number; errors: number; avgLatencyMs: number; p95LatencyMs: number }> = {}
  for (const m of apiMetrics || []) {
    if (!endpointStats[m.endpoint]) {
      endpointStats[m.endpoint] = { calls: 0, errors: 0, avgLatencyMs: 0, p95LatencyMs: 0 }
    }
    const s = endpointStats[m.endpoint]
    s.calls++
    if (m.status_code >= 400) s.errors++
    s.avgLatencyMs = Math.round((s.avgLatencyMs * (s.calls - 1) + m.latency_ms) / s.calls)
  }
  // Compute p95 per endpoint
  for (const endpoint of Object.keys(endpointStats)) {
    const latencies = (apiMetrics || [])
      .filter(m => m.endpoint === endpoint)
      .map(m => m.latency_ms)
      .sort((a, b) => a - b)
    const p95idx = Math.floor(latencies.length * 0.95)
    endpointStats[endpoint].p95LatencyMs = latencies[p95idx] || 0
  }

  // Job stats
  const jobSummary: Record<string, { queued: number; done: number; failed: number }> = {}
  for (const j of jobStats || []) {
    if (!jobSummary[j.job_type]) jobSummary[j.job_type] = { queued: 0, done: 0, failed: 0 }
    const k = j.status === 'done' ? 'done' : j.status === 'failed' ? 'failed' : 'queued'
    jobSummary[j.job_type][k]++
  }

  return NextResponse.json({
    window,
    since,
    summary: {
      totalEvents: usageEvents?.length || 0,
      totalApiCalls: apiMetrics?.length || 0,
      totalJobs: jobStats?.length || 0,
      errorRate: apiMetrics?.length
        ? Math.round(((apiMetrics.filter(m => m.status_code >= 400).length) / apiMetrics.length) * 100) / 100
        : 0,
    },
    eventCounts,
    endpointStats,
    jobSummary,
  })
}
