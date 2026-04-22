import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'

test.describe('Ad Landing Pages', () => {
  test('Reddit landing page loads and has correct CTA', async ({ page }) => {
    await page.goto(`${BASE}/lp/reddit`)
    await expect(page).toHaveTitle(/GigAnalytics/)
    await expect(page.locator('h1')).toContainText('true hourly rate')
    const cta = page.getByRole('link', { name: /See My True Hourly Rate/i }).first()
    await expect(cta).toBeVisible()
    const href = await cta.getAttribute('href')
    expect(href).toContain('utm_source=reddit')
    expect(href).toContain('/signup')
  })

  test('Reddit landing page income comparison table is visible', async ({ page }) => {
    await page.goto(`${BASE}/lp/reddit`)
    await expect(page.locator('text=Direct clients')).toBeVisible()
    await expect(page.locator('text=$47.00/hr')).toBeVisible()
  })

  test('Reddit landing page bottom CTA links to signup with UTM', async ({ page }) => {
    await page.goto(`${BASE}/lp/reddit`)
    const ctas = await page.getByRole('link', { name: /Get Started Free/i }).all()
    expect(ctas.length).toBeGreaterThan(0)
    const href = await ctas[0].getAttribute('href')
    expect(href).toContain('utm_source=reddit')
  })

  test('Google landing page loads and has correct CTA', async ({ page }) => {
    await page.goto(`${BASE}/lp/google`)
    await expect(page).toHaveTitle(/GigAnalytics/)
    await expect(page.locator('h1')).toContainText('Hourly Rate')
    const cta = page.getByRole('link', { name: /Calculate My Hourly Rate/i }).first()
    await expect(cta).toBeVisible()
    const href = await cta.getAttribute('href')
    expect(href).toContain('utm_source=google')
    expect(href).toContain('/signup')
  })

  test('Google landing page comparison table renders', async ({ page }) => {
    await page.goto(`${BASE}/lp/google`)
    await expect(page.locator('text=GigAnalytics vs. spreadsheets')).toBeVisible()
    await expect(page.locator('text=Auto-import payments')).toBeVisible()
  })

  test('Landing pages are not indexed (robots noindex)', async ({ page }) => {
    for (const path of ['/lp/reddit', '/lp/google']) {
      await page.goto(`${BASE}${path}`)
      const robotsMeta = await page.locator('meta[name="robots"]').getAttribute('content')
      expect(robotsMeta).toContain('noindex')
    }
  })

  test('Landing pages are mobile-responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    for (const path of ['/lp/reddit', '/lp/google']) {
      await page.goto(`${BASE}${path}`)
      await expect(page.locator('h1')).toBeVisible()
      const cta = page.getByRole('link').first()
      await expect(cta).toBeVisible()
    }
  })
})

test.describe('Reddit & Google Pixel Components', () => {
  test('Root layout renders without JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(`${BASE}/`)
    expect(errors.filter(e => !e.includes('posthog'))).toHaveLength(0)
  })
})

test.describe('Pricing mobile responsive', () => {
  test('Pricing page cards render correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`${BASE}/pricing`)
    // Cards should be visible without horizontal overflow
    const cards = page.locator('[class*="rounded-2xl"][class*="border"]')
    await expect(cards.first()).toBeVisible()
    // Check no horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5) // 5px tolerance
  })
})
