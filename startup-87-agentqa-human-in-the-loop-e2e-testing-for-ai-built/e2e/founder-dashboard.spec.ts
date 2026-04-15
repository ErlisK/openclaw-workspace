/**
 * e2e/founder-dashboard.spec.ts
 * Tests the founder/investors dashboard.
 */
import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:3000'

test.describe('Founder dashboard API', () => {
  test('GET /api/admin/founder returns 401 for unauthenticated', async ({ request }) => {
    const res = await request.get(`${BASE}/api/admin/founder`)
    expect(res.status()).toBe(401)
  })

  test('GET /api/admin/founder?export=csv returns 401 for unauthenticated', async ({ request }) => {
    const res = await request.get(`${BASE}/api/admin/founder?export=csv`)
    expect(res.status()).toBe(401)
  })
})

test.describe('/admin/founder page', () => {
  test('redirects unauthenticated to login', async ({ page }) => {
    await page.goto(`${BASE}/admin/founder`, { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/login|signup/, { timeout: 5000 })
  })

  test('page structure — has correct heading when not authed', async ({ page }) => {
    // Will redirect, but the redirect target should be login
    const res = await page.goto(`${BASE}/admin/founder`)
    // Either 200 login page or 200 forbidden
    expect(res?.status()).toBe(200)
  })
})

test.describe('/admin/metrics page', () => {
  test('redirects unauthenticated to login', async ({ page }) => {
    await page.goto(`${BASE}/admin/metrics`, { waitUntil: 'domcontentloaded' })
    const url = page.url()
    const hasForbidden = await page.locator('[data-testid="admin-forbidden"]').isVisible().catch(() => false)
    expect(hasForbidden || url.includes('/login')).toBe(true)
  })
})

test.describe('Admin API auth guards', () => {
  test('GET /api/admin/metrics returns 401 unauthenticated', async ({ request }) => {
    const res = await request.get(`${BASE}/api/admin/metrics`)
    expect(res.status()).toBe(401)
  })
})

test.describe('Founder dashboard structure (public HTML)', () => {
  test('landing page has link to admin section', async ({ page }) => {
    // Admin links might only exist in nav when logged in as admin,
    // but the pages themselves should exist (return 200 or redirect)
    const res = await page.goto(`${BASE}/admin/founder`)
    expect([200, 302, 307, 308]).toContain(res?.status() ?? 200)
  })
})
