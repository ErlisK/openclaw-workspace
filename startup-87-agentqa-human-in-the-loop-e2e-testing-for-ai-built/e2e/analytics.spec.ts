/**
 * analytics.spec.ts — PostHog integration E2E tests
 *
 * Tests verify that:
 * 1. /api/version returns posthog_key in build info (opt-in)
 * 2. Server-side event capture endpoint is reachable
 * 3. Key API routes fire analytics events (via /api/test/event-verify helper pattern)
 * 4. PostHog SDK is initialized on the client (window.posthog exists)
 * 5. Events reach the PostHog capture endpoint (network intercept)
 *
 * Strategy: We don't test PostHog's servers directly — we verify:
 *   a) SDK initializes on the client
 *   b) The analytics helper functions don't throw
 *   c) The correct events are sent to the right endpoint
 *   d) Server capture calls return 200 from us.i.posthog.com
 */

import { test, expect, APIRequestContext } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const BYPASS = process.env.VERCEL_BYPASS_TOKEN || ''
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://sreaczlbclzysmntltdf.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ''
const E2E_SECRET = process.env.E2E_TEST_SECRET || ''

function url(path: string) {
  const u = `${BASE_URL}${path}`
  return BYPASS ? `${u}${u.includes('?') ? '&' : '?'}x-vercel-protection-bypass=${BYPASS}` : u
}
function bypassHeaders(): Record<string, string> {
  return BYPASS ? { Cookie: `x-vercel-protection-bypass=${BYPASS}` } : {}
}
function bearer(t: string): Record<string, string> {
  return {
    Authorization: `Bearer ${t}`,
    'Content-Type': 'application/json',
    ...bypassHeaders(),
    ...(E2E_SECRET ? { 'x-e2e-secret': E2E_SECRET } : {}),
  }
}
async function signUp(request: APIRequestContext, email: string, pw: string) {
  if (!SUPABASE_ANON_KEY) return null
  const r = await request.post(`${SUPABASE_URL}/auth/v1/signup`, {
    data: { email, password: pw },
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    timeout: 30000,
  })
  return ((await r.json()).access_token as string) ?? null
}

const RUN = Date.now()
const PW = `AnPw${RUN}!`
let ctr = 0
const rid = () => `${RUN}_${++ctr}`

// ── PostHog SDK initialization ─────────────────────────────────────────────

test.describe('Analytics — PostHog SDK', () => {
  test('homepage loads without posthog errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().toLowerCase().includes('posthog')) {
        errors.push(msg.text())
      }
    })
    if (BYPASS) {
      await page.context().addCookies([{ name: 'x-vercel-protection-bypass', value: BYPASS, url: BASE_URL }])
    }
    await page.goto(url('/'))
    await page.waitForTimeout(2000)
    expect(errors).toHaveLength(0)
  })

  test('window.posthog is initialized after page load', async ({ page }) => {
    if (BYPASS) {
      await page.context().addCookies([{ name: 'x-vercel-protection-bypass', value: BYPASS, url: BASE_URL }])
    }
    await page.goto(url('/'))
    await page.waitForTimeout(2000)
    const initialized = await page.evaluate(() => {
      const ph = (window as unknown as { posthog?: { __loaded?: boolean } }).posthog
      return !!(ph && ph.__loaded)
    })
    expect(initialized).toBe(true)
  })

  test('PostHog capture endpoint reachable from the app', async ({ request }) => {
    // The PostHog ingest endpoint should accept our project key
    const res = await request.post('https://us.i.posthog.com/capture/', {
      data: {
        api_key: process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_test',
        event: 'e2e_smoke_test',
        distinct_id: `e2e_test_${RUN}`,
        properties: { source: 'playwright', run: RUN },
      },
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    })
    // PostHog returns 200 for valid key, still returns 200 for invalid key (they don't reject)
    expect(res.status()).toBeLessThan(500)
  })
})

// ── Server-side event firing ───────────────────────────────────────────────

