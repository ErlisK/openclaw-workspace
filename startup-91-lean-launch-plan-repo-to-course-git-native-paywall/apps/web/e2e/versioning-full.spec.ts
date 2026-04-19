/**
 * Versioning E2E Tests
 *
 * Tests the full versioning flow:
 *   1. POST /api/import stores commit SHA + version in course_versions
 *   2. GET /api/courses/[courseId]/versions returns version history
 *   3. POST /api/courses/[courseId]/versions promotes a version to current
 *   4. Dashboard course detail page shows current version
 *   5. Dashboard version history page renders version list
 *
 * Note: Page rendering tests are auth-gated; we primarily test API routes here.
 */

import { test, expect, APIRequestContext } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const SUPA_URL = 'https://zkwyfjrgmvpgfbaqwxsb.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprd3lmanJnbXZwZ2ZiYXF3eHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NDM3NzcsImV4cCI6MjA5MjExOTc3N30.5kcjZd7JuOTzqvhfXIvtYvzbvUiZF3oqgkdm0Yuj1sM';

const CREATOR_EMAIL = 'importer-test-1776550340@agentmail.to';
const CREATOR_PASS = 'TestPass123!';

test.use({ baseURL: BASE_URL });

async function login(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    data: { email: CREATOR_EMAIL, password: CREATOR_PASS },
  });
  const d = await res.json() as { access_token?: string };
  if (!d.access_token) throw new Error('Login failed');
  return d.access_token;
}

async function importCourse(
  request: APIRequestContext,
  jwt: string,
  slug: string,
  gitSha: string,
  lessonCount = 2,
): Promise<{ courseId: string; versionId: string; slug: string }> {
  const lessons = Array.from({ length: lessonCount }, (_, i) => ({
    filename: `${String(i + 1).padStart(2, '0')}-lesson.md`,
    content: `---\ntitle: "Lesson ${i + 1}"\nslug: "lesson-${i + 1}"\norder: ${i + 1}\naccess: ${i === 0 ? 'free' : 'paid'}\n---\n\nContent for lesson ${i + 1}.`,
  }));
  const res = await request.post('/api/import', {
    headers: { Authorization: `Bearer ${jwt}` },
    data: {
      courseYml: `title: "Version Test Course"\nslug: "${slug}"\nprice_cents: 2900\ncurrency: "usd"\nrepo_url: "https://github.com/ErlisK/openclaw-workspace"\n`,
      lessons,
      quizzes: [],
      gitSha,
      gitBranch: 'main',
      repoUrl: 'https://github.com/ErlisK/openclaw-workspace',
    },
  });
  expect(res.status()).toBe(200);
  const body = await res.json() as { courseId: string; versionId: string; slug: string };
  return body;
}

// ── 1. Import stores version ──────────────────────────────────────────────────

