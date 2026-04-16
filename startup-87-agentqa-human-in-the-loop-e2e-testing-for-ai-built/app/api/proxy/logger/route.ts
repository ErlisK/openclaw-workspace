import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/get-client'

/**
 * GET /api/proxy/logger?session=<id>&report_url=<url>
 *
 * Serves the betawindow-logger JavaScript as a standalone file.
 * This is the same script that gets injected by /api/proxy,
 * but served as a <script src="..."> reference for:
 *   - Cached delivery (max-age=60)
 *   - Unit testing in isolation
 *   - Manual injection into non-proxied pages
 *
 * Auth required.
 */
export async function GET(req: NextRequest) {
  const supabase = await getSupabaseClient(req)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('session') ?? ''
  const reportUrl = searchParams.get('report_url') ??
    `${new URL(req.url).origin}/api/sessions/${sessionId}/events`
  const appUrl = searchParams.get('app_url') ?? ''

  const script = buildLoggerScript(sessionId, appUrl, reportUrl)

  return new NextResponse(script, {
    status: 200,
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'public, max-age=60',
      'x-session-id': sessionId,
    },
  })
}

export function buildLoggerScript(sessionId: string, appUrl: string, reportUrl: string): string {
  return `
// BetaWindow Logger v1.0 — auto-injected by proxy
// Captures fetch, XHR, and console events and reports them to the session events API.
(function(SESSION_ID, APP_URL, REPORT_URL) {
  'use strict';

  // ─── URL masking ────────────────────────────────────────────
  // MUST run before any framework scripts (Next.js, React Router, etc.)
  // so they read the correct pathname from window.location.
  // The iframe URL is /api/proxy?url=TARGET&session=..., but frameworks
  // need to see the TARGET path (e.g. "/" or "/about") to match routes.
  if (typeof window !== 'undefined' && typeof history !== 'undefined' && APP_URL) {
    try {
      var _appUrlParsed = new URL(APP_URL);
      var _targetPath = _appUrlParsed.pathname + _appUrlParsed.search + _appUrlParsed.hash;
      history.replaceState(history.state, '', _targetPath || '/');
    } catch(e) {}
  }

  // ─── State ──────────────────────────────────────────────────
  var buf = [];
  var flushTimer = null;
  var started = Date.now();

  // Save raw fetch BEFORE any patching to avoid recursion in flush
  var _rawFetch = (typeof window !== 'undefined' && window.fetch)
    ? window.fetch.bind(window)
    : null;

  // ─── Helpers ────────────────────────────────────────────────
  function now() { return new Date().toISOString(); }

  function safeStr(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string') return v.slice(0, 4096); // cap at 4KB
    try { return JSON.stringify(v).slice(0, 4096); } catch(e) { return String(v).slice(0, 4096); }
  }

  // ─── Event queue + flush ────────────────────────────────────
  function queue(ev) {
    buf.push(ev);
    if (buf.length >= 25) flush();
    else if (!flushTimer) flushTimer = setTimeout(flush, 1500);
  }

  function flush() {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    if (!buf.length) return;
    var events = buf.splice(0);
    // 1) postMessage to parent (RunLogger picks this up)
    try {
      if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'betawindow_event_batch', events: events, session: SESSION_ID }, '*');
      }
    } catch(e) {}
    // 2) POST directly to API using raw fetch (no recursion)
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

  // ─── Console patching ────────────────────────────────────────
  if (typeof console !== 'undefined') {
    ['log', 'info', 'warn', 'error', 'debug'].forEach(function(level) {
      var orig = console[level] && console[level].bind(console);
      if (!orig) return;
      console[level] = function() {
        orig.apply(console, arguments);
        try {
          var args = Array.prototype.slice.call(arguments);
          var msg = args.map(safeStr).join(' ');
          queue({
            event_type: 'console_log',
            ts: now(),
            log_level: level === 'debug' ? 'log' : level,
            log_message: msg,
          });
        } catch(e) {}
      };
    });
  }

  // ─── URL rewriting helper for fetch/XHR ──────────────────────
  // Rewrites URLs that resolve to the proxy host (but should go to
  // the target app) so they route through /api/proxy instead.
  var _proxyOriginFetch = (typeof window !== 'undefined') ? window.location.origin : '';
  var _proxyBaseFetch = _proxyOriginFetch + '/api/proxy';

  function rewriteFetchUrl(rawUrl) {
    if (!rawUrl || !APP_URL || !_proxyOriginFetch) return null;
    var s = String(rawUrl);
    // Already routed through proxy — leave alone
    if (s.indexOf('/api/proxy') === 0 || s.indexOf(_proxyOriginFetch + '/api/proxy') === 0) return null;
    // Skip our own session event reporting endpoints
    if (s.indexOf('/api/sessions') === 0 || s.indexOf(_proxyOriginFetch + '/api/sessions') === 0) return null;
    // Skip data: / blob: / javascript: URLs
    if (s.indexOf('data:') === 0 || s.indexOf('blob:') === 0 || s.indexOf('javascript:') === 0) return null;

    var resolved;
    try { resolved = new URL(s, document.baseURI || window.location.href); } catch(e) { return null; }

    // If the resolved URL points to the proxy host (not already a proxy route),
    // it was a relative URL that the browser resolved against the wrong origin.
    // Re-resolve the path against the target app URL.
    if (resolved.origin === _proxyOriginFetch) {
      var pathWithQuery = resolved.pathname + resolved.search + resolved.hash;
      try {
        var targetResolved = new URL(pathWithQuery, APP_URL);
        return _proxyBaseFetch + '?url=' + encodeURIComponent(targetResolved.toString()) + '&session=' + SESSION_ID;
      } catch(e) { return null; }
    }

    // If the resolved URL points to the target app origin directly, proxy it
    try {
      var appOrigin = new URL(APP_URL).origin;
      if (resolved.origin === appOrigin) {
        return _proxyBaseFetch + '?url=' + encodeURIComponent(resolved.toString()) + '&session=' + SESSION_ID;
      }
    } catch(e) {}

    // External URL — leave alone (third-party APIs, CDNs, etc.)
    return null;
  }

  // ─── window.fetch patching ───────────────────────────────────
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    var _origFetch = window.fetch;
    window.fetch = function(input, init) {
      var reqUrl;
      try { reqUrl = typeof input === 'string' ? input : (input.url || String(input)); }
      catch(e) { reqUrl = String(input); }

      // Skip the reporting URL itself to prevent infinite loops
      if (REPORT_URL && (reqUrl === REPORT_URL || reqUrl.indexOf(REPORT_URL) === 0)) {
        return _origFetch.call(this, input, init);
      }

      // Rewrite URL to go through proxy if needed
      var rewritten = rewriteFetchUrl(reqUrl);
      if (rewritten) {
        if (typeof input === 'string') {
          input = rewritten;
        } else if (typeof Request !== 'undefined' && input instanceof Request) {
          input = new Request(rewritten, input);
        } else {
          input = rewritten;
        }
        reqUrl = rewritten;
      }

      var method = (init && init.method) ? init.method.toUpperCase() : 'GET';
      var t0 = Date.now();

      queue({
        event_type: 'network_request',
        ts: now(),
        method: method,
        request_url: reqUrl,
      });

      return _origFetch.call(this, input, init).then(
        function(res) {
          queue({
            event_type: 'network_response',
            ts: now(),
            method: method,
            request_url: reqUrl,
            status_code: res.status,
            response_time_ms: Date.now() - t0,
          });
          return res;
        },
        function(err) {
          queue({
            event_type: 'network_response',
            ts: now(),
            method: method,
            request_url: reqUrl,
            status_code: 0,
            log_message: safeStr(err),
            response_time_ms: Date.now() - t0,
          });
          throw err;
        }
      );
    };
  }

  // ─── XMLHttpRequest patching ─────────────────────────────────
  if (typeof XMLHttpRequest !== 'undefined') {
    var _XHROpen = XMLHttpRequest.prototype.open;
    var _XHRSend = XMLHttpRequest.prototype.send;
    var _XHRSetHeader = XMLHttpRequest.prototype.setRequestHeader;

    XMLHttpRequest.prototype.open = function(method, url) {
      this._aqMethod = (method || 'GET').toUpperCase();
      this._aqUrl = String(url || '');
      // Rewrite URL to go through proxy if needed
      var rewritten = rewriteFetchUrl(this._aqUrl);
      if (rewritten) {
        this._aqUrl = rewritten;
        var args = Array.prototype.slice.call(arguments);
        args[1] = rewritten;
        this._aqHeaders = {};
        return _XHROpen.apply(this, args);
      }
      this._aqHeaders = {};
      return _XHROpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
      if (this._aqHeaders) this._aqHeaders[name] = value;
      return _XHRSetHeader.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function(body) {
      var self = this;
      var t0 = Date.now();
      var reqUrl = self._aqUrl || '';
      var method = self._aqMethod || 'GET';

      // Skip reporting URL
      if (REPORT_URL && (reqUrl === REPORT_URL || reqUrl.indexOf(REPORT_URL) === 0)) {
        return _XHRSend.apply(this, arguments);
      }

      queue({
        event_type: 'network_request',
        ts: now(),
        method: method,
        request_url: reqUrl,
        request_headers: self._aqHeaders || null,
      });

      this.addEventListener('loadend', function() {
        queue({
          event_type: 'network_response',
          ts: now(),
          method: method,
          request_url: reqUrl,
          status_code: self.status || 0,
          response_time_ms: Date.now() - t0,
        });
      });

      return _XHRSend.apply(this, arguments);
    };
  }

  // ─── Proactive DOM rewriting ─────────────────────────────────────────────
  // After React hydration, rewrite all <a href> and <link href> in the DOM
  // so that native link-following goes through the proxy. Also patch
  // Element.prototype.setAttribute so dynamically set href/src values are
  // rewritten BEFORE the browser acts on them (MutationObserver is too late
  // for <link rel="prefetch">).
  if (typeof window !== 'undefined' && APP_URL && typeof MutationObserver !== 'undefined') {
    var _proxyOriginMO = window.location.origin;
    var _proxyBaseMO = _proxyOriginMO + '/api/proxy';

    function rewriteAttr(el, attr, base) {
      try {
        var raw = el.getAttribute(attr);
        if (!raw) return;
        if (raw.indexOf('/api/proxy') !== -1) return;
        if (raw.charAt(0) === '#' || raw.indexOf('javascript:') === 0 || raw.indexOf('data:') === 0) return;
        var abs;
        try { abs = new URL(raw, base).toString(); } catch(e) { return; }
        // Only rewrite same-origin target links
        try {
          var absU = new URL(abs);
          var appU = new URL(APP_URL);
          if (absU.origin !== appU.origin) return;
          el.setAttribute(attr, _proxyBaseMO + '?url=' + encodeURIComponent(abs) + '&session=' + SESSION_ID);
        } catch(e) { return; }
      } catch(e) {}
    }

    function rewriteElement(el) {
      if (!el || typeof el.tagName !== 'string') return;
      var tag = el.tagName.toUpperCase();
      if (tag === 'A' || tag === 'LINK' || tag === 'AREA') rewriteAttr(el, 'href', APP_URL);
      if (tag === 'SCRIPT' || tag === 'IMG' || tag === 'IFRAME' || tag === 'EMBED' || tag === 'AUDIO' || tag === 'VIDEO' || tag === 'SOURCE') rewriteAttr(el, 'src', APP_URL);
      if (tag === 'FORM') rewriteAttr(el, 'action', APP_URL);
    }

    function walkTree(node) {
      if (!node) return;
      rewriteElement(node);
      var children = node.querySelectorAll ? node.querySelectorAll('a[href],link[href],area[href],script[src],img[src],iframe[src],embed[src],audio[src],video[src],source[src],form[action]') : [];
      for (var i = 0; i < children.length; i++) rewriteElement(children[i]);
    }

    try {
      var _mo = new MutationObserver(function(mutations) {
        for (var m = 0; m < mutations.length; m++) {
          var added = mutations[m].addedNodes;
          for (var n = 0; n < added.length; n++) walkTree(added[n]);
          // Also handle attribute changes on existing nodes
          if (mutations[m].type === 'attributes') rewriteElement(mutations[m].target);
        }
      });
      if (typeof document !== 'undefined' && document.body) {
        _mo.observe(document.documentElement || document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['href', 'src', 'action']
        });
      } else if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', function() {
          _mo.observe(document.documentElement || document.body, {
            childList: true, subtree: true, attributes: true,
            attributeFilter: ['href', 'src', 'action']
          });
        });
      }
    } catch(e) {}
  }

  // ─── window.open interception ─────────────────────────────────────────────
  if (typeof window !== 'undefined' && APP_URL) {
    try {
      var _origOpen = window.open;
      window.open = function(url, target, features) {
        if (url && typeof url === 'string') {
          try {
            var abs;
            try { abs = new URL(url, APP_URL).toString(); } catch(e) { abs = url; }
            var appOrigin = new URL(APP_URL).origin;
            if (new URL(abs).origin === appOrigin) {
              var proxied = window.location.origin + '/api/proxy?url=' + encodeURIComponent(abs) + '&session=' + SESSION_ID;
              return _origOpen.call(window, proxied, target, features);
            }
          } catch(e) {}
        }
        return _origOpen.apply(window, arguments);
      };
    } catch(e) {}
  }

  // ─── Block service worker registration ──────────────────────────────────
  if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
    try {
      navigator.serviceWorker.register = function() {
        return Promise.reject(new Error('[betawindow] service worker registration blocked'));
      };
    } catch(e) {}
  }

  // ─── Link + navigation interception ──────────────────────────
  // Handles dynamically-set hrefs and JS-driven navigation (history.pushState,
  // window.location.assign, etc.) that the server-side HTML rewriter cannot see.
  if (typeof window !== 'undefined' && APP_URL) {
    var _proxyOrigin = window.location.origin;
    var _proxyBase = _proxyOrigin + '/api/proxy';

    // Resolve any href to its absolute form relative to APP_URL, then
    // return a proxy URL if the resolved destination belongs to the same
    // target origin.  Returns null when no proxying is needed.
    function makeProxyHref(rawHref) {
      if (!rawHref) return null;
      var s = String(rawHref);
      if (!s || s.charAt(0) === '#') return null;
      if (s.indexOf('javascript:') === 0 || s.indexOf('mailto:') === 0 || s.indexOf('tel:') === 0) return null;
      // Already routed through the proxy?
      if (s.indexOf('/api/proxy?url=') !== -1 || s.indexOf('/api/proxy-static/') !== -1) return null;
      // Resolve relative href against APP_URL so '/pricing' → 'https://snippetci.com/pricing'
      var abs;
      try { abs = new URL(s, APP_URL).toString(); } catch(e) { return null; }
      // Key fix: if the resolved URL points back to our proxy origin (e.g. Next.js resolves
      // '/blog' → 'https://www.betawindow.com/blog'), extract the path and re-resolve it
      // against the target app URL instead.
      try {
        var absUrl = new URL(abs);
        if (absUrl.origin === _proxyOrigin) {
          var pathWithQuery = absUrl.pathname + absUrl.search + absUrl.hash;
          // Re-resolve against target app
          try { abs = new URL(pathWithQuery, APP_URL).toString(); } catch(e2) { return null; }
        }
      } catch(e) { return null; }
      // Only intercept same-origin target links (let external links open normally)
      try {
        if (new URL(abs).origin !== new URL(APP_URL).origin) return null;
      } catch(e) { return null; }
      return _proxyBase + '?url=' + encodeURIComponent(abs) + '&session=' + SESSION_ID;
    }

    // 1. Click interception — fires BEFORE the browser follows the href.
    //    Handles both static and dynamically-added <a> tags.
    if (typeof document !== 'undefined') {
      document.addEventListener('click', function(evt) {
        try {
          var el = evt.target;
          // Walk up the DOM to find the nearest anchor element
          for (var _i = 0; _i < 6; _i++) {
            if (!el) break;
            if (el.tagName === 'A') break;
            el = el.parentElement;
          }
          if (!el || el.tagName !== 'A') return;

          // el.href is already fully resolved by the browser (against current page origin),
          // so use getAttribute('href') to get the raw value for correct re-resolution.
          var rawHref = el.getAttribute('href');
          if (!rawHref) return;

          // If the raw href is already an absolute betawindow URL (e.g. rewritten on the
          // server but the JS framework then over-wrote it), check el.href directly too.
          var proxied = makeProxyHref(rawHref);
          if (!proxied) {
            // Try resolving el.href directly (covers cases where React set href to a full URL)
            try {
              var elHref = el.href;
              if (elHref && new URL(elHref).origin === _proxyOrigin) {
                // The browser has already resolved a relative path to betawindow.com —
                // extract the pathname and re-resolve against the target app.
                var pathname = new URL(elHref).pathname + new URL(elHref).search;
                proxied = makeProxyHref(pathname);
              }
            } catch(e2) {}
          }
          if (!proxied) return;

          evt.preventDefault();
          evt.stopImmediatePropagation();
          window.location.href = proxied;
        } catch(e) {}
      }, true /* capture phase — fires before framework handlers */);
    }

    // 2. history.pushState / replaceState interception.
    //    SPAs (Next.js, React Router) call these for soft navigation.
    //    We detect same-origin target paths and do a full proxy reload instead.

    // Check if the page is already showing the same target URL.
    // After the early replaceState, location.pathname is the target path
    // (e.g. "/"), not "/api/proxy?url=...". So we compare the target path
    // from the new proxy URL against location.pathname.
    function isAlreadyProxying(newProxyUrl) {
      try {
        var u = new URL(newProxyUrl, location.href);
        var targetParam = u.searchParams.get('url');
        if (!targetParam) return false;
        var targetPath = new URL(decodeURIComponent(targetParam)).pathname.replace(/\/$/, '') || '/';
        var currentPath = location.pathname.replace(/\/$/, '') || '/';
        if (targetPath === currentPath) return true;
      } catch(e) {}
      return false;
    }

    try {
      var _origPushState = history.pushState.bind(history);
      var _origReplaceState = history.replaceState.bind(history);

      history.pushState = function(state, title, url) {
        if (url) {
          var proxied2 = makeProxyHref(String(url));
          if (proxied2) {
            // Avoid reload loop: if we're already proxying this same target,
            // just pass through to real pushState without triggering a full
            // page reload (which would re-initialize the logger and loop).
            if (isAlreadyProxying(proxied2)) {
              return _origPushState(state, title, url);
            }
            window.location.href = proxied2;
            return;
          }
        }
        return _origPushState(state, title, url);
      };

      history.replaceState = function(state, title, url) {
        if (url) {
          var proxied3 = makeProxyHref(String(url));
          if (proxied3) {
            if (isAlreadyProxying(proxied3)) {
              return _origReplaceState(state, title, url);
            }
            window.location.replace(proxied3);
            return;
          }
        }
        return _origReplaceState(state, title, url);
      };
    } catch(e) {}

    // 3. window.location.assign / replace interception via defineProperty.
    //    Covers direct 'window.location.href = ...' assignments from JS.
    try {
      var _origAssign = window.location.assign.bind(window.location);
      var _origReplace = window.location.replace.bind(window.location);

      window.location.assign = function(url) {
        var proxied4 = makeProxyHref(String(url));
        if (proxied4) { _origAssign(proxied4); return; }
        _origAssign(url);
      };
      window.location.replace = function(url) {
        var proxied5 = makeProxyHref(String(url));
        if (proxied5) { _origReplace(proxied5); return; }
        _origReplace(url);
      };
    } catch(e) {}

    // 4. popstate interception — handles browser back/forward buttons.
    //    When the user navigates back/forward, the SPA may try to render
    //    a page based on the (non-proxied) URL in the history stack.
    //    Re-route through the proxy to load the correct target page.
    try {
      window.addEventListener('popstate', function() {
        var currentPath = location.pathname + location.search + location.hash;
        var proxied6 = makeProxyHref(currentPath);
        if (proxied6) {
          window.location.href = proxied6;
        }
      });
    } catch(e) {}
  }

  // ─── Image/resource error recovery ──────────────────────────
  // Since we no longer rewrite <img src>, <source src>, etc. in the HTML
  // (to avoid React hydration mismatches), images with relative paths load
  // from the proxy host and fail. This handler retries them through the proxy.
  if (typeof document !== 'undefined' && APP_URL) {
    document.addEventListener('error', function(evt) {
      try {
        var el = evt.target;
        if (!el || !(el instanceof Element)) return;
        var tag = el.tagName.toUpperCase();
        if (tag !== 'IMG' && tag !== 'SOURCE' && tag !== 'VIDEO' && tag !== 'AUDIO') return;
        var src = el.getAttribute('src');
        if (!src) return;
        // Already proxied or data/blob URL — don't retry
        if (src.indexOf('/api/proxy') !== -1 || src.indexOf('data:') === 0 || src.indexOf('blob:') === 0) return;
        // Resolve against target app and proxy it
        try {
          var abs = new URL(src, APP_URL).toString();
          var appOrigin = new URL(APP_URL).origin;
          if (new URL(abs).origin === appOrigin || new URL(src, location.href).origin === _proxyOriginFetch) {
            el.setAttribute('src', _proxyBaseFetch + '?url=' + encodeURIComponent(abs) + '&session=' + SESSION_ID);
          }
        } catch(e2) {}
      } catch(e) {}
    }, true);
  }

  // ─── Navigation / page load event ────────────────────────────
  queue({
    event_type: 'navigation',
    ts: now(),
    request_url: APP_URL || (typeof location !== 'undefined' ? location.href : ''),
    log_message: 'BetaWindow logger initialized',
    payload: { session_id: SESSION_ID, started: started },
  });

  // ─── Click capture (optional) ────────────────────────────────
  if (typeof document !== 'undefined') {
    document.addEventListener('click', function(e) {
      try {
        var t = e.target;
        if (!t || !(t instanceof Element)) return;
        // Build a minimal selector path (tag + id/class/text)
        function describeEl(el) {
          if (!el || !(el instanceof Element)) return '';
          var tag = el.tagName.toLowerCase();
          var id = el.id ? '#' + el.id : '';
          var cls = el.className && typeof el.className === 'string'
            ? '.' + el.className.trim().replace(/\s+/g, '.').slice(0, 40) : '';
          var txt = (el.textContent || '').trim().slice(0, 60);
          return tag + id + cls + (txt ? '[' + txt + ']' : '');
        }
        // Walk up to 4 levels for a breadcrumb
        var path = [];
        var cur = t;
        for (var i = 0; i < 4 && cur && cur instanceof Element; i++) {
          path.unshift(describeEl(cur));
          cur = cur.parentElement;
        }
        queue({
          event_type: 'click',
          ts: now(),
          log_message: path.join(' > '),
          payload: {
            tag: t.tagName.toLowerCase(),
            id: t.id || null,
            class: (typeof t.className === 'string' ? t.className.trim() : '') || null,
            text: (t.textContent || '').trim().slice(0, 120) || null,
            x: Math.round(e.clientX),
            y: Math.round(e.clientY),
          },
        });
      } catch(e) {}
    }, true /* capture phase — fires before any stopPropagation */);
  }

  // ─── DOM snapshot (optional, throttled) ─────────────────────
  var _lastSnapshot = 0;
  var SNAPSHOT_COOLDOWN_MS = 10000; // at most one snapshot per 10s

  function takeSnapshot(trigger) {
    if (typeof document === 'undefined') return;
    var now_ms = Date.now();
    if (now_ms - _lastSnapshot < SNAPSHOT_COOLDOWN_MS) return;
    _lastSnapshot = now_ms;
    try {
      // Lightweight structural snapshot: tags + ids + key attrs, no content
      function snapshotNode(el, depth) {
        if (!el || !(el instanceof Element)) return null;
        if (depth > 5) return { tag: '...', children: [] };
        var tag = el.tagName.toLowerCase();
        // Skip script/style/svg internals for brevity
        if (['script','style','noscript'].indexOf(tag) !== -1) return null;
        var attrs = {};
        var keep = ['id','class','href','src','type','name','role','aria-label'];
        for (var i = 0; i < keep.length; i++) {
          var v = el.getAttribute(keep[i]);
          if (v) attrs[keep[i]] = v.slice(0, 80);
        }
        var children = [];
        var childEls = el.children;
        for (var j = 0; j < Math.min(childEls.length, 12); j++) {
          var c = snapshotNode(childEls[j], depth + 1);
          if (c) children.push(c);
        }
        var node = { tag: tag };
        if (Object.keys(attrs).length) node['attrs'] = attrs;
        if (children.length) node['children'] = children;
        return node;
      }
      var snap = snapshotNode(document.body, 0);
      queue({
        event_type: 'dom_snapshot',
        ts: now(),
        log_message: 'DOM snapshot: ' + trigger,
        payload: { trigger: trigger, snapshot: snap },
      });
    } catch(e) {}
  }

  // Expose snapshot on public API so RunLogger can trigger on demand
  // Also take one snapshot on initial load
  if (typeof document !== 'undefined') {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(function() { takeSnapshot('load'); }, 500);
    } else {
      document.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() { takeSnapshot('DOMContentLoaded'); }, 500);
      });
    }
  }

  // ─── Periodic + exit flush ───────────────────────────────────
  setInterval(flush, 5000);
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', flush);
    window.addEventListener('pagehide', flush);
  }

  // ─── Public API ──────────────────────────────────────────────
  if (typeof window !== 'undefined') {
    window.__betawindow__ = {
      session: SESSION_ID,
      flush: flush,
      queue: queue,
      getBuffer: function() { return buf.slice(); },
      snapshot: function(trigger) { takeSnapshot(trigger || 'manual'); },
    };
  }

})(${JSON.stringify(sessionId)}, ${JSON.stringify(appUrl)}, ${JSON.stringify(reportUrl)});
`
}
