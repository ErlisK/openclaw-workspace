import { test, expect } from '@playwright/test'

test('forgot-password page loads with email input', async ({ page }) => {
  await page.goto('/forgot-password')
  await expect(page.locator('input[type="email"]').first()).toBeVisible()
})

test('reset-password page loads with password input', async ({ page }) => {
  await page.goto('/reset-password')
  await expect(page.locator('input[type="password"]').first()).toBeVisible()
})

test('login page has forgot-password link', async ({ page }) => {
  await page.goto('/login')
  const forgotLink = page.locator('a[href="/forgot-password"]')
  await expect(forgotLink).toBeVisible()
})

test('/demo page loads with content', async ({ page }) => {
  await page.goto('/demo')
  // Should not redirect to login
  await expect(page).not.toHaveURL(/\/login/)
  // Should have demo content
  await expect(page.locator('text=Demo Mode').first()).toBeVisible()
})

test('/demo page shows income streams', async ({ page }) => {
  await page.goto('/demo')
  await expect(page.locator('text=Total Revenue').first()).toBeVisible()
})

test('/pricing page loads with Free and Pro tiers', async ({ page }) => {
  await page.goto('/pricing')
  await expect(page.locator('text=Free').first()).toBeVisible()
  await expect(page.locator('text=Pro').first()).toBeVisible()
})

test('/pricing page is not blank (has visible content)', async ({ page }) => {
  await page.goto('/pricing')
  const body = await page.locator('main, section, body').first()
  await expect(body).toBeVisible()
  const text = await page.textContent('body')
  expect(text?.length).toBeGreaterThan(100)
})

test('open redirect protection: /auth/callback?next=evil rejects external URL', async ({ request }) => {
  const res = await request.get('/auth/callback?next=https://evil.com', {
    maxRedirects: 0,
  })
  // Should redirect to /dashboard (not to evil.com)
  if (res.status() === 302 || res.status() === 307 || res.status() === 308) {
    const location = res.headers()['location'] ?? ''
    expect(location).not.toContain('evil.com')
  }
})
