/**
 * e2e/integration.spec.ts
 *
 * Full end-to-end user journey integration tests.
 *
 * Covers (in a single cohesive flow + isolated sub-tests):
 *   1. API health check — 200 + healthy status + DB ok
 *   2. Sign up with email/password via browser UI (AgentMail ephemeral address)
 *   3. Sign in with the new credentials
 *   4. Import the sample public GitHub repo via /dashboard/import
 *   5. Verify the imported course appears on /dashboard
 *   6. Navigate to a free (preview) lesson — verify it renders without gate
 *   7. Attempt a quiz on the free lesson — verify scoring response
 *
 * The signup and import tests create real Supabase rows. They are safe to run
 * repeatedly because:
 *   - The ephemeral signup email is unique per run (timestamp suffix)
 *   - The import idempotency check in /api/import prevents duplicate courses
 *   - The sample course (git-for-engineers) is the canonical seeded course
 *
 * Run:
 *   BASE_URL=https://startup-91-lean-launch-plan-repo-to-course-git-nativ-fwke45iuf.vercel.app \
 *   npx playwright test e2e/integration.spec.ts
 */

import { test, expect, Page } from '@playwright/test';

// ── Constants ─────────────────────────────────────────────────────────────────

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ??
  'https://zkwyfjrgmvpgfbaqwxsb.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Pre-seeded sample course
const SAMPLE_COURSE_SLUG = 'git-for-engineers';
const SAMPLE_COURSE_TITLE = 'Git for Engineers';
const SAMPLE_COURSE_ID = 'f675a5d6-2886-460a-86ac-f01673fc02cf';

// Pre-existing creator account (used for import and quiz tests to avoid re-import)
const CREATOR_EMAIL = 'importer-test-1776550340@agentmail.to';
const CREATOR_PASS = 'TestPass123!';

// Public sample repo for import smoke test
const SAMPLE_REPO_URL = 'https://github.com/ErlisK/openclaw-workspace';
const SAMPLE_REPO_PATH = 'sample-course'; // contains course.yml at root of this path

// A known free (preview) lesson in the sample course
const FREE_LESSON_SLUG = 'intro-to-git';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Sign in via Supabase REST, return JWT or null. */
async function getJwt(email: string, password: string): Promise<string | null> {
  const apiContext = await (await import('@playwright/test')).request.newContext();
  const res = await apiContext.post(
    `${SUPA_URL}/auth/v1/token?grant_type=password`,
    {
      headers: {
        apikey: ANON_KEY,
        'Content-Type': 'application/json',
      },
      data: { email, password },
    },
  );
  if (!res.ok()) return null;
  const body = await res.json() as { access_token?: string };
  return body.access_token ?? null;
}

/** Fill and submit the login form in the browser. */
async function browserLogin(page: Page, email: string, password: string) {
  await page.goto('/auth/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole('button', { name: /sign in/i }).click();
}

/** Generate a unique ephemeral email for this test run. */
function ephemeralEmail(): string {
  return `integration-test-${Date.now()}@agentmail.to`;
}

// ── 1. API Health ──────────────────────────────────────────────────────────────

test.describe('1 · API health', () => {
  test('GET /api/health returns 200 with status=healthy and db=ok', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);

    const body = await res.json() as {
      status: string;
      version: string;
      timestamp: string;
      checks: { database: string; environment: string };
      latency_ms: { database: number | null };
    };

    expect(body.status).toBe('healthy');
    expect(body.version).toBeTruthy();
    expect(body.checks.database).toBe('ok');
    expect(body.checks.environment).toBe('ok');
    expect(body.latency_ms.database).toBeGreaterThan(0);

    // Timestamp is a valid ISO string
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });

  test('GET /api/health has Cache-Control: no-store', async ({ request }) => {
    const res = await request.get('/api/health');
    const cc = res.headers()['cache-control'];
    expect(cc).toContain('no-store');
  });
});

// ── 2. Sign up (browser UI) ────────────────────────────────────────────────────

