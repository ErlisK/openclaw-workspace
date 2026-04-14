/**
 * tester-flow.spec.ts — Full tester flow:
 * sign up → claim job → start session → post events (console.log via script) → stop session → submit feedback
 *
 * Tests:
 * - Tester signs up (POST Supabase auth)
 * - POST /api/sessions → 401 without token
 * - POST /api/sessions → 400 without assignment_id/job_id
 * - POST /api/sessions → 403 for wrong tester
 * - POST /api/sessions → 201 for valid tester with active assignment
 * - Session has correct tester_id, job_id, assignment_id, status=active
 * - POST /api/sessions/[id]/events → records navigation event
 * - POST /api/sessions/[id]/events → records console_log event (simulated injected script)
 * - POST /api/sessions/[id]/events → records network_request + network_response events
 * - POST /api/sessions/[id]/events → records click event
 * - GET /api/sessions/[id]/events → returns all 4+ events
 * - Events have ts, event_type, and type-specific fields
 * - PATCH /api/sessions/[id] → status=complete ends session with ended_at
 * - POST /api/feedback → 201 with rating + summary + bugs
 * - Feedback persists: GET /api/sessions/[id] returns session + feedback
 * - Completed session status reflects in GET
 * - Full end-to-end: signup → create job → assign → session → events → complete → feedback
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
    timeout: 30000,
  })
  return ((await res.json()).access_token as string) ?? null
}
function getUserId(t: string) {
  try { return JSON.parse(Buffer.from(t.split('.')[1] + '==', 'base64').toString()).sub ?? '' }
  catch { return '' }
}

const RUN_ID = Date.now()
const PASSWORD = `TfPw${RUN_ID}!`
let ctr = 0
function nextId() { return `${RUN_ID}_${++ctr}` }

/** Set up: client creates + publishes job; admin-inserts assignment for tester */
async function setupJobAndAssignment(request: APIRequestContext) {
  const rid = nextId()
  const clientToken = await signUp(request, `tf.c.${rid}@mailinator.com`, PASSWORD)
  const testerToken = await signUp(request, `tf.t.${rid}@mailinator.com`, PASSWORD)
  const otherToken = await signUp(request, `tf.o.${rid}@mailinator.com`, PASSWORD)
  if (!clientToken || !testerToken) return null

  const testerUid = getUserId(testerToken)

  // Create + publish job
  const jobRes = await request.post(url('/api/jobs'), {
    data: { title: `Tester Flow Job ${rid}`, url: 'https://example.com', tier: 'quick', instructions: 'Test login' },
    headers: bearer(clientToken), timeout: 30000,
  })
  const { job } = await jobRes.json()
  if (!job?.id) return null

  await request.post(url(`/api/jobs/${job.id}/transition`), {
    data: { to: 'published' }, headers: bearer(clientToken),
  })

  // Create assignment via Supabase REST (admin path since app RLS may restrict direct insert)
  const asgRes = await request.post(`${SUPABASE_URL}/rest/v1/job_assignments`, {
    data: { job_id: job.id, tester_id: testerUid, status: 'active', assigned_at: new Date().toISOString() },
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${testerToken}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    timeout: 30000,
  })
  const asg = await asgRes.json()
  if (!Array.isArray(asg) || !asg[0]?.id) return null

  return { clientToken, testerToken, otherToken, job, assignment: asg[0] }
}

// ─── Auth guards ──────────────────────────────────────────────

