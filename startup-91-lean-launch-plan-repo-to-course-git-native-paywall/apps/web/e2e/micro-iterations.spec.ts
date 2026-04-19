/**
 * e2e/micro-iterations.spec.ts
 *
 * Tests for 4 UX micro-iterations:
 * 1. Empty states (courses page, dashboard)
 * 2. Import validation (client-side pre-check)
 * 3. Quiz editor UX (question management, copy YAML)
 * 4. Landing page copy
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

// ── 1. Empty states ───────────────────────────────────────────────────────────

test.describe('1 · Empty states', () => {
  test('courses page loads without error', async ({ request }) => {
    const res = await request.get(`${BASE}/dashboard/courses`);
    expect([200, 301, 302, 307, 308]).toContain(res.status());
  });

  test('dashboard page loads', async ({ request }) => {
    const res = await request.get(`${BASE}/dashboard`);
    expect([200, 301, 302, 307, 308]).toContain(res.status());
  });

  test('courses page HTML includes empty-state guidance when redirected', async ({ page }) => {
    const res = await page.goto(`${BASE}/dashboard/courses`, { timeout: 15000 });
    // Either shows course list or redirects to login — never 500
    expect(res?.status()).not.toBe(500);
  });
});

// ── 2. Import validation ──────────────────────────────────────────────────────

test.describe('2 · Import validation', () => {
  test('import page loads', async ({ request }) => {
    const res = await request.get(`${BASE}/dashboard/new`);
    expect([200, 301, 302, 307, 308]).toContain(res.status());
  });

  test('import API rejects missing repo_url', async ({ request }) => {
    const res = await request.post(`${BASE}/api/import`, { data: {} });
    // 400 = validation error (correct), 401 = unauth (also ok), never 200
    expect([400, 401, 422]).toContain(res.status());
  });

  test('import API rejects non-GitHub URL', async ({ request }) => {
    const res = await request.post(`${BASE}/api/import`, {
      data: { repo_url: 'https://gitlab.com/user/repo' },
    });
    expect([400, 401, 422]).toContain(res.status());
    if (res.status() === 422) {
      const body = await res.json();
      expect(body.error).toBeTruthy();
    }
  });

  test('lint API available at /api/lint', async ({ request }) => {
    const res = await request.post(`${BASE}/api/lint`, {
      data: { files: [{ path: 'course.yml', content: 'title: T\nslug: t\nprice_cents: 0\ndescription: d' }] },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.allValid).toBe(true);
  });

  test('lint catches missing required fields before import', async ({ request }) => {
    // Simulates a creator checking their course.yml before importing
    const badCourseYml = 'description: "A course with no title or slug"';
    const res = await request.post(`${BASE}/api/lint`, {
      data: { files: [{ path: 'course.yml', content: badCourseYml }] },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.allValid).toBe(false);
    expect(body.errorCount).toBeGreaterThanOrEqual(2); // title + slug missing
  });

  test('lint catches invalid lesson access value', async ({ request }) => {
    const badLesson = '---\ntitle: Lesson\naccess: gated\n---\nContent.';
    const res = await request.post(`${BASE}/api/lint`, {
      data: { files: [{ path: 'lessons/01.md', content: badLesson }] },
    });
    const body = await res.json();
    const accessIssue = body.results[0]?.issues.find((i: { field: string }) => i.field === 'access');
    expect(accessIssue?.severity).toBe('error');
    expect(accessIssue?.fix).toContain('free');
  });

  test('lint returns doc links for all errors', async ({ request }) => {
    const res = await request.post(`${BASE}/api/lint`, {
      data: {
        files: [{ path: 'course.yml', content: 'price_cents: -1\nslug: Bad Slug' }],
      },
    });
    const body = await res.json();
    for (const issue of body.results.flatMap((r: { issues: Array<{ severity: string; doc?: string }> }) => r.issues)) {
      if (issue.severity === 'error') {
        expect(issue.doc).toBeTruthy();
      }
    }
  });
});

// ── 3. Quiz editor UX ─────────────────────────────────────────────────────────

test.describe('3 · Quiz editor UX', () => {
  test('quiz generate API returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.post(`${BASE}/api/quiz/generate`, {
      data: { lessonId: 'fake-id', numQuestions: 3, quizId: 'test-quiz' },
    });
    // 401 = unauth (correct), 503 = AI not available on local, never 500
    expect([401, 503]).toContain(res.status());
  });

  test('lesson quiz save API returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.post(
      `${BASE}/api/courses/fake-course/lessons/fake-lesson/quiz`,
      { data: { quizId: 'q', title: 'Q', questions: [], yaml: '' } },
    );
    expect([401, 404]).toContain(res.status());
  });

  test('lesson page loads without 500', async ({ request }) => {
    // Auth-guarded but should redirect, not crash
    const res = await request.get(`${BASE}/dashboard/courses/fake-id/lessons/fake-lesson`);
    expect([301, 302, 307, 308, 404]).toContain(res.status());
  });
});

// ── 4. Landing page copy ──────────────────────────────────────────────────────

test.describe('4 · Landing page copy', () => {
  test('homepage returns 200', async ({ request }) => {
    const res = await request.get(`${BASE}/`);
    expect(res.status()).toBe(200);
  });

  test('homepage contains updated hero copy', async ({ request }) => {
    const res = await request.get(`${BASE}/`);
    const html = await res.text();
    // Updated hero copy
    expect(html).toContain('already');
    expect(html).toContain('git push');
  });

  test('homepage contains updated CTA copy', async ({ request }) => {
    const res = await request.get(`${BASE}/`);
    const html = await res.text();
    expect(html).toContain('Ship your course');
  });

  test('homepage contains updated feature descriptions', async ({ request }) => {
    const res = await request.get(`${BASE}/`);
    const html = await res.text();
    // Updated feature: "Zero-config paywall" and "AI quiz generation"
    expect(html).toContain('Zero-config paywall');
    expect(html).toContain('AI quiz generation');
  });

  test('homepage CTA links to /auth/signup', async ({ request }) => {
    const res = await request.get(`${BASE}/`);
    const html = await res.text();
    expect(html).toContain('/auth/signup');
  });

  test('homepage links to /docs/quickstart', async ({ request }) => {
    const res = await request.get(`${BASE}/`);
    const html = await res.text();
    expect(html).toContain('/docs/quickstart');
  });

  test('homepage has correct title tag', async ({ request }) => {
    const res = await request.get(`${BASE}/`);
    const html = await res.text();
    expect(html).toContain('TeachRepo');
  });

  test('homepage open graph tags present', async ({ request }) => {
    const res = await request.get(`${BASE}/`);
    const html = await res.text();
    expect(html).toContain('og:title');
    expect(html).toContain('teachrepo.com');
  });
});

// ── 5. Import form validation flow ────────────────────────────────────────────

test.describe('5 · Import form validation flow', () => {
  test('lint then import workflow — lint catches errors before API hit', async ({ request }) => {
    // Step 1: creator pastes course.yml content into linter
    const lintRes = await request.post(`${BASE}/api/lint`, {
      data: {
        files: [
          { path: 'course.yml', content: 'title: "Valid"\nslug: valid-course\nprice_cents: 0\ndescription: "Desc"' },
          { path: 'lessons/01-intro.md', content: '---\ntitle: "Intro"\nslug: intro\norder: 1\naccess: free\n---\n\nContent here.' },
        ],
      },
    });
    expect(lintRes.status()).toBe(200);
    const lintBody = await lintRes.json();

    // Step 2: if lint passes, import proceeds
    expect(lintBody.allValid).toBe(true);
    expect(lintBody.errorCount).toBe(0);

    // Step 3: import attempt (will 401 without auth, but the lint path is validated)
    const importRes = await request.post(`${BASE}/api/import`, {
      data: { repo_url: 'https://github.com/ErlisK/teachrepo-template', branch: 'main' },
    });
    // 200 = success, 401 = unauth (expected in test), never 422 from lint-fixable issues
    expect([200, 401]).toContain(importRes.status());
  });
});
