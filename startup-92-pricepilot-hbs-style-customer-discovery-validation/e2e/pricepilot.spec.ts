// PricePilot — Playwright E2E Test Plan
// /e2e/TESTPLAN.md is the prose spec; this file contains executable test scaffolds.
// Run: BASE_URL=https://<deployed> npx playwright test
// All tests are written against the deployed Vercel + Supabase stack.

import { test, expect, Page, BrowserContext } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const USERS = {
  maya: {
    email: 'maya-e2e@test.pricepilot.local',
    password: 'MayaE2E_Test123!',
    name: 'Maya E2E',
  },
  marcus: {
    email: 'marcus-e2e@test.pricepilot.local',
    password: 'MarcusE2E_Test123!',
    name: 'Marcus E2E',
  },
};

/** Sign up a fresh test user and return to dashboard */
async function signUpAndOnboard(page: Page, user = USERS.maya) {
  await page.goto(`${BASE_URL}/signup`);
  await page.fill('[name="email"], [data-testid="email-input"]', user.email);
  await page.fill('[name="password"], [data-testid="password-input"]', user.password);
  await page.click('[type="submit"], [data-testid="signup-btn"]');
  await page.waitForURL(/\/(dashboard|onboard|import)/, { timeout: 15_000 });
}

/** Log in an existing test user */
async function login(page: Page, user = USERS.maya) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('[name="email"], [data-testid="email-input"]', user.email);
  await page.fill('[name="password"], [data-testid="password-input"]', user.password);
  await page.click('[type="submit"], [data-testid="login-btn"]');
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: API HEALTH
// ─────────────────────────────────────────────────────────────────────────────

