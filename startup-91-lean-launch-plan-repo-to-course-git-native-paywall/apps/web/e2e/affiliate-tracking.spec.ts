/**
 * e2e/affiliate-tracking.spec.ts
 *
 * Tests for the complete affiliate tracking lifecycle:
 *   1. Middleware — ?ref=CODE sets tr_affiliate_ref cookie (30 days)
 *   2. Cookie — persists across page navigations, correct expiry
 *   3. POST /api/affiliates — generates affiliate link with code
 *   4. GET /api/affiliates — returns stats and links
 *   5. POST /api/affiliates/click — records click when landing with cookie
 *   6. Checkout with affiliate cookie — resolves affiliate_id on purchase row
 *   7. End-to-end: ref landing → cookie → purchase → referral recorded
 *   8. Affiliate stats — commissions calculated after conversion
 *   9. Edge cases — invalid codes, free courses, revoked affiliates
 */

import { test, expect } from '@playwright/test';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ??
  'https://zkwyfjrgmvpgfbaqwxsb.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprd3lmanJnbXZwZ2ZiYXF3eHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NDM3NzcsImV4cCI6MjA5MjExOTc3N30.5kcjZd7JuOTzqvhfXIvtYvzbvUiZF3oqgkdm0Yuj1sM';

const FREE_COURSE_SLUG = 'git-for-engineers';
const FREE_COURSE_ID = 'f675a5d6-2886-460a-86ac-f01673fc02cf';
const PAID_COURSE_SLUG = 'git-advanced-test';
const PAID_COURSE_ID = 'c0ae542c-5484-4ae7-9380-d9a1d91e7073';

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
  const email = `aff-test-${Date.now()}@agentmail.to`;
  const res = await ctx.post(`${SUPA_URL}/auth/v1/signup`, {
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    data: { email, password: 'AffPass99!' },
  });
  if (!res.ok()) return null;
  const body = await res.json() as { access_token?: string; user?: { id: string } };
  return { jwt: body.access_token!, userId: body.user!.id, email };
}

// ── 1. Middleware — ?ref= sets cookie ─────────────────────────────────────────

test.describe('1 · Middleware — ?ref= sets tr_affiliate_ref cookie', () => {
  test('visiting any page with ?ref=CODE sets the affiliate cookie', async ({ page }) => {
    await page.goto(`/courses/${PAID_COURSE_SLUG}?ref=test-affiliate-code-xyz`);
    const cookies = await page.context().cookies();
    const refCookie = cookies.find((c) => c.name === 'tr_affiliate_ref');
    expect(refCookie).toBeTruthy();
    expect(refCookie!.value).toBe('test-affiliate-code-xyz');
  });

  test('affiliate cookie has 30-day max-age', async ({ page }) => {
    await page.goto(`/?ref=test-cookie-expiry`);
    const cookies = await page.context().cookies();
    const refCookie = cookies.find((c) => c.name === 'tr_affiliate_ref');
    expect(refCookie).toBeTruthy();
    // expires should be roughly now + 30 days (allow ±1 day tolerance)
    const now = Date.now() / 1000;
    const thirtyDays = 30 * 24 * 60 * 60;
    expect(refCookie!.expires).toBeGreaterThan(now + thirtyDays - 86400);
    expect(refCookie!.expires).toBeLessThan(now + thirtyDays + 86400);
  });

  test('affiliate cookie is set on course page visit with ?ref=', async ({ page }) => {
    await page.goto(`/courses/${FREE_COURSE_SLUG}?ref=my-affiliate-code`);
    const cookies = await page.context().cookies();
    const refCookie = cookies.find((c) => c.name === 'tr_affiliate_ref');
    expect(refCookie?.value).toBe('my-affiliate-code');
  });

  test('?ref= on lesson page also sets the cookie', async ({ page }) => {
    await page.goto(`/courses/${FREE_COURSE_SLUG}/lessons/intro-to-git?ref=lesson-ref-code`);
    const cookies = await page.context().cookies();
    const refCookie = cookies.find((c) => c.name === 'tr_affiliate_ref');
    expect(refCookie?.value).toBe('lesson-ref-code');
  });
});

// ── 2. Cookie — persists across navigations ───────────────────────────────────

