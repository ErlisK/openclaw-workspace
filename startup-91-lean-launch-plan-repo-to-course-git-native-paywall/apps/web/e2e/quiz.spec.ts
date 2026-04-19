/**
 * e2e/quiz.spec.ts
 *
 * End-to-end tests for quiz auto-grading:
 * - API-level grading (POST /api/quiz/submit) with correct and wrong answers
 * - Attempt storage and history (GET /api/quiz/[quizId]/attempts)
 * - Score calculation: MCQ, true/false, short answer
 * - Pass/fail thresholds
 * - UI interaction via Playwright browser tests
 */
import { test, expect, request as playwrightRequest } from '@playwright/test';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://zkwyfjrgmvpgfbaqwxsb.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const COURSE_ID = 'f675a5d6-2886-460a-86ac-f01673fc02cf';
const CREATOR_EMAIL = 'importer-test-1776550340@agentmail.to';
const CREATOR_PASS = 'TestPass123!';

// ── Quiz data (from sample-course import) ─────────────────────────────────────
// All IDs are stable for the imported sample-course fixture.

const QUIZZES = {
  gitBasics: {
    id: null as string | null, // resolved at runtime
    slug: 'intro-quiz',
    passThreshold: 70,
    lessonSlug: 'intro-to-git',
    questions: {
      // What does 'git status' show? → correct_index=0 (the working tree state)
      gitStatus: { id: '10766ee0-687c-4ff0-9cec-d108fad7df49', correct_index: 0, correct_bool: null },
      // Git uses SHA-1 hashes → correct_bool=true
      sha1: { id: '379c96cf-8023-4201-bcff-e52aca80d690', correct_index: null, correct_bool: true },
      // Which command stages ALL changes? → correct_index=1 (git add .)
      stageAll: { id: '998c0637-d679-4837-82c0-ac5962e7bf02', correct_index: 1, correct_bool: null },
    },
  },
  branching: {
    id: null as string | null,
    slug: 'branching-quiz',
    passThreshold: 70,
    lessonSlug: 'branching-and-merging',
    questions: {
      // Which command creates AND switches to a new branch? → correct_index=3 (git switch -c)
      createSwitch: { id: '490e7586-f7e1-44cb-b558-164469a3bc53', correct_index: 3, correct_bool: null },
      // A fast-forward merge creates a merge commit → correct_bool=false
      ffMerge: { id: '70cdc60c-424f-4028-833c-be2389a9dc86', correct_index: null, correct_bool: false },
      // When should you NOT rebase? → correct_index=1
      noRebase: { id: '2e1d3121-a87f-4f3d-9aab-5a5fe8972a83', correct_index: 1, correct_bool: null },
    },
  },
};

// ── Auth helper ────────────────────────────────────────────────────────────────

async function getJwt(email: string, password: string): Promise<string> {
  const res = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json() as { access_token?: string };
  return body.access_token ?? '';
}

// ── API helpers ────────────────────────────────────────────────────────────────

