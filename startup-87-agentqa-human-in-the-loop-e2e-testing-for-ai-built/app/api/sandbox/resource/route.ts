/**
 * GET /api/sandbox/resource?u=<url>&session=<sessionId>
 * Proxy for static resources (CSS, JS, images) within sandboxed sessions.
 * Applies the same URL validation as the html endpoint.
 * Requires authentication.
 */
import { NextRequest, NextResponse } from 'next/server'
import { validateProxyUrl, checkRateLimit } from '@/lib/proxy-security'
import { getSupabaseClient } from '@/lib/supabase/get-client'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB for resources

export async function GET(req: NextRequest) {
  // Auth check — close the unauthenticated open proxy
  const supabase = await getSupabaseClient(req)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // Rate limit (per-user + per-IP)
  const rateCheck = checkRateLimit(req, user.id)
  if (!rateCheck.allowed) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': '0' },
    })
  }

  const { searchParams } = new URL(req.url)
  const targetUrl = searchParams.get('u')

  // Only GET is allowed
  const urlCheck = await validateProxyUrl(targetUrl)
  if (!urlCheck.ok) {
    return new NextResponse('Bad request', { status: urlCheck.status })
  }

  // Fetch with manual redirect to prevent SSRF TOCTOU
  let res: Response
  let currentUrl = urlCheck.url
  let redirectsRemaining = 5

  while (true) {
    try {
      res = await fetch(currentUrl.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'AgentQA-Sandbox/1.0 (testing-platform)',
          Accept: '*/*',
        },
        redirect: 'manual',
      })
    } catch {
      return new NextResponse('Upstream fetch failed', { status: 502 })
    }

    if (res.status >= 300 && res.status < 400) {
      if (redirectsRemaining <= 0) {
        return new NextResponse('Too many redirects', { status: 502 })
      }
      const location = res.headers.get('location')
      if (!location) break

      // Re-validate redirect target (SSRF check)
      let redirectUrl: URL
      try {
        redirectUrl = new URL(location, currentUrl.toString())
      } catch {
        return new NextResponse('Invalid redirect', { status: 502 })
      }
      const redirectCheck = await validateProxyUrl(redirectUrl.toString())
      if (!redirectCheck.ok) {
        return new NextResponse('Redirect blocked', { status: 403 })
      }
      currentUrl = redirectCheck.url
      redirectsRemaining--
      continue
    }
    break
  }

  const contentType = res.headers.get('content-type') ?? 'application/octet-stream'
  const body = await res.arrayBuffer()

  if (body.byteLength > MAX_SIZE) {
    return new NextResponse('Resource too large', { status: 413 })
  }

  return new NextResponse(body, {
    status: res.status,
    headers: {
      'content-type': contentType,
      'cache-control': 'public, max-age=600',
      'x-frame-options': 'SAMEORIGIN',
    },
  })
}