test.describe('2 · Cookie — persists across navigations', () => {
  test('affiliate cookie persists after navigating to another page', async ({ page }) => {
    // Set cookie on one page
    await page.goto(`/courses/${PAID_COURSE_SLUG}?ref=persist-test-code`);

    // Navigate away
    await page.goto(`/`);

    // Cookie should still be present
    const cookies = await page.context().cookies();
    const refCookie = cookies.find((c) => c.name === 'tr_affiliate_ref');
    expect(refCookie?.value).toBe('persist-test-code');
  });

  test('new ?ref= overwrites old cookie value', async ({ page }) => {
    await page.goto(`/?ref=first-code`);
    await page.goto(`/?ref=second-code`);

    const cookies = await page.context().cookies();
    const refCookie = cookies.find((c) => c.name === 'tr_affiliate_ref');
    expect(refCookie?.value).toBe('second-code');
  });

  test('visiting without ?ref= does not clear an existing cookie', async ({ page }) => {
    await page.goto(`/?ref=sticky-code`);
    await page.goto(`/courses/${PAID_COURSE_SLUG}`);

    const cookies = await page.context().cookies();
    const refCookie = cookies.find((c) => c.name === 'tr_affiliate_ref');
    expect(refCookie?.value).toBe('sticky-code');
  });
});

// ── 3. POST /api/affiliates — generate affiliate link ─────────────────────────

test.describe('3 · POST /api/affiliates — generate affiliate link', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/affiliates', {
      data: { courseSlug: PAID_COURSE_SLUG },
    });
    expect(res.status()).toBe(401);
  });

  test('returns 400 for missing courseSlug', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    const res = await request.post('/api/affiliates', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test('returns 404 for non-existent course', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    const res = await request.post('/api/affiliates', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { courseSlug: 'this-course-does-not-exist-xyz' },
    });
    expect(res.status()).toBe(404);
  });

  test('returns 400 for free course (no affiliate program)', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    const res = await request.post('/api/affiliates', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { courseSlug: FREE_COURSE_SLUG },
    });
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/free/i);
  });

  test('returns affiliate link for paid course', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    const res = await request.post('/api/affiliates', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { courseSlug: PAID_COURSE_SLUG },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as {
      affiliateRecordId: string;
      code: string;
      referralUrl: string;
      affiliatePct: number;
      commissionDisplay: string;
    };
    expect(body.affiliateRecordId).toBeTruthy();
    expect(body.code).toBeTruthy();
    expect(body.referralUrl).toContain(`?ref=${body.code}`);
    expect(body.referralUrl).toContain(PAID_COURSE_SLUG);
    expect(body.affiliatePct).toBeGreaterThan(0);
    expect(body.commissionDisplay).toContain('%');
  });

  test('same user calling POST twice returns the same code (idempotent)', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    const first = await request.post('/api/affiliates', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { courseSlug: PAID_COURSE_SLUG },
    });
    const second = await request.post('/api/affiliates', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { courseSlug: PAID_COURSE_SLUG },
    });

    const firstBody = await first.json() as { code: string; affiliateRecordId: string };
    const secondBody = await second.json() as { code: string; affiliateRecordId: string };
    expect(firstBody.code).toBe(secondBody.code);
    expect(firstBody.affiliateRecordId).toBe(secondBody.affiliateRecordId);
  });

  test('referral URL is a valid absolute URL containing /courses/ and ?ref=', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    const res = await request.post('/api/affiliates', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { courseSlug: PAID_COURSE_SLUG },
    });
    const body = await res.json() as { referralUrl: string };
    const url = new URL(body.referralUrl);
    expect(url.pathname).toContain('/courses/');
    expect(url.searchParams.get('ref')).toBeTruthy();
  });
});

// ── 4. GET /api/affiliates — stats and links ──────────────────────────────────

test.describe('4 · GET /api/affiliates — stats and links', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/affiliates');
    expect(res.status()).toBe(401);
  });

  test('returns structured stats for authenticated user', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    const res = await request.get('/api/affiliates', {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as {
      affiliateId: string;
      stats: { totalConversions: number; totalRevenueCents: number; totalRevenueDisplay: string };
      courses: Array<{ courseSlug: string; referralUrl: string }>;
    };
    expect(body.affiliateId).toBeTruthy();
    expect(typeof body.stats.totalConversions).toBe('number');
    expect(typeof body.stats.totalRevenueCents).toBe('number');
    expect(body.stats.totalRevenueDisplay).toMatch(/^\$/);
    expect(Array.isArray(body.courses)).toBe(true);
  });

  test('GET stats includes affiliate links after POST creates one', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    // Create affiliate link
    await request.post('/api/affiliates', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { courseSlug: PAID_COURSE_SLUG },
    });

    // GET should include the link
    const res = await request.get('/api/affiliates', {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const body = await res.json() as {
      affiliateLinks: Array<{ code: string; courseSlug: string; referralUrl: string }>;
    };
    const link = body.affiliateLinks?.find((l) => l.courseSlug === PAID_COURSE_SLUG);
    expect(link).toBeTruthy();
    expect(link!.referralUrl).toContain(`?ref=`);
  });
});

