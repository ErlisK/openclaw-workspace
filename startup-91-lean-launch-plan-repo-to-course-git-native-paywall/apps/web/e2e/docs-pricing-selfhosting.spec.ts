/**
 * E2E: Docs pages — pricing, self-hosting, GitHub Actions, docs index
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

// ─── Docs index ───────────────────────────────────────────────────────────
test.describe('Docs index', () => {
  test('loads and shows section links', async ({ page }) => {
    await page.goto(`${BASE}/docs`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /Build with TeachRepo/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Quickstart/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Pricing/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Self-Hosting/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /GitHub Actions/i }).first()).toBeVisible();
  });

  test('self-hosting callout is visible on docs index', async ({ page }) => {
    await page.goto(`${BASE}/docs`);
    await expect(page.getByText(/MIT-licensed.*free to deploy/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Self-hosting guide/i })).toBeVisible();
  });
});

// ─── Pricing docs ─────────────────────────────────────────────────────────
test.describe('Pricing docs page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/docs/pricing`);
    await page.waitForLoadState('networkidle');
  });

  test('page loads with correct title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Pricing & Billing/i }).first()).toBeVisible();
  });

  test('shows plan comparison table', async ({ page }) => {
    const content = await page.content();
    expect(content).toContain('Free');
    expect(content).toContain('Creator');
    expect(content).toContain('Enterprise');
    expect(content).toContain('$29');
  });

  test('shows "What\'s free" section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /What.s free/i })).toBeVisible();
    // Should mention MIT license
    const content = await page.content();
    expect(content).toContain('MIT');
  });

  test('shows platform fee is 0% for direct sales', async ({ page }) => {
    const content = await page.content();
    expect(content).toContain('0%');
    expect(content).toContain('direct');
  });

  test('shows 10% marketplace rev-share', async ({ page }) => {
    const content = await page.content();
    expect(content).toContain('10%');
    expect(content).toContain('marketplace');
  });

  test('shows Stripe test card info', async ({ page }) => {
    const content = await page.content();
    expect(content).toContain('4242');
  });

  test('shows annual pricing ($290/yr)', async ({ page }) => {
    const content = await page.content();
    expect(content).toContain('290');
    expect(content).toContain('annual');
  });

  test('shows cancellation details', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Cancell/i })).toBeVisible();
    const content = await page.content();
    expect(content).toContain('end of the current billing period');
  });

  test('has link to /pricing interactive page', async ({ page }) => {
    const link = page.getByRole('link', { name: /See interactive pricing/i });
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    expect(href).toContain('/pricing');
  });

  test('has link to self-hosting guide', async ({ page }) => {
    const link = page.getByRole('link', { name: /Self-hosting guide/i }).first();
    await expect(link).toBeVisible();
  });

  test('FAQ section is present', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Billing FAQ/i })).toBeVisible();
    const content = await page.content();
    expect(content).toContain('refund');
    expect(content).toContain('self-host');
  });

  test('breadcrumb shows Docs link', async ({ page }) => {
    const docsLink = page.getByRole('link', { name: /^Docs$/ });
    await expect(docsLink).toBeVisible();
  });
});

// ─── Self-hosting docs ────────────────────────────────────────────────────
test.describe('Self-hosting docs page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/docs/self-hosting`);
    await page.waitForLoadState('networkidle');
  });

  test('page loads with correct title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Self-Hosting Guide/i })).toBeVisible();
  });

  test('shows prerequisites section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Prerequisites/i })).toBeVisible();
    const content = await page.content();
    expect(content).toContain('Supabase');
    expect(content).toContain('Stripe');
    expect(content).toContain('Vercel');
  });

  test('shows step-by-step numbered setup', async ({ page }) => {
    const content = await page.content();
    // Steps 1-9 should be visible
    expect(content).toContain('Fork and clone');
    expect(content).toContain('Set up Supabase');
    expect(content).toContain('Set up Stripe');
    expect(content).toContain('Configure environment');
  });

  test('shows environment variables', async ({ page }) => {
    const content = await page.content();
    expect(content).toContain('NEXT_PUBLIC_SUPABASE_URL');
    expect(content).toContain('STRIPE_SECRET_KEY');
    expect(content).toContain('STRIPE_WEBHOOK_SECRET');
  });

  test('shows GitHub Actions deploy workflow', async ({ page }) => {
    const content = await page.content();
    expect(content).toContain('github/workflows');
    expect(content).toContain('vercel');
  });

  test('shows comparison table self-hosted vs hosted', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Self-hosted vs/i })).toBeVisible();
    const content = await page.content();
    expect(content).toContain('Managed infrastructure');
  });

  test('shows webhook endpoint instructions', async ({ page }) => {
    const content = await page.content();
    expect(content).toContain('/api/webhooks/stripe');
    expect(content).toContain('checkout.session.completed');
  });

  test('shows SUPABASE_SERVICE_ROLE_KEY warning', async ({ page }) => {
    const content = await page.content();
    expect(content).toContain('SUPABASE_SERVICE_ROLE_KEY');
    // Should warn about not exposing it
    expect(content).toContain('server-only');
  });

  test('shows Railway and Fly.io alternatives', async ({ page }) => {
    const content = await page.content();
    expect(content).toContain('Railway');
    expect(content).toContain('Fly.io');
  });

  test('shows troubleshooting section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Troubleshooting/i })).toBeVisible();
    const content = await page.content();
    expect(content).toContain('400');
  });

  test('breadcrumb links back to docs', async ({ page }) => {
    await page.getByRole('link', { name: /^Docs$/ }).click();
    await expect(page).toHaveURL(/\/docs\/?$/);
  });
});

// ─── GitHub Actions docs ──────────────────────────────────────────────────
test.describe('GitHub Actions docs page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/docs/github-actions`);
    await page.waitForLoadState('networkidle');
  });

  test('page loads with correct title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /GitHub Actions/i }).first()).toBeVisible();
  });

  test('shows complete deploy workflow YAML', async ({ page }) => {
    const content = await page.content();
    expect(content).toContain('name: CI / Deploy');
    expect(content).toContain('vercel deploy');
    expect(content).toContain('typecheck');
    expect(content).toContain('e2e');
  });

  test('shows GitHub secrets table', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /GitHub secrets/i })).toBeVisible();
    const content = await page.content();
    expect(content).toContain('VERCEL_TOKEN');
    expect(content).toContain('VERCEL_ORG_ID');
    expect(content).toContain('VERCEL_PROJECT_ID');
  });

  test('shows DB migrations step', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Database migrations/i })).toBeVisible();
    const content = await page.content();
    expect(content).toContain('supabase db push');
  });

  test('shows course auto-publish workflow', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Auto-publish courses/i })).toBeVisible();
    const content = await page.content();
    expect(content).toContain('publish-course.yml');
    expect(content).toContain('@teachrepo/cli');
  });

  test('shows Slack notification step', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Slack/i })).toBeVisible();
  });

  test('nav links to self-hosting and CLI', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Self-Hosting Guide/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /CLI Reference/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Pricing/i }).first()).toBeVisible();
  });
});

// ─── Cross-doc navigation ─────────────────────────────────────────────────
test.describe('Cross-doc navigation', () => {
  test('pricing docs → /pricing interactive page', async ({ page }) => {
    await page.goto(`${BASE}/docs/pricing`);
    const link = page.getByRole('link', { name: /See interactive pricing/i });
    await link.click();
    await expect(page).toHaveURL(/\/pricing/);
  });

  test('self-hosting docs → docs index breadcrumb', async ({ page }) => {
    await page.goto(`${BASE}/docs/self-hosting`);
    await page.getByRole('link', { name: /^Docs$/ }).click();
    await expect(page).toHaveURL(/\/docs\/?$/);
  });

  test('github-actions docs → self-hosting link', async ({ page }) => {
    await page.goto(`${BASE}/docs/github-actions`);
    await page.getByRole('link', { name: /Self-Hosting Guide/i }).click();
    await expect(page).toHaveURL(/\/docs\/self-hosting/);
  });
});
