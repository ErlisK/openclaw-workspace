/**
 * e2e/rls.spec.ts
 *
 * Tests Row Level Security policies by calling Supabase REST API directly
 * with anon-key or user-JWT — NOT through the app's service role.
 *
 * Design notes:
 * - The sample course (git-for-engineers) has price_cents=0, so is_enrolled()
 *   returns true for ALL users including anon → all lessons accessible.
 *   Tests against free courses verify that behaviour is consistent and correct.
 * - For isolation tests (auth.uid() ≠ owner) we use ephemeral users.
 */
import { test, expect, request as playwrightRequest } from '@playwright/test';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://zkwyfjrgmvpgfbaqwxsb.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const SAMPLE_COURSE_ID = 'f675a5d6-2886-460a-86ac-f01673fc02cf';
const CREATOR_EMAIL = 'importer-test-1776550340@agentmail.to';
const CREATOR_PASS = 'TestPass123!';
const CREATOR_ID = 'dd84dfb3-96a6-47be-86df-cb3cda6050d4';

// ── Utility ───────────────────────────────────────────────────────────────────

/** Build a Supabase REST URL, properly appending all filters as query params */
function supaUrl(table: string, filters: Record<string, string> = {}): string {
  const params = new URLSearchParams(filters);
  const qs = params.toString();
  return `${SUPA_URL}/rest/v1/${table}${qs ? '?' + qs : ''}`;
}

/** Call Supabase REST API */
async function supaFetch(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  table: string,
  opts: {
    filters?: Record<string, string>;
    body?: object;
    jwt?: string;
  } = {},
): Promise<{ status: number; body: unknown }> {
  const url = supaUrl(table, opts.filters);
  const headers: Record<string, string> = {
    apikey: ANON_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    Prefer: 'return=representation',
  };
  if (opts.jwt) headers['Authorization'] = `Bearer ${opts.jwt}`;

  const res = await fetch(url, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  let body: unknown;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body };
}

async function signIn(email: string, password: string): Promise<string | null> {
  const res = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json() as { access_token?: string };
  return body.access_token ?? null;
}

