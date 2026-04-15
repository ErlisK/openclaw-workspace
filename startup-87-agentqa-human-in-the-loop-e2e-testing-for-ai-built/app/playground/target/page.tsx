/**
 * /playground/target — Deterministic test target page for E2E sandbox verification
 *
 * This page is intentionally simple and predictable:
 * - Emits known console.log, console.warn, console.error messages on mount
 * - Makes known fetch() calls (to /api/playground/ping) that return deterministic JSON
 * - Has a button that emits a click event + another console.log
 * - Has data-testid attributes for Playwright assertions
 *
 * Used by: tester sandbox flow E2E tests to ensure proxy + event logging pipeline works
 * correctly without relying on flaky external URLs.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'BetaWindow Playground Target',
  description: 'Deterministic test target page for E2E sandbox verification',
}

export default function PlaygroundTargetPage() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>BetaWindow Playground Target</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; }
          .container { max-width: 680px; margin: 60px auto; padding: 0 24px; }
          .header { background: #1e293b; color: #f8fafc; padding: 32px; border-radius: 12px; margin-bottom: 24px; }
          .header h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
          .header p { font-size: 14px; color: #94a3b8; }
          .card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 16px; }
          .card h2 { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #334155; }
          .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; margin-right: 8px; }
          .badge-green { background: #dcfce7; color: #166534; }
          .badge-yellow { background: #fef9c3; color: #854d0e; }
          .badge-red { background: #fee2e2; color: #991b1b; }
          button { padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; margin-right: 12px; margin-top: 8px; }
          button:hover { background: #2563eb; }
          button.secondary { background: #f1f5f9; color: #334155; }
          button.danger { background: #ef4444; }
          .log-output { background: #0f172a; color: #94a3b8; font-family: monospace; font-size: 12px; padding: 16px; border-radius: 8px; min-height: 80px; margin-top: 12px; white-space: pre-wrap; }
          .status-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
          .status-row:last-child { border-bottom: none; }
          .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
          .dot-green { background: #22c55e; }
          .dot-yellow { background: #eab308; }
          .dot-red { background: #ef4444; }
        `}</style>
      </head>
      <body>
        <div className="container">
          <div className="header">
            <h1 data-testid="page-title">🎯 BetaWindow Test Target</h1>
            <p>Deterministic playground page for E2E sandbox verification</p>
          </div>

          <div className="card" data-testid="status-card">
            <h2>Page Status</h2>
            <div className="status-row">
              <div className="dot dot-green"></div>
              <span data-testid="status-ready">Page loaded successfully</span>
              <span className="badge badge-green">OK</span>
            </div>
            <div className="status-row">
              <div className="dot dot-yellow"></div>
              <span data-testid="status-js">JavaScript executing</span>
              <span className="badge badge-yellow" id="js-status">Loading…</span>
            </div>
            <div className="status-row">
              <div className="dot dot-green"></div>
              <span data-testid="status-api">API endpoint reachable</span>
              <span className="badge badge-green" id="api-status">Checking…</span>
            </div>
          </div>

          <div className="card" data-testid="actions-card">
            <h2>Test Actions</h2>
            <button
              id="btn-log"
              data-testid="btn-log"
              type="button"
            >
              Emit console.log
            </button>
            <button
              id="btn-warn"
              data-testid="btn-warn"
              type="button"
              className="secondary"
            >
              Emit console.warn
            </button>
            <button
              id="btn-error"
              data-testid="btn-error"
              type="button"
              className="danger"
            >
              Emit console.error
            </button>
            <button
              id="btn-fetch"
              data-testid="btn-fetch"
              type="button"
              className="secondary"
            >
              Trigger fetch()
            </button>
            <div className="log-output" id="log-output" data-testid="log-output">
              Waiting for actions…
            </div>
          </div>

          <div className="card" data-testid="api-results-card">
            <h2>API Response</h2>
            <pre id="api-result" data-testid="api-result" style={{fontSize: '13px', color: '#475569'}}>
              Not yet fetched.
            </pre>
          </div>
        </div>

        {/* Inline script: runs deterministic events on page load for sandbox capture */}
        <script dangerouslySetInnerHTML={{ __html: `
(function() {
  // ── On load: emit deterministic console events ───────────────────────────
  console.log('[BetaWindow Target] Page mounted — console.log OK');
  console.warn('[BetaWindow Target] Sample warning — console.warn OK');
  console.error('[BetaWindow Target] Sample error — console.error OK (intentional)');

  // ── Update JS status badge ───────────────────────────────────────────────
  document.getElementById('js-status').textContent = 'Active';
  document.getElementById('js-status').className = 'badge badge-green';

  var output = document.getElementById('log-output');
  function appendLog(msg) {
    var ts = new Date().toISOString().substr(11, 8);
    output.textContent += '[' + ts + '] ' + msg + '\\n';
  }
  appendLog('Page loaded — JS active');

  // ── On load: make a deterministic fetch call ─────────────────────────────
  var params = new URLSearchParams(window.location.search);
  var bypass = params.get('x-vercel-protection-bypass') || '';
  var pingUrl = '/api/playground/ping?source=autoload' + (bypass ? '&x-vercel-protection-bypass=' + bypass : '');
  fetch(pingUrl)
    .then(function(r) {
      document.getElementById('api-status').textContent = r.ok ? 'OK (' + r.status + ')' : 'Error (' + r.status + ')';
      document.getElementById('api-status').className = r.ok ? 'badge badge-green' : 'badge badge-red';
      return r.json();
    })
    .then(function(data) {
      document.getElementById('api-result').textContent = JSON.stringify(data, null, 2);
      appendLog('fetch /api/playground/ping → ' + data.status);
      console.log('[BetaWindow Target] fetch /api/playground/ping → ' + JSON.stringify(data));
    })
    .catch(function(e) {
      appendLog('fetch error: ' + e.message);
      console.error('[BetaWindow Target] fetch failed: ' + e.message);
    });

  // ── Button: emit console.log ─────────────────────────────────────────────
  document.getElementById('btn-log').addEventListener('click', function() {
    var msg = '[BetaWindow Target] User clicked btn-log at ' + Date.now();
    console.log(msg);
    appendLog('console.log emitted');
  });

  // ── Button: emit console.warn ────────────────────────────────────────────
  document.getElementById('btn-warn').addEventListener('click', function() {
    var msg = '[BetaWindow Target] User clicked btn-warn at ' + Date.now();
    console.warn(msg);
    appendLog('console.warn emitted');
  });

  // ── Button: emit console.error ───────────────────────────────────────────
  document.getElementById('btn-error').addEventListener('click', function() {
    var msg = '[BetaWindow Target] User clicked btn-error at ' + Date.now();
    console.error(msg);
    appendLog('console.error emitted');
  });

  // ── Button: trigger fetch ────────────────────────────────────────────────
  document.getElementById('btn-fetch').addEventListener('click', function() {
    appendLog('fetch triggered...');
    var params = new URLSearchParams(window.location.search);
    var bypass = params.get('x-vercel-protection-bypass') || '';
    var fetchUrl = '/api/playground/ping?source=button&ts=' + Date.now() + (bypass ? '&x-vercel-protection-bypass=' + bypass : '');
    fetch(fetchUrl)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        appendLog('fetch → ' + data.status);
        console.log('[BetaWindow Target] manual fetch result: ' + JSON.stringify(data));
        document.getElementById('api-result').textContent = JSON.stringify(data, null, 2);
      })
      .catch(function(e) {
        appendLog('fetch error: ' + e.message);
        console.error('[BetaWindow Target] manual fetch failed: ' + e.message);
      });
  });
})();
        `}} />
      </body>
    </html>
  )
}
