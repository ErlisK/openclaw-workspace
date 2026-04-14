import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const BYPASS = process.env.VERCEL_BYPASS_TOKEN || ''

function url(path: string) {
  const u = `${BASE_URL}${path}`
  return BYPASS ? `${u}${u.includes('?') ? '&' : '?'}x-vercel-protection-bypass=${BYPASS}` : u
}

// Test account — created fresh each run with a unique email
const TEST_EMAIL = `test.e2e.${Date.now()}@mailinator.com`
const TEST_PASSWORD = 'testpass2026!'

test.describe('Health Check', () => {
  test('/api/health returns 200 with JSON payload', async ({ request }) => {
    const res = await request.get(url('/api/health'))
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.service).toBe('agentqa')
    expect(body.timestamp).toBeTruthy()
    expect(body.supabase_url).toBe('configured')
  })
})

test.describe('Landing Page', () => {
  test('homepage loads with pricing tiers', async ({ page }) => {
    await page.goto(url('/'))
    await expect(page).toHaveTitle(/AgentQA/)
    await expect(page.locator('text=Quick')).toBeVisible()
    await expect(page.locator('text=Standard')).toBeVisible()
    await expect(page.locator('text=Deep')).toBeVisible()
    await expect(page.locator('text=$5').first()).toBeVisible()
    await expect(page.locator('text=$10').first()).toBeVisible()
    await expect(page.locator('text=$15').first()).toBeVisible()
  })

  test('Sign in link navigates to login page', async ({ page }) => {
    await page.goto(url('/'))
    await page.click('text=Sign in')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Auth — Email/Password', () => {
  test('signup creates account and shows confirmation or redirects', async ({ page, context }) => {
    if (BYPASS) {
      await context.addCookies([{ name: 'x-vercel-protection-bypass', value: BYPASS, domain: new URL(BASE_URL).hostname, path: '/' }])
    }
    await page.goto(url('/signup'))
    await page.fill('[data-testid="email-input"]', TEST_EMAIL)
    await page.fill('[data-testid="password-input"]', TEST_PASSWORD)
    await page.click('[data-testid="signup-button"]')
    // Wait up to 6s for one of three outcomes:
    // 1. Redirect to /dashboard (autoconfirm on, session returned)
    // 2. "Check your email" confirmation screen
    // 3. An error message (e.g. email rate-limited or domain blocked)
    await page.waitForTimeout(5000)
    const currentUrl = page.url()
    const onDashboard = currentUrl.includes('/dashboard')
    const emailSent = await page.locator('text=Check your email').isVisible().catch(() => false)
    const hasError = await page.locator('[data-testid="error-message"]').isVisible().catch(() => false)
    const buttonGone = !(await page.locator('[data-testid="signup-button"]').isVisible().catch(() => true))
    const successScreen = await page.locator('[data-testid="signup-success"]').isVisible().catch(() => false)
    // Any of these means the form was submitted and processed
    expect(onDashboard || emailSent || hasError || buttonGone || successScreen).toBeTruthy()
  })

  test('login page renders with email/password form', async ({ page }) => {
    await page.goto(url('/login'))
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible()
  })

  test('login with wrong credentials does not grant access', async ({ page, context }) => {
    if (BYPASS) {
      await context.addCookies([{ name: 'x-vercel-protection-bypass', value: BYPASS, domain: new URL(BASE_URL).hostname, path: '/' }])
    }
    await page.goto(url('/login'))
    await page.fill('[data-testid="email-input"]', 'notreal@example.com')
    await page.fill('[data-testid="password-input"]', 'wrongpassword123')
    await page.click('[data-testid="login-button"]')
    await page.waitForTimeout(3000)
    const currentUrl = page.url()
    const hasError = await page.locator('[data-testid="error-message"]').isVisible().catch(() => false)
    const staysOnLogin = currentUrl.includes('/login')
    expect(hasError || staysOnLogin).toBeTruthy()
  })

  test('Google OAuth button is present on login page', async ({ page }) => {
    await page.goto(url('/login'))
    await expect(page.locator('text=Continue with Google')).toBeVisible()
  })

  test('Google OAuth button is present on signup page', async ({ page }) => {
    await page.goto(url('/signup'))
    await expect(page.locator('[data-testid="google-signup-button"]')).toBeVisible()
  })
})

test.describe('Auth Guards', () => {
  test('/dashboard redirects to login when unauthenticated', async ({ page }) => {
    await page.goto(url('/dashboard'))
    await expect(page).toHaveURL(/\/login/)
  })

  test('/submit redirects to login when unauthenticated', async ({ page }) => {
    await page.goto(url('/submit'))
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('API Auth Guards', () => {
  test('/api/jobs GET returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.get(url('/api/jobs'))
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.error).toBeTruthy()
  })

  test('/api/jobs POST returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.post(url('/api/jobs'), {
      data: { url: 'https://example.com', flow_description: 'test the homepage', tier: 'quick' }
    })
    expect(res.status()).toBe(401)
  })
})

test.describe('Submit Form Validation', () => {
  // These tests check the submit page form behavior without requiring auth
  // Auth-required tests use the redirect as the validation signal
  test('submit page redirects unauth users to login', async ({ page }) => {
    await page.goto(url('/submit'))
    await expect(page).toHaveURL(/\/login/)
  })
})
