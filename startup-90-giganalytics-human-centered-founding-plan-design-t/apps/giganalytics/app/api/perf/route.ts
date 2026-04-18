/**
 * GET /api/perf
 *
 * Internal performance probe — measures round-trip latency to core routes
 * from within the same Vercel region.
 *
 * Returns: per-route TTFB, p95 target status, cache headers.
 * Use in Playwright tests to verify p95 TTFB < 200ms goal.
 */

import { NextRequest, NextResponse } from 'next/server'

const CORE_ROUTES = [
  { name: 'health', path: '/api/health', expectStatus: 200 },
  { name: 'product-status', path: '/api/product-status', expectStatus: 200 },
  { name: 'funnel-GET', path: '/api/funnel', expectStatus: 200 },
  { name: 'dashboard-summary', path: '/api/dashboard-summary', expectStatus: [200, 401] },
  { name: 'roi', path: '/api/roi', expectStatus: [200, 401] },
  { name: 'benchmark', path: '/api/benchmark', expectStatus: [200, 401] },
  { name: 'experiments', path: '/api/experiments?v=1&session_id=perf-probe', expectStatus: 200 },
]

const P95_TARGET_MS = 200
const TIMEOUT_MS = 5000

export async function GET(request: NextRequest) {
  const startTotal = Date.now()
  const baseUrl = new URL(request.url).origin

  const results = await Promise.all(
    CORE_ROUTES.map(async (route) => {
      const start = Date.now()
      try {
        const res = await fetch(`${baseUrl}${route.path}`, {
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: { 'x-perf-probe': '1' },
        })
        const elapsed = Date.now() - start
        const expectedStatuses = Array.isArray(route.expectStatus)
          ? route.expectStatus
          : [route.expectStatus]
        const statusOk = expectedStatuses.includes(res.status)

        return {
          route: route.name,
          path: route.path,
          status: res.status,
          ttfbMs: elapsed,
          p95Ok: elapsed <= P95_TARGET_MS,
          statusOk,
          cacheControl: res.headers.get('cache-control'),
          xResponseTime: res.headers.get('x-response-time'),
        }
      } catch (err) {
        return {
          route: route.name,
          path: route.path,
          status: 0,
          ttfbMs: Date.now() - start,
          p95Ok: false,
          statusOk: false,
          error: String(err),
        }
      }
    })
  )

  const totalMs = Date.now() - startTotal
  const slowRoutes = results.filter(r => !r.p95Ok)
  const allRoutesOk = slowRoutes.length === 0
  const p95Achieved = allRoutesOk ? 'pass' : 'warn'

  return NextResponse.json({
    p95TargetMs: P95_TARGET_MS,
    p95Status: p95Achieved,
    allRoutesUnder200ms: allRoutesOk,
    slowRoutes: slowRoutes.map(r => r.route),
    totalProbeMs: totalMs,
    routes: results,
  })
}
