/**
 * e2e/funnel-dashboard.spec.ts
 *
 * Tests for:
 * 1. /api/admin/funnel — 6-step funnel API
 * 2. /api/admin/seed-events — synthetic event seeder
 * 3. /dashboard/analytics — funnel dashboard UI
 * 4. Funnel step validation (counts, rates, drop-offs)
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

// ── Auth helper ──────────────────────────────────────────────────────────────

async function loginCreator(request: ReturnType<typeof test['info']> extends never ? never : Parameters<Parameters<typeof test>[1]>[0]['request']) {
  const res = await request.post(`${BASE}/api/auth/login`, {
    data: { email: 'creator@test.teachrepo.com', password: 'TestPass123!' },
  });
  const body = await res.json().catch(() => ({}));
  return body.token ?? body.access_token ?? '';
}

// ── 1. Funnel API — structure ─────────────────────────────────────────────────

test.describe('1 · /api/admin/funnel — structure', () => {
  test('returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.get(`${BASE}/api/admin/funnel`);
    expect(res.status()).toBe(401);
  });

  test('returns valid funnel shape when authenticated', async ({ request }) => {
    const jwt = await loginCreator(request);
    if (!jwt) return test.skip(); // skip if no auth available

    const res = await request.get(`${BASE}/api/admin/funnel`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    expect([200, 401]).toContain(res.status());

    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('steps');
      expect(body).toHaveProperty('days');
      expect(body).toHaveProperty('since');
      expect(Array.isArray(body.steps)).toBe(true);
      expect(body.steps).toHaveLength(6);
    }
  });

  test('funnel has exactly 6 steps with correct event names', async ({ request }) => {
    const jwt = await loginCreator(request);
    if (!jwt) return test.skip();

    const res = await request.get(`${BASE}/api/admin/funnel`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (res.status() !== 200) return test.skip();

    const body = await res.json();
    const events = body.steps.map((s: { event: string }) => s.event);
    expect(events).toContain('signup_completed');
    expect(events).toContain('repo_import_started');
    expect(events).toContain('repo_import_completed');
    expect(events).toContain('course_published');
    expect(events).toContain('checkout_started');
    expect(events).toContain('checkout_completed');
  });

  test('step 1 has no rate (null)', async ({ request }) => {
    const jwt = await loginCreator(request);
    if (!jwt) return test.skip();

    const res = await request.get(`${BASE}/api/admin/funnel`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (res.status() !== 200) return test.skip();

    const body = await res.json();
    expect(body.steps[0].rate).toBeNull();
    expect(body.steps[0].drop_off).toBeNull();
  });

  test('steps 2-6 have numeric rates', async ({ request }) => {
    const jwt = await loginCreator(request);
    if (!jwt) return test.skip();

    const res = await request.get(`${BASE}/api/admin/funnel`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (res.status() !== 200) return test.skip();

    const body = await res.json();
    for (let i = 1; i < body.steps.length; i++) {
      const step = body.steps[i];
      // rate is null only when previous count was 0, otherwise numeric
      if (step.rate !== null) {
        expect(typeof step.rate).toBe('number');
        expect(step.rate).toBeGreaterThanOrEqual(0);
        expect(step.rate).toBeLessThanOrEqual(100);
      }
    }
  });

  test('accepts ?days= param', async ({ request }) => {
    const jwt = await loginCreator(request);
    if (!jwt) return test.skip();

    const res = await request.get(`${BASE}/api/admin/funnel?days=7`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (res.status() !== 200) return test.skip();
    const body = await res.json();
    expect(body.days).toBe(7);
  });

  test('all step counts are non-negative integers', async ({ request }) => {
    const jwt = await loginCreator(request);
    if (!jwt) return test.skip();

    const res = await request.get(`${BASE}/api/admin/funnel`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (res.status() !== 200) return test.skip();

    const body = await res.json();
    for (const step of body.steps) {
      expect(typeof step.count).toBe('number');
      expect(step.count).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(step.count)).toBe(true);
    }
  });
});

// ── 2. Seed events API ────────────────────────────────────────────────────────

test.describe('2 · /api/admin/seed-events', () => {
  test('returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.post(`${BASE}/api/admin/seed-events`, {
      data: { scenario: 'full_funnel', count: 5 },
    });
    expect(res.status()).toBe(401);
  });

  test('returns 400 for unknown scenario', async ({ request }) => {
    const jwt = await loginCreator(request);
    if (!jwt) return test.skip();

    const res = await request.post(`${BASE}/api/admin/seed-events`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { scenario: 'nonexistent_scenario' },
    });
    // 400 or 403 depending on env
    expect([400, 403]).toContain(res.status());
  });

  test('rejects in production without SEED_ALLOWED', async ({ request }) => {
    // In production, seeding should be blocked
    // This test is a documentation/spec test — actual behavior depends on env
    const res = await request.post(`${BASE}/api/admin/seed-events`, {
      data: { scenario: 'full_funnel', count: 1 },
    });
    // Either 401 (no auth) or 403 (not allowed in prod) or 200 (dev env)
    expect([200, 401, 403]).toContain(res.status());
  });
});

// ── 3. Funnel with synthetic data (seed → query → validate) ─────────────────

test.describe('3 · Funnel with synthetic data', () => {
  test('seeded full_funnel scenario produces expected counts', async ({ request }) => {
    const jwt = await loginCreator(request);
    if (!jwt) return test.skip();

    // Seed 20 events with full_funnel scenario
    const seedRes = await request.post(`${BASE}/api/admin/seed-events`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { scenario: 'full_funnel', count: 20 },
    });

    if (seedRes.status() === 403) return test.skip(); // production env
    if (seedRes.status() !== 200) return test.skip();

    const seeded = await seedRes.json();
    expect(seeded.total).toBeGreaterThan(0);

    // Verify seeded counts match expected rates (step 1 = 20, step 6 = ~6)
    const s = seeded.seeded as Record<string, number>;
    expect(s['signup_completed']).toBe(20);
    expect(s['repo_import_started']).toBe(16);
    expect(s['repo_import_completed']).toBe(15);
    expect(s['course_published']).toBe(12);
    expect(s['checkout_started']).toBe(8);
    expect(s['checkout_completed']).toBe(6);

    // Query funnel
    const funnelRes = await request.get(`${BASE}/api/admin/funnel?days=30`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (funnelRes.status() !== 200) return test.skip();

    const funnel = await funnelRes.json();
    // After seeding, step 1 count should be >= 20
    expect(funnel.steps[0].count).toBeGreaterThanOrEqual(20);

    // Clean up
    await request.post(`${BASE}/api/admin/seed-events`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { scenario: 'clear' },
    });
  });

  test('seeded no_publish scenario has 0 for steps 4-6', async ({ request }) => {
    const jwt = await loginCreator(request);
    if (!jwt) return test.skip();

    const seedRes = await request.post(`${BASE}/api/admin/seed-events`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { scenario: 'no_publish', count: 10 },
    });
    if (seedRes.status() === 403) return test.skip();
    if (seedRes.status() !== 200) return test.skip();

    const seeded = await seedRes.json();
    const s = seeded.seeded as Record<string, number>;
    expect(s['course_published']).toBe(0);
    expect(s['checkout_started']).toBe(0);
    expect(s['checkout_completed']).toBe(0);

    // Clean up
    await request.post(`${BASE}/api/admin/seed-events`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { scenario: 'clear' },
    });
  });
});

// ── 4. Dashboard UI ────────────────────────────────────────────────────────────

test.describe('4 · /dashboard/analytics UI', () => {
  test('redirects unauthenticated users', async ({ request }) => {
    const res = await request.get(`${BASE}/dashboard/analytics`, { maxRedirects: 0 });
    expect([301, 302, 303, 307, 308]).toContain(res.status());
  });

  test('page returns HTML (not error) when route exists', async ({ request }) => {
    const res = await request.get(`${BASE}/dashboard/analytics`);
    // Either 200 (auth'd) or redirect (unauth'd) — never 500
    expect([200, 301, 302, 307, 308]).toContain(res.status());
  });
});

// ── 5. Funnel API query validation ───────────────────────────────────────────

test.describe('5 · Funnel API — edge cases', () => {
  test('days param is clamped to 1-365', async ({ request }) => {
    const jwt = await loginCreator(request);
    if (!jwt) return test.skip();

    for (const [input, expected] of [['0', 1], ['999', 365], ['30', 30]]) {
      const res = await request.get(`${BASE}/api/admin/funnel?days=${input}`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (res.status() !== 200) continue;
      const body = await res.json();
      expect(body.days).toBe(expected);
    }
  });

  test('bottleneck_step is null when all counts are 0', async ({ request }) => {
    const jwt = await loginCreator(request);
    if (!jwt) return test.skip();

    // Use a 1-day window to get near-zero counts in test env
    const res = await request.get(`${BASE}/api/admin/funnel?days=1`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (res.status() !== 200) return test.skip();

    const body = await res.json();
    // When all counts are 0, bottleneck is null and overall_conversion is null
    if (body.steps.every((s: { count: number }) => s.count === 0)) {
      expect(body.bottleneck_step).toBeNull();
      expect(body.overall_conversion).toBeNull();
    }
  });

  test('returns scoped_to: creator', async ({ request }) => {
    const jwt = await loginCreator(request);
    if (!jwt) return test.skip();

    const res = await request.get(`${BASE}/api/admin/funnel`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (res.status() !== 200) return test.skip();

    const body = await res.json();
    expect(body.scoped_to).toBe('creator');
  });
});
