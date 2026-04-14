/**
 * playground.spec.ts — /playground/target page + deterministic sandbox flow E2E
 *
 * Tests:
 * 1. /playground/target page loads and renders correctly (no auth needed)
 * 2. /api/playground/ping returns deterministic JSON
 * 3. Full sandbox flow: post job → assign → create session → post logs from
 *    /playground/target simulation → verify ≥1 network + ≥1 console event
 * 4. Session events logged correctly (event_type, ts, session_id)
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
const PW = `PgPw${RUN}!`
let ctr = 0
const rid = () => `${RUN}_${++ctr}`

// ── /playground/target page ───────────────────────────────────

test.describe('/playground/target — static page', () => {
  test('page loads with 200', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    const res = await page.goto(url('/playground/target'))
    expect(res?.status()).toBe(200)
  })

  test('page-title testid present', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/playground/target'))
    await expect(page.getByTestId('page-title')).toBeAttached()
  })

  test('page title contains "AgentQA"', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/playground/target'))
    const title = await page.getByTestId('page-title').textContent()
    expect(title).toContain('AgentQA')
  })

  test('status-card testid present', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/playground/target'))
    await expect(page.getByTestId('status-card')).toBeAttached()
  })

  test('status-ready shows "loaded"', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/playground/target'))
    const text = await page.getByTestId('status-ready').textContent()
    expect(text?.toLowerCase()).toContain('loaded')
  })

  test('actions-card with all 4 buttons present', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/playground/target'))
    await expect(page.getByTestId('actions-card')).toBeAttached()
    await expect(page.getByTestId('btn-log')).toBeAttached()
    await expect(page.getByTestId('btn-warn')).toBeAttached()
    await expect(page.getByTestId('btn-error')).toBeAttached()
    await expect(page.getByTestId('btn-fetch')).toBeAttached()
  })

  test('log-output present', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/playground/target'))
    await expect(page.getByTestId('log-output')).toBeAttached()
  })

  test('JS runs on load: log-output shows activity within 3s', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/playground/target'))
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="log-output"]')
        return el && !el.textContent?.includes('Waiting')
      },
      { timeout: 5000 }
    )
    const logText = await page.getByTestId('log-output').textContent()
    expect(logText).toBeTruthy()
    expect(logText).not.toContain('Waiting for actions')
  })

  test('btn-log click emits console.log (checked via page evaluate)', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/playground/target'))
    const logs: string[] = []
    page.on('console', msg => { if (msg.type() === 'log') logs.push(msg.text()) })
    await page.getByTestId('btn-log').click()
    await page.waitForTimeout(300)
    expect(logs.some(l => l.includes('btn-log'))).toBe(true)
  })

  test('btn-fetch click triggers fetch and updates api-result', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/playground/target'))
    await page.getByTestId('btn-fetch').click()
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="api-result"]')
        return el && el.textContent?.includes('"status"')
      },
      { timeout: 10000 }
    )
    const result = await page.getByTestId('api-result').textContent()
    expect(result).toContain('"status"')
    expect(result).toContain('"ok"')
  })

  test('autoload fetch populates api-result without user action', async ({ page }) => {
    await page.context().addCookies(bypassCookies())
    await page.goto(url('/playground/target'))
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="api-result"]')
        return el && el.textContent?.includes('"status"')
      },
      { timeout: 10000 }
    )
    const result = await page.getByTestId('api-result').textContent()
    expect(result).toContain('"ok"')
  })
})

// ── /api/playground/ping ─────────────────────────────────────

test.describe('/api/playground/ping — API', () => {
  test('GET → 200 with status: ok', async ({ request }) => {
    const res = await request.get(url('/api/playground/ping'))
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
  })

  test('response has service, ts, message fields', async ({ request }) => {
    const res = await request.get(url('/api/playground/ping'))
    const body = await res.json()
    expect(body.service).toBe('agentqa-playground')
    expect(body.ts).toBeTruthy()
    expect(body.message).toBeTruthy()
  })

  test('source param reflected in response', async ({ request }) => {
    const res = await request.get(url('/api/playground/ping?source=e2e-test'))
    const body = await res.json()
    expect(body.source).toBe('e2e-test')
  })

  test('response has Cache-Control: no-store', async ({ request }) => {
    const res = await request.get(url('/api/playground/ping'))
    const cc = res.headers()['cache-control']
    expect(cc).toContain('no-store')
  })

  test('X-AgentQA-Test header present', async ({ request }) => {
    const res = await request.get(url('/api/playground/ping'))
    expect(res.headers()['x-agentqa-test']).toBe('true')
  })
})

// ── Sandbox flow with /playground/target as target ───────────

test.describe('Sandbox flow — /playground/target as job target', () => {
  let testerToken = ''
  let clientToken = ''
  let sessionId = ''

  test.beforeAll(async ({ request }) => {
    test.setTimeout(120000)
    if (!SUPABASE_ANON_KEY) return

    const id = rid()
    const ct = await signUp(request, `pg.c.${id}@mailinator.com`, PW)
    const tt = await signUp(request, `pg.t.${id}@mailinator.com`, PW)
    if (!ct || !tt) return
    clientToken = ct; testerToken = tt

    // Create job targeting /playground/target
    const targetUrl = `${BASE_URL}/playground/target${BYPASS ? '?x-vercel-protection-bypass=' + BYPASS : ''}`
    const jr = await request.post(url('/api/jobs'), {
      data: {
        title: `Playground Target Test ${id}`,
        url: targetUrl,
        tier: 'quick',
        instructions: 'Load the playground target page and click all test buttons. Verify console output.',
      },
      headers: bearer(ct),
    })
    const { job } = await jr.json()
    if (!job?.id) return

    await request.post(url(`/api/jobs/${job.id}/transition`), {
      data: { to: 'published' }, headers: bearer(ct),
    })

    // Assign tester
    const ar = await request.post(`${SUPABASE_URL}/rest/v1/job_assignments`, {
      data: { job_id: job.id, tester_id: uid(tt), status: 'active', assigned_at: new Date().toISOString() },
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${tt}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    })
    const asg = await ar.json()
    if (!Array.isArray(asg) || !asg[0]?.id) return

    // Start session
    const sr = await request.post(url('/api/sessions'), {
      data: { assignment_id: asg[0].id, job_id: job.id },
      headers: bearer(tt),
    })
    if (sr.status() !== 201) return
    const { session } = await sr.json()
    if (!session?.id) return
    sessionId = session.id

    // Post realistic events that the sandbox proxy would capture from /playground/target:
    // - navigation to the page
    // - 3 console events (log, warn, error) — same as playground target emits on load
    // - network_request + network_response to /api/playground/ping
    // - a click event on btn-log
    await request.post(url(`/api/sessions/${sessionId}/events`), {
      data: [
        {
          event_type: 'navigation',
          ts: new Date().toISOString(),
          url: targetUrl,
          log_message: 'Navigated to /playground/target',
        },
        {
          event_type: 'console_log',
          ts: new Date().toISOString(),
          log_level: 'log',
          log_message: '[AgentQA Target] Page mounted — console.log OK',
        },
        {
          event_type: 'console_log',
          ts: new Date().toISOString(),
          log_level: 'warn',
          log_message: '[AgentQA Target] Sample warning — console.warn OK',
        },
        {
          event_type: 'console_log',
          ts: new Date().toISOString(),
          log_level: 'error',
          log_message: '[AgentQA Target] Sample error — console.error OK (intentional)',
        },
        {
          event_type: 'network_request',
          ts: new Date().toISOString(),
          method: 'GET',
          request_url: `${BASE_URL}/api/playground/ping?source=autoload`,
        },
        {
          event_type: 'network_response',
          ts: new Date().toISOString(),
          method: 'GET',
          request_url: `${BASE_URL}/api/playground/ping?source=autoload`,
          status_code: 200,
          duration_ms: 42,
          response_body: '{"status":"ok","service":"agentqa-playground"}',
        },
        {
          event_type: 'click',
          ts: new Date().toISOString(),
          log_message: 'button[data-testid=btn-log]',
        },
        {
          event_type: 'console_log',
          ts: new Date().toISOString(),
          log_level: 'log',
          log_message: '[AgentQA Target] fetch /api/playground/ping → {"status":"ok"}',
        },
      ],
      headers: bearer(tt),
    })
  })

  test('session created successfully', async () => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    expect(sessionId).toBeTruthy()
    expect(sessionId.length).toBeGreaterThan(10)
  })

  test('session_events has ≥ 8 events', async ({ request }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    const res = await request.get(url(`/api/sessions/${sessionId}/events`), { headers: bearer(testerToken) })
    expect(res.status()).toBe(200)
    const { events } = await res.json()
    expect(events.length).toBeGreaterThanOrEqual(8)
  })

  test('at least 1 console_log event recorded', async ({ request }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    const res = await request.get(url(`/api/sessions/${sessionId}/events`), { headers: bearer(testerToken) })
    const { events } = await res.json()
    const consoleLogs = events.filter((e: { event_type: string }) => e.event_type === 'console_log')
    expect(consoleLogs.length).toBeGreaterThanOrEqual(1)
  })

  test('at least 1 network event recorded', async ({ request }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    const res = await request.get(url(`/api/sessions/${sessionId}/events`), { headers: bearer(testerToken) })
    const { events } = await res.json()
    const networkEvents = events.filter((e: { event_type: string }) =>
      ['network_request', 'network_response'].includes(e.event_type)
    )
    expect(networkEvents.length).toBeGreaterThanOrEqual(1)
  })

  test('network_response event has status_code 200', async ({ request }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    const res = await request.get(url(`/api/sessions/${sessionId}/events`), { headers: bearer(testerToken) })
    const { events } = await res.json()
    const networkResponse = events.find((e: { event_type: string; status_code?: number }) =>
      e.event_type === 'network_response' && e.status_code === 200
    )
    expect(networkResponse).toBeTruthy()
  })

  test('console_log event contains playground message', async ({ request }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    const res = await request.get(url(`/api/sessions/${sessionId}/events`), { headers: bearer(testerToken) })
    const { events } = await res.json()
    const consoleLog = events.find((e: { event_type: string; log_message?: string }) =>
      e.event_type === 'console_log' && e.log_message?.includes('[AgentQA Target]')
    )
    expect(consoleLog).toBeTruthy()
  })

  test('navigation event points to /playground/target', async ({ request }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    const res = await request.get(url(`/api/sessions/${sessionId}/events`), { headers: bearer(testerToken) })
    const { events } = await res.json()
    const navEvent = events.find((e: { event_type: string; log_message?: string }) =>
      e.event_type === 'navigation' && e.log_message?.includes('playground/target')
    )
    expect(navEvent).toBeTruthy()
  })

  test('events all have session_id and ts fields', async ({ request }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    const res = await request.get(url(`/api/sessions/${sessionId}/events`), { headers: bearer(testerToken) })
    const { events } = await res.json()
    for (const e of events) {
      expect(e.session_id).toBe(sessionId)
      expect(e.ts).toBeTruthy()
      expect(e.event_type).toBeTruthy()
    }
  })

  // Complete session and get AI summary
  test('session can be completed', async ({ request }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    const res = await request.patch(url(`/api/sessions/${sessionId}`), {
      data: { status: 'complete', notes: 'All playground target buttons tested. Console + network captured. No critical errors.' },
      headers: bearer(testerToken),
    })
    expect(res.status()).toBe(200)
    const { session } = await res.json()
    expect(session.status).toBe('complete')
    expect(session.ended_at).toBeTruthy()
  })

  test('AI summary for playground session → 200 with structured output', async ({ request }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    const res = await request.post(url(`/api/sessions/${sessionId}/summary`), {
      headers: bearer(testerToken),
      timeout: 90000,
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    const s = body.summary ?? body
    expect(typeof s).toBe('object')
    const hasStructure = 'overall_assessment' in s || 'key_issues' in s || 'what_worked' in s || 'priority_fixes' in s
    expect(hasStructure).toBe(true)
  })

  // Report page for playground session
  test('report page loads for playground session', async ({ page }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    await page.context().addCookies(bypassCookies())
    const res = await page.goto(url(`/report/${sessionId}`))
    expect(res?.status()).not.toBe(404)
    expect(res?.status()).not.toBe(500)
  })

  test('report page shows complete status', async ({ page }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    await page.context().addCookies(bypassCookies())
    await page.goto(url(`/report/${sessionId}`))
    const status = page.getByTestId('report-status')
    await expect(status).toBeAttached()
    expect((await status.textContent())?.trim()).toBe('complete')
  })
})

// ── Proxy integration: fetch /playground/target via proxy ─────

test.describe('Proxy — /playground/target via /api/proxy', () => {
  let testerToken = ''
  let sessionId = ''

  test.beforeAll(async ({ request }) => {
    test.setTimeout(120000)
    if (!SUPABASE_ANON_KEY) return

    const id = rid()
    const ct = await signUp(request, `px.c.${id}@mailinator.com`, PW)
    const tt = await signUp(request, `px.t.${id}@mailinator.com`, PW)
    if (!ct || !tt) return
    testerToken = tt

    const targetUrl = `${BASE_URL}/playground/target`
    const jr = await request.post(url('/api/jobs'), {
      data: { title: `Proxy Test ${id}`, url: targetUrl, tier: 'quick' },
      headers: bearer(ct),
    })
    const { job } = await jr.json()
    if (!job?.id) return

    await request.post(url(`/api/jobs/${job.id}/transition`), { data: { to: 'published' }, headers: bearer(ct) })

    const ar = await request.post(`${SUPABASE_URL}/rest/v1/job_assignments`, {
      data: { job_id: job.id, tester_id: uid(tt), status: 'active', assigned_at: new Date().toISOString() },
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${tt}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    })
    const asg = await ar.json()
    if (!Array.isArray(asg) || !asg[0]?.id) return

    const sr = await request.post(url('/api/sessions'), {
      data: { assignment_id: asg[0].id, job_id: job.id },
      headers: bearer(tt),
    })
    if (sr.status() !== 201) return
    const { session } = await sr.json()
    sessionId = session?.id ?? ''
  })

  test('GET /api/proxy?url=/playground/target&session=<id> → 200', async ({ request }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    const targetUrl = encodeURIComponent(`${BASE_URL}/playground/target`)
    const res = await request.get(
      url(`/api/proxy?url=${targetUrl}&session=${sessionId}`),
      { headers: { Authorization: `Bearer ${testerToken}`, Cookie: BYPASS ? `x-vercel-protection-bypass=${BYPASS}` : '' } }
    )
    expect(res.status()).toBe(200)
  })

  test('proxy response has content-type text/html', async ({ request }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    const targetUrl = encodeURIComponent(`${BASE_URL}/playground/target`)
    const res = await request.get(
      url(`/api/proxy?url=${targetUrl}&session=${sessionId}`),
      { headers: { Authorization: `Bearer ${testerToken}`, Cookie: BYPASS ? `x-vercel-protection-bypass=${BYPASS}` : '' } }
    )
    expect(res.headers()['content-type']).toContain('text/html')
  })

  test('proxy response contains AgentQA logging script injection', async ({ request }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    const targetUrl = encodeURIComponent(`${BASE_URL}/playground/target`)
    const res = await request.get(
      url(`/api/proxy?url=${targetUrl}&session=${sessionId}`),
      { headers: { Authorization: `Bearer ${testerToken}`, Cookie: BYPASS ? `x-vercel-protection-bypass=${BYPASS}` : '' } }
    )
    const html = await res.text()
    // The proxy injects a console/network logging script
    expect(html).toContain(sessionId) // session ID embedded in injected script
  })

  test('proxy response contains page title', async ({ request }) => {
    if (!sessionId) { test.skip(true, 'No session'); return }
    const targetUrl = encodeURIComponent(`${BASE_URL}/playground/target`)
    const res = await request.get(
      url(`/api/proxy?url=${targetUrl}&session=${sessionId}`),
      { headers: { Authorization: `Bearer ${testerToken}`, Cookie: BYPASS ? `x-vercel-protection-bypass=${BYPASS}` : '' } }
    )
    const html = await res.text()
    expect(html.toLowerCase()).toContain('agentqa')
  })

  test('proxy rejects unauthenticated requests → 401', async ({ request }) => {
    const targetUrl = encodeURIComponent(`${BASE_URL}/playground/target`)
    const res = await request.get(
      url(`/api/proxy?url=${targetUrl}&session=00000000-0000-0000-0000-000000000000`)
    )
    expect(res.status()).toBe(401)
  })
})
