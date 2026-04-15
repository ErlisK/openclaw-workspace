/**
 * credit-gate.spec.ts — Credit gating and hold/spend/release E2E tests
 *
 * Scenarios (per task):
 * A) Job cannot be published with insufficient credits
 * B) After minting credits, publish succeeds and hold is visible
 * C) Completing job reduces held, increases spent (balance permanently reduced)
 * D) Cancelling job releases hold (balance restored, held zeroed)
 * E) Multiple jobs: each hold stacks; each complete/cancel resolves correctly
 */

import { test, expect, APIRequestContext } from '@playwright/test'
import { topUpCredits, setCreditsTo, setCreditsToByUserId } from './helpers/credits'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const BYPASS = process.env.VERCEL_BYPASS_TOKEN || ''
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://sreaczlbclzysmntltdf.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const E2E_SECRET = process.env.E2E_TEST_SECRET || ''

function url(path: string) {
  const u = `${BASE_URL}${path}`
  return BYPASS ? `${u}${u.includes('?') ? '&' : '?'}x-vercel-protection-bypass=${BYPASS}` : u
}
function bearer(t: string): Record<string, string> {
  return {
    Authorization: `Bearer ${t}`,
    'Content-Type': 'application/json',
    ...(BYPASS ? { Cookie: `x-vercel-protection-bypass=${BYPASS}` } : {}),
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
function uid(t: string) {
  try { return JSON.parse(Buffer.from(t.split('.')[1] + '==', 'base64').toString()).sub ?? '' }
  catch { return '' }
}

const RUN = Date.now()
const PW = `GtPw${RUN}!`
let ctr = 0
const rid = () => `${RUN}_${++ctr}`

// ─────────────────────────────────────────────────────────────────────────────
// A) Publish gating — no credits → 402; after top-up → 200
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Credit gate — A: publish blocked without credits', () => {
  let token = ''
  let userId = ''
  let jobId = ''

  test.beforeAll(async ({ request }) => {
    test.setTimeout(90000)
    if (!SUPABASE_ANON_KEY) return
    const id = rid()
    const t = await signUp(request, `cg.a.${id}@mailinator.com`, PW)
    if (!t) return
    token = t; userId = uid(t)
    // Zero out balance for clean test
    await setCreditsTo(request, token, 0)
    const jr = await request.post(url('/api/jobs'), {
      data: { title: `Gate A ${id}`, url: 'https://example.com', tier: 'quick' },
      headers: bearer(token),
    })
    const { job } = await jr.json()
    jobId = job?.id ?? ''
  })

  test('publish with 0 credits → 402 INSUFFICIENT_CREDITS', async ({ request }) => {
    if (!jobId || !token) { test.skip(true, 'No fixture'); return }
    const res = await request.post(url(`/api/jobs/${jobId}/transition`), {
      data: { to: 'published' },
      headers: bearer(token),
    })
    expect(res.status()).toBe(402)
    const body = await res.json()
    expect(body.code).toBe('INSUFFICIENT_CREDITS')
    expect(body.error).toMatch(/insufficient/i)
  })

  test('job remains in draft after failed publish attempt', async ({ request }) => {
    if (!jobId || !token) { test.skip(true, 'No fixture'); return }
    const res = await request.get(url('/api/jobs'), { headers: bearer(token) })
    const { jobs } = await res.json()
    const job = jobs.find((j: { id: string }) => j.id === jobId)
    expect(job?.status).toBe('draft')
  })

  test('error body includes credits_required and required_credits', async ({ request }) => {
    if (!jobId || !token) { test.skip(true, 'No fixture'); return }
    const res = await request.post(url(`/api/jobs/${jobId}/transition`), {
      data: { to: 'published' },
      headers: bearer(token),
    })
    const body = await res.json()
    expect(body.credits_required).toBe(true)
    expect(typeof body.required_credits).toBe('number')
    expect(body.required_credits).toBeGreaterThan(0)
  })

  test('balance is 0 before top-up', async ({ request }) => {
    if (!token) { test.skip(true, 'No token'); return }
    const res = await request.get(url('/api/credits'), { headers: bearer(token) })
    const body = await res.json()
    expect(body.balance).toBe(0)
    expect(body.available).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// B) After minting, publish succeeds; hold visible
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Credit gate — B: publish succeeds after top-up; hold is visible', () => {
  let token = ''
  let userId = ''
  let jobId = ''

  test.beforeAll(async ({ request }) => {
    test.setTimeout(90000)
    if (!SUPABASE_ANON_KEY) return
    const id = rid()
    const t = await signUp(request, `cg.b.${id}@mailinator.com`, PW)
    if (!t) return
    token = t; userId = uid(t)
    await setCreditsTo(request, token, 0)
    const jr = await request.post(url('/api/jobs'), {
      data: { title: `Gate B ${id}`, url: 'https://example.com', tier: 'quick' },
      headers: bearer(token),
    })
    const { job } = await jr.json()
    jobId = job?.id ?? ''
  })

  test('mint 20 credits via top-up route', async ({ request }) => {
    if (!token) { test.skip(true, 'No token'); return }
    const result = await topUpCredits(request, token, 20)
    expect(result.ok).toBe(true)
    expect(result.balance).toBe(20)
  })

  test('publish succeeds after top-up', async ({ request }) => {
    if (!jobId || !token) { test.skip(true, 'No fixture'); return }
    const res = await request.post(url(`/api/jobs/${jobId}/transition`), {
      data: { to: 'published' },
      headers: bearer(token),
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.job.status).toBe('published')
  })

  test('hold of 5 credits is visible after publish', async ({ request }) => {
    if (!token) { test.skip(true, 'No token'); return }
    const res = await request.get(url('/api/credits'), { headers: bearer(token) })
    const body = await res.json()
    // quick tier = 5 credits
    expect(body.held).toBe(5)
    expect(body.balance).toBe(20)
    expect(body.available).toBe(15)
  })

  test('job_hold transaction exists in ledger', async ({ request }) => {
    if (!token) { test.skip(true, 'No token'); return }
    const res = await request.get(url('/api/credits'), { headers: bearer(token) })
    const { transactions } = await res.json()
    const holdTx = transactions.find((t: { kind: string }) => t.kind === 'job_hold')
    expect(holdTx).toBeTruthy()
    expect(holdTx.amount_cents).toBeLessThan(0) // hold is negative (deducted from available)
  })

  test('job status is published', async ({ request }) => {
    if (!jobId || !token) { test.skip(true, 'No fixture'); return }
    const res = await request.get(url('/api/jobs'), { headers: bearer(token) })
    const { jobs } = await res.json()
    const job = jobs.find((j: { id: string }) => j.id === jobId)
    expect(job?.status).toBe('published')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// C) Complete job → held decreases, balance permanently reduced
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Credit gate — C: completing job reduces held, increases spent', () => {
  let clientToken = ''
  let testerToken = ''
  let clientId = ''
  let jobId = ''
  let assignmentId = ''
  let sessionId = ''

  test.beforeAll(async ({ request }) => {
    test.setTimeout(120000)
    if (!SUPABASE_ANON_KEY) return
    const id = rid()
    const ct = await signUp(request, `cg.c.c.${id}@mailinator.com`, PW)
    const tt = await signUp(request, `cg.c.t.${id}@mailinator.com`, PW)
    if (!ct || !tt) return
    clientToken = ct; testerToken = tt; clientId = uid(ct)

    await setCreditsTo(request, clientToken, 20)

    // Create and publish job
    const jr = await request.post(url('/api/jobs'), {
      data: { title: `Gate C ${id}`, url: 'https://example.com', tier: 'quick' },
      headers: bearer(ct),
    })
    const { job } = await jr.json()
    if (!job?.id) return
    jobId = job.id

    await request.post(url(`/api/jobs/${jobId}/transition`), {
      data: { to: 'published' }, headers: bearer(ct),
    })

    // Assign tester directly via admin API
    const asgRes = await request.post(
      `${SUPABASE_URL}/rest/v1/job_assignments`,
      {
        data: { job_id: jobId, tester_id: uid(tt), status: 'assigned' },
        headers: {
          apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json', Prefer: 'return=representation',
        },
      }
    )
    const asgBody = await asgRes.json()
    if (!asgBody?.[0]?.id) return
    assignmentId = asgBody[0].id

    // Create session
    const srRes = await request.post(url('/api/sessions'), {
      data: { assignment_id: assignmentId, job_id: jobId },
      headers: bearer(tt),
    })
    if (srRes.status() !== 201) return
    const { session } = await srRes.json()
    sessionId = session?.id ?? ''
  })

  test('before complete: balance=20, held=5, available=15', async ({ request }) => {
    if (!clientToken) { test.skip(true, 'No fixture'); return }
    const res = await request.get(url('/api/credits'), { headers: bearer(clientToken) })
    const body = await res.json()
    expect(body.balance).toBe(20)
    expect(body.held).toBe(5)
    expect(body.available).toBe(15)
  })

  test('tester completes job → 200', async ({ request }) => {
    if (!jobId || !testerToken || !assignmentId) { test.skip(true, 'No fixture'); return }
    const res = await request.post(url(`/api/jobs/${jobId}/transition`), {
      data: { to: 'complete', assignment_id: assignmentId },
      headers: bearer(testerToken),
    })
    expect(res.status()).toBe(200)
  })

  test('after complete: held drops to 0', async ({ request }) => {
    if (!clientToken) { test.skip(true, 'No fixture'); return }
    const res = await request.get(url('/api/credits'), { headers: bearer(clientToken) })
    const body = await res.json()
    expect(body.held).toBe(0)
  })

  test('after complete: balance permanently reduced by 5', async ({ request }) => {
    if (!clientToken) { test.skip(true, 'No fixture'); return }
    const res = await request.get(url('/api/credits'), { headers: bearer(clientToken) })
    const body = await res.json()
    expect(body.balance).toBe(15)
    expect(body.available).toBe(15)
  })

  test('job_spend transaction in ledger', async ({ request }) => {
    if (!clientToken) { test.skip(true, 'No token'); return }
    const res = await request.get(url('/api/credits'), { headers: bearer(clientToken) })
    const { transactions } = await res.json()
    const spendTx = transactions.find((t: { kind: string }) => t.kind === 'job_spend')
    expect(spendTx).toBeTruthy()
    expect(spendTx.amount_cents).toBeLessThan(0)
  })

  test('job_hold + job_spend both present in ledger', async ({ request }) => {
    if (!clientToken) { test.skip(true, 'No token'); return }
    const res = await request.get(url('/api/credits'), { headers: bearer(clientToken) })
    const { transactions } = await res.json()
    const kinds = transactions.map((t: { kind: string }) => t.kind)
    expect(kinds).toContain('job_hold')
    expect(kinds).toContain('job_spend')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// D) Cancel job → hold released; balance restored
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Credit gate — D: cancelling job releases hold', () => {
  let token = ''
  let jobId = ''

  test.beforeAll(async ({ request }) => {
    test.setTimeout(90000)
    if (!SUPABASE_ANON_KEY) return
    const id = rid()
    const t = await signUp(request, `cg.d.${id}@mailinator.com`, PW)
    if (!t) return
    token = t
    await setCreditsTo(request, token, 20)

    const jr = await request.post(url('/api/jobs'), {
      data: { title: `Gate D ${id}`, url: 'https://example.com', tier: 'quick' },
      headers: bearer(token),
    })
    const { job } = await jr.json()
    jobId = job?.id ?? ''
    if (!jobId) return

    await request.post(url(`/api/jobs/${jobId}/transition`), {
      data: { to: 'published' }, headers: bearer(token),
    })
  })

  test('before cancel: held=5', async ({ request }) => {
    if (!token) { test.skip(true, 'No fixture'); return }
    const res = await request.get(url('/api/credits'), { headers: bearer(token) })
    expect((await res.json()).held).toBe(5)
  })

  test('client cancels job → 200', async ({ request }) => {
    if (!jobId || !token) { test.skip(true, 'No fixture'); return }
    const res = await request.post(url(`/api/jobs/${jobId}/transition`), {
      data: { to: 'cancelled' }, headers: bearer(token),
    })
    expect(res.status()).toBe(200)
  })

  test('after cancel: held=0, balance=20 (fully restored)', async ({ request }) => {
    if (!token) { test.skip(true, 'No fixture'); return }
    const res = await request.get(url('/api/credits'), { headers: bearer(token) })
    const body = await res.json()
    expect(body.held).toBe(0)
    expect(body.balance).toBe(20)
    expect(body.available).toBe(20)
  })

  test('job_release transaction in ledger', async ({ request }) => {
    if (!token) { test.skip(true, 'No token'); return }
    const res = await request.get(url('/api/credits'), { headers: bearer(token) })
    const { transactions } = await res.json()
    const relTx = transactions.find((t: { kind: string }) => t.kind === 'job_release')
    expect(relTx).toBeTruthy()
    expect(relTx.amount_cents).toBeGreaterThan(0) // release adds back
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// E) Multiple holds stack; each resolution is independent
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Credit gate — E: multiple holds stack independently', () => {
  let token = ''
  let jobId1 = ''
  let jobId2 = ''

  test.beforeAll(async ({ request }) => {
    test.setTimeout(90000)
    if (!SUPABASE_ANON_KEY) return
    const id = rid()
    const t = await signUp(request, `cg.e.${id}@mailinator.com`, PW)
    if (!t) return
    token = t
    await setCreditsTo(request, token, 30)

    const mkJob = async (title: string) => {
      const jr = await request.post(url('/api/jobs'), {
        data: { title, url: 'https://example.com', tier: 'quick' },
        headers: bearer(t),
      })
      return (await jr.json()).job?.id ?? ''
    }

    jobId1 = await mkJob(`Gate E1 ${id}`)
    jobId2 = await mkJob(`Gate E2 ${id}`)
  })

  test('publish job1 → held=5, available=25', async ({ request }) => {
    if (!jobId1 || !token) { test.skip(true, 'No fixture'); return }
    await request.post(url(`/api/jobs/${jobId1}/transition`), {
      data: { to: 'published' }, headers: bearer(token),
    })
    const res = await request.get(url('/api/credits'), { headers: bearer(token) })
    const body = await res.json()
    expect(body.held).toBe(5)
    expect(body.available).toBe(25)
  })

  test('publish job2 → held=10, available=20', async ({ request }) => {
    if (!jobId2 || !token) { test.skip(true, 'No fixture'); return }
    await request.post(url(`/api/jobs/${jobId2}/transition`), {
      data: { to: 'published' }, headers: bearer(token),
    })
    const res = await request.get(url('/api/credits'), { headers: bearer(token) })
    const body = await res.json()
    expect(body.held).toBe(10)
    expect(body.available).toBe(20)
  })

  test('cancel job1 → held=5 (only job2 remains)', async ({ request }) => {
    if (!jobId1 || !token) { test.skip(true, 'No fixture'); return }
    await request.post(url(`/api/jobs/${jobId1}/transition`), {
      data: { to: 'cancelled' }, headers: bearer(token),
    })
    const res = await request.get(url('/api/credits'), { headers: bearer(token) })
    const body = await res.json()
    expect(body.held).toBe(5) // only job2 hold remains
    expect(body.balance).toBe(30) // balance not reduced (cancel = release)
    expect(body.available).toBe(25)
  })

  test('cancel job2 → held=0, balance=30', async ({ request }) => {
    if (!jobId2 || !token) { test.skip(true, 'No fixture'); return }
    await request.post(url(`/api/jobs/${jobId2}/transition`), {
      data: { to: 'cancelled' }, headers: bearer(token),
    })
    const res = await request.get(url('/api/credits'), { headers: bearer(token) })
    const body = await res.json()
    expect(body.held).toBe(0)
    expect(body.balance).toBe(30)
    expect(body.available).toBe(30)
  })
})
