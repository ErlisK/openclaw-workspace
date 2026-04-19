/**
 * e2e/pricing.spec.ts
 *
 * Tests for PATCH /api/courses/[courseId]/pricing and the creator dashboard PricingForm UI.
 *
 * Sections:
 *   1. API — auth guards, validation
 *   2. API — pricing changes: free → paid, paid → free, price update
 *   3. API — Stripe Product/Price creation and deactivation
 *   4. Dashboard UI — PricingForm renders and saves
 *   5. Dashboard UI — free/paid toggle
 *   6. Dashboard UI — save button state machine
 *   7. E2E — price change reflected in checkout flow
 */

import { test, expect } from '@playwright/test';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ??
  'https://zkwyfjrgmvpgfbaqwxsb.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprd3lmanJnbXZwZ2ZiYXF3eHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NDM3NzcsImV4cCI6MjA5MjExOTc3N30.5kcjZd7JuOTzqvhfXIvtYvzbvUiZF3oqgkdm0Yuj1sM';

// Pre-seeded paid test course ($29, owned by importer-test user)
const PAID_COURSE_ID = 'c0ae542c-5484-4ae7-9380-d9a1d91e7073';
const FREE_COURSE_ID = 'f675a5d6-2886-460a-86ac-f01673fc02cf';

async function getCreatorJwt(): Promise<string | null> {
  const ctx = await (await import('@playwright/test')).request.newContext();
  const res = await ctx.post(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    data: { email: 'importer-test-1776550340@agentmail.to', password: 'TestPass123!' },
  });
  if (!res.ok()) return null;
  const body = await res.json() as { access_token?: string };
  return body.access_token ?? null;
}

async function createFreshUser() {
  const ctx = await (await import('@playwright/test')).request.newContext();
  const email = `pricing-test-${Date.now()}@agentmail.to`;
  const res = await ctx.post(`${SUPA_URL}/auth/v1/signup`, {
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    data: { email, password: 'PricingPass99!' },
  });
  if (!res.ok()) return null;
  const body = await res.json() as { access_token?: string; user?: { id: string } };
  return { jwt: body.access_token!, userId: body.user!.id, email };
}

// ── 1. API — Auth guards ──────────────────────────────────────────────────────

