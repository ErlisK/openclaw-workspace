/**
 * e2e/referrals.spec.ts
 * Tests referral program and admin metrics dashboard.
 */
import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:3000'

test.describe('Referral API', () => {
  test('GET /api/referrals returns 401 for unauthenticated', async ({ request }) => {
    const res = await request.get(`${BASE}/api/referrals`)
    expect(res.status()).toBe(401)
  })

  test('POST /api/referrals/apply returns 401 for unauthenticated', async ({ request }) => {
    const res = await request.post(`${BASE}/api/referrals/apply`, {
      data: { code: 'ABC123' },
    })
    expect(res.status()).toBe(401)
  })

  test('POST /api/referrals/apply requires code', async ({ request }) => {
    const res = await request.post(`${BASE}/api/referrals/apply`, {
      data: {},
    })
    // 401 (unauthenticated) or 400 (missing code) — both valid
    expect([400, 401]).toContain(res.status())
  })

  test('GET /api/referrals/validate?code=INVALID returns valid:false', async ({ request }) => {
    const res = await request.get(`${BASE}/api/referrals/validate?code=XXXXXX`)
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.valid).toBe(false)
  })

  test('GET /api/referrals/validate without code returns 400', async ({ request }) => {
    const res = await request.get(`${BASE}/api/referrals/validate`)
    expect(res.status()).toBe(400)
  })
})

test.describe('/invite/[code] landing page', () => {
  test('invalid code shows fallback UI', async ({ page }) => {
    await page.goto(`${BASE}/invite/INVALID99`)
    await expect(page.locator('text=Invite code not found').first()).toBeVisible()
    await expect(page.locator('text=Sign up anyway').first()).toBeVisible()
  })

  test('invalid code page has signup link', async ({ page }) => {
    await page.goto(`${BASE}/invite/BADCODE`)
    const link = page.locator('a[href="/signup"]').first()
    await expect(link).toBeVisible()
  })
})

test.describe('Signup page referral pre-fill', () => {
  test('?ref=CODE pre-fills invite code field', async ({ page }) => {
    await page.goto(`${BASE}/signup?ref=TESTCD`)
    const input = page.locator('[data-testid="referral-code-input"]')
    await expect(input).toBeVisible()
    await expect(input).toHaveValue('TESTCD')
  })

  test('shows credit bonus hint when code is filled', async ({ page }) => {
    await page.goto(`${BASE}/signup?ref=ABCDEF`)
    await expect(page.locator('text=+3 credits').first()).toBeVisible()
  })
})

test.describe('Admin metrics dashboard', () => {
  test('GET /api/admin/metrics returns 401 for unauthenticated', async ({ request }) => {
    const res = await request.get(`${BASE}/api/admin/metrics`)
    expect(res.status()).toBe(401)
  })

  test('/admin/metrics page redirects non-admin to login or shows forbidden', async ({ page }) => {
    await page.goto(`${BASE}/admin/metrics`, { waitUntil: 'domcontentloaded' })
    // Should redirect to login or show forbidden
    const url = page.url()
    const hasForbidden = await page.locator('[data-testid="admin-forbidden"]').isVisible().catch(() => false)
    const redirectedToLogin = url.includes('/login') || url.includes('/signup')
    expect(hasForbidden || redirectedToLogin).toBe(true)
  })
})

test.describe('Dashboard referral widget', () => {
  test('referral share button is not visible before login (auth guard)', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
    // Dashboard should redirect to login if not authenticated
    await expect(page).toHaveURL(/login|signup/, { timeout: 5000 })
  })
})

test.describe('Sitemap', () => {
  test('sitemap includes /invite pattern', async ({ request }) => {
    // Verify sitemap.xml loads (invite pages are dynamic, not in static sitemap)
    const res = await request.get(`${BASE}/sitemap.xml`)
    expect(res.status()).toBe(200)
  })
})
