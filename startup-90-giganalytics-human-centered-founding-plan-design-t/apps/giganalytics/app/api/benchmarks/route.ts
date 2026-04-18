import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/benchmarks (legacy route — redirects to /api/benchmark)
 *
 * The canonical benchmark endpoint is /api/benchmark (singular).
 * This route is kept for backward compatibility but redirects to the live endpoint.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const newPath = url.pathname.replace('/api/benchmarks', '/api/benchmark')
  const redirectUrl = `${url.origin}${newPath}${url.search}`
  return NextResponse.redirect(redirectUrl, { status: 308 })
}
