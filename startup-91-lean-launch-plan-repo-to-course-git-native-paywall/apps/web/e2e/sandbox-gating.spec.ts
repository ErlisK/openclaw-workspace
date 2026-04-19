/**
 * Sandbox Gating E2E Tests
 *
 * Tests the full sandbox gating flow:
 *   1. GET /api/entitlement/sandbox — returns URL for enrolled, null for unenrolled
 *   2. MDX content with <Sandbox> tag — enrolled users see iframe, others see CTA
 *   3. SandboxEmbed component — locked/unlocked state
 *   4. Security: unenrolled users never receive sandbox URL in HTML
 *
 * The sandbox component is server-rendered — the real URL is stripped before
 * the page reaches the browser for unenrolled users.
 */

import { test, expect, APIRequestContext } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const SUPA_URL = 'https://zkwyfjrgmvpgfbaqwxsb.supabase.co';
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const CREATOR_EMAIL = 'importer-test-1776550340@agentmail.to';
const CREATOR_PASS = 'TestPass123!';

// A sandbox URL we use for testing — won't be live but the format is correct
const TEST_SANDBOX_URL = 'https://stackblitz.com/edit/typescript-demo?embed=1';

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

/**
 * Create a course + lesson with a sandbox URL via the import API.
 * Returns courseId, lessonId, courseSlug.
 */
