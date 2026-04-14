import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/get-client'

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
  return `
<script id="agentqa-logger">
(function() {
  var SESSION_ID = ${JSON.stringify(sessionId)};
  var APP_URL = ${JSON.stringify(appUrl)};
  var REPORT_URL = ${JSON.stringify(reportUrl)};
  var buf = [];
  var flushTimer = null;

  function now() { return new Date().toISOString(); }

  function queue(ev) {
    buf.push(ev);
    if (buf.length >= 20) flush();
    else if (!flushTimer) flushTimer = setTimeout(flush, 1200);
  }

  function flush() {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    if (buf.length === 0) return;
    var events = buf.splice(0);
    // Post to parent window first (for RunLogger), then directly to API
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'agentqa_event_batch', events: events }, '*');
      }
    } catch(e) {}
    // Also send directly to API (works cross-origin because we're inside the proxy)
    try {
      fetch(REPORT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(events),
        credentials: 'include',
      }).catch(function(){});
    } catch(e) {}
  }

  // ─── Console patching ───────────────────────────────────────
  ['log','info','warn','error'].forEach(function(level) {
    var orig = console[level].bind(console);
    console[level] = function() {
      orig.apply(console, arguments);
      try {
        var msg = Array.from(arguments).map(function(a) {
          try { return typeof a === 'object' ? JSON.stringify(a) : String(a); } catch(e) { return String(a); }
        }).join(' ');
        queue({ event_type: 'console_log', ts: now(), log_level: level, log_message: msg });
      } catch(e) {}
    };
  });

  // ─── fetch patching ─────────────────────────────────────────
  var _fetch = window.fetch;
  window.fetch = function(input, init) {
    var reqUrl = typeof input === 'string' ? input : (input && input.url) || String(input);
    var method = (init && init.method) || 'GET';
    var t0 = Date.now();
    queue({ event_type: 'network_request', ts: now(), method: method, request_url: reqUrl });
    return _fetch.call(this, input, init).then(function(res) {
      queue({ event_type: 'network_response', ts: now(), method: method,
        request_url: reqUrl, status_code: res.status, response_time_ms: Date.now() - t0 });
      return res;
    }, function(err) {
      queue({ event_type: 'network_response', ts: now(), method: method,
        request_url: reqUrl, status_code: 0, log_message: String(err), response_time_ms: Date.now() - t0 });
      throw err;
    });
  };

  // ─── XHR patching ───────────────────────────────────────────
  var _XHROpen = XMLHttpRequest.prototype.open;
  var _XHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url) {
    this._aqMethod = method;
    this._aqUrl = url;
    return _XHROpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function() {
    var self = this;
    var t0 = Date.now();
    queue({ event_type: 'network_request', ts: now(), method: self._aqMethod || 'GET', request_url: String(self._aqUrl || '') });
    this.addEventListener('loadend', function() {
      queue({ event_type: 'network_response', ts: now(), method: self._aqMethod || 'GET',
        request_url: String(self._aqUrl || ''), status_code: self.status, response_time_ms: Date.now() - t0 });
    });
    return _XHRSend.apply(this, arguments);
  };

  // ─── Navigation logging ─────────────────────────────────────
  queue({ event_type: 'navigation', ts: now(), request_url: APP_URL, log_message: 'Proxy page loaded: ' + APP_URL });

  // Flush on unload
  window.addEventListener('beforeunload', flush);
  window.addEventListener('pagehide', flush);
  setInterval(flush, 5000);
})();
</script>
`
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const targetUrl = searchParams.get('url')
  const sessionId = searchParams.get('session') ?? ''

  if (!targetUrl) {
    return new NextResponse('Missing ?url= parameter', { status: 400 })
  }

  // Validate URL
  let parsedTarget: URL
  try {
    parsedTarget = new URL(targetUrl)
    if (!['http:', 'https:'].includes(parsedTarget.protocol)) {
      return new NextResponse('Only http/https URLs are allowed', { status: 400 })
    }
  } catch {
    return new NextResponse('Invalid URL', { status: 400 })
  }

  // Auth check — only authenticated users can use the proxy
  const supabase = await getSupabaseClient(req)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // Fetch the target URL
  const forwardHeaders: Record<string, string> = {
    'User-Agent': 'AgentQA-Proxy/1.0 (testing-platform)',
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
  try {
    upstreamRes = await fetch(parsedTarget.toString(), {
      method: 'GET',
      headers: forwardHeaders,
      redirect: 'follow',
    })
  } catch (err) {
    return new NextResponse(`Failed to fetch target: ${String(err)}`, { status: 502 })
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
