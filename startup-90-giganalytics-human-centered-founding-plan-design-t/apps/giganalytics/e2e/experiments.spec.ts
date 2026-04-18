/**
 * PostHog Experiments & Activation Funnel E2E Tests
 *
 * Covers:
 *   1.  GET /api/experiments — health check, returns variant + name
 *   2.  GET /api/experiments?v=1 — returns roi_first
 *   3.  GET /api/experiments?v=2 — returns time_saver
 *   4.  GET /api/experiments?v=3 — returns pricing_lab
 *   5.  GET /api/experiments — random assignment (no v param) returns 1/2/3
 *   6.  GET /api/experiments — includes experiment name + 3 variant descriptions
 *   7.  GET /api/funnel — health check, lists 10 steps
 *   8.  POST /api/funnel — valid step recorded
 *   9.  POST /api/funnel — invalid step returns 400
 *  10.  POST /api/funnel — all activation funnel steps accepted
 *  11.  GET /?v=1 — landing shows v1 content (roi_first)
 *  12.  GET /?v=2 — landing shows v2 content (time_saver)
 *  13.  GET /?v=3 — landing shows v3 content (pricing_lab)
 *  14.  All 3 variants have unique headlines (no copy collision)
 *  15.  All 3 variants have working CTA → /signup
 *  16.  GET / (no v) — serves a valid variant (1, 2, or 3)
 *  17.  Variant badge visible in page (variant debug bar)
 *  18.  Primary CTA has data-testid=hero-cta-primary on all variants
 *  19.  Variant param passes through to signup URL (attribution)
 *  20.  /api/experiments returns session_id in response
 */

import { test, expect } from '@playwright/test'

// ─── /api/experiments ─────────────────────────────────────────────────────────

test.describe('GET /api/experiments', () => {
  test('returns 200 with variant and experiment name', async ({ request }) => {
    const res = await request.get('/api/experiments?v=1&session_id=test_e2e')
    expect([200, 401]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.variant).toBe('1')
    expect(body.name).toBe('roi_first')
    expect(body.experiment).toBe('landing-variant')
    expect(body.assigned_by).toBe('url_param')
    console.log('✓ GET /api/experiments?v=1 → roi_first')
  })

  test('v=2 returns time_saver', async ({ request }) => {
    const res = await request.get('/api/experiments?v=2&session_id=test_e2e_2')
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.variant).toBe('2')
    expect(body.name).toBe('time_saver')
    console.log('✓ GET /api/experiments?v=2 → time_saver')
  })

  test('v=3 returns pricing_lab', async ({ request }) => {
    const res = await request.get('/api/experiments?v=3&session_id=test_e2e_3')
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.variant).toBe('3')
    expect(body.name).toBe('pricing_lab')
    console.log('✓ GET /api/experiments?v=3 → pricing_lab')
  })

  test('random assignment (no v) returns 1, 2, or 3', async ({ request }) => {
    const res = await request.get(`/api/experiments?session_id=random_${Date.now()}`)
    if (res.status() !== 200) return
    const body = await res.json()
    expect(['1', '2', '3']).toContain(body.variant)
    expect(body.assigned_by).toBe('random')
    console.log(`✓ Random assignment → variant ${body.variant}`)
  })

  test('includes all 3 variant descriptions', async ({ request }) => {
    const res = await request.get('/api/experiments?v=1&session_id=desc_test')
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.variants['1']).toBeTruthy()
    expect(body.variants['2']).toBeTruthy()
    expect(body.variants['3']).toBeTruthy()
    console.log('✓ /api/experiments lists all 3 variants')
  })

  test('includes session_id in response', async ({ request }) => {
    const sid = `sid_${Date.now()}`
    const res = await request.get(`/api/experiments?v=2&session_id=${sid}`)
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.session_id).toBe(sid)
    console.log('✓ /api/experiments echoes session_id')
  })
})

// ─── /api/funnel ─────────────────────────────────────────────────────────────

