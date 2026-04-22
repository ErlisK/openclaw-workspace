import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('Email API routes', () => {
  test('welcome route rejects missing email', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/email/welcome`, {
      data: {},
    })
    expect(res.status()).toBe(400)
  })

  test('reengagement route rejects missing email', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/email/reengagement`, {
      data: {},
    })
    expect(res.status()).toBe(400)
  })

  test('power-user route rejects missing email', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/email/power-user`, {
      data: {},
    })
    expect(res.status()).toBe(400)
  })

  test('404 page shows support email', async ({ page }) => {
    await page.goto(`${BASE_URL}/this-page-does-not-exist-xyz`)
    await expect(page.locator('text=hello@hourlyroi.com')).toBeVisible()
  })
})
