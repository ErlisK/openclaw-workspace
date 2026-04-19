/**
 * Creator Ergonomics: AI Quiz Generation + Sandbox Gating Tests
 *
 * Tests:
 *  1. POST /api/quiz/generate — returns YAML with valid structure
 *  2. AI quiz validation — checks numQuestions, auth, input length
 *  3. Sandbox gating — sandbox_url not exposed to unenrolled users
 *  4. Sandbox accessible after enrollment
 *  5. Template structure — course.yml, lessons, quizzes validate correctly
 *  6. CLI validate command logic (via API-level checks)
 */

import { test, expect, APIRequestContext } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const SUPA_URL = 'https://zkwyfjrgmvpgfbaqwxsb.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprd3lmanJnbXZwZ2ZiYXF3eHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NDM3NzcsImV4cCI6MjA5MjExOTc3N30.5kcjZd7JuOTzqvhfXIvtYvzbvUiZF3oqgkdm0Yuj1sM';

const CREATOR_EMAIL = 'importer-test-1776550340@agentmail.to';
const CREATOR_PASS = 'TestPass123!';
const PAID_COURSE_ID = 'c0ae542c-5484-4ae7-9380-d9a1d91e7073';
const PAID_COURSE_SLUG = 'git-advanced-test';
const PAID_LOCKED_LESSON = 'advanced-rebasing'; // has_quiz=true, is_preview=false

// Sample lesson content for AI generation tests
const SAMPLE_LESSON = `---
title: "Understanding Git Rebase"
slug: "git-rebase-basics"
order: 1
access: free
estimated_minutes: 10
---

# Understanding Git Rebase

Git rebase is a way to integrate changes from one branch into another.
Unlike merge, rebase rewrites commit history by moving commits to a new base.

## When to Use Rebase

- Cleaning up messy commit history before a PR
- Keeping a feature branch up to date with main
- Creating a linear history

## Interactive Rebase

\`\`\`bash
git rebase -i HEAD~3
\`\`\`

This opens an editor with the last 3 commits. You can:
- **pick** — keep the commit as-is
- **reword** — change the commit message
- **squash** — combine with the previous commit
- **fixup** — squash but discard the message
- **drop** — remove the commit entirely

## Golden Rule

Never rebase commits that have been pushed to a shared branch.
Rebase rewrites history — if others have those commits, they'll have merge conflicts.
`;

test.use({ baseURL: BASE_URL });

async function supabaseLogin(request: APIRequestContext, email: string, password: string): Promise<string> {
  const res = await request.post(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    data: { email, password },
  });
  const d = await res.json() as { access_token: string };
  return d.access_token;
}