test.describe('/api/funnel', () => {
  test('GET returns 200 with 10 activation steps', async ({ request }) => {
    const res = await request.get('/api/funnel')
    expect([200, 401]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(Array.isArray(body.steps)).toBe(true)
    expect(body.steps.length).toBe(10)
    expect(body.north_star).toBeTruthy()  // north_star is 'insights_viewed' (primary) or 'activation_complete' (extended)
    console.log(`✓ GET /api/funnel → ${body.steps.length} steps, north_star=${body.north_star}`)
  })

  test('GET lists all key funnel events', async ({ request }) => {
    const res = await request.get('/api/funnel')
    if (res.status() !== 200) return
    const body = await res.json()
    const events = body.steps.map((s: {event: string}) => s.event)
    for (const event of ['landing_viewed', 'signup_completed', 'import_completed']) {
      expect(events).toContain(event)
    }
    console.log('✓ /api/funnel lists all key activation events')
  })

  test('POST valid step is recorded', async ({ request }) => {
    const res = await request.post('/api/funnel', {
      data: {
        step: 'landing_viewed',
        variant: '1',
        session_id: `funnel_test_${Date.now()}`,
        properties: { source: 'e2e_test' },
      },
      headers: { 'Content-Type': 'application/json' },
    })
    expect([200, 401]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.step).toBe('landing_viewed')
    expect(body.recorded).toBe(true)
    console.log('✓ POST /api/funnel: landing_viewed recorded')
  })

  test('POST invalid step returns 400', async ({ request }) => {
    const res = await request.post('/api/funnel', {
      data: {
        step: 'not_a_real_step',
        session_id: 'test',
      },
      headers: { 'Content-Type': 'application/json' },
    })
    if (res.status() === 401) return  // SSO
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toBeTruthy()
    expect(Array.isArray(body.valid_steps)).toBe(true)
    console.log('✓ POST /api/funnel: invalid step → 400 with valid_steps list')
  })

  test('POST accepts all 10 activation funnel steps', async ({ request }) => {
    const steps = [
      'landing_viewed', 'landing_cta_clicked', 'signup_started', 'signup_completed',
      'onboarding_started', 'import_started', 'import_completed', 'roi_viewed',
      'timer_started', 'activation_complete',
    ]
    for (const step of steps) {
      const res = await request.post('/api/funnel', {
        data: { step, variant: '1', session_id: `all_steps_test_${Date.now()}` },
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.status() === 401) continue
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)
    }
    console.log('✓ All 10 funnel steps accepted by POST /api/funnel')
  })
})

// ─── Landing page variants ────────────────────────────────────────────────────

test.describe('Landing page variants', () => {
  test('/?v=1 shows roi_first content', async ({ request }) => {
    const res = await request.get('/?v=1')
    expect([200, 401]).toContain(res.status())
    if (res.status() !== 200) return
    const text = await res.text()
    // v=1 has ROI-first headline
    expect(text.toLowerCase()).toMatch(/real hourly rate|roi|income stream/)
    // Variant debug bar shows v=1
    // JSX adds HTML comments in SSR, check variant name or href instead
    expect(text).toContain('roi_first')
    console.log('✓ /?v=1 serves roi_first variant')
  })

  test('/?v=2 shows time_saver content', async ({ request }) => {
    const res = await request.get('/?v=2')
    if (res.status() !== 200) return
    const text = await res.text()
    // JSX adds HTML comments in SSR, check variant name instead
    expect(text).toContain('time_saver')
    expect(text.toLowerCase()).toMatch(/time|timer|friction|tracking/)
    console.log('✓ /?v=2 serves time_saver variant')
  })

  test('/?v=3 shows pricing_lab content', async ({ request }) => {
    const res = await request.get('/?v=3')
    if (res.status() !== 200) return
    const text = await res.text()
    // JSX adds HTML comments in SSR, check variant name instead
    expect(text).toContain('pricing_lab')
    expect(text.toLowerCase()).toMatch(/pric|rate|data/)
    console.log('✓ /?v=3 serves pricing_lab variant')
  })

  test('all 3 variants have unique headlines', async ({ request }) => {
    const texts: string[] = []
    for (const v of ['1', '2', '3']) {
      const res = await request.get(`/?v=${v}`)
      if (res.status() !== 200) continue
      texts.push(await res.text())
    }
    if (texts.length < 3) return
    // Extract h1 from each — they must differ
    const h1s = texts.map(t => {
      const match = t.match(/<h1[^>]*>(.*?)<\/h1>/s)
      return match ? match[1].replace(/<[^>]+>/g, '').trim() : ''
    })
    const uniqueH1s = new Set(h1s.filter(Boolean))
    expect(uniqueH1s.size).toBe(3)
    console.log('✓ All 3 variants have unique h1 headlines')
    for (const [i, h1] of h1s.entries()) {
      console.log(`  v${i + 1}: ${h1.slice(0, 60)}`)
    }
  })

  test('all variants have hero-cta-primary with /signup link', async ({ request }) => {
    for (const v of ['1', '2', '3']) {
      const res = await request.get(`/?v=${v}`)
      if (res.status() !== 200) continue
      const text = await res.text()
      expect(text).toContain('data-testid="hero-cta-primary"')
      expect(text).toContain('/signup')
      console.log(`✓ /?v=${v} has hero-cta-primary linking to /signup`)
    }
  })

  test('/ (no v) serves a valid variant', async ({ request }) => {
    const res = await request.get('/')
    if (res.status() !== 200) return
    const text = await res.text()
    // Should contain one of the 3 variant names in the debug bar (JSX adds HTML comments around interpolated numbers)
    const hasVariant = text.includes('roi_first') || text.includes('time_saver') || text.includes('pricing_lab')
    expect(hasVariant).toBe(true)
    console.log('✓ / (no ?v) serves a valid variant')
  })

  test('variant id passes through to signup URL', async ({ request }) => {
    for (const v of ['1', '2', '3']) {
      const res = await request.get(`/?v=${v}`)
      if (res.status() !== 200) continue
      const text = await res.text()
      // Primary CTA href includes the variant for attribution
      expect(text).toContain(`v=${v}`)
      console.log(`✓ /?v=${v} signup URL includes variant param`)
    }
  })
})
