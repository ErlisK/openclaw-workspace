/**
 * click-snapshot.spec.ts — click capture and DOM snapshot tests
 *
 * Tests that:
 * - click events are captured with correct shape (tag, text, x, y, selector path)
 * - dom_snapshot events are generated on page load
 * - snapshot payload has a structural tree with tag/attrs/children
 * - both event types are relayed via postMessage with correct event_type
 * - both can be persisted to the session_events API
 * - window.__agentqa__.snapshot() can trigger a manual snapshot
 */

import { test, expect, APIRequestContext } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const BYPASS = process.env.VERCEL_BYPASS_TOKEN || ''
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://sreaczlbclzysmntltdf.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ''

function url(path: string) {
  const u = `${BASE_URL}${path}`
  return BYPASS ? `${u}${u.includes('?') ? '&' : '?'}x-vercel-protection-bypass=${BYPASS}` : u
}
function bypassCookies() {
  return BYPASS ? [{ name: 'x-vercel-protection-bypass', value: BYPASS, url: BASE_URL }] : []
}
function bearer(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Cookie: BYPASS ? `x-vercel-protection-bypass=${BYPASS}` : '',
  }
}

async function signUp(request: APIRequestContext, email: string, password: string) {
  if (!SUPABASE_ANON_KEY) return null
  const res = await request.post(`${SUPABASE_URL}/auth/v1/signup`, {
    data: { email, password },
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
  })
  return ((await res.json()).access_token as string) ?? null
}

const RUN_ID = Date.now()
const PASSWORD = `ClickPw${RUN_ID}!`

// ─── Minimal logger script for tests ─────────────────────────
function loggerScript(sessionId: string) {
  return `
(function(SESSION_ID) {
  'use strict';
  var buf = [];
  function now() { return new Date().toISOString(); }
  function flush() {
    if (!buf.length) return;
    var events = buf.splice(0);
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'agentqa_event_batch', events: events, session: SESSION_ID }, '*');
      }
    } catch(e) {}
  }
  function queue(ev) { buf.push(ev); flush(); }

  // ─── Click capture ────────────────────────────────────────
  document.addEventListener('click', function(e) {
    try {
      var t = e.target;
      if (!t || !(t instanceof Element)) return;
      function describeEl(el) {
        if (!el || !(el instanceof Element)) return '';
        var tag = el.tagName.toLowerCase();
        var id = el.id ? '#' + el.id : '';
        var cls = el.className && typeof el.className === 'string'
          ? '.' + el.className.trim().replace(/\\s+/g, '.').slice(0, 40) : '';
        var txt = (el.textContent || '').trim().slice(0, 60);
        return tag + id + cls + (txt ? '[' + txt + ']' : '');
      }
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
  }, true);

  // ─── DOM snapshot ─────────────────────────────────────────
  var _lastSnapshot = 0;
  function takeSnapshot(trigger) {
    var now_ms = Date.now();
    if (now_ms - _lastSnapshot < 100) return; // relaxed cooldown for tests
    _lastSnapshot = now_ms;
    try {
      function snapshotNode(el, depth) {
        if (!el || !(el instanceof Element)) return null;
        if (depth > 5) return { tag: '...' };
        var tag = el.tagName.toLowerCase();
        if (['script','style','noscript'].indexOf(tag) !== -1) return null;
        var attrs = {};
        var keep = ['id','class','href','src','type','name','role','aria-label'];
        for (var i = 0; i < keep.length; i++) {
          var v = el.getAttribute(keep[i]);
          if (v) attrs[keep[i]] = v.slice(0, 80);
        }
        var children = [];
        for (var j = 0; j < Math.min(el.children.length, 12); j++) {
          var c = snapshotNode(el.children[j], depth + 1);
          if (c) children.push(c);
        }
        var node = { tag: tag };
        if (Object.keys(attrs).length) node['attrs'] = attrs;
        if (children.length) node['children'] = children;
        return node;
      }
      queue({
        event_type: 'dom_snapshot',
        ts: now(),
        log_message: 'DOM snapshot: ' + trigger,
        payload: { trigger: trigger, snapshot: snapshotNode(document.body, 0) },
      });
    } catch(e) {}
  }

  window.__agentqa__ = {
    session: SESSION_ID,
    flush: flush,
    queue: queue,
    snapshot: function(t) { takeSnapshot(t || 'manual'); },
  };

  // Auto snapshot on load
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(function() { takeSnapshot('load'); }, 50);
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(function() { takeSnapshot('DOMContentLoaded'); }, 50);
    });
  }
})(${JSON.stringify(sessionId)});
`
}

// ─── Unit: click event shape ──────────────────────────────────

