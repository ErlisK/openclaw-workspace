/**
 * credit-topup.spec.ts — /api/test/credit-topup E2E tests
 *
 * Tests:
 * 1. GET → 405
 * 2. No body → 400
 * 3. amount=0 → 400
 * 4. amount>10000 → 400
 * 5. Unauthed without user_id → 401
 * 6. user_id without secret → 401
 * 7. Authed user top-up → 200, balance increases
 * 8. balance_after is correct
 * 9. transaction_id is returned
 * 10. available = balance - held
 * 11. description is stored in transaction
 * 12. user_id top-up with secret → 200
 * 13. Multiple top-ups are additive
 * 14. topUpCreditsByUserId helper works
 * 15. topUpCredits helper works
 */

import { test, expect, APIRequestContext } from '@playwright/test'
import { topUpCredits, topUpCreditsByUserId } from './helpers/credits'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const BYPASS = process.env.VERCEL_BYPASS_TOKEN || ''
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://sreaczlbclzysmntltdf.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ''
const E2E_SECRET = process.env.E2E_TEST_SECRET || ''

function url(path: string) {
  const u = `${BASE_URL}${path}`
  return BYPASS ? `${u}${u.includes('?') ? '&' : '?'}x-vercel-protection-bypass=${BYPASS}` : u
}
function bearer(t: string) {
  return {
    Authorization: `Bearer ${t}`,
    'Content-Type': 'application/json',
    ...(BYPASS ? { Cookie: `x-vercel-protection-bypass=${BYPASS}` } : {}),
    ...(E2E_SECRET ? { 'x-e2e-secret': E2E_SECRET } : {}),
  }
}
function noAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    ...(BYPASS ? { Cookie: `x-vercel-protection-bypass=${BYPASS}` } : {}),
  }
}

async function signUp(request: APIRequestContext, email: string, pw: string): Promise<string | null> {
  if (!SUPABASE_ANON_KEY) return null
  const r = await request.post(`${SUPABASE_URL}/auth/v1/signup`, {
    data: { email, password: pw },
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    timeout: 30000,
  })
  return ((await r.json()).access_token as string) ?? null
}
function uid(t: string): string {
  try { return JSON.parse(Buffer.from(t.split('.')[1] + '==', 'base64').toString()).sub ?? '' }
  catch { return '' }
}

const RUN = Date.now()
const PW = `TpPw${RUN}!`
let ctr = 0
const rid = () => `${RUN}_${++ctr}`

// ── Input validation (no auth needed) ─────────────────────────

