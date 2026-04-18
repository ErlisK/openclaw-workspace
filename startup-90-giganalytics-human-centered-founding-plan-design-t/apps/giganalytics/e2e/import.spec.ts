import { test, expect } from '@playwright/test'

test('import page redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/import')
  await expect(page).toHaveURL(/\/login/)
})

test('import API returns 401 without auth', async ({ request }) => {
  const response = await request.post('/api/import', {
    data: { rows: [{ date: '2024-01-01', amount: '100', description: 'Test' }], platform: 'stripe' },
  })
  expect(response.status()).toBe(401)
})