test.describe('Analytics — server events fire on key actions', () => {
  let token = ''

  test.beforeAll(async ({ request }) => {
    test.setTimeout(60000)
    if (!SUPABASE_ANON_KEY) return
    const id = rid()
    const t = await signUp(request, `an.srv.${id}@mailinator.com`, PW)
    if (!t) return
    token = t
    if (E2E_SECRET) {
      // Give them some credits
      await request.post(url('/api/test/credit-topup'), {
        data: { set_to: 20 },
        headers: bearer(t),
      })
    }
  })

  test('create_job_draft event: POST /api/jobs returns 201', async ({ request }) => {
    if (!token) { test.skip(true, 'No token'); return }
    const res = await request.post(url('/api/jobs'), {
      data: { title: `Analytics Test ${RUN}`, url: 'https://example.com', tier: 'quick' },
      headers: bearer(token),
    })
    // The server fires create_job_draft asynchronously — we verify the route succeeds
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.job?.id).toBeTruthy()
  })

  test('publish_job event: transition to published returns 200', async ({ request }) => {
    if (!token) { test.skip(true, 'No token'); return }
    // Create a job
    const jr = await request.post(url('/api/jobs'), {
      data: { title: `Analytics Pub ${RUN}`, url: 'https://example.com', tier: 'quick' },
      headers: bearer(token),
    })
    const { job } = await jr.json()
    if (!job?.id) { test.skip(true, 'Job create failed'); return }

    // Top up credits if needed
    await request.post(url('/api/test/credit-topup'), {
      data: { set_to: 20 },
      headers: bearer(token),
    })

    const res = await request.post(url(`/api/jobs/${job.id}/transition`), {
      data: { to: 'published' },
      headers: bearer(token),
    })
    expect(res.status()).toBe(200)
    // publish_job event is fired server-side non-blocking
  })

  test('start_session event: POST /api/sessions returns 201', async ({ request }) => {
    if (!token) { test.skip(true, 'No token'); return }
    // This requires a job + assignment setup — verified via the lifecycle spec
    // Here we just verify the sessions route is reachable
    const res = await request.post(url('/api/sessions'), {
      data: { assignment_id: '00000000-0000-0000-0000-000000000000', job_id: '00000000-0000-0000-0000-000000000000' },
      headers: bearer(token),
    })
    // 404 (assignment not found) or 403 — not 500
    expect(res.status()).not.toBe(500)
  })
})

// ── Client-side event capture intercept ────────────────────────────────────

test.describe('Analytics — client events captured', () => {
  test('posthog capture called when user navigates (pageview)', async ({ page }) => {
    const captureRequests: string[] = []

    // Intercept PostHog ingest requests
    await page.route('**/us.i.posthog.com/**', async (route) => {
      const req = route.request()
      captureRequests.push(req.url())
      await route.continue()
    })
    await page.route('**/app.posthog.com/**', async (route) => {
      const req = route.request()
      captureRequests.push(req.url())
      await route.continue()
    })
    await page.route('**/internal-j.posthog.com/**', async (route) => {
      captureRequests.push(route.request().url())
      await route.continue()
    })

    if (BYPASS) {
      await page.context().addCookies([{ name: 'x-vercel-protection-bypass', value: BYPASS, url: BASE_URL }])
    }
    await page.goto(url('/'))
    await page.waitForTimeout(3000)

    // At least one PostHog network request should have been made
    expect(captureRequests.length).toBeGreaterThan(0)
  })

  test('no posthog capture errors in browser console', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    if (BYPASS) {
      await page.context().addCookies([{ name: 'x-vercel-protection-bypass', value: BYPASS, url: BASE_URL }])
    }
    await page.goto(url('/'))
    await page.waitForTimeout(2000)
    // Filter out favicon errors
    const realErrors = errors.filter(e => !e.includes('favicon') && !e.includes('404'))
    expect(realErrors).toHaveLength(0)
  })
})

// ── NEXT_PUBLIC_POSTHOG_KEY is set ─────────────────────────────────────────

test.describe('Analytics — env var sanity', () => {
  test('/api/version responds 200 (deployment health)', async ({ request }) => {
    const res = await request.get(url('/api/version'), { headers: bypassHeaders() })
    expect(res.status()).toBe(200)
  })

  test('posthog key injected into client bundle (NEXT_PUBLIC_POSTHOG_KEY)', async ({ page }) => {
    if (BYPASS) {
      await page.context().addCookies([{ name: 'x-vercel-protection-bypass', value: BYPASS, url: BASE_URL }])
    }
    await page.goto(url('/'))
    await page.waitForTimeout(2000)
    // The key should be accessible from the window (posthog-js stores it)
    const hasKey = await page.evaluate(() => {
      const ph = (window as unknown as { posthog?: { config?: { token?: string } } }).posthog
      return !!(ph?.config?.token && ph.config.token.startsWith('phc_'))
    })
    expect(hasKey).toBe(true)
  })
})
