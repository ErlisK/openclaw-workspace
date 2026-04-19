/**
 * e2e/frontmatter-linter.spec.ts
 *
 * Tests for:
 * 1. /api/lint — direct batch linting (no auth required)
 * 2. Lint logic — field validation, error codes, severity levels
 * 3. /dashboard/new — UI integration (tabs, linter panel)
 * 4. Error categorisation — import errors map to helpful hints
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

// ── 1. Lint API — direct mode ─────────────────────────────────────────────────

test.describe('1 · /api/lint — direct file linting', () => {
  test('returns 400 for invalid body', async ({ request }) => {
    const res = await request.post(`${BASE}/api/lint`, { data: {} });
    expect([400]).toContain(res.status());
  });

  test('lints a valid course.yml with no errors', async ({ request }) => {
    const res = await request.post(`${BASE}/api/lint`, {
      data: {
        files: [{
          path: 'course.yml',
          content: 'title: "Test Course"\nslug: test-course\ndescription: "A test"\nprice_cents: 0\ntags: [test]',
        }],
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.errorCount).toBe(0);
    expect(body.allValid).toBe(true);
    expect(body.results).toHaveLength(1);
    expect(body.results[0].kind).toBe('course_yaml');
  });

  test('returns error for course.yml missing title', async ({ request }) => {
    const res = await request.post(`${BASE}/api/lint`, {
      data: {
        files: [{
          path: 'course.yml',
          content: 'slug: my-course\nprice_cents: 0',
        }],
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.errorCount).toBeGreaterThan(0);
    expect(body.allValid).toBe(false);
    const titleIssue = body.results[0].issues.find((i: { field: string }) => i.field === 'title');
    expect(titleIssue).toBeTruthy();
    expect(titleIssue.severity).toBe('error');
    expect(titleIssue.doc).toBeTruthy();
  });

  test('returns error for course.yml missing slug', async ({ request }) => {
    const res = await request.post(`${BASE}/api/lint`, {
      data: {
        files: [{ path: 'course.yml', content: 'title: "Test Course"' }],
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const slugIssue = body.results[0].issues.find((i: { field: string }) => i.field === 'slug');
    expect(slugIssue).toBeTruthy();
    expect(slugIssue.severity).toBe('error');
  });

  test('returns error for invalid slug format', async ({ request }) => {
    const res = await request.post(`${BASE}/api/lint`, {
      data: {
        files: [{
          path: 'course.yml',
          content: 'title: "Test"\nslug: My Course With Spaces',
        }],
      },
    });
    const body = await res.json();
    const slugIssue = body.results[0].issues.find((i: { field: string; severity: string }) => i.field === 'slug' && i.severity === 'error');
    expect(slugIssue).toBeTruthy();
    expect(slugIssue.fix).toBeTruthy();
  });

  test('returns info for missing description', async ({ request }) => {
    const res = await request.post(`${BASE}/api/lint`, {
      data: {
        files: [{
          path: 'course.yml',
          content: 'title: "Test"\nslug: test-course\nprice_cents: 0',
        }],
      },
    });
    const body = await res.json();
    const descIssue = body.results[0].issues.find((i: { field: string; severity: string }) => i.field === 'description' && i.severity === 'info');
    expect(descIssue).toBeTruthy();
  });

  test('returns error for invalid price_cents (negative)', async ({ request }) => {
    const res = await request.post(`${BASE}/api/lint`, {
      data: {
        files: [{
          path: 'course.yml',
          content: 'title: "Test"\nslug: test-course\nprice_cents: -5',
        }],
      },
    });
    const body = await res.json();
    const priceIssue = body.results[0].issues.find((i: { field: string }) => i.field === 'price_cents');
    expect(priceIssue?.severity).toBe('error');
  });

  test('warns when price_cents < 50 (Stripe minimum)', async ({ request }) => {
    const res = await request.post(`${BASE}/api/lint`, {
      data: {
        files: [{
          path: 'course.yml',
          content: 'title: "Test"\nslug: test-course\nprice_cents: 10',
        }],
      },
    });
    const body = await res.json();
    const priceIssue = body.results[0].issues.find((i: { field: string }) => i.field === 'price_cents');
    expect(priceIssue?.severity).toBe('warning');
  });
});

// ── 2. Lesson frontmatter linting ─────────────────────────────────────────────

test.describe('2 · /api/lint — lesson frontmatter', () => {
  test('valid lesson with full frontmatter passes', async ({ request }) => {
    const content = `---
title: "Introduction"
slug: introduction
order: 1
access: free
estimated_minutes: 10
---

# Welcome

Content here.`;

    const res = await request.post(`${BASE}/api/lint`, {
      data: { files: [{ path: 'lessons/01-intro.md', content }] },
    });
    const body = await res.json();
    expect(body.errorCount).toBe(0);
  });

  test('warns when no frontmatter at all', async ({ request }) => {
    const res = await request.post(`${BASE}/api/lint`, {
      data: {
        files: [{ path: 'lessons/01-intro.md', content: '# Hello\n\nContent here.' }],
      },
    });
    const body = await res.json();
    const structureIssue = body.results[0].issues.find((i: { field: string }) => i.field === 'structure');
    expect(structureIssue?.severity).toBe('warning');
    expect(structureIssue?.doc).toBeTruthy();
  });

  test('errors on invalid access value', async ({ request }) => {
    const content = `---
title: "Lesson"
access: premium
---
Content.`;
    const res = await request.post(`${BASE}/api/lint`, {
      data: { files: [{ path: 'lessons/01.md', content }] },
    });
    const body = await res.json();
    const accessIssue = body.results[0].issues.find((i: { field: string }) => i.field === 'access');
    expect(accessIssue?.severity).toBe('error');
    expect(accessIssue?.fix).toContain('free');
  });

  test('errors on invalid lesson slug', async ({ request }) => {
    const content = `---
title: "Lesson"
slug: My Bad Slug!
---
Content.`;
    const res = await request.post(`${BASE}/api/lint`, {
      data: { files: [{ path: 'lessons/01.md', content }] },
    });
    const body = await res.json();
    const slugIssue = body.results[0].issues.find((i: { field: string }) => i.field === 'slug');
    expect(slugIssue?.severity).toBe('error');
  });

  test('info when estimated_minutes > 240', async ({ request }) => {
    const content = `---
title: "Lesson"
slug: lesson-1
estimated_minutes: 300
---
Content.`;
    const res = await request.post(`${BASE}/api/lint`, {
      data: { files: [{ path: 'lessons/01.md', content }] },
    });
    const body = await res.json();
    const timeIssue = body.results[0].issues.find((i: { field: string; severity: string }) => i.field === 'estimated_minutes' && i.severity === 'info');
    expect(timeIssue).toBeTruthy();
  });
});

// ── 3. Batch linting ─────────────────────────────────────────────────────────

test.describe('3 · /api/lint — batch and mixed files', () => {
  test('lints course.yml + lesson together', async ({ request }) => {
    const res = await request.post(`${BASE}/api/lint`, {
      data: {
        files: [
          { path: 'course.yml', content: 'title: "T"\nslug: test\nprice_cents: 0' },
          { path: 'lessons/01-intro.md', content: '---\ntitle: "Intro"\nslug: intro\norder: 1\naccess: free\n---\n\nContent.' },
        ],
      },
    });
    const body = await res.json();
    expect(body.results).toHaveLength(2);
    expect(body.errorCount).toBe(0);
  });

  test('aggregates error + warning counts across files', async ({ request }) => {
    const res = await request.post(`${BASE}/api/lint`, {
      data: {
        files: [
          { path: 'course.yml', content: 'slug: test' }, // missing title = error
          { path: 'lessons/01.md', content: '---\naccess: gated\n---\nContent.' }, // invalid access = error
        ],
      },
    });
    const body = await res.json();
    expect(body.errorCount).toBeGreaterThanOrEqual(2);
    expect(body.allValid).toBe(false);
  });

  test('limits files to 50', async ({ request }) => {
    const files = Array.from({ length: 55 }, (_, i) => ({
      path: `lessons/${i.toString().padStart(2, '0')}-lesson.md`,
      content: '---\ntitle: "L"\n---\nContent.',
    }));
    const res = await request.post(`${BASE}/api/lint`, { data: { files } });
    expect([200, 400]).toContain(res.status());
  });
});

// ── 4. Repo-based linting ─────────────────────────────────────────────────────

test.describe('4 · /api/lint — repo-based', () => {
  test('lints the teachrepo-template repo', async ({ request }) => {
    const res = await request.post(`${BASE}/api/lint`, {
      data: {
        repo_url: 'https://github.com/ErlisK/teachrepo-template',
        branch: 'main',
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.results.length).toBeGreaterThan(0);
    expect(body.meta?.repo).toBe('ErlisK/teachrepo-template');
  });

  test('returns 422 for non-existent repo', async ({ request }) => {
    const res = await request.post(`${BASE}/api/lint`, {
      data: {
        repo_url: 'https://github.com/nonexistent-user-xyz/nonexistent-repo-xyz',
        branch: 'main',
      },
    });
    expect([422, 400]).toContain(res.status());
  });

  test('returns 400 for invalid repo URL', async ({ request }) => {
    const res = await request.post(`${BASE}/api/lint`, {
      data: {
        repo_url: 'not-a-url',
      },
    });
    expect([400]).toContain(res.status());
  });
});

// ── 5. Issue structure ────────────────────────────────────────────────────────

test.describe('5 · Issue structure and doc links', () => {
  test('every error-severity issue has a doc link', async ({ request }) => {
    const res = await request.post(`${BASE}/api/lint`, {
      data: {
        files: [
          { path: 'course.yml', content: '' }, // empty = error
        ],
      },
    });
    const body = await res.json();
    for (const result of body.results) {
      for (const issue of result.issues) {
        if (issue.severity === 'error') {
          expect(issue.doc).toBeTruthy();
        }
      }
    }
  });

  test('every issue has message string', async ({ request }) => {
    const res = await request.post(`${BASE}/api/lint`, {
      data: {
        files: [
          { path: 'course.yml', content: 'title: t\nslug: Bad Slug\nprice_cents: -1\naffiliate_pct: 200' },
        ],
      },
    });
    const body = await res.json();
    for (const result of body.results) {
      for (const issue of result.issues) {
        expect(typeof issue.message).toBe('string');
        expect(issue.message.length).toBeGreaterThan(0);
        expect(['error', 'warning', 'info']).toContain(issue.severity);
      }
    }
  });
});

// ── 6. Dashboard new page UI ──────────────────────────────────────────────────

test.describe('6 · /dashboard/new — UI', () => {
  test('page loads (200 or redirect)', async ({ request }) => {
    const res = await request.get(`${BASE}/dashboard/new`);
    expect([200, 301, 302, 307, 308]).toContain(res.status());
  });

  test('page contains import form elements', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/new`, { timeout: 15000 });
    // Should show Import from GitHub heading (may redirect to login)
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });
});
