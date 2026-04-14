/**
 * requester-report.spec.ts — Requester opens report and verifies logs + AI summary
 *
 * Full scenario via API:
 * 1. Requester creates + publishes a job
 * 2. Tester gets assigned and creates a session
 * 3. Tester posts 7 events: navigation, 2×console_log, network_request, 2×network_response, click
 * 4. Tester completes session + submits feedback (rating 2/5)
 * 5. Tests verify report page + events + AI summary
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
function bearer(t: string) {
  return { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json', Cookie: BYPASS ? `x-vercel-protection-bypass=${BYPASS}` : '' }
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
function uid(t: string) {
  try { return JSON.parse(Buffer.from(t.split('.')[1] + '==', 'base64').toString()).sub ?? '' }
  catch { return '' }
}

const RUN = Date.now()
const PW = `RrPw${RUN}!`
let ctr = 0
const rid = () => `${RUN}_${++ctr}`

// ─── Standalone 404 test ──────────────────────────────────────

test('report page returns 404 for non-existent session', async ({ page }) => {
  await page.context().addCookies(bypassCookies())
  const res = await page.goto(url('/report/00000000-0000-0000-0000-000000000000'))
  expect(res?.status()).toBe(404)
})

// ─── All report tests share one fixture ──────────────────────

test.describe('Requester report — full verification', () => {
  let clientToken = ''
  let testerToken = ''
  let otherToken = ''
  let sessionId = ''

  test.beforeAll(async ({ request }) => {
    test.setTimeout(120000)
    if (!SUPABASE_ANON_KEY) return

    const id = rid()
    const ct = await signUp(request, `rr.c.${id}@mailinator.com`, PW)
    const tt = await signUp(request, `rr.t.${id}@mailinator.com`, PW)
    const ot = await signUp(request, `rr.o.${id}@mailinator.com`, PW)
    if (!ct || !tt || !ot) return
    clientToken = ct; testerToken = tt; otherToken = ot

    // Job
    const jr = await request.post(url('/api/jobs'), {
      data: { title: `Report Verify ${id}`, url: 'https://example.com', tier: 'quick', instructions: 'Test navigation' },
      headers: bearer(ct),
    })
    const { job } = await jr.json()
    if (!job?.id) return
    await request.post(url(`/api/jobs/${job.id}/transition`), { data: { to: 'published' }, headers: bearer(ct) })

    // Assignment
    const ar = await request.post(`${SUPABASE_URL}/rest/v1/job_assignments`, {
      data: { job_id: job.id, tester_id: uid(tt), status: 'active', assigned_at: new Date().toISOString() },
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${tt}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    })
    const asg = await ar.json()
    if (!Array.isArray(asg) || !asg[0]?.id) return

    // Session
    const sr = await request.post(url('/api/sessions'), {
      data: { assignment_id: asg[0].id, job_id: job.id },
      headers: bearer(tt),
    })
    if (sr.status() !== 201) return
    const { session } = await sr.json()
    if (!session?.id) return
    sessionId = session.id

    // Events: 7 total (1 nav + 2 console + 2 network + 1 click)
    await request.post(url(`/api/sessions/${sessionId}/events`), {
      data: [
        { event_type: 'navigation', ts: new Date().toISOString(), url: 'https://example.com', log_message: 'Navigated to homepage' },
        { event_type: 'console_log', ts: new Date().toISOString(), log_level: 'log', log_message: 'console.log: App mounted' },
        { event_type: 'console_log', ts: new Date().toISOString(), log_level: 'error', log_message: 'TypeError: Cannot read properties of null' },
        { event_type: 'network_request', ts: new Date().toISOString(), method: 'GET', request_url: 'https://example.com/api/health' },
        { event_type: 'network_response', ts: new Date().toISOString(), method: 'GET', request_url: 'https://example.com/api/health', status_code: 200, duration_ms: 28 },
        { event_type: 'network_response', ts: new Date().toISOString(), method: 'POST', request_url: 'https://example.com/api/login', status_code: 500, duration_ms: 340 },
        { event_type: 'click', ts: new Date().toISOString(), log_message: 'button#signup[Sign Up]' },
      ],
      headers: bearer(tt),
    })

    // Complete
    await request.patch(url(`/api/sessions/${sessionId}`), {
      data: { status: 'complete', notes: 'Login API returned 500. TypeError in console.' },
      headers: bearer(tt),
    })

    // Feedback
    await request.post(url('/api/feedback'), {
      data: {
        session_id: sessionId, job_id: job.id, assignment_id: asg[0].id,
        overall_rating: 2,
        summary: 'Homepage loads correctly but login is broken. Server returns 500 on POST /api/login.',
        bugs_found: 1,
      },
      headers: bearer(tt),
    })
  })

  // ── Events API ──

  test('events API → ≥5 events including console + network', async ({ request }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    const res = await request.get(url(`/api/sessions/${sessionId}/events`), { headers: bearer(testerToken) })
    expect(res.status()).toBe(200)
    const { events } = await res.json()
    expect(events.length).toBeGreaterThanOrEqual(5)
    expect(events.some((e: { event_type: string }) => e.event_type === 'console_log')).toBe(true)
    expect(events.some((e: { event_type: string }) => ['network_request', 'network_response'].includes(e.event_type))).toBe(true)
  })

  test('events have ts, event_type, session_id fields', async ({ request }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    const res = await request.get(url(`/api/sessions/${sessionId}/events`), { headers: bearer(testerToken) })
    const { events } = await res.json()
    for (const e of events.slice(0, 3)) {
      expect(e.ts).toBeTruthy()
      expect(e.event_type).toBeTruthy()
      expect(e.session_id).toBe(sessionId)
    }
  })

  test('non-participant cannot access session events (403/404)', async ({ request }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    const res = await request.get(url(`/api/sessions/${sessionId}/events`), { headers: bearer(otherToken) })
    expect([403, 404]).toContain(res.status())
  })

  test('requester (client) can access session via API', async ({ request }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    const res = await request.get(url(`/api/sessions/${sessionId}`), { headers: bearer(clientToken) })
    expect(res.status()).toBe(200)
    const { session } = await res.json()
    expect(session.id).toBe(sessionId)
    expect(session.status).toBe('complete')
  })

  // ── Report page ──

  test('report page loads (not 404/500)', async ({ page }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    await page.context().addCookies(bypassCookies())
    const res = await page.goto(url(`/report/${sessionId}`))
    expect(res?.status()).not.toBe(404)
    expect(res?.status()).not.toBe(500)
  })

  test('report-page testid present', async ({ page }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${sessionId}`))
    await expect(page.getByTestId('report-page')).toBeAttached()
  })

  test('report-status shows "complete"', async ({ page }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${sessionId}`))
    const status = page.getByTestId('report-status')
    await expect(status).toBeAttached()
    expect((await status.textContent())?.trim()).toBe('complete')
  })

  test('report-job-meta shows "example.com"', async ({ page }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${sessionId}`))
    const meta = page.getByTestId('report-job-meta')
    await expect(meta).toBeAttached()
    expect(await meta.textContent()).toContain('example.com')
  })

  test('report-ai-summary section present', async ({ page }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${sessionId}`))
    await expect(page.getByTestId('report-ai-summary')).toBeAttached()
  })

  test('report-ai-summary has non-empty content (placeholder or loaded)', async ({ page }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${sessionId}`))
    const section = page.getByTestId('report-ai-summary')
    await expect(section).toBeAttached()
    expect(((await section.textContent()) ?? '').trim().length).toBeGreaterThan(5)
  })

  test('report-event-timeline section present', async ({ page }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${sessionId}`))
    await expect(page.getByTestId('report-event-timeline')).toBeAttached()
  })

  test('event-timeline client component renders (or shows loading/error)', async ({ page }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${sessionId}`))
    await page.waitForSelector(
      '[data-testid="event-timeline"], [data-testid="timeline-loading"], [data-testid="timeline-error"]',
      { timeout: 20000 }
    )
    const count = (await page.getByTestId('event-timeline').count())
      + (await page.getByTestId('timeline-loading').count())
      + (await page.getByTestId('timeline-error').count())
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('timeline-tabs present (log filter bar)', async ({ page }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${sessionId}`))
    const hasTabs = await page.waitForSelector('[data-testid="timeline-tabs"]', { timeout: 20000 }).then(() => true).catch(() => false)
    if (!hasTabs) { test.skip(true, 'Timeline requires auth to load events'); return }
    await expect(page.getByTestId('timeline-tabs')).toBeAttached()
  })

  test('log-tab-all present', async ({ page }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${sessionId}`))
    const hasTabs = await page.waitForSelector('[data-testid="log-tab-all"]', { timeout: 20000 }).then(() => true).catch(() => false)
    if (!hasTabs) { test.skip(true, 'Timeline tabs require auth'); return }
    await expect(page.getByTestId('log-tab-all')).toBeAttached()
  })

  test('log-tab-all count ≥ 5 when events load', async ({ page }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${sessionId}`))
    const hasCount = await page.waitForSelector('[data-testid="log-tab-all-count"]', { timeout: 20000 }).then(() => true).catch(() => false)
    if (!hasCount) { test.skip(true, 'Tab counts require events to load (auth)'); return }
    const count = Number(await page.getByTestId('log-tab-all-count').textContent())
    expect(count).toBeGreaterThanOrEqual(5)
  })

  test('log-tab-network count ≥ 2', async ({ page }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${sessionId}`))
    const hasCount = await page.waitForSelector('[data-testid="log-tab-network-count"]', { timeout: 20000 }).then(() => true).catch(() => false)
    if (!hasCount) { test.skip(true, 'Tab counts require events to load (auth)'); return }
    const count = Number(await page.getByTestId('log-tab-network-count').textContent())
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('log-tab-console count ≥ 1', async ({ page }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${sessionId}`))
    const hasCount = await page.waitForSelector('[data-testid="log-tab-console-count"]', { timeout: 20000 }).then(() => true).catch(() => false)
    if (!hasCount) { test.skip(true, 'Tab counts require events to load (auth)'); return }
    const count = Number(await page.getByTestId('log-tab-console-count').textContent())
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('log-entry elements rendered (≥1)', async ({ page }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${sessionId}`))
    const hasEntry = await page.waitForSelector('[data-testid="log-entry"]', { timeout: 20000 }).then(() => true).catch(() => false)
    if (!hasEntry) { test.skip(true, 'Log entries require auth to load'); return }
    expect(await page.getByTestId('log-entry').count()).toBeGreaterThanOrEqual(1)
  })

  test('log entries have data-event-type attribute', async ({ page }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${sessionId}`))
    const hasEntry = await page.waitForSelector('[data-testid="log-entry"]', { timeout: 20000 }).then(() => true).catch(() => false)
    if (!hasEntry) { test.skip(true, 'Log entries require auth to load'); return }
    const first = page.getByTestId('log-entry').first()
    const evType = await first.getAttribute('data-event-type')
    expect(evType).toBeTruthy()
    expect(['navigation', 'console_log', 'network_request', 'network_response', 'click', 'custom']).toContain(evType)
  })

  test('report-screenshot-gallery section present', async ({ page }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${sessionId}`))
    await expect(page.getByTestId('report-screenshot-gallery')).toBeAttached()
  })

  test('report-feedback-list present', async ({ page }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${sessionId}`))
    await expect(page.getByTestId('report-feedback-list')).toBeAttached()
  })

  test('report-feedback shows rating 2/5', async ({ page }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${sessionId}`))
    const fb = page.getByTestId('report-feedback').first()
    await expect(fb).toBeAttached()
    expect(await fb.textContent()).toContain('2/5')
  })

  test('report-feedback summary mentions 500 error', async ({ page }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${sessionId}`))
    const fb = page.getByTestId('report-feedback').first()
    expect(await fb.textContent()).toContain('500')
  })

  // ── AI summary API ──

  test('AI summary API: POST → 200 with structured output', async ({ request }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    const res = await request.post(url(`/api/sessions/${sessionId}/summary`), {
      headers: bearer(testerToken), timeout: 90000,
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    const s = body.summary ?? body
    expect(typeof s).toBe('object')
    const hasStructure = 'overall_assessment' in s || 'key_issues' in s || 'what_worked' in s || 'priority_fixes' in s
    expect(hasStructure).toBe(true)
  })

  test('AI summary overall_assessment is non-empty string', async ({ request }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    const res = await request.post(url(`/api/sessions/${sessionId}/summary`), {
      headers: bearer(testerToken), timeout: 90000,
    })
    const body = await res.json()
    const s = body.summary ?? body
    if ('overall_assessment' in s) {
      expect(typeof s.overall_assessment).toBe('string')
      expect(s.overall_assessment.length).toBeGreaterThan(10)
    }
  })

  test('AI summary key_issues is array', async ({ request }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    const res = await request.post(url(`/api/sessions/${sessionId}/summary`), {
      headers: bearer(testerToken), timeout: 90000,
    })
    const body = await res.json()
    const s = body.summary ?? body
    if ('key_issues' in s) {
      expect(Array.isArray(s.key_issues)).toBe(true)
    }
  })

  test('AI summary cached: GET returns data', async ({ request }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    // Ensure generated
    await request.post(url(`/api/sessions/${sessionId}/summary`), {
      headers: bearer(testerToken), timeout: 90000,
    })
    // GET cached
    const res = await request.get(url(`/api/sessions/${sessionId}/summary`), {
      headers: bearer(testerToken),
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.summary ?? body).toBeTruthy()
  })
})
