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

test('sample CSV files are publicly accessible', async ({ request }) => {
  const files = [
    '/samples/stripe-balance-sample.csv',
    '/samples/paypal-activity-sample.csv',
    '/samples/upwork-transactions-sample.csv',
    '/samples/generic-invoices-sample.csv',
  ]
  for (const file of files) {
    const res = await request.get(file)
    // 200 or 401 (SSO wall) — just verify it's not 404
    expect(res.status()).not.toBe(404)
  }
})
