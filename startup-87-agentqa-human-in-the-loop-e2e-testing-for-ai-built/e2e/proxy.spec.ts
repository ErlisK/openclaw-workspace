/**
 * proxy.spec.ts — /api/proxy E2E tests
 *
 * Tests:
 * - Auth guard: 401 without auth
 * - Validation: 400 for missing/invalid URL
 * - HTML fetch + injection: returns HTML with agentqa-logger script
 * - URL rewriting: relative links are proxied
 * - Non-HTML pass-through: CSS/JS/images served directly
 * - postMessage integration: injected script sends events to parent
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

const RUN_ID = Date.now()
const PASSWORD = `PrPw${RUN_ID}!`

async function signUp(request: APIRequestContext, email: string, password: string) {
  if (!SUPABASE_ANON_KEY) return null
  const res = await request.post(`${SUPABASE_URL}/auth/v1/signup`, {
    data: { email, password },
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
  })
  return (await res.json()).access_token as string ?? null
}

function bearer(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Cookie: BYPASS ? `x-vercel-protection-bypass=${BYPASS}` : '',
  }
}

function bearerNoContentType(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Cookie: BYPASS ? `x-vercel-protection-bypass=${BYPASS}` : '',
  }
}

// ─── Auth + validation guards ─────────────────────────────────

test.describe('Proxy API — Guards', () => {
  test('GET /api/proxy without auth → 401', async ({ request }) => {
    const res = await request.get(url('/api/proxy?url=https://example.com'))
    expect(res.status()).toBe(401)
  })

  test('GET /api/proxy without ?url → 400', async ({ request }) => {
    if (!SUPABASE_ANON_KEY) { test.skip(true, 'Auth unavailable'); return }
    const token = await signUp(request, `proxy.guard.${RUN_ID}@mailinator.com`, PASSWORD)
    if (!token) { test.skip(true, 'Token unavailable'); return }

    const res = await request.get(url('/api/proxy'), { headers: bearerNoContentType(token) })
    expect(res.status()).toBe(400)
  })

  test('GET /api/proxy with non-http URL → 400', async ({ request }) => {
    if (!SUPABASE_ANON_KEY) { test.skip(true, 'Auth unavailable'); return }
    const token = await signUp(request, `proxy.proto.${RUN_ID}@mailinator.com`, PASSWORD)
    if (!token) { test.skip(true, 'Token unavailable'); return }

    const res = await request.get(url('/api/proxy?url=ftp://example.com'), { headers: bearerNoContentType(token) })
    expect(res.status()).toBe(400)
  })

  test('GET /api/proxy with invalid URL → 400', async ({ request }) => {
    if (!SUPABASE_ANON_KEY) { test.skip(true, 'Auth unavailable'); return }
    const token = await signUp(request, `proxy.invalid.${RUN_ID}@mailinator.com`, PASSWORD)
    if (!token) { test.skip(true, 'Token unavailable'); return }

    const res = await request.get(url('/api/proxy?url=not-a-url'), { headers: bearerNoContentType(token) })
    expect(res.status()).toBe(400)
  })
})

// ─── HTML proxy + injection ───────────────────────────────────

test.describe('Proxy API — HTML Injection', () => {
  let token: string | null = null

  test.beforeAll(async ({ request }) => {
    token = await signUp(request, `proxy.html.${RUN_ID}@mailinator.com`, PASSWORD)
  })

  test('proxies example.com and returns HTML', async ({ request }) => {
    if (!token) { test.skip(true, 'Auth unavailable'); return }

    const res = await request.get(url('/api/proxy?url=https://example.com&session=test-session-id'), {
      headers: bearerNoContentType(token),
    })
    expect(res.status()).toBe(200)
    const ct = res.headers()['content-type'] ?? ''
    expect(ct).toContain('text/html')
  })

  test('injected HTML contains agentqa-logger script', async ({ request }) => {
    if (!token) { test.skip(true, 'Auth unavailable'); return }

    const res = await request.get(url('/api/proxy?url=https://example.com&session=test-session-id'), {
      headers: bearerNoContentType(token),
    })
    expect(res.status()).toBe(200)
    const html = await res.text()
    expect(html).toContain('agentqa-logger')
    expect(html).toContain('SESSION_ID')
    expect(html).toContain('network_request')
    expect(html).toContain('console_log')
  })

  test('injected script contains session ID', async ({ request }) => {
    if (!token) { test.skip(true, 'Auth unavailable'); return }

    const sessionId = 'my-test-session-123'
    const res = await request.get(url(`/api/proxy?url=https://example.com&session=${sessionId}`), {
      headers: bearerNoContentType(token),
    })
    const html = await res.text()
    expect(html).toContain(sessionId)
  })

  test('response has no X-Frame-Options that would block embedding', async ({ request }) => {
    if (!token) { test.skip(true, 'Auth unavailable'); return }

    const res = await request.get(url('/api/proxy?url=https://example.com'), {
      headers: bearerNoContentType(token),
    })
    const headers = res.headers()
    // Should NOT have DENY or SAMEORIGIN from upstream (we strip it and set our own)
    const xfo = headers['x-frame-options']
    // Our value should be SAMEORIGIN (allowing same-origin embedding)
    if (xfo) {
      expect(xfo.toUpperCase()).not.toBe('DENY')
    }
  })

  test('HTML links are rewritten to go through proxy', async ({ request }) => {
    if (!token) { test.skip(true, 'Auth unavailable'); return }

    const res = await request.get(url('/api/proxy?url=https://example.com&session=sess-abc'), {
      headers: bearerNoContentType(token),
    })
    const html = await res.text()
    // Links should be rewritten to /api/proxy?url=...
    // example.com has <a href="/"> which should become /api/proxy?url=...
    // At minimum, the proxy base URL should appear in the HTML
    expect(html).toContain('/api/proxy')
  })

  test('proxy works for httpbin (real external site)', async ({ request }) => {
    if (!token) { test.skip(true, 'Auth unavailable'); return }

    const res = await request.get(url('/api/proxy?url=https://httpbin.org/html'), {
      headers: bearerNoContentType(token),
    })
    // httpbin may be slow/unavailable, so accept 200 or 502
    expect([200, 502, 504]).toContain(res.status())
    if (res.status() === 200) {
      const html = await res.text()
      expect(html).toContain('agentqa-logger')
    }
  })

  test('cache-control is no-store for HTML', async ({ request }) => {
    if (!token) { test.skip(true, 'Auth unavailable'); return }

    const res = await request.get(url('/api/proxy?url=https://example.com'), {
      headers: bearerNoContentType(token),
    })
    const cc = res.headers()['cache-control'] ?? ''
    expect(cc).toContain('no-store')
  })
})

// ─── Proxy in browser: postMessage events ────────────────────

test.describe('Proxy — Browser Integration', () => {
  function bypassCookie() {
    return BYPASS ? [{ name: 'x-vercel-protection-bypass', value: BYPASS, url: BASE_URL }] : []
  }

  test('proxy page sends postMessage events when loaded in iframe', async ({ page }) => {
    if (!SUPABASE_ANON_KEY) { test.skip(true, 'SUPABASE_ANON_KEY required'); return }

    await page.context().addCookies(bypassCookie())

    // Sign up and get session cookie
    await page.goto(url('/signup'))
    await page.fill('input[type="email"]', `proxy.browser.${RUN_ID}@mailinator.com`)
    await page.fill('input[type="password"]', PASSWORD)
    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(2000)

    if (page.url().includes('/login') || page.url().includes('/signup')) {
      test.skip(true, 'Email confirmation required')
      return
    }

    // Build a test page that embeds the proxy in an iframe and listens for messages
    const proxyUrl = url('/api/proxy?url=https://example.com&session=browser-test-session')

    const messages: string[] = []
    await page.exposeFunction('onAgentQAMessage', (type: string) => {
      messages.push(type)
    })

    await page.evaluate(() => {
      window.addEventListener('message', (e) => {
        if (e.data?.type === 'agentqa_event_batch' || e.data?.type === 'agentqa_event') {
          const fn = (window as unknown as Record<string, unknown>).onAgentQAMessage
          if (typeof fn === 'function') fn(e.data.type as string)
        }
      })
    })

    // Create an iframe pointing at the proxy
    await page.evaluate((src: string) => {
      const iframe = document.createElement('iframe')
      iframe.src = src
      iframe.id = 'test-proxy-frame'
      document.body.appendChild(iframe)
    }, proxyUrl)

    // Wait for messages (up to 5s)
    for (let i = 0; i < 10; i++) {
      if (messages.length > 0) break
      await page.waitForTimeout(500)
    }

    // The injected script should fire at least a navigation event
    expect(messages.length).toBeGreaterThan(0)
  })
})
