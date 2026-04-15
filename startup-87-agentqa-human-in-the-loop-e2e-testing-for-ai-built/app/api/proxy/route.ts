import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/get-client'
import { buildLoggerScript } from './logger/route'
import { validateProxyUrl, checkRateLimit } from '@/lib/proxy-security'

/**
 * GET /api/proxy?url=<target>&session=<sessionId>
 *
 * Fetches the target URL's HTML, rewrites relative links and form actions
 * to route through this proxy, then injects a small JS snippet that:
 *   - Patches window.fetch and XMLHttpRequest to capture network events
 *   - Patches console.log/warn/error to capture console events
 *   - Posts batched events to /api/sessions/<sessionId>/events
 *
 * Only GET requests are proxied (read-only, safe).
 * Auth: any authenticated user (session owner or job client).
 */

const MAX_RESPONSE_SIZE = 5 * 1024 * 1024 // 5 MB

// Headers to strip from upstream response (hop-by-hop + security headers that break embedding)
const STRIP_RESPONSE_HEADERS = new Set([
  'content-security-policy',
  'content-security-policy-report-only',
  'x-frame-options',
  'transfer-encoding',
  'connection',
  'keep-alive',
  'upgrade',
  'set-cookie',         // don't propagate upstream cookies
  'strict-transport-security',
  'public-key-pins',
])

// Headers to strip when forwarding to upstream
const STRIP_REQUEST_HEADERS = new Set([
  'host', 'connection', 'authorization', 'cookie',
  'x-forwarded-for', 'x-real-ip',
])

function rewriteUrls(html: string, targetBase: string, proxyBase: string, sessionId: string): string {
  const base = new URL(targetBase)

  // Resolve a possibly-relative URL to absolute
  function toAbsolute(href: string): string {
    if (!href || href.startsWith('data:') || href.startsWith('javascript:') || href.startsWith('#')) return href
    try { return new URL(href, base).toString() }
    catch { return href }
  }

  // Route a URL through our proxy
  function toProxied(href: string): string {
    const abs = toAbsolute(href)
    if (!abs || abs.startsWith('data:') || abs.startsWith('javascript:') || abs.startsWith('#')) return abs
    return `${proxyBase}?url=${encodeURIComponent(abs)}&session=${sessionId}`
  }

  return html
    // href="..." on <a> and <link>
    .replace(/(<(?:a|link|area)\s[^>]*\s*href\s*=\s*)("([^"]*)"|'([^']*)')/gi, (match, prefix, quoted, dq, sq) => {
      const href = dq ?? sq
      return `${prefix}"${toProxied(href)}"`
    })
    // src="..." on script, img, iframe, embed, source
    .replace(/(<(?:script|img|iframe|embed|source|input|audio|video)\s[^>]*\s*src\s*=\s*)("([^"]*)"|'([^']*)')/gi, (match, prefix, quoted, dq, sq) => {
      const src = dq ?? sq
      return `${prefix}"${toProxied(src)}"`
    })
    // action="..." on <form>
    .replace(/(<form\s[^>]*\s*action\s*=\s*)("([^"]*)"|'([^']*)')/gi, (match, prefix, quoted, dq, sq) => {
      const action = dq ?? sq
      return `${prefix}"${toProxied(action)}"`
    })
    // srcset="..." (responsive images)
    .replace(/\bsrcset\s*=\s*"([^"]*)"/gi, (match, srcset) => {
      const rewritten = srcset.replace(/([^\s,]+)(\s+[^,]*)?/g, (m: string, src: string, descriptor: string = '') => {
        return `${toProxied(src)}${descriptor}`
      })
      return `srcset="${rewritten}"`
    })
    // <base href="..."> — remove it (we handle base resolution ourselves)
    .replace(/<base\s[^>]*>/gi, '')
}

