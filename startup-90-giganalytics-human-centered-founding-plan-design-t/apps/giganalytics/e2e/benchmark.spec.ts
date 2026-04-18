import { test, expect } from '@playwright/test'

test('benchmark page redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/benchmark')
  await expect(page).toHaveURL(/\/login/)
})

test('benchmark API GET returns 401 without auth', async ({ request }) => {
  const res = await request.get('/api/benchmark')
  expect(res.status()).toBe(401)
})

test('benchmark API POST (opt-in) returns 401 without auth', async ({ request }) => {
  const res = await request.post('/api/benchmark', {
    data: { optedIn: true, serviceCategory: 'design' }
  })
  expect(res.status()).toBe(401)
})

test('benchmark aggregate API returns 401 without auth', async ({ request }) => {
  const res = await request.post('/api/benchmark/aggregate')
  expect(res.status()).toBe(401)
})