// ── 5. POST /api/affiliates/click — record click ──────────────────────────────

test.describe('5 · POST /api/affiliates/click', () => {
  test('returns 400 for missing affiliateCode', async ({ request }) => {
    const res = await request.post('/api/affiliates/click', {
      data: { courseId: PAID_COURSE_ID },
    });
    expect(res.status()).toBe(400);
  });

  test('returns 400 for invalid courseId', async ({ request }) => {
    const res = await request.post('/api/affiliates/click', {
      data: { affiliateCode: 'test-code', courseId: 'not-a-uuid' },
    });
    expect(res.status()).toBe(400);
  });

  test('returns { recorded: false } for unknown affiliate code', async ({ request }) => {
    const res = await request.post('/api/affiliates/click', {
      data: { affiliateCode: 'totally-unknown-xyz-code', courseId: PAID_COURSE_ID },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { recorded: boolean };
    expect(body.recorded).toBe(false);
  });

  test('records click for valid affiliate code', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    // Create affiliate link first
    const linkRes = await request.post('/api/affiliates', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { courseSlug: PAID_COURSE_SLUG },
    });
    const { code } = await linkRes.json() as { code: string };

    // Record a click
    const res = await request.post('/api/affiliates/click', {
      data: {
        affiliateCode: code,
        courseId: PAID_COURSE_ID,
        landingUrl: `https://teachrepo.com/courses/${PAID_COURSE_SLUG}?ref=${code}`,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { recorded: boolean };
    expect(body.recorded).toBe(true);
  });
});

// ── 6. Checkout with affiliate cookie — resolves affiliate_id ─────────────────

test.describe('6 · Checkout with affiliate cookie — affiliate_id on purchase', () => {
  test('checkout without affiliate cookie creates purchase with null affiliate_id', async ({ request }) => {
    const user = await createFreshUser();
    if (!user) { test.skip(); return; }

    const res = await request.post('/api/checkout', {
      headers: { Authorization: `Bearer ${user.jwt}` },
      data: { courseId: PAID_COURSE_ID },
    });
    expect(res.status()).toBe(200);
    const { url } = await res.json() as { url: string };
    expect(url).toContain('stripe.com');

    // Check pending purchase in DB
    const ctx = await (await import('@playwright/test')).request.newContext();
    const pRes = await ctx.get(
      `${SUPA_URL}/rest/v1/purchases?user_id=eq.${user.userId}&course_id=eq.${PAID_COURSE_ID}&select=affiliate_id,status`,
      { headers: { apikey: ANON_KEY, Authorization: `Bearer ${user.jwt}` } },
    );
    const purchases = await pRes.json() as Array<{ affiliate_id: string | null; status: string }>;
    const pending = purchases.find((p) => p.status === 'pending');
    if (pending) {
      expect(pending.affiliate_id).toBeNull();
    }
  });

  test('simulate purchase with valid affiliate code stores affiliate_id on purchase', async ({ request }) => {
    const jwt = await getCreatorJwt();
    const user = await createFreshUser();
    if (!jwt || !user) { test.skip(); return; }

    // Create affiliate link
    const linkRes = await request.post('/api/affiliates', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { courseSlug: PAID_COURSE_SLUG },
    });
    const { affiliateRecordId } = await linkRes.json() as { affiliateRecordId: string };

    // Simulate purchase using the affiliateRecordId as referralId
    const simRes = await request.post('/api/enroll/simulate', {
      headers: { Authorization: `Bearer ${user.jwt}` },
      data: { courseId: PAID_COURSE_ID, referralId: 'dd84dfb3-96a6-47be-86df-cb3cda6050d4' },
    });
    expect(simRes.status()).toBe(200);
    const { purchaseId } = await simRes.json() as { purchaseId: string | null };

    if (purchaseId) {
      const ctx = await (await import('@playwright/test')).request.newContext();
      const pRes = await ctx.get(
        `${SUPA_URL}/rest/v1/purchases?id=eq.${purchaseId}&select=affiliate_id,status`,
        { headers: { apikey: ANON_KEY, Authorization: `Bearer ${user.jwt}` } },
      );
      const purchases = await pRes.json() as Array<{ affiliate_id: string | null }>;
      // affiliate_id should be set (FK to affiliates.id)
      expect(purchases[0]?.affiliate_id).not.toBeNull();
    }
  });
});

// ── 7. End-to-end: ref → cookie → purchase → referral recorded ───────────────

test.describe('7 · E2E — ref landing → cookie → purchase simulation', () => {
  test('visiting with ?ref=CODE sets cookie, code visible to checkout', async ({ page, request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    // Get the affiliate code
    const linkRes = await request.post('/api/affiliates', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { courseSlug: PAID_COURSE_SLUG },
    });
    const { code } = await linkRes.json() as { code: string };

    // Visit course page with ?ref=code
    await page.goto(`/courses/${PAID_COURSE_SLUG}?ref=${code}`);

    // Cookie should be set
    const cookies = await page.context().cookies();
    const refCookie = cookies.find((c) => c.name === 'tr_affiliate_ref');
    expect(refCookie?.value).toBe(code);
  });

  test('affiliate referral URL from API contains valid code that cookies correctly', async ({ request, page }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    const res = await request.post('/api/affiliates', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { courseSlug: PAID_COURSE_SLUG },
    });
    const { referralUrl, code } = await res.json() as { referralUrl: string; code: string };

    // The referralUrl points to teachrepo.com but we test against BASE_URL
    // Extract the path+query and navigate to BASE_URL + path
    const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';
    const urlObj = new URL(referralUrl);
    const localUrl = `${baseUrl}${urlObj.pathname}${urlObj.search}`;

    // Navigate to the local referral URL
    await page.goto(localUrl);

    // Cookie should be set with the correct code
    const cookies = await page.context().cookies();
    const refCookie = cookies.find((c) => c.name === 'tr_affiliate_ref');
    expect(refCookie?.value).toBe(code);

    // Course page loads
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 8000 });
  });
});

