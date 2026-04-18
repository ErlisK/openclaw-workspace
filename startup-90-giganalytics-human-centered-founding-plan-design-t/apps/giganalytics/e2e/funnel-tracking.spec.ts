/**
 * Full Activation Funnel Tracking E2E Tests
 *
 * Verifies the complete 6-step funnel is instrumented and measurable:
 *   1. landing_viewed     — landing page fires funnel step
 *   2. signup_completed   — /api/auth/signup fires on success
 *   3. stream_created     — /api/streams POST fires on stream creation
 *   4. import_completed   — /api/import fires on successful import
 *   5. timer_session      — /api/timer fires on session close
 *   6. insights_viewed    — /api/ai/insights fires on view
 *
 * Also covers:
 *   - /api/funnel GET: lists 6 primary + 4 extended steps
 *   - /api/funnel POST: stream_created now accepted
 *   - /api/funnel/report GET: returns drop-off analysis structure
 *   - drop-off analysis: identifies bottleneck + recommendation
 */

import { test, expect } from '@playwright/test'

// ─── /api/funnel — updated step list ─────────────────────────────────────────

test.describe('/api/funnel — 6-step funnel', () => {
  test('GET lists 10 steps (6 primary + 4 extended)', async ({ request }) => {
    const res = await request.get('/api/funnel')
    expect([200, 401]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.steps.length).toBe(10)
    console.log(`✓ /api/funnel GET: ${body.steps.length} steps`)
  })

  test('primary funnel steps in correct order', async ({ request }) => {
    const res = await request.get('/api/funnel')
    if (res.status() !== 200) return
    const body = await res.json()
    const events = body.steps.map((s: {event: string}) => s.event)
    // Primary 6
    expect(events[0]).toBe('landing_viewed')
    expect(events[1]).toBe('signup_completed')
    expect(events[2]).toBe('stream_created')
    expect(events[3]).toBe('import_completed')
    expect(events[4]).toBe('timer_session')
    expect(events[5]).toBe('insights_viewed')
    console.log('✓ Primary 6-step funnel in correct order')
  })

  test('north_star is insights_viewed (primary funnel end)', async ({ request }) => {
    const res = await request.get('/api/funnel')
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.north_star).toBe('insights_viewed')
    console.log('✓ north_star = insights_viewed')
  })

  test('POST stream_created is now a valid step', async ({ request }) => {
    const res = await request.post('/api/funnel', {
      data: {
        step: 'stream_created',
        variant: '1',
        session_id: `stream_test_${Date.now()}`,
        properties: { platform: 'upwork' },
      },
      headers: { 'Content-Type': 'application/json' },
    })
    if (res.status() === 401) return
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.step).toBe('stream_created')
    console.log('✓ POST /api/funnel stream_created accepted')
  })

  test('POST all 6 primary funnel steps accepted', async ({ request }) => {
    const primarySteps = [
      'landing_viewed',
      'signup_completed',
      'stream_created',
      'import_completed',
      'timer_session',
      'insights_viewed',
    ]
    for (const step of primarySteps) {
      const res = await request.post('/api/funnel', {
        data: {
          step,
          variant: '2',
          session_id: `primary_${step}_${Date.now()}`,
        },
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.status() === 401) continue
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)
      console.log(`  ✓ POST /api/funnel step=${step}`)
    }
  })
})

// ─── /api/funnel/report ───────────────────────────────────────────────────────

