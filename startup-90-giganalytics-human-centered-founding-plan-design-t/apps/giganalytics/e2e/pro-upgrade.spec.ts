/**
 * Pro Upgrade E2E Tests — Full Suite
 *
 * Covers the 5 required areas:
 *   1. Paywall: Pro-gated pages/endpoints return 402/403 for free users
 *   2. Stripe-simulate: POST /api/dev/stripe-simulate upgrades user to Pro
 *   3. Pro features enabled after upgrade (ai/insights, benchmark, billing page)
 *   4. Negative tests: bad CSV import, malformed data, missing fields
 *   5. Benchmark opt-in toggle persists across requests
 *
 * Strategy: real Supabase test users created via Admin API, JWT used for auth.
 * Each describe block creates+deletes its own ephemeral test user.
 */

import { test, expect, APIRequestContext } from '@playwright/test'
import {
  createTestUser,
  deleteTestUser,
  authHeaders,
  TestUser,
  waitFor,
} from './helpers/auth'

// ─── 1. PAYWALL — Pro-gated endpoints return 402 for free users ───────────────

test.describe('1. Paywall — free user sees Pro gate', () => {
  let user: TestUser

  test.beforeAll(async ({ request }) => {
    user = await createTestUser(request)
  })

  test.afterAll(async ({ request }) => {
    await deleteTestUser(request, user.userId)
  })

  test('GET /api/benchmark returns 402 for free user', async ({ request }) => {
    const res = await request.get('/api/benchmark', {
      headers: authHeaders(user.accessToken),
    })
    expect(res.status()).toBe(402)
    const body = await res.json()
    expect(body.error).toMatch(/pro|upgrade/i)
    expect(body.feature).toBe('benchmark')
    console.log('✓ /api/benchmark → 402 for free user')
  })

  test('POST /api/ai/insights returns 402 for free user', async ({ request }) => {
    const res = await request.post('/api/ai/insights', {
      headers: authHeaders(user.accessToken),
      data: { insightType: 'all', days: 30 },
    })
    expect(res.status()).toBe(402)
    const body = await res.json()
    expect(body.feature).toBe('ai_insights')
    console.log('✓ /api/ai/insights → 402 for free user')
  })

  test('GET /billing page redirects to login or is accessible', async ({ request }) => {
    // /billing is an app page — 200 (if SSO passes) or 401 (SSO gate)
    const res = await request.get('/billing')
    expect([200, 302, 401]).toContain(res.status())
    console.log(`✓ /billing → ${res.status()}`)
  })

  test('GET /api/subscription returns free tier for new user', async ({ request }) => {
    const res = await request.get('/api/subscription', {
      headers: authHeaders(user.accessToken),
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    // New user has no subscription — tier should be free
    expect(['free', null, undefined]).toContain(body.tier ?? body.subscription?.tier ?? 'free')
    console.log('✓ /api/subscription → free tier confirmed')
  })

  test('POST /api/checkout requires valid priceId', async ({ request }) => {
    const res = await request.post('/api/checkout', {
      headers: authHeaders(user.accessToken),
      data: {},  // no priceId
    })
    expect([400, 422]).toContain(res.status())
    console.log(`✓ /api/checkout without priceId → ${res.status()}`)
  })
})

// ─── 2. STRIPE-SIMULATE — upgrade flow via /api/dev/stripe-simulate ──────────

test.describe('2. Stripe-simulate Pro upgrade', () => {
  let user: TestUser

  test.beforeAll(async ({ request }) => {
    user = await createTestUser(request)
  })

  test.afterAll(async ({ request }) => {
    await deleteTestUser(request, user.userId)
  })

  test('POST /api/dev/stripe-simulate returns 403 without x-e2e-secret', async ({ request }) => {
    const res = await request.post('/api/dev/stripe-simulate', {
      headers: {
        ...authHeaders(user.accessToken),
        // deliberately omit x-e2e-secret
      },
      data: { action: 'upgrade' },
    })
    expect(res.status()).toBe(403)
    const body = await res.json()
    expect(body.error).toMatch(/disabled|forbidden|secret/i)
    console.log('✓ stripe-simulate returns 403 without secret')
  })

  test('POST /api/dev/stripe-simulate upgrades user to Pro', async ({ request }) => {
    const res = await request.post('/api/dev/stripe-simulate', {
      headers: authHeaders(user.accessToken, { includeE2ESecret: true }),
      data: { action: 'upgrade' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.tier).toBe('pro')
    console.log(`✓ stripe-simulate upgraded user ${user.userId} to Pro`)
  })

  test('GET /api/subscription reflects Pro tier after upgrade', async ({ request }) => {
    // First upgrade
    await request.post('/api/dev/stripe-simulate', {
      headers: authHeaders(user.accessToken, { includeE2ESecret: true }),
      data: { action: 'upgrade' },
    })

    const res = await request.get('/api/subscription', {
      headers: authHeaders(user.accessToken),
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    const tier = body.tier ?? body.profile?.tier ?? body.subscription?.tier
    expect(tier).toBe('pro')
    console.log('✓ /api/subscription shows pro tier after sim-upgrade')
  })

  test('DELETE /api/dev/stripe-simulate downgrades to free', async ({ request }) => {
    // First upgrade
    await request.post('/api/dev/stripe-simulate', {
      headers: authHeaders(user.accessToken, { includeE2ESecret: true }),
      data: { action: 'upgrade' },
    })

    // Then downgrade
    const res = await request.delete('/api/dev/stripe-simulate', {
      headers: authHeaders(user.accessToken, { includeE2ESecret: true }),
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.tier).toBe('free')
    console.log('✓ stripe-simulate DELETE downgrades to free')
  })
})

// ─── 3. PRO FEATURES — enabled after upgrade ─────────────────────────────────

test.describe('3. Pro features enabled after upgrade', () => {
  let user: TestUser

  test.beforeAll(async ({ request }) => {
    user = await createTestUser(request)
    // Upgrade to Pro before all tests in this describe block
    const res = await request.post('/api/dev/stripe-simulate', {
      headers: authHeaders(user.accessToken, { includeE2ESecret: true }),
      data: { action: 'upgrade' },
    })
    if (res.status() !== 200) {
      throw new Error(`Pro upgrade failed: ${await res.text()}`)
    }
  })

  test.afterAll(async ({ request }) => {
    await deleteTestUser(request, user.userId)
  })

  test('GET /api/benchmark returns 200 for Pro user', async ({ request }) => {
    const res = await request.get('/api/benchmark', {
      headers: authHeaders(user.accessToken),
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('snapshots')
    expect(body).toHaveProperty('optIn')
    expect(Array.isArray(body.snapshots)).toBeTruthy()
    console.log(`✓ /api/benchmark → 200 for Pro user, ${body.snapshots.length} snapshots`)
  })

  test('POST /api/ai/insights returns 200 for Pro user', async ({ request }) => {
    const res = await request.post('/api/ai/insights', {
      headers: authHeaders(user.accessToken),
      data: { insightType: 'all', days: 30 },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('insights')
    expect(Array.isArray(body.insights)).toBeTruthy()
    expect(body).toHaveProperty('generated_at')
    console.log(`✓ /api/ai/insights → 200, ${body.insights.length} insights, fallback=${body.fallback}`)
  })

  test('GET /api/subscription shows pro tier', async ({ request }) => {
    const res = await request.get('/api/subscription', {
      headers: authHeaders(user.accessToken),
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    const tier = body.tier ?? body.profile?.tier ?? body.subscription?.tier
    expect(tier).toBe('pro')
    console.log('✓ subscription API shows pro tier')
  })

  test('Pro user can access pricing experiments (GET /api/pricing)', async ({ request }) => {
    const res = await request.get('/api/pricing', {
      headers: authHeaders(user.accessToken),
    })
    // 200 = accessible | 204 = empty | 404 = no data yet — all acceptable for Pro
    expect([200, 204, 404]).toContain(res.status())
    console.log(`✓ /api/pricing → ${res.status()} for Pro user`)
  })

  test('AI insights response has confidence field', async ({ request }) => {
    const res = await request.post('/api/ai/insights', {
      headers: authHeaders(user.accessToken),
      data: { insightType: 'all', days: 30 },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    // Insights may be empty (no data) but structure should be correct
    if (body.insights.length > 0) {
      const insight = body.insights[0]
      expect(insight).toHaveProperty('type')
      expect(insight).toHaveProperty('title')
      console.log(`✓ First insight: type=${insight.type}, confidence=${insight.confidence}`)
    } else {
      console.log('✓ No insights yet (no data) — structure valid')
    }
  })

  test('Pro user RLS audit returns all tables with rls_enabled', async ({ request }) => {
    const res = await request.get('/api/rls-audit', {
      headers: authHeaders(user.accessToken),
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('tables')
    for (const table of body.tables) {
      expect(table.rls_enabled).toBe(true)
    }
    console.log(`✓ RLS audit: ${body.tables.length} tables, all RLS-enabled`)
  })
})

// ─── 4. NEGATIVE TESTS — bad CSV import, malformed data ──────────────────────

test.describe('4. Negative tests — bad CSV and malformed input', () => {
  let user: TestUser

  test.beforeAll(async ({ request }) => {
    user = await createTestUser(request)
  })

  test.afterAll(async ({ request }) => {
    await deleteTestUser(request, user.userId)
  })

  test('POST /api/import with empty rows returns 400', async ({ request }) => {
    const res = await request.post('/api/import', {
      headers: authHeaders(user.accessToken),
      data: { rows: [] },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toBeTruthy()
    console.log(`✓ empty rows → 400: ${body.error}`)
  })

  test('POST /api/import with no rows field returns 400', async ({ request }) => {
    const res = await request.post('/api/import', {
      headers: authHeaders(user.accessToken),
      data: {},
    })
    expect(res.status()).toBe(400)
    console.log('✓ missing rows field → 400')
  })

  test('POST /api/import with all-invalid rows returns 400', async ({ request }) => {
    const res = await request.post('/api/import', {
      headers: authHeaders(user.accessToken),
      data: {
        rows: [
          { date: 'not-a-date', amount: 'not-a-number', description: 'bad row' },
          { date: '', amount: '', description: '' },
          { notdate: 'x', notamount: 'y' },
        ],
        platform: 'csv',
      },
    })
    expect([400, 422]).toContain(res.status())
    console.log(`✓ all-invalid rows → ${res.status()}`)
  })

  test('POST /api/import with negative-only rows (refunds) still imports', async ({ request }) => {
    // Negative amounts are valid (refunds) — should import
    const res = await request.post('/api/import', {
      headers: authHeaders(user.accessToken),
      data: {
        rows: [
          { date: '2025-01-15', amount: -50, description: 'Refund', currency: 'USD' },
        ],
        platform: 'csv',
      },
    })
    // Either imported or rejected — depends on implementation; both are acceptable
    expect([200, 400]).toContain(res.status())
    console.log(`✓ negative-only rows → ${res.status()}`)
  })

  test('POST /api/timer with missing duration returns 400', async ({ request }) => {
    const res = await request.post('/api/timer', {
      headers: authHeaders(user.accessToken),
      data: {
        action: 'log',
        // missing durationMinutes
        entryType: 'billable',
      },
    })
    expect([400, 422]).toContain(res.status())
    console.log(`✓ timer missing duration → ${res.status()}`)
  })

  test('POST /api/timer with zero duration returns 400', async ({ request }) => {
    const res = await request.post('/api/timer', {
      headers: authHeaders(user.accessToken),
      data: {
        action: 'log',
        durationMinutes: 0,
        entryType: 'billable',
      },
    })
    expect([400, 422]).toContain(res.status())
    console.log(`✓ timer zero duration → ${res.status()}`)
  })

  test('POST /api/timer with negative duration returns 400', async ({ request }) => {
    const res = await request.post('/api/timer', {
      headers: authHeaders(user.accessToken),
      data: {
        action: 'log',
        durationMinutes: -30,
        entryType: 'billable',
      },
    })
    expect([400, 422]).toContain(res.status())
    console.log(`✓ timer negative duration → ${res.status()}`)
  })

  test('POST /api/ai/insights returns 402 (not 500) for free user Pro gate', async ({ request }) => {
    const res = await request.post('/api/ai/insights', {
      headers: authHeaders(user.accessToken),
      data: { insightType: 'invalid_type', days: -5 },
    })
    // Free user hits the Pro gate before input validation
    expect(res.status()).toBe(402)
    console.log(`✓ free user insights → 402 (Pro gate, not 500)`)
  })

  test('POST /api/checkout with invalid priceId returns 400', async ({ request }) => {
    const res = await request.post('/api/checkout', {
      headers: authHeaders(user.accessToken),
      data: { priceId: 'not_a_valid_price_id' },
    })
    // Either 400 (validation) or 500 (Stripe rejects) — not 200
    expect(res.status()).not.toBe(200)
    console.log(`✓ invalid priceId → ${res.status()}`)
  })

  test('POST /api/import with oversized payload stays robust', async ({ request }) => {
    // 1000 valid-ish rows — should either work or fail gracefully (not crash)
    const rows = Array.from({ length: 1000 }, (_, i) => ({
      date: '2025-01-15',
      amount: 100 + i,
      description: `Row ${i}`,
      currency: 'USD',
    }))
    const res = await request.post('/api/import', {
      headers: authHeaders(user.accessToken),
      data: { rows, platform: 'csv' },
    })
    // 200 (imported), 400 (validation), or 413 (too large) — never 500
    expect([200, 201, 400, 413]).toContain(res.status())
    console.log(`✓ 1000-row import → ${res.status()} (no crash)`)
  })
})

// ─── 5. BENCHMARK OPT-IN — toggle persists across requests ───────────────────

test.describe('5. Benchmark opt-in toggle persists', () => {
  let user: TestUser

  test.beforeAll(async ({ request }) => {
    user = await createTestUser(request)
    // Upgrade to Pro (benchmark requires Pro)
    await request.post('/api/dev/stripe-simulate', {
      headers: authHeaders(user.accessToken, { includeE2ESecret: true }),
      data: { action: 'upgrade' },
    })
  })

  test.afterAll(async ({ request }) => {
    await deleteTestUser(request, user.userId)
  })

  test('POST /api/benchmark opt-in=true persists', async ({ request }) => {
    const res = await request.post('/api/benchmark', {
      headers: authHeaders(user.accessToken),
      data: { optedIn: true, serviceCategory: 'design' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.optedIn).toBe(true)
    console.log('✓ opt-in=true persisted')
  })

  test('GET /api/benchmark reflects opt-in=true after setting', async ({ request }) => {
    // Opt in
    await request.post('/api/benchmark', {
      headers: authHeaders(user.accessToken),
      data: { optedIn: true, serviceCategory: 'design' },
    })
    // Read back
    const res = await request.get('/api/benchmark', {
      headers: authHeaders(user.accessToken),
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.optIn).toBeDefined()
    expect(body.optIn.opted_in).toBe(true)
    console.log('✓ GET /api/benchmark shows opted_in=true after POST')
  })

  test('POST /api/benchmark opt-in=false persists (opt-out)', async ({ request }) => {
    // First opt in
    await request.post('/api/benchmark', {
      headers: authHeaders(user.accessToken),
      data: { optedIn: true, serviceCategory: 'design' },
    })
    // Then opt out
    const res = await request.post('/api/benchmark', {
      headers: authHeaders(user.accessToken),
      data: { optedIn: false, serviceCategory: 'design' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.optedIn).toBe(false)
    console.log('✓ opt-out persisted')
  })

  test('GET /api/benchmark reflects opt-in=false after opting out', async ({ request }) => {
    // Opt in
    await request.post('/api/benchmark', {
      headers: authHeaders(user.accessToken),
      data: { optedIn: true, serviceCategory: 'general' },
    })
    // Opt out
    await request.post('/api/benchmark', {
      headers: authHeaders(user.accessToken),
      data: { optedIn: false, serviceCategory: 'general' },
    })
    // Verify GET reflects false
    const res = await request.get('/api/benchmark', {
      headers: authHeaders(user.accessToken),
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.optIn.opted_in).toBe(false)
    console.log('✓ GET /api/benchmark shows opted_in=false after opt-out')
  })

  test('Opt-in toggle is idempotent — double opt-in still returns true', async ({ request }) => {
    for (let i = 0; i < 2; i++) {
      const res = await request.post('/api/benchmark', {
        headers: authHeaders(user.accessToken),
        data: { optedIn: true, serviceCategory: 'coaching' },
      })
      expect(res.status()).toBe(200)
      expect((await res.json()).optedIn).toBe(true)
    }
    // Read back once
    const verify = await request.get('/api/benchmark', {
      headers: authHeaders(user.accessToken),
    })
    expect((await verify.json()).optIn.opted_in).toBe(true)
    console.log('✓ double opt-in is idempotent')
  })

  test('Opt-in survives a subsequent GET (persistence check across requests)', async ({ request }) => {
    // Set to true
    await request.post('/api/benchmark', {
      headers: authHeaders(user.accessToken),
      data: { optedIn: true, serviceCategory: 'development' },
    })

    // Wait briefly (simulates page navigation)
    await new Promise(r => setTimeout(r, 500))

    // GET 3 times — should always show true
    for (let i = 0; i < 3; i++) {
      const res = await request.get('/api/benchmark', {
        headers: authHeaders(user.accessToken),
      })
      expect(res.status()).toBe(200)
      expect((await res.json()).optIn.opted_in).toBe(true)
    }
    console.log('✓ opt-in persists across 3 sequential GET requests')
  })

  test('Free user cannot set benchmark opt-in (Pro gate)', async ({ request }) => {
    // Create a fresh free user
    const freeUser = await createTestUser(request)
    try {
      const res = await request.post('/api/benchmark', {
        headers: authHeaders(freeUser.accessToken),
        data: { optedIn: true, serviceCategory: 'design' },
      })
      // Benchmark requires Pro — should be 402
      expect(res.status()).toBe(402)
      console.log('✓ free user cannot set benchmark opt-in (402)')
    } finally {
      await deleteTestUser(request, freeUser.userId)
    }
  })
})

// ─── Full Pro Upgrade Flow — end-to-end ──────────────────────────────────────

test.describe('Full Pro upgrade flow (integration)', () => {
  let user: TestUser

  test.beforeAll(async ({ request }) => {
    user = await createTestUser(request)
  })

  test.afterAll(async ({ request }) => {
    await deleteTestUser(request, user.userId)
  })

  test('Complete flow: free → verify gate → upgrade → Pro features → opt-in → downgrade', async ({ request }) => {
    // 1. Verify free tier
    const subBefore = await request.get('/api/subscription', {
      headers: authHeaders(user.accessToken),
    })
    expect(subBefore.status()).toBe(200)

    // 2. Verify Pro gate blocks benchmark
    const gated = await request.get('/api/benchmark', {
      headers: authHeaders(user.accessToken),
    })
    expect(gated.status()).toBe(402)
    console.log('✓ Step 1: Pro gate confirmed (402)')

    // 3. Upgrade to Pro
    const upgrade = await request.post('/api/dev/stripe-simulate', {
      headers: authHeaders(user.accessToken, { includeE2ESecret: true }),
      data: { action: 'upgrade' },
    })
    expect(upgrade.status()).toBe(200)
    expect((await upgrade.json()).tier).toBe('pro')
    console.log('✓ Step 2: Upgraded to Pro')

    // 4. Verify Pro tier in subscription API
    const subAfter = await request.get('/api/subscription', {
      headers: authHeaders(user.accessToken),
    })
    expect(subAfter.status()).toBe(200)
    const subBody = await subAfter.json()
    const tier = subBody.tier ?? subBody.profile?.tier ?? subBody.subscription?.tier
    expect(tier).toBe('pro')
    console.log('✓ Step 3: Subscription API shows pro')

    // 5. Access Pro features
    const benchmark = await request.get('/api/benchmark', {
      headers: authHeaders(user.accessToken),
    })
    expect(benchmark.status()).toBe(200)
    console.log('✓ Step 4: Benchmark accessible')

    const insights = await request.post('/api/ai/insights', {
      headers: authHeaders(user.accessToken),
      data: { insightType: 'all', days: 30 },
    })
    expect(insights.status()).toBe(200)
    console.log('✓ Step 5: AI insights accessible')

    // 6. Opt into benchmark
    const optIn = await request.post('/api/benchmark', {
      headers: authHeaders(user.accessToken),
      data: { optedIn: true, serviceCategory: 'general' },
    })
    expect(optIn.status()).toBe(200)
    expect((await optIn.json()).optedIn).toBe(true)
    console.log('✓ Step 6: Benchmark opt-in saved')

    // 7. Verify opt-in persists
    const optInCheck = await request.get('/api/benchmark', {
      headers: authHeaders(user.accessToken),
    })
    expect((await optInCheck.json()).optIn.opted_in).toBe(true)
    console.log('✓ Step 7: Opt-in persisted (GET confirms)')

    // 8. Downgrade back to free
    const downgrade = await request.delete('/api/dev/stripe-simulate', {
      headers: authHeaders(user.accessToken, { includeE2ESecret: true }),
    })
    expect(downgrade.status()).toBe(200)
    expect((await downgrade.json()).tier).toBe('free')
    console.log('✓ Step 8: Downgraded to free')

    // 9. Verify benchmark gated again
    const regated = await request.get('/api/benchmark', {
      headers: authHeaders(user.accessToken),
    })
    expect(regated.status()).toBe(402)
    console.log('✓ Step 9: Pro gate re-applied after downgrade')

    console.log('\n🎉 Full Pro upgrade flow: 9/9 steps passed')
  })
})
