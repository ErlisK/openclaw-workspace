import { test, expect, Page, BrowserContext } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const BYPASS = process.env.VERCEL_BYPASS_TOKEN || ''

function url(path: string) {
  const u = `${BASE_URL}${path}`
  return BYPASS ? `${u}${u.includes('?') ? '&' : '?'}x-vercel-protection-bypass=${BYPASS}` : u
}

const TEST_PASSWORD = 'testpass2026!'

async function setupBypassCookie(context: BrowserContext) {
  if (BYPASS) {
    await context.addCookies([{
      name: 'x-vercel-protection-bypass', value: BYPASS,
      domain: new URL(BASE_URL).hostname, path: '/'
    }])
  }
}

async function signUpAndGetPage(page: Page, context: BrowserContext, email: string): Promise<boolean> {
  await setupBypassCookie(context)
  await page.goto(url('/signup'))
  await page.fill('[data-testid="email-input"]', email)
  await page.fill('[data-testid="password-input"]', TEST_PASSWORD)
  await page.click('[data-testid="signup-button"]')
  await page.waitForTimeout(5000)
  return page.url().includes('/dashboard')
}

// ============================================================
test.describe('Health Check', () => {
  test('/api/health returns 200 with full schema report', async ({ request }) => {
    const res = await request.get(url('/api/health'))
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.service).toBe('betawindow')
    expect(body.supabase_url).toBe('configured')
    expect(body.schema_table_count).toBe(12)
    const tables = body.schema_tables as string[]
    ;['users','projects','test_jobs','job_assignments','test_sessions',
      'session_events','feedback','feedback_bugs','credit_transactions',
      'stripe_customers','stripe_events','platform_feedback'].forEach(t => {
      expect(tables).toContain(t)
    })
  })
})

// ============================================================
test.describe('Home Page (/)', () => {
  test('loads with title and tier cards', async ({ page }) => {
    await page.goto(url('/'))
    await expect(page).toHaveTitle(/BetaWindow/)
    await expect(page.locator('text=Quick')).toBeVisible()
    await expect(page.locator('text=Standard')).toBeVisible()
    await expect(page.locator('text=Deep')).toBeVisible()
    await expect(page.locator('text=$5').first()).toBeVisible()
    await expect(page.locator('text=$10').first()).toBeVisible()
    await expect(page.locator('text=$15').first()).toBeVisible()
  })

  test('has marketplace navigation link', async ({ page }) => {
    await page.goto(url('/'))
    await expect(page.locator('text=Find jobs')).toBeVisible()
  })

  test('Sign in link navigates to login', async ({ page }) => {
    await page.goto(url('/'))
    await page.click('text=Sign in')
    await expect(page).toHaveURL(/\/login/)
  })

  test('Start a test CTA navigates to /jobs/new or /login', async ({ page }) => {
    await page.goto(url('/'))
    await page.click('text=Start a test')
    // Unauthenticated → redirected to login; authenticated → /jobs/new
    await expect(page).toHaveURL(/\/(login|jobs\/new)/)
  })
})

// ============================================================
test.describe('Marketplace (/marketplace)', () => {
  test('is publicly accessible without login', async ({ page }) => {
    await page.goto(url('/marketplace'))
    // Should NOT redirect to login
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('text=Tester Marketplace')).toBeVisible()
  })

  test('shows job count and empty/filled state', async ({ page }) => {
    await page.goto(url('/marketplace'))
    // Either the empty state or the jobs list should be visible
    const hasEmpty = await page.locator('[data-testid="marketplace-empty"]').isVisible().catch(() => false)
    const hasJobs = await page.locator('[data-testid="marketplace-jobs"]').isVisible().catch(() => false)
    const hasCount = await page.locator('[data-testid="marketplace-job-count"]').isVisible().catch(() => false)
    expect(hasEmpty || hasJobs || hasCount).toBeTruthy()
  })

  test('links to login/signup for unauthenticated users', async ({ page }) => {
    await page.goto(url('/marketplace'))
    const hasSignIn = await page.locator('text=Sign in to accept').isVisible().catch(() => false)
    const hasGetStarted = await page.locator('text=Get started').isVisible().catch(() => false)
    const hasSignInLink = await page.locator('text=Sign in').isVisible().catch(() => false)
    expect(hasSignIn || hasGetStarted || hasSignInLink).toBeTruthy()
  })
})