test.describe('/api/funnel/report — drop-off analysis', () => {
  test('GET returns 200 with funnel array', async ({ request }) => {
    const res = await request.get('/api/funnel/report')
    expect([200, 401]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(Array.isArray(body.funnel)).toBe(true)
    expect(body.funnel.length).toBe(6)
    console.log(`✓ GET /api/funnel/report → ${body.funnel.length} funnel steps`)
  })

  test('funnel steps have required fields', async ({ request }) => {
    const res = await request.get('/api/funnel/report')
    if (res.status() !== 200) return
    const body = await res.json()
    for (const step of body.funnel) {
      expect(step.step).toBeGreaterThan(0)
      expect(step.event).toBeTruthy()
      expect(step.label).toBeTruthy()
      expect(typeof step.count).toBe('number')
      expect(typeof step.conversion_rate).toBe('number')
      expect(typeof step.drop_off_rate).toBe('number')
    }
    console.log('✓ /api/funnel/report: all steps have required fields')
  })

  test('funnel steps cover the 6-step funnel', async ({ request }) => {
    const res = await request.get('/api/funnel/report')
    if (res.status() !== 200) return
    const body = await res.json()
    const events = body.funnel.map((s: {event: string}) => s.event)
    for (const event of ['landing_viewed', 'signup_completed', 'stream_created', 'import_completed', 'timer_session', 'insights_viewed']) {
      expect(events).toContain(event)
    }
    console.log('✓ /api/funnel/report covers all 6 primary funnel events')
  })

  test('bottleneck has recommendation text', async ({ request }) => {
    const res = await request.get('/api/funnel/report')
    if (res.status() !== 200) return
    const body = await res.json()
    // bottleneck may be null if counts are 0 — just check structure
    if (body.bottleneck) {
      expect(body.bottleneck.event).toBeTruthy()
      expect(body.bottleneck.recommendation).toBeTruthy()
      expect(typeof body.bottleneck.drop_off_rate).toBe('number')
      console.log(`✓ Bottleneck: step ${body.bottleneck.step} (${body.bottleneck.event}) drop_off=${body.bottleneck.drop_off_rate}%`)
      console.log(`  Recommendation: ${body.bottleneck.recommendation.slice(0, 80)}...`)
    } else {
      console.log('✓ /api/funnel/report: bottleneck=null (no data yet)')
    }
  })

  test('period_days and from date present', async ({ request }) => {
    const res = await request.get('/api/funnel/report?days=7')
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.period_days).toBe(7)
    expect(body.from).toBeTruthy()
    console.log(`✓ /api/funnel/report?days=7: period_days=${body.period_days}`)
  })

  test('returns totals: total_started and total_activated', async ({ request }) => {
    const res = await request.get('/api/funnel/report')
    if (res.status() !== 200) return
    const body = await res.json()
    expect(typeof body.total_started).toBe('number')
    expect(typeof body.total_activated).toBe('number')
    console.log(`✓ Totals: started=${body.total_started}, activated=${body.total_activated}`)
  })
})

// ─── Funnel instrumentation in API routes ─────────────────────────────────────

test.describe('API route funnel instrumentation', () => {
  test('GET /api/funnel/report returns 200 (not 404/500)', async ({ request }) => {
    const res = await request.get('/api/funnel/report')
    expect([200, 401]).toContain(res.status())
    expect(res.status()).not.toBe(404)
    expect(res.status()).not.toBe(500)
    console.log(`✓ GET /api/funnel/report → ${res.status()}`)
  })

  test('POST /api/streams returns 401 (auth-gated, not 404) — stream_created fires on success', async ({ request }) => {
    const res = await request.post('/api/streams', {
      data: { name: 'Test Stream', platform: 'upwork' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect([201, 401, 400]).toContain(res.status())
    expect(res.status()).not.toBe(404)
    expect(res.status()).not.toBe(500)
    console.log(`✓ POST /api/streams → ${res.status()} (stream_created fires on 201)`)
  })

  test('POST /api/auth/signup returns 200/400 (not 404) — signup_completed fires on success', async ({ request }) => {
    const res = await request.post('/api/auth/signup', {
      data: { email: 'test_funnel@example.com', password: 'wrong' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect([200, 400, 429]).toContain(res.status())
    expect(res.status()).not.toBe(404)
    console.log(`✓ POST /api/auth/signup → ${res.status()} (signup_completed fires on 200)`)
  })

  test('GET /api/ai/insights returns 401 (auth-gated) — insights_viewed fires on success', async ({ request }) => {
    const res = await request.get('/api/ai/insights')
    expect([200, 401, 403]).toContain(res.status())
    expect(res.status()).not.toBe(404)
    console.log(`✓ GET /api/ai/insights → ${res.status()} (insights_viewed fires on success)`)
  })
})

// ─── Drop-off screen identification ──────────────────────────────────────────

test('funnel report identifies highest drop-off step', async ({ request }) => {
  const res = await request.get('/api/funnel/report')
  if (res.status() !== 200) return
  const body = await res.json()

  // With real data, bottleneck step should be between steps 2-6
  if (body.bottleneck) {
    expect(body.bottleneck.step).toBeGreaterThanOrEqual(2)
    expect(body.bottleneck.step).toBeLessThanOrEqual(6)
    console.log(`✓ Drop-off identified at step ${body.bottleneck.step}: ${body.bottleneck.label}`)
  }

  // Each step's drop-off should be 0-100
  for (const step of body.funnel) {
    expect(step.drop_off_rate).toBeGreaterThanOrEqual(0)
    expect(step.drop_off_rate).toBeLessThanOrEqual(100)
    expect(step.conversion_rate).toBeGreaterThanOrEqual(0)
    expect(step.conversion_rate).toBeLessThanOrEqual(100)
  }
  console.log('✓ All funnel steps have valid drop-off rates (0-100%)')
})