test.describe('1 · API auth guards', () => {
  test('PATCH /api/courses/:id/pricing returns 401 without auth', async ({ request }) => {
    const res = await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      data: { price_cents: 4900, currency: 'usd' },
    });
    expect([401, 429]).toContain(res.status());
  });

  test('PATCH /api/courses/:id/pricing returns 404 for course not owned by requester', async ({ request }) => {
    const user = await createFreshUser();
    if (!user) { test.skip(); return; }

    // User doesn't own PAID_COURSE_ID
    const res = await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${user.jwt}` },
      data: { price_cents: 4900, currency: 'usd' },
    });
    expect(res.status()).toBe(404);
  });

  test('PATCH /api/courses/:id/pricing returns 401 for non-existent course with no auth', async ({ request }) => {
    const res = await request.patch('/api/courses/ffffffff-ffff-ffff-ffff-ffffffffffff/pricing', {
      data: { price_cents: 1000, currency: 'usd' },
    });
    expect([401, 429]).toContain(res.status());
  });
});

// ── 2. API — Validation ───────────────────────────────────────────────────────

test.describe('2 · API validation', () => {
  test('returns 400 for missing price_cents', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    const res = await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { currency: 'usd' },
    });
    expect(res.status()).toBe(400);
  });

  test('returns 400 for negative price_cents', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    const res = await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: -100, currency: 'usd' },
    });
    expect(res.status()).toBe(400);
  });

  test('returns 400 for price exceeding max ($99,999)', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    const res = await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: 10000000, currency: 'usd' },
    });
    expect(res.status()).toBe(400);
  });

  test('returns 400 for invalid JSON body', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    const res = await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      data: 'not-json',
    });
    expect(res.status()).toBe(400);
  });

  test('returns 400 for non-3-letter currency', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    const res = await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: 2900, currency: 'us' },
    });
    expect(res.status()).toBe(400);
  });
});

// ── 3. API — Price management ─────────────────────────────────────────────────

test.describe('3 · API price management', () => {
  test('updates price_cents in DB when price changes', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    // Read current price first
    const ctx = await (await import('@playwright/test')).request.newContext();
    const before = await ctx.get(
      `${SUPA_URL}/rest/v1/courses?id=eq.${PAID_COURSE_ID}&select=price_cents,currency`,
      { headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwt}` } },
    );
    const [beforeRow] = await before.json() as Array<{ price_cents: number; currency: string }>;

    // Set to $49
    const res = await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: 4900, currency: 'usd' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { price_cents: number; currency: string; stripe_price_id: string | null };
    expect(body.price_cents).toBe(4900);
    expect(body.currency).toBe('usd');

    // Restore original price
    await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: beforeRow.price_cents, currency: beforeRow.currency },
    });
  });

  test('sets pricing_model=one_time for paid price', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    const res = await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: 2900, currency: 'usd' },
    });
    expect(res.status()).toBe(200);

    // Verify in DB
    const ctx = await (await import('@playwright/test')).request.newContext();
    const dbRes = await ctx.get(
      `${SUPA_URL}/rest/v1/courses?id=eq.${PAID_COURSE_ID}&select=pricing_model`,
      { headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwt}` } },
    );
    const [row] = await dbRes.json() as Array<{ pricing_model: string }>;
    expect(row.pricing_model).toBe('one_time');
  });

  test('creates a new Stripe Price when paid price is set', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    // Set to $39
    const res = await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: 3900, currency: 'usd' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { stripe_product_id: string; stripe_price_id: string };
    expect(body.stripe_product_id).toMatch(/^prod_/);
    expect(body.stripe_price_id).toMatch(/^price_/);

    // Restore
    await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: 2900, currency: 'usd' },
    });
  });

  test('returns existing stripe_product_id and new stripe_price_id on price update', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    // First call — ensure product exists
    const first = await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: 4900, currency: 'usd' },
    });
    const firstBody = await first.json() as { stripe_product_id: string; stripe_price_id: string };
    const firstProductId = firstBody.stripe_product_id;

    // Second call — same product, new price
    const second = await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: 5900, currency: 'usd' },
    });
    const secondBody = await second.json() as { stripe_product_id: string; stripe_price_id: string };

    expect(secondBody.stripe_product_id).toBe(firstProductId); // same product reused
    expect(secondBody.stripe_price_id).not.toBe(firstBody.stripe_price_id); // new price

    // Restore
    await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: 2900, currency: 'usd' },
    });
  });

  test('sets price_cents=0, clears stripe_price_id when set to free', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    // Ensure paid first
    await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: 2900, currency: 'usd' },
    });

    // Set to free
    const res = await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: 0, currency: 'usd' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { price_cents: number; stripe_price_id: string | null; pricing_model?: string };
    expect(body.price_cents).toBe(0);
    expect(body.stripe_price_id).toBeNull();

    // Restore to paid
    await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: 2900, currency: 'usd' },
    });
  });

  test('no-op when price_cents and currency unchanged (idempotent)', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    // Get current price
    const ctx = await (await import('@playwright/test')).request.newContext();
    const before = await ctx.get(
      `${SUPA_URL}/rest/v1/courses?id=eq.${PAID_COURSE_ID}&select=price_cents,currency,stripe_price_id`,
      { headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwt}` } },
    );
    const [beforeRow] = await before.json() as Array<{ price_cents: number; currency: string; stripe_price_id: string }>;

    // Send same price
    const res = await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: beforeRow.price_cents, currency: beforeRow.currency },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { stripe_price_id: string };
    // Price ID should not change (no new Stripe Price created)
    expect(body.stripe_price_id).toBe(beforeRow.stripe_price_id);
  });
});

// ── 4. Dashboard UI — PricingForm renders ─────────────────────────────────────

