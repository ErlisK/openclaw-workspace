/**
 * e2e/sample-reports.spec.ts
 * Tests the three public shareable sample report pages
 */
import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:3000'

const REPORTS = [
  {
    slug: 'demo',
    expectedBugs: 4,
    expectedRating: '3 / 5',
    expectedTitle: 'AcmeSaaS',
    hasBugs: true,
  },
  {
    slug: 'demo-mobile',
    expectedBugs: 3,
    expectedRating: '3 / 5',
    expectedTitle: 'TodoFlow',
    hasBugs: true,
  },
  {
    slug: 'demo-clean',
    expectedBugs: 0,
    expectedRating: '5 / 5',
    expectedTitle: 'ShipFast',
    hasBugs: false,
  },
]

for (const r of REPORTS) {
  test.describe(`/report/${r.slug}`, () => {
    test('page loads with correct title and report header', async ({ page }) => {
      await page.goto(`${BASE}/report/${r.slug}`, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('h1').first()).toContainText(r.expectedTitle)
    })

    test('shows correct star rating', async ({ page }) => {
      await page.goto(`${BASE}/report/${r.slug}`)
      await expect(page.locator(`text=${r.expectedRating}`).first()).toBeVisible()
    })

    test('bugs section correct', async ({ page }) => {
      await page.goto(`${BASE}/report/${r.slug}`)
      if (r.hasBugs) {
        await expect(page.locator('text=Bugs Found').first()).toBeVisible()
        // Bug count badge in header
        const badge = page.locator(`text=${r.expectedBugs} bug`).first()
        await expect(badge).toBeVisible()
      } else {
        await expect(page.locator('text=No bugs found').first()).toBeVisible()
      }
    })

    test('network log is present', async ({ page }) => {
      await page.goto(`${BASE}/report/${r.slug}`)
      await expect(page.locator('text=Network Log').first()).toBeVisible()
      // Table has at least one GET row
      await expect(page.locator('text=GET').first()).toBeVisible()
    })

    test('console log is present', async ({ page }) => {
      await page.goto(`${BASE}/report/${r.slug}`)
      await expect(page.locator('text=Console Log').first()).toBeVisible()
    })

    test('has demo banner with CTA', async ({ page }) => {
      await page.goto(`${BASE}/report/${r.slug}`)
      await expect(page.locator('text=This is a demo report').first()).toBeVisible()
      await expect(page.locator('a[href*="/signup"]').first()).toBeVisible()
    })

    test('shows other sample reports navigation', async ({ page }) => {
      await page.goto(`${BASE}/report/${r.slug}`)
      await expect(page.locator('text=Other sample reports').first()).toBeVisible()
    })

    test('has schema.org JSON-LD', async ({ page }) => {
      await page.goto(`${BASE}/report/${r.slug}`)
      // The layout injects a global SoftwareApplication LD+JSON;
      // our page-level script is the last one — check it contains WebPage.
      const scripts = page.locator('script[type="application/ld+json"]')
      const count = await scripts.count()
      // At least one page-level LD+JSON exists
      expect(count).toBeGreaterThanOrEqual(1)
      // Find the one with WebPage type
      let foundWebPage = false
      for (let i = 0; i < count; i++) {
        const text = await scripts.nth(i).textContent() ?? ''
        if (text.includes('WebPage')) { foundWebPage = true; break }
      }
      expect(foundWebPage).toBe(true)
    })

    test('returns 200', async ({ request }) => {
      const res = await request.get(`${BASE}/report/${r.slug}`)
      expect(res.status()).toBe(200)
    })
  })
}

test.describe('Sitemap includes demo reports', () => {
  test('sitemap.xml lists all 3 demo report URLs', async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`)
    const xml = await res.text()
    expect(xml).toContain('/report/demo')
    expect(xml).toContain('/report/demo-mobile')
    expect(xml).toContain('/report/demo-clean')
  })
})

test.describe('Report cross-navigation', () => {
  test('clicking another report scenario navigates correctly', async ({ page }) => {
    await page.goto(`${BASE}/report/demo`)
    // Click "Mobile UX" scenario card
    await page.locator('a[href="/report/demo-mobile"]').first().click()
    await expect(page).toHaveURL(/demo-mobile/)
    await expect(page.locator('h1').first()).toContainText('TodoFlow')
  })
})