test.describe('Click capture — event shape', () => {
  test('clicking a button produces a click event with correct fields', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    const clickEvent = await page.evaluate((script: string) => {
      return new Promise<{
        event_type: string
        log_message: string
        payload: { tag: string; text: string | null; x: number; y: number }
      } | null>((resolve) => {
        const timer = setTimeout(() => resolve(null), 6000)

        window.addEventListener('message', function handler(e) {
          if (e.data?.type === 'agentqa_event_batch') {
            const click = e.data.events.find(
              (ev: { event_type: string }) => ev.event_type === 'click'
            )
            if (click) {
              clearTimeout(timer)
              window.removeEventListener('message', handler)
              resolve(click)
            }
          }
        })

        const iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        const safeScript = script.replace(/<\/script>/g, '<\\/script>')
        iframe.srcdoc = `<!DOCTYPE html><html><head><script>${safeScript}<\/script></head>
<body><button id="test-btn">Click me!</button>
<script>document.getElementById('test-btn').addEventListener('click', function() {});<\/script>
</body></html>`
        document.body.appendChild(iframe)

        iframe.onload = function() {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
            if (iframeDoc) {
              const btn = iframeDoc.getElementById('test-btn')
              if (btn) btn.click()
            }
          } catch(e) { /* cross-origin safe */ }
        }
      })
    }, loggerScript(`click-test-${RUN_ID}`))

    expect(clickEvent).toBeTruthy()
    expect(clickEvent?.event_type).toBe('click')
    expect(clickEvent?.log_message).toBeTruthy() // selector path
    expect(clickEvent?.payload).toBeTruthy()
    expect(clickEvent?.payload.tag).toBe('button')
    expect(clickEvent?.payload.text).toContain('Click me')
    expect(typeof clickEvent?.payload.x).toBe('number')
    expect(typeof clickEvent?.payload.y).toBe('number')
  })

  test('click event log_message contains selector breadcrumb', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    const clickEvent = await page.evaluate((script: string) => {
      return new Promise<{ log_message: string } | null>((resolve) => {
        const timer = setTimeout(() => resolve(null), 6000)
        window.addEventListener('message', function handler(e) {
          if (e.data?.type === 'agentqa_event_batch') {
            const click = e.data.events.find((ev: { event_type: string }) => ev.event_type === 'click')
            if (click) { clearTimeout(timer); window.removeEventListener('message', handler); resolve(click) }
          }
        })
        const iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        const safeScript = script.replace(/<\/script>/g, '<\\/script>')
        iframe.srcdoc = `<!DOCTYPE html><html><head><script>${safeScript}<\/script></head>
<body><div id="wrapper"><span id="inner">Link text</span></div>
<script>setTimeout(function(){document.getElementById('inner').click();},100);<\/script>
</body></html>`
        document.body.appendChild(iframe)
      })
    }, loggerScript(`click-breadcrumb-${RUN_ID}`))

    expect(clickEvent?.log_message).toContain('>')  // breadcrumb separator
  })

  test('click payload has id field when element has id', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    const clickEvent = await page.evaluate((script: string) => {
      return new Promise<{ payload: { id: string | null } } | null>((resolve) => {
        const timer = setTimeout(() => resolve(null), 6000)
        window.addEventListener('message', function handler(e) {
          if (e.data?.type === 'agentqa_event_batch') {
            const click = e.data.events.find((ev: { event_type: string }) => ev.event_type === 'click')
            if (click) { clearTimeout(timer); window.removeEventListener('message', handler); resolve(click) }
          }
        })
        const iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        const safeScript = script.replace(/<\/script>/g, '<\\/script>')
        iframe.srcdoc = `<!DOCTYPE html><html><head><script>${safeScript}<\/script></head>
<body><a id="my-link" href="#">My link</a>
<script>setTimeout(function(){document.getElementById('my-link').click();},100);<\/script>
</body></html>`
        document.body.appendChild(iframe)
      })
    }, loggerScript(`click-id-${RUN_ID}`))

    expect(clickEvent?.payload.id).toBe('my-link')
  })
})

// ─── Unit: DOM snapshot shape ─────────────────────────────────