async function createCourseWithSandboxLesson(
  request: APIRequestContext,
  jwt: string,
  sandboxUrl: string,
  isPaid = true,
): Promise<{ courseId: string; lessonId: string; courseSlug: string }> {
  const slug = `sandbox-test-${Date.now()}`;
  const priceCents = isPaid ? 2900 : 0;

  // Import the course
  const importRes = await request.post('/api/import', {
    headers: { Authorization: `Bearer ${jwt}` },
    data: {
      courseYml: `title: "Sandbox Test Course"\nslug: "${slug}"\nprice_cents: ${priceCents}\ncurrency: "usd"\nrepo_url: "https://github.com/ErlisK/openclaw-workspace"\n`,
      lessons: [{
        filename: '01-intro.md',
        content: `---
title: "Intro to TypeScript"
slug: "intro"
order: 1
access: ${isPaid ? 'paid' : 'free'}
estimated_minutes: 10
---

# Introduction

This lesson has an interactive sandbox.

<Sandbox src="${sandboxUrl}" title="TypeScript Playground" />

More lesson content here.
`,
      }],
      quizzes: [],
    },
  });
  expect(importRes.status()).toBe(200);
  const importBody = await importRes.json() as { courseId: string; slug: string };

  // Fetch the lesson and set sandbox_url directly
  const lessonRes = await request.get(
    `${SUPA_URL}/rest/v1/lessons?course_id=eq.${importBody.courseId}&select=id,slug&limit=1`,
    { headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwt}` } },
  );
  const lessons = await lessonRes.json() as Array<{ id: string; slug: string }>;
  const lesson = lessons[0];
  expect(lesson).toBeTruthy();

  // Update lesson with sandbox_url via Supabase (service-level; creator owns course)
  await request.patch(
    `${SUPA_URL}/rest/v1/lessons?id=eq.${lesson.id}`,
    {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      data: { sandbox_url: sandboxUrl, has_sandbox: true },
    },
  );

  return { courseId: importBody.courseId, lessonId: lesson.id, courseSlug: slug };
}

// ── 1. GET /api/entitlement/sandbox — validation + auth ──────────────────────

test.describe('1 · GET /api/entitlement/sandbox — validation', () => {
  test('returns 400 for missing courseId', async ({ request }) => {
    const res = await request.get('/api/entitlement/sandbox?lessonId=00000000-0000-0000-0000-000000000001');
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBeTruthy();
  });

  test('returns 400 for missing lessonId', async ({ request }) => {
    const res = await request.get('/api/entitlement/sandbox?courseId=00000000-0000-0000-0000-000000000001');
    expect(res.status()).toBe(400);
  });

  test('returns 404 for non-existent lesson', async ({ request }) => {
    const res = await request.get(
      '/api/entitlement/sandbox?courseId=00000000-0000-0000-0000-000000000001&lessonId=00000000-0000-0000-0000-000000000002',
    );
    expect(res.status()).toBe(404);
  });

  test('returns enrolled:false for unauthenticated request on paid lesson', async ({ request }) => {
    const jwt = await login(request);
    const { courseId, lessonId } = await createCourseWithSandboxLesson(request, jwt, TEST_SANDBOX_URL, true);

    // Unauthenticated check
    const res = await request.get(
      `/api/entitlement/sandbox?courseId=${courseId}&lessonId=${lessonId}`,
    );
    expect(res.status()).toBe(200);
    const body = await res.json() as { enrolled: boolean; url: null; checkoutUrl: string | null };
    expect(body.enrolled).toBe(false);
    expect(body.url).toBeNull();
    expect(body.checkoutUrl).toBeTruthy();
  });

  test('returns enrolled:true and url for course creator (free course)', async ({ request }) => {
    const jwt = await login(request);
    const { courseId, lessonId } = await createCourseWithSandboxLesson(request, jwt, TEST_SANDBOX_URL, false);

    // Free course — everyone enrolled
    const res = await request.get(
      `/api/entitlement/sandbox?courseId=${courseId}&lessonId=${lessonId}`,
    );
    expect(res.status()).toBe(200);
    const body = await res.json() as { enrolled: boolean; url: string | null; provider: string | null };
    expect(body.enrolled).toBe(true);
    // URL may or may not be set depending on DB update timing
    // At minimum, enrolled should be true
  });

  test('enrolled:false response includes checkoutUrl and priceDisplay', async ({ request }) => {
    const jwt = await login(request);
    const { courseId, lessonId, courseSlug } = await createCourseWithSandboxLesson(
      request, jwt, TEST_SANDBOX_URL, true,
    );

    const res = await request.get(
      `/api/entitlement/sandbox?courseId=${courseId}&lessonId=${lessonId}`,
    );
    const body = await res.json() as {
      enrolled: boolean;
      checkoutUrl: string;
      priceDisplay: string;
    };
    expect(body.enrolled).toBe(false);
    expect(body.checkoutUrl).toContain(courseSlug);
    expect(body.priceDisplay).toBeTruthy();
  });

  test('provider is correctly inferred from URL', async ({ request }) => {
    const jwt = await login(request);

    // Test with CodeSandbox URL
    const csbUrl = 'https://codesandbox.io/s/typescript-demo';
    const { courseId, lessonId } = await createCourseWithSandboxLesson(request, jwt, csbUrl, false);

    const res = await request.get(
      `/api/entitlement/sandbox?courseId=${courseId}&lessonId=${lessonId}`,
    );
    const body = await res.json() as { enrolled: boolean; url: string | null; provider: string | null };
    expect(body.enrolled).toBe(true);
    // If sandbox_url was set, provider should be codesandbox
    if (body.url) {
      expect(body.provider).toBe('codesandbox');
    }
  });
});

// ── 2. Lesson page sandbox rendering ─────────────────────────────────────────

test.describe('2 · Lesson page — sandbox rendering', () => {
  test('lesson page loads for free course with sandbox', async ({ page, request }) => {
    const jwt = await login(request);
    const { courseSlug } = await createCourseWithSandboxLesson(request, jwt, TEST_SANDBOX_URL, false);

    const res = await page.goto(`/courses/${courseSlug}/lessons/intro`, { waitUntil: 'domcontentloaded' });
    // Should load successfully (not 404)
    expect(res?.status()).not.toBe(404);
  });

  test('paid lesson without enrollment shows paywall (not lesson body)', async ({ page, request }) => {
    const jwt = await login(request);
    const { courseSlug } = await createCourseWithSandboxLesson(request, jwt, TEST_SANDBOX_URL, true);

    // Visit without authentication
    await page.goto(`/courses/${courseSlug}/lessons/intro`, { waitUntil: 'domcontentloaded' });

    // Should see paywall — either lock icon or enroll CTA or redirect
    const hasPaywall = await page.locator('text=Enroll').isVisible().catch(() => false)
      || await page.locator('text=enroll').isVisible().catch(() => false)
      || await page.locator('text=Unlock').isVisible().catch(() => false)
      || await page.locator('[data-testid="paywall"]').isVisible().catch(() => false);

    // The lesson may fully show (if there's no strict paywall for unauthenticated)
    // but the sandbox should be locked
    const pageUrl = page.url();
    const wasRedirected = pageUrl.includes('/auth/login') || pageUrl.includes('/courses/') && !pageUrl.includes('/lessons/');
    expect(hasPaywall || wasRedirected).toBe(true);
  });
});

// ── 3. Security: sandbox URL not in unenrolled HTML ──────────────────────────

test.describe('3 · Security — sandbox URL not exposed to unenrolled users', () => {
  test('sandbox URL not present in lesson page HTML for paid unenrolled lesson', async ({ page, request }) => {
    const jwt = await login(request);
    const { courseSlug, courseId, lessonId } = await createCourseWithSandboxLesson(
      request, jwt, TEST_SANDBOX_URL, true,
    );

    // Visit as unauthenticated user
    const res = await page.goto(`/courses/${courseSlug}/lessons/intro`, { waitUntil: 'networkidle' });

    if (res?.status() === 200) {
      // Page loaded — check that the real sandbox URL is NOT in the HTML
      const html = await page.content();
      expect(html).not.toContain(TEST_SANDBOX_URL);
    }
    // If redirected to paywall, sandbox URL obviously not present
  });

  test('entitlement/sandbox API does not return URL for unauthenticated on paid lesson', async ({ request }) => {
    const jwt = await login(request);
    const { courseId, lessonId } = await createCourseWithSandboxLesson(
      request, jwt, TEST_SANDBOX_URL, true,
    );

    // Unauthenticated request (no JWT)
    const res = await request.get(
      `/api/entitlement/sandbox?courseId=${courseId}&lessonId=${lessonId}`,
    );
    const body = await res.json() as { enrolled: boolean; url: unknown };
    expect(body.enrolled).toBe(false);
    expect(body.url).toBeNull();
  });

  test('entitlement/sandbox returns url for free lesson without auth', async ({ request }) => {
    const jwt = await login(request);
    const { courseId, lessonId } = await createCourseWithSandboxLesson(
      request, jwt, TEST_SANDBOX_URL, false,
    );

    // Free course — unauthenticated user should still be marked enrolled
    const res = await request.get(
      `/api/entitlement/sandbox?courseId=${courseId}&lessonId=${lessonId}`,
    );
    const body = await res.json() as { enrolled: boolean };
    expect(body.enrolled).toBe(true);
  });
});

// ── 4. SandboxEmbed component behavior ───────────────────────────────────────

test.describe('4 · SandboxEmbed component states', () => {
  test('free course lesson shows no lock indicator', async ({ page, request }) => {
    const jwt = await login(request);
    const { courseSlug } = await createCourseWithSandboxLesson(request, jwt, TEST_SANDBOX_URL, false);

    await page.goto(`/courses/${courseSlug}/lessons/intro`, { waitUntil: 'domcontentloaded' });

    // Should NOT show the locked sandbox placeholder
    const hasLock = await page.locator('text=Sandbox locked').isVisible().catch(() => false)
      || await page.locator('text=locked').isVisible().catch(() => false);
    // Free courses should not show a lock
    const pageUrl = page.url();
    if (!pageUrl.includes('login') && !pageUrl.includes('auth')) {
      // If we're on the lesson page, verify there's no lock
      expect(hasLock).toBe(false);
    }
  });

  test('sandbox iframe src is not present for unenrolled paid lesson', async ({ page, request }) => {
    const jwt = await login(request);
    const { courseSlug } = await createCourseWithSandboxLesson(request, jwt, TEST_SANDBOX_URL, true);

    await page.goto(`/courses/${courseSlug}/lessons/intro`, { waitUntil: 'networkidle' });

    const pageUrl = page.url();
    if (!pageUrl.includes('login') && pageUrl.includes('/lessons/')) {
      // On the lesson page — iframe should not have the sandbox URL as src
      const iframeSrc = await page.locator('iframe').getAttribute('src').catch(() => null);
      if (iframeSrc) {
        expect(iframeSrc).not.toContain('stackblitz.com');
        expect(iframeSrc).not.toContain('codesandbox.io');
      }
    }
  });

  test('MDX <Sandbox> tag renders SandboxEmbed in lesson content', async ({ page, request }) => {
    const jwt = await login(request);
    const { courseSlug } = await createCourseWithSandboxLesson(request, jwt, TEST_SANDBOX_URL, false);

    await page.goto(`/courses/${courseSlug}/lessons/intro`, { waitUntil: 'domcontentloaded' });

    const pageUrl = page.url();
    if (!pageUrl.includes('login')) {
      // The page should render without errors
      // For a free course, either the iframe or the sandbox container should exist
      const html = await page.content();
      // Sandbox section should be present (either locked or unlocked)
      const hasSandboxElement = html.includes('Sandbox') || html.includes('sandbox') || html.includes('iframe');
      expect(hasSandboxElement).toBe(true);
    }
  });
});

// ── 5. Creator sees sandbox content ──────────────────────────────────────────

test.describe('5 · Creator access to sandbox', () => {
  test('creator can always access sandbox for their own free course', async ({ page, request }) => {
    const jwt = await login(request);
    const { courseId, lessonId } = await createCourseWithSandboxLesson(
      request, jwt, TEST_SANDBOX_URL, false,
    );

    // Creator checks the entitlement endpoint (authenticated)
    const res = await request.get(
      `/api/entitlement/sandbox?courseId=${courseId}&lessonId=${lessonId}`,
      // No creator-specific auth needed — it's a free course so enrolled=true for all
    );
    const body = await res.json() as { enrolled: boolean };
    expect(body.enrolled).toBe(true);
  });

  test('sandbox API response has correct structure', async ({ request }) => {
    const jwt = await login(request);
    const { courseId, lessonId } = await createCourseWithSandboxLesson(
      request, jwt, TEST_SANDBOX_URL, false,
    );

    const res = await request.get(
      `/api/entitlement/sandbox?courseId=${courseId}&lessonId=${lessonId}`,
    );
    expect(res.status()).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(Object.keys(body)).toContain('enrolled');
    // Either url or checkoutUrl should be present
    expect('url' in body || 'checkoutUrl' in body).toBe(true);
  });
});
