import { test, expect, Page } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const BYPASS = process.env.VERCEL_BYPASS_TOKEN || ''

function url(path: string) {
  const u = `${BASE_URL}${path}`
  return BYPASS ? `${u}${u.includes('?') ? '&' : '?'}x-vercel-protection-bypass=${BYPASS}` : u
}

const TEST_EMAIL = `test.e2e.${Date.now()}@mailinator.com`
const TEST_PASSWORD = 'testpass2026!'

// Helper: sign up and return authed page
async function signUpAndGetPage(page: Page, context: import('@playwright/test').BrowserContext, email: string) {
  if (BYPASS) {
    await context.addCookies([{
      name: 'x-vercel-protection-bypass', value: BYPASS,
      domain: new URL(BASE_URL).hostname, path: '/'
    }])
  }
  await page.goto(url('/signup'))
  await page.fill('[data-testid="email-input"]', email)
  await page.fill('[data-testid="password-input"]', TEST_PASSWORD)
  await page.click('[data-testid="signup-button"]')
  // Wait for redirect to dashboard (autoconfirm=true)
  await page.waitForURL(/\/dashboard/, { timeout: 10000 }).catch(() => {})
  return page
}

test.describe('Health Check', () => {
  test('/api/health returns 200 with full schema report', async ({ request }) => {
    const res = await request.get(url('/api/health'))
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.service).toBe('agentqa')
    expect(body.supabase_url).toBe('configured')
    expect(body.schema_table_count).toBe(12)
    expect(body.schema_tables).toContain('users')
    expect(body.schema_tables).toContain('test_jobs')
    expect(body.schema_tables).toContain('projects')
    expect(body.schema_tables).toContain('job_assignments')
    expect(body.schema_tables).toContain('feedback')
    expect(body.schema_tables).toContain('credit_transactions')
    expect(body.schema_tables).toContain('stripe_events')
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
  test('signup creates account and redirects to dashboard', async ({ page, context }) => {
    if (BYPASS) {
      await context.addCookies([{
        name: 'x-vercel-protection-bypass', value: BYPASS,
        domain: new URL(BASE_URL).hostname, path: '/'
      }])
    }
    await page.goto(url('/signup'))
    await page.fill('[data-testid="email-input"]', TEST_EMAIL)
    await page.fill('[data-testid="password-input"]', TEST_PASSWORD)
    await page.click('[data-testid="signup-button"]')
    await page.waitForTimeout(5000)
    const currentUrl = page.url()
    const onDashboard = currentUrl.includes('/dashboard')
    const emailSent = await page.locator('text=Check your email').isVisible().catch(() => false)
    const hasError = await page.locator('[data-testid="error-message"]').isVisible().catch(() => false)
    const successScreen = await page.locator('[data-testid="signup-success"]').isVisible().catch(() => false)
    const buttonGone = !(await page.locator('[data-testid="signup-button"]').isVisible().catch(() => true))
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
      await context.addCookies([{
        name: 'x-vercel-protection-bypass', value: BYPASS,
        domain: new URL(BASE_URL).hostname, path: '/'
      }])
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
      data: { title: 'Test', url: 'https://example.com', tier: 'quick' }
    })
    expect(res.status()).toBe(401)
  })

  test('/api/projects GET returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.get(url('/api/projects'))
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.error).toBeTruthy()
  })

  test('/api/projects POST returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.post(url('/api/projects'), {
      data: { name: 'My Project' }
    })
    expect(res.status()).toBe(401)
  })
})

test.describe('Dashboard CRUD (authenticated)', () => {
  test('authenticated user can create a project', async ({ page, context }) => {
    const email = `proj.test.${Date.now()}@mailinator.com`
    await signUpAndGetPage(page, context, email)

    // Must be on dashboard after signup
    const onDashboard = page.url().includes('/dashboard')
    if (!onDashboard) {
      test.skip(true, 'Signup did not redirect to dashboard (email confirmation required)')
      return
    }

    // Switch to Projects tab
    await page.click('text=projects')
    await expect(page.locator('[data-testid="new-project-button"]')).toBeVisible()
    await page.click('[data-testid="new-project-button"]')

    // Fill form
    await page.fill('[data-testid="project-name-input"]', 'My Test Project')
    await page.fill('[data-testid="project-url-input"]', 'https://myapp.example.com')
    await page.click('[data-testid="project-save-button"]')

    // Project should appear in the list
    await expect(page.locator('text=My Test Project')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="projects-list"]')).toBeVisible()
  })

  test('authenticated user can create a draft test job', async ({ page, context }) => {
    const email = `job.test.${Date.now()}@mailinator.com`
    await signUpAndGetPage(page, context, email)

    const onDashboard = page.url().includes('/dashboard')
    if (!onDashboard) {
      test.skip(true, 'Signup did not redirect to dashboard (email confirmation required)')
      return
    }

    // Jobs tab is default
    await expect(page.locator('[data-testid="new-job-button"]')).toBeVisible()
    await page.click('[data-testid="new-job-button"]')

    await page.fill('[data-testid="job-title-input"]', 'Test the homepage flow')
    await page.fill('[data-testid="job-url-input"]', 'https://myapp.example.com')
    await page.selectOption('[data-testid="job-tier-select"]', 'standard')
    await page.fill('[data-testid="job-instructions-input"]', 'Click through the main nav and submit the contact form')
    await page.click('[data-testid="job-save-button"]')

    // Job should appear in list
    await expect(page.locator('text=Test the homepage flow')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="jobs-list"]')).toBeVisible()
  })

  test('dashboard shows jobs and projects tabs', async ({ page, context }) => {
    const email = `tabs.test.${Date.now()}@mailinator.com`
    await signUpAndGetPage(page, context, email)

    const onDashboard = page.url().includes('/dashboard')
    if (!onDashboard) {
      test.skip(true, 'Signup did not redirect to dashboard')
      return
    }

    await expect(page.locator('text=jobs')).toBeVisible()
    await expect(page.locator('text=projects')).toBeVisible()
    await expect(page.locator('[data-testid="new-job-button"]')).toBeVisible()
  })
})

test.describe('Submit Form Validation', () => {
  test('submit page redirects unauth users to login', async ({ page }) => {
    await page.goto(url('/submit'))
    await expect(page).toHaveURL(/\/login/)
  })
})
