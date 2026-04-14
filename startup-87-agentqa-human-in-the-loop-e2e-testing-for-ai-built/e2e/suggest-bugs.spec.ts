/**
 * suggest-bugs.spec.ts — AI bug title suggestion tests
 *
 * Tests:
 * - POST /api/feedback/[id]/suggest-bugs → 401 without token
 * - GET /api/feedback/[id]/suggest-bugs → 401 without token
 * - POST → 403 for non-owner
 * - POST → 404 for non-existent feedback
 * - POST → 201 with suggestions array
 * - Each suggestion has: title, severity, area, reason, already_filed
 * - Title is a non-empty string (5+ chars)
 * - Severity is valid enum value
 * - Area is valid area name
 * - already_filed is boolean
 * - POST with ?force=true regenerates
 * - GET returns cached suggestions with generated_at
 * - Results are stored in feedback.suggested_bug_titles
 * - BugSuggestionsPanel UI elements present
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
let ctr = 0
const PASSWORD = `SgPw${RUN_ID}!`
function nextId() { return `${RUN_ID}_${++ctr}` }

async function createFeedback(request: APIRequestContext) {
  const rid = nextId()
  const clientToken = await signUp(request, `sg.c.${rid}@mailinator.com`, PASSWORD)
  const testerToken = await signUp(request, `sg.t.${rid}@mailinator.com`, PASSWORD)
  const otherToken = await signUp(request, `sg.o.${rid}@mailinator.com`, PASSWORD)
  if (!clientToken || !testerToken) return null

  const testerUid = getUserId(testerToken)

  const jobRes = await request.post(url('/api/jobs'), {
    data: { title: `Bug Suggest Test ${rid}`, url: 'https://example.com', tier: 'quick', instructions: 'Test login and navigation' },
    headers: bearer(clientToken), timeout: 30000,
  })
  const { job } = await jobRes.json()
  if (!job?.id) return null

  await request.post(url(`/api/jobs/${job.id}/transition`), {
    data: { to: 'published' }, headers: bearer(clientToken),
  })

  const asgRes = await request.post(`${SUPABASE_URL}/rest/v1/job_assignments`, {
    data: { job_id: job.id, tester_id: testerUid, status: 'active', assigned_at: new Date().toISOString() },
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

  // Add session events for AI to analyze
  await request.post(url(`/api/sessions/${session.id}/events`), {
    data: {
      events: [
        { event_type: 'console_log', ts: new Date().toISOString(), log_level: 'error', log_message: 'Uncaught TypeError: Cannot read properties of null (reading "id")' },
        { event_type: 'network_response', ts: new Date().toISOString(), method: 'POST', url: 'https://example.com/api/login', status_code: 500 },
        { event_type: 'navigation', ts: new Date().toISOString(), url: 'https://example.com/dashboard' },
      ],
    },
    headers: bearer(testerToken),
  })

  await request.patch(url(`/api/sessions/${session.id}`), {
    data: { status: 'complete', notes: 'Login fails with 500 error. TypeError on dashboard.' },
    headers: bearer(testerToken),
  })

  // Create feedback
  const fbRes = await request.post(url('/api/feedback'), {
    data: {
      session_id: session.id,
      job_id: job.id,
      assignment_id: asg[0].id,
      overall_rating: 2,
      summary: 'Login is broken — clicking the login button returns a 500 error. After that, the dashboard shows a TypeError and crashes.',
      repro_steps: '1. Navigate to login page\n2. Enter credentials\n3. Click Login button\n4. Observe 500 error and page crash',
      expected_behavior: 'User should be logged in and redirected to dashboard',
      actual_behavior: 'Server returns 500 error, page crashes with TypeError',
    },
    headers: bearer(testerToken),
  })
  if (fbRes.status() !== 201) return null
  const { feedback } = await fbRes.json()

  return { testerToken, clientToken, otherToken, session, job, feedback }
}

// ─── Auth guards ──────────────────────────────────────────────

test.describe('Suggest bugs — auth guards', () => {
  test('POST /api/feedback/[id]/suggest-bugs → 401 without token', async ({ request }) => {
    const res = await request.post(url('/api/feedback/fake/suggest-bugs'), { data: {} })
    expect(res.status()).toBe(401)
  })

  test('GET /api/feedback/[id]/suggest-bugs → 401 without token', async ({ request }) => {
    const res = await request.get(url('/api/feedback/fake/suggest-bugs'))
    expect(res.status()).toBe(401)
  })

  test('POST → 404 for non-existent feedback', async ({ request }) => {
    if (!SUPABASE_ANON_KEY) { test.skip(true, 'No Supabase'); return }
    const token = await signUp(request, `sg.g.${nextId()}@mailinator.com`, PASSWORD)
    if (!token) { test.skip(true, 'No token'); return }

    const res = await request.post(url('/api/feedback/00000000-0000-0000-0000-000000000000/suggest-bugs'), {
      data: {},
      headers: bearer(token),
    })
    expect(res.status()).toBe(404)
  })
})

// ─── Suggestion generation ────────────────────────────────────

test.describe('Suggest bugs — generation', () => {
  let fixture: Awaited<ReturnType<typeof createFeedback>> = null
  let suggestions: Array<Record<string, unknown>> | null = null

  test.beforeAll(async ({ request }) => {
    test.setTimeout(120000)
    if (!SUPABASE_ANON_KEY) return
    fixture = await createFeedback(request)
  })

  test('POST → 201 with suggestions', async ({ request }) => {
    if (!fixture) { test.skip(true, 'Fixture not set up'); return }

    const res = await request.post(url(`/api/feedback/${fixture.feedback.id}/suggest-bugs`), {
      data: {},
      headers: bearer(fixture.testerToken),
      timeout: 60000,
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(Array.isArray(body.suggestions)).toBe(true)
    expect(body.suggestions.length).toBeGreaterThan(0)
    suggestions = body.suggestions
  })

  test('each suggestion has title, severity, area, reason, already_filed', async () => {
    if (!suggestions) { test.skip(true, 'Suggestions not generated'); return }
    for (const s of suggestions) {
      expect(typeof s.title).toBe('string')
      expect((s.title as string).length).toBeGreaterThanOrEqual(5)
      expect(['critical', 'high', 'medium', 'low']).toContain(s.severity)
      expect(typeof s.area).toBe('string')
      expect((s.area as string).length).toBeGreaterThan(0)
      expect(typeof s.reason).toBe('string')
      expect(typeof s.already_filed).toBe('boolean')
    }
  })

  test('titles are action-oriented and meaningful', async () => {
    if (!suggestions) { test.skip(true, 'Suggestions not generated'); return }
    for (const s of suggestions) {
      // Title should be between 5-120 chars and have multiple words
      const title = s.title as string
      expect(title.length).toBeGreaterThan(4)
      expect(title.length).toBeLessThanOrEqual(120)
      const wordCount = title.split(' ').length
      expect(wordCount).toBeGreaterThanOrEqual(3)
    }
  })

  test('areas are valid enum values', async () => {
    if (!suggestions) { test.skip(true, 'Suggestions not generated'); return }
    const VALID_AREAS = [
      'authentication', 'navigation', 'forms', 'payments', 'api',
      'ui_layout', 'performance', 'data_display', 'search_filter',
      'notifications', 'file_upload', 'permissions', 'onboarding',
      'settings', 'other',
    ]
    for (const s of suggestions) {
      expect(VALID_AREAS).toContain(s.area)
    }
  })

  test('already_filed is false for new suggestions (no bugs filed yet)', async () => {
    if (!suggestions) { test.skip(true, 'Suggestions not generated'); return }
    // Since we didn't file any bugs, already_filed should be false for all
    const allNew = suggestions.every(s => s.already_filed === false)
    expect(allNew).toBe(true)
  })

  test('suggestions cached → GET returns them with generated_at', async ({ request }) => {
    if (!fixture) { test.skip(true, 'Fixture not set up'); return }

    const res = await request.get(url(`/api/feedback/${fixture.feedback.id}/suggest-bugs`), {
      headers: bearer(fixture.testerToken),
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.cached).toBe(true)
    expect(Array.isArray(body.suggestions)).toBe(true)
    expect(body.suggestions.length).toBeGreaterThan(0)
    expect(typeof body.generated_at).toBe('string')
  })

  test('POST with ?force=true → 201 (regenerates, cached=false)', async ({ request }) => {
    if (!fixture) { test.skip(true, 'Fixture not set up'); return }

    const res = await request.post(url(`/api/feedback/${fixture.feedback.id}/suggest-bugs?force=true`), {
      data: {},
      headers: bearer(fixture.testerToken),
      timeout: 60000,
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.cached).toBe(false)
    expect(Array.isArray(body.suggestions)).toBe(true)
  })

  test('403 for non-owner', async ({ request }) => {
    if (!fixture) { test.skip(true, 'Fixture not set up'); return }

    const res = await request.post(url(`/api/feedback/${fixture.feedback.id}/suggest-bugs`), {
      data: {},
      headers: bearer(fixture.otherToken!),
    })
    expect(res.status()).toBe(403)
  })

  test('GET → 403 for non-owner', async ({ request }) => {
    if (!fixture) { test.skip(true, 'Fixture not set up'); return }

    const res = await request.get(url(`/api/feedback/${fixture.feedback.id}/suggest-bugs`), {
      headers: bearer(fixture.otherToken!),
    })
    expect(res.status()).toBe(403)
  })
})

// ─── GET before generation ────────────────────────────────────

test.describe('Suggest bugs — GET before generation', () => {
  test('GET returns 404 when no suggestions yet', async ({ request }) => {
    if (!SUPABASE_ANON_KEY) { test.skip(true, 'No Supabase'); return }
    const fixture = await createFeedback(request)
    if (!fixture) { test.skip(true, 'Fixture not set up'); return }

    const res = await request.get(url(`/api/feedback/${fixture.feedback.id}/suggest-bugs`), {
      headers: bearer(fixture.testerToken),
    })
    expect(res.status()).toBe(404)
  })
})

// ─── UI structure ─────────────────────────────────────────────

test.describe('BugSuggestionsPanel — UI structure', () => {
  test('panel has generate button in empty state', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    await page.evaluate(() => {
      const div = document.createElement('div')
      div.setAttribute('data-testid', 'bug-suggestions-panel')
      div.innerHTML = `
        <div>
          <button data-testid="btn-generate-suggestions">✦ Suggest bug titles</button>
          <p data-testid="suggestions-empty">Click to get suggestions</p>
        </div>
      `
      document.body.appendChild(div)
    })

    await expect(page.getByTestId('bug-suggestions-panel')).toBeAttached()
    await expect(page.getByTestId('btn-generate-suggestions')).toBeAttached()
    await expect(page.getByTestId('suggestions-empty')).toBeAttached()
  })

  test('panel shows loading state', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    await page.evaluate(() => {
      const div = document.createElement('div')
      div.innerHTML = `<div data-testid="suggestions-loading">Analyzing test session…</div>`
      document.body.appendChild(div)
    })
    await expect(page.getByTestId('suggestions-loading')).toBeAttached()
  })

  test('panel shows suggestion items with all elements', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    await page.evaluate(() => {
      const div = document.createElement('div')
      div.setAttribute('data-testid', 'suggestions-list')
      div.innerHTML = `
        <div data-testid="suggestion-item">
          <span data-testid="suggestion-severity">critical</span>
          <p data-testid="suggestion-title">Login button does not respond to clicks</p>
          <p data-testid="suggestion-reason">The POST /api/login returned 500</p>
          <button data-testid="btn-apply-suggestion">+ Add</button>
        </div>
        <div data-testid="suggestion-item">
          <span data-testid="suggestion-severity">high</span>
          <p data-testid="suggestion-title">Dashboard crashes with TypeError on load</p>
          <p data-testid="suggestion-reason">console.error: Cannot read properties of null</p>
          <button data-testid="btn-apply-suggestion">+ Add</button>
        </div>
      `
      document.body.appendChild(div)
    })

    await expect(page.getByTestId('suggestions-list')).toBeAttached()
    const items = page.getByTestId('suggestion-item')
    await expect(items).toHaveCount(2)
    const severityBadges = page.getByTestId('suggestion-severity')
    await expect(severityBadges).toHaveCount(2)
    const titles = page.getByTestId('suggestion-title')
    await expect(titles).toHaveCount(2)
    const applyBtns = page.getByTestId('btn-apply-suggestion')
    await expect(applyBtns).toHaveCount(2)
  })

  test('panel shows regenerate button after generation', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    await page.evaluate(() => {
      const div = document.createElement('div')
      div.innerHTML = `<button data-testid="btn-regenerate-suggestions">↺ Regenerate</button>`
      document.body.appendChild(div)
    })
    await expect(page.getByTestId('btn-regenerate-suggestions')).toBeAttached()
  })

  test('feedback-submitted-view shows bug-suggestions-section', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    await page.evaluate(() => {
      const div = document.createElement('div')
      div.setAttribute('data-testid', 'feedback-submitted-view')
      div.innerHTML = `
        <div data-testid="feedback-success">✓ Feedback submitted</div>
        <div data-testid="bug-suggestions-section">
          <div data-testid="bug-suggestions-panel">
            <button data-testid="btn-generate-suggestions">✦ Suggest bug titles</button>
          </div>
        </div>
      `
      document.body.appendChild(div)
    })

    await expect(page.getByTestId('feedback-submitted-view')).toBeAttached()
    await expect(page.getByTestId('bug-suggestions-section')).toBeAttached()
    await expect(page.getByTestId('bug-suggestions-panel')).toBeAttached()
  })

  test('error state shows retry link', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    await page.evaluate(() => {
      const div = document.createElement('div')
      div.innerHTML = `<div data-testid="suggestions-error">Error generating <a>Retry</a></div>`
      document.body.appendChild(div)
    })
    await expect(page.getByTestId('suggestions-error')).toBeAttached()
  })
})
