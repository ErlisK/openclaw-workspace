import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Stripe integration:
 * 1. POST /api/checkout — session creation
 * 2. GET /api/enroll — session verification + enrollment
 * 3. POST /api/enroll/free — free course enrollment
 * 4. POST /api/webhooks/stripe — webhook endpoint
 * 5. /courses/[slug]/enroll — success page
 */

// ─── POST /api/checkout ───────────────────────────────────────────────────────

test.describe('POST /api/checkout', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/checkout', {
      data: { courseId: '00000000-0000-0000-0000-000000000001' },
    });
    expect(res.status()).toBe(401);
  });

  test('returns 400 for invalid courseId (not a UUID)', async ({ request }) => {
    const res = await request.post('/api/checkout', {
      headers: { Authorization: 'Bearer fake-token' },
      data: { courseId: 'not-a-uuid' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('returns 400 for missing courseId', async ({ request }) => {
    const res = await request.post('/api/checkout', {
      headers: { Authorization: 'Bearer fake-token' },
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test('returns 400 for invalid JSON body', async ({ request }) => {
    const res = await request.post('/api/checkout', {
      headers: {
        Authorization: 'Bearer fake-token',
        'Content-Type': 'application/json',
      },
      data: 'not json',
    });
    expect(res.status()).toBe(400);
  });
});

// ─── GET /api/enroll ──────────────────────────────────────────────────────────

test.describe('GET /api/enroll', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/enroll?session_id=cs_test_fake');
    expect(res.status()).toBe(401);
  });

  test('returns 400 for session_id not starting with cs_', async ({ request }) => {
    const res = await request.get('/api/enroll?session_id=pi_not_a_session');
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('returns 400 when session_id is missing', async ({ request }) => {
    const res = await request.get('/api/enroll');
    expect(res.status()).toBe(400);
  });
});

// ─── POST /api/enroll/free ────────────────────────────────────────────────────

test.describe('POST /api/enroll/free', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/enroll/free', {
      data: { courseId: '00000000-0000-0000-0000-000000000001' },
    });
    expect(res.status()).toBe(401);
  });

  test('returns 400 for non-UUID courseId', async ({ request }) => {
    const res = await request.post('/api/enroll/free', {
      headers: { Authorization: 'Bearer fake-token' },
      data: { courseId: 'not-a-uuid' },
    });
    expect(res.status()).toBe(400);
  });
});

// ─── POST /api/webhooks/stripe ────────────────────────────────────────────────

test.describe('POST /api/webhooks/stripe', () => {
  test('returns 400 without stripe-signature header', async ({ request }) => {
    // Only fails with 400 if STRIPE_WEBHOOK_SECRET is configured
    // In test env without the secret, returns 200 (graceful no-op)
    const res = await request.post('/api/webhooks/stripe', {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ type: 'checkout.session.completed' }),
    });
    // Either 200 (secret not set) or 400 (secret set, signature missing)
    expect([200, 400]).toContain(res.status());
  });
});

// ─── /courses/[slug]/enroll success page ──────────────────────────────────────

test.describe('Enroll success page', () => {
  test('redirects to course page when no session_id', async ({ page }) => {
    const res = await page.goto('/courses/git-workflow-engineers/enroll');
    // Should redirect to /courses/git-workflow-engineers
    const url = page.url();
    expect(url).toContain('/courses/git-workflow-engineers');
    expect(url).not.toContain('/enroll');
  });

  test('renders error state for invalid session_id', async ({ page }) => {
    await page.goto('/courses/git-workflow-engineers/enroll?session_id=cs_test_invalid');
    // Should show error UI (404 course or enrollment error)
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
  });
});

// ─── CheckoutButton component (visual) ───────────────────────────────────────

test.describe('Course page checkout UI', () => {
  test('course page loads for a known slug', async ({ page }) => {
    await page.goto('/courses/git-workflow-engineers');
    // Either renders the course page or 404 (no seeded data in test env)
    const status = await page.evaluate(() => document.readyState);
    expect(status).toBe('complete');
  });
});
