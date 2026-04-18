import { test, expect } from '@playwright/test'

test('pricing page redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/pricing')
  await expect(page).toHaveURL(/\/login/)
})

test('pricing API returns 401 without auth', async ({ request }) => {
  const res = await request.get('/api/pricing')
  expect(res.status()).toBe(401)
})

test('pricing API returns 401 with target param', async ({ request }) => {
  const res = await request.get('/api/pricing?target=5000')
  expect(res.status()).toBe(401)
})

test('pricing API returns 401 with stream filter', async ({ request }) => {
  const res = await request.get('/api/pricing?target=5000&streamId=fake-id')
  expect(res.status()).toBe(401)
})
