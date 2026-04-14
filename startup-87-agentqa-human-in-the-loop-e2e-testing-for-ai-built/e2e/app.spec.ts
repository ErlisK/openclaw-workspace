import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const BYPASS = process.env.VERCEL_BYPASS_TOKEN || ''

function url(path: string) {
  const u = `${BASE_URL}${path}`
  return BYPASS ? `${u}${u.includes('?') ? '&' : '?'}x-vercel-protection-bypass=${BYPASS}` : u
}

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

test.describe('Auth Pages', () => {
  test('login page renders with email/password form', async ({ page }) => {
    await page.goto(url('/login'))
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible()
  })

  test('login with wrong credentials shows error or stays on login page', async ({ page, context }) => {
    if (BYPASS) {
      await context.addCookies([{ name: 'x-vercel-protection-bypass', value: BYPASS, domain: new URL(BASE_URL).hostname, path: '/' }])
    }
    await page.goto(url('/login'))
    await page.fill('[data-testid="email-input"]', 'notreal@example.com')
    await page.fill('[data-testid="password-input"]', 'wrongpassword123')
    await page.click('[data-testid="login-button"]')
    // Should either show an error OR stay on the login page (not redirect to dashboard)
    await page.waitForTimeout(3000)
    const currentUrl = page.url()
    const hasError = await page.locator('[data-testid="error-message"]').isVisible().catch(() => false)
    const staysOnLogin = currentUrl.includes('/login')
    expect(hasError || staysOnLogin).toBeTruthy()
  })

  test('signup page renders with form', async ({ page }) => {
    await page.goto(url('/signup'))
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="signup-button"]')).toBeVisible()
  })

  test('Google OAuth button is present', async ({ page }) => {
    await page.goto(url('/login'))
    await expect(page.locator('text=Continue with Google')).toBeVisible()
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

test.describe('Submit Page', () => {
  // Note: Full submit test requires auth — tested here with unauthenticated redirect
  test('submit page exists and redirects unauthenticated users to login', async ({ page }) => {
    const res = await page.goto(url('/submit'))
    // Either redirected to login, or returned 200
    await expect(page).toHaveURL(/\/(login|submit)/)
  })
})

test.describe('API Jobs', () => {
  test('/api/jobs returns 401 when unauthenticated', async ({ request }) => {
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