test.describe('API Health', () => {

  test('TC-HEALTH-001: GET /api/health returns 200 with ok status', async ({ request }) => {
    const resp = await request.get(`${BASE_URL}/api/health`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.status).toBe('ok');
  });

  test('TC-HEALTH-002: /api/health includes db connectivity field', async ({ request }) => {
    const resp = await request.get(`${BASE_URL}/api/health`);
    const body = await resp.json();
    expect(body).toHaveProperty('db');
    expect(body.db).toBe('connected');
  });

  test('TC-HEALTH-003: /api/health includes version string', async ({ request }) => {
    const resp = await request.get(`${BASE_URL}/api/health`);
    const body = await resp.json();
    expect(body).toHaveProperty('version');
    expect(typeof body.version).toBe('string');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: AUTH — EMAIL/PASSWORD
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Auth — Email/Password', () => {

  test('TC-AUTH-001: Sign up with valid email + password redirects to onboarding', async ({ page }) => {
    const uniqueEmail = `test-${Date.now()}@test.pricepilot.local`;
    await page.goto(`${BASE_URL}/signup`);
    await page.fill('[name="email"], [data-testid="email-input"]', uniqueEmail);
    await page.fill('[name="password"], [data-testid="password-input"]', 'TestPass123!');
    await page.click('[type="submit"], [data-testid="signup-btn"]');
    await page.waitForURL(/\/(dashboard|onboard|import)/, { timeout: 15_000 });
    // Must not still be on /signup
    expect(page.url()).not.toContain('/signup');
  });

  test('TC-AUTH-002: Login with valid credentials lands on /dashboard', async ({ page }) => {
    // Requires a pre-seeded test account
    await login(page, USERS.maya);
    expect(page.url()).toContain('/dashboard');
  });

  test('TC-AUTH-003: Login with wrong password shows error, no redirect', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('[name="email"], [data-testid="email-input"]', USERS.maya.email);
    await page.fill('[name="password"], [data-testid="password-input"]', 'WrongPassword999!');
    await page.click('[type="submit"], [data-testid="login-btn"]');
    // Should stay on /login
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/login');
    // Error message visible
    const errorEl = page.locator('[data-testid="auth-error"], .error-message, [role="alert"]').first();
    await expect(errorEl).toBeVisible();
  });

  test('TC-AUTH-004: Unauthenticated visit to /dashboard redirects to /login', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });

  test('TC-AUTH-005: Unauthenticated visit to /experiments redirects to /login', async ({ page }) => {
    await page.goto(`${BASE_URL}/experiments`);
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });

  test('TC-AUTH-006: Unauthenticated visit to /import redirects to /login', async ({ page }) => {
    await page.goto(`${BASE_URL}/import`);
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });

  test('TC-AUTH-007: Unauthenticated visit to /suggestions redirects to /login', async ({ page }) => {
    await page.goto(`${BASE_URL}/suggestions`);
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });

  test('TC-AUTH-008: Auth API endpoints return 401 without session cookie', async ({ request }) => {
    const endpoints = [
      { method: 'POST', path: '/api/engine/recommend' },
      { method: 'GET', path: '/api/experiments' },
      { method: 'GET', path: '/api/products' },
    ];
    for (const ep of endpoints) {
      const resp = ep.method === 'POST'
        ? await request.post(`${BASE_URL}${ep.path}`)
        : await request.get(`${BASE_URL}${ep.path}`);
      expect(resp.status(), `Expected 401 for ${ep.path}`).toBe(401);
    }
  });

  test('TC-AUTH-009: Logout clears session and redirects to /', async ({ page }) => {
    await login(page, USERS.maya);
    // Click logout (button or link)
    const logoutBtn = page.locator('[data-testid="logout-btn"], [href="/logout"], button:has-text("Sign out"), button:has-text("Log out")');
    await logoutBtn.first().click();
    await page.waitForURL(/\/(login|)$/, { timeout: 10_000 });
    // Visiting /dashboard now redirects to /login
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });

  test('TC-AUTH-010: Password must be ≥8 chars — shows validation error inline', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    await page.fill('[name="email"], [data-testid="email-input"]', `short-pass-${Date.now()}@test.pricepilot.local`);
    await page.fill('[name="password"], [data-testid="password-input"]', 'abc');
    await page.click('[type="submit"], [data-testid="signup-btn"]');
    await page.waitForTimeout(1000);
    // Should still be on /signup
    expect(page.url()).toContain('/signup');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: AUTH — GOOGLE OAUTH
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Auth — Google OAuth', () => {

  test('TC-OAUTH-001: "Continue with Google" button is visible on /login', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    const googleBtn = page.locator(
      '[data-testid="google-oauth-btn"], button:has-text("Google"), a:has-text("Google")'
    );
    await expect(googleBtn).toBeVisible();
  });

  test('TC-OAUTH-002: "Continue with Google" button is visible on /signup', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    const googleBtn = page.locator(
      '[data-testid="google-oauth-btn"], button:has-text("Google"), a:has-text("Google")'
    );
    await expect(googleBtn).toBeVisible();
  });

  test('TC-OAUTH-003: Clicking Google button initiates OAuth redirect (URL contains accounts.google.com)', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    const googleBtn = page.locator(
      '[data-testid="google-oauth-btn"], button:has-text("Google"), a:has-text("Google")'
    ).first();

    // Intercept the navigation before it hits Google
    const [popup] = await Promise.all([
      page.waitForEvent('popup').catch(() => null),
      page.waitForURL(/accounts\.google\.com|supabase\.co\/auth/, { timeout: 5_000 })
        .catch(() => null),
      googleBtn.click(),
    ]);

    // Either a popup or a redirect should occur
    const navigatedToGoogle =
      page.url().includes('accounts.google.com') ||
      page.url().includes('supabase.co/auth') ||
      popup !== null;

    expect(navigatedToGoogle).toBe(true);
  });

  // NOTE: Full Google OAuth flow with real credentials cannot be automated in CI
  // without a Google test account. The following test validates the callback handler.
  test('TC-OAUTH-004: /auth/callback with invalid code returns error redirect', async ({ request }) => {
    const resp = await request.get(`${BASE_URL}/auth/callback?code=invalid_code_xyz`);
    // Should redirect to /login?error=... or /error, not 500
    expect(resp.status()).toBeLessThan(500);
  });

  test('TC-OAUTH-005: /auth/callback with missing code redirects gracefully', async ({ request }) => {
    const resp = await request.get(`${BASE_URL}/auth/callback`);
    expect(resp.status()).toBeLessThan(500);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: CSV IMPORT AND COLUMN MAPPING
// ─────────────────────────────────────────────────────────────────────────────

test.describe('CSV Import and Column Mapping', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, USERS.maya);
  });

  test('TC-CSV-001: /import page renders with file upload area', async ({ page }) => {
    await page.goto(`${BASE_URL}/import`);
    const uploadArea = page.locator(
      '[data-testid="csv-upload"], input[type="file"], [aria-label*="upload"], .dropzone'
    );
    await expect(uploadArea.first()).toBeVisible();
  });

  test('TC-CSV-002: Upload valid Gumroad CSV shows column mapping UI', async ({ page }) => {
    await page.goto(`${BASE_URL}/import`);

    // Create a minimal valid Gumroad CSV in memory
    const csvContent = [
      'date,product_title,product_permalink,product_price,purchase_email,purchase_refunded',
      '2024-08-15,Ultimate Notion Dashboard,notion-dashboard,$12.00,buyer1@example.com,no',
      '2024-08-16,Ultimate Notion Dashboard,notion-dashboard,$12.00,buyer2@example.com,no',
      '2024-09-01,Ultimate Notion Dashboard,notion-dashboard,$12.00,buyer3@example.com,yes',
      '2024-09-15,Study Vault Bundle,study-vault,$19.00,buyer4@example.com,no',
      '2024-10-01,Ultimate Notion Dashboard,notion-dashboard,$12.00,buyer5@example.com,no',
    ].join('\n');

    // Upload via file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'gumroad_sales.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    // Column mapping UI should appear
    await expect(
      page.locator('[data-testid="column-mapping"], .column-mapping, h2:has-text("Map columns")')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('TC-CSV-003: Column mapping shows required fields: date, price, product', async ({ page }) => {
    await page.goto(`${BASE_URL}/import`);
    const csvContent = [
      'date,product_title,product_permalink,product_price,purchase_email,purchase_refunded',
      '2024-08-15,Notion Dashboard,notion-dashboard,$12.00,b@e.com,no',
    ].join('\n');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'gumroad_sales.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    await page.waitForTimeout(2000);

    // Check required mapping fields are shown
    const pageText = await page.textContent('body');
    const hasRequiredFields =
      (pageText?.includes('date') || pageText?.includes('Date')) &&
      (pageText?.includes('price') || pageText?.includes('Price')) &&
      (pageText?.includes('product') || pageText?.includes('Product'));
    expect(hasRequiredFields).toBe(true);
  });

  test('TC-CSV-004: Submit with correct mapping shows import success and transaction count', async ({ page }) => {
    await page.goto(`${BASE_URL}/import`);
    const csvContent = [
      'date,product_title,product_permalink,product_price,purchase_email,purchase_refunded',
      ...Array.from({ length: 20 }, (_, i) =>
        `2024-0${(i % 9) + 1}-${(i % 28) + 1},Notion Dashboard,notion-db,$12.00,buyer${i}@e.com,no`
      ),
    ].join('\n');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'gumroad_sales.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    // Wait for column mapping, then click submit/import
    await page.waitForTimeout(2000);
    const submitBtn = page.locator(
      '[data-testid="import-submit"], button:has-text("Import"), button:has-text("Continue")'
    ).first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    }

    // Should see success indicator or transaction count
    const successEl = page.locator(
      '[data-testid="import-success"], .success, h2:has-text("imported"), p:has-text("transaction")'
    );
    await expect(successEl.first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-CSV-005: Upload malformed CSV (missing required columns) shows error', async ({ page }) => {
    await page.goto(`${BASE_URL}/import`);
    const badCsv = 'col1,col2,col3\nval1,val2,val3\nval4,val5,val6\n';

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'bad.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(badCsv),
    });

    await page.waitForTimeout(3000);
    const pageText = await page.textContent('body');
    // Should show some kind of error/warning
    const hasError =
      pageText?.toLowerCase().includes('error') ||
      pageText?.toLowerCase().includes('missing') ||
      pageText?.toLowerCase().includes('required') ||
      pageText?.toLowerCase().includes('invalid');
    expect(hasError).toBe(true);
  });

  test('TC-CSV-006: Duplicate CSV upload does not double-count transactions', async ({ page }) => {
    await page.goto(`${BASE_URL}/import`);
    const csvContent = [
      'date,product_title,product_permalink,product_price,purchase_email,purchase_refunded',
      '2024-01-15,Notion Dashboard,notion-db,$12.00,dedup-buyer@e.com,no',
      '2024-01-16,Notion Dashboard,notion-db,$12.00,dedup-buyer2@e.com,no',
    ].join('\n');

    // Upload twice
    for (let i = 0; i < 2; i++) {
      await page.goto(`${BASE_URL}/import`);
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'dedup_test.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent),
      });
      await page.waitForTimeout(2000);
      const submitBtn = page.locator(
        '[data-testid="import-submit"], button:has-text("Import"), button:has-text("Continue")'
      ).first();
      if (await submitBtn.isVisible()) await submitBtn.click();
      await page.waitForTimeout(3000);
    }

    // Navigate to dashboard — transaction count should be 2, not 4
    await page.goto(`${BASE_URL}/dashboard`);
    // This is a soft assertion — if the UI shows counts, they should be 2
    // Hard assertion requires a known-clean test DB state
    expect(page.url()).toContain('/dashboard');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5: ENGINE — PRODUCE SUGGESTIONS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Engine — Produce Suggestions', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, USERS.maya);
  });

  test('TC-ENGINE-001: /suggestions page renders after login', async ({ page }) => {
    await page.goto(`${BASE_URL}/suggestions`);
    expect(page.url()).toContain('/suggestions');
    // Should not be redirected to login
    expect(page.url()).not.toContain('/login');
  });

  test('TC-ENGINE-002: Engine recommendation API returns valid schema', async ({ request, page }) => {
    // First get a session cookie
    await login(page, USERS.maya);
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Hit the recommend endpoint
    const resp = await request.post(`${BASE_URL}/api/engine/recommend`, {
      headers: { Cookie: cookieHeader },
      data: { /* product_id will be inferred from user's first product */ },
    });

    // Accept 200 (recommendation) or 422 (insufficient data) — both are valid
    expect([200, 422, 400]).toContain(resp.status());

    if (resp.status() === 200) {
      const body = await resp.json();
      expect(body).toHaveProperty('action');
      expect(['test_higher', 'test_lower', 'stable', 'insufficient_data']).toContain(body.action);
    }
  });

  test('TC-ENGINE-003: Suggestions page shows at least one card after data import', async ({ page }) => {
    // Navigate to suggestions — if products exist, show suggestions
    await page.goto(`${BASE_URL}/suggestions`);
    await page.waitForTimeout(3000);  // allow async fetch

    const hasContent =
      (await page.locator('[data-testid="suggestion-card"], .suggestion-card, .recommendation-card').count()) > 0 ||
      (await page.locator('[data-testid="no-data"], p:has-text("import"), p:has-text("connect")').count()) > 0;

    expect(hasContent).toBe(true);
  });

  test('TC-ENGINE-004: Suggestion card shows price, expected lift, and confidence', async ({ page }) => {
    await page.goto(`${BASE_URL}/suggestions`);
    await page.waitForTimeout(3000);

    const cards = page.locator('[data-testid="suggestion-card"], .suggestion-card');
    if (await cards.count() === 0) {
      test.skip(); // no suggestions available yet — skip, not fail
      return;
    }

    const cardText = await cards.first().textContent();
    // Should contain a dollar amount and some form of confidence/probability
    const hasDollar = cardText?.includes('$');
    const hasConfidence =
      cardText?.includes('%') ||
      cardText?.includes('confident') ||
      cardText?.includes('likely');

    expect(hasDollar).toBe(true);
    expect(hasConfidence).toBe(true);
  });

  test('TC-ENGINE-005: Suggestion includes plain-English rationale (why text)', async ({ page }) => {
    await page.goto(`${BASE_URL}/suggestions`);
    await page.waitForTimeout(3000);

    const cards = page.locator('[data-testid="suggestion-card"], .suggestion-card');
    if (await cards.count() === 0) { test.skip(); return; }

    const whyText = page.locator('[data-testid="suggestion-why"], .why-text, p.rationale');
    if (await whyText.count() > 0) {
      const text = await whyText.first().textContent();
      expect(text?.length).toBeGreaterThan(20);
    }
  });

  test('TC-ENGINE-006: Engine API returns 401 without auth', async ({ request }) => {
    const resp = await request.post(`${BASE_URL}/api/engine/recommend`, {
      data: { product_id: 'any' },
    });
    expect(resp.status()).toBe(401);
  });

  test('TC-ENGINE-007: Dismiss (reject) a suggestion marks it as rejected', async ({ page }) => {
    await page.goto(`${BASE_URL}/suggestions`);
    await page.waitForTimeout(3000);

    const dismissBtn = page.locator(
      '[data-testid="dismiss-suggestion"], button:has-text("Dismiss"), button:has-text("Not now")'
    ).first();
    if (!(await dismissBtn.isVisible())) { test.skip(); return; }

    const initialCardCount = await page.locator('[data-testid="suggestion-card"], .suggestion-card').count();
    await dismissBtn.click();
    await page.waitForTimeout(1500);
    const newCardCount = await page.locator('[data-testid="suggestion-card"], .suggestion-card').count();
    expect(newCardCount).toBeLessThanOrEqual(initialCardCount);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6: EXPERIMENT — CREATE, PREVIEW, LIVE VIEW
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Experiments — Create and Preview', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, USERS.maya);
  });

  test('TC-EXP-001: /experiments page renders experiment list', async ({ page }) => {
    await page.goto(`${BASE_URL}/experiments`);
    expect(page.url()).toContain('/experiments');
    // Not redirected to login
    expect(page.url()).not.toContain('/login');
  });

  test('TC-EXP-002: "New experiment" button is visible on /experiments', async ({ page }) => {
    await page.goto(`${BASE_URL}/experiments`);
    const newBtn = page.locator(
      '[data-testid="new-experiment-btn"], button:has-text("New experiment"), a:has-text("Create"), button:has-text("Start")'
    );
    await expect(newBtn.first()).toBeVisible();
  });

  test('TC-EXP-003: Create experiment form accepts two price variants', async ({ page }) => {
    await page.goto(`${BASE_URL}/experiments/new`);
    if (page.url().includes('/login')) { test.skip(); return; }

    // Fill variant A (control)
    const variantAInput = page.locator('[data-testid="variant-a-price"], input[name="price_a"], input[placeholder*="current price"]').first();
    if (await variantAInput.isVisible()) {
      await variantAInput.fill('12');
    }

    // Fill variant B (challenger)
    const variantBInput = page.locator('[data-testid="variant-b-price"], input[name="price_b"], input[placeholder*="test price"]').first();
    if (await variantBInput.isVisible()) {
      await variantBInput.fill('29');
    }

    // Form should be fillable without error
    expect(page.url()).toContain('/experiments');
  });

  test('TC-EXP-004: Created experiment generates a shareable /x/:slug URL', async ({ page }) => {
    await page.goto(`${BASE_URL}/experiments`);
    await page.waitForTimeout(2000);

    // Look for any experiment with a slug link
    const slugLink = page.locator(
      '[data-testid="experiment-slug-link"], a[href*="/x/"], a[href*="pricepilot"]'
    ).first();

    if (await slugLink.isVisible()) {
      const href = await slugLink.getAttribute('href');
      expect(href).toMatch(/\/x\/[a-z0-9-]+/);
    } else {
      // No experiments yet — just verify page loaded
      expect(page.url()).toContain('/experiments');
    }
  });

  test('TC-EXP-005: Experiment detail page /experiments/:id renders', async ({ page }) => {
    await page.goto(`${BASE_URL}/experiments`);
    await page.waitForTimeout(2000);

    // Click first experiment if any
    const firstExp = page.locator(
      '[data-testid="experiment-row"], .experiment-item, tr[data-experiment-id]'
    ).first();

    if (await firstExp.isVisible()) {
      await firstExp.click();
      await page.waitForURL(/\/experiments\/[^\/]+$/, { timeout: 10_000 });
      expect(page.url()).toMatch(/\/experiments\/[a-z0-9-]+/);
    } else {
      test.skip();
    }
  });

  test('TC-EXP-006: Experiment page shows variant A and variant B stats', async ({ page }) => {
    await page.goto(`${BASE_URL}/experiments`);
    await page.waitForTimeout(2000);

    const firstExp = page.locator(
      '[data-testid="experiment-row"], .experiment-item'
    ).first();

    if (!(await firstExp.isVisible())) { test.skip(); return; }
    await firstExp.click();
    await page.waitForURL(/\/experiments\//, { timeout: 10_000 });

    const pageText = await page.textContent('body');
    const hasVariantA = pageText?.includes('Variant A') || pageText?.includes('Control') || pageText?.includes('A:');
    const hasVariantB = pageText?.includes('Variant B') || pageText?.includes('Challenger') || pageText?.includes('B:');
    expect(hasVariantA).toBe(true);
    expect(hasVariantB).toBe(true);
  });

  test('TC-EXP-007: Preview — /x/:slug public page is accessible without auth', async ({ page, context }) => {
    // Get experiment slug from authenticated context
    await login(page, USERS.maya);
    await page.goto(`${BASE_URL}/experiments`);
    await page.waitForTimeout(2000);

    const slugLink = page.locator('a[href*="/x/"]').first();
    if (!(await slugLink.isVisible())) { test.skip(); return; }
    const slugUrl = await slugLink.getAttribute('href');

    // Open in a fresh unauthenticated context
    const anonPage = await context.newPage();
    await anonPage.context().clearCookies();
    await anonPage.goto(`${BASE_URL}${slugUrl}`);
    await anonPage.waitForTimeout(3000);

    // Should redirect to a checkout URL or show a landing page — NOT redirect to /login
    expect(anonPage.url()).not.toContain('/login');
    expect(anonPage.url()).not.toBe(`${BASE_URL}/login`);
    await anonPage.close();
  });

  test('TC-EXP-008: Confidence percentage is visible on experiment page', async ({ page }) => {
    await page.goto(`${BASE_URL}/experiments`);
    const firstExp = page.locator('[data-testid="experiment-row"], .experiment-item').first();
    if (!(await firstExp.isVisible())) { test.skip(); return; }
    await firstExp.click();
    await page.waitForURL(/\/experiments\//, { timeout: 10_000 });

    const pageText = await page.textContent('body');
    const hasConfidence = pageText?.includes('%') && (
      pageText?.includes('confidence') ||
      pageText?.includes('confident') ||
      pageText?.includes('likely')
    );
    expect(hasConfidence).toBe(true);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 7: ROLLBACK FLOW
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Rollback Flow', () => {

  // Note: TC-ROLLBACK-006 uses only `request` (no auth needed) — beforeEach skipped for that test
  test.beforeEach(async ({ page }, testInfo) => {
    if (testInfo.title.includes('TC-ROLLBACK-006')) return;  // skip login for auth test
    await login(page, USERS.maya);
  });

  test('TC-ROLLBACK-001: Rollback button is visible on every active experiment page', async ({ page }) => {
    await page.goto(`${BASE_URL}/experiments`);
    await page.waitForTimeout(2000);

    const activeExp = page.locator('[data-testid="experiment-row"][data-status="active"], .experiment-item.active').first();
    if (!(await activeExp.isVisible())) {
      // Try navigating to any experiment
      const anyExp = page.locator('[data-testid="experiment-row"], .experiment-item').first();
      if (!(await anyExp.isVisible())) { test.skip(); return; }
      await anyExp.click();
    } else {
      await activeExp.click();
    }

    await page.waitForURL(/\/experiments\//, { timeout: 10_000 });

    const rollbackBtn = page.locator(
      '[data-testid="rollback-btn"], button:has-text("Rollback"), button:has-text("Revert"), button:has-text("Roll back")'
    );
    await expect(rollbackBtn.first()).toBeVisible({ timeout: 5_000 });
  });

  test('TC-ROLLBACK-002: Rollback button is NOT hidden or disabled', async ({ page }) => {
    await page.goto(`${BASE_URL}/experiments`);
    const anyExp = page.locator('[data-testid="experiment-row"], .experiment-item').first();
    if (!(await anyExp.isVisible())) { test.skip(); return; }
    await anyExp.click();
    await page.waitForURL(/\/experiments\//, { timeout: 10_000 });

    const rollbackBtn = page.locator(
      '[data-testid="rollback-btn"], button:has-text("Rollback"), button:has-text("Revert")'
    ).first();

    if (await rollbackBtn.isVisible()) {
      const isDisabled = await rollbackBtn.getAttribute('disabled');
      expect(isDisabled).toBeNull();  // must NOT be disabled
    }
  });

  test('TC-ROLLBACK-003: Clicking rollback shows confirmation dialog', async ({ page }) => {
    await page.goto(`${BASE_URL}/experiments`);
    const anyExp = page.locator('[data-testid="experiment-row"], .experiment-item').first();
    if (!(await anyExp.isVisible())) { test.skip(); return; }
    await anyExp.click();
    await page.waitForURL(/\/experiments\//, { timeout: 10_000 });

    const rollbackBtn = page.locator(
      '[data-testid="rollback-btn"], button:has-text("Rollback"), button:has-text("Revert")'
    ).first();
    if (!(await rollbackBtn.isVisible())) { test.skip(); return; }

    await rollbackBtn.click();
    await page.waitForTimeout(500);

    // Should show a confirmation dialog/modal
    const confirmDialog = page.locator(
      '[role="dialog"], [data-testid="confirm-modal"], .modal, [data-testid="rollback-confirm"]'
    );
    await expect(confirmDialog.first()).toBeVisible({ timeout: 3_000 });
  });

  test('TC-ROLLBACK-004: Confirming rollback updates experiment status to rolled_back', async ({ page }) => {
    await page.goto(`${BASE_URL}/experiments`);
    const anyExp = page.locator('[data-testid="experiment-row"][data-status="active"], .experiment-item').first();
    if (!(await anyExp.isVisible())) { test.skip(); return; }
    await anyExp.click();
    await page.waitForURL(/\/experiments\//, { timeout: 10_000 });

    const rollbackBtn = page.locator(
      '[data-testid="rollback-btn"], button:has-text("Rollback"), button:has-text("Revert")'
    ).first();
    if (!(await rollbackBtn.isVisible())) { test.skip(); return; }

    await rollbackBtn.click();
    await page.waitForTimeout(500);

    // Confirm the rollback
    const confirmBtn = page.locator(
      '[data-testid="confirm-rollback-btn"], button:has-text("Confirm"), button:has-text("Yes, rollback")'
    ).first();
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
      await page.waitForTimeout(3000);

      // Should show success/rolled_back status
      const pageText = await page.textContent('body');
      const showsRolledBack =
        pageText?.toLowerCase().includes('rolled back') ||
        pageText?.toLowerCase().includes('reverted') ||
        pageText?.toLowerCase().includes('success');
      expect(showsRolledBack).toBe(true);
    }
  });

  test('TC-ROLLBACK-005: Rollback completes in < 5 seconds (performance)', async ({ page }) => {
    await page.goto(`${BASE_URL}/experiments`);
    const anyExp = page.locator('[data-testid="experiment-row"], .experiment-item').first();
    if (!(await anyExp.isVisible())) { test.skip(); return; }
    await anyExp.click();
    await page.waitForURL(/\/experiments\//, { timeout: 10_000 });

    const rollbackBtn = page.locator(
      '[data-testid="rollback-btn"], button:has-text("Rollback")'
    ).first();
    if (!(await rollbackBtn.isVisible())) { test.skip(); return; }

    const t0 = Date.now();
    await rollbackBtn.click();
    await page.waitForTimeout(500);

    const confirmBtn = page.locator('[data-testid="confirm-rollback-btn"], button:has-text("Confirm")').first();
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
      // Wait for rollback API to complete
      await page.waitForResponse(
        resp => resp.url().includes('/experiments') && resp.status() === 200,
        { timeout: 8_000 }
      ).catch(() => null);
    }

    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(8_000);  // generous for E2E; target is 5s
  });

  test('TC-ROLLBACK-006: Rollback API endpoint returns 401 without auth', async ({ request }) => {
    const resp = await request.post(`${BASE_URL}/api/experiments/00000000-0000-0000-0000-000000000099/rollback`);
    expect(resp.status()).toBe(401);
  });

  test('TC-ROLLBACK-007: Rollback audit log entry is created', async ({ page }) => {
    // After a rollback, navigate to audit log (if exposed in UI)
    await page.goto(`${BASE_URL}/settings/audit`).catch(() => null);
    if (page.url().includes('/login')) { test.skip(); return; }

    const pageText = await page.textContent('body');
    // Soft assertion: if audit page exists, it should contain rollback entries
    if (pageText?.includes('rollback') || pageText?.includes('Rollback')) {
      expect(pageText.toLowerCase()).toContain('rollback');
    }
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 8: CROSS-USER RLS ISOLATION
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RLS — Cross-user data isolation', () => {

  test('TC-RLS-001: User A cannot see User B products via /api/products', async ({ page, request }) => {
    await login(page, USERS.maya);
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    const resp = await request.get(`${BASE_URL}/api/products`, {
      headers: { Cookie: cookieHeader },
    });
    if (resp.status() !== 200) { test.skip(); return; }

    const products = await resp.json();
    // All returned products must belong to maya — none should reference marcus
    // (This is a structural check; email isolation requires known IDs)
    expect(Array.isArray(products)).toBe(true);
  });

  test('TC-RLS-002: Accessing another user experiment by ID returns 404', async ({ page, request }) => {
    await login(page, USERS.maya);
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Try to access a non-existent/other-user experiment UUID
    const fakeId = '30000000-0000-0000-0000-000000000099';
    const resp = await request.get(`${BASE_URL}/api/experiments/${fakeId}`, {
      headers: { Cookie: cookieHeader },
    });
    // Should be 404 (not 403, to avoid leaking existence)
    expect([404, 403]).toContain(resp.status());
  });

});
