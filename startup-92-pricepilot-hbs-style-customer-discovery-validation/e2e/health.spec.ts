// PricePilot — Health & Launch Gate E2E Tests
// Run: BASE_URL=https://<deployed> npx playwright test e2e/health.spec.ts

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Launch Gate: No console errors', () => {
  test('No JavaScript console errors on homepage', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(BASE_URL + '/');
    await page.waitForTimeout(2000);
    const criticalErrors = errors.filter(
      e => !e.includes('favicon') && !e.includes('google') && !e.includes('analytics') &&
           !e.includes('Connection closed') && !e.toLowerCase().includes('websocket')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('No JavaScript console errors on signup page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(BASE_URL + '/signup');
    await page.waitForTimeout(2000);
    const criticalErrors = errors.filter(
      e => !e.includes('favicon') && !e.includes('google') && !e.includes('analytics') &&
           !e.includes('Connection closed') && !e.toLowerCase().includes('websocket')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('No JavaScript console errors on login page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(BASE_URL + '/login');
    await page.waitForTimeout(2000);
    const criticalErrors = errors.filter(
      e => !e.includes('favicon') && !e.includes('google') && !e.includes('analytics') &&
           !e.includes('Connection closed') && !e.toLowerCase().includes('websocket')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Launch Gate: Auth redirects', () => {
  test('/sign-in redirects to /login', async ({ page }) => {
    const response = await page.goto(BASE_URL + '/sign-in');
    // After redirect chain, should land on /login
    expect(page.url()).toContain('/login');
    expect(response?.status()).not.toBe(404);
  });

  test('/sign-up redirects to /signup', async ({ page }) => {
    const response = await page.goto(BASE_URL + '/sign-up');
    expect(page.url()).toContain('/signup');
    expect(response?.status()).not.toBe(404);
  });
});

test.describe('Launch Gate: Public experiment page', () => {
  test('/x/demo loads without auth and shows demo content', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.goto(BASE_URL + '/x/demo');
    await page.waitForTimeout(2000);

    // Should show demo content
    const headline = page.locator('[data-testid="exp-headline"]');
    await expect(headline).toBeVisible({ timeout: 10000 });

    // No inline script for cookie setting
    const inlineScripts = await page.evaluate(() =>
      Array.from(document.querySelectorAll('script:not([src])')).map(s => s.textContent || '')
    );
    const cookieScripts = inlineScripts.filter(s => s.includes('pp_vid') && s.includes('document.cookie'));
    expect(cookieScripts).toHaveLength(0);

    // No critical console errors
    const criticalErrors = errors.filter(
      e => !e.includes('favicon') && !e.includes('google') && !e.includes('analytics')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('/x/demo has exp-price and exp-cta testids', async ({ page }) => {
    await page.goto(BASE_URL + '/x/demo');
    await expect(page.locator('[data-testid="exp-price"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="exp-cta"]')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Launch Gate: API health', () => {
  test('GET /api/health returns 200', async ({ request }) => {
    const res = await request.get(BASE_URL + '/api/health');
    expect(res.status()).toBe(200);
  });

  test('POST /api/observations rejects missing variant', async ({ request }) => {
    const res = await request.post(BASE_URL + '/api/observations', {
      data: { experiment_id: 'fake-id' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('POST /api/observations rejects invalid variant', async ({ request }) => {
    const res = await request.post(BASE_URL + '/api/observations', {
      data: { experiment_id: 'fake-id', variant: 'C' },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe('Launch Gate: CSP headers', () => {
  test('Homepage has Content-Security-Policy header', async ({ request }) => {
    const res = await request.get(BASE_URL + '/');
    const csp = res.headers()['content-security-policy'];
    expect(csp).toBeTruthy();
    // Must allow Google OAuth
    expect(csp).toContain('accounts.google.com');
    // Must have unsafe-inline for scripts (hydration fix)
    expect(csp).toContain("'unsafe-inline'");
  });
});
