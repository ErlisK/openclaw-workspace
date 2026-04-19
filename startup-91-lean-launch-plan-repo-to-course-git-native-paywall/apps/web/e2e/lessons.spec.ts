import { test, expect } from '@playwright/test'

test('Free lesson renders (not 404)', async ({ page }) => {
  const res = await page.goto('/courses/git-for-engineers/lessons/intro-to-git')
  expect(res?.status()).toBe(200)
  const body = await page.locator('body').innerText()
  expect(body.toLowerCase()).toMatch(/git|lesson|introduction/)
})

test('Paid lesson shows paywall for unauthenticated users', async ({ page }) => {
  const res = await page.goto('/courses/github-actions-engineers/lessons/advanced-ci')
  expect(res?.status()).toBe(200)
  const body = await page.locator('body').innerText()
  expect(body.toLowerCase()).toMatch(/purchase|buy|unlock|paywall/)
})

test('Auth callback open redirect is blocked', async ({ page }) => {
  // Attempt to redirect to an external URL via next= param — should land on /dashboard or /auth/login (not evil.com)
  await page.goto('/auth/callback?next=%2F%2Fevil.com')
  const url = page.url()
  expect(url).not.toContain('evil.com')
})

test('Forgot password page renders', async ({ page }) => {
  const res = await page.goto('/auth/forgot-password')
  expect(res?.status()).toBe(200)
  const body = await page.locator('body').innerText()
  expect(body.toLowerCase()).toMatch(/reset|password|email/)
})

test('/docs/payments redirects to /docs/payments-affiliates', async ({ page }) => {
  const res = await page.goto('/docs/payments')
  expect([301, 308, 200]).toContain(res?.status())
  expect(page.url()).toContain('/docs/payments-affiliates')
})

test('/pricing redirects to /docs/pricing', async ({ page }) => {
  const res = await page.goto('/pricing')
  expect([301, 308, 200]).toContain(res?.status())
  expect(page.url()).toContain('/docs/pricing')
})

test('/courses redirects to /marketplace', async ({ page }) => {
  const res = await page.goto('/courses')
  expect([301, 308, 200]).toContain(res?.status())
  expect(page.url()).toContain('/marketplace')
})

test('Homepage has Sign in and Get started in nav', async ({ page }) => {
  await page.goto('/')
  const body = await page.locator('body').innerText()
  expect(body.toLowerCase()).toContain('sign in')
  expect(body.toLowerCase()).toContain('get started')
})

test('Footer has Terms and Privacy links', async ({ page }) => {
  await page.goto('/')
  const footer = page.locator('footer')
  await expect(footer.locator('a[href="/legal/terms"]')).toBeVisible()
  await expect(footer.locator('a[href="/legal/privacy"]')).toBeVisible()
})
