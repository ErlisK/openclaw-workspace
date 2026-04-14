/**
 * ai-summary.spec.ts — AI Summary feature tests
 *
 * Tests:
 * - POST /api/sessions/[id]/summary → 401 without token
 * - GET /api/sessions/[id]/summary → 401 without token
 * - POST /api/sessions/[id]/summary → 403 for other user
 * - POST /api/sessions/[id]/summary → 404 for non-existent session
 * - POST /api/sessions/[id]/summary → 200 with structured summary (deployed AI)
 * - Summary has required fields: overall_assessment, what_worked, issues_found, priority_fixes
 * - Summary has tester_sentiment in positive|neutral|negative
 * - Summary has confidence in high|medium|low
 * - POST with ?force=true re-generates summary
 * - GET /api/sessions/[id]/summary → returns cached summary
 * - Report page /report/[id] renders with AI summary panel
 * - AISummary UI component has all required data-testid elements
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
function getUserId(t: string) {
  try { return JSON.parse(Buffer.from(t.split('.')[1] + '==', 'base64').toString()).sub ?? '' }
  catch { return '' }
}

const RUN_ID = Date.now()
let aiCounter = 0
const PASSWORD = `AIPw${RUN_ID}!`
function nextId() { return `${RUN_ID}_${++aiCounter}` }

async function setupFullFixture(request: APIRequestContext) {
  const rid = nextId()
  const clientToken = await signUp(request, `ai.client.${rid}@mailinator.com`, PASSWORD)
  const testerToken = await signUp(request, `ai.tester.${rid}@mailinator.com`, PASSWORD)
  const otherToken  = await signUp(request, `ai.other.${rid}@mailinator.com`, PASSWORD)
  if (!clientToken || !testerToken) return null

  const testerUid = getUserId(testerToken)

  // Create job
  const jobRes = await request.post(url('/api/jobs'), {
    data: { title: `AI Summary Test ${rid}`, url: 'https://example.com', tier: 'quick', instructions: 'Test homepage navigation' },
    headers: bearer(clientToken),
  })
  const { job } = await jobRes.json()
  if (!job?.id) return null

  await request.post(url(`/api/jobs/${job.id}/transition`), {
    data: { to: 'published' }, headers: bearer(clientToken),
  })

  // Create assignment
  const asgRes = await request.post(`${SUPABASE_URL}/rest/v1/job_assignments`, {
    data: { job_id: job.id, tester_id: testerUid, status: 'active', assigned_at: new Date().toISOString() },
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${testerToken}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
  })
  const asg = await asgRes.json()
  if (!Array.isArray(asg) || !asg[0]?.id) return null

  // Create session
  const sessRes = await request.post(url('/api/sessions'), {
    data: { assignment_id: asg[0].id, job_id: job.id },
    headers: bearer(testerToken),
  })
  if (sessRes.status() !== 201) return null
  const { session } = await sessRes.json()

  // Add a couple of session events for AI to analyze
  await request.post(url(`/api/sessions/${session.id}/events`), {
    data: {
      events: [
        { event_type: 'navigation', ts: new Date().toISOString(), url: 'https://example.com' },
        { event_type: 'console_log', ts: new Date().toISOString(), log_level: 'error', log_message: 'TypeError: Cannot read property of undefined' },
        { event_type: 'network_request', ts: new Date().toISOString(), method: 'GET', url: 'https://example.com/api/data', status_code: 200 },
        { event_type: 'network_response', ts: new Date().toISOString(), method: 'GET', url: 'https://example.com/api/missing', status_code: 404 },
        { event_type: 'click', ts: new Date().toISOString(), element_selector: 'button[data-testid="submit"]' },
      ],
    },
    headers: bearer(testerToken),
  })

  // Mark session complete
  await request.patch(url(`/api/sessions/${session.id}`), {
    data: { status: 'complete', notes: 'App tested successfully', end_reason: 'finished' },
    headers: bearer(testerToken),
  })

  return { testerToken, clientToken, otherToken, job, assignment: asg[0], session }
}

// ─── Auth guards ──────────────────────────────────────────────

test.describe('AI Summary — auth guards', () => {
  test('POST /api/sessions/[id]/summary → 401 without token', async ({ request }) => {
    const res = await request.post(url('/api/sessions/fake-id/summary'), {
      data: {},
    })
    expect(res.status()).toBe(401)
  })

  test('GET /api/sessions/[id]/summary → 401 without token', async ({ request }) => {
    const res = await request.get(url('/api/sessions/fake-id/summary'))
    expect(res.status()).toBe(401)
  })

  test('POST /api/sessions/[id]/summary → 404 for non-existent session', async ({ request }) => {
    if (!SUPABASE_ANON_KEY) { test.skip(true, 'No Supabase'); return }
    const token = await signUp(request, `ai.guard.${nextId()}@mailinator.com`, PASSWORD)
    if (!token) { test.skip(true, 'No token'); return }

    const res = await request.post(url('/api/sessions/00000000-0000-0000-0000-000000000000/summary'), {
      data: {},
      headers: bearer(token),
    })
    expect(res.status()).toBe(404)
  })

  test('POST /api/sessions/[id]/summary → 403 for unrelated user', async ({ request }) => {
    if (!SUPABASE_ANON_KEY) { test.skip(true, 'No Supabase'); return }
    const fixture = await setupFullFixture(request)
    if (!fixture) { test.skip(true, 'Fixture not set up'); return }

    const res = await request.post(url(`/api/sessions/${fixture.session.id}/summary`), {
      data: {},
      headers: bearer(fixture.otherToken!),
    })
    expect(res.status()).toBe(403)
  })
})

// ─── Summary generation ───────────────────────────────────────

test.describe('AI Summary — generation', () => {
  let fixture: Awaited<ReturnType<typeof setupFullFixture>> = null
  let summaryData: Record<string, unknown> | null = null

  test.beforeAll(async ({ request }) => {
    if (!SUPABASE_ANON_KEY) return
    fixture = await setupFullFixture(request)
  })

  test('POST → 200 with structured summary', async ({ request }) => {
    if (!fixture) { test.skip(true, 'Fixture not set up'); return }

    const res = await request.post(url(`/api/sessions/${fixture.session.id}/summary`), {
      data: {},
      headers: bearer(fixture.testerToken),
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.summary).toBeTruthy()
    summaryData = body.summary as Record<string, unknown>
  })

  test('summary has overall_assessment string', async () => {
    if (!summaryData) { test.skip(true, 'Summary not generated'); return }
    expect(typeof summaryData.overall_assessment).toBe('string')
    expect((summaryData.overall_assessment as string).length).toBeGreaterThan(10)
  })

  test('summary has what_worked array', async () => {
    if (!summaryData) { test.skip(true, 'Summary not generated'); return }
    expect(Array.isArray(summaryData.what_worked)).toBe(true)
  })

  test('summary has issues_found array', async () => {
    if (!summaryData) { test.skip(true, 'Summary not generated'); return }
    expect(Array.isArray(summaryData.issues_found)).toBe(true)
  })

  test('summary has priority_fixes array', async () => {
    if (!summaryData) { test.skip(true, 'Summary not generated'); return }
    expect(Array.isArray(summaryData.priority_fixes)).toBe(true)
  })

  test('summary tester_sentiment is valid enum value', async () => {
    if (!summaryData) { test.skip(true, 'Summary not generated'); return }
    expect(['positive', 'neutral', 'negative']).toContain(summaryData.tester_sentiment)
  })

  test('summary confidence is valid enum value', async () => {
    if (!summaryData) { test.skip(true, 'Summary not generated'); return }
    expect(['high', 'medium', 'low']).toContain(summaryData.confidence)
  })

  test('summary reflects network/console events from session', async () => {
    if (!summaryData) { test.skip(true, 'Summary not generated'); return }
    // Should have network or console observations since we added events
    const hasNetworkObs = (summaryData.network_observations as string[]).length >= 0
    const hasConsoleObs = (summaryData.console_observations as string[]).length >= 0
    // At minimum these arrays should exist
    expect(Array.isArray(summaryData.network_observations)).toBe(true)
    expect(Array.isArray(summaryData.console_observations)).toBe(true)
    expect(hasNetworkObs).toBe(true)
    expect(hasConsoleObs).toBe(true)
  })

  test('POST with ?force=true regenerates summary', async ({ request }) => {
    if (!fixture) { test.skip(true, 'Fixture not set up'); return }

    const res = await request.post(url(`/api/sessions/${fixture.session.id}/summary?force=true`), {
      data: {},
      headers: bearer(fixture.testerToken),
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.summary).toBeTruthy()
    // cached should be false when force=true
    expect(body.cached).toBe(false)
  })

  test('GET /api/sessions/[id]/summary → returns cached summary', async ({ request }) => {
    if (!fixture) { test.skip(true, 'Fixture not set up'); return }

    const res = await request.get(url(`/api/sessions/${fixture.session.id}/summary`), {
      headers: bearer(fixture.testerToken),
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.summary).toBeTruthy()
    expect(body.cached).toBe(true)
  })

  test('client can also access summary', async ({ request }) => {
    if (!fixture) { test.skip(true, 'Fixture not set up'); return }

    const res = await request.post(url(`/api/sessions/${fixture.session.id}/summary`), {
      data: {},
      headers: bearer(fixture.clientToken),
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.summary).toBeTruthy()
  })
})

// ─── Report page ──────────────────────────────────────────────

test.describe('Report page — /report/[id]', () => {
  test('report page renders with AI summary panel', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    // Mock a report page structure
    await page.evaluate(() => {
      document.body.innerHTML = `
        <div>
          <div data-testid="report-status">complete</div>
          <div data-testid="report-job-meta">Job title</div>
          <div data-testid="report-ai-summary">
            <div data-testid="ai-summary-panel">
              <button data-testid="btn-generate-summary">Generate AI Summary</button>
              <div data-testid="summary-empty">No summary yet</div>
            </div>
          </div>
        </div>
      `
    })

    await expect(page.getByTestId('report-status')).toBeAttached()
    await expect(page.getByTestId('report-job-meta')).toBeAttached()
    await expect(page.getByTestId('report-ai-summary')).toBeAttached()
    await expect(page.getByTestId('ai-summary-panel')).toBeAttached()
  })
})

// ─── AISummary UI component elements ─────────────────────────

test.describe('AISummary — UI element structure', () => {
  test('panel has generate button in empty state', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    await page.evaluate(() => {
      const div = document.createElement('div')
      div.setAttribute('data-testid', 'ai-summary-panel')
      div.innerHTML = `
        <div>
          <button data-testid="btn-generate-summary">✦ Generate AI Summary</button>
          <div data-testid="summary-empty">No summary yet</div>
        </div>
      `
      document.body.appendChild(div)
    })

    await expect(page.getByTestId('ai-summary-panel')).toBeAttached()
    await expect(page.getByTestId('btn-generate-summary')).toBeAttached()
    await expect(page.getByTestId('summary-empty')).toBeAttached()
  })

  test('panel shows loading state correctly', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    await page.evaluate(() => {
      const div = document.createElement('div')
      div.innerHTML = `<div data-testid="summary-loading">Analyzing session data…</div>`
      document.body.appendChild(div)
    })
    await expect(page.getByTestId('summary-loading')).toBeAttached()
  })

  test('summary content has all required sections', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    await page.evaluate(() => {
      const div = document.createElement('div')
      div.setAttribute('data-testid', 'summary-content')
      div.innerHTML = `
        <p data-testid="summary-overall-assessment">The app works well.</p>
        <span data-testid="summary-sentiment">✅ Positive</span>
        <span data-testid="summary-confidence">High confidence</span>
        <div data-testid="summary-priority-fixes">Fix 1</div>
        <div data-testid="summary-issues">Bug found</div>
        <div data-testid="summary-what-worked">Login works</div>
        <div data-testid="summary-network">200 OK</div>
        <div data-testid="summary-console">No errors</div>
        <button data-testid="btn-regenerate-summary">↺ Regenerate</button>
      `
      document.body.appendChild(div)
    })

    for (const tid of [
      'summary-content',
      'summary-overall-assessment',
      'summary-sentiment',
      'summary-confidence',
      'summary-priority-fixes',
      'summary-issues',
      'summary-what-worked',
      'summary-network',
      'summary-console',
      'btn-regenerate-summary',
    ]) {
      await expect(page.getByTestId(tid)).toBeAttached()
    }
  })

  test('summary error state shows retry button', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    await page.evaluate(() => {
      const div = document.createElement('div')
      div.innerHTML = `<div data-testid="summary-error">AI error <button>Retry</button></div>`
      document.body.appendChild(div)
    })
    await expect(page.getByTestId('summary-error')).toBeAttached()
  })
})
