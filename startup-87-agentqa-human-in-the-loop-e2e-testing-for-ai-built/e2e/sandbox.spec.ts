/**
 * sandbox.spec.ts — Sandbox runner E2E tests
 *
 * Tests:
 * - /api/sessions: create session, guard checks
 * - /api/sessions/[id]/events: ingest and retrieve events
 * - /run/[sessionId]: page loads, iframe renders, log panel visible
 * - At least 1 network + 1 console event recorded
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
const CLIENT_EMAIL = `sandbox.client.${RUN_ID}@mailinator.com`
const TESTER_EMAIL  = `sandbox.tester.${RUN_ID}@mailinator.com`
const PASSWORD = `SbPw${RUN_ID}!`

async function signUp(request: APIRequestContext, email: string, password: string) {
  if (!SUPABASE_ANON_KEY) return null
  const res = await request.post(`${SUPABASE_URL}/auth/v1/signup`, {
    data: { email, password },
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
  })
  const body = await res.json()
  return body.access_token as string ?? null
}

function bearer(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Cookie: BYPASS ? `x-vercel-protection-bypass=${BYPASS}` : '',
  }
}

function getUserId(token: string): string {
  try {
    const parts = token.split('.')
    const padded = parts[1] + '=='.repeat(4)
    const decoded = Buffer.from(padded.slice(0, padded.length - padded.length % 4), 'base64').toString()
    return JSON.parse(decoded).sub ?? ''
  } catch { return '' }
}

// ─── API guards ───────────────────────────────────────────────

test.describe('Sessions API — Auth Guards', () => {
  test('POST /api/sessions → 401 without auth', async ({ request }) => {
    const res = await request.post(url('/api/sessions'), {
      data: { assignment_id: 'fake', job_id: 'fake' },
    })
    expect(res.status()).toBe(401)
  })

  test('POST /api/sessions/[id]/events → 401 without auth', async ({ request }) => {
    const res = await request.post(url('/api/sessions/fake-id/events'), {
      data: { event_type: 'console_log', log_message: 'test' },
    })
    expect(res.status()).toBe(401)
  })

  test('GET /api/sessions/[id]/events → 401 without auth', async ({ request }) => {
    const res = await request.get(url('/api/sessions/fake-id/events'))
    expect(res.status()).toBe(401)
  })

  test('GET /api/sessions/[id] → 401 without auth', async ({ request }) => {
    const res = await request.get(url('/api/sessions/fake-id'))
    expect(res.status()).toBe(401)
  })
})

// ─── Full session flow (individual tests — each step builds on previous) ──────

test.describe('Session + Events — Full Flow', () => {
  let clientToken: string | null = null
  let testerToken: string | null = null
  let jobId: string | null = null
  let assignmentId: string | null = null
  let sessionId: string | null = null

  test.beforeAll(async ({ request }) => {
    if (!SUPABASE_ANON_KEY) return
    clientToken = await signUp(request, CLIENT_EMAIL, PASSWORD)
    testerToken = await signUp(request, TESTER_EMAIL, PASSWORD)
  })

  test('0. Setup: create job + publish + assign via Supabase direct', async ({ request }) => {
    if (!clientToken || !testerToken) { test.skip(true, 'Auth unavailable'); return }

    // Set tester role
    await request.patch(url('/api/profile'), {
      data: { role: 'tester', is_tester: true },
      headers: bearer(testerToken),
    })

    // Create job
    const createRes = await request.post(url('/api/jobs'), {
      data: { title: `Sandbox E2E ${RUN_ID}`, url: 'https://example.com', tier: 'quick', instructions: 'Load the page and verify the title.' },
      headers: bearer(clientToken),
    })
    expect(createRes.status()).toBe(201)
    const { job } = await createRes.json()
    jobId = job.id
    expect(jobId).toBeTruthy()

    // Publish
    const pubRes = await request.post(url(`/api/jobs/${jobId}/transition`), {
      data: { to: 'published' },
      headers: bearer(clientToken),
    })
    expect(pubRes.status()).toBe(200)

    // Tester gets their user ID and inserts assignment directly via Supabase API
    const testerUid = getUserId(testerToken)
    expect(testerUid).toBeTruthy()

    const asgRes = await request.post(`${SUPABASE_URL}/rest/v1/job_assignments`, {
      data: {
        job_id: jobId,
        tester_id: testerUid,
        status: 'active',
        assigned_at: new Date().toISOString(),
      },
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${testerToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
    })
    const asgBody = await asgRes.json()
    if (Array.isArray(asgBody) && asgBody.length > 0) {
      assignmentId = asgBody[0].id
    }

    // Even if direct insert failed, try via claim endpoint
    if (!assignmentId) {
      const claimRes = await request.post(url(`/api/jobs/${jobId}/claim`), {
        headers: bearer(testerToken),
      })
      if (claimRes.status() === 201) {
        const claimBody = await claimRes.json()
        assignmentId = claimBody.assignment?.id ?? null
      }
    }

    expect(assignmentId).toBeTruthy()
  })

  test('1. Cannot create session for missing assignment', async ({ request }) => {
    if (!testerToken) { test.skip(true, 'Auth unavailable'); return }
    const res = await request.post(url('/api/sessions'), {
      data: { assignment_id: '00000000-0000-0000-0000-000000000000', job_id: '00000000-0000-0000-0000-000000000000' },
      headers: bearer(testerToken),
    })
    expect([404, 409]).toContain(res.status())
  })

  test('2. Tester creates a session for their assignment', async ({ request }) => {
    if (!testerToken || !assignmentId || !jobId) { test.skip(true, 'Requires setup step'); return }

    const res = await request.post(url('/api/sessions'), {
      data: {
        assignment_id: assignmentId,
        job_id: jobId,
        browser: 'chromium',
        viewport_width: 1280,
        viewport_height: 800,
      },
      headers: bearer(testerToken),
    })
    expect(res.status()).toBe(201)
    const { session } = await res.json()
    expect(session.id).toBeTruthy()
    expect(session.status).toBe('active')
    expect(session.assignment_id).toBe(assignmentId)
    sessionId = session.id
  })

  test('3. Creating session again returns same active session (idempotent)', async ({ request }) => {
    if (!testerToken || !assignmentId || !jobId) { test.skip(true, 'Requires setup step'); return }

    const res = await request.post(url('/api/sessions'), {
      data: { assignment_id: assignmentId, job_id: jobId },
      headers: bearer(testerToken),
    })
    expect([200, 201]).toContain(res.status())
    const body = await res.json()
    if (sessionId) expect(body.session.id).toBe(sessionId)
  })

  test('4. Ingest a network event into the session', async ({ request }) => {
    if (!testerToken || !sessionId) { test.skip(true, 'Requires session'); return }

    const res = await request.post(url(`/api/sessions/${sessionId}/events`), {
      data: { event_type: 'network_request', ts: new Date().toISOString(), method: 'GET', request_url: 'https://example.com' },
      headers: bearer(testerToken),
    })
    expect(res.status()).toBe(201)
    const { inserted } = await res.json()
    expect(inserted).toBe(1)
  })

  test('5. Ingest a console event into the session', async ({ request }) => {
    if (!testerToken || !sessionId) { test.skip(true, 'Requires session'); return }

    const res = await request.post(url(`/api/sessions/${sessionId}/events`), {
      data: { event_type: 'console_log', ts: new Date().toISOString(), log_level: 'info', log_message: 'E2E test console event' },
      headers: bearer(testerToken),
    })
    expect(res.status()).toBe(201)
    const { inserted } = await res.json()
    expect(inserted).toBe(1)
  })

  test('6. Ingest a batch of events', async ({ request }) => {
    if (!testerToken || !sessionId) { test.skip(true, 'Requires session'); return }

    const events = [
      { event_type: 'network_response', method: 'GET', request_url: 'https://example.com', status_code: 200, response_time_ms: 143 },
      { event_type: 'console_log', log_level: 'warn', log_message: 'Deprecated API' },
      { event_type: 'navigation', request_url: 'https://example.com/about', log_message: 'navigated' },
    ]
    const res = await request.post(url(`/api/sessions/${sessionId}/events`), {
      data: events,
      headers: bearer(testerToken),
    })
    expect(res.status()).toBe(201)
    const { inserted } = await res.json()
    expect(inserted).toBe(3)
  })

  test('7. Retrieve events — at least 1 network and 1 console event exist', async ({ request }) => {
    if (!testerToken || !sessionId) { test.skip(true, 'Requires session'); return }

    const res = await request.get(url(`/api/sessions/${sessionId}/events`), { headers: bearer(testerToken) })
    expect(res.status()).toBe(200)
    const { events, count } = await res.json()
    expect(count).toBeGreaterThanOrEqual(4)

    const networkEvents = events.filter((e: { event_type: string }) => ['network_request', 'network_response'].includes(e.event_type))
    const consoleEvents = events.filter((e: { event_type: string }) => e.event_type === 'console_log')
    expect(networkEvents.length).toBeGreaterThanOrEqual(1)
    expect(consoleEvents.length).toBeGreaterThanOrEqual(1)
  })

  test('8. Filter events by type', async ({ request }) => {
    if (!testerToken || !sessionId) { test.skip(true, 'Requires session'); return }

    const res = await request.get(url(`/api/sessions/${sessionId}/events?type=console_log`), { headers: bearer(testerToken) })
    expect(res.status()).toBe(200)
    const { events } = await res.json()
    expect(events.every((e: { event_type: string }) => e.event_type === 'console_log')).toBe(true)
  })

  test('9. Client can also retrieve session events', async ({ request }) => {
    if (!clientToken || !sessionId) { test.skip(true, 'Requires session'); return }

    const res = await request.get(url(`/api/sessions/${sessionId}/events`), { headers: bearer(clientToken) })
    expect(res.status()).toBe(200)
  })

  test('10. Tester cannot inject events into another session', async ({ request }) => {
    const otherToken = await signUp(request, `other.sb.${RUN_ID}@mailinator.com`, PASSWORD)
    if (!otherToken || !sessionId) { test.skip(true, 'Requires auth'); return }

    const res = await request.post(url(`/api/sessions/${sessionId}/events`), {
      data: { event_type: 'console_log', log_message: 'Injected!' },
      headers: bearer(otherToken),
    })
    expect(res.status()).toBe(403)
  })

  test('11. Session can be marked complete via PATCH', async ({ request }) => {
    if (!testerToken || !sessionId) { test.skip(true, 'Requires session'); return }

    const res = await request.patch(url(`/api/sessions/${sessionId}`), {
      data: { status: 'complete' },
      headers: bearer(testerToken),
    })
    expect(res.status()).toBe(200)
    const { session } = await res.json()
    expect(session.status).toBe('complete')
    expect(session.ended_at).toBeTruthy()
  })
})

// ─── Sandbox UI tests (browser) ──────────────────────────────

test.describe('Sandbox Run Page — UI', () => {
  function bypassCookie() {
    return BYPASS ? [{ name: 'x-vercel-protection-bypass', value: BYPASS, url: BASE_URL }] : []
  }

  test('/run/[id] redirects to login when not authenticated', async ({ page }) => {
    await page.context().addCookies(bypassCookie())
    await page.goto(url('/run/00000000-0000-0000-0000-000000000000'))
    await expect(page).toHaveURL(/login/)
  })

  test('/run/[fake-id] returns 404 when session does not exist (authenticated)', async ({ page }) => {
    await page.context().addCookies(bypassCookie())
    await page.goto(url('/signup'))
    await page.fill('input[type="email"]', `run.ui.${Date.now()}@mailinator.com`)
    await page.fill('input[type="password"]', PASSWORD)
    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(2000)

    if (page.url().includes('/login') || page.url().includes('/signup')) {
      test.skip(true, 'Email confirmation required')
      return
    }

    await page.goto(url('/run/00000000-0000-0000-0000-000000000000'))
    const bodyText = await page.locator('body').textContent() ?? ''
    const is404 = bodyText.includes('404') || bodyText.includes('not found') || bodyText.includes('Not Found')
    expect(is404).toBeTruthy()
  })

  test('sandbox page structure: iframe + log panel tabs visible', async ({ page, request }) => {
    if (!SUPABASE_ANON_KEY) { test.skip(true, 'SUPABASE_ANON_KEY required'); return }

    const runId = Date.now()
    const cTok = await signUp(request, `sb.ui.c.${runId}@mailinator.com`, PASSWORD)
    const tTok = await signUp(request, `sb.ui.t.${runId}@mailinator.com`, PASSWORD)
    if (!cTok || !tTok) { test.skip(true, 'Auth unavailable'); return }

    const tUid = getUserId(tTok)
    await request.patch(url('/api/profile'), { data: { role: 'tester', is_tester: true }, headers: bearer(tTok) })

    const jobRes = await request.post(url('/api/jobs'), {
      data: { title: `UI Sandbox ${runId}`, url: 'https://example.com', tier: 'quick' },
      headers: bearer(cTok),
    })
    const { job } = await jobRes.json()
    await request.post(url(`/api/jobs/${job.id}/transition`), { data: { to: 'published' }, headers: bearer(cTok) })

    // Insert assignment directly
    const asgRes = await request.post(`${SUPABASE_URL}/rest/v1/job_assignments`, {
      data: { job_id: job.id, tester_id: tUid, status: 'active', assigned_at: new Date().toISOString() },
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${tTok}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    })
    const asgBody = await asgRes.json()
    if (!Array.isArray(asgBody) || asgBody.length === 0) { test.skip(true, 'Assignment insert failed'); return }
    const asgId = asgBody[0].id

    const sessRes = await request.post(url('/api/sessions'), {
      data: { assignment_id: asgId, job_id: job.id },
      headers: bearer(tTok),
    })
    if (sessRes.status() !== 201) { test.skip(true, 'Session creation failed'); return }
    const { session } = await sessRes.json()

    // Visit via browser with localStorage token injection
    await page.context().addCookies(bypassCookie())
    await page.goto(url('/login'))
    await page.evaluate(
      ([sbUrl, token]) => {
        const key = `sb-${new URL(sbUrl as string).hostname.split('.')[0]}-auth-token`
        localStorage.setItem(key, JSON.stringify({ access_token: token, token_type: 'bearer' }))
      },
      [SUPABASE_URL, tTok]
    )

    await page.goto(url(`/run/${session.id}`))
    await page.waitForTimeout(3000)

    if (page.url().includes('/login')) {
      test.skip(true, 'localStorage token injection not supported by SSR auth')
      return
    }

    await expect(page.locator('[data-testid="sandbox-runner"]')).toBeVisible()
    await expect(page.locator('[data-testid="sandbox-iframe"]')).toBeVisible()
    await expect(page.locator('[data-testid="log-panel"]')).toBeVisible()
    await expect(page.locator('[data-testid="log-tab-all"]')).toBeVisible()
    await expect(page.locator('[data-testid="log-tab-network"]')).toBeVisible()
    await expect(page.locator('[data-testid="log-tab-console"]')).toBeVisible()
  })
})
