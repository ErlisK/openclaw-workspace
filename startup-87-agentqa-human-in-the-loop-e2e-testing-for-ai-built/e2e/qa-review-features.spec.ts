import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'

test.describe('QA Review Feedback Features', () => {
  test('health check includes all required fields', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/health`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.db).toBe('connected')
    expect(typeof body.db_latency_ms).toBe('number')
    expect(body.stripe).toBe('configured')
    expect(body.timestamp).toBeTruthy()
    expect(body.environment).toBeTruthy()
  })

  test('marketplace page loads with filter UI', async ({ page }) => {
    await page.goto(`${BASE_URL}/marketplace`)
    await expect(page).toHaveTitle(/BetaWindow|Marketplace/)
    // Tier filter should be present
    await expect(page.locator('select').first()).toBeVisible()
    // Desktop notice
    await expect(page.getByText('desktop Chrome')).toBeVisible()
  })

  test('marketplace tier filter works', async ({ page }) => {
    await page.goto(`${BASE_URL}/marketplace?tier=quick`)
    await expect(page).toHaveURL(/tier=quick/)
    // Page should load without errors
    await expect(page.locator('main')).toBeVisible()
  })

  test('tester onboarding page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding/tester`)
    // Should redirect to login since not authenticated
    await expect(page).toHaveURL(/login|onboarding/)
  })

  test('stripe connect onboard API requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/stripe-connect/onboard`)
    expect(res.status()).toBe(401)
  })

  test('stripe connect status API requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/stripe-connect/status`)
    expect(res.status()).toBe(401)
  })

  test('job dispute API requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/jobs/fake-id/dispute`, {
      data: { reason: 'test' }
    })
    expect(res.status()).toBe(401)
  })

  test('job rate API requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/jobs/fake-id/rate`, {
      data: { rating: 5 }
    })
    expect(res.status()).toBe(401)
  })

  test('cron expire-jobs API requires CRON_SECRET', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/cron/expire-jobs`)
    expect(res.status()).toBe(401)
  })
})
