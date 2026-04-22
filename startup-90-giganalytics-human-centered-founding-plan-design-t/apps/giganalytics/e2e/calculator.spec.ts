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
    await page.fill('input[placeholder="e.g. 3000"]', '3000')
    // Fill hours
    await page.fill('input[placeholder="e.g. 40"]', '40')
    // Fill goal
    await page.fill('input[placeholder="e.g. 50"]', '50')
    // Submit
    await page.click('button[type="submit"]')
    // Result should appear
    await expect(page.locator('#calc-result')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('#calc-result')).toContainText('/hr')
  })

  test('shows CTAs after calculation', async ({ page }) => {
    await page.goto(`${BASE_URL}/calculator`)
    await page.selectOption('select', 'Fiverr')
    await page.fill('input[placeholder="e.g. 3000"]', '2000')
    await page.fill('input[placeholder="e.g. 40"]', '30')
    await page.fill('input[placeholder="e.g. 50"]', '60')
    await page.click('button[type="submit"]')
    await expect(page.locator('a[href*="/free-audit"]').first()).toBeVisible({ timeout: 5000 })
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