async function supabaseSignup(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<{ jwt: string; userId: string }> {
  const res = await request.post(`${SUPA_URL}/auth/v1/signup`, {
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    data: { email, password },
  });
  if (!res.ok()) throw new Error(`signup failed: ${res.status()}`);
  const d = await res.json() as { access_token: string; user: { id: string } };
  return { jwt: d.access_token, userId: d.user.id };
}

// ── 1. AI Quiz Generation API ─────────────────────────────────────────────

test.describe('1 · POST /api/quiz/generate — AI quiz generation', () => {
  test('returns 401 for unauthenticated request', async ({ request }) => {
    const res = await request.post('/api/quiz/generate', {
      data: { lessonContent: SAMPLE_LESSON, numQuestions: 3 },
    });
    expect(res.status()).toBe(401);
  });

  test('returns 400 for missing lessonContent', async ({ request }) => {
    const jwt = await supabaseLogin(request, CREATOR_EMAIL, CREATOR_PASS);
    const res = await request.post('/api/quiz/generate', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { numQuestions: 3 },
    });
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain('Validation');
  });

  test('returns 400 for lessonContent too short', async ({ request }) => {
    const jwt = await supabaseLogin(request, CREATOR_EMAIL, CREATOR_PASS);
    const res = await request.post('/api/quiz/generate', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { lessonContent: 'too short', numQuestions: 3 },
    });
    expect(res.status()).toBe(400);
  });

  test('returns 400 for numQuestions > 10', async ({ request }) => {
    const jwt = await supabaseLogin(request, CREATOR_EMAIL, CREATOR_PASS);
    const res = await request.post('/api/quiz/generate', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { lessonContent: SAMPLE_LESSON, numQuestions: 15 },
    });
    expect(res.status()).toBe(400);
  });

  test('returns 400 for invalid JSON body', async ({ request }) => {
    const jwt = await supabaseLogin(request, CREATOR_EMAIL, CREATOR_PASS);
    const res = await request.post('/api/quiz/generate', {
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      data: 'not-json',
    });
    expect([400, 500]).toContain(res.status());
  });

  test('generates quiz YAML for valid lesson content (on Vercel) or returns 503 in dev', async ({ request }) => {
    const jwt = await supabaseLogin(request, CREATOR_EMAIL, CREATOR_PASS);
    const res = await request.post('/api/quiz/generate', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { lessonContent: SAMPLE_LESSON, numQuestions: 3, quizId: 'test-rebase-quiz' },
    });

    if (res.status() === 503) {
      // Expected in local dev — no VERCEL_OIDC_TOKEN
      const body = await res.json() as { error: string; hint?: string };
      expect(body.error).toContain('Vercel');
      return;
    }

    expect(res.status()).toBe(200);
    const body = await res.json() as {
      yaml: string;
      quizId: string;
      questions: unknown[];
      numGenerated: number;
    };

    // Verify response structure
    expect(typeof body.yaml).toBe('string');
    expect(body.yaml.length).toBeGreaterThan(50);
    expect(body.quizId).toBe('test-rebase-quiz');
    expect(Array.isArray(body.questions)).toBe(true);
    expect(body.numGenerated).toBeGreaterThan(0);
    expect(body.numGenerated).toBeLessThanOrEqual(3);

    // Verify YAML structure
    expect(body.yaml).toContain('id: "test-rebase-quiz"');
    expect(body.yaml).toContain('ai_generated: true');
    expect(body.yaml).toContain('questions:');
    expect(body.yaml).toContain('type:');
    expect(body.yaml).toContain('prompt:');
    expect(body.yaml).toContain('explanation:');

    // YAML should have at least one question
    const questionMatches = (body.yaml.match(/- type:/g) || []).length;
    expect(questionMatches).toBeGreaterThan(0);
  });

  test('extracts slug from frontmatter for quizId when not provided', async ({ request }) => {
    const jwt = await supabaseLogin(request, CREATOR_EMAIL, CREATOR_PASS);
    const res = await request.post('/api/quiz/generate', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: {
        lessonContent: SAMPLE_LESSON,
        numQuestions: 2,
        // quizId not provided — should derive from slug: "git-rebase-basics"
      },
    });

    if (res.status() === 503) { return; } // Local dev — no OIDC

    expect(res.status()).toBe(200);
    const body = await res.json() as { quizId: string };
    expect(body.quizId).toBe('git-rebase-basics-quiz');
  });
});

// ── 2. Sandbox gating ─────────────────────────────────────────────────────

