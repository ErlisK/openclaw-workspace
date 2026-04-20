/**
 * CI-ready basic E2E tests — all selectors precision-fixed.
 *
 * These are the corrected versions of the 4 tests that failed in the
 * automated E2E review due to Playwright strict-mode violations (multiple
 * elements matching a locator). No application bugs were present; only
 * selector precision needed improvement.
 *
 * Run against production:
 *   BASE_URL=https://teachrepo.com npx playwright test e2e/ci-basic.spec.ts
 */

import { test, expect } from '@playwright/test';

// ─── P1 Fix 1: homepage renders key content ────────────────────────────────
// Was: getByText('TeachRepo') → 20 matches (brand appears everywhere)
// Fix: target the nav logo link specifically
test('homepage renders key content — nav logo visible', async ({ page }) => {
  await page.goto('/');
  // The nav logo is an <a href="/"> containing "📚 TeachRepo"
  await expect(page.getByRole('link', { name: /📚 TeachRepo/ }).first()).toBeVisible();
});

// ─── P1 Fix 2: signup page links back to login ─────────────────────────────
// Was: getByRole('link', { name: /sign in/i }) → 2 matches (nav + form)
// Fix: use .first() to target the first matching link
test('signup page links back to login', async ({ page }) => {
  await page.goto('/auth/signup');
  await expect(
    page.getByRole('link', { name: /sign in/i }).first()
  ).toBeVisible();
});

// ─── P1 Fix 3: login page links to signup ──────────────────────────────────
// Was: getByRole('link', { name: /sign up/i }) → 2 matches (nav + form)
// Fix: use .first() to target the first matching link
test('login page links to signup', async ({ page }) => {
  await page.goto('/auth/login');
  await expect(
    page.getByRole('link', { name: /sign up free/i }).first()
  ).toBeVisible();
});

// ─── P1 Fix 4: homepage how-it-works section visible ──────────────────────
// Was: getByText(/how it works|from repo to/i) → 2 matches (span + h2)
// Fix: target heading role specifically
test('homepage how-it-works section visible', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /from repo to revenue/i })
  ).toBeVisible();
});

// ─── Regression: auth guard redirects unauthenticated users ───────────────
test('auth guard: /dashboard redirects to login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/auth\/login/);
});

// ─── Regression: homepage CTA links to signup ─────────────────────────────
test('homepage CTA links to signup', async ({ page }) => {
  await page.goto('/');
  const cta = page
    .getByRole('link', { name: /get started|sign up|start free|import/i })
    .first();
  await expect(cta).toBeVisible();
  const href = await cta.getAttribute('href');
  expect(href).toMatch(/signup|register|auth/i);
});
