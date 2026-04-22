import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('ROI Calculator', () => {
  test('loads and shows calculator form', async ({ page }) => {
    await page.goto(`${BASE_URL}/calculator`)
    await expect(page.locator('h1')).toContainText('true hourly rate')
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('calculates true hourly rate', async ({ page }) => {
    await page.goto(`${BASE_URL}/calculator`)
    // Select platform
    await page.selectOption('select', 'Upwork')
    // Fill revenue
    await page.locator('input[placeholder="e.g. 3000"]').fill('3000')
    // Fill fee explicitly
    await page.locator('input[placeholder="e.g. 10"]').fill('10')
    // Fill hours
    await page.locator('input[placeholder="e.g. 40"]').fill('40')
    // Fill goal
    await page.locator('input[placeholder="e.g. 50"]').fill('50')
    // Scroll submit into view and click
    await page.locator('button[type="submit"]').scrollIntoViewIfNeeded()
    await page.locator('button[type="submit"]').click({ force: true })
    // Result should appear (allow time for React state update + animation)
    await expect(page.locator('#calc-result')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('#calc-result')).toContainText('/hr')
  })

  test('shows CTAs after calculation', async ({ page }) => {
    await page.goto(`${BASE_URL}/calculator`)
    await page.selectOption('select', 'Fiverr')
    await page.locator('input[placeholder="e.g. 3000"]').fill('2000')
    await page.locator('input[placeholder="e.g. 10"]').fill('20')
    await page.locator('input[placeholder="e.g. 40"]').fill('30')
    await page.locator('input[placeholder="e.g. 50"]').fill('60')
    await page.locator('button[type="submit"]').scrollIntoViewIfNeeded()
    await page.locator('button[type="submit"]').click({ force: true })
    await expect(page.locator('a[href*="/free-audit"]').first()).toBeVisible({ timeout: 10000 })
  })
})

test.describe('For Creators page', () => {
  test('loads and shows partnership content', async ({ page }) => {
    await page.goto(`${BASE_URL}/for-creators`)
    await expect(page.locator('h1')).toContainText('GigAnalytics')
    await expect(page.getByText('30% recurring commissions')).toBeVisible()
  })

  test('inquiry form is present', async ({ page }) => {
    await page.goto(`${BASE_URL}/for-creators`)
    await expect(page.locator('[data-testid="creator-inquiry-form"]')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })
})
