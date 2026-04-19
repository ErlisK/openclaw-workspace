import { test, expect } from '@playwright/test';

/**
 * E2E tests for /api/health
 *
 * These tests run against the deployed BASE_URL.
 * Set BASE_URL env var before running:
 *   BASE_URL=https://teachrepo.com npx playwright test
 */

test.describe('GET /api/health', () => {
  test('returns 200 with healthy status', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.status()).toBe(200);

    const body = await response.json();

    // Required fields
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('version');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('checks');
    expect(body).toHaveProperty('latency_ms');

    // Status should be 'healthy' or 'degraded' (not 'unhealthy' → that's a 503)
    expect(['healthy', 'degraded']).toContain(body.status);

    // Timestamp is a valid ISO string
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });

  test('database check is present', async ({ request }) => {
    const response = await request.get('/api/health');
    const body = await response.json();

    expect(body.checks).toHaveProperty('database');
    expect(['ok', 'error']).toContain(body.checks.database);
  });

  test('environment check is present', async ({ request }) => {
    const response = await request.get('/api/health');
    const body = await response.json();

    expect(body.checks).toHaveProperty('environment');
    expect(['ok', 'missing_vars']).toContain(body.checks.environment);
  });

  test('response has Cache-Control: no-store', async ({ request }) => {
    const response = await request.get('/api/health');
    const cacheControl = response.headers()['cache-control'];
    expect(cacheControl).toContain('no-store');
  });

  test('response is JSON', async ({ request }) => {
    const response = await request.get('/api/health');
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
  });

  test('database latency is a positive number when db is ok', async ({ request }) => {
    const response = await request.get('/api/health');
    const body = await response.json();

    if (body.checks.database === 'ok') {
      expect(typeof body.latency_ms.database).toBe('number');
      expect(body.latency_ms.database).toBeGreaterThan(0);
      expect(body.latency_ms.database).toBeLessThan(5000); // <5s SLA
    }
  });
});

test.describe('Security: /api/health does not expose sensitive data', () => {
  test('does not leak environment variable values', async ({ request }) => {
    const response = await request.get('/api/health');
    const text = await response.text();

    // Should never appear in health output
    expect(text).not.toContain('sk_');      // Stripe secret key
    expect(text).not.toContain('service_role'); // Supabase service role key
    expect(text).not.toContain('eyJ');      // JWT tokens
  });
});

test.describe('CSS loads correctly', () => {
  test('page has stylesheet rules applied', async ({ page }) => {
    await page.goto('/');
    const cssRulesCount = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      return sheets.reduce((sum, s) => {
        try { return sum + (s.cssRules?.length || 0); } catch { return sum; }
      }, 0);
    });
    expect(cssRulesCount).toBeGreaterThan(0);
  });
});