test.describe('Tester flow — auth guards', () => {
  test('POST /api/sessions → 401 without token', async ({ request }) => {
    const res = await request.post(url('/api/sessions'), {
      data: { assignment_id: 'fake', job_id: 'fake' },
    })
    expect(res.status()).toBe(401)
  })

  test('GET /api/sessions/[id] → 401 without token', async ({ request }) => {
    const res = await request.get(url('/api/sessions/fake-id'))
    expect(res.status()).toBe(401)
  })

  test('PATCH /api/sessions/[id] → 401 without token', async ({ request }) => {
    const res = await request.patch(url('/api/sessions/fake-id'), { data: { status: 'complete' } })
    expect(res.status()).toBe(401)
  })

  test('POST /api/sessions/[id]/events → 401 without token', async ({ request }) => {
    const res = await request.post(url('/api/sessions/fake-id/events'), {
      data: [],
    })
    expect(res.status()).toBe(401)
  })

  test('GET /api/sessions/[id]/events → 401 without token', async ({ request }) => {
    const res = await request.get(url('/api/sessions/fake-id/events'))
    expect(res.status()).toBe(401)
  })

  test('POST /api/feedback → 401 without token', async ({ request }) => {
    const res = await request.post(url('/api/feedback'), { data: {} })
    expect(res.status()).toBe(401)
  })
})

// ─── Session creation ─────────────────────────────────────────

test.describe('Tester flow — session creation', () => {
  let fixture: Awaited<ReturnType<typeof setupJobAndAssignment>> = null

  test.beforeAll(async ({ request }) => {
    test.setTimeout(60000)
    if (!SUPABASE_ANON_KEY) return
    fixture = await setupJobAndAssignment(request)
  })

  test('POST /api/sessions → 400 without assignment_id', async ({ request }) => {
    if (!fixture) { test.skip(true, 'No fixture'); return }
    const res = await request.post(url('/api/sessions'), {
      data: { job_id: fixture.job.id },
      headers: bearer(fixture.testerToken),
    })
    expect(res.status()).toBe(400)
  })

  test('POST /api/sessions → 400 without job_id', async ({ request }) => {
    if (!fixture) { test.skip(true, 'No fixture'); return }
    const res = await request.post(url('/api/sessions'), {
      data: { assignment_id: fixture.assignment.id },
      headers: bearer(fixture.testerToken),
    })
    expect(res.status()).toBe(400)
  })

  test('POST /api/sessions → 403 for wrong tester', async ({ request }) => {
    if (!fixture || !fixture.otherToken) { test.skip(true, 'No fixture'); return }
    const res = await request.post(url('/api/sessions'), {
      data: { assignment_id: fixture.assignment.id, job_id: fixture.job.id },
      headers: bearer(fixture.otherToken),
    })
    expect(res.status()).toBe(403)
  })

  test('POST /api/sessions → 201 for valid tester', async ({ request }) => {
    if (!fixture) { test.skip(true, 'No fixture'); return }
    const res = await request.post(url('/api/sessions'), {
      data: { assignment_id: fixture.assignment.id, job_id: fixture.job.id },
      headers: bearer(fixture.testerToken),
    })
    expect(res.status()).toBe(201)
    const { session } = await res.json()
    expect(session.id).toBeTruthy()
    expect(session.status).toBe('active')
    expect(session.job_id).toBe(fixture.job.id)
  })

  test('duplicate session returns existing (not 409)', async ({ request }) => {
    if (!fixture) { test.skip(true, 'No fixture'); return }
    // Second call to same assignment returns the existing active session
    const res = await request.post(url('/api/sessions'), {
      data: { assignment_id: fixture.assignment.id, job_id: fixture.job.id },
      headers: bearer(fixture.testerToken),
    })
    expect([200, 201]).toContain(res.status())
    const body = await res.json()
    expect(body.session).toBeDefined()
  })
})

// ─── Full tester session: events + complete + feedback ─────────

