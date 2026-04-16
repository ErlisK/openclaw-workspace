import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { parseProxyRequest, getProxySuffix } from '@/lib/proxy-subdomain'

// ─── Headers to strip from proxied responses ─────────────────────────────
const STRIP_RESPONSE_HEADERS = new Set([
  'content-security-policy',
  'content-security-policy-report-only',
  'x-frame-options',
  'transfer-encoding',
  'connection',
  'keep-alive',
  'upgrade',
  'set-cookie',
  'strict-transport-security',
  'public-key-pins',
])

// ─── Logger script builder (minimal — event capture only) ────────────────
function buildLoggerScript(sessionId: string, reportUrl: string): string {
  return `
<script id="betawindow-logger">
(function(SESSION_ID, REPORT_URL) {
  'use strict';
  var buf = [], flushTimer = null;
  var _rawFetch = (typeof window !== 'undefined' && window.fetch) ? window.fetch.bind(window) : null;
  function now() { return new Date().toISOString(); }
  function safeStr(v) {
    if (v == null) return '';
    if (typeof v === 'string') return v.slice(0, 4096);
    try { return JSON.stringify(v).slice(0, 4096); } catch(e) { return String(v).slice(0, 4096); }
  }
  function queue(ev) {
    buf.push(ev);
    if (buf.length >= 25) flush();
    else if (!flushTimer) flushTimer = setTimeout(flush, 1500);
  }
  function flush() {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    if (!buf.length) return;
    var events = buf.splice(0);
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'betawindow_event_batch', events: events, session: SESSION_ID }, '*');
      }
    } catch(e) {}
    if (!_rawFetch || !REPORT_URL) return;
    try {
      _rawFetch(REPORT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(events),
        credentials: 'include',
      }).catch(function() {});
    } catch(e) {}
  }

  // Console patching
  if (typeof console !== 'undefined') {
    ['log','info','warn','error','debug'].forEach(function(level) {
      var orig = console[level] && console[level].bind(console);
      if (!orig) return;
      console[level] = function() {
        orig.apply(console, arguments);
        try {
          var args = Array.prototype.slice.call(arguments);
          queue({ event_type: 'console_log', ts: now(), log_level: level === 'debug' ? 'log' : level, log_message: args.map(safeStr).join(' ') });
        } catch(e) {}
      };
    });
  }

  // Fetch logging
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    var _origFetch = window.fetch;
    window.fetch = function(input, init) {
      var reqUrl;
      try { reqUrl = typeof input === 'string' ? input : (input.url || String(input)); } catch(e) { reqUrl = String(input); }
      if (REPORT_URL && reqUrl.indexOf(REPORT_URL) === 0) return _origFetch.call(this, input, init);
      var method = (init && init.method) ? init.method.toUpperCase() : 'GET';
      var t0 = Date.now();
      queue({ event_type: 'network_request', ts: now(), method: method, request_url: reqUrl });
      return _origFetch.call(this, input, init).then(
        function(res) { queue({ event_type: 'network_response', ts: now(), method: method, request_url: reqUrl, status_code: res.status, response_time_ms: Date.now() - t0 }); return res; },
        function(err) { queue({ event_type: 'network_response', ts: now(), method: method, request_url: reqUrl, status_code: 0, log_message: safeStr(err), response_time_ms: Date.now() - t0 }); throw err; }
      );
    };
  }

  // XHR logging
  if (typeof XMLHttpRequest !== 'undefined') {
    var _XOpen = XMLHttpRequest.prototype.open, _XSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(m, u) { this._bwM = (m||'GET').toUpperCase(); this._bwU = String(u||''); return _XOpen.apply(this, arguments); };
    XMLHttpRequest.prototype.send = function() {
      var self = this, t0 = Date.now(), url = self._bwU, method = self._bwM || 'GET';
      if (REPORT_URL && url.indexOf(REPORT_URL) === 0) return _XSend.apply(this, arguments);
      queue({ event_type: 'network_request', ts: now(), method: method, request_url: url });
      this.addEventListener('loadend', function() { queue({ event_type: 'network_response', ts: now(), method: method, request_url: url, status_code: self.status || 0, response_time_ms: Date.now() - t0 }); });
      return _XSend.apply(this, arguments);
    };
  }

  // Click capture
  if (typeof document !== 'undefined') {
    document.addEventListener('click', function(e) {
      try {
        var t = e.target;
        if (!t || !(t instanceof Element)) return;
        var tag = t.tagName.toLowerCase();
        var txt = (t.textContent || '').trim().slice(0, 120);
        queue({ event_type: 'click', ts: now(), log_message: tag + (t.id ? '#'+t.id : '') + (txt ? '['+txt+']' : ''), payload: { tag: tag, id: t.id || null, text: txt || null, x: Math.round(e.clientX), y: Math.round(e.clientY) } });
      } catch(e) {}
    }, true);
  }

  // Listen for commands from the parent BrowserViewer (back, forward, reload)
  if (typeof window !== 'undefined') {
    window.addEventListener('message', function(e) {
      try {
        if (e.data && e.data.type === 'betawindow_command') {
          if (e.data.command === 'back') history.back();
          else if (e.data.command === 'forward') history.forward();
          else if (e.data.command === 'reload') location.reload();
        }
      } catch(ex) {}
    });
  }

  // Block service worker
  if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
    try { navigator.serviceWorker.register = function() { return Promise.reject(new Error('[betawindow] SW blocked')); }; } catch(e) {}
  }

  // Navigation event
  queue({ event_type: 'navigation', ts: now(), request_url: location.href, log_message: 'BetaWindow logger initialized', payload: { session_id: SESSION_ID } });

  // Periodic flush + exit flush
  setInterval(flush, 5000);
  if (typeof window !== 'undefined') { window.addEventListener('beforeunload', flush); window.addEventListener('pagehide', flush); }
  if (typeof window !== 'undefined') { window.__betawindow__ = { session: SESSION_ID, flush: flush, queue: queue }; }
})(${JSON.stringify(sessionId)}, ${JSON.stringify(reportUrl)});
</script>`
}