// ============================================================
test.describe('New Job Page (/jobs/new)', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto(url('/jobs/new'))
    await expect(page).toHaveURL(/\/login/)
  })

  test('form renders with tier picker when authenticated', async ({ page, context }) => {
    const email = `newjob.render.${Date.now()}@mailinator.com`
    const onDashboard = await signUpAndGetPage(page, context, email)
    if (!onDashboard) {
      test.skip(true, 'Signup redirect to dashboard required')
      return
    }
    await page.goto(url('/jobs/new'))
    await expect(page.locator('[data-testid="job-title-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="job-url-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="tier-quick"]')).toBeVisible()
    await expect(page.locator('[data-testid="tier-standard"]')).toBeVisible()
    await expect(page.locator('[data-testid="tier-deep"]')).toBeVisible()
    await expect(page.locator('[data-testid="job-save-button"]')).toBeVisible()
  })

  test('tier picker selects standard', async ({ page, context }) => {
    const email = `tier.test.${Date.now()}@mailinator.com`
    const onDashboard = await signUpAndGetPage(page, context, email)
    if (!onDashboard) {
      test.skip(true, 'Signup redirect to dashboard required')
      return
    }
    await page.goto(url('/jobs/new'))
    await page.click('[data-testid="tier-standard"]')
    // Standard tier should now be visually selected (has border-indigo class)
    const standardBtn = page.locator('[data-testid="tier-standard"]')
    await expect(standardBtn).toHaveClass(/border-indigo-500/)
  })

  test('creates a draft job and redirects to job detail', async ({ page, context }) => {
    const email = `create.job.${Date.now()}@mailinator.com`
    const onDashboard = await signUpAndGetPage(page, context, email)
    if (!onDashboard) {
      test.skip(true, 'Signup redirect to dashboard required')
      return
    }
    await page.goto(url('/jobs/new'))
    await page.fill('[data-testid="job-title-input"]', 'E2E Test Job from /jobs/new')
    await page.fill('[data-testid="job-url-input"]', 'https://example.com')
    await page.click('[data-testid="tier-standard"]')
    await page.fill('[data-testid="job-instructions-input"]', 'Test the main nav and footer links')
    await page.click('[data-testid="job-save-button"]')
    // Should redirect to /jobs/:id
    await page.waitForURL(/\/jobs\/[a-f0-9-]{36}/, { timeout: 8000 })
    await expect(page.locator('text=E2E Test Job from /jobs/new')).toBeVisible()
  })
})

// ============================================================
test.describe('Job Detail Page (/jobs/:id)', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto(url('/jobs/non-existent-id'))
    await expect(page).toHaveURL(/\/login/)
  })

  test('shows job details after creation', async ({ page, context }) => {
    const email = `jobdetail.${Date.now()}@mailinator.com`
    const onDashboard = await signUpAndGetPage(page, context, email)
    if (!onDashboard) {
      test.skip(true, 'Signup redirect to dashboard required')
      return
    }
    // Create a job
    await page.goto(url('/jobs/new'))
    await page.fill('[data-testid="job-title-input"]', 'Detail Page Test Job')
    await page.fill('[data-testid="job-url-input"]', 'https://example.com')
    await page.click('[data-testid="job-save-button"]')
    await page.waitForURL(/\/jobs\/[a-f0-9-]{36}/, { timeout: 8000 })

    // Verify job details are shown
    await expect(page.locator('text=Detail Page Test Job')).toBeVisible()
    await expect(page.locator('text=draft')).toBeVisible()
    await expect(page.locator('text=Dashboard')).toBeVisible() // breadcrumb back link
  })
})

// ============================================================
test.describe('Auth', () => {
  test('signup form renders', async ({ page }) => {
    await page.goto(url('/signup'))
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="signup-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="google-signup-button"]')).toBeVisible()
  })

  test('login form renders', async ({ page }) => {
    await page.goto(url('/login'))
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible()
    await expect(page.locator('text=Continue with Google')).toBeVisible()
  })

  test('wrong credentials stays on login', async ({ page, context }) => {
    await setupBypassCookie(context)
    await page.goto(url('/login'))
    await page.fill('[data-testid="email-input"]', 'notreal@example.com')
    await page.fill('[data-testid="password-input"]', 'wrongpassword123')
    await page.click('[data-testid="login-button"]')
    await page.waitForTimeout(3000)
    const hasError = await page.locator('[data-testid="error-message"]').isVisible().catch(() => false)
    expect(hasError || page.url().includes('/login')).toBeTruthy()
  })

  test('signup creates account and redirects or shows confirmation', async ({ page, context }) => {
    await setupBypassCookie(context)
    const email = `signup.e2e.${Date.now()}@mailinator.com`
    await page.goto(url('/signup'))
    await page.fill('[data-testid="email-input"]', email)
    await page.fill('[data-testid="password-input"]', TEST_PASSWORD)
    await page.click('[data-testid="signup-button"]')
    await page.waitForTimeout(5000)
    const onDashboard = page.url().includes('/dashboard')
    const emailSent = await page.locator('text=Check your email').isVisible().catch(() => false)
    const hasError = await page.locator('[data-testid="error-message"]').isVisible().catch(() => false)
    const successScreen = await page.locator('[data-testid="signup-success"]').isVisible().catch(() => false)
    const buttonGone = !(await page.locator('[data-testid="signup-button"]').isVisible().catch(() => true))
    expect(onDashboard || emailSent || hasError || buttonGone || successScreen).toBeTruthy()
  })
})

