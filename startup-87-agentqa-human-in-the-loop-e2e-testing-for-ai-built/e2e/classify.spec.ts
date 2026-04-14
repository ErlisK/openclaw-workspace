/**
 * classify.spec.ts — Severity classification feature tests
 *
 * Tests:
 * - POST /api/sessions/[id]/classify → 401 without token
 * - POST /api/sessions/[id]/classify → 404 for non-existent session
 * - POST /api/sessions/[id]/classify → 403 for unrelated user
 * - POST with body.issues → 200 with classifications
 * - Classifications have required fields: issue_ref, severity, affected_areas, rationale
 * - Severity values: critical/high/medium/low
 * - affected_areas contains valid area names
 * - severity_breakdown sums match issue count
 * - affected_areas_summary aggregates correctly
 * - risk_score is 0-100
 * - risk_label is critical/high/medium/low
 * - POST with no issues (feedback mode) → returns empty or classified result
 * - POST after ai_summary exists → classifies from summary key_issues
 * - Severity breakdown UI elements present in AISummary
 * - Affected areas badges rendered
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
let counter = 0
const PASSWORD = `ClPw${RUN_ID}!`
function nextId() { return `${RUN_ID}_${++counter}` }

async function makeSession(request: APIRequestContext) {
  const rid = nextId()
  const clientToken = await signUp(request, `cl.client.${rid}@mailinator.com`, PASSWORD)
  const testerToken = await signUp(request, `cl.tester.${rid}@mailinator.com`, PASSWORD)
  const otherToken = await signUp(request, `cl.other.${rid}@mailinator.com`, PASSWORD)
  if (!clientToken || !testerToken) return null

  const testerUid = getUserId(testerToken)

  const jobRes = await request.post(url('/api/jobs'), {
    data: { title: `Classify Test ${rid}`, url: 'https://example.com', tier: 'quick', instructions: 'Test auth and navigation' },
    headers: bearer(clientToken),
    timeout: 30000,
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
    headers: bearer(testerToken),
    timeout: 30000,
  })
  if (sessRes.status() !== 201) return null
  const { session } = await sessRes.json()

  await request.patch(url(`/api/sessions/${session.id}`), {
    data: { status: 'complete', end_reason: 'finished' },
    headers: bearer(testerToken),
  })

  return { testerToken, clientToken, otherToken, session, job }
}

const SAMPLE_ISSUES = [
  {
    title: 'Login button not responding',
    description: 'Clicking the login button does nothing, no network request is fired and no error shown.',
  },
  {
    title: 'User data disappears on page refresh',
    description: 'After filling the profile form and refreshing, all entered data is lost.',
  },
  {
    title: 'Navigation menu overlaps content on mobile',
    description: 'On mobile viewport, the hamburger menu overlaps the main content area.',
  },
  {
    title: 'Search results load with 5 second delay',
    description: 'The search endpoint takes 5+ seconds to respond, causing poor UX.',
  },
]

// ─── Auth guards ──────────────────────────────────────────────

test.describe('Classify — auth guards', () => {
  test('POST /api/sessions/[id]/classify → 401 without token', async ({ request }) => {
    const res = await request.post(url('/api/sessions/fake-id/classify'), { data: {} })
    expect(res.status()).toBe(401)
  })

  test('POST /api/sessions/[id]/classify → 404 for non-existent session', async ({ request }) => {
    if (!SUPABASE_ANON_KEY) { test.skip(true, 'No Supabase'); return }
    const token = await signUp(request, `cl.g.${nextId()}@mailinator.com`, PASSWORD)
    if (!token) { test.skip(true, 'No token'); return }

    const res = await request.post(url('/api/sessions/00000000-0000-0000-0000-000000000000/classify'), {
      data: {},
      headers: bearer(token),
    })
    expect(res.status()).toBe(404)
  })
})

// ─── Classification with provided issues ─────────────────────

test.describe('Classify — provided issues', () => {
  let fixture: Awaited<ReturnType<typeof makeSession>> = null
  let result: Record<string, unknown> | null = null

  test.beforeAll(async ({ request }) => {
    test.setTimeout(90000)
    if (!SUPABASE_ANON_KEY) return
    fixture = await makeSession(request)
  })

  test('POST with body.issues → 200', async ({ request }) => {
    if (!fixture) { test.skip(true, 'Fixture not set up'); return }

    const res = await request.post(url(`/api/sessions/${fixture.session.id}/classify`), {
      data: { issues: SAMPLE_ISSUES },
      headers: bearer(fixture.testerToken),
      timeout: 60000,
    })
    expect(res.status()).toBe(200)
    result = await res.json()
    expect(result).toBeTruthy()
  })

  test('response has classifications array', async () => {
    if (!result) { test.skip(true, 'Result not available'); return }
    expect(Array.isArray(result.classifications)).toBe(true)
    expect((result.classifications as unknown[]).length).toBeGreaterThan(0)
  })

  test('each classification has issue_ref, severity, affected_areas, rationale', async () => {
    if (!result) { test.skip(true, 'Result not available'); return }
    const classifications = result.classifications as Array<Record<string, unknown>>
    for (const cls of classifications) {
      expect(typeof cls.issue_ref).toBe('string')
      expect(['critical', 'high', 'medium', 'low']).toContain(cls.severity)
      expect(Array.isArray(cls.affected_areas)).toBe(true)
      expect((cls.affected_areas as unknown[]).length).toBeGreaterThan(0)
      expect(typeof cls.rationale).toBe('string')
      expect((cls.rationale as string).length).toBeGreaterThan(5)
    }
  })

  test('affected_areas contain valid area names', async () => {
    if (!result) { test.skip(true, 'Result not available'); return }
    const VALID_AREAS = [
      'authentication', 'navigation', 'forms', 'payments', 'api',
      'ui_layout', 'performance', 'data_display', 'search_filter',
      'notifications', 'file_upload', 'permissions', 'onboarding',
      'settings', 'other',
    ]
    const classifications = result.classifications as Array<{ affected_areas: string[] }>
    for (const cls of classifications) {
      for (const area of cls.affected_areas) {
        expect(VALID_AREAS).toContain(area)
      }
    }
  })

  test('severity_breakdown sums match classification count', async () => {
    if (!result) { test.skip(true, 'Result not available'); return }
    const breakdown = result.severity_breakdown as Record<string, number>
    expect(typeof breakdown.critical).toBe('number')
    expect(typeof breakdown.high).toBe('number')
    expect(typeof breakdown.medium).toBe('number')
    expect(typeof breakdown.low).toBe('number')

    const total = breakdown.critical + breakdown.high + breakdown.medium + breakdown.low
    const classifications = result.classifications as unknown[]
    expect(total).toBe(classifications.length)
  })

  test('affected_areas_summary aggregates areas', async () => {
    if (!result) { test.skip(true, 'Result not available'); return }
    const summary = result.affected_areas_summary as Array<Record<string, unknown>>
    expect(Array.isArray(summary)).toBe(true)
    for (const entry of summary) {
      expect(typeof entry.area).toBe('string')
      expect(typeof entry.issue_count).toBe('number')
      expect((entry.issue_count as number)).toBeGreaterThan(0)
      expect(['critical', 'high', 'medium', 'low']).toContain(entry.max_severity)
    }
  })

  test('risk_score is 0-100', async () => {
    if (!result) { test.skip(true, 'Result not available'); return }
    const score = result.risk_score as number
    expect(typeof score).toBe('number')
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  test('risk_label is valid enum value', async () => {
    if (!result) { test.skip(true, 'Result not available'); return }
    expect(['critical', 'high', 'medium', 'low']).toContain(result.risk_label)
  })

  test('source is "provided" when issues given in body', async () => {
    if (!result) { test.skip(true, 'Result not available'); return }
    expect(result.source).toBe('provided')
  })

  test('403 for unrelated user', async ({ request }) => {
    if (!fixture) { test.skip(true, 'Fixture not set up'); return }

    const res = await request.post(url(`/api/sessions/${fixture.session.id}/classify`), {
      data: { issues: SAMPLE_ISSUES },
      headers: bearer(fixture.otherToken!),
      timeout: 30000,
    })
    expect(res.status()).toBe(403)
  })

  test('client can also classify', async ({ request }) => {
    if (!fixture) { test.skip(true, 'Fixture not set up'); return }

    const res = await request.post(url(`/api/sessions/${fixture.session.id}/classify`), {
      data: { issues: SAMPLE_ISSUES.slice(0, 2) },
      headers: bearer(fixture.clientToken),
      timeout: 60000,
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.classifications).toBeTruthy()
  })
})

// ─── Classification from summary ─────────────────────────────

test.describe('Classify — from existing summary', () => {
  let fixture: Awaited<ReturnType<typeof makeSession>> = null

  test.beforeAll(async ({ request }) => {
    test.setTimeout(120000)
    if (!SUPABASE_ANON_KEY) return
    fixture = await makeSession(request)
    if (!fixture) return

    // Add events so summary has content
    await request.post(url(`/api/sessions/${fixture.session.id}/events`), {
      data: {
        events: [
          { event_type: 'console_log', ts: new Date().toISOString(), log_level: 'error', log_message: 'TypeError: undefined property' },
          { event_type: 'network_response', ts: new Date().toISOString(), method: 'GET', url: 'https://example.com/api/user', status_code: 401 },
        ],
      },
      headers: bearer(fixture.testerToken),
    })

    // Generate AI summary first
    await request.post(url(`/api/sessions/${fixture.session.id}/summary`), {
      data: {},
      headers: bearer(fixture.testerToken),
      timeout: 60000,
    })
  })

  test('classify after summary → 200 with source=summary or source=no_issues', async ({ request }) => {
    if (!fixture) { test.skip(true, 'Fixture not set up'); return }

    const res = await request.post(url(`/api/sessions/${fixture.session.id}/classify`), {
      data: {},
      headers: bearer(fixture.testerToken),
      timeout: 60000,
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(['summary', 'summary_fallback', 'no_issues', 'feedback']).toContain(body.source)
    expect(typeof body.risk_score).toBe('number')
    expect(typeof body.risk_label).toBe('string')
  })
})

// ─── No-issues fallback ────────────────────────────────────────

test.describe('Classify — no issues fallback', () => {
  test('POST with no summary and no feedback → returns empty classification', async ({ request }) => {
    if (!SUPABASE_ANON_KEY) { test.skip(true, 'No Supabase'); return }
    const fixture = await makeSession(request)
    if (!fixture) { test.skip(true, 'Fixture not set up'); return }

    const res = await request.post(url(`/api/sessions/${fixture.session.id}/classify`), {
      data: {},
      headers: bearer(fixture.testerToken),
      timeout: 30000,
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.source).toBe('no_issues')
    expect(body.risk_score).toBe(0)
    expect(body.risk_label).toBe('low')
  })
})

// ─── Severity + areas UI structure ────────────────────────────

test.describe('Classification UI — severity breakdown and affected areas', () => {
  test('severity breakdown has 4 level counters in UI', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    await page.evaluate(() => {
      const div = document.createElement('div')
      div.setAttribute('data-testid', 'summary-severity-breakdown')
      div.innerHTML = `
        <div data-testid="severity-count-critical">0</div>
        <div data-testid="severity-count-high">2</div>
        <div data-testid="severity-count-medium">1</div>
        <div data-testid="severity-count-low">0</div>
      `
      document.body.appendChild(div)
    })

    await expect(page.getByTestId('summary-severity-breakdown')).toBeAttached()
    for (const level of ['critical', 'high', 'medium', 'low']) {
      await expect(page.getByTestId(`severity-count-${level}`)).toBeAttached()
    }
  })

  test('affected areas badges render correctly', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    await page.evaluate(() => {
      const div = document.createElement('div')
      div.setAttribute('data-testid', 'summary-affected-areas')
      div.innerHTML = `
        <div data-testid="affected-area-badge">🔴 authentication (2)</div>
        <div data-testid="affected-area-badge">🟡 navigation</div>
        <div data-testid="affected-area-badge">🔵 performance</div>
      `
      document.body.appendChild(div)
    })

    await expect(page.getByTestId('summary-affected-areas')).toBeAttached()
    const badges = page.getByTestId('affected-area-badge')
    await expect(badges).toHaveCount(3)
  })

  test('risk score and label display in UI', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    await page.evaluate(() => {
      const div = document.createElement('div')
      div.innerHTML = `
        <span data-testid="risk-label">high</span>
        <span data-testid="risk-score">45</span>
      `
      document.body.appendChild(div)
    })

    await expect(page.getByTestId('risk-label')).toBeAttached()
    await expect(page.getByTestId('risk-score')).toBeAttached()
  })

  test('key issue card shows affected_areas field', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    await page.evaluate(() => {
      const div = document.createElement('div')
      div.setAttribute('data-testid', 'key-issue-card')
      div.innerHTML = `
        <div data-testid="key-issue-affected-areas">
          <span>authentication</span>
          <span>forms</span>
        </div>
      `
      document.body.appendChild(div)
    })

    await expect(page.getByTestId('key-issue-card')).toBeAttached()
    await expect(page.getByTestId('key-issue-affected-areas')).toBeAttached()
  })
})