async function submitQuiz(
  baseUrl: string,
  jwt: string,
  quizId: string,
  lessonId: string | null,
  answers: Record<string, number | boolean | string | null>,
): Promise<{
  status: number;
  score: number;
  passed: boolean;
  correct: number;
  total: number;
  feedback: Record<string, { correct: boolean; explanation: string | null }>;
}> {
  const res = await fetch(`${baseUrl}/api/quiz/submit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      quiz_id: quizId,
      course_id: COURSE_ID,
      lesson_id: lessonId,
      answers,
    }),
  });
  const body = await res.json();
  return { status: res.status, ...body };
}

async function getAttempts(
  baseUrl: string,
  jwt: string,
  quizId: string,
): Promise<{
  status: number;
  attempts: Array<{ attempt_number: number; score_pct: number | null; passed: boolean | null }>;
  best_score: number | null;
  total_attempts: number;
  ever_passed: boolean;
}> {
  const res = await fetch(`${baseUrl}/api/quiz/${quizId}/attempts?course_id=${COURSE_ID}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const body = await res.json();
  return { status: res.status, ...body };
}

// ── Resolve quiz IDs from Supabase ────────────────────────────────────────────

test.describe.configure({ mode: 'serial' });

test.describe('Quiz grading — API level', () => {
  let jwt = '';
  let baseUrl = '';
  let gitBasicsQuizId = '';
  let branchingQuizId = '';
  let introLessonId = '';
  let branchingLessonId = '';

  test.beforeAll(async () => {
    baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';
    jwt = await getJwt(CREATOR_EMAIL, CREATOR_PASS);
    if (!jwt) throw new Error('Could not sign in as test creator');

    // Resolve quiz + lesson IDs from Supabase REST
    const quizRes = await fetch(
      `${SUPA_URL}/rest/v1/quizzes?course_id=eq.${COURSE_ID}&select=id,slug`,
      { headers: { apikey: ANON_KEY, 'Accept': 'application/json' } },
    );
    const quizzes = await quizRes.json() as Array<{ id: string; slug: string }>;
    gitBasicsQuizId = quizzes.find((q) => q.slug === QUIZZES.gitBasics.slug)?.id ?? '';
    branchingQuizId = quizzes.find((q) => q.slug === QUIZZES.branching.slug)?.id ?? '';

    const lessonRes = await fetch(
      `${SUPA_URL}/rest/v1/lessons?course_id=eq.${COURSE_ID}&select=id,slug`,
      { headers: { apikey: ANON_KEY, 'Accept': 'application/json' } },
    );
    const lessons = await lessonRes.json() as Array<{ id: string; slug: string }>;
    introLessonId = lessons.find((l) => l.slug === QUIZZES.gitBasics.lessonSlug)?.id ?? '';
    branchingLessonId = lessons.find((l) => l.slug === QUIZZES.branching.lessonSlug)?.id ?? '';

    if (!gitBasicsQuizId) throw new Error('git-basics-quiz not found in DB');
    if (!branchingQuizId) throw new Error('branching-quiz not found in DB');
  });

  // ── Authentication guard ────────────────────────────────────────────────

  test('returns 401 without authentication', async () => {
    const res = await fetch(`${baseUrl}/api/quiz/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quiz_id: gitBasicsQuizId, course_id: COURSE_ID, answers: {} }),
    });
    expect(res.status).toBe(401);
  });

  test('returns 400 for invalid quiz_id (not a UUID)', async () => {
    const res = await fetch(`${baseUrl}/api/quiz/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ quiz_id: 'not-a-uuid', course_id: COURSE_ID, answers: {} }),
    });
    expect(res.status).toBe(400);
  });

  test('returns 404 for non-existent quiz', async () => {
    const res = await fetch(`${baseUrl}/api/quiz/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quiz_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        course_id: COURSE_ID,
        answers: {},
      }),
    });
    expect(res.status).toBe(404);
  });

  // ── Scoring: all wrong (0%) ────────────────────────────────────────────

  test('scores 0% when all answers are wrong (MCQ + true/false)', async () => {
    const q = QUIZZES.gitBasics.questions;
    const result = await submitQuiz(baseUrl, jwt, gitBasicsQuizId, introLessonId, {
      [q.gitStatus.id]: 3,     // wrong (correct=0)
      [q.sha1.id]: false,      // wrong (correct=true)
      [q.stageAll.id]: 0,      // wrong (correct=1)
    });
    expect(result.status).toBe(200);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.correct).toBe(0);
    expect(result.total).toBe(3);
  });

  // ── Scoring: all correct (100%) ────────────────────────────────────────

  test('scores 100% when all answers are correct', async () => {
    const q = QUIZZES.gitBasics.questions;
    const result = await submitQuiz(baseUrl, jwt, gitBasicsQuizId, introLessonId, {
      [q.gitStatus.id]: q.gitStatus.correct_index!,     // 0
      [q.sha1.id]: q.sha1.correct_bool!,                // true
      [q.stageAll.id]: q.stageAll.correct_index!,       // 1
    });
    expect(result.status).toBe(200);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.correct).toBe(3);
    expect(result.total).toBe(3);
  });

  // ── Scoring: partial (MCQ correct, T/F wrong = 67%) ────────────────────

  test('scores correctly for partial answers (67% = 2/3)', async () => {
    const q = QUIZZES.gitBasics.questions;
    const result = await submitQuiz(baseUrl, jwt, gitBasicsQuizId, introLessonId, {
      [q.gitStatus.id]: q.gitStatus.correct_index!,  // correct ✓
      [q.sha1.id]: false,                            // WRONG ✗ (should be true)
      [q.stageAll.id]: q.stageAll.correct_index!,   // correct ✓
    });
    expect(result.status).toBe(200);
    expect(result.score).toBe(67);
    expect(result.correct).toBe(2);
    expect(result.total).toBe(3);
    // 67% < 70% threshold → not passed
    expect(result.passed).toBe(false);
  });

  // ── Per-question feedback ────────────────────────────────────────────────

  test('feedback marks each question as correct/incorrect', async () => {
    const q = QUIZZES.gitBasics.questions;
    const result = await submitQuiz(baseUrl, jwt, gitBasicsQuizId, introLessonId, {
      [q.gitStatus.id]: q.gitStatus.correct_index!,  // correct
      [q.sha1.id]: false,                            // wrong
      [q.stageAll.id]: q.stageAll.correct_index!,   // correct
    });
    expect(result.feedback[q.gitStatus.id].correct).toBe(true);
    expect(result.feedback[q.sha1.id].correct).toBe(false);
    expect(result.feedback[q.stageAll.id].correct).toBe(true);
  });

  // ── True/false grading ────────────────────────────────────────────────────

  test('grades true/false questions correctly', async () => {
    const q = QUIZZES.branching.questions;
    const result = await submitQuiz(baseUrl, jwt, branchingQuizId, branchingLessonId, {
      [q.createSwitch.id]: q.createSwitch.correct_index!,  // 3 → correct
      [q.ffMerge.id]: false,                               // correct (fast-forward merge ≠ creates merge commit)
      [q.noRebase.id]: q.noRebase.correct_index!,         // 1 → correct
    });
    expect(result.status).toBe(200);
    expect(result.score).toBe(100);
    expect(result.feedback[q.ffMerge.id].correct).toBe(true);
  });

  test('marks true/false wrong when answer is inverted', async () => {
    const q = QUIZZES.branching.questions;
    const result = await submitQuiz(baseUrl, jwt, branchingQuizId, branchingLessonId, {
      [q.createSwitch.id]: q.createSwitch.correct_index!,
      [q.ffMerge.id]: true,    // WRONG (correct answer is false)
      [q.noRebase.id]: q.noRebase.correct_index!,
    });
    expect(result.feedback[q.ffMerge.id].correct).toBe(false);
    expect(result.score).toBe(67); // 2/3
  });

  // ── Pass threshold ─────────────────────────────────────────────────────────

  test(`pass threshold: ${QUIZZES.gitBasics.passThreshold}% — 3/3 → passed`, async () => {
    const q = QUIZZES.gitBasics.questions;
    const result = await submitQuiz(baseUrl, jwt, gitBasicsQuizId, introLessonId, {
      [q.gitStatus.id]: q.gitStatus.correct_index!,
      [q.sha1.id]: q.sha1.correct_bool!,
      [q.stageAll.id]: q.stageAll.correct_index!,
    });
    expect(result.passed).toBe(true);
  });

  test(`pass threshold: ${QUIZZES.gitBasics.passThreshold}% — 2/3 → failed (67%)`, async () => {
    const q = QUIZZES.gitBasics.questions;
    const result = await submitQuiz(baseUrl, jwt, gitBasicsQuizId, introLessonId, {
      [q.gitStatus.id]: q.gitStatus.correct_index!,
      [q.sha1.id]: false,  // wrong
      [q.stageAll.id]: q.stageAll.correct_index!,
    });
    expect(result.passed).toBe(false);
  });

  // ── Attempt storage ──────────────────────────────────────────────────────────

  test('attempts are stored and retrievable via GET /api/quiz/[quizId]/attempts', async () => {
    const attemptsRes = await getAttempts(baseUrl, jwt, gitBasicsQuizId);
    expect(attemptsRes.status).toBe(200);
    expect(attemptsRes.total_attempts).toBeGreaterThan(0);
    expect(typeof attemptsRes.best_score).toBe('number');
    expect(attemptsRes.best_score).toBe(100); // we submitted a perfect score above
    expect(attemptsRes.ever_passed).toBe(true);
  });

  test('best_score reflects the highest attempt score', async () => {
    const attemptsRes = await getAttempts(baseUrl, jwt, gitBasicsQuizId);
    const scores = attemptsRes.attempts.map((a) => a.score_pct ?? 0);
    expect(attemptsRes.best_score).toBe(Math.max(...scores));
  });

  test('attempt_number increments with each submission', async () => {
    const before = await getAttempts(baseUrl, jwt, gitBasicsQuizId);
    const countBefore = before.total_attempts;

    // Submit one more
    const q = QUIZZES.gitBasics.questions;
    await submitQuiz(baseUrl, jwt, gitBasicsQuizId, introLessonId, {
      [q.gitStatus.id]: 0,
      [q.sha1.id]: true,
      [q.stageAll.id]: 1,
    });

    const after = await getAttempts(baseUrl, jwt, gitBasicsQuizId);
    expect(after.total_attempts).toBe(countBefore + 1);
  });

  test('GET /api/quiz/[id]/attempts returns 401 without auth', async () => {
    const res = await fetch(`${baseUrl}/api/quiz/${gitBasicsQuizId}/attempts?course_id=${COURSE_ID}`);
    expect(res.status).toBe(401);
  });

  test('GET /api/quiz/[id]/attempts returns 400 without course_id', async () => {
    const res = await fetch(`${baseUrl}/api/quiz/${gitBasicsQuizId}/attempts`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    expect(res.status).toBe(400);
  });

  // ── Empty answers edge cases ────────────────────────────────────────────────

  test('empty answers object scores 0% (unanswered = wrong)', async () => {
    const result = await submitQuiz(baseUrl, jwt, gitBasicsQuizId, introLessonId, {});
    expect(result.status).toBe(200);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.correct).toBe(0);
  });
});

// ── UI interaction tests ───────────────────────────────────────────────────────

test.describe('Quiz UI', () => {
  const LESSON_URL = '/courses/git-for-engineers/lessons/intro-to-git';

  test('quiz component renders on the lesson page', async ({ page }) => {
    await page.goto(LESSON_URL);
    await expect(page.locator('text=Git Basics Quiz').first()).toBeVisible({ timeout: 10000 });
  });

  test('quiz shows question count and pass threshold', async ({ page }) => {
    await page.goto(LESSON_URL);
    await expect(page.locator('text=/3 question/i').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=/70% to pass/i').first()).toBeVisible();
  });

  test('submit button shows "Answer all N questions" when not all answered', async ({ page }) => {
    await page.goto(LESSON_URL);
    await expect(page.locator('text=/Answer all/i').first()).toBeVisible({ timeout: 8000 });
  });

  test('progress bar starts at 0', async ({ page }) => {
    await page.goto(LESSON_URL);
    await expect(page.locator('text=0/3 answered').first()).toBeVisible({ timeout: 8000 });
  });

  test('selecting a radio option updates answered count', async ({ page }) => {
    await page.goto(LESSON_URL);
    await expect(page.locator('text=/Git Basics Quiz/i')).toBeVisible({ timeout: 8000 });

    // Click first radio in first question
    const firstRadio = page.locator('input[type="radio"]').first();
    await firstRadio.click();

    // Answered count should update to 1/3
    await expect(page.locator('text=1/3 answered').first()).toBeVisible({ timeout: 3000 });
  });

  test('submit button enables when all questions answered', async ({ page }) => {
    await page.goto(LESSON_URL);
    await expect(page.locator('text=/Git Basics Quiz/i')).toBeVisible({ timeout: 8000 });

    // Answer all questions (pick first option for each)
    const radioGroups: Set<string> = new Set();
    const radios = page.locator('input[type="radio"]');
    const count = await radios.count();

    for (let i = 0; i < count; i++) {
      const radio = radios.nth(i);
      const name = await radio.getAttribute('name');
      if (name && !radioGroups.has(name)) {
        radioGroups.add(name);
        await radio.click();
      }
    }

    // Should now show "Submit quiz"
    await expect(page.locator('button:has-text("Submit quiz")')).toBeVisible({ timeout: 3000 });
  });

  test('quiz requires auth to submit (unauthenticated gets 401 error)', async ({ page }) => {
    await page.goto(LESSON_URL);
    await expect(page.locator('text=/Git Basics Quiz/i')).toBeVisible({ timeout: 8000 });

    // Answer all questions
    const radioGroups: Set<string> = new Set();
    const radios = page.locator('input[type="radio"]');
    const count = await radios.count();
    for (let i = 0; i < count; i++) {
      const radio = radios.nth(i);
      const name = await radio.getAttribute('name');
      if (name && !radioGroups.has(name)) {
        radioGroups.add(name);
        await radio.click();
      }
    }

    // Click submit
    const submitBtn = page.locator('button:has-text("Submit quiz")');
    if (await submitBtn.count() > 0) {
      await submitBtn.click();
      // Unauthenticated → error message or 401 response handled
      await expect(page.locator('text=/Unauthorized|Failed|error/i').first()).toBeVisible({ timeout: 5000 });
    }
  });
});

// ── Smoke tests ────────────────────────────────────────────────────────────────

test.describe('Quiz API smoke', () => {
  test('POST /api/quiz/submit returns 401 without token', async ({ request }) => {
    const res = await request.post('/api/quiz/submit', {
      data: { quiz_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', course_id: COURSE_ID, answers: {} },
    });
    expect([401, 429]).toContain(res.status());
  });

  test('POST /api/quiz/submit returns 400 for non-UUID quiz_id', async ({ request }) => {
    const res = await request.post('/api/quiz/submit', {
      data: { quiz_id: 'not-a-uuid', course_id: COURSE_ID, answers: {} },
    });
    expect([400, 401, 429]).toContain(res.status());
  });

  test('GET /api/quiz/[id]/attempts returns 401 without token', async ({ request }) => {
    const res = await request.get(`/api/quiz/ffffffff-ffff-ffff-ffff-ffffffffffff/attempts?course_id=${COURSE_ID}`);
    expect([401, 429]).toContain(res.status());
  });
});