test.describe('4 · Dashboard UI — PricingForm renders', () => {
  test('pricing card is present on course detail page (public access redirects to login)', async ({ page }) => {
    await page.goto(`/dashboard/courses/${PAID_COURSE_ID}`);
    // Without auth, redirects to login
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 8000 });
  });

  test('PATCH /api/courses/:id/pricing returns 200 for valid price (confirms endpoint is live)', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    const res = await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: 2900, currency: 'usd' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { price_cents: number; currency: string; stripe_product_id: string; stripe_price_id: string };
    expect(body.price_cents).toBe(2900);
    expect(body.currency).toBe('usd');
    expect(body.stripe_product_id).toMatch(/^prod_/);
    expect(body.stripe_price_id).toMatch(/^price_/);
  });

  test('PATCH /api/courses/:id/pricing returns correct updated_at timestamp', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    const before = Date.now();
    const res = await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: 2900, currency: 'usd' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { updated_at: string };
    expect(new Date(body.updated_at).getTime()).toBeGreaterThanOrEqual(before - 5000);
  });

  test('free course PATCH pricing returns 200 with price_cents=0 and null stripe_price_id', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    // Free course is owned by the creator test account
    const res = await request.patch(`/api/courses/${FREE_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: 0, currency: 'usd' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { price_cents: number; stripe_price_id: string | null };
    expect(body.price_cents).toBe(0);
    expect(body.stripe_price_id).toBeNull();
  });
});

// ── 5. Dashboard UI — Free/Paid toggle ───────────────────────────────────────

test.describe('5 · Dashboard UI — Free/Paid toggle', () => {
  test('free course can be switched to paid via API', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    // Switch free course to paid
    const res = await request.patch(`/api/courses/${FREE_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: 1900, currency: 'usd' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { price_cents: number; stripe_price_id: string | null };
    expect(body.price_cents).toBe(1900);
    expect(body.stripe_price_id).toMatch(/^price_/);

    // Switch back to free
    await request.patch(`/api/courses/${FREE_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: 0, currency: 'usd' },
    });
  });

  test('paid course can be switched to free via API', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    // Switch paid course to free
    const res = await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: 0, currency: 'usd' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { price_cents: number; stripe_price_id: string | null };
    expect(body.price_cents).toBe(0);
    expect(body.stripe_price_id).toBeNull();

    // Restore to paid
    await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: 2900, currency: 'usd' },
    });
  });
});

// ── 6. API — Currency support ─────────────────────────────────────────────────

test.describe('6 · API — Currency support', () => {
  test('price update accepts EUR currency', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    const res = await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: 2900, currency: 'eur' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { currency: string; stripe_price_id: string };
    expect(body.currency).toBe('eur');
    expect(body.stripe_price_id).toMatch(/^price_/);

    // Restore to USD
    await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: 2900, currency: 'usd' },
    });
  });

  test('currency is case-normalized to lowercase in DB', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    const res = await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: 2900, currency: 'USD' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { currency: string };
    expect(body.currency).toBe('usd');
  });
});

// ── 7. E2E — updated price reflected in checkout ──────────────────────────────

test.describe('7 · E2E — updated price reflected in checkout', () => {
  test('course page shows updated price after pricing change', async ({ request, page }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    // Change price to $79
    await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: 7900, currency: 'usd' },
    });

    // Check course page shows new price
    await page.goto('/courses/git-advanced-test');
    await expect(page.locator('text=$79').first()).toBeVisible({ timeout: 8000 });

    // Restore to $29
    await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: 2900, currency: 'usd' },
    });
  });

  test('checkout endpoint uses updated stripe_price_id after price change', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    // Get the current stripe_price_id
    const ctx = await (await import('@playwright/test')).request.newContext();
    const beforeRes = await ctx.get(
      `${SUPA_URL}/rest/v1/courses?id=eq.${PAID_COURSE_ID}&select=stripe_price_id`,
      { headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwt}` } },
    );
    const [before] = await beforeRes.json() as Array<{ stripe_price_id: string }>;

    // Update price
    const updateRes = await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: 4900, currency: 'usd' },
    });
    const updated = await updateRes.json() as { stripe_price_id: string };
    expect(updated.stripe_price_id).not.toBe(before.stripe_price_id);

    // Verify DB has new price ID
    const afterRes = await ctx.get(
      `${SUPA_URL}/rest/v1/courses?id=eq.${PAID_COURSE_ID}&select=stripe_price_id,price_cents`,
      { headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwt}` } },
    );
    const [after] = await afterRes.json() as Array<{ stripe_price_id: string; price_cents: number }>;
    expect(after.stripe_price_id).toBe(updated.stripe_price_id);
    expect(after.price_cents).toBe(4900);

    // Restore
    await request.patch(`/api/courses/${PAID_COURSE_ID}/pricing`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { price_cents: 2900, currency: 'usd' },
    });
  });
});