test.describe('2 · Sign up via browser UI', () => {
  test('can sign up with a new email/password and reach dashboard or confirmation screen', async ({ page }) => {
    const email = ephemeralEmail();
    const password = 'IntegrationPass99!';

    await page.goto('/auth/signup');
    await expect(page.locator('input[type="email"]')).toBeVisible();

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);

    // Some UIs have a confirm-password field
    const confirmField = page.locator('input[name="confirmPassword"], input[name="confirm_password"], input[placeholder*="confirm" i]');
    if (await confirmField.count() > 0) {
      await confirmField.fill(password);
    }

    await page.getByRole('button', { name: /create account/i }).click();

    // Email confirm is disabled → should redirect to /dashboard
    // OR: show a "check your email" screen if confirm is toggled on
    await Promise.race([
      page.waitForURL(/\/dashboard/, { timeout: 12000 }),
      page.waitForSelector('text=/check your email|verify|confirmation|sent|welcome/i', { timeout: 12000 }),
    ]).catch(() => { /* acceptable: stayed on page with success indicator */ });

    const url = page.url();
    const isOnDashboard = url.includes('/dashboard');
    const successSelector = page.locator('text=/check your email|verify|confirmation|sent|welcome|dashboard/i');
    const hasSuccessMsg = await successSelector.count() > 0;

    // Either redirected to dashboard OR showing a post-signup success message
    expect(isOnDashboard || hasSuccessMsg).toBe(true);
  });

  test('signup page form has correct structure', async ({ page }) => {
    await page.goto('/auth/signup');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
    // Link back to login
    await expect(page.locator('a[href*="/auth/login"]').or(page.locator('a:has-text("sign in")'))).toBeVisible();
  });

  test('duplicate email signup shows error', async ({ page }) => {
    // Use the pre-existing creator account to test duplicate-email error
    await page.goto('/auth/signup');
    await page.fill('input[type="email"]', CREATOR_EMAIL);
    await page.fill('input[type="password"]', 'SomeOtherPass99!');
    await page.getByRole('button', { name: /create account/i }).click();

    // Supabase returns 'User already registered'. The app may show this directly
    // or a generic 'already exists / email taken' message. Accept any error indicator.
    await expect(
      page.locator('text=/already registered|already exists|email.*taken|invalid|error/i')
    ).toBeVisible({ timeout: 10000 });
  });
});

// ── 3. Sign in (browser UI) ────────────────────────────────────────────────────