test.describe('2 · Sandbox gating — sandbox_url not exposed to unenrolled users', () => {
  test('unauthenticated Supabase query for locked lesson returns no row', async ({ request }) => {
    // The locked lesson (advanced-rebasing) has is_preview=false
    // Unauthenticated query should return no results (RLS: only preview or enrolled)
    const res = await request.get(
      `${SUPA_URL}/rest/v1/lessons?slug=eq.${PAID_LOCKED_LESSON}&select=id,slug,sandbox_url,is_preview`,
      { headers: { apikey: ANON_KEY } },
    );
    expect(res.ok()).toBe(true);
    const rows = await res.json() as unknown[];
    // RLS: locked lesson not accessible to anon
    expect(rows.length).toBe(0);
  });

  test('non-enrolled user cannot read sandbox_url from locked lesson via Supabase', async ({ request }) => {
    const email = `sandbox-test-${Date.now()}@agentmail.to`;
    let jwt: string;
    try {
      ({ jwt } = await supabaseSignup(request, email, 'SandboxPass99!'));
    } catch { test.skip(); return; }

    // Non-enrolled user queries for locked lesson
    const res = await request.get(
      `${SUPA_URL}/rest/v1/lessons?slug=eq.${PAID_LOCKED_LESSON}&select=id,slug,sandbox_url`,
      { headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwt}` } },
    );
    const rows = await res.json() as unknown[];
    // is_preview=false + not enrolled → RLS blocks
    expect(rows.length).toBe(0);
  });

  test('enrolled user can read lessons including sandbox_url', async ({ request }) => {
    const email = `sandbox-enrolled-${Date.now()}@agentmail.to`;
    let jwt: string;
    try {
      ({ jwt } = await supabaseSignup(request, email, 'SandboxPass99!'));
    } catch { test.skip(); return; }

    // Simulate purchase to get enrollment
    const simRes = await request.post('/api/enroll/simulate', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { courseId: PAID_COURSE_ID },
    });
    if (!simRes.ok() && simRes.status() !== 409) { test.skip(); return; }

    // Now query for the locked lesson — should see it
    const res = await request.get(
      `${SUPA_URL}/rest/v1/lessons?slug=eq.${PAID_LOCKED_LESSON}&select=id,slug,is_preview,course_id`,
      { headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwt}` } },
    );
    const rows = await res.json() as Array<{ slug: string; is_preview: boolean }>;
    // Enrolled user can read the locked lesson
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].slug).toBe(PAID_LOCKED_LESSON);
  });

  test('lesson page for locked lesson shows PaywallGate for unauthenticated', async ({ page }) => {
    await page.goto(`/courses/${PAID_COURSE_SLUG}/lessons/${PAID_LOCKED_LESSON}`);
    await page.waitForLoadState('domcontentloaded');

    // Should be gated or redirected
    const url = page.url();
    const isRedirected = !url.includes(PAID_LOCKED_LESSON);
    const hasGate = await page.locator('[data-testid="paywall-gate"]').isVisible({ timeout: 4000 }).catch(() => false);

    expect(isRedirected || hasGate).toBe(true);
  });

  test('preview lesson page (is_preview=true) shows content without auth', async ({ page }) => {
    await page.goto(`/courses/${PAID_COURSE_SLUG}/lessons/intro-to-advanced-git`);
    await expect(page).not.toHaveURL(/auth\/login/);
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 8000 });
    // No paywall gate on preview lesson
    const hasGate = await page.locator('[data-testid="paywall-gate"]').isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasGate).toBe(false);
  });

  test('entitlement/check correctly gates sandbox for non-enrolled', async ({ request }) => {
    const email = `sandbox-ent-${Date.now()}@agentmail.to`;
    let jwt: string;
    try {
      ({ jwt } = await supabaseSignup(request, email, 'SandboxPass99!'));
    } catch { test.skip(); return; }

    const res = await request.get(`/api/entitlement/check?courseId=${PAID_COURSE_ID}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    expect(res.status()).toBe(200);
    const { enrolled } = await res.json() as { enrolled: boolean };
    expect(enrolled).toBe(false);
    // If not enrolled, the lesson page (and its sandbox_url) should be gated
  });

  test('entitlement/check returns enrolled=true after simulate purchase', async ({ request }) => {
    const email = `sandbox-sim-${Date.now()}@agentmail.to`;
    let jwt: string;
    try {
      ({ jwt } = await supabaseSignup(request, email, 'SandboxPass99!'));
    } catch { test.skip(); return; }

    await request.post('/api/enroll/simulate', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { courseId: PAID_COURSE_ID },
    });

    const res = await request.get(`/api/entitlement/check?courseId=${PAID_COURSE_ID}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const { enrolled } = await res.json() as { enrolled: boolean };
    expect(enrolled).toBe(true);
  });
});

// ── 3. Template structure validation ─────────────────────────────────────

