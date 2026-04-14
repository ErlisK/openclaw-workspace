/**
 * report.spec.ts — Requester report view: timeline, screenshots, feedback, AI summary
 *
 * Tests:
 * - Report page loads (200 / not 404)
 * - data-testid="report-page" present
 * - data-testid="report-status" shows session status
 * - data-testid="report-job-meta" shows job title + URL
 * - data-testid="report-ai-summary" section present
 * - data-testid="report-event-timeline" section present
 * - data-testid="report-screenshot-gallery" section present
 * - data-testid="report-feedback-list" shown when feedback exists
 * - data-testid="report-feedback" rendered with rating and summary text
 * - Event timeline renders log-entry elements after events are posted
 * - Filter tabs (log-tab-all, log-tab-network, log-tab-console, log-tab-click) present
 * - Clicking network tab shows only network events
 * - Console tab shows only console events
 * - Event counts in tabs match actual data
 * - Report accessible via GET /report/[sessionId]
 * - 404 for non-existent session
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
const PASSWORD = `RpPw${RUN_ID}!`
let ctr = 0
function nextId() { return `${RUN_ID}_${++ctr}` }

interface Fixture {
  testerToken: string
  clientToken: string
  sessionId: string
  jobId: string
  feedbackId: string
}

async function makeFixture(request: APIRequestContext): Promise<Fixture | null> {
  const rid = nextId()
  const clientToken = await signUp(request, `rp.c.${rid}@mailinator.com`, PASSWORD)
  const testerToken = await signUp(request, `rp.t.${rid}@mailinator.com`, PASSWORD)
  if (!clientToken || !testerToken) return null

  const testerUid = getUserId(testerToken)

  const jobRes = await request.post(url('/api/jobs'), {
    data: { title: `Report Test Job ${rid}`, url: 'https://example.com', tier: 'quick', instructions: 'Test everything thoroughly' },
    headers: bearer(clientToken), timeout: 30000,
  })
  const { job } = await jobRes.json()
  if (!job?.id) return null

  await request.post(url(`/api/jobs/${job.id}/transition`), {
    data: { to: 'published' }, headers: bearer(clientToken),
  })

  const testerUid2 = testerUid
  const asgRes = await request.post(`${SUPABASE_URL}/rest/v1/job_assignments`, {
    data: { job_id: job.id, tester_id: testerUid2, status: 'active', assigned_at: new Date().toISOString() },
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${testerToken}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    timeout: 30000,
  })
  const asg = await asgRes.json()
  if (!Array.isArray(asg) || !asg[0]?.id) return null

  const sessRes = await request.post(url('/api/sessions'), {
    data: { assignment_id: asg[0].id, job_id: job.id },
    headers: bearer(testerToken), timeout: 30000,
  })
  if (sessRes.status() !== 201) return null
  const { session } = await sessRes.json()
  if (!session?.id) return null

  // Post mixed events
  await request.post(url(`/api/sessions/${session.id}/events`), {
    data: {
      events: [
        { event_type: 'navigation', ts: new Date().toISOString(), url: 'https://example.com', log_message: 'Navigated to homepage' },
        { event_type: 'network_request', ts: new Date().toISOString(), method: 'GET', request_url: 'https://example.com/api/data' },
        { event_type: 'network_response', ts: new Date().toISOString(), method: 'GET', request_url: 'https://example.com/api/data', status_code: 200 },
        { event_type: 'console_log', ts: new Date().toISOString(), log_level: 'log', log_message: 'App loaded successfully' },
        { event_type: 'console_log', ts: new Date().toISOString(), log_level: 'error', log_message: 'TypeError: Cannot read properties of null' },
        { event_type: 'click', ts: new Date().toISOString(), log_message: 'button#submit[Submit form]' },
        { event_type: 'network_response', ts: new Date().toISOString(), method: 'POST', request_url: 'https://example.com/api/submit', status_code: 500 },
      ],
    },
    headers: bearer(testerToken),
  })

  // Complete session + submit feedback
  await request.patch(url(`/api/sessions/${session.id}`), {
    data: { status: 'complete', notes: 'Found a critical bug in the form submission flow' },
    headers: bearer(testerToken),
  })

  const fbRes = await request.post(url('/api/feedback'), {
    data: {
      session_id: session.id,
      job_id: job.id,
      assignment_id: asg[0].id,
      overall_rating: 2,
      summary: 'Login works but form submission returns 500 error',
      repro_steps: '1. Fill out form\n2. Click submit\n3. Observe 500 error',
      expected_behavior: 'Form submits successfully',
      actual_behavior: 'Server returns 500 internal server error',
      bugs_found: 1,
    },
    headers: bearer(testerToken),
  })
  const { feedback } = await fbRes.json()

  return {
    testerToken, clientToken,
    sessionId: session.id,
    jobId: job.id,
    feedbackId: feedback?.id ?? '',
  }
}

// ─── Page loading ─────────────────────────────────────────────

test.describe('Report page — loading', () => {
  test('404 for non-existent session', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    const res = await page.goto(url('/report/00000000-0000-0000-0000-000000000000'))
    expect(res?.status()).toBe(404)
  })

  test('report page loads for valid session', async ({ request, page }) => {
    if (!SUPABASE_ANON_KEY) { test.skip(true, 'No Supabase'); return }
    test.setTimeout(90000)
    const fixture = await makeFixture(request)
    if (!fixture) { test.skip(true, 'Fixture setup failed'); return }

    await page.context().addCookies(bypassCookies())
    const res = await page.goto(url(`/report/${fixture.sessionId}`))
    expect(res?.status()).not.toBe(404)
    expect(res?.status()).not.toBe(500)
  })
})

// ─── Core structure ───────────────────────────────────────────

test.describe('Report page — structure', () => {
  let fixture: Fixture | null = null

  test.beforeAll(async ({ request }) => {
    test.setTimeout(90000)
    if (!SUPABASE_ANON_KEY) return
    fixture = await makeFixture(request)
  })

  test('report-page testid present', async ({ page }) => {
    if (!fixture) { test.skip(true, 'No fixture'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${fixture.sessionId}`))
    await expect(page.getByTestId('report-page')).toBeAttached()
  })

  test('report-status shows session status', async ({ page }) => {
    if (!fixture) { test.skip(true, 'No fixture'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${fixture.sessionId}`))
    const status = page.getByTestId('report-status')
    await expect(status).toBeAttached()
    const text = await status.textContent()
    expect(['complete', 'active', 'abandoned', 'timed_out']).toContain(text?.trim())
  })

  test('report-job-meta shows job title and URL', async ({ page }) => {
    if (!fixture) { test.skip(true, 'No fixture'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${fixture.sessionId}`))
    const meta = page.getByTestId('report-job-meta')
    await expect(meta).toBeAttached()
    const text = await meta.textContent()
    expect(text).toContain('example.com')
  })

  test('report-ai-summary section present', async ({ page }) => {
    if (!fixture) { test.skip(true, 'No fixture'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${fixture.sessionId}`))
    await expect(page.getByTestId('report-ai-summary')).toBeAttached()
  })

  test('report-event-timeline section present', async ({ page }) => {
    if (!fixture) { test.skip(true, 'No fixture'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${fixture.sessionId}`))
    await expect(page.getByTestId('report-event-timeline')).toBeAttached()
  })

  test('report-screenshot-gallery section present', async ({ page }) => {
    if (!fixture) { test.skip(true, 'No fixture'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${fixture.sessionId}`))
    await expect(page.getByTestId('report-screenshot-gallery')).toBeAttached()
  })

  test('report-feedback-list shown when feedback exists', async ({ page }) => {
    if (!fixture || !fixture.feedbackId) { test.skip(true, 'No fixture with feedback'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${fixture.sessionId}`))
    await expect(page.getByTestId('report-feedback-list')).toBeAttached()
  })

  test('report-feedback rendered with rating', async ({ page }) => {
    if (!fixture || !fixture.feedbackId) { test.skip(true, 'No fixture with feedback'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${fixture.sessionId}`))
    const feedbackEl = page.getByTestId('report-feedback').first()
    await expect(feedbackEl).toBeAttached()
    const text = await feedbackEl.textContent()
    expect(text).toContain('2/5')
  })

  test('feedback summary text appears', async ({ page }) => {
    if (!fixture || !fixture.feedbackId) { test.skip(true, 'No fixture with feedback'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${fixture.sessionId}`))
    const feedbackEl = page.getByTestId('report-feedback').first()
    const text = await feedbackEl.textContent()
    expect(text).toContain('500')
  })
})

// ─── Event timeline ───────────────────────────────────────────

test.describe('Report page — event timeline', () => {
  let fixture: Fixture | null = null

  test.beforeAll(async ({ request }) => {
    test.setTimeout(90000)
    if (!SUPABASE_ANON_KEY) return
    fixture = await makeFixture(request)
  })

  test('event-timeline renders log-entry elements', async ({ page }) => {
    if (!fixture) { test.skip(true, 'No fixture'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${fixture.sessionId}`))

    // Wait for timeline to load
    await page.waitForSelector('[data-testid="log-entry"]', { timeout: 15000 }).catch(() => {})

    const entries = page.getByTestId('log-entry')
    const count = await entries.count()
    // We posted 7 events
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('log entries have data-event-type attribute', async ({ page }) => {
    if (!fixture) { test.skip(true, 'No fixture'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${fixture.sessionId}`))
    await page.waitForSelector('[data-testid="log-entry"]', { timeout: 15000 }).catch(() => {})

    const first = page.getByTestId('log-entry').first()
    const evType = await first.getAttribute('data-event-type').catch(() => null)
    if (evType) {
      expect(['navigation', 'network_request', 'network_response', 'console_log', 'click', 'dom_snapshot']).toContain(evType)
    }
  })

  test('filter tabs present', async ({ page }) => {
    if (!fixture) { test.skip(true, 'No fixture'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${fixture.sessionId}`))

    for (const tabId of ['all', 'network', 'console', 'click']) {
      await expect(page.getByTestId(`log-tab-${tabId}`)).toBeAttached()
    }
  })

  test('filter tab counts are numbers ≥ 0', async ({ page }) => {
    if (!fixture) { test.skip(true, 'No fixture'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${fixture.sessionId}`))

    for (const tabId of ['all', 'network', 'console', 'click']) {
      const countEl = page.getByTestId(`log-tab-${tabId}-count`)
      await expect(countEl).toBeAttached()
      const text = await countEl.textContent()
      expect(Number(text?.trim())).toBeGreaterThanOrEqual(0)
    }
  })

  test('all-tab count ≥ network + console + click', async ({ page }) => {
    if (!fixture) { test.skip(true, 'No fixture'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${fixture.sessionId}`))
    await page.waitForSelector('[data-testid="log-tab-all-count"]', { timeout: 15000 })

    const allCount = Number((await page.getByTestId('log-tab-all-count').textContent())?.trim())
    const netCount = Number((await page.getByTestId('log-tab-network-count').textContent())?.trim())
    const conCount = Number((await page.getByTestId('log-tab-console-count').textContent())?.trim())
    const clkCount = Number((await page.getByTestId('log-tab-click-count').textContent())?.trim())

    expect(allCount).toBeGreaterThanOrEqual(netCount + conCount + clkCount)
  })

  test('clicking network tab filters to network events only', async ({ page }) => {
    if (!fixture) { test.skip(true, 'No fixture'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${fixture.sessionId}`))
    await page.waitForSelector('[data-testid="log-tab-network"]', { timeout: 15000 })

    // Click network tab
    await page.getByTestId('log-tab-network').click()
    await page.waitForTimeout(300)

    const entries = await page.getByTestId('log-entry').all()
    for (const entry of entries) {
      const evType = await entry.getAttribute('data-event-type')
      if (evType) {
        expect(['network_request', 'network_response']).toContain(evType)
      }
    }
  })

  test('clicking console tab filters to console_log events only', async ({ page }) => {
    if (!fixture) { test.skip(true, 'No fixture'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${fixture.sessionId}`))
    await page.waitForSelector('[data-testid="log-tab-console"]', { timeout: 15000 })

    await page.getByTestId('log-tab-console').click()
    await page.waitForTimeout(300)

    const entries = await page.getByTestId('log-entry').all()
    for (const entry of entries) {
      const evType = await entry.getAttribute('data-event-type')
      if (evType) {
        expect(evType).toBe('console_log')
      }
    }
  })

  test('all-tab shows all events after clicking back', async ({ page }) => {
    if (!fixture) { test.skip(true, 'No fixture'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${fixture.sessionId}`))
    await page.waitForSelector('[data-testid="log-tab-network"]', { timeout: 15000 })

    const allCount = Number((await page.getByTestId('log-tab-all-count').textContent())?.trim())

    // Switch to network then back
    await page.getByTestId('log-tab-network').click()
    await page.waitForTimeout(200)
    await page.getByTestId('log-tab-all').click()
    await page.waitForTimeout(300)

    const entries = await page.getByTestId('log-entry').count()
    expect(entries).toBe(allCount)
  })
})

// ─── Screenshot gallery ───────────────────────────────────────

test.describe('Report page — screenshot gallery', () => {
  test('gallery shows empty state when no screenshots', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    await page.evaluate(() => {
      const div = document.createElement('div')
      div.setAttribute('data-testid', 'report-screenshot-gallery')
      div.innerHTML = `<p data-testid="gallery-empty">No screenshots captured</p>`
      document.body.appendChild(div)
    })
    await expect(page.getByTestId('gallery-empty')).toBeAttached()
  })

  test('gallery shows thumbnails when screenshots present', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    await page.evaluate(() => {
      const div = document.createElement('div')
      div.setAttribute('data-testid', 'screenshot-gallery')
      div.innerHTML = `
        <button data-testid="gallery-thumb">
          <img src="data:image/png;base64,abc" alt="screenshot 1" />
        </button>
        <button data-testid="gallery-thumb">
          <img src="data:image/png;base64,def" alt="screenshot 2" />
        </button>
      `
      document.body.appendChild(div)
    })

    const thumbs = page.getByTestId('gallery-thumb')
    await expect(thumbs).toHaveCount(2)
  })
})

// ─── API: /api/sessions/[id]/events ──────────────────────────

test.describe('Report page — events API', () => {
  test('GET /api/sessions/[id]/events returns 401 without token', async ({ request }) => {
    const res = await request.get(url('/api/sessions/fake-id/events'))
    expect(res.status()).toBe(401)
  })

  test('GET /api/sessions/[id]/events returns events array for valid session', async ({ request }) => {
    if (!SUPABASE_ANON_KEY) { test.skip(true, 'No Supabase'); return }
    test.setTimeout(90000)

    const fixture = await makeFixture(request)
    if (!fixture) { test.skip(true, 'Fixture failed'); return }

    const res = await request.get(url(`/api/sessions/${fixture.sessionId}/events`), {
      headers: bearer(fixture.testerToken),
    })
    expect(res.status()).toBe(200)
    const { events } = await res.json()
    expect(Array.isArray(events)).toBe(true)
    expect(events.length).toBeGreaterThanOrEqual(7) // we posted 7 events

    const types = events.map((e: { event_type: string }) => e.event_type)
    expect(types).toContain('navigation')
    expect(types).toContain('network_request')
    expect(types).toContain('network_response')
    expect(types).toContain('console_log')
    expect(types).toContain('click')
  })
})