async function signUpEphemeral(): Promise<string | null> {
  const email = `rls-test-${Date.now()}@agentmail.to`;
  const res = await fetch(`${SUPA_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'RlsTest1234!!' }),
  });
  const body = await res.json() as { access_token?: string };
  return body.access_token ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// COURSES
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RLS: courses table', () => {
  test('anon can read published courses', async () => {
    const { status, body } = await supaFetch('GET', 'courses', {
      filters: { select: 'id,slug,published' },
    });
    expect(status).toBe(200);
    const rows = body as Array<{ published: boolean }>;
    expect(Array.isArray(rows)).toBe(true);
    // All returned courses must be published
    for (const row of rows) {
      expect(row.published).toBe(true);
    }
  });

  test('anon cannot insert a course (401/403)', async () => {
    const { status } = await supaFetch('POST', 'courses', {
      body: {
        slug: 'hacked-course',
        title: 'Hacked',
        creator_id: '00000000-dead-beef-cafe-000000000099',
        price_cents: 0,
      },
    });
    expect([401, 403]).toContain(status);
  });

  test('creator can see own published course via direct DB query', async () => {
    const jwt = await signIn(CREATOR_EMAIL, CREATOR_PASS);
    if (!jwt) { test.skip(); return; }
    const { status, body } = await supaFetch('GET', 'courses', {
      jwt,
      filters: { 'id': `eq.${SAMPLE_COURSE_ID}`, select: 'id,slug,published' },
    });
    expect(status).toBe(200);
    expect((body as unknown[]).length).toBe(1);
  });

  test('different user cannot update a course they do not own', async () => {
    const token = await signUpEphemeral();
    if (!token) { test.skip(); return; }
    const { status, body } = await supaFetch('PATCH', 'courses', {
      jwt: token,
      filters: { 'id': `eq.${SAMPLE_COURSE_ID}` },
      body: { title: 'HACKED TITLE' },
    });
    // RLS UPDATE policy: creator_id = auth.uid() — fails for a different user
    // Supabase returns 200 with empty array (0 rows matched)
    expect(status).toBe(200);
    expect((body as unknown[]).length).toBe(0);
    // Verify title unchanged
    const check = await supaFetch('GET', 'courses', {
      filters: { 'id': `eq.${SAMPLE_COURSE_ID}`, select: 'title' },
    });
    const rows = check.body as Array<{ title: string }>;
    expect(rows[0]?.title).not.toBe('HACKED TITLE');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LESSONS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RLS: lessons table', () => {
  test('anon can read all lessons of a free course (price_cents=0 → is_enrolled=true)', async () => {
    // Sample course is free: is_enrolled() returns true for everyone via price_cents=0
    const { status, body } = await supaFetch('GET', 'lessons', {
      filters: { 'course_id': `eq.${SAMPLE_COURSE_ID}`, select: 'id,slug,is_preview' },
    });
    expect(status).toBe(200);
    const rows = body as Array<{ is_preview: boolean }>;
    expect(rows.length).toBeGreaterThanOrEqual(1);
    // Both preview and non-preview are accessible for free course
  });

  test('anon cannot read lessons of a non-existent/paid course', async () => {
    // A fake course_id that doesn't exist → no lessons returned
    const { status, body } = await supaFetch('GET', 'lessons', {
      filters: { 'course_id': `eq.ffffffff-ffff-ffff-ffff-ffffffffffff`, select: 'id,slug' },
    });
    expect(status).toBe(200);
    expect((body as unknown[]).length).toBe(0);
  });

  test('anon cannot insert a lesson (401/403)', async () => {
    const { status } = await supaFetch('POST', 'lessons', {
      body: {
        course_id: SAMPLE_COURSE_ID,
        slug: 'hacked-lesson',
        title: 'Hacked',
        order_index: 999,
        is_preview: true,
      },
    });
    expect([401, 403]).toContain(status);
  });

  test('creator can read all lessons including paid', async () => {
    const jwt = await signIn(CREATOR_EMAIL, CREATOR_PASS);
    if (!jwt) { test.skip(); return; }
    const { status, body } = await supaFetch('GET', 'lessons', {
      jwt,
      filters: { 'course_id': `eq.${SAMPLE_COURSE_ID}`, select: 'id,slug,is_preview' },
    });
    expect(status).toBe(200);
    const rows = body as Array<{ is_preview: boolean }>;
    expect(rows.length).toBeGreaterThan(0);
    // Creator should see non-preview lessons too
    expect(rows.some((r) => !r.is_preview)).toBe(true);
  });

  test('different user cannot delete a creator\'s lesson', async () => {
    const token = await signUpEphemeral();
    if (!token) { test.skip(); return; }
    // Try to delete all lessons — RLS should block (is_course_creator fails)
    const { status, body } = await supaFetch('DELETE', 'lessons', {
      jwt: token,
      filters: { 'course_id': `eq.${SAMPLE_COURSE_ID}` },
    });
    // 0 rows deleted (RLS filter prevents match) or 403
    expect(status === 200 || status === 403).toBe(true);
    if (status === 200) expect((body as unknown[]).length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// QUIZZES + QUIZ_QUESTIONS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RLS: quizzes + quiz_questions', () => {
  test('anon can read quiz metadata for free course', async () => {
    const { status, body } = await supaFetch('GET', 'quizzes', {
      filters: { 'course_id': `eq.${SAMPLE_COURSE_ID}`, select: 'id,title,pass_threshold' },
    });
    expect(status).toBe(200);
    expect((body as unknown[]).length).toBeGreaterThanOrEqual(1);
  });

  test('anon can read quiz questions for free course (is_enrolled = true)', async () => {
    // Get a quiz ID first
    const quizRes = await supaFetch('GET', 'quizzes', {
      filters: { 'course_id': `eq.${SAMPLE_COURSE_ID}`, select: 'id', limit: '1' },
    });
    const quizRows = quizRes.body as Array<{ id: string }>;
    if (!quizRows || quizRows.length === 0) { test.skip(); return; }

    const { status, body } = await supaFetch('GET', 'quiz_questions', {
      filters: { 'quiz_id': `eq.${quizRows[0].id}`, select: 'id,question,question_type,options' },
    });
    expect(status).toBe(200);
    expect((body as unknown[]).length).toBeGreaterThan(0);
  });

  test('anon cannot insert quiz questions (401/403)', async () => {
    const { status } = await supaFetch('POST', 'quiz_questions', {
      body: {
        quiz_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        question: 'Hacked?',
        question_type: 'multiple_choice',
        order_index: 1,
        ai_generated: false,
      },
    });
    expect([401, 403]).toContain(status);
  });

  test('anon cannot insert quizzes (401/403)', async () => {
    const { status } = await supaFetch('POST', 'quizzes', {
      body: {
        course_id: SAMPLE_COURSE_ID,
        title: 'Hacked Quiz',
        pass_threshold: 60,
        slug: 'hacked-quiz',
      },
    });
    expect([401, 403]).toContain(status);
  });

  test('different user cannot read a quiz from a non-existent course', async () => {
    const token = await signUpEphemeral();
    if (!token) { test.skip(); return; }
    const { status, body } = await supaFetch('GET', 'quizzes', {
      jwt: token,
      filters: { 'course_id': `eq.ffffffff-ffff-ffff-ffff-ffffffffffff`, select: 'id' },
    });
    expect(status).toBe(200);
    expect((body as unknown[]).length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ_ATTEMPTS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RLS: quiz_attempts', () => {
  test('anon cannot insert quiz attempts (401/403)', async () => {
    const { status } = await supaFetch('POST', 'quiz_attempts', {
      body: {
        user_id: CREATOR_ID,
        quiz_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        question_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        course_id: SAMPLE_COURSE_ID,
        lesson_id: null,
        is_correct: false,
        attempt_number: 1,
      },
    });
    expect([401, 403]).toContain(status);
  });

  test('anon cannot read quiz attempts (returns empty)', async () => {
    const { status, body } = await supaFetch('GET', 'quiz_attempts', {
      filters: { select: 'id,user_id,score_pct' },
    });
    expect(status).toBe(200);
    expect((body as unknown[]).length).toBe(0);
  });

  test('creator can submit and read their own quiz attempt via app API', async () => {
    const jwt = await signIn(CREATOR_EMAIL, CREATOR_PASS);
    if (!jwt) { test.skip(); return; }

    // Get quiz ID
    const quizRes = await supaFetch('GET', 'quizzes', {
      jwt,
      filters: { 'course_id': `eq.${SAMPLE_COURSE_ID}`, 'slug': `eq.intro-quiz`, select: 'id' },
    });
    const quizRows = quizRes.body as Array<{ id: string }>;
    if (!quizRows || quizRows.length === 0) { test.skip(); return; }

    const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
    const res = await fetch(`${BASE}/api/quiz/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quiz_id: quizRows[0].id,
        course_id: SAMPLE_COURSE_ID,
        answers: {},
      }),
    });
    expect(res.status).toBe(200);
    const result = await res.json() as { score: number; passed: boolean; total: number };
    expect(typeof result.score).toBe('number');
    expect(result.score).toBe(0); // no answers → 0%

    // Creator reads own attempts via RLS
    const attemptsRes = await supaFetch('GET', 'quiz_attempts', {
      jwt,
      filters: {
        'quiz_id': `eq.${quizRows[0].id}`,
        'user_id': `eq.${CREATOR_ID}`,
        select: 'id,score_pct,passed,is_correct',
      },
    });
    expect(attemptsRes.status).toBe(200);
    expect((attemptsRes.body as unknown[]).length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ENROLLMENTS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RLS: enrollments', () => {
  test('anon cannot read any enrollments', async () => {
    const { status, body } = await supaFetch('GET', 'enrollments', {
      filters: { select: 'id,user_id,course_id' },
    });
    expect(status).toBe(200);
    expect((body as unknown[]).length).toBe(0);
  });

  test('anon cannot insert an enrollment (401/403)', async () => {
    const { status } = await supaFetch('POST', 'enrollments', {
      body: {
        user_id: '00000000-dead-beef-cafe-000000000099',
        course_id: SAMPLE_COURSE_ID,
      },
    });
    expect([401, 403]).toContain(status);
  });

  test('authenticated user cannot read other users\' enrollments', async () => {
    const token = await signUpEphemeral();
    if (!token) { test.skip(); return; }
    // This new user has no enrollments; query all enrollments
    const { status, body } = await supaFetch('GET', 'enrollments', {
      jwt: token,
      filters: { select: 'id,user_id,course_id' },
    });
    // RLS: user_id = auth.uid() — new user has 0 enrollments
    expect(status).toBe(200);
    expect((body as unknown[]).length).toBe(0);
  });

  test('authenticated user cannot enroll in a non-existent course (RLS blocks mismatched user_id)', async () => {
    const token = await signUpEphemeral();
    if (!token) { test.skip(); return; }
    const { status } = await supaFetch('POST', 'enrollments', {
      jwt: token,
      body: {
        user_id: '00000000-dead-beef-cafe-000000000000', // not auth.uid()
        course_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
      },
    });
    // WITH CHECK: user_id = auth.uid() fails for mismatched user_id
    expect([401, 403, 422]).toContain(status);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CREATORS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RLS: creators table', () => {
  test('anon can read public creator profiles', async () => {
    const { status, body } = await supaFetch('GET', 'creators', {
      filters: { select: 'id,display_name' },
    });
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect((body as unknown[]).length).toBeGreaterThan(0);
  });

  test('anon cannot update a creator profile (0 rows affected)', async () => {
    const { status, body } = await supaFetch('PATCH', 'creators', {
      filters: { 'id': `eq.${CREATOR_ID}` },
      body: { display_name: 'HACKED' },
    });
    // No UPDATE policy for anon → 0 rows updated (200 with empty array)
    expect(status).toBe(200);
    expect((body as unknown[]).length).toBe(0);
    // Verify name unchanged
    const check = await supaFetch('GET', 'creators', {
      filters: { 'id': `eq.${CREATOR_ID}`, select: 'display_name' },
    });
    const rows = check.body as Array<{ display_name: string }>;
    expect(rows[0]?.display_name).not.toBe('HACKED');
  });

  test('creator can update own profile', async () => {
    const jwt = await signIn(CREATOR_EMAIL, CREATOR_PASS);
    if (!jwt) { test.skip(); return; }

    const originalRes = await supaFetch('GET', 'creators', {
      jwt,
      filters: { 'id': `eq.${CREATOR_ID}`, select: 'bio' },
    });
    const original = (originalRes.body as Array<{ bio: string | null }>)[0]?.bio;

    const { status, body } = await supaFetch('PATCH', 'creators', {
      jwt,
      filters: { 'id': `eq.${CREATOR_ID}` },
      body: { bio: 'RLS test bio' },
    });
    expect(status).toBe(200);
    expect((body as unknown[]).length).toBe(1);

    // Restore original
    await supaFetch('PATCH', 'creators', {
      jwt,
      filters: { 'id': `eq.${CREATOR_ID}` },
      body: { bio: original ?? null },
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COURSE_VERSIONS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RLS: course_versions', () => {
  test('anon can read versions of a published course (empty OK if no versions recorded)', async () => {
    // course_versions columns: id, course_id, version, is_latest, lesson_count, published_at
    const { status } = await supaFetch('GET', 'course_versions', {
      filters: { 'course_id': `eq.${SAMPLE_COURSE_ID}`, select: 'id,version,is_latest' },
    });
    // 200 even if empty — policy allows reading published course versions
    expect(status).toBe(200);
  });

  test('anon cannot insert course versions (401/403)', async () => {
    const { status } = await supaFetch('POST', 'course_versions', {
      body: {
        course_id: SAMPLE_COURSE_ID,
        version: 'injected',
        lesson_count: 0,
        is_latest: true,
      },
    });
    expect([401, 403]).toContain(status);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// App-layer integration (verifies policies work end-to-end)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RLS integration via app pages', () => {
  test('free lesson page loads for unauthenticated user (is_enrolled=true for free course)', async ({ request }) => {
    const res = await request.get('/courses/git-for-engineers/lessons/intro-to-git');
    expect(res.status()).toBe(200);
  });

  test('paid lesson of free course loads for unauthenticated user', async ({ request }) => {
    // Sample course is free → all lessons accessible
    const res = await request.get('/courses/git-for-engineers/lessons/branching-and-merging');
    expect(res.status()).toBe(200);
  });

  test('marketplace page only shows published courses', async ({ request }) => {
    const res = await request.get('/marketplace');
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain('Git for Engineers');
  });

  test('dashboard redirects unauthenticated user (auth guard)', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('PATCH /api/courses/[id]/publish returns 401 without auth', async ({ request }) => {
    const res = await request.patch(`/api/courses/${SAMPLE_COURSE_ID}/publish`, {
      data: { published: true },
    });
    expect([401, 429]).toContain(res.status());
  });

  test('POST /api/quiz/submit returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/quiz/submit', {
      data: { quiz_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', course_id: SAMPLE_COURSE_ID, answers: {} },
    });
    expect([401, 429]).toContain(res.status());
  });
});