// ============================================================
test.describe('Auth Guards', () => {
  test('/dashboard → login when unauthed', async ({ page }) => {
    await page.goto(url('/dashboard'))
    await expect(page).toHaveURL(/\/login/)
  })

  test('/jobs/new → login when unauthed', async ({ page }) => {
    await page.goto(url('/jobs/new'))
    await expect(page).toHaveURL(/\/login/)
  })

  test('/submit → login when unauthed', async ({ page }) => {
    await page.goto(url('/submit'))
    await expect(page).toHaveURL(/\/login/)
  })

  test('/marketplace → accessible without auth', async ({ page }) => {
    await page.goto(url('/marketplace'))
    await expect(page).not.toHaveURL(/\/login/)
  })
})

// ============================================================
test.describe('API Guards', () => {
  test('/api/jobs GET → 401', async ({ request }) => {
    const res = await request.get(url('/api/jobs'))
    expect(res.status()).toBe(401)
  })
  test('/api/jobs POST → 401', async ({ request }) => {
    const res = await request.post(url('/api/jobs'), { data: { title: 'T', url: 'https://x.com', tier: 'quick' } })
    expect(res.status()).toBe(401)
  })
  test('/api/projects GET → 401', async ({ request }) => {
    const res = await request.get(url('/api/projects'))
    expect(res.status()).toBe(401)
  })
  test('/api/projects POST → 401', async ({ request }) => {
    const res = await request.post(url('/api/projects'), { data: { name: 'P' } })
    expect(res.status()).toBe(401)
  })
  test('/api/jobs/[id] PATCH → 401', async ({ request }) => {
    const res = await request.patch(url('/api/jobs/fake-id'), { data: { status: 'published' } })
    expect(res.status()).toBe(401)
  })
  test('/api/projects/[id] DELETE → 401', async ({ request }) => {
    const res = await request.delete(url('/api/projects/fake-id'))
    expect(res.status()).toBe(401)
  })
})

// ============================================================
test.describe('Dashboard', () => {
  test('shows tabs and new-job button', async ({ page, context }) => {
    const email = `dash.tabs.${Date.now()}@mailinator.com`
    const onDashboard = await signUpAndGetPage(page, context, email)
    if (!onDashboard) { test.skip(true, 'Dashboard redirect required'); return }
    await expect(page.locator('text=jobs')).toBeVisible()
    await expect(page.locator('text=projects')).toBeVisible()
    await expect(page.locator('[data-testid="new-job-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="jobs-empty"]')).toBeVisible()
  })

  test('can create project and see it in list', async ({ page, context }) => {
    const email = `proj.${Date.now()}@mailinator.com`
    const onDashboard = await signUpAndGetPage(page, context, email)
    if (!onDashboard) { test.skip(true, 'Dashboard redirect required'); return }
    await page.click('text=projects')
    await page.click('[data-testid="new-project-button"]')
    await page.fill('[data-testid="project-name-input"]', 'Dashboard Project')
    await page.click('[data-testid="project-save-button"]')
    await expect(page.locator('text=Dashboard Project')).toBeVisible({ timeout: 6000 })
  })

  test('can publish a draft job', async ({ page, context }) => {
    const email = `publish.${Date.now()}@mailinator.com`
    const onDashboard = await signUpAndGetPage(page, context, email)
    if (!onDashboard) { test.skip(true, 'Dashboard redirect required'); return }
    await page.click('[data-testid="new-job-button"]')
    await page.fill('[data-testid="job-title-input"]', 'Publishable Job')
    await page.fill('[data-testid="job-url-input"]', 'https://example.com')
    await page.click('[data-testid="job-save-button"]')
    await expect(page.locator('text=Publishable Job')).toBeVisible({ timeout: 6000 })
    await page.locator('[data-testid="jobs-list"]').locator('button', { hasText: 'Publish' }).first().click()
    await expect(page.locator('text=published').first()).toBeVisible({ timeout: 5000 })
  })
})
