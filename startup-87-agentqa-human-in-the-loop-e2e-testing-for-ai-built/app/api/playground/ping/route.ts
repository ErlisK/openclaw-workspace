import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/playground/ping — Deterministic ping endpoint for E2E sandbox testing
 *
 * Returns a stable JSON response with a timestamp so E2E tests can:
 * 1. Verify network_request + network_response events are captured in session_events
 * 2. Verify the response body is parseable
 * 3. Assert on the `status: "ok"` field deterministically
 */
export async function GET(req: NextRequest) {
  const source = req.nextUrl.searchParams.get('source') ?? 'unknown'
  return NextResponse.json({
    status: 'ok',
    service: 'agentqa-playground',
    source,
    ts: new Date().toISOString(),
    message: 'AgentQA test target ping — network event captured successfully',
  }, {
    headers: {
      'Cache-Control': 'no-store',
      'X-AgentQA-Test': 'true',
    },
  })
}

// Allow OPTIONS for CORS preflight (sandbox iframe context)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
