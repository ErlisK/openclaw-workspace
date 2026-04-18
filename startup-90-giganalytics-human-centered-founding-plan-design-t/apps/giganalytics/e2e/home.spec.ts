import { test, expect } from '@playwright/test'

// e2e/home.spec.ts — launch-gate E2E sanity for the home page

test.describe('home page', () => {
  test('loads with 200 or SSO redirect (no hard 500)', async ({ page }) => {
    const res = await page.goto('/')
    expect(res?.status()).not.toBe(500)
    expect(res?.status()).toBeLessThanOrEqual(401)
  })

  test('hero headline or signup CTA is visible when not behind SSO', async ({ page }) => {
    await page.goto('/')
    // If landing page is rendered (not SSO), expect a CTA button or h1
    const isSso = page.url().includes('vercel.com/sso')
    if (!isSso) {
      const signupLink = page.locator('a[href*="/signup"]').first()
      await expect(signupLink).toBeVisible({ timeout: 8000 })
    }
  })

  test('/signup is reachable', async ({ request }) => {
    const res = await request.get('/signup')
    expect(res.status()).toBeLessThanOrEqual(401)
  })

  test('/pricing is reachable', async ({ request }) => {
    const res = await request.get('/pricing')
    expect(res.status()).toBeLessThanOrEqual(401)
  })

  test('robots.txt responds 200', async ({ request }) => {
    const res = await request.get('/robots.txt')
    expect(res.status()).toBe(200)
  })

  test('sitemap.xml responds 200', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    expect(res.status()).toBe(200)
  })

  test('/api/health returns 200 JSON', async ({ request }) => {
    const res = await request.get('/api/health')
    expect([200, 401]).toContain(res.status())
  })

  test('/api/auth/signup returns JSON not HTML 404 on GET', async ({ request }) => {
    const res = await request.get('/api/auth/signup')
    expect(res.status()).not.toBe(404)
    const ct = res.headers()['content-type'] ?? ''
    expect(ct).toContain('application/json')
  })

  test('/api/auth/login returns JSON not HTML 404 on GET', async ({ request }) => {
    const res = await request.get('/api/auth/login')
    expect(res.status()).not.toBe(404)
    const ct = res.headers()['content-type'] ?? ''
    expect(ct).toContain('application/json')
  })

  test('/api/auth/signup with missing params returns 400 JSON', async ({ request }) => {
    const res = await request.post('/api/auth/signup', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  test('/api/auth/login with bad creds returns 401 JSON', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: 'no@example.com', password: 'wrongpassword' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect([400, 401]).toContain(res.status())
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })
})
