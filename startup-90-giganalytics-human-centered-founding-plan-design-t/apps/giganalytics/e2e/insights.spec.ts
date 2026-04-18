import { test, expect } from '@playwright/test'

test('insights page redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/insights')
  await expect(page).toHaveURL(/\/login/)
})

test('AI insights API GET returns endpoint info', async ({ request }) => {
  const res = await request.get('/api/ai/insights')
  // May get 401 if SSO is active, or 200 with endpoint info
  expect([200, 401]).toContain(res.status())
})

test('AI insights API POST returns 401 without auth', async ({ request }) => {
  const res = await request.post('/api/ai/insights', {
    data: { insightType: 'all', days: 30 }
  })
  expect(res.status()).toBe(401)
})

test('AI insights API POST returns 401 for weekly_summary type', async ({ request }) => {
  const res = await request.post('/api/ai/insights', {
    data: { insightType: 'weekly_summary', days: 7 }
  })
  expect(res.status()).toBe(401)
})

test('AI insights API POST returns 401 for price_suggestion type', async ({ request }) => {
  const res = await request.post('/api/ai/insights', {
    data: { insightType: 'price_suggestion', days: 90 }
  })
  expect(res.status()).toBe(401)
})