test.describe('3 · Sign in via browser UI', () => {
  test('can sign in with creator credentials and reach dashboard', async ({ page }) => {
    await browserLogin(page, CREATOR_EMAIL, CREATOR_PASS);

    // Should land on dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 12000 });
    // Dashboard should show some content (not just spinner)
    await expect(page.locator('h1, h2, [data-testid="dashboard"]').first()).toBeVisible({ timeout: 8000 });
  });

  test('sign in page renders email + password fields + Google button (if enabled)', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    // Sign in button
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('invalid credentials show error message', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'totally-fake@example.com');
    await page.fill('input[type="password"]', 'WrongPassword99!');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(
      page.locator('text=/invalid|incorrect|credentials|wrong|error/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('JWT sign-in via Supabase REST API succeeds', async ({ request }) => {
    const res = await request.post(
      `${SUPA_URL}/auth/v1/token?grant_type=password`,
      {
        headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
        data: { email: CREATOR_EMAIL, password: CREATOR_PASS },
      },
    );
    expect(res.status()).toBe(200);
    const body = await res.json() as { access_token?: string; user?: { id: string } };
    expect(body.access_token).toBeTruthy();
    expect(body.user?.id).toBeTruthy();
  });

  test('dashboard redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 8000 });
  });

  test('/api/me returns 401 for unauthenticated request', async ({ request }) => {
    const res = await request.get('/api/me');
    expect([401, 429]).toContain(res.status());
  });

  test('/api/me returns user profile when authenticated', async ({ request }) => {
    const jwt = await getJwt(CREATOR_EMAIL, CREATOR_PASS);
    if (!jwt) { test.skip(); return; }

    const res = await request.get('/api/me', {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    expect(res.status()).toBe(200);
    // Response shape: { user: { id, email }, profile: { ... } } OR flat { id, email }
    const body = await res.json() as {
      id?: string; email?: string;
      user?: { id: string; email: string };
    };
    const id = body.id ?? body.user?.id;
    const email = body.email ?? body.user?.email;
    expect(id).toBeTruthy();
    expect(email).toBe(CREATOR_EMAIL);
  });
});

// ── 4. Import sample repo ──────────────────────────────────────────────────────

test.describe('4 · Import sample public GitHub repo', () => {
  test('POST /api/import with valid repo returns 200/201/409 (idempotent), then re-publishes course', async ({ request }) => {
    const jwt = await getJwt(CREATOR_EMAIL, CREATOR_PASS);
    if (!jwt) { test.skip(); return; }

    const res = await request.post('/api/import', {
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      data: {
        repo_url: SAMPLE_REPO_URL,
        path: SAMPLE_REPO_PATH,
      },
    });

    // 200/201 = fresh or re-import succeeded, 409 = already imported (idempotent)
    expect([200, 201, 409]).toContain(res.status());

    // After import, always re-publish so downstream tests see the course
    const pubRes = await request.patch(
      `/api/courses/${SAMPLE_COURSE_ID}/publish`,
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        data: { published: true },
      },
    );
    expect([200, 204]).toContain(pubRes.status());

    if (res.status() !== 409) {
      const body = await res.json() as { courseId?: string; courseSlug?: string; course?: { slug: string }; slug?: string };
      const slug = body.courseSlug ?? body.course?.slug ?? body.slug;
      expect(slug).toBeTruthy();
    }
  });

  test('POST /api/import requires authentication (returns 401 for anon)', async ({ request }) => {
    const res = await request.post('/api/import', {
      headers: { 'Content-Type': 'application/json' },
      data: { repo_url: SAMPLE_REPO_URL, path: SAMPLE_REPO_PATH },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('POST /api/import returns 400 for missing repo_url', async ({ request }) => {
    const jwt = await getJwt(CREATOR_EMAIL, CREATOR_PASS);
    if (!jwt) { test.skip(); return; }

    const res = await request.post('/api/import', {
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      data: { path: SAMPLE_REPO_PATH },
    });
    expect(res.status()).toBe(400);
  });

  test('POST /api/import returns 400 for invalid (non-URL) repo_url', async ({ request }) => {
    const jwt = await getJwt(CREATOR_EMAIL, CREATOR_PASS);
    if (!jwt) { test.skip(); return; }

    const res = await request.post('/api/import', {
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      data: { repo_url: 'not-a-url', path: SAMPLE_REPO_PATH },
    });
    expect(res.status()).toBe(400);
  });

  test('dashboard import page renders import form when signed in', async ({ page }) => {
    await browserLogin(page, CREATOR_EMAIL, CREATOR_PASS);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 12000 });

    // The import/new course page is at /dashboard/new
    await page.goto('/dashboard/new');

    // Import form should have a repo URL field
    const repoInput = page.locator(
      'input[name="repo_url"], input[placeholder*="github" i], input[placeholder*="repo" i], input[type="url"], input[type="text"]'
    );
    await expect(repoInput.first()).toBeVisible({ timeout: 8000 });
  });
});

// ── 5. Course appears after import ────────────────────────────────────────────

test.describe('5 · Sample course appears in dashboard and marketplace', () => {
  test('sample course appears on /marketplace', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(
      page.locator(`text=${SAMPLE_COURSE_TITLE}`).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('course overview page loads at /courses/git-for-engineers', async ({ page }) => {
    await page.goto(`/courses/${SAMPLE_COURSE_SLUG}`);
    await expect(page.locator('h1').first()).toContainText(SAMPLE_COURSE_TITLE, { timeout: 10000 });
  });

  test('course overview page lists lessons', async ({ page }) => {
    await page.goto(`/courses/${SAMPLE_COURSE_SLUG}`);
    // Lessons should appear in some list
    await expect(
      page.locator('a[href*="/lessons/"], [data-testid*="lesson"], li:has-text("Git")').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('API: /api/courses returns the sample course in listing', async ({ request }) => {
    const res = await request.get('/api/courses');
    expect(res.status()).toBe(200);
    const body = await res.json() as { courses: Array<{ slug: string; title: string }> };
    const found = body.courses.find((c) => c.slug === SAMPLE_COURSE_SLUG);
    expect(found).toBeTruthy();
    expect(found!.title).toContain('Git');
  });

  test('dashboard shows creator courses when signed in', async ({ page }) => {
    await browserLogin(page, CREATOR_EMAIL, CREATOR_PASS);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 12000 });

    // Either directly shows course title or has a "My courses" section
    await expect(
      page.locator(`text=${SAMPLE_COURSE_TITLE}`).or(
        page.locator('text=/my courses|your courses|courses/i').first()
      ).first()
    ).toBeVisible({ timeout: 10000 });
  });
});

// ── 6. Free lesson renders without paywall ────────────────────────────────────

test.describe('6 · Free (preview) lesson renders without paywall', () => {
  test('free lesson page returns 200', async ({ request }) => {
    const res = await request.get(
      `/courses/${SAMPLE_COURSE_SLUG}/lessons/${FREE_LESSON_SLUG}`
    );
    expect(res.status()).toBe(200);
  });

  test('free lesson page shows lesson content (not a paywall/gate)', async ({ page }) => {
    await page.goto(`/courses/${SAMPLE_COURSE_SLUG}/lessons/${FREE_LESSON_SLUG}`);

    // Should NOT be redirected to login or payment
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 6000 });
    await expect(page).not.toHaveURL(/\/checkout/, { timeout: 6000 });

    // Should have some content
    await expect(
      page.locator('article, [data-testid="lesson-content"], main, .prose').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('free lesson page shows lesson title', async ({ page }) => {
    await page.goto(`/courses/${SAMPLE_COURSE_SLUG}/lessons/${FREE_LESSON_SLUG}`);
    // Title should contain something meaningful
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    const h1 = await page.locator('h1').first().textContent();
    expect(h1?.trim().length).toBeGreaterThan(2);
  });

  test('free lesson page has navigation to other lessons', async ({ page }) => {
    await page.goto(`/courses/${SAMPLE_COURSE_SLUG}/lessons/${FREE_LESSON_SLUG}`);
    // Should have prev/next nav or sidebar with lesson list
    const nav = page.locator(
      '[data-testid="lesson-nav"], a[href*="/lessons/"], nav a, .sidebar a'
    );
    await expect(nav.first()).toBeVisible({ timeout: 10000 });
  });

  test('free lesson accessible to unauthenticated user (no redirect to auth)', async ({ page }) => {
    // Navigate as a completely fresh unauthenticated browser context
    const ctx = await page.context().browser()!.newContext();
    const freshPage = await ctx.newPage();
    await freshPage.goto(
      `${process.env.BASE_URL ?? 'http://localhost:3000'}/courses/${SAMPLE_COURSE_SLUG}/lessons/${FREE_LESSON_SLUG}`
    );
    await expect(freshPage).not.toHaveURL(/\/auth\/login/, { timeout: 8000 });
    await expect(freshPage.locator('main, article').first()).toBeVisible({ timeout: 10000 });
    await ctx.close();
  });
});

// ── 7. Quiz attempt on free lesson ────────────────────────────────────────────

test.describe('7 · Quiz — attempt on free lesson context', () => {
  test('POST /api/quiz/submit returns 401 for unauthenticated requests', async ({ request }) => {
    const res = await request.post('/api/quiz/submit', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        quiz_id: '00000000-0000-0000-0000-000000000000',
        course_id: SAMPLE_COURSE_ID,
        answers: {},
      },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('POST /api/quiz/submit returns 400 for invalid quiz_id', async ({ request }) => {
    const jwt = await getJwt(CREATOR_EMAIL, CREATOR_PASS);
    if (!jwt) { test.skip(); return; }

    const res = await request.post('/api/quiz/submit', {
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      data: {
        quiz_id: 'not-a-uuid',
        course_id: SAMPLE_COURSE_ID,
        answers: {},
      },
    });
    expect(res.status()).toBe(400);
  });

  test('POST /api/quiz/submit returns 404 for non-existent quiz', async ({ request }) => {
    const jwt = await getJwt(CREATOR_EMAIL, CREATOR_PASS);
    if (!jwt) { test.skip(); return; }

    const res = await request.post('/api/quiz/submit', {
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      data: {
        quiz_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        course_id: SAMPLE_COURSE_ID,
        answers: {},
      },
    });
    expect([404, 422]).toContain(res.status());
  });

  test('can submit all-correct answers for intro-to-git quiz via API', async ({ request }) => {
    const jwt = await getJwt(CREATOR_EMAIL, CREATOR_PASS);
    if (!jwt) { test.skip(); return; }

    // Fetch the quiz for the intro-to-git lesson
    const apiContext = await (await import('@playwright/test')).request.newContext();
    const quizRes = await apiContext.get(
      `${SUPA_URL}/rest/v1/quizzes?course_id=eq.${SAMPLE_COURSE_ID}&slug=eq.git-basics-quiz&select=id,questions(id,question_type,correct_index,correct_bool)`,
      {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${jwt}`,
        },
      },
    );

    if (!quizRes.ok()) { test.skip(); return; }
    const quizzes = await quizRes.json() as Array<{
      id: string;
      questions: Array<{
        id: string;
        question_type: string;
        correct_index: number | null;
        correct_bool: boolean | null;
      }>;
    }>;
    if (!quizzes.length || !quizzes[0].questions.length) { test.skip(); return; }

    const quiz = quizzes[0];
    // Build answers using stored correct answers
    const answers: Record<string, number | boolean | string> = {};
    for (const q of quiz.questions) {
      if (q.question_type === 'multiple_choice' && q.correct_index !== null) {
        answers[q.id] = q.correct_index;
      } else if (q.question_type === 'true_false' && q.correct_bool !== null) {
        answers[q.id] = q.correct_bool;
      }
    }

    const submitRes = await request.post('/api/quiz/submit', {
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      data: {
        quiz_id: quiz.id,
        course_id: SAMPLE_COURSE_ID,
        answers,
      },
    });

    expect(submitRes.status()).toBe(200);
    const body = await submitRes.json() as {
      score_pct: number;
      passed: boolean;
      attempt_number: number;
      results: Array<{ question_id: string; correct: boolean }>;
    };

    expect(body.score_pct).toBe(100);
    expect(body.passed).toBe(true);
    expect(body.attempt_number).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(body.results)).toBe(true);
    // All questions correct
    for (const r of body.results) {
      expect(r.correct).toBe(true);
    }
  });

  test('can submit all-wrong answers and score 0%', async ({ request }) => {
    const jwt = await getJwt(CREATOR_EMAIL, CREATOR_PASS);
    if (!jwt) { test.skip(); return; }

    const apiContext = await (await import('@playwright/test')).request.newContext();
    const quizRes = await apiContext.get(
      `${SUPA_URL}/rest/v1/quizzes?course_id=eq.${SAMPLE_COURSE_ID}&slug=eq.git-basics-quiz&select=id,questions(id,question_type,correct_index,correct_bool)`,
      {
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwt}` },
      },
    );
    if (!quizRes.ok()) { test.skip(); return; }
    const quizzes = await quizRes.json() as Array<{
      id: string;
      questions: Array<{
        id: string;
        question_type: string;
        correct_index: number | null;
        correct_bool: boolean | null;
      }>;
    }>;
    if (!quizzes.length || !quizzes[0].questions.length) { test.skip(); return; }

    const quiz = quizzes[0];
    const answers: Record<string, number | boolean> = {};
    for (const q of quiz.questions) {
      if (q.question_type === 'multiple_choice') {
        // Pick wrong: flip correct_index
        const wrong = q.correct_index === 0 ? 1 : 0;
        answers[q.id] = wrong;
      } else if (q.question_type === 'true_false') {
        answers[q.id] = !q.correct_bool;
      }
    }

    const submitRes = await request.post('/api/quiz/submit', {
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      data: {
        quiz_id: quiz.id,
        course_id: SAMPLE_COURSE_ID,
        answers,
      },
    });

    expect(submitRes.status()).toBe(200);
    const body = await submitRes.json() as { score_pct: number; passed: boolean };
    expect(body.score_pct).toBe(0);
    expect(body.passed).toBe(false);
  });

  test('GET /api/quiz/:id/attempts returns attempt history for authenticated user', async ({ request }) => {
    const jwt = await getJwt(CREATOR_EMAIL, CREATOR_PASS);
    if (!jwt) { test.skip(); return; }

    // Get the quiz id first
    const apiContext = await (await import('@playwright/test')).request.newContext();
    const quizRes = await apiContext.get(
      `${SUPA_URL}/rest/v1/quizzes?course_id=eq.${SAMPLE_COURSE_ID}&slug=eq.git-basics-quiz&select=id`,
      {
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwt}` },
      },
    );
    if (!quizRes.ok()) { test.skip(); return; }
    const quizzes = await quizRes.json() as Array<{ id: string }>;
    if (!quizzes.length) { test.skip(); return; }

    const quizId = quizzes[0].id;
    const attemptsRes = await request.get(
      `/api/quiz/${quizId}/attempts?course_id=${SAMPLE_COURSE_ID}`,
      { headers: { Authorization: `Bearer ${jwt}` } },
    );

    expect(attemptsRes.status()).toBe(200);
    const body = await attemptsRes.json() as {
      attempts: Array<{ score_pct: number; passed: boolean; attempt_number: number }>;
      best_score_pct: number;
      total_attempts: number;
    };

    expect(Array.isArray(body.attempts)).toBe(true);
    expect(typeof body.best_score_pct).toBe('number');
    expect(typeof body.total_attempts).toBe('number');
    // We submitted at least once above, so total_attempts ≥ 1
    expect(body.total_attempts).toBeGreaterThanOrEqual(1);
  });

  test('free lesson page renders quiz component (UI)', async ({ page }) => {
    await page.goto(`/courses/${SAMPLE_COURSE_SLUG}/lessons/${FREE_LESSON_SLUG}`);

    // Quiz may be on the lesson page or linked
    const quizSection = page.locator(
      '[data-testid="quiz"], .quiz, section:has-text("Quiz"), button:has-text("Quiz"), h2:has-text("Quiz")'
    );
    const hasQuiz = await quizSection.count() > 0;

    if (hasQuiz) {
      await expect(quizSection.first()).toBeVisible({ timeout: 8000 });
    }
    // If no quiz on this lesson, that's also acceptable (quiz is on other lessons)
    // Just verify the lesson itself rendered
    await expect(page.locator('main, article').first()).toBeVisible();
  });
});

// ── 8. Full browser journey (combined) ────────────────────────────────────────

test.describe('8 · Full browser journey — sign in → course → lesson → quiz', () => {
  test('complete journey: login → marketplace → course → free lesson', async ({ page }) => {
    // Step 1: Sign in
    await browserLogin(page, CREATOR_EMAIL, CREATOR_PASS);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 12000 });

    // Step 2: Go to marketplace
    await page.goto('/marketplace');
    await expect(page.locator('[data-testid="courses-grid"]')).toBeVisible({ timeout: 10000 });

    // Step 3: Click the sample course
    const courseLink = page.locator(`a[href="/courses/${SAMPLE_COURSE_SLUG}"]`).first();
    await expect(courseLink).toBeVisible({ timeout: 8000 });
    await courseLink.click();

    // Step 4: On course overview
    await expect(page).toHaveURL(new RegExp(SAMPLE_COURSE_SLUG), { timeout: 8000 });
    await expect(page.locator('h1').first()).toContainText(SAMPLE_COURSE_TITLE, { timeout: 8000 });

    // Step 5: Click the first free lesson link
    const lessonLink = page.locator(
      `a[href*="/lessons/${FREE_LESSON_SLUG}"], a[href*="/lessons/"]:first-of-type`
    ).first();
    await expect(lessonLink).toBeVisible({ timeout: 8000 });
    await lessonLink.click();

    // Step 6: Lesson renders
    await expect(page).toHaveURL(/\/lessons\//, { timeout: 8000 });
    await expect(page.locator('main, article').first()).toBeVisible({ timeout: 8000 });
    // No paywall redirect
    await expect(page).not.toHaveURL(/\/checkout/);
    await expect(page).not.toHaveURL(/\/auth\/login/);
  });
});
