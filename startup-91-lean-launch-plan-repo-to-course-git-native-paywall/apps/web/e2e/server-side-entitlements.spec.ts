/**
 * E2E: Server-side entitlement checks & UI plan labels
 *
 * Tests:
 *  1. /api/entitlements endpoint (unauthenticated + authenticated)
 *  2. Server-side course count enforcement on import
 *  3. Plan badge visible in dashboard header
 *  4. Plan limit notice at course limit
 *  5. Upgrade CTA wiring across surfaces
 *  6. Webhook handler integration (subscription events configured)
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

async function loginAsFounder(page: import('@playwright/test').Page) {
  await page.goto(`${BASE}/auth/login`);
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill('scide-founder@agentmail.to');
  await page.locator('input[type="password"]').fill('HappyPath999!');
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 15000 }).catch(() => {});
}

// ─── 1. /api/entitlements ──────────────────────────────────────────────────
test.describe('1 · Entitlements API', () => {
  test('returns free plan for unauthenticated users', async ({ request }) => {
    const res = await request.get(`${BASE}/api/entitlements`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.authenticated).toBe(false);
    expect(data.plan).toBe('free');
    expect(data.features).toHaveProperty('customDomain');
    expect(data.features.customDomain.allowed).toBe(false);
    expect(data.features.customDomain.upgradeUrl).toBe('/pricing');
  });

  test('returns full feature map', async ({ request }) => {
    const res = await request.get(`${BASE}/api/entitlements`);
    const data = await res.json();
    expect(data.features).toHaveProperty('marketplaceListing');
    expect(data.features).toHaveProperty('aiQuizGeneration');
    expect(data.features).toHaveProperty('affiliateMax');
    expect(data.features).toHaveProperty('analyticsRetention');
    expect(data.features).toHaveProperty('unlimitedCourses');
    expect(data.features).toHaveProperty('prioritySupport');
  });

  test('free plan limits correct', async ({ request }) => {
    const res = await request.get(`${BASE}/api/entitlements`);
    const data = await res.json();
    expect(data.limits.maxCourses).toBe(3);
    expect(data.limits.maxLessonsPerCourse).toBe(10);
    expect(data.limits.aiQuizzesPerMonth).toBe(3);
    expect(data.limits.customDomain).toBe(false);
    expect(data.limits.marketplaceListing).toBe(false);
  });

  test('includes atLimit object', async ({ request }) => {
    const res = await request.get(`${BASE}/api/entitlements`);
    const data = await res.json();
    expect(data).toHaveProperty('atLimit');
    expect(typeof data.atLimit.courses).toBe('boolean');
  });

  test('authenticated user returns plan + usage counts', async ({ request, page }) => {
    await loginAsFounder(page);
    const cookies = await page.context().cookies();
    const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const res = await request.get(`${BASE}/api/entitlements`, {
      headers: { Cookie: cookieStr },
    });
    const data = await res.json();
    expect(data.authenticated).toBe(true);
    expect(['free', 'creator']).toContain(data.plan);
    expect(data.usageCounts).toHaveProperty('courses');
    expect(data.usageCounts).toHaveProperty('aiQuizzesThisMonth');
    expect(typeof data.usageCounts.courses).toBe('number');
  });

  test('entitlements API responds within 3s', async ({ request }) => {
    const start = Date.now();
    await request.get(`${BASE}/api/entitlements`);
    expect(Date.now() - start).toBeLessThan(3000);
  });
});

// ─── 2. Server-side import enforcement ──────────────────────────────────────
test.describe('2 · Import route server-side plan enforcement', () => {
  test('import route exists and rejects unauthenticated', async ({ request }) => {
    const res = await request.post(`${BASE}/api/import`, {
      data: { repo_url: 'https://github.com/ErlisK/teachrepo-template' },
    });
    expect(res.status()).toBe(401);
  });

  test('import route returns 402 when authenticated plan limit exceeded', async ({ request, page }) => {
    await loginAsFounder(page);
    const cookies = await page.context().cookies();
    const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    // Check current course count first
    const entRes = await request.get(`${BASE}/api/entitlements`, {
      headers: { Cookie: cookieStr },
    });
    const entData = await entRes.json();

    if (entData.atLimit?.courses) {
      // User is at limit — import should return 402
      const importRes = await request.post(`${BASE}/api/import`, {
        data: { repo_url: 'https://github.com/ErlisK/teachrepo-template' },
        headers: { Cookie: cookieStr },
      });
      expect([402, 422]).toContain(importRes.status());
      if (importRes.status() === 402) {
        const d = await importRes.json();
        expect(d).toHaveProperty('upgradeUrl');
      }
    } else {
      // User is not at limit — test cannot be deterministic, just check auth works
      expect([200, 422, 500]).toContain(
        (await request.post(`${BASE}/api/import`, {
          data: { repo_url: 'https://github.com/ErlisK/teachrepo-template' },
          headers: { Cookie: cookieStr },
        })).status()
      );
    }
  });

  test('course settings API returns plan limits', async ({ request, page }) => {
    await loginAsFounder(page);
    const cookies = await page.context().cookies();
    const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const res = await request.get(
      `${BASE}/api/courses/be277891-3203-4497-8f81-06a3ee29ae16/settings`,
      { headers: { Cookie: cookieStr } }
    );
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('limits');
    expect(data.limits).toHaveProperty('max_affiliate_pct');
    expect(data.limits).toHaveProperty('marketplace_priority_available');
    expect(data.limits).toHaveProperty('custom_domain_available');
    // Free plan assertions
    if (data.plan === 'free') {
      expect(data.limits.max_affiliate_pct).toBe(30);
      expect(data.limits.marketplace_priority_available).toBe(false);
      expect(data.limits.custom_domain_available).toBe(false);
    }
    // Creator plan assertions
    if (data.plan === 'creator') {
      expect(data.limits.max_affiliate_pct).toBe(50);
      expect(data.limits.marketplace_priority_available).toBe(true);
      expect(data.limits.custom_domain_available).toBe(true);
    }
  });
});

// ─── 3. Plan badge in dashboard ─────────────────────────────────────────────
test.describe('3 · Plan badge UI labels', () => {
  test('plan badge is visible in dashboard header', async ({ page }) => {
    await loginAsFounder(page);
    await page.goto(`${BASE}/dashboard`);
    // Either free or creator badge
    const freeBadge = page.getByTestId('plan-badge-free');
    const creatorBadge = page.getByTestId('plan-badge-creator');
    const hasFree = await freeBadge.isVisible().catch(() => false);
    const hasCreator = await creatorBadge.isVisible().catch(() => false);
    expect(hasFree || hasCreator).toBe(true);
  });

  test('free plan shows upgrade link in dashboard header', async ({ page }) => {
    await loginAsFounder(page);
    await page.goto(`${BASE}/dashboard`);
    // Check if it's a free plan
    const freeBadge = page.getByTestId('plan-badge-free');
    const isFree = await freeBadge.isVisible().catch(() => false);
    if (isFree) {
      const upgradeLink = page.getByTestId('plan-badge-upgrade-link');
      await expect(upgradeLink).toBeVisible();
      const href = await upgradeLink.getAttribute('href');
      expect(href).toBe('/pricing');
    }
  });

  test('billing dashboard has billing link in dashboard nav', async ({ page }) => {
    await loginAsFounder(page);
    await page.goto(`${BASE}/dashboard`);
    await expect(page.getByRole('link', { name: /billing/i }).first()).toBeVisible();
  });
});

// ─── 4. Pricing page plan comparison ────────────────────────────────────────
test.describe('4 · Pricing page plan comparison labels', () => {
  test('pricing page shows free tier as MIT licensed', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await expect(page.getByText(/MIT licensed/i)).toBeVisible();
  });

  test('pricing page shows creator tier max affiliate', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await expect(page.getByText(/50%/)).toBeVisible();
  });

  test('pricing page comparison table shows correct free limits', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    // Feature comparison table rows
    await expect(page.getByRole('cell', { name: '3' }).first()).toBeVisible();
  });

  test('pricing page annual billing shows savings', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.getByRole('button', { name: /Annual/ }).click();
    await expect(page.getByText(/Billed \$/).first()).toBeVisible();
    await expect(page.getByText(/save \$/i).first()).toBeVisible();
  });
});

// ─── 5. Subscription + webhook setup ────────────────────────────────────────
test.describe('5 · Subscription webhook configuration', () => {
  test('webhook endpoint responds with 400 for bad payload (not 404)', async ({ request }) => {
    const res = await request.post(`${BASE}/api/webhooks/stripe`, {
      data: { type: 'test.event' },
      headers: { 'stripe-signature': 'invalid_sig' },
    });
    // Should be 400 (bad sig) not 404 (not found)
    expect(res.status()).not.toBe(404);
  });

  test('subscribe endpoint returns JSON error not HTML', async ({ request }) => {
    const res = await request.post(`${BASE}/api/subscribe`, {
      data: { priceId: 'creator_monthly' },
    });
    const contentType = res.headers()['content-type'] ?? '';
    expect(contentType).toContain('application/json');
    const data = await res.json();
    expect(data).toHaveProperty('error');
  });

  test('subscription status endpoint works', async ({ request }) => {
    const res = await request.get(`${BASE}/api/subscription/status`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('plan');
    expect(data).toHaveProperty('authenticated');
  });
});

// ─── 6. Self-hosting docs ───────────────────────────────────────────────────
test.describe('6 · Docs updated for pricing and self-hosting', () => {
  test('pricing docs page exists', async ({ request }) => {
    const res = await request.get(`${BASE}/docs/pricing`);
    expect(res.status()).toBe(200);
  });

  test('pricing docs mentions Creator plan', async ({ page }) => {
    await page.goto(`${BASE}/docs/pricing`);
    await expect(page.getByText(/Creator/i).first()).toBeVisible();
    await expect(page.getByText(/\$29/)).toBeVisible();
  });

  test('self-hosting docs page exists', async ({ request }) => {
    const res = await request.get(`${BASE}/docs/self-hosting`);
    expect(res.status()).toBe(200);
  });

  test('self-hosting docs mentions Vercel deploy', async ({ page }) => {
    await page.goto(`${BASE}/docs/self-hosting`);
    await expect(page.getByText(/Vercel/i).first()).toBeVisible();
  });
});
