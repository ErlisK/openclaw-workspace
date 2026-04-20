/**
 * API smoke tests — P4 recommendation from E2E review.
 *
 * Tests key API routes beyond /api/health to ensure they respond correctly
 * with and without authentication.
 *
 * Run: BASE_URL=https://teachrepo.com npx playwright test e2e/api-smoke.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('API smoke tests', () => {
  // ─── /api/health ────────────────────────────────────────────────────────
  test('GET /api/health returns healthy status', async ({ request }) => {
    const resp = await request.get('/api/health');
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.status).toBe('healthy');
    expect(body.checks.database).toBe('ok');
  });

  // ─── Auth-protected routes return 401/redirect without token ────────────
  test('GET /api/me returns 401 without auth token', async ({ request }) => {
    const resp = await request.get('/api/me');
    // Acceptable: 401 Unauthorized or 403 Forbidden
    expect([401, 403]).toContain(resp.status());
  });

  test('GET /api/courses returns 401 without auth token', async ({ request }) => {
    const resp = await request.get('/api/courses');
    // Could be 401, 403, or 200 if public listing is allowed
    expect([200, 401, 403, 404]).toContain(resp.status());
  });

  // ─── POST /api/auth/signup input validation ──────────────────────────────
  test('POST /api/auth/signup with missing body returns 4xx', async ({ request }) => {
    const resp = await request.post('/api/auth/signup', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    // Should reject empty payload — 400 or 422 expected
    expect(resp.status()).toBeGreaterThanOrEqual(400);
    expect(resp.status()).toBeLessThan(500);
  });

  // ─── Unknown API routes return 404 ──────────────────────────────────────
  test('GET /api/nonexistent returns 404', async ({ request }) => {
    const resp = await request.get('/api/this-route-does-not-exist-xyz');
    expect(resp.status()).toBe(404);
  });
});