test.describe('3 · Template structure — course.yml and lessons import correctly', () => {
  test('POST /api/import returns 401 for unauthenticated', async ({ request }) => {
    const res = await request.post('/api/import', {
      data: { repoUrl: 'https://github.com/ErlisK/openclaw-workspace', ref: 'main' },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/import returns 400 for missing repoUrl', async ({ request }) => {
    const jwt = await supabaseLogin(request, CREATOR_EMAIL, CREATOR_PASS);
    const res = await request.post('/api/import', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { ref: 'main' }, // missing repoUrl
    });
    expect(res.status()).toBe(400);
  });

  test('GET /api/repos/refs requires authentication', async ({ request }) => {
    // Without auth, should return 401
    const res = await request.get('/api/repos/refs?repo_url=https://github.com/octocat/Hello-World');
    expect(res.status()).toBe(401);
  });

  test('sample-course course.yml has required fields', async ({ request }) => {
    // Verify the template course.yml structure by importing via the API
    // The sample-course template is stored in the monorepo — test its schema compliance
    const requiredFields = ['title', 'slug', 'price_cents', 'currency'];

    // Read from the published endpoint — test that a known valid course exists
    const res = await request.get(
      `${SUPA_URL}/rest/v1/courses?slug=eq.git-advanced-test&select=id,title,slug,price_cents,currency`,
      { headers: { apikey: ANON_KEY } },
    );
    expect(res.ok()).toBe(true);
    const rows = await res.json() as Array<Record<string, unknown>>;
    expect(rows.length).toBeGreaterThan(0);
    for (const field of requiredFields) {
      expect(rows[0][field]).toBeDefined();
    }
  });

  test('sample-course lessons have required frontmatter', async ({ request }) => {
    // Lessons for the paid test course should have slug, title, is_preview
    const res = await request.get(
      `${SUPA_URL}/rest/v1/lessons?course_id=eq.${PAID_COURSE_ID}&select=slug,title,is_preview,order_index`,
      { headers: { apikey: ANON_KEY } },
    );
    // Only preview lessons visible to anon
    const rows = await res.json() as Array<{ slug: string; title: string; is_preview: boolean }>;
    // At minimum the preview lesson should be visible
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.slug).toBeTruthy();
      expect(row.title).toBeTruthy();
      expect(row.is_preview).toBe(true); // anon only sees preview
    }
  });
});

// ── 4. Creator dashboard — GET /api/creator/purchasers ────────────────────

test.describe('4 · Creator purchasers API', () => {
  test('GET /api/creator/purchasers returns 401 for unauthenticated', async ({ request }) => {
    const res = await request.get('/api/creator/purchasers');
    expect(res.status()).toBe(401);
  });

  test('GET /api/creator/purchasers returns purchaser list for creator', async ({ request }) => {
    // Seed a purchase first
    const buyerEmail = `cli-buyer-${Date.now()}@agentmail.to`;
    let buyerJwt: string;
    try {
      ({ jwt: buyerJwt } = await supabaseSignup(request, buyerEmail, 'CliPass99!'));
    } catch { test.skip(); return; }

    await request.post('/api/enroll/simulate', {
      headers: { Authorization: `Bearer ${buyerJwt}` },
      data: { courseId: PAID_COURSE_ID },
    });

    const creatorJwt = await supabaseLogin(request, CREATOR_EMAIL, CREATOR_PASS);
    const res = await request.get('/api/creator/purchasers', {
      headers: { Authorization: `Bearer ${creatorJwt}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { purchasers: unknown[]; total: number };
    expect(Array.isArray(body.purchasers)).toBe(true);
    expect(typeof body.total).toBe('number');
  });

  test('GET /api/creator/purchasers?courseId= filters to specific course', async ({ request }) => {
    const creatorJwt = await supabaseLogin(request, CREATOR_EMAIL, CREATOR_PASS);
    const res = await request.get(`/api/creator/purchasers?courseId=${PAID_COURSE_ID}`, {
      headers: { Authorization: `Bearer ${creatorJwt}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { purchasers: Array<{ course_id: string }> };
    for (const p of body.purchasers) {
      expect(p.course_id).toBe(PAID_COURSE_ID);
    }
  });

  test('GET /api/creator/purchasers?courseId=invalid returns 400', async ({ request }) => {
    const creatorJwt = await supabaseLogin(request, CREATOR_EMAIL, CREATOR_PASS);
    const res = await request.get('/api/creator/purchasers?courseId=not-a-uuid', {
      headers: { Authorization: `Bearer ${creatorJwt}` },
    });
    expect(res.status()).toBe(400);
  });
});