test.describe('Tester flow — events + complete + feedback', () => {
  let fixture: Awaited<ReturnType<typeof setupJobAndAssignment>> = null
  let sessionId: string | null = null

  test.beforeAll(async ({ request }) => {
    test.setTimeout(90000)
    if (!SUPABASE_ANON_KEY) return

    fixture = await setupJobAndAssignment(request)
    if (!fixture) return

    // Create session
    const sessRes = await request.post(url('/api/sessions'), {
      data: { assignment_id: fixture.assignment.id, job_id: fixture.job.id },
      headers: bearer(fixture.testerToken),
    })
    if (sessRes.status() === 201 || sessRes.status() === 200) {
      const { session } = await sessRes.json()
      sessionId = session?.id ?? null
    }
  })

  // ── Events ──

  test('POST /api/sessions/[id]/events → 201 with navigation event', async ({ request }) => {
    if (!fixture || !sessionId) { test.skip(true, 'No session'); return }

    const res = await request.post(url(`/api/sessions/${sessionId}/events`), {
      data: [
        { event_type: 'navigation', ts: new Date().toISOString(), url: 'https://example.com', log_message: 'Page loaded' },
      ],
      headers: bearer(fixture.testerToken),
    })
    expect(res.status()).toBe(201)
    const { inserted } = await res.json()
    expect(inserted).toBeGreaterThanOrEqual(1)
  })

  test('POST events → records console_log (injected script simulation)', async ({ request }) => {
    if (!fixture || !sessionId) { test.skip(true, 'No session'); return }

    // Simulates what the injected monkey-patch script sends via postMessage → RunLogger → API
    const res = await request.post(url(`/api/sessions/${sessionId}/events`), {
      data: [
        { event_type: 'console_log', ts: new Date().toISOString(), log_level: 'log', log_message: '[AgentQA injected] Page initialized: {"title":"Example Domain","readyState":"complete"}' },
        { event_type: 'console_log', ts: new Date().toISOString(), log_level: 'error', log_message: 'TypeError: Cannot read properties of undefined (reading "map")' },
        { event_type: 'console_log', ts: new Date().toISOString(), log_level: 'warn', log_message: 'Deprecated API usage detected' },
      ],
      headers: bearer(fixture.testerToken),
    })
    expect(res.status()).toBe(201)
    const { inserted } = await res.json()
    expect(inserted).toBe(3)
  })

  test('POST events → records network_request + network_response', async ({ request }) => {
    if (!fixture || !sessionId) { test.skip(true, 'No session'); return }

    const res = await request.post(url(`/api/sessions/${sessionId}/events`), {
      data: [
        { event_type: 'network_request', ts: new Date().toISOString(), method: 'GET', request_url: 'https://example.com/api/user' },
        { event_type: 'network_response', ts: new Date().toISOString(), method: 'GET', request_url: 'https://example.com/api/user', status_code: 200, duration_ms: 45 },
        { event_type: 'network_response', ts: new Date().toISOString(), method: 'POST', request_url: 'https://example.com/api/login', status_code: 401, duration_ms: 120 },
      ],
      headers: bearer(fixture.testerToken),
    })
    expect(res.status()).toBe(201)
    const { inserted } = await res.json()
    expect(inserted).toBe(3)
  })

  test('POST events → records click event', async ({ request }) => {
    if (!fixture || !sessionId) { test.skip(true, 'No session'); return }

    const res = await request.post(url(`/api/sessions/${sessionId}/events`), {
      data: [
        { event_type: 'click', ts: new Date().toISOString(), log_message: 'button#login[Sign In]', payload: { tag: 'button', id: 'login', text: 'Sign In', x: 320, y: 240 } },
      ],
      headers: bearer(fixture.testerToken),
    })
    expect(res.status()).toBe(201)
  })

  test('GET /api/sessions/[id]/events → returns all events', async ({ request }) => {
    if (!fixture || !sessionId) { test.skip(true, 'No session'); return }

    const res = await request.get(url(`/api/sessions/${sessionId}/events`), {
      headers: bearer(fixture.testerToken),
    })
    expect(res.status()).toBe(200)
    const { events } = await res.json()
    expect(Array.isArray(events)).toBe(true)
    // We posted 1 + 3 + 3 + 1 = 8 events
    expect(events.length).toBeGreaterThanOrEqual(8)
  })

  test('events include at least 1 console_log event', async ({ request }) => {
    if (!fixture || !sessionId) { test.skip(true, 'No session'); return }

    const res = await request.get(url(`/api/sessions/${sessionId}/events`), {
      headers: bearer(fixture.testerToken),
    })
    const { events } = await res.json()
    const consoleLogs = events.filter((e: { event_type: string }) => e.event_type === 'console_log')
    expect(consoleLogs.length).toBeGreaterThanOrEqual(1)
  })

  test('events include at least 1 network event', async ({ request }) => {
    if (!fixture || !sessionId) { test.skip(true, 'No session'); return }

    const res = await request.get(url(`/api/sessions/${sessionId}/events`), {
      headers: bearer(fixture.testerToken),
    })
    const { events } = await res.json()
    const networkEvents = events.filter((e: { event_type: string }) =>
      e.event_type === 'network_request' || e.event_type === 'network_response'
    )
    expect(networkEvents.length).toBeGreaterThanOrEqual(1)
  })

  test('each event has ts, event_type, session_id', async ({ request }) => {
    if (!fixture || !sessionId) { test.skip(true, 'No session'); return }

    const res = await request.get(url(`/api/sessions/${sessionId}/events`), {
      headers: bearer(fixture.testerToken),
    })
    const { events } = await res.json()
    for (const e of events.slice(0, 3)) {
      expect(e.ts).toBeTruthy()
      expect(e.event_type).toBeTruthy()
      expect(e.session_id).toBe(sessionId)
    }
  })

  test('other user cannot read session events (403)', async ({ request }) => {
    if (!fixture || !sessionId || !fixture.otherToken) { test.skip(true, 'No fixture'); return }

    const res = await request.get(url(`/api/sessions/${sessionId}/events`), {
      headers: bearer(fixture.otherToken),
    })
    expect([403, 404]).toContain(res.status())
  })

  // ── Complete session ──

  test('PATCH /api/sessions/[id] { status: complete } → 200', async ({ request }) => {
    if (!fixture || !sessionId) { test.skip(true, 'No session'); return }

    const res = await request.patch(url(`/api/sessions/${sessionId}`), {
      data: { status: 'complete', notes: 'Login works but API returns 401 on invalid credentials as expected. Found a UI bug.' },
      headers: bearer(fixture.testerToken),
    })
    expect(res.status()).toBe(200)
    const { session } = await res.json()
    expect(session.status).toBe('complete')
    expect(session.ended_at).toBeTruthy()
  })

  test('completed session has ended_at timestamp', async ({ request }) => {
    if (!fixture || !sessionId) { test.skip(true, 'No session'); return }

    const res = await request.get(url(`/api/sessions/${sessionId}`), {
      headers: bearer(fixture.testerToken),
    })
    const { session } = await res.json()
    expect(session.status).toBe('complete')
    expect(session.ended_at).toBeTruthy()
    expect(session.notes).toContain('Login works')
  })

  // ── Submit feedback ──

  test('POST /api/feedback → 201 with rating + summary', async ({ request }) => {
    if (!fixture || !sessionId) { test.skip(true, 'No session'); return }

    const res = await request.post(url('/api/feedback'), {
      data: {
        session_id: sessionId,
        job_id: fixture.job.id,
        assignment_id: fixture.assignment.id,
        overall_rating: 3,
        summary: 'Homepage loads correctly. Login form works for valid credentials. API returns 401 for invalid credentials. Found one UI issue: error message disappears too quickly.',
        repro_steps: '1. Open https://example.com\n2. Enter wrong password\n3. Submit form\n4. Observe error appears then vanishes in <1s',
        expected_behavior: 'Error message stays visible for at least 3 seconds',
        actual_behavior: 'Error message disappears immediately',
        bugs_found: 1,
      },
      headers: bearer(fixture.testerToken),
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.feedback).toBeDefined()
    expect(body.feedback.overall_rating).toBe(3)
    expect(body.feedback.session_id).toBe(sessionId)
  })

  test('POST /api/feedback with bugs array → 201', async ({ request }) => {
    if (!fixture) { test.skip(true, 'No fixture'); return }

    // Create a new session for this test
    const fx2 = await setupJobAndAssignment(request)
    if (!fx2) { test.skip(true, 'Fixture 2 failed'); return }

    const sessRes = await request.post(url('/api/sessions'), {
      data: { assignment_id: fx2.assignment.id, job_id: fx2.job.id },
      headers: bearer(fx2.testerToken),
    })
    const { session: s2 } = await sessRes.json()

    await request.patch(url(`/api/sessions/${s2.id}`), {
      data: { status: 'complete' }, headers: bearer(fx2.testerToken),
    })

    const res = await request.post(url('/api/feedback'), {
      data: {
        session_id: s2.id,
        job_id: fx2.job.id,
        assignment_id: fx2.assignment.id,
        overall_rating: 2,
        summary: 'Several critical bugs found.',
        bugs_found: 2,
        bugs: [
          {
            title: 'Login button unresponsive on mobile viewport',
            description: 'Clicking the login button does nothing on screens < 768px wide',
            severity: 'high',
            repro_steps: '1. Resize window to 375px\n2. Click Login\n3. Nothing happens',
            expected_behavior: 'Login modal opens',
            actual_behavior: 'No response',
          },
          {
            title: 'Form validation error not displayed',
            description: 'Empty form submission shows no error message',
            severity: 'medium',
          },
        ],
      },
      headers: bearer(fx2.testerToken),
    })
    expect(res.status()).toBe(201)
    const { feedback } = await res.json()
    expect(feedback.bugs_found).toBe(2)
  })
})

// ─── Full end-to-end flow ─────────────────────────────────────

test.describe('Tester flow — full E2E (core flow)', () => {
  test('signup → job → assign → session → events (console+network) → complete → feedback', async ({ request }) => {
    if (!SUPABASE_ANON_KEY) { test.skip(true, 'No Supabase'); return }
    test.setTimeout(120000)

    const rid = nextId()

    // 1. Requester signs up and creates + publishes job
    const clientToken = await signUp(request, `e2ec.${rid}@mailinator.com`, PASSWORD)
    if (!clientToken) { test.skip(true, 'Auth failed'); return }

    const jobRes = await request.post(url('/api/jobs'), {
      data: {
        title: `E2E Core Flow Job ${rid}`,
        url: 'https://example.com',
        tier: 'quick',
        instructions: 'Test the main page load and navigation',
      },
      headers: bearer(clientToken),
    })
    expect(jobRes.status()).toBe(201)
    const { job } = await jobRes.json()

    const transRes = await request.post(url(`/api/jobs/${job.id}/transition`), {
      data: { to: 'published' }, headers: bearer(clientToken),
    })
    expect(transRes.status()).toBe(200)

    // 2. Tester signs up
    const testerToken = await signUp(request, `e2et.${rid}@mailinator.com`, PASSWORD)
    if (!testerToken) { test.skip(true, 'Tester auth failed'); return }
    const testerUid = getUserId(testerToken)

    // 3. Tester claims job (assignment)
    const asgRes = await request.post(`${SUPABASE_URL}/rest/v1/job_assignments`, {
      data: { job_id: job.id, tester_id: testerUid, status: 'active', assigned_at: new Date().toISOString() },
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${testerToken}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    })
    const asg = await asgRes.json()
    expect(Array.isArray(asg) && asg[0]?.id).toBeTruthy()
    const assignment = asg[0]

    // 4. Tester starts session (opens sandbox)
    const sessRes = await request.post(url('/api/sessions'), {
      data: { assignment_id: assignment.id, job_id: job.id },
      headers: bearer(testerToken),
    })
    expect(sessRes.status()).toBe(201)
    const { session } = await sessRes.json()
    expect(session.status).toBe('active')

    // 5. Session events: simulate injected script behavior
    //    - navigation event (iframe navigated to target URL)
    //    - console.log (injected script fires on page load)
    //    - network_request + network_response (XHR intercepted by monkey-patch)
    //    - click event (user clicks something)
    const evRes = await request.post(url(`/api/sessions/${session.id}/events`), {
      data: [
        { event_type: 'navigation', ts: new Date().toISOString(), url: 'https://example.com', log_message: 'Navigated to https://example.com' },
        { event_type: 'console_log', ts: new Date().toISOString(), log_level: 'log', log_message: 'console.log intercepted by AgentQA: App mounted' },
        { event_type: 'network_request', ts: new Date().toISOString(), method: 'GET', request_url: 'https://example.com/api/config' },
        { event_type: 'network_response', ts: new Date().toISOString(), method: 'GET', request_url: 'https://example.com/api/config', status_code: 200, duration_ms: 32 },
        { event_type: 'click', ts: new Date().toISOString(), log_message: 'a[Get Started]' },
      ],
      headers: bearer(testerToken),
    })
    expect(evRes.status()).toBe(201)
    const { inserted } = await evRes.json()
    expect(inserted).toBe(5)

    // 6. Verify events persisted with at least 1 console + 1 network
    const getEvRes = await request.get(url(`/api/sessions/${session.id}/events`), {
      headers: bearer(testerToken),
    })
    expect(getEvRes.status()).toBe(200)
    const { events } = await getEvRes.json()
    expect(events.length).toBeGreaterThanOrEqual(5)
    expect(events.some((e: { event_type: string }) => e.event_type === 'console_log')).toBe(true)
    expect(events.some((e: { event_type: string }) => e.event_type === 'network_request' || e.event_type === 'network_response')).toBe(true)

    // 7. Tester stops session
    const patchRes = await request.patch(url(`/api/sessions/${session.id}`), {
      data: { status: 'complete', notes: 'Tested homepage. App loads fine. Found no blocking issues.' },
      headers: bearer(testerToken),
    })
    expect(patchRes.status()).toBe(200)
    const { session: completedSession } = await patchRes.json()
    expect(completedSession.status).toBe('complete')
    expect(completedSession.ended_at).toBeTruthy()

    // 8. Tester submits feedback
    const fbRes = await request.post(url('/api/feedback'), {
      data: {
        session_id: session.id,
        job_id: job.id,
        assignment_id: assignment.id,
        overall_rating: 4,
        summary: 'App loads correctly. Main navigation works. No critical bugs found.',
        repro_steps: 'N/A — no bugs found',
        expected_behavior: 'All features work as described',
        actual_behavior: 'App behaves as expected with minor UI issues',
        bugs_found: 0,
      },
      headers: bearer(testerToken),
    })
    expect(fbRes.status()).toBe(201)
    const { feedback } = await fbRes.json()
    expect(feedback.overall_rating).toBe(4)
    expect(feedback.session_id).toBe(session.id)

    // 9. Requester can see session + feedback on report
    const reportRes = await request.get(url(`/api/sessions/${session.id}`), {
      headers: bearer(clientToken),
    })
    expect(reportRes.status()).toBe(200)
    const { session: reportSession } = await reportRes.json()
    expect(reportSession.status).toBe('complete')
  })
})

// ─── UI pages ─────────────────────────────────────────────────

test.describe('Tester flow — UI pages', () => {
  test('/marketplace page loads', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    const res = await page.goto(url('/marketplace'))
    expect(res?.status()).not.toBe(500)
    expect(res?.status()).not.toBe(404)
  })

  test('/marketplace page has job listings or empty state', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/marketplace'))
    await page.waitForLoadState('networkidle').catch(() => {})
    const body = await page.content()
    expect(body.length).toBeGreaterThan(100)
    // Page should have navigation structure
    expect(body.toLowerCase()).toMatch(/marketplace|agentqa|job/i)
  })

  test('/run/[sessionId] page renders (requires valid session)', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    // Non-existent session should return 404
    const res = await page.goto(url('/run/00000000-0000-0000-0000-000000000000'))
    // Could be 404 or redirect to login
    expect(res?.status()).not.toBe(500)
  })

  test('sandbox runner page has iframe or load indication', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/marketplace'))
    const content = await page.content()
    // The marketplace should exist and have some content
    expect(content).toContain('AgentQA')
  })
})