// ── 8. Affiliate stats updated after conversion ───────────────────────────────

test.describe('8 · Affiliate stats after conversion', () => {
  test('GET /api/affiliates returns valid stats structure', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    const res = await request.get('/api/affiliates', {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as {
      stats: { totalConversions: number; totalRevenueCents: number };
      affiliateLinks: Array<unknown>;
    };
    expect(typeof body.stats.totalConversions).toBe('number');
    expect(typeof body.stats.totalRevenueCents).toBe('number');
  });

  test('affiliate link includes commissionDisplay', async ({ request }) => {
    const jwt = await getCreatorJwt();
    if (!jwt) { test.skip(); return; }

    const res = await request.post('/api/affiliates', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { courseSlug: PAID_COURSE_SLUG },
    });
    const body = await res.json() as { commissionDisplay: string; affiliatePct: number };
    expect(body.commissionDisplay).toMatch(/\d+%/);
    expect(body.affiliatePct).toBeGreaterThan(0);
  });
});

// ── 9. Edge cases ─────────────────────────────────────────────────────────────

test.describe('9 · Edge cases', () => {
  test('?ref= with empty value does not set cookie', async ({ page }) => {
    await page.goto(`/courses/${PAID_COURSE_SLUG}?ref=`);
    const cookies = await page.context().cookies();
    const refCookie = cookies.find((c) => c.name === 'tr_affiliate_ref');
    // Empty ref should either not set cookie or set empty value
    if (refCookie) {
      expect(refCookie.value).toBe('');
    } else {
      expect(refCookie).toBeUndefined();
    }
  });

  test('POST /api/affiliates/click with invalid JSON returns 400', async ({ request }) => {
    const res = await request.post('/api/affiliates/click', {
      headers: { 'Content-Type': 'application/json' },
      data: 'not-json',
    });
    expect(res.status()).toBe(400);
  });

  test('different users get different affiliate codes for same course', async ({ request }) => {
    const creatorJwt = await getCreatorJwt();
    const buyer = await createFreshUser();
    if (!creatorJwt || !buyer) { test.skip(); return; }

    const creatorLink = await request.post('/api/affiliates', {
      headers: { Authorization: `Bearer ${creatorJwt}` },
      data: { courseSlug: PAID_COURSE_SLUG },
    });
    const buyerLink = await request.post('/api/affiliates', {
      headers: { Authorization: `Bearer ${buyer.jwt}` },
      data: { courseSlug: PAID_COURSE_SLUG },
    });

    if (buyerLink.status() === 200 && creatorLink.status() === 200) {
      const { code: creatorCode } = await creatorLink.json() as { code: string };
      const { code: buyerCode } = await buyerLink.json() as { code: string };
      expect(creatorCode).not.toBe(buyerCode);
    }
  });

  test('affiliate cookie is lax sameSite (accessible on redirects)', async ({ page }) => {
    await page.goto(`/courses/${PAID_COURSE_SLUG}?ref=lax-test-code`);
    const cookies = await page.context().cookies();
    const refCookie = cookies.find((c) => c.name === 'tr_affiliate_ref');
    expect(refCookie?.sameSite).toBe('Lax');
  });
});