test.describe('DOM snapshot — event shape', () => {
  test('dom_snapshot event is produced on page load', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    const snapEvent = await page.evaluate((script: string) => {
      return new Promise<{
        event_type: string
        log_message: string
        payload: { trigger: string; snapshot: { tag: string } }
      } | null>((resolve) => {
        const timer = setTimeout(() => resolve(null), 6000)
        window.addEventListener('message', function handler(e) {
          if (e.data?.type === 'agentqa_event_batch') {
            const snap = e.data.events.find(
              (ev: { event_type: string }) => ev.event_type === 'dom_snapshot'
            )
            if (snap) { clearTimeout(timer); window.removeEventListener('message', handler); resolve(snap) }
          }
        })
        const iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        const safeScript = script.replace(/<\/script>/g, '<\\/script>')
        iframe.srcdoc = `<!DOCTYPE html><html><head><script>${safeScript}<\/script></head><body><h1>Hello</h1></body></html>`
        document.body.appendChild(iframe)
      })
    }, loggerScript(`snap-load-${RUN_ID}`))

    expect(snapEvent).toBeTruthy()
    expect(snapEvent?.event_type).toBe('dom_snapshot')
    expect(snapEvent?.log_message).toContain('DOM snapshot')
    expect(snapEvent?.payload.trigger).toBeTruthy()
    expect(snapEvent?.payload.snapshot).toBeTruthy()
    expect(snapEvent?.payload.snapshot.tag).toBe('body')
  })

  test('dom_snapshot payload has structural tree with tag/children', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    const snapEvent = await page.evaluate((script: string) => {
      return new Promise<{ payload: { snapshot: { tag: string; children?: unknown[] } } } | null>((resolve) => {
        const timer = setTimeout(() => resolve(null), 6000)
        window.addEventListener('message', function handler(e) {
          if (e.data?.type === 'agentqa_event_batch') {
            const snap = e.data.events.find((ev: { event_type: string }) => ev.event_type === 'dom_snapshot')
            if (snap) { clearTimeout(timer); window.removeEventListener('message', handler); resolve(snap) }
          }
        })
        const iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        const safeScript = script.replace(/<\/script>/g, '<\\/script>')
        iframe.srcdoc = `<!DOCTYPE html><html><head><script>${safeScript}<\/script></head>
<body>
  <header id="hdr"><nav><a href="/">Home</a></nav></header>
  <main><h1>Page</h1><p>Content</p></main>
</body></html>`
        document.body.appendChild(iframe)
      })
    }, loggerScript(`snap-tree-${RUN_ID}`))

    const snapshot = snapEvent?.payload.snapshot
    expect(snapshot?.tag).toBe('body')
    expect(Array.isArray(snapshot?.children)).toBe(true)
    expect((snapshot?.children ?? []).length).toBeGreaterThan(0)

    // Verify tree structure: should contain header or main
    const childTags = ((snapshot?.children ?? []) as Array<{ tag: string }>).map(c => c.tag)
    expect(childTags.some(t => ['header', 'main', 'div', 'section'].includes(t))).toBe(true)
  })

  test('snapshot captures element attrs (id, class)', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    const snapEvent = await page.evaluate((script: string) => {
      return new Promise<{ payload: { snapshot: unknown } } | null>((resolve) => {
        const timer = setTimeout(() => resolve(null), 6000)
        window.addEventListener('message', function handler(e) {
          if (e.data?.type === 'agentqa_event_batch') {
            const snap = e.data.events.find((ev: { event_type: string }) => ev.event_type === 'dom_snapshot')
            if (snap) { clearTimeout(timer); window.removeEventListener('message', handler); resolve(snap) }
          }
        })
        const iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        const safeScript = script.replace(/<\/script>/g, '<\\/script>')
        iframe.srcdoc = `<!DOCTYPE html><html><head><script>${safeScript}<\/script></head>
<body>
  <div id="container" class="main-content">Hello</div>
</body></html>`
        document.body.appendChild(iframe)
      })
    }, loggerScript(`snap-attrs-${RUN_ID}`))

    // Find a node with id=container
    function findNode(node: unknown, id: string): boolean {
      if (!node || typeof node !== 'object') return false
      const n = node as { tag: string; attrs?: Record<string, string>; children?: unknown[] }
      if (n.attrs?.id === id) return true
      return (n.children ?? []).some(c => findNode(c, id))
    }

    expect(findNode(snapEvent?.payload.snapshot, 'container')).toBe(true)
  })

  test('manual snapshot via window.__agentqa__.snapshot()', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    const snapEvent = await page.evaluate((script: string) => {
      return new Promise<{ event_type: string; payload: { trigger: string } } | null>((resolve) => {
        const timer = setTimeout(() => resolve(null), 8000)

        // Collect all messages and look for manual trigger
        window.addEventListener('message', function handler(e) {
          if (e.data?.type === 'agentqa_event_batch') {
            const snap = e.data.events.find(
              (ev: { event_type: string; payload?: { trigger?: string } }) =>
                ev.event_type === 'dom_snapshot' && ev.payload?.trigger === 'manual'
            )
            if (snap) { clearTimeout(timer); window.removeEventListener('message', handler); resolve(snap) }
          }
        })

        const iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        const safeScript = script.replace(/<\/script>/g, '<\\/script>')
        iframe.srcdoc = `<!DOCTYPE html><html><head><script>${safeScript}<\/script></head>
<body><div>Content</div>
<script>
  // Trigger manual snapshot after a short delay
  setTimeout(function() {
    if (window.__agentqa__) window.__agentqa__.snapshot('manual');
  }, 200);
<\/script>
</body></html>`
        document.body.appendChild(iframe)
      })
    }, loggerScript(`snap-manual-${RUN_ID}`))

    expect(snapEvent).toBeTruthy()
    expect(snapEvent?.event_type).toBe('dom_snapshot')
    expect(snapEvent?.payload.trigger).toBe('manual')
  })
})

