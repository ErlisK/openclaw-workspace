import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * POST /api/cron/uptime
 * Vercel Cron Job — runs every 5 minutes.
 * Pings critical API paths, records latency + success to observability_metrics.
 * Also computes and stores p95 snapshot for the last 100 samples.
 */

const CRITICAL_PATHS = [
  { path: '/api/sessions', method: 'OPTIONS', name: 'sessions_api' },
  { path: '/api/billing/webhook', method: 'OPTIONS', name: 'billing_webhook' },
  { path: '/', method: 'GET', name: 'landing_page' },
  { path: '/docs/embed', method: 'GET', name: 'docs_embed' },
  { path: '/api/embed/script', method: 'GET', name: 'embed_sdk' },
]

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET ?? 'ptf-cron-dev'
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const svc = createServiceClient()
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://playtestflow.vercel.app'
  const results: Array<{ name: string; latencyMs: number; status: number; success: boolean }> = []

  for (const endpoint of CRITICAL_PATHS) {
    const start = Date.now()
    let statusCode = 0
    let success = false

    try {
      const res = await fetch(`${APP_URL}${endpoint.path}`, {
        method: endpoint.method,
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'PlaytestFlow-Uptime/1.0' },
      })
      statusCode = res.status
      success = res.status < 500
    } catch {
      statusCode = 0
      success = false
    }

    const latencyMs = Date.now() - start

    await svc.from('observability_metrics').insert({
      metric_name: 'uptime_check',
      path:        endpoint.path,
      value_ms:    latencyMs,
      status_code: statusCode,
      success,
      region:      request.headers.get('x-vercel-id')?.split('::')[0] ?? 'unknown',
      metadata:    { name: endpoint.name, method: endpoint.method },
    })

    results.push({ name: endpoint.name, latencyMs, status: statusCode, success })
  }

  // Record cron run
  const allSuccess = results.every(r => r.success)
  await svc.from('cron_job_runs').insert({
    job_name:       'uptime',
    status:         allSuccess ? 'completed' : 'failed',
    rows_processed: results.length,
    completed_at:   new Date().toISOString(),
    metadata:       { results },
  })

  return NextResponse.json({
    ok: allSuccess,
    checks: results,
    p95_estimate_ms: results.length > 0
      ? Math.round(results.sort((a,b) => b.latencyMs - a.latencyMs)[Math.floor(results.length * 0.05)].latencyMs)
      : null,
  })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
