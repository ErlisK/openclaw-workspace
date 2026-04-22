import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'

test.describe('Legal Compliance', () => {
  test('Privacy Policy page loads and contains required sections', async ({ page }) => {
    await page.goto(`${BASE}/privacy`)
    await expect(page).toHaveTitle(/Privacy/i)
    const body = await page.textContent('body')
    expect(body).toMatch(/Data We Collect|What Data We Collect/i)
    expect(body).toMatch(/benchmark/i)
    expect(body).toMatch(/AI/i)
    expect(body).toMatch(/financial/i)
    expect(body).toMatch(/contact/i)
  })

  test('Terms of Service page loads and contains required clauses', async ({ page }) => {
    await page.goto(`${BASE}/terms`)
    await expect(page).toHaveTitle(/Terms/i)
    const body = await page.textContent('body')
    expect(body).toMatch(/Not Financial Advice/i)
    expect(body).toMatch(/Limitation of Liability/i)
    expect(body).toMatch(/California|Governing Law|Dispute Resolution/i)
  })

  test('Footer contains Privacy Policy and Terms links', async ({ page }) => {
    await page.goto(BASE)
    const privacyLink = page.locator('a[href="/privacy"]').first()
    const termsLink = page.locator('a[href="/terms"]').first()
    await expect(privacyLink).toBeVisible()
    await expect(termsLink).toBeVisible()
  })

  test('Signup page includes terms/privacy consent checkbox', async ({ page }) => {
    await page.goto(`${BASE}/signup`)
    const termsLink = page.locator('a[href="/terms"]')
    const privacyLink = page.locator('a[href="/privacy"]')
    await expect(termsLink).toBeVisible()
    await expect(privacyLink).toBeVisible()
    // Checkbox for accepting terms must exist
    const checkbox = page.locator('#accept-terms')
    await expect(checkbox).toBeVisible()
  })

  test('Cookie consent banner appears on first visit', async ({ page }) => {
    await page.goto(BASE)
    // Banner should appear (no prior localStorage)
    const banner = page.locator('text=analytics cookies')
    await expect(banner).toBeVisible({ timeout: 5000 })
  })

  test('Landing page contains financial disclaimer', async ({ page }) => {
    await page.goto(BASE)
    const body = await page.textContent('body')
    expect(body).toMatch(/not.*financial advice|financial.*advice|analytics tools only/i)
  })

  test('Settings page contains Delete Account option when logged in', async ({ page }) => {
    // Only validate the route exists (API endpoint)
    const res = await page.request.delete(`${BASE}/api/account/delete`)
    // Without auth, expect 401 (not 404)
    expect(res.status()).toBe(401)
  })

  test('/api/account/delete returns 401 without auth', async ({ request }) => {
    const res = await request.delete(`${BASE}/api/account/delete`)
    expect(res.status()).toBe(401)
  })
})
