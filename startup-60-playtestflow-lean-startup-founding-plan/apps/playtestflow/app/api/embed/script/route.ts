import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/embed/script
 * Serves the PlaytestFlow async embed SDK.
 * Cached at CDN edge for 1 hour; CORS * for cross-origin embedding.
 *
 * Async loader pattern (recommended):
 *   <script>
 *     (function(w,d,s,o,f,js,fjs){
 *       w['PlaytestFlow']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
 *       js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
 *       js.id='ptf-sdk';js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
 *     }(window,document,'script','PlaytestFlow','https://playtestflow.vercel.app/api/embed/script'));
 *     PlaytestFlow('init',{session:'SESSION_ID',theme:'dark'});
 *   </script>
 */

const SDK_VERSION = '1.3.0'

function buildScript(baseUrl: string): string {
  return `/*!
 * PlaytestFlow Embed SDK v${SDK_VERSION}
 * https://playtestflow.vercel.app/docs/embed
 * MIT License — embed freely on any site.
 */
(function (window, document, undefined) {
  'use strict';

  // ── Deduplication guard ─────────────────────────────────────────────────
  if (window.__ptf_v) return;
  window.__ptf_v = '${SDK_VERSION}';

  var BASE = '${baseUrl}';
  var WIDGET_ID = 'ptf-widget';
  var WRAPPER_ID = 'ptf-wrapper';

  // ── Capture queued commands before SDK loaded ───────────────────────────
  var ns = window.PlaytestFlow;
  var queue = (ns && ns.q) ? ns.q.slice() : [];

  // ── Default config ──────────────────────────────────────────────────────
  var CFG = {
    session:       null,          // (required) PlaytestFlow session ID
    theme:        'dark',         // 'dark' | 'light' | 'auto'
    accentColor:  '#ff6600',      // CTA button + badge color
    bgColor:       null,          // Override background (theme-derived if null)
    textColor:     null,          // Override text color
    borderRadius: '12px',         // Widget corner rounding
    width:        '100%',         // Widget width
    maxWidth:     '480px',        // Max width
    compact:       false,         // Compact mode (smaller padding, no description)
    hideHeader:    false,         // Hide PlaytestFlow logo header
    hideFooter:    false,         // Hide "Powered by" footer
    buttonText:    null,          // Override CTA button label
    container:     null,          // CSS selector or DOM node to mount into
    floating:      false,         // Mount as fixed bottom-right widget
    onReady:       null,          // () => void — fires when iframe is ready
    onSignup:      null,          // (testerInfo) => void — fires on signup
    onError:       null,          // (err) => void — fires on error
    ref:           null,          // Referral code to pass through
  };

  // ── Theme palette ───────────────────────────────────────────────────────
  var PALETTE = {
    dark:  { bg:'#0d1117', surface:'rgba(255,255,255,0.05)', border:'rgba(255,255,255,0.12)', text:'#f0f6fc', muted:'#8b949e' },
    light: { bg:'#ffffff', surface:'#f6f8fa', border:'#d0d7de', text:'#1f2328', muted:'#57606a' },
  };

  function resolveTheme(cfg) {
    if (cfg.theme === 'auto') {
      var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
      return PALETTE[dark ? 'dark' : 'light'];
    }
    return PALETTE[cfg.theme] || PALETTE.dark;
  }

  // ── Build iframe src ────────────────────────────────────────────────────
  function iframeSrc(cfg) {
    var p = [];
    p.push('theme=' + encodeURIComponent(cfg.theme));
    p.push('accent=' + encodeURIComponent((cfg.accentColor || '#ff6600').replace('#','')));
    if (cfg.hideHeader) p.push('hideHeader=1');
    if (cfg.hideFooter) p.push('hideFooter=1');
    if (cfg.compact)    p.push('compact=1');
    if (cfg.buttonText) p.push('btn=' + encodeURIComponent(cfg.buttonText));
    if (cfg.ref)        p.push('ref=' + encodeURIComponent(cfg.ref));
    p.push('v=' + '${SDK_VERSION}');
    return BASE + '/recruit/' + cfg.session + '/embed?' + p.join('&');
  }

  // ── Create wrapper element ──────────────────────────────────────────────
  function createWrapper(cfg) {
    var el = document.getElementById(WRAPPER_ID);
    if (el) return el;

    if (cfg.container) {
      var target = typeof cfg.container === 'string'
        ? document.querySelector(cfg.container)
        : cfg.container;
      if (target) {
        target.id = target.id || WRAPPER_ID;
        return target;
      }
    }

    var div = document.createElement('div');
    div.id = WRAPPER_ID;
    if (cfg.floating) {
      div.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;' +
        'width:' + (cfg.maxWidth || '480px') + ';max-width:calc(100vw - 48px);';
    }
    document.body.appendChild(div);
    return div;
  }

  // ── Render iframe ───────────────────────────────────────────────────────
  function render(cfg) {
    if (!cfg.session) {
      var e = new Error('[PlaytestFlow] init() requires a session ID');
      console.error(e.message);
      if (typeof cfg.onError === 'function') cfg.onError(e);
      return;
    }

    var theme = resolveTheme(cfg);
    var bg = cfg.bgColor || theme.bg;
    var wrapper = createWrapper(cfg);

    // Remove previous iframe if re-init
    var old = document.getElementById(WIDGET_ID);
    if (old && old.parentNode) old.parentNode.removeChild(old);

    var iframe = document.createElement('iframe');
    iframe.id       = WIDGET_ID;
    iframe.src      = iframeSrc(cfg);
    iframe.title    = 'PlaytestFlow — Join as a playtester';
    iframe.loading  = 'lazy';
    iframe.allow    = '';
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('scrolling', 'no');
    iframe.style.cssText = [
      'display:block',
      'border:none',
      'width:' + (cfg.width || '100%'),
      'max-width:' + (cfg.maxWidth || '480px'),
      'height:' + (cfg.compact ? '200px' : '340px'),
      'border-radius:' + (cfg.borderRadius || '12px'),
      'overflow:hidden',
      'background:' + bg,
    ].join(';');

    wrapper.appendChild(iframe);

    // postMessage channel ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──
    function onMessage(e) {
      if (typeof e.data !== 'object' || !e.data || !e.data.type) return;
      var d = e.data;
      if (d.type === 'ptf:resize' && d.height) {
        iframe.style.height = (d.height + 4) + 'px'; // +4 for border
      }
      if (d.type === 'ptf:ready') {
        if (typeof cfg.onReady === 'function') cfg.onReady();
      }
      if (d.type === 'ptf:signup') {
        if (typeof cfg.onSignup === 'function') cfg.onSignup(d.tester || {});
      }
    }
    window.addEventListener('message', onMessage);

    // Cleanup helper
    iframe._ptfCleanup = function () { window.removeEventListener('message', onMessage); };
  }

  // ── setTheme: swap theme without full re-render ─────────────────────────
  function setTheme(newTheme) {
    CFG.theme = newTheme;
    var iframe = document.getElementById(WIDGET_ID);
    if (iframe && iframe.src) {
      iframe.src = iframe.src.replace(/theme=[^&]+/, 'theme=' + encodeURIComponent(newTheme));
    }
  }

  // ── destroy: remove widget ──────────────────────────────────────────────
  function destroy() {
    var iframe = document.getElementById(WIDGET_ID);
    if (iframe) {
      if (iframe._ptfCleanup) iframe._ptfCleanup();
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }
    var w = document.getElementById(WRAPPER_ID);
    if (w && w !== document.querySelector(CFG.container)) {
      if (w.parentNode) w.parentNode.removeChild(w);
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────
  var API = {
    init:     function(opts) { Object.assign(CFG, opts || {}); render(CFG); },
    setTheme: setTheme,
    destroy:  destroy,
    version:  '${SDK_VERSION}',
  };

  // Alias: ptf('init', {...}) command-queue style
  var dispatcher = function() {
    var args = Array.prototype.slice.call(arguments);
    var method = args[0];
    if (API[method]) API[method].apply(API, args.slice(1));
  };
  dispatcher.q = [];
  Object.assign(dispatcher, API);

  // Process queued commands
  for (var i = 0; i < queue.length; i++) {
    var cmd = queue[i];
    if (cmd && cmd.length && API[cmd[0]]) {
      API[cmd[0]].apply(API, cmd.slice(1));
    }
  }

  window.PlaytestFlow = dispatcher;
  // Short alias — only if not already taken
  if (!window.ptf) window.ptf = dispatcher;

}(window, document));
`
}

export async function GET(_req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://playtestflow.vercel.app'
  return new NextResponse(buildScript(baseUrl), {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