// ─── Proxy subdomain handler ────────────────────────────────────────────
async function handleProxySubdomain(request: NextRequest, targetHost: string): Promise<NextResponse> {
  const sessionId = request.nextUrl.searchParams.get('_bw_session') ?? ''
  const targetProtocol = 'https'
  const targetPath = request.nextUrl.pathname + request.nextUrl.search.replace(/[?&]_bw_session=[^&]*/, '')
  const targetUrl = `${targetProtocol}://${targetHost}${targetPath}`

  // Fetch from target
  const forwardHeaders: Record<string, string> = {
    'User-Agent': 'BetaWindow-Proxy/1.0 (testing-platform)',
    'Accept': request.headers.get('accept') ?? 'text/html,application/xhtml+xml,*/*',
    'Accept-Language': request.headers.get('accept-language') ?? 'en-US,en;q=0.9',
  }

  // Forward safe headers (RSC, Accept, etc.)
  const stripReq = new Set(['host', 'connection', 'authorization', 'cookie', 'x-forwarded-for', 'x-real-ip'])
  for (const [k, v] of request.headers.entries()) {
    if (!stripReq.has(k.toLowerCase())) forwardHeaders[k] = v
  }

  let upstreamRes: Response
  let currentUrl = targetUrl
  let redirects = 5
  while (true) {
    try {
      upstreamRes = await fetch(currentUrl, { method: request.method, headers: forwardHeaders, redirect: 'manual' })
    } catch {
      return new NextResponse('Upstream fetch failed', { status: 502 })
    }
    if (upstreamRes.status >= 300 && upstreamRes.status < 400 && redirects > 0) {
      const loc = upstreamRes.headers.get('location')
      if (!loc) break
      try {
        const redirectUrl = new URL(loc, currentUrl)
        // If redirect is to same host, follow it within the proxy
        if (redirectUrl.hostname === targetHost) {
          currentUrl = redirectUrl.toString()
          redirects--
          continue
        }
        // Cross-host redirect: return as-is (or could re-encode subdomain)
      } catch { /* fall through */ }
      break
    }
    break
  }

  const contentType = upstreamRes.headers.get('content-type') ?? ''

  // Build response headers (strip security headers that block embedding)
  const respHeaders = new Headers()
  for (const [k, v] of upstreamRes.headers.entries()) {
    if (!STRIP_RESPONSE_HEADERS.has(k.toLowerCase())) {
      respHeaders.set(k, v)
    }
  }
  respHeaders.set('access-control-allow-origin', '*')

  // Non-HTML: pass through directly (CSS, JS, images, fonts, JSON, RSC data, etc.)
  if (!contentType.includes('text/html')) {
    const body = await upstreamRes.arrayBuffer()
    return new NextResponse(body, { status: upstreamRes.status, headers: respHeaders })
  }

  // HTML: inject logger script, set permissive CSP
  const html = await upstreamRes.text()
  const reportUrl = `${request.nextUrl.origin}/api/sessions/${sessionId}/events`
  const script = buildLoggerScript(sessionId, reportUrl)

  // Strip meta CSP tags and inject logger at start of <head>
  let finalHtml = html
    .replace(/<meta\s[^>]*http-equiv\s*=\s*["']?\s*(?:Content-Security-Policy|X-Frame-Options)\s*["']?[^>]*>/gi, '')
  if (finalHtml.match(/<head[^>]*>/i)) {
    finalHtml = finalHtml.replace(/(<head[^>]*>)/i, `$1${script}`)
  } else if (finalHtml.includes('<body')) {
    finalHtml = finalHtml.replace('<body', `${script}<body`)
  } else {
    finalHtml = script + finalHtml
  }

  respHeaders.set('content-type', 'text/html; charset=utf-8')
  respHeaders.set('cache-control', 'no-store')
  respHeaders.set('x-frame-options', 'SAMEORIGIN')
  respHeaders.set('content-security-policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; frame-ancestors *")

  return new NextResponse(finalHtml, { status: 200, headers: respHeaders })
}

// ─── Main middleware ─────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  // ── Proxy subdomain requests ─────────────────────────────────────
  // Requests to *.proxy.localhost (dev) or *.proxy.betawindow.com (prod)
  // are proxied to the target host extracted from the subdomain.
  const hostname = request.headers.get('host') ?? request.nextUrl.hostname
  const proxyInfo = parseProxyRequest(hostname, getProxySuffix())
  if (proxyInfo) {
    return handleProxySubdomain(request, proxyInfo.targetHost)
  }

  // ── Normal app middleware ────────────────────────────────────────
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const protectedPaths = ['/dashboard', '/jobs', '/submit', '/credits', '/billing', '/admin']
  const publicJobPaths = ['/marketplace']
  const isProtected = protectedPaths.some(p => request.nextUrl.pathname.startsWith(p))
  const isPublic = publicJobPaths.some(p => request.nextUrl.pathname.startsWith(p))

  void isPublic
  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  // Match ALL requests — the proxy subdomain handler needs to catch everything,
  // including _next/static, images, etc. on proxy subdomains.
  // For the main app domain, the normal exclusions still apply via the code above.
  matcher: ['/(.*)', '/((?!favicon.ico).*)'],
}
