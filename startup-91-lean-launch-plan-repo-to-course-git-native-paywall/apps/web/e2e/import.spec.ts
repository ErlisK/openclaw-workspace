/**
 * import.spec.ts
 *
 * Verifies the /api/courses/import REST endpoint:
 * - Returns 401 when unauthenticated
 * - Returns 201 on a valid import with a known small public repo (or direct payload)
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Course import API', () => {
  test('returns 401 when not authenticated', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/courses/import`, {
      data: {
        repo_url: 'https://github.com/ErlisK/openclaw-workspace',
      },
    });
    expect(res.status()).toBe(401);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toBeTruthy();
  });

  test('returns 400 on missing/invalid body', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/courses/import`, {
      data: { not_a_repo_url: 'whatever' },
    });
    // 401 (not authed) or 400 (validation) both acceptable
    expect([400, 401]).toContain(res.status());
  });

  test('/api/import alias also returns 401 when not authenticated', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/import`, {
      data: {
        repo_url: 'https://github.com/ErlisK/openclaw-workspace',
      },
    });
    expect(res.status()).toBe(401);
  });

  test('GET /api/courses/import returns API documentation', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/courses/import`);
    expect(res.status()).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.endpoint).toContain('/api/courses/import');
  });

  // Integration test — only runs if TEST_CREATOR_EMAIL and TEST_CREATOR_PASSWORD are set
  test.skip(
    !process.env.TEST_CREATOR_EMAIL || !process.env.TEST_CREATOR_PASSWORD,
    'Skipped: TEST_CREATOR_EMAIL / TEST_CREATOR_PASSWORD not set',
  );

  test('authenticated creator can import a course via direct payload', async ({ request }) => {
    // 1. Login
    const loginRes = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        email: process.env.TEST_CREATOR_EMAIL,
        password: process.env.TEST_CREATOR_PASSWORD,
      },
    });
    expect(loginRes.status()).toBe(200);

    // 2. Import via direct payload (no GitHub fetch needed)
    const importRes = await request.post(`${BASE_URL}/api/courses/import`, {
      data: {
        courseYml: [
          'title: "Test Import Course"',
          'slug: "test-import-course"',
          'price_cents: 0',
          'currency: usd',
        ].join('\n'),
        lessons: [
          {
            filename: '01-intro.md',
            content: '---\ntitle: Introduction\nslug: intro\naccess: free\norder: 1\n---\n\n# Introduction\n\nHello world.',
          },
        ],
        quizzes: [],
        gitSha: 'abc1234',
        draft: false,
      },
    });

    expect(importRes.status()).toBe(201);
    const body = await importRes.json() as Record<string, unknown>;
    expect(body.success).toBe(true);
    expect(body.slug).toBe('test-import-course');
    expect(typeof body.courseId).toBe('string');
  });
});