// ─── API persistence: click + dom_snapshot ─────────────────

test.describe('Click + DOM snapshot — API persistence', () => {
  let token: string | null = null
  let sessionId: string | null = null

  function getUserId(t: string) {
    try {
      const p = t.split('.')[1] + '=='
      return JSON.parse(Buffer.from(p, 'base64').toString()).sub ?? ''
    } catch { return '' }
  }

  test.beforeAll(async ({ request }) => {
    if (!SUPABASE_ANON_KEY) return

    const clientToken = await signUp(request, `csnap.client.${RUN_ID}@mailinator.com`, PASSWORD)
    token = await signUp(request, `csnap.tester.${RUN_ID}@mailinator.com`, PASSWORD)
    if (!clientToken || !token) return

    const testerUid = getUserId(token)

    const jobRes = await request.post(url('/api/jobs'), {
      data: { title: `Click Test ${RUN_ID}`, url: 'https://example.com', tier: 'quick' },
      headers: bearer(clientToken),
    })
    const { job } = await jobRes.json()
    if (!job?.id) return

    await request.post(url(`/api/jobs/${job.id}/transition`), {
      data: { to: 'published' },
      headers: bearer(clientToken),
    })

    const asgRes = await request.post(`${SUPABASE_URL}/rest/v1/job_assignments`, {
      data: { job_id: job.id, tester_id: testerUid, status: 'active', assigned_at: new Date().toISOString() },
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
    })
    const asgBody = await asgRes.json()
    if (!Array.isArray(asgBody) || !asgBody[0]?.id) return

    const sessRes = await request.post(url('/api/sessions'), {
      data: { assignment_id: asgBody[0].id, job_id: job.id },
      headers: bearer(token),
    })
    if (sessRes.status() === 201) {
      const { session } = await sessRes.json()
      sessionId = session?.id ?? null
    }
  })

  test('POST click event → 201 + inserted=1', async ({ request }) => {
    if (!token || !sessionId) { test.skip(true, 'Session not available'); return }

    const res = await request.post(url(`/api/sessions/${sessionId}/events`), {
      data: {
        event_type: 'click',
        ts: new Date().toISOString(),
        log_message: 'body > div.container > button#submit[Submit]',
        payload: { tag: 'button', id: 'submit', class: null, text: 'Submit', x: 120, y: 80 },
      },
      headers: bearer(token),
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.inserted).toBe(1)
  })

  test('POST dom_snapshot event → 201 + inserted=1', async ({ request }) => {
    if (!token || !sessionId) { test.skip(true, 'Session not available'); return }

    const res = await request.post(url(`/api/sessions/${sessionId}/events`), {
      data: {
        event_type: 'dom_snapshot',
        ts: new Date().toISOString(),
        log_message: 'DOM snapshot: load',
        payload: {
          trigger: 'load',
          snapshot: {
            tag: 'body',
            children: [
              { tag: 'header', attrs: { id: 'hdr' }, children: [] },
              { tag: 'main', children: [{ tag: 'h1' }] },
            ],
          },
        },
      },
      headers: bearer(token),
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.inserted).toBe(1)
  })

  test('GET events — click and dom_snapshot appear in results', async ({ request }) => {
    if (!token || !sessionId) { test.skip(true, 'Session not available'); return }

    const res = await request.get(url(`/api/sessions/${sessionId}/events`), {
      headers: bearer(token),
    })
    expect(res.status()).toBe(200)
    const { events } = await res.json()

    const types = (events as Array<{ event_type: string }>).map(e => e.event_type)
    expect(types).toContain('click')
    expect(types).toContain('dom_snapshot')
  })

  test('click event payload is stored and retrievable as JSONB', async ({ request }) => {
    if (!token || !sessionId) { test.skip(true, 'Session not available'); return }

    const res = await request.get(url(`/api/sessions/${sessionId}/events`), {
      headers: bearer(token),
    })
    const { events } = await res.json()
    const clickEv = (events as Array<{ event_type: string; payload?: { tag?: string; x?: number } }>)
      .find(e => e.event_type === 'click')

    expect(clickEv?.payload?.tag).toBe('button')
    expect(typeof clickEv?.payload?.x).toBe('number')
  })
})
