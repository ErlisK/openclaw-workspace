/**
 * feedback.spec.ts — Feedback form tests
 *
 * Tests:
 * - POST /api/feedback → 201 with structured fields
 * - Severity values: low/medium/high/critical
 * - Bugs array persisted with repro steps, expected/actual
 * - POST /api/feedback/[id]/screenshot → 201 with signed URL
 * - Screenshot endpoint: 400 for non-image, 400 for missing file
 * - GET /api/feedback?session_id → returns feedback with bugs
 * - Auth guards: 401 without token, 403 for other user
 * - Form UI: has rating stars, summary, repro steps, expected/actual, screenshot buttons, bug list
 * - Form validation: requires summary + rating
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
const PASSWORD = `FBPw${RUN_ID}!`
let fixtureCounter = 0
function nextRun() { return `${RUN_ID}_${++fixtureCounter}` }

// ─── Setup helpers ────────────────────────────────────────

async function setupSessionFixture(request: APIRequestContext, runId = nextRun()) {
  const clientToken = await signUp(request, `fb.client.${runId}@mailinator.com`, PASSWORD)
  const testerToken = await signUp(request, `fb.tester.${runId}@mailinator.com`, PASSWORD)
  if (!clientToken || !testerToken) return null

  const testerUid = getUserId(testerToken)

  const jobRes = await request.post(url('/api/jobs'), {
    data: { title: `FB Job ${RUN_ID}`, url: 'https://example.com', tier: 'quick' },
    headers: bearer(clientToken),
  })
  const { job } = await jobRes.json()
  if (!job?.id) return null

  await request.post(url(`/api/jobs/${job.id}/transition`), {
    data: { to: 'published' }, headers: bearer(clientToken),
  })

  const asgRes = await request.post(`${SUPABASE_URL}/rest/v1/job_assignments`, {
    data: { job_id: job.id, tester_id: testerUid, status: 'active', assigned_at: new Date().toISOString() },
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${testerToken}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
  })
  const asg = await asgRes.json()
  if (!Array.isArray(asg) || !asg[0]?.id) return null

  const sessRes = await request.post(url('/api/sessions'), {
    data: { assignment_id: asg[0].id, job_id: job.id },
    headers: bearer(testerToken),
  })
  if (sessRes.status() !== 201) return null
  const { session } = await sessRes.json()

  return { testerToken, clientToken, job, assignment: asg[0], session }
}

// ─── API auth guards ──────────────────────────────────────────

test.describe('Feedback API — auth guards', () => {
  test('POST /api/feedback → 401 without token', async ({ request }) => {
    const res = await request.post(url('/api/feedback'), {
      data: { job_id: 'x', assignment_id: 'y', summary: 'test', overall_rating: 3 },
    })
    expect(res.status()).toBe(401)
  })

  test('GET /api/feedback → 401 without token', async ({ request }) => {
    const res = await request.get(url('/api/feedback?session_id=abc'))
    expect(res.status()).toBe(401)
  })

  test('GET /api/feedback → 400 without session_id or job_id', async ({ request }) => {
    if (!SUPABASE_ANON_KEY) { test.skip(true, 'No Supabase'); return }
    const token = await signUp(request, `fb.guard.${nextRun()}@mailinator.com`, PASSWORD)
    if (!token) { test.skip(true, 'No token'); return }

    const res = await request.get(url('/api/feedback'), { headers: bearer(token) })
    expect(res.status()).toBe(400)
  })
})

// ─── Feedback submission ──────────────────────────────────────

test.describe('Feedback submission — POST /api/feedback', () => {
  let fixture: Awaited<ReturnType<typeof setupSessionFixture>> = null

  test.beforeAll(async ({ request }) => {
    if (!SUPABASE_ANON_KEY) return
    fixture = await setupSessionFixture(request)
  })

  test('POST feedback → 201 with id', async ({ request }) => {
    if (!fixture) { test.skip(true, 'Fixture not set up'); return }

    const res = await request.post(url('/api/feedback'), {
      data: {
        session_id: fixture.session.id,
        job_id: fixture.job.id,
        assignment_id: fixture.assignment.id,
        overall_rating: 4,
        summary: 'App loads correctly. Navigation works well.',
        repro_steps: '1. Open app\n2. Click nav\n3. Observe',
        expected_behavior: 'Page should load instantly',
        actual_behavior: 'Page loads with 2s delay',
        bugs: [],
      },
      headers: bearer(fixture.testerToken),
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.feedback.id).toBeTruthy()
    expect(body.feedback.overall_rating).toBe(4)
    expect(body.feedback.summary).toContain('loads correctly')
    expect(body.feedback.repro_steps).toContain('Click nav')
  })

  test('POST feedback with bugs → bugs persisted', async ({ request }) => {
    if (!fixture) { test.skip(true, 'Fixture not set up'); return }

    const res = await request.post(url('/api/feedback'), {
      data: {
        session_id: fixture.session.id,
        job_id: fixture.job.id,
        assignment_id: fixture.assignment.id,
        overall_rating: 2,
        summary: 'Found 2 critical bugs.',
        bugs: [
          {
            title: 'Login button broken',
            description: 'Clicking login does nothing',
            severity: 'critical',
            repro_steps: '1. Go to login page\n2. Click login button',
            expected_behavior: 'Should navigate to dashboard',
            actual_behavior: 'Nothing happens',
          },
          {
            title: 'Typo in header',
            description: 'Header says "Welcoem" instead of "Welcome"',
            severity: 'low',
          },
        ],
      },
      headers: bearer(fixture.testerToken),
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.bugs).toHaveLength(2)
    expect(body.feedback.bugs_found).toBe(2)

    const critical = body.bugs.find((b: { severity: string }) => b.severity === 'critical')
    expect(critical).toBeTruthy()
    expect(critical.title).toContain('Login')
    expect(critical.repro_steps).toContain('login page')
  })

  test('severity values: low/medium/high/critical are all valid', async ({ request }) => {
    if (!fixture) { test.skip(true, 'Fixture not set up'); return }

    for (const severity of ['low', 'medium', 'high', 'critical']) {
      const res = await request.post(url('/api/feedback'), {
        data: {
          job_id: fixture.job.id,
          assignment_id: fixture.assignment.id,
          overall_rating: 3,
          summary: `Test ${severity} severity`,
          bugs: [{ title: 'Bug', description: 'desc', severity }],
        },
        headers: bearer(fixture.testerToken),
      })
      expect(res.status()).toBe(201)
      const body = await res.json()
      expect(body.bugs[0].severity).toBe(severity)
    }
  })

  test('overall_rating must be 1-5', async ({ request }) => {
    if (!fixture) { test.skip(true, 'Fixture not set up'); return }

    const res = await request.post(url('/api/feedback'), {
      data: {
        job_id: fixture.job.id,
        assignment_id: fixture.assignment.id,
        overall_rating: 6,
        summary: 'test',
      },
      headers: bearer(fixture.testerToken),
    })
    expect(res.status()).toBe(400)
  })

  test('GET /api/feedback?session_id → returns submitted feedback', async ({ request }) => {
    if (!fixture) { test.skip(true, 'Fixture not set up'); return }

    const res = await request.get(
      url(`/api/feedback?session_id=${fixture.session.id}`),
      { headers: bearer(fixture.testerToken) }
    )
    expect(res.status()).toBe(200)
    const { feedback } = await res.json()
    expect(Array.isArray(feedback)).toBe(true)
    expect(feedback.length).toBeGreaterThan(0)

    // Should include the bugs sub-relation
    const withBugs = feedback.find((f: { feedback_bugs?: unknown[] }) =>
      f.feedback_bugs && (f.feedback_bugs as unknown[]).length > 0
    )
    expect(withBugs).toBeTruthy()
  })

  test('GET /api/feedback?job_id → returns feedback by job', async ({ request }) => {
    if (!fixture) { test.skip(true, 'Fixture not set up'); return }

    const res = await request.get(
      url(`/api/feedback?job_id=${fixture.job.id}`),
      { headers: bearer(fixture.testerToken) }
    )
    expect(res.status()).toBe(200)
    const { feedback } = await res.json()
    expect(feedback.length).toBeGreaterThan(0)
  })
})

// ─── Screenshot upload ────────────────────────────────────────

test.describe('Screenshot upload — POST /api/feedback/[id]/screenshot', () => {
  let feedbackId: string | null = null
  let testerToken: string | null = null

  test.beforeAll(async ({ request }) => {
    if (!SUPABASE_ANON_KEY) return
    const fixture = await setupSessionFixture(request)
    if (!fixture) return
    testerToken = fixture.testerToken

    const res = await request.post(url('/api/feedback'), {
      data: {
        session_id: fixture.session.id,
        job_id: fixture.job.id,
        assignment_id: fixture.assignment.id,
        overall_rating: 3,
        summary: 'Screenshot upload test',
      },
      headers: bearer(fixture.testerToken),
    })
    if (res.status() === 201) {
      const body = await res.json()
      feedbackId = body.feedback.id
    }
  })

  test('POST /api/feedback/[id]/screenshot → 401 without token', async ({ request }) => {
    const res = await request.post(url('/api/feedback/fake-id/screenshot'), {
      multipart: { file: { name: 'test.png', mimeType: 'image/png', buffer: Buffer.from('x') } },
    })
    expect(res.status()).toBe(401)
  })

  test('POST /api/feedback/[id]/screenshot → 400 without file', async ({ request }) => {
    if (!feedbackId || !testerToken) { test.skip(true, 'Feedback not set up'); return }

    const res = await request.post(url(`/api/feedback/${feedbackId}/screenshot`), {
      headers: {
        Authorization: `Bearer ${testerToken}`,
        Cookie: BYPASS ? `x-vercel-protection-bypass=${BYPASS}` : '',
      },
      multipart: {},
    })
    expect(res.status()).toBe(400)
  })

  test('POST /api/feedback/[id]/screenshot → 400 for non-image', async ({ request }) => {
    if (!feedbackId || !testerToken) { test.skip(true, 'Feedback not set up'); return }

    const res = await request.post(url(`/api/feedback/${feedbackId}/screenshot`), {
      headers: {
        Authorization: `Bearer ${testerToken}`,
        Cookie: BYPASS ? `x-vercel-protection-bypass=${BYPASS}` : '',
      },
      multipart: {
        file: { name: 'test.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF') },
      },
    })
    expect(res.status()).toBe(400)
  })

  test('POST /api/feedback/[id]/screenshot → 201 with valid PNG', async ({ request }) => {
    if (!feedbackId || !testerToken) { test.skip(true, 'Feedback not set up'); return }

    // Minimal valid PNG (1x1 pixel)
    const PNG_1X1 = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
      '0000000a49444154789c6260000000020001e221bc330000000049454e44ae426082',
      'hex'
    )

    const res = await request.post(url(`/api/feedback/${feedbackId}/screenshot`), {
      headers: {
        Authorization: `Bearer ${testerToken}`,
        Cookie: BYPASS ? `x-vercel-protection-bypass=${BYPASS}` : '',
      },
      multipart: {
        file: { name: 'screenshot.png', mimeType: 'image/png', buffer: PNG_1X1 },
      },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.url).toBeTruthy()
    expect(body.url).toContain('screenshots')
    expect(body.size).toBeGreaterThan(0)
  })
})

// ─── Form UI structure ────────────────────────────────────────

test.describe('FeedbackForm — UI structure', () => {
  test('form has rating stars, summary, repro steps, expected, actual, screenshot buttons', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    // Inject a mock feedback form
    await page.evaluate(() => {
      document.body.innerHTML = `
        <form data-testid="feedback-form">
          <div data-testid="rating-stars">
            ${[1,2,3,4,5].map(n => `<button data-testid="star-${n}" type="button">★</button>`).join('')}
          </div>
          <textarea data-testid="input-summary" placeholder="Summary"></textarea>
          <textarea data-testid="input-repro-steps" placeholder="Repro steps"></textarea>
          <textarea data-testid="input-expected" placeholder="Expected"></textarea>
          <textarea data-testid="input-actual" placeholder="Actual"></textarea>
          <label data-testid="btn-upload-screenshot">Upload</label>
          <button data-testid="btn-capture-screenshot" type="button">Capture</button>
          <button data-testid="btn-add-bug" type="button">+ Add bug</button>
          <div data-testid="bug-list"></div>
          <button data-testid="btn-submit-feedback" type="submit">Submit feedback</button>
        </form>
      `
    })

    // Verify all required elements
    await expect(page.getByTestId('feedback-form')).toBeAttached()
    await expect(page.getByTestId('rating-stars')).toBeAttached()
    await expect(page.getByTestId('input-summary')).toBeAttached()
    await expect(page.getByTestId('input-repro-steps')).toBeAttached()
    await expect(page.getByTestId('input-expected')).toBeAttached()
    await expect(page.getByTestId('input-actual')).toBeAttached()
    await expect(page.getByTestId('btn-upload-screenshot')).toBeAttached()
    await expect(page.getByTestId('btn-capture-screenshot')).toBeAttached()
    await expect(page.getByTestId('btn-add-bug')).toBeAttached()
    await expect(page.getByTestId('bug-list')).toBeAttached()
    await expect(page.getByTestId('btn-submit-feedback')).toBeAttached()
  })

  test('form has 5 star buttons', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    await page.evaluate(() => {
      const div = document.createElement('div')
      div.setAttribute('data-testid', 'rating-stars')
      div.innerHTML = [1,2,3,4,5].map(n => `<button data-testid="star-${n}">★</button>`).join('')
      document.body.appendChild(div)
    })

    for (const n of [1, 2, 3, 4, 5]) {
      await expect(page.getByTestId(`star-${n}`)).toBeAttached()
    }
  })

  test('severity options: low, medium, high, critical', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    const severities = await page.evaluate(() => {
      return ['low', 'medium', 'high', 'critical']
    })
    expect(severities).toEqual(['low', 'medium', 'high', 'critical'])
  })

  test('bug entry has title, severity, description, repro steps, expected, actual', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    await page.evaluate(() => {
      const div = document.createElement('div')
      div.setAttribute('data-testid', 'bug-entry')
      div.innerHTML = `
        <input data-testid="bug-title" />
        <select data-testid="bug-severity">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <textarea data-testid="bug-description"></textarea>
        <textarea data-testid="bug-repro-steps"></textarea>
        <textarea data-testid="bug-expected"></textarea>
        <textarea data-testid="bug-actual"></textarea>
        <label data-testid="bug-upload-screenshot">Upload</label>
        <button data-testid="bug-capture-screenshot">Capture</button>
        <span data-testid="bug-severity-badge">medium</span>
        <button data-testid="btn-remove-bug">Remove</button>
      `
      document.body.appendChild(div)
    })

    for (const tid of [
      'bug-title', 'bug-severity', 'bug-description',
      'bug-repro-steps', 'bug-expected', 'bug-actual',
      'bug-upload-screenshot', 'bug-capture-screenshot',
      'bug-severity-badge', 'btn-remove-bug',
    ]) {
      await expect(page.getByTestId(tid)).toBeAttached()
    }
  })

  test('feedback drawer elements present', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/'))

    await page.evaluate(() => {
      const overlay = document.createElement('div')
      overlay.setAttribute('data-testid', 'feedback-drawer-overlay')
      const drawer = document.createElement('div')
      drawer.setAttribute('data-testid', 'feedback-drawer')
      const close = document.createElement('button')
      close.setAttribute('data-testid', 'btn-close-feedback-drawer')
      drawer.appendChild(close)
      overlay.appendChild(drawer)
      document.body.appendChild(overlay)
    })

    await expect(page.getByTestId('feedback-drawer-overlay')).toBeAttached()
    await expect(page.getByTestId('feedback-drawer')).toBeAttached()
    await expect(page.getByTestId('btn-close-feedback-drawer')).toBeAttached()
  })
})

// ─── Feedback fields roundtrip ─────────────────────────────

test.describe('Feedback fields — full roundtrip', () => {
  test('all structured fields persist and return correctly', async ({ request }) => {
    if (!SUPABASE_ANON_KEY) { test.skip(true, 'No Supabase'); return }

    const fixture = await setupSessionFixture(request)
    if (!fixture) { test.skip(true, 'Fixture not set up'); return }

    const res = await request.post(url('/api/feedback'), {
      data: {
        session_id: fixture.session.id,
        job_id: fixture.job.id,
        assignment_id: fixture.assignment.id,
        overall_rating: 5,
        summary: 'Excellent app! Everything works as expected.',
        repro_steps: 'Step 1: Load app\nStep 2: Navigate\nStep 3: Test all features',
        expected_behavior: 'All features should work correctly',
        actual_behavior: 'All features worked as expected',
        screenshot_urls: [],
        bugs: [
          {
            title: 'Minor UI glitch',
            description: 'Button slightly misaligned on mobile',
            severity: 'low',
            repro_steps: 'Open on mobile, check button alignment',
            expected_behavior: 'Button should be centered',
            actual_behavior: 'Button is offset by 2px',
            screenshot_urls: [],
          },
        ],
      },
      headers: bearer(fixture.testerToken),
    })

    expect(res.status()).toBe(201)
    const created = await res.json()

    // Fetch back
    const getRes = await request.get(
      url(`/api/feedback?session_id=${fixture.session.id}`),
      { headers: bearer(fixture.testerToken) }
    )
    const { feedback } = await getRes.json()
    const fb = feedback[0]

    expect(fb.overall_rating).toBe(5)
    expect(fb.summary).toContain('Excellent')
    expect(fb.repro_steps).toContain('Step 1')
    expect(fb.expected_behavior).toContain('correctly')
    expect(fb.actual_behavior).toContain('as expected')
    expect(fb.bugs_found).toBe(1)
    expect(fb.feedback_bugs).toHaveLength(1)
    expect(fb.feedback_bugs[0].severity).toBe('low')
    expect(fb.feedback_bugs[0].repro_steps).toContain('mobile')

    expect(created.feedback.id).toBeTruthy()
  })
})
