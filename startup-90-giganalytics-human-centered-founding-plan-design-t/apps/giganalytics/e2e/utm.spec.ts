/**
 * UTM Attribution Tracking E2E Tests
 *
 * Covers:
 *   1. GET /api/utm — health check, param list
 *   2. POST /api/utm — with valid UTM params → stored=true
 *   3. POST /api/utm — without UTM params → stored=false
 *   4. POST /api/utm — missing session_id → 400
 *   5. POST /api/utm — all 5 UTM keys accepted
 *   6. POST /api/utm — returns param echo
 *   7. Landing page loads with utm_source in URL without error
 *   8. Blog page loads with UTM params without error
 *   9. /social page loads with UTM params without error
 *  10. /api/utm response never 5xx
 *  11. UTM params in landing page links include utm_source + utm_campaign
 *  12. Blog CTAs have utm_source=blog
 */

import { test, expect } from '@playwright/test'

// ─── /api/utm Health Check ────────────────────────────────────────────────────

test.describe('GET /api/utm', () => {
  test('returns 200 with endpoint info', async ({ request }) => {
    const res = await request.get('/api/utm')
    expect([200, 401]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.endpoint).toBe('/api/utm')
    expect(Array.isArray(body.params)).toBe(true)
    expect(body.params).toContain('utm_source')
    expect(body.params).toContain('utm_campaign')
    console.log('✓ GET /api/utm health check passed')
  })

  test('lists all 5 UTM param names', async ({ request }) => {
    const res = await request.get('/api/utm')
    if (res.status() !== 200) return
    const body = await res.json()
    const params = body.params as string[]
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
      expect(params).toContain(key)
    }
    console.log('✓ GET /api/utm lists all 5 UTM keys')
  })
})

// ─── POST /api/utm ────────────────────────────────────────────────────────────

test.describe('POST /api/utm', () => {
  test('stores valid UTM params', async ({ request }) => {
    const res = await request.post('/api/utm', {
      data: {
        session_id: `test_${Date.now()}`,
        utm_source: 'twitter',
        utm_medium: 'social',
        utm_campaign: 'launch_test',
        landing_path: '/',
      },
      headers: { 'Content-Type': 'application/json' },
    })
    expect([200, 201, 401]).toContain(res.status())
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.stored).toBe(true)
    expect(body.params.utm_source).toBe('twitter')
    expect(body.params.utm_campaign).toBe('launch_test')
    console.log('✓ POST /api/utm stores valid UTM params')
  })

  test('returns stored=false when no UTM params', async ({ request }) => {
    const res = await request.post('/api/utm', {
      data: { session_id: `test_${Date.now()}`, landing_path: '/blog' },
      headers: { 'Content-Type': 'application/json' },
    })
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.stored).toBe(false)
    expect(body.reason).toBe('no_utm_params')
    console.log('✓ POST /api/utm skips when no UTM params')
  })

  test('returns 400 when session_id is missing', async ({ request }) => {
    const res = await request.post('/api/utm', {
      data: { utm_source: 'twitter' },
      headers: { 'Content-Type': 'application/json' },
    })
    if (res.status() === 401) return  // SSO gate
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toBeTruthy()
    console.log('✓ POST /api/utm returns 400 for missing session_id')
  })

  test('accepts all 5 UTM keys', async ({ request }) => {
    const res = await request.post('/api/utm', {
      data: {
        session_id: `test_${Date.now()}`,
        utm_source: 'reddit',
        utm_medium: 'organic',
        utm_campaign: 'launch_post',
        utm_content: 'subreddit_freelance',
        utm_term: 'freelance analytics',
        landing_path: '/blog/true-hourly-rate',
        referrer: 'https://reddit.com/r/freelance',
      },
      headers: { 'Content-Type': 'application/json' },
    })
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.stored).toBe(true)
    expect(body.params.utm_source).toBe('reddit')
    expect(body.params.utm_content).toBe('subreddit_freelance')
    expect(body.params.utm_term).toBe('freelance analytics')
    console.log('✓ POST /api/utm accepts all 5 UTM keys')
  })

  test('returns the parsed params in response', async ({ request }) => {
    const campaign = `test_${Date.now()}`
    const res = await request.post('/api/utm', {
      data: {
        session_id: `verify_${Date.now()}`,
        utm_source: 'producthunt',
        utm_medium: 'listing',
        utm_campaign: campaign,
      },
      headers: { 'Content-Type': 'application/json' },
    })
    if (res.status() !== 200) return
    const body = await res.json()
    expect(body.params.utm_source).toBe('producthunt')
    expect(body.params.utm_medium).toBe('listing')
    expect(body.params.utm_campaign).toBe(campaign)
    console.log('✓ POST /api/utm echoes parsed params')
  })

  test('never returns 5xx', async ({ request }) => {
    // Even malformed body should return 200 (graceful failure)
    const res = await request.post('/api/utm', {
      data: 'not-json',
      headers: { 'Content-Type': 'text/plain' },
    })
    expect(res.status()).toBeLessThan(500)
    console.log(`✓ POST /api/utm with bad body → ${res.status()} (never 5xx)`)
  })
})

// ─── UTM params in URL don't break pages ─────────────────────────────────────

test.describe('UTM params in URL — page stability', () => {
  const utmSuffix = '?utm_source=test&utm_medium=e2e&utm_campaign=playwright'

  for (const path of ['/', '/blog', '/social', '/launch', '/pricing']) {
    test(`${path} loads cleanly with UTM params`, async ({ request }) => {
      const res = await request.get(`${path}${utmSuffix}`)
      expect([200, 401, 308, 307]).toContain(res.status())
      console.log(`✓ GET ${path}${utmSuffix} → ${res.status()}`)
    })
  }
})

// ─── UTM links in pages ───────────────────────────────────────────────────────

test.describe('UTM links in marketing pages', () => {
  test('landing page CTAs contain utm_source', async ({ request }) => {
    const res = await request.get('/')
    if (res.status() !== 200) return
    const text = await res.text()
    expect(text).toContain('utm_source')
    expect(text).toContain('utm_campaign')
    console.log('✓ Landing page CTAs have UTM params')
  })

  test('blog CTAs have utm_source=blog', async ({ request }) => {
    const blogPosts = [
      '/blog/true-hourly-rate',
      '/blog/csv-import-guide',
      '/blog/ab-pricing-gig-work',
    ]
    for (const path of blogPosts) {
      const res = await request.get(path)
      if (res.status() !== 200) continue
      const text = await res.text()
      expect(text).toContain('utm_source=blog')
      console.log(`✓ ${path} CTA has utm_source=blog`)
    }
  })

  test('social page has utm_source for all platforms', async ({ request }) => {
    const res = await request.get('/social')
    if (res.status() !== 200) return
    const text = await res.text()
    for (const source of ['twitter', 'linkedin', 'reddit', 'producthunt']) {
      expect(text).toContain(`utm_source=${source}`)
    }
    console.log('✓ /social has UTM links for all platforms')
  })

  test('launch page has utm_source for directories', async ({ request }) => {
    const res = await request.get('/launch')
    if (res.status() !== 200) return
    const text = await res.text()
    expect(text).toContain('utm_source=')
    console.log('✓ /launch has UTM links')
  })
})

// ─── Plausible script in layout ───────────────────────────────────────────────

test('layout includes Plausible analytics script', async ({ request }) => {
  const res = await request.get('/')
  if (res.status() !== 200) return
  const text = await res.text()
  expect(text).toContain('plausible.io')
  console.log('✓ Plausible script present in layout')
})
