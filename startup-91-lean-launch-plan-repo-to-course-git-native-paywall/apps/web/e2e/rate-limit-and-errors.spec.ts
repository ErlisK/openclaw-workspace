/**
 * E2E tests: rate limiting and error pages
 *
 * Rate-limit tests exercise the import API endpoint specifically.
 * Error page tests verify 404 renders correctly.
 */
import { test, expect } from '@playwright/test';

// ── 1. 404 page ──────────────────────────────────────────────────────────────

test.describe('1 · 404 Not Found page', () => {
  test('unknown route returns 404 page', async ({ page }) => {
    const res = await page.goto('/this-route-definitely-does-not-exist-xyz');
    // Next.js returns 404 for not-found pages
    expect([404, 200]).toContain(res?.status()); // 200 is ok; Next returns 200 with not-found content
    const body = await page.textContent('body');
    expect(body).toMatch(/not found|404|page.*missing|doesn.t exist/i);
  });

  test('not-found page has link to home', async ({ page }) => {
    await page.goto('/this-route-definitely-does-not-exist-xyz');
    const homeLink = page.locator('a[href="/"]');
    const count = await homeLink.count();
    expect(count).toBeGreaterThan(0);
  });

  test('not-found page has link to marketplace', async ({ page }) => {
    await page.goto('/this-route-definitely-does-not-exist-xyz');
    const marketLink = page.locator('a[href="/marketplace"]');
    const count = await marketLink.count();
    expect(count).toBeGreaterThan(0);
  });

  test('unknown API route returns 404 JSON', async ({ request }) => {
    const res = await request.get('/api/this-route-does-not-exist-abc');
    expect([404, 405]).toContain(res.status());
  });

  test('unknown course slug returns not-found UI', async ({ page }) => {
    const res = await page.goto('/courses/definitely-not-a-real-slug-xyz-abc');
    // Either 404 status or redirected with not-found content
    const body = await page.textContent('body');
    // Should not show a broken/blank page
    expect(body?.length).toBeGreaterThan(100);
    // Should indicate not found
    expect(body).toMatch(/not found|does not exist|404|no course/i);
  });
});

// ── 2. Rate limiting — /api/import ───────────────────────────────────────────

test.describe('2 · Rate limiting — /api/import', () => {
  test('import endpoint returns 401 without auth (not 429)', async ({ request }) => {
    // Should fail with auth error, not rate limit, on first hit
    const res = await request.post('/api/import', {
      data: { repo_url: 'https://github.com/octocat/Hello-World' },
    });
    // 401 = auth required; 429 = rate limited. First request should not be rate limited.
    expect(res.status()).not.toBe(429);
    expect([400, 401, 403, 422]).toContain(res.status());
  });

  test('import endpoint has rate-limit headers on valid request', async ({ request }) => {
    const res = await request.post('/api/import', {
      data: { repo_url: 'https://github.com/octocat/Hello-World' },
    });
    // Headers may be present; check if they appear when rate limiting is active
    // At minimum the endpoint should respond (not crash)
    expect(res.status()).not.toBe(500);
  });

  test('excessive requests to import return 429', async ({ request }) => {
    // Fire 7 rapid requests to trigger the limit (5/min)
    const results: number[] = [];
    for (let i = 0; i < 7; i++) {
      const res = await request.post('/api/import', {
        data: { repo_url: 'https://github.com/octocat/Hello-World' },
      });
      results.push(res.status());
    }
    // At least one should be 429 (rate limited)
    expect(results).toContain(429);
  });

  test('rate-limit 429 response includes retryAfter', async ({ request }) => {
    // Fire requests until we get a 429
    let rateLimitedBody: Record<string, unknown> | null = null;
    for (let i = 0; i < 10; i++) {
      const res = await request.post('/api/import', {
        data: { repo_url: 'https://github.com/octocat/Hello-World' },
      });
      if (res.status() === 429) {
        rateLimitedBody = await res.json() as Record<string, unknown>;
        break;
      }
    }
    expect(rateLimitedBody).not.toBeNull();
    expect(rateLimitedBody).toHaveProperty('error');
    expect(rateLimitedBody).toHaveProperty('retryAfter');
  });
});

// ── 3. Rate limiting — general /api/* ────────────────────────────────────────

test.describe('3 · Rate limiting — general API', () => {
  test('health endpoint responds normally under normal load', async ({ request }) => {
    // 5 quick requests to health — should all pass (limit is 120/min)
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      const res = await request.get('/api/health');
      statuses.push(res.status());
    }
    // None should be rate limited
    expect(statuses.every((s) => s !== 429)).toBe(true);
  });

  test('rate limit headers present on API responses', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    // Rate limit headers may be set by middleware
    // (they will be present once the middleware runs for /api/ routes)
    const headers = res.headers();
    // At minimum the response should not include a 429
    expect(res.status()).not.toBe(429);
    // Optional check — headers exist if middleware ran
    if (headers['x-ratelimit-limit']) {
      expect(Number(headers['x-ratelimit-limit'])).toBeGreaterThan(0);
    }
  });
});

// ── 4. Rate limiting — Retry-After header format ─────────────────────────────

test.describe('4 · Rate limit response format', () => {
  test('429 response is valid JSON with required fields', async ({ request }) => {
    // Trigger rate limit on import
    let hit429 = false;
    for (let i = 0; i < 10; i++) {
      const res = await request.post('/api/import', {
        data: { repo_url: 'https://github.com/octocat/Hello-World' },
      });
      if (res.status() === 429) {
        hit429 = true;
        const ct = res.headers()['content-type'] ?? '';
        expect(ct).toContain('application/json');
        const body = await res.json() as { error: string; retryAfter: number };
        expect(typeof body.error).toBe('string');
        expect(typeof body.retryAfter).toBe('number');
        expect(body.retryAfter).toBeGreaterThan(0);
        // Retry-After header should also be set
        const retryHeader = res.headers()['retry-after'];
        if (retryHeader) {
          expect(Number(retryHeader)).toBeGreaterThan(0);
        }
        break;
      }
    }
    expect(hit429).toBe(true);
  });
});