test.describe('credit-topup — validation', () => {
  test('GET /api/test/credit-topup → 405', async ({ request }) => {
    const res = await request.get(url('/api/test/credit-topup'), {
      headers: noAuthHeaders(),
    })
    expect(res.status()).toBe(405)
  })

  test('POST without body → 400', async ({ request }) => {
    const res = await request.post(url('/api/test/credit-topup'), {
      data: {},
      headers: noAuthHeaders(),
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('amount')
  })

  test('POST amount=0 → 400', async ({ request }) => {
    const res = await request.post(url('/api/test/credit-topup'), {
      data: { amount: 0 },
      headers: noAuthHeaders(),
    })
    expect(res.status()).toBe(400)
  })

  test('POST amount=-5 → 400', async ({ request }) => {
    const res = await request.post(url('/api/test/credit-topup'), {
      data: { amount: -5 },
      headers: noAuthHeaders(),
    })
    expect(res.status()).toBe(400)
  })

  test('POST amount=10001 → 400', async ({ request }) => {
    const res = await request.post(url('/api/test/credit-topup'), {
      data: { amount: 10001 },
      headers: noAuthHeaders(),
    })
    expect(res.status()).toBe(400)
  })

  test('POST without auth and no user_id → 401', async ({ request }) => {
    const res = await request.post(url('/api/test/credit-topup'), {
      data: { amount: 10 },
      headers: noAuthHeaders(),
    })
    expect(res.status()).toBe(401)
  })

  test('POST with user_id but no secret → 401', async ({ request }) => {
    const res = await request.post(url('/api/test/credit-topup'), {
      data: { amount: 10, user_id: '00000000-0000-0000-0000-000000000001' },
      headers: noAuthHeaders(), // no x-e2e-secret
    })
    expect(res.status()).toBe(401)
  })
})

// ── Authed user top-up ─────────────────────────────────────────

test.describe('credit-topup — authed user', () => {
  let token = ''
  let userId = ''

  test.beforeAll(async ({ request }) => {
    test.setTimeout(60000)
    if (!SUPABASE_ANON_KEY) return
    const id = rid()
    const t = await signUp(request, `tp.auth.${id}@mailinator.com`, PW)
    if (!t) return
    token = t
    userId = uid(t)
  })

  test('POST with valid JWT → 200 ok', async ({ request }) => {
    if (!token) { test.skip(true, 'No token'); return }
    const res = await request.post(url('/api/test/credit-topup'), {
      data: { amount: 25 },
      headers: bearer(token),
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  test('balance increases by amount', async ({ request }) => {
    if (!token) { test.skip(true, 'No token'); return }
    // Get balance before
    const before = await request.get(url('/api/credits'), { headers: bearer(token) })
    const { balance: balBefore } = await before.json()

    // Top up
    await request.post(url('/api/test/credit-topup'), {
      data: { amount: 30 },
      headers: bearer(token),
    })

    // Get balance after
    const after = await request.get(url('/api/credits'), { headers: bearer(token) })
    const { balance: balAfter } = await after.json()
    expect(balAfter).toBe(balBefore + 30)
  })

  test('response includes balance, held, available', async ({ request }) => {
    if (!token) { test.skip(true, 'No token'); return }
    const res = await request.post(url('/api/test/credit-topup'), {
      data: { amount: 10 },
      headers: bearer(token),
    })
    const body = await res.json()
    expect(typeof body.balance).toBe('number')
    expect(typeof body.held).toBe('number')
    expect(typeof body.available).toBe('number')
    expect(body.available).toBe(body.balance - body.held)
  })

  test('transaction_id is returned (not null)', async ({ request }) => {
    if (!token) { test.skip(true, 'No token'); return }
    const res = await request.post(url('/api/test/credit-topup'), {
      data: { amount: 5 },
      headers: bearer(token),
    })
    const body = await res.json()
    expect(body.transaction_id).toBeTruthy()
    expect(typeof body.transaction_id).toBe('string')
  })

  test('transaction appears in /api/credits transaction history', async ({ request }) => {
    if (!token) { test.skip(true, 'No token'); return }
    const desc = `e2e-test-${RUN}`
    await request.post(url('/api/test/credit-topup'), {
      data: { amount: 7, description: desc },
      headers: bearer(token),
    })

    const credits = await request.get(url('/api/credits'), { headers: bearer(token) })
    const { transactions } = await credits.json()
    const tx = transactions.find((t: { description: string }) => t.description === desc)
    expect(tx).toBeTruthy()
    expect(tx.kind).toBe('bonus')
    expect(tx.amount_cents).toBe(700) // 7 credits * 100
  })

  test('multiple top-ups are additive', async ({ request }) => {
    if (!token) { test.skip(true, 'No token'); return }
    const before = await request.get(url('/api/credits'), { headers: bearer(token) })
    const { balance: balBefore } = await before.json()

    await request.post(url('/api/test/credit-topup'), { data: { amount: 10 }, headers: bearer(token) })
    await request.post(url('/api/test/credit-topup'), { data: { amount: 15 }, headers: bearer(token) })

    const after = await request.get(url('/api/credits'), { headers: bearer(token) })
    const { balance: balAfter } = await after.json()
    expect(balAfter).toBe(balBefore + 25)
  })

  test('user_id in response matches authed user', async ({ request }) => {
    if (!token || !userId) { test.skip(true, 'No token'); return }
    const res = await request.post(url('/api/test/credit-topup'), {
      data: { amount: 5 },
      headers: bearer(token),
    })
    const body = await res.json()
    expect(body.user_id).toBe(userId)
  })
})

// ── user_id + secret top-up ────────────────────────────────────

test.describe('credit-topup — user_id with secret', () => {
  let userId = ''
  let token = ''

  test.beforeAll(async ({ request }) => {
    test.setTimeout(60000)
    if (!SUPABASE_ANON_KEY || !E2E_SECRET) return
    const id = rid()
    const t = await signUp(request, `tp.sec.${id}@mailinator.com`, PW)
    if (!t) return
    token = t
    userId = uid(t)
  })

  test('POST with user_id + secret → 200', async ({ request }) => {
    if (!userId || !E2E_SECRET) { test.skip(true, 'No fixture'); return }
    const res = await request.post(url('/api/test/credit-topup'), {
      data: { user_id: userId, amount: 50 },
      headers: {
        'Content-Type': 'application/json',
        'x-e2e-secret': E2E_SECRET,
        ...(BYPASS ? { Cookie: `x-vercel-protection-bypass=${BYPASS}` } : {}),
      },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.user_id).toBe(userId)
  })

  test('balance reflects top-up done by user_id method', async ({ request }) => {
    if (!userId || !token || !E2E_SECRET) { test.skip(true, 'No fixture'); return }
    const before = await request.get(url('/api/credits'), { headers: bearer(token) })
    const { balance: balBefore } = await before.json()

    await request.post(url('/api/test/credit-topup'), {
      data: { user_id: userId, amount: 20 },
      headers: {
        'Content-Type': 'application/json',
        'x-e2e-secret': E2E_SECRET,
        ...(BYPASS ? { Cookie: `x-vercel-protection-bypass=${BYPASS}` } : {}),
      },
    })

    const after = await request.get(url('/api/credits'), { headers: bearer(token) })
    const { balance: balAfter } = await after.json()
    expect(balAfter).toBe(balBefore + 20)
  })

  test('nonexistent user_id → 404', async ({ request }) => {
    if (!E2E_SECRET) { test.skip(true, 'No secret'); return }
    const res = await request.post(url('/api/test/credit-topup'), {
      data: { user_id: '00000000-0000-0000-0000-000000000099', amount: 10 },
      headers: {
        'Content-Type': 'application/json',
        'x-e2e-secret': E2E_SECRET,
        ...(BYPASS ? { Cookie: `x-vercel-protection-bypass=${BYPASS}` } : {}),
      },
    })
    expect(res.status()).toBe(404)
  })
})

// ── Helper functions ───────────────────────────────────────────

test.describe('credit-topup — helper functions', () => {
  let token = ''
  let userId = ''

  test.beforeAll(async ({ request }) => {
    test.setTimeout(60000)
    if (!SUPABASE_ANON_KEY) return
    const id = rid()
    const t = await signUp(request, `tp.hlp.${id}@mailinator.com`, PW)
    if (!t) return
    token = t
    userId = uid(t)
  })

  test('topUpCredits() helper returns correct shape', async ({ request }) => {
    if (!token) { test.skip(true, 'No token'); return }
    const result = await topUpCredits(request, token, 15, 'helper test')
    expect(result.ok).toBe(true)
    expect(result.balance).toBeGreaterThan(0)
    expect(result.available).toBe(result.balance - result.held)
    expect(result.transaction_id).toBeTruthy()
  })

  test('topUpCreditsByUserId() helper works with secret', async ({ request }) => {
    if (!userId || !E2E_SECRET) { test.skip(true, 'No fixture'); return }
    const result = await topUpCreditsByUserId(request, userId, 20, 'userId helper test')
    expect(result.ok).toBe(true)
    expect(result.balance).toBeGreaterThan(0)
    expect(result.user_id).toBe(userId)
  })

  test('topUpCredits() throws on bad amount', async ({ request }) => {
    if (!token) { test.skip(true, 'No token'); return }
    await expect(topUpCredits(request, token, 0)).rejects.toThrow()
  })

  test('end-to-end: top-up then verify credits gate passes', async ({ request }) => {
    if (!token) { test.skip(true, 'No token'); return }
    // Create a job
    const jr = await request.post(url('/api/jobs'), {
      data: { title: `TopUp Gate Test ${RUN}`, url: 'https://example.com', tier: 'quick' },
      headers: bearer(token),
    })
    const { job } = await jr.json()
    if (!job?.id) { test.skip(true, 'Job create failed'); return }

    // Top up just enough credits
    await topUpCredits(request, token, 5, 'gate test top-up')

    // Publish should now succeed
    const pubRes = await request.post(url(`/api/jobs/${job.id}/transition`), {
      data: { to: 'published' },
      headers: bearer(token),
    })
    expect(pubRes.status()).toBe(200)
    expect((await pubRes.json()).job.status).toBe('published')
  })
})
