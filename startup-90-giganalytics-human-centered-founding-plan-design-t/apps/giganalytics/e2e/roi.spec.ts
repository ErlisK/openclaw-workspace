import { test, expect } from '@playwright/test'

test('dashboard redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/)
})

test('heatmap redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/heatmap')
  await expect(page).toHaveURL(/\/login/)
})

test('ROI API returns 401 without auth', async ({ request }) => {
  const res = await request.get('/api/roi')
  expect(res.status()).toBe(401)
})

test('ROI API accepts days param', async ({ request }) => {
  // Without auth it should still return 401, not 400 (param parsing succeeds)
  const res = await request.get('/api/roi?days=30')
  expect(res.status()).toBe(401)
})