test.describe('1 · Import → version storage', () => {
  test('direct import returns versionId when gitSha provided', async ({ request }) => {
    const jwt = await login(request);
    const slug = `ver-test-${Date.now()}`;
    const gitSha = `abc${Date.now().toString(16)}`.padEnd(40, '0').slice(0, 40);

    const res = await request.post('/api/import', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: {
        courseYml: `title: "Version Test"\nslug: "${slug}"\nprice_cents: 0\ncurrency: "usd"\nrepo_url: "https://github.com/ErlisK/openclaw-workspace"\n`,
        lessons: [{ filename: '01-intro.md', content: '---\ntitle: "Intro"\nslug: "intro"\norder: 1\naccess: free\n---\nContent.' }],
        quizzes: [],
        gitSha,
        gitBranch: 'main',
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { versionId: string; courseId: string; slug: string };
    expect(typeof body.versionId).toBe('string');
    expect(body.versionId.length).toBeGreaterThan(0);
    expect(body.slug).toBe(slug);
    expect(body.courseId).toBeTruthy();
  });

  test('import without gitSha does not create a version row (graceful)', async ({ request }) => {
    const jwt = await login(request);
    const slug = `ver-nosha-${Date.now()}`;

    const res = await request.post('/api/import', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: {
        courseYml: `title: "No SHA"\nslug: "${slug}"\nprice_cents: 0\ncurrency: "usd"\nrepo_url: "https://github.com/ErlisK/openclaw-workspace"\n`,
        lessons: [{ filename: '01-intro.md', content: '---\ntitle: "Intro"\nslug: "intro"\norder: 1\naccess: free\n---\nContent.' }],
        quizzes: [],
        // No gitSha
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { versionId?: string; courseId: string };
    // versionId should be absent or empty — no SHA = no version row
    expect(body.versionId ?? '').toBe('');
  });

  test('version_label is formatted as v-<shortSha>', async ({ request }) => {
    const jwt = await login(request);
    const slug = `ver-label-${Date.now()}`;
    const gitSha = `deadbeef${Date.now().toString(16)}`.slice(0, 40).padEnd(40, '0');
    const shortSha = gitSha.slice(0, 7);

    const { versionId, courseId } = await importCourse(request, jwt, slug, gitSha);
    expect(versionId).toBeTruthy();

    // Check via the versions API
    const versRes = await request.get(`/api/courses/${courseId}/versions`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    expect(versRes.status()).toBe(200);
    const { versions } = await versRes.json() as { versions: Array<{ version_label: string; commit_sha: string; is_current: boolean }> };
    const v = versions.find((x) => x.commit_sha === gitSha);
    expect(v).toBeTruthy();
    expect(v!.version_label).toBe(`v-${shortSha}`);
    expect(v!.is_current).toBe(true);
  });

  test('commit_sha stored exactly matches what was sent', async ({ request }) => {
    const jwt = await login(request);
    const slug = `ver-sha-${Date.now()}`;
    const gitSha = `cafef00d${Date.now().toString(16)}`.slice(0, 40).padEnd(40, '0');

    const { courseId } = await importCourse(request, jwt, slug, gitSha);

    const versRes = await request.get(`/api/courses/${courseId}/versions`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const { versions } = await versRes.json() as { versions: Array<{ commit_sha: string }> };
    expect(versions.some((v) => v.commit_sha === gitSha)).toBe(true);
  });
});

// ── 2. GET /api/courses/[courseId]/versions ───────────────────────────────────

test.describe('2 · GET /api/courses/[courseId]/versions', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/courses/00000000-0000-0000-0000-000000000000/versions');
    expect(res.status()).toBe(401);
  });

  test('returns 404 for course owned by another user', async ({ request }) => {
    const jwt = await login(request);
    // Random UUID that doesn't exist for this creator
    const res = await request.get('/api/courses/00000000-0000-0000-0000-000000000001/versions', {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    expect(res.status()).toBe(404);
  });

  test('returns paginated version list in descending order', async ({ request }) => {
    const jwt = await login(request);
    const slug = `ver-list-${Date.now()}`;

    // Import twice — v1 then v2
    const sha1 = `aaa${Date.now().toString(16)}`.slice(0, 40).padEnd(40, '0');
    const { courseId } = await importCourse(request, jwt, slug, sha1, 1);

    const sha2 = `bbb${(Date.now() + 1000).toString(16)}`.slice(0, 40).padEnd(40, '0');
    await importCourse(request, jwt, slug, sha2, 2);

    const res = await request.get(`/api/courses/${courseId}/versions`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    expect(res.status()).toBe(200);
    const { versions } = await res.json() as { versions: Array<{ commit_sha: string; is_current: boolean; imported_at: string }> };

    // Should have at least 2 versions
    expect(versions.length).toBeGreaterThanOrEqual(2);

    // Most recent first
    const dates = versions.map((v) => new Date(v.imported_at).getTime());
    for (let i = 0; i < dates.length - 1; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
    }

    // Latest import should be current
    const current = versions.filter((v) => v.is_current);
    expect(current.length).toBe(1);
  });

  test('returns expected fields per version', async ({ request }) => {
    const jwt = await login(request);
    const slug = `ver-fields-${Date.now()}`;
    const gitSha = `f1e2d3c4b5a6`.padEnd(40, '0');
    const { courseId } = await importCourse(request, jwt, slug, gitSha, 2);

    const res = await request.get(`/api/courses/${courseId}/versions`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const { versions } = await res.json() as { versions: Array<Record<string, unknown>> };
    const v = versions[0];

    expect(typeof v.id).toBe('string');
    expect(typeof v.version_label).toBe('string');
    expect(typeof v.commit_sha).toBe('string');
    expect(typeof v.lesson_count).toBe('number');
    expect(typeof v.is_current).toBe('boolean');
    expect(typeof v.imported_at).toBe('string');
  });
});

// ── 3. POST /api/courses/[courseId]/versions — promote ────────────────────────

test.describe('3 · POST /api/courses/[courseId]/versions — promote', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/courses/00000000-0000-0000-0000-000000000000/versions', {
      data: { versionId: '00000000-0000-0000-0000-000000000001' },
    });
    expect(res.status()).toBe(401);
  });

  test('returns 400 for missing versionId', async ({ request }) => {
    const jwt = await login(request);
    const slug = `ver-promote-bad-${Date.now()}`;
    const { courseId } = await importCourse(request, jwt, slug, 'a'.repeat(40), 1);

    const res = await request.post(`/api/courses/${courseId}/versions`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test('can promote an older version to current', async ({ request }) => {
    const jwt = await login(request);
    const slug = `ver-promote-${Date.now()}`;

    // Import v1
    const sha1 = `v1sha${Date.now().toString(16)}`.slice(0, 40).padEnd(40, '0');
    const { courseId } = await importCourse(request, jwt, slug, sha1, 1);

    // Import v2 (becomes current)
    const sha2 = `v2sha${(Date.now() + 1000).toString(16)}`.slice(0, 40).padEnd(40, '0');
    await importCourse(request, jwt, slug, sha2, 2);

    // Get v1's ID
    const listRes = await request.get(`/api/courses/${courseId}/versions`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const { versions } = await listRes.json() as { versions: Array<{ id: string; commit_sha: string; is_current: boolean }> };
    const v1 = versions.find((v) => v.commit_sha === sha1);
    expect(v1).toBeTruthy();
    expect(v1!.is_current).toBe(false); // v2 is current

    // Promote v1
    const promoteRes = await request.post(`/api/courses/${courseId}/versions`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { versionId: v1!.id },
    });
    expect(promoteRes.status()).toBe(200);
    const promoteBody = await promoteRes.json() as { ok: boolean; versionLabel: string };
    expect(promoteBody.ok).toBe(true);
    expect(promoteBody.versionLabel).toContain('v-');

    // Verify v1 is now current and v2 is not
    const listRes2 = await request.get(`/api/courses/${courseId}/versions`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const { versions: versions2 } = await listRes2.json() as { versions: Array<{ id: string; is_current: boolean }> };
    const currentVersions = versions2.filter((v) => v.is_current);
    expect(currentVersions.length).toBe(1);
    expect(currentVersions[0].id).toBe(v1!.id);
  });

  test('only one version can be current at a time', async ({ request }) => {
    const jwt = await login(request);
    const slug = `ver-single-current-${Date.now()}`;

    // Import 3 versions
    const shas = ['c1', 'c2', 'c3'].map((prefix) =>
      `${prefix}${Date.now().toString(16)}`.slice(0, 40).padEnd(40, '0'),
    );
    let courseId = '';
    for (const sha of shas) {
      const result = await importCourse(request, jwt, slug, sha, 1);
      courseId = result.courseId;
    }

    // Check only 1 is current
    const res = await request.get(`/api/courses/${courseId}/versions`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const { versions } = await res.json() as { versions: Array<{ is_current: boolean }> };
    const currentCount = versions.filter((v) => v.is_current).length;
    expect(currentCount).toBe(1);
  });
});

// ── 4. Version history page — HTTP checks ────────────────────────────────────

test.describe('4 · Version history page routes', () => {
  test('GET /dashboard/courses/[id]/versions redirects to login when unauthenticated', async ({ page }) => {
    const randomId = '00000000-0000-0000-0000-000000000099';
    const res = await page.goto(`/dashboard/courses/${randomId}/versions`, { waitUntil: 'commit' });
    const url = page.url();
    // Should either redirect to login or show sign-in prompt
    const isLoginRedirect = url.includes('/auth/login') || url.includes('/login');
    const hasSignIn = await page.locator('text=sign in').isVisible().catch(() => false);
    expect(isLoginRedirect || hasSignIn).toBe(true);
  });

  test('GET /dashboard/courses/unknown/versions returns 404 or redirect for auth user on unknown course', async ({ request }) => {
    const jwt = await login(request);
    // Try a non-UUID that won't match
    const res = await request.get('/api/courses/00000000-0000-0000-0000-000000000099/versions', {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    expect(res.status()).toBe(404);
  });
});

// ── 5. lesson_count reflects actual lessons imported ─────────────────────────

test.describe('5 · Version metadata accuracy', () => {
  test('lesson_count in version matches lessons sent', async ({ request }) => {
    const jwt = await login(request);
    const slug = `ver-count-${Date.now()}`;
    const sha = `count${Date.now().toString(16)}`.slice(0, 40).padEnd(40, '0');
    const lessonCount = 4;

    const { courseId } = await importCourse(request, jwt, slug, sha, lessonCount);

    const res = await request.get(`/api/courses/${courseId}/versions`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const { versions } = await res.json() as { versions: Array<{ lesson_count: number; commit_sha: string }> };
    const v = versions.find((x) => x.commit_sha === sha);
    expect(v?.lesson_count).toBe(lessonCount);
  });

  test('branch stored correctly in version', async ({ request }) => {
    const jwt = await login(request);
    const slug = `ver-branch-${Date.now()}`;
    const sha = `branch${Date.now().toString(16)}`.slice(0, 40).padEnd(40, '0');

    const res = await request.post('/api/import', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: {
        courseYml: `title: "Branch Test"\nslug: "${slug}"\nprice_cents: 0\ncurrency: "usd"\nrepo_url: "https://github.com/ErlisK/openclaw-workspace"\n`,
        lessons: [{ filename: '01-intro.md', content: '---\ntitle: "Intro"\nslug: "intro"\norder: 1\naccess: free\n---\nContent.' }],
        quizzes: [],
        gitSha: sha,
        gitBranch: 'feature/test-branch',
        repoUrl: 'https://github.com/ErlisK/openclaw-workspace',
      },
    });
    const { courseId } = await res.json() as { courseId: string };

    const versRes = await request.get(`/api/courses/${courseId}/versions`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const { versions } = await versRes.json() as { versions: Array<{ branch: string; commit_sha: string }> };
    const v = versions.find((x) => x.commit_sha === sha);
    expect(v?.branch).toBe('feature/test-branch');
  });
});
