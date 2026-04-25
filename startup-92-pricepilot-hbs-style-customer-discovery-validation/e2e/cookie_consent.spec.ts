import { test, expect } from '@playwright/test'

test('Cookie banner does not block login submit', async ({ page }) => {
  await page.context().clearCookies()
  await page.goto('/login')

  // Cookie banner should be visible but not blocking
  const banner = page.locator('[role="dialog"][aria-label="Cookie consent"]')
  if (await banner.isVisible()) {
    // Verify banner is at bottom (position-fixed) and form inputs are accessible
    const bannerBox = await banner.boundingBox()
    const submitBtn = page.locator('[data-testid="login-btn"]')
    const submitBox = await submitBtn.boundingBox()
    // Submit button should not be covered by the banner (banner should be below it)
    if (bannerBox && submitBox) {
      expect(submitBox.y + submitBox.height).toBeLessThan(bannerBox.y + 10)
    }
  }

  await page.fill('input[type="email"]', 'user@example.com')
  await page.fill('input[type="password"]', 'WrongPass123!')
  await page.click('button[type="submit"]')
  await expect(page.getByText(/Invalid email|password|error/i)).toBeVisible({ timeout: 5000 })
})

test('Login form has required fields', async ({ page }) => {
  await page.goto('/login')
  // Try to submit empty form
  await page.click('[data-testid="login-btn"]')
  // HTML5 validation should prevent submission; error should not be the auth error
  const emailInput = page.locator('input[type="email"]')
  const isRequired = await emailInput.getAttribute('required')
  expect(isRequired).not.toBeNull()
})