function buildInjectedScript(sessionId: string, appUrl: string, reportUrl: string): string {
  // Delegate to the shared logger builder (same script, wrapped in <script> tags)
  return `<script id="betawindow-logger">\n${buildLoggerScript(sessionId, appUrl, reportUrl)}\n</script>`
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const targetUrl = searchParams.get('url')
  const sessionId = searchParams.get('session') ?? ''

  // URL validation + SSRF protection (async DNS check) — must run before auth
  // so private IP blocking returns 403 regardless of auth state
  const urlCheck = await validateProxyUrl(targetUrl)
  if (!urlCheck.ok) {
    return new NextResponse(urlCheck.reason, { status: urlCheck.status })
  }

  // Auth check — only authenticated users can use the proxy
  const supabase = await getSupabaseClient(req)
  const { data: { user: earlyUser } } = await supabase.auth.getUser()
  if (!earlyUser) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // Rate limit check (before any expensive work)
  const rateCheck = checkRateLimit(req, earlyUser.id)
  if (!rateCheck.allowed) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': '0' },
    })
  }
  const parsedTarget = urlCheck.url

  // Fetch the target URL
  const forwardHeaders: Record<string, string> = {
    'User-Agent': 'BetaWindow-Proxy/1.0 (testing-platform)',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  }

  // Forward some safe headers from the original request
  for (const [k, v] of req.headers.entries()) {
    if (!STRIP_REQUEST_HEADERS.has(k.toLowerCase())) {
      forwardHeaders[k] = v
    }
  }

  let upstreamRes: Response
  let currentTarget = parsedTarget
  let redirectsRemaining = 5

  while (true) {
    try {
      upstreamRes = await fetch(currentTarget.toString(), {
        method: 'GET',
        headers: forwardHeaders,
        redirect: 'manual',
      })
    } catch {
      return new NextResponse('Upstream fetch failed', { status: 502 })
    }

    if (upstreamRes.status >= 300 && upstreamRes.status < 400) {
      if (redirectsRemaining <= 0) {
        return new NextResponse('Too many redirects', { status: 502 })
      }
      const location = upstreamRes.headers.get('location')
      if (!location) break
      let redirectUrl: URL
      try { redirectUrl = new URL(location, currentTarget.toString()) } catch {
        return new NextResponse('Invalid redirect', { status: 502 })
      }
      const redirectCheck = await validateProxyUrl(redirectUrl.toString())
      if (!redirectCheck.ok) {
        return new NextResponse('Redirect blocked', { status: 403 })
      }
      currentTarget = redirectCheck.url
      redirectsRemaining--
      continue
    }
    break
  }

  const contentType = upstreamRes.headers.get('content-type') ?? 'text/plain'

  // For non-HTML resources (CSS, JS, images), proxy them directly
  if (!contentType.includes('text/html')) {
    const body = await upstreamRes.arrayBuffer()
    if (body.byteLength > MAX_RESPONSE_SIZE) {
      return new NextResponse('Response too large', { status: 413 })
    }

    const respHeaders = new Headers()
    respHeaders.set('content-type', contentType)
    respHeaders.set('cache-control', 'public, max-age=300')
    // Allow embedding
    respHeaders.set('x-frame-options', 'SAMEORIGIN')
    respHeaders.set('content-security-policy', "default-src 'self'")

    return new NextResponse(body, {
      status: upstreamRes.status,
      headers: respHeaders,
    })
  }

  // HTML: rewrite + inject
  const rawHtml = await upstreamRes.text()

  if (rawHtml.length > MAX_RESPONSE_SIZE) {
    return new NextResponse('Response too large', { status: 413 })
  }

  // Build proxy base URL (same origin as this request)
  const reqUrl = new URL(req.url)
  const proxyBase = `${reqUrl.origin}/api/proxy`

  // Events API endpoint (absolute, so the injected script can reach it)
  const eventsUrl = sessionId
    ? `${reqUrl.origin}/api/sessions/${sessionId}/events`
    : `${reqUrl.origin}/api/proxy/sink` // no-op sink if no session

  // Rewrite URLs
  const rewrittenHtml = rewriteUrls(rawHtml, parsedTarget.toString(), proxyBase, sessionId)

  // Inject logger snippet before </head> or at start of <body>
  const snippet = buildInjectedScript(sessionId, parsedTarget.toString(), eventsUrl)
  let finalHtml: string

  if (rewrittenHtml.includes('</head>')) {
    finalHtml = rewrittenHtml.replace('</head>', `${snippet}</head>`)
  } else if (rewrittenHtml.includes('<body')) {
    finalHtml = rewrittenHtml.replace('<body', `${snippet}<body`)
  } else {
    finalHtml = snippet + rewrittenHtml
  }

  const responseHeaders = new Headers()
  responseHeaders.set('content-type', 'text/html; charset=utf-8')
  responseHeaders.set('cache-control', 'no-store')
  // Allow this to be embedded in our own iframe
  responseHeaders.set('x-frame-options', 'SAMEORIGIN')
  // Permissive CSP so the target page's own scripts run
  responseHeaders.set(
    'content-security-policy',
    `default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; frame-ancestors 'self'`
  )

  return new NextResponse(finalHtml, {
    status: 200,
    headers: responseHeaders,
  })
}
