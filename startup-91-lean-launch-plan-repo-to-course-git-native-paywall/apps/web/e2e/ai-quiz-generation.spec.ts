/**
 * AI Quiz Generation E2E Tests
 *
 * Tests the full AI quiz generation flow:
 *   1. POST /api/quiz/generate — input validation, auth, API surface
 *   2. POST /api/courses/[courseId]/lessons/[lessonId]/quiz — save quiz
 *   3. GET  /api/courses/[courseId]/lessons/[lessonId]/quiz — fetch quiz
 *   4. Dashboard lesson page exists and requires auth
 *   5. Quiz persistence: lesson.has_quiz updated after save
 *
 * Note: Actual AI generation only works on Vercel (VERCEL_OIDC_TOKEN).
 * We test the API surface, auth guards, validation, and DB persistence.
 * The AI call itself is tested by checking for a graceful 503 or 200.
 */

import { test, expect, APIRequestContext } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const SUPA_URL = 'https://zkwyfjrgmvpgfbaqwxsb.supabase.co';
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const CREATOR_EMAIL = 'importer-test-1776550340@agentmail.to';
const CREATOR_PASS = 'TestPass123!';

const SAMPLE_LESSON_CONTENT = `---
title: "Introduction to TypeScript Generics"
slug: "ts-generics-intro"
order: 1
access: free
estimated_minutes: 15
---

# Introduction to TypeScript Generics

TypeScript generics allow you to write reusable, type-safe code that works with multiple types.

## What Are Generics?

A generic is a way to create a component that can work with any type rather than a single one.
The type is specified when the component is used, not when it is defined.

\`\`\`typescript
function identity<T>(value: T): T {
  return value;
}

const num = identity<number>(42);     // type: number
const str = identity<string>("hello"); // type: string
\`\`\`

## Why Use Generics?

Without generics, you'd need to either use \`any\` (losing type safety) or write
duplicate functions for each type.

## Generic Constraints

You can constrain a generic to only accept types that have certain properties:

\`\`\`typescript
function getLength<T extends { length: number }>(value: T): number {
  return value.length;
}
\`\`\`

This ensures T must have a \`length\` property. Strings, arrays, and custom objects
with a length property all satisfy this constraint.

## Common Use Cases

- **Generic arrays:** \`Array<T>\` or \`T[]\`
- **Generic promises:** \`Promise<T>\`
- **Generic React components:** components that accept typed props
- **Utility types:** \`Partial<T>\`, \`Required<T>\`, \`Pick<T, K>\`
`;

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

async function createCourseWithLesson(
  request: APIRequestContext,
  jwt: string,
): Promise<{ courseId: string; lessonId: string; courseSlug: string }> {
  const slug = `ai-quiz-test-${Date.now()}`;

  // Import a course with a lesson via the existing import API
  const res = await request.post('/api/import', {
    headers: { Authorization: `Bearer ${jwt}` },
    data: {
      courseYml: `title: "AI Quiz Test Course"\nslug: "${slug}"\nprice_cents: 0\ncurrency: "usd"\nrepo_url: "https://github.com/ErlisK/openclaw-workspace"\n`,
      lessons: [{
        filename: '01-ts-generics.md',
        content: SAMPLE_LESSON_CONTENT,
      }],
      quizzes: [],
    },
  });
  expect(res.status()).toBe(200);
  const body = await res.json() as { courseId: string; slug: string };

  // Fetch the lesson ID
  const lessonRes = await request.get(
    `${SUPA_URL}/rest/v1/lessons?course_id=eq.${body.courseId}&select=id,slug&limit=1`,
    { headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwt}` } },
  );
  const lessons = await lessonRes.json() as Array<{ id: string; slug: string }>;
  const lesson = lessons[0];
  expect(lesson).toBeTruthy();

  return { courseId: body.courseId, lessonId: lesson.id, courseSlug: slug };
}

// ── 1. POST /api/quiz/generate — validation & auth ────────────────────────────

test.describe('1 · POST /api/quiz/generate — auth + validation', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/quiz/generate', {
      data: { lessonContent: SAMPLE_LESSON_CONTENT, numQuestions: 3 },
    });
    expect([401, 429]).toContain(res.status());
  });

  test('returns 400 for empty lessonContent and no lessonId', async ({ request }) => {
    const jwt = await login(request);
    const res = await request.post('/api/quiz/generate', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { lessonContent: 'too short', numQuestions: 3 },
    });
    expect(res.status()).toBe(400);
  });

  test('returns 400 for numQuestions out of range', async ({ request }) => {
    const jwt = await login(request);
    const res = await request.post('/api/quiz/generate', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { lessonContent: SAMPLE_LESSON_CONTENT, numQuestions: 99 },
    });
    expect(res.status()).toBe(400);
  });

  test('returns 404 for unknown lessonId', async ({ request }) => {
    const jwt = await login(request);
    const res = await request.post('/api/quiz/generate', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { lessonId: '00000000-0000-0000-0000-000000000000', numQuestions: 3 },
    });
    expect(res.status()).toBe(404);
  });

  test('accepts lessonId to fetch content from DB', async ({ request }) => {
    const jwt = await login(request);
    const { lessonId } = await createCourseWithLesson(request, jwt);

    // Should respond with 200 (AI available on Vercel) or 503 (local/no OIDC token)
    const res = await request.post('/api/quiz/generate', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { lessonId, numQuestions: 2 },
    });
    expect([200, 503]).toContain(res.status());
  });

  test('AI generation returns 200 or 503 (503 = local, no OIDC token)', async ({ request }) => {
    const jwt = await login(request);
    const res = await request.post('/api/quiz/generate', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { lessonContent: SAMPLE_LESSON_CONTENT, numQuestions: 2, quizId: 'test-quiz' },
    });
    // 200 = deployed Vercel (AI works), 503 = local dev (no OIDC token)
    expect([200, 503]).toContain(res.status());

    if (res.status() === 200) {
      const body = await res.json() as { yaml: string; questions: unknown[]; quizId: string };
      expect(typeof body.yaml).toBe('string');
      expect(body.yaml.length).toBeGreaterThan(50);
      expect(Array.isArray(body.questions)).toBe(true);
      expect(body.questions.length).toBeGreaterThanOrEqual(1);
      expect(body.quizId).toBeTruthy();
    } else {
      const body = await res.json() as { error: string; hint?: string };
      expect(body.error).toBeTruthy();
    }
  });

  test('on 200 response, questions have required fields', async ({ request }) => {
    const jwt = await login(request);
    const res = await request.post('/api/quiz/generate', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { lessonContent: SAMPLE_LESSON_CONTENT, numQuestions: 3 },
    });

    if (res.status() !== 200) {
      test.skip(); // AI not available in this environment
      return;
    }

    const body = await res.json() as { questions: Array<Record<string, unknown>> };
    const q = body.questions[0];
    expect(q).toHaveProperty('type');
    expect(q).toHaveProperty('prompt');
    expect(q).toHaveProperty('answer');
    expect(q).toHaveProperty('explanation');
  });
});

// ── 2. POST /api/courses/[courseId]/lessons/[lessonId]/quiz — save ────────────

test.describe('2 · POST /api/courses/[courseId]/lessons/[lessonId]/quiz', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.post(
      '/api/courses/00000000-0000-0000-0000-000000000001/lessons/00000000-0000-0000-0000-000000000002/quiz',
      { data: { quizId: 'test', title: 'Test', questions: [] } },
    );
    expect([401, 429]).toContain(res.status());
  });

  test('returns 400 for empty questions array', async ({ request }) => {
    const jwt = await login(request);
    const { courseId, lessonId } = await createCourseWithLesson(request, jwt);

    const res = await request.post(`/api/courses/${courseId}/lessons/${lessonId}/quiz`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { quizId: 'empty-quiz', title: 'Empty', questions: [] },
    });
    expect(res.status()).toBe(400);
  });

  test('returns 404 for course not owned by user', async ({ request }) => {
    const jwt = await login(request);
    const res = await request.post(
      '/api/courses/00000000-0000-0000-0000-000000000001/lessons/00000000-0000-0000-0000-000000000002/quiz',
      {
        headers: { Authorization: `Bearer ${jwt}` },
        data: {
          quizId: 'test-quiz',
          title: 'Test',
          questions: [{
            type: 'multiple_choice',
            prompt: 'What is a generic?',
            choices: ['A type parameter', 'A function', 'A class', 'A variable'],
            answer: 0,
            explanation: 'Generics are type parameters.',
            points: 1,
          }],
        },
      },
    );
    expect(res.status()).toBe(404);
  });

  test('successfully saves MCQ quiz and returns questionsCreated', async ({ request }) => {
    const jwt = await login(request);
    const { courseId, lessonId } = await createCourseWithLesson(request, jwt);

    const questions = [
      {
        type: 'multiple_choice',
        prompt: 'What is the purpose of TypeScript generics?',
        choices: [
          'To write reusable type-safe code',
          'To define class methods',
          'To handle async operations',
          'To manage state',
        ],
        answer: 0,
        explanation: 'Generics enable reusable type-safe components.',
        points: 1,
      },
      {
        type: 'multiple_choice',
        prompt: 'Which syntax creates a generic function in TypeScript?',
        choices: ['function f<T>()', 'function f(T)', 'function f[T]()', 'function f{T}()'],
        answer: 0,
        explanation: 'Angle brackets <T> define the type parameter.',
        points: 1,
      },
      {
        type: 'true_false',
        prompt: 'TypeScript generics are erased at runtime.',
        answer: true,
        explanation: 'TypeScript is compiled to JavaScript which has no generics.',
        points: 1,
      },
    ];

    const res = await request.post(`/api/courses/${courseId}/lessons/${lessonId}/quiz`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: {
        quizId: `ts-generics-quiz-${Date.now()}`,
        title: 'TypeScript Generics Quiz',
        questions,
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json() as { quizId: string; quizSlug: string; questionsCreated: number };
    expect(typeof body.quizId).toBe('string');
    expect(typeof body.quizSlug).toBe('string');
    expect(body.questionsCreated).toBe(3);
  });

  test('updates lesson has_quiz and quiz_slug after save', async ({ request }) => {
    const jwt = await login(request);
    const { courseId, lessonId } = await createCourseWithLesson(request, jwt);

    const quizSlug = `update-test-quiz-${Date.now()}`;
    await request.post(`/api/courses/${courseId}/lessons/${lessonId}/quiz`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: {
        quizId: quizSlug,
        title: 'Update Test Quiz',
        questions: [{
          type: 'multiple_choice',
          prompt: 'What does T stand for in generics?',
          choices: ['Type', 'Template', 'Typed', 'Test'],
          answer: 0,
          explanation: 'T is conventional for Type.',
          points: 1,
        }],
      },
    });

    // Check lesson was updated via Supabase direct query
    const lessonRes = await request.get(
      `${SUPA_URL}/rest/v1/lessons?id=eq.${lessonId}&select=has_quiz,quiz_slug`,
      { headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwt}` } },
    );
    const lessons = await lessonRes.json() as Array<{ has_quiz: boolean; quiz_slug: string }>;
    expect(lessons[0]?.has_quiz).toBe(true);
    expect(lessons[0]?.quiz_slug).toBe(quizSlug);
  });

  test('regenerating quiz replaces questions (not duplicates)', async ({ request }) => {
    const jwt = await login(request);
    const { courseId, lessonId } = await createCourseWithLesson(request, jwt);

    const singleQuestion = {
      type: 'multiple_choice',
      prompt: 'Test question for dedup check?',
      choices: ['A', 'B', 'C', 'D'],
      answer: 0,
      explanation: 'Explanation.',
      points: 1,
    };

    // Save once (1 question)
    await request.post(`/api/courses/${courseId}/lessons/${lessonId}/quiz`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { quizId: 'dedup-quiz', title: 'Dedup Test', questions: [singleQuestion] },
    });

    // Save again (2 questions) — should replace, not append
    const res = await request.post(`/api/courses/${courseId}/lessons/${lessonId}/quiz`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: {
        quizId: 'dedup-quiz',
        title: 'Dedup Test v2',
        questions: [singleQuestion, { ...singleQuestion, prompt: 'Second question?' }],
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { questionsCreated: number };
    expect(body.questionsCreated).toBe(2); // Not 3

    // Verify via GET
    const getRes = await request.get(`/api/courses/${courseId}/lessons/${lessonId}/quiz`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const { questions } = await getRes.json() as { questions: unknown[] };
    expect(questions.length).toBe(2);
  });
});

// ── 3. GET /api/courses/[courseId]/lessons/[lessonId]/quiz ────────────────────

test.describe('3 · GET /api/courses/[courseId]/lessons/[lessonId]/quiz', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.get(
      '/api/courses/00000000-0000-0000-0000-000000000001/lessons/00000000-0000-0000-0000-000000000002/quiz',
    );
    expect([401, 429]).toContain(res.status());
  });

  test('returns null quiz for lesson with no quiz', async ({ request }) => {
    const jwt = await login(request);
    const { courseId, lessonId } = await createCourseWithLesson(request, jwt);

    const res = await request.get(`/api/courses/${courseId}/lessons/${lessonId}/quiz`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { quiz: null; questions: unknown[] };
    expect(body.quiz).toBeNull();
    expect(body.questions).toEqual([]);
  });

  test('returns quiz + questions after save', async ({ request }) => {
    const jwt = await login(request);
    const { courseId, lessonId } = await createCourseWithLesson(request, jwt);

    // Save quiz
    await request.post(`/api/courses/${courseId}/lessons/${lessonId}/quiz`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: {
        quizId: 'get-quiz-test',
        title: 'Get Quiz Test',
        questions: [
          {
            type: 'multiple_choice',
            prompt: 'What is a type constraint in TypeScript?',
            choices: ['extends clause', 'implements clause', 'type clause', 'is clause'],
            answer: 0,
            explanation: 'The extends keyword constrains generic types.',
            points: 1,
          },
          {
            type: 'true_false',
            prompt: 'Generic type parameters can be constrained with extends.',
            answer: true,
            explanation: 'Yes, T extends X requires T to have X\'s shape.',
            points: 1,
          },
        ],
      },
    });

    // Fetch it back
    const res = await request.get(`/api/courses/${courseId}/lessons/${lessonId}/quiz`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as {
      quiz: { slug: string; title: string; ai_generated: boolean };
      questions: Array<{ question: string; question_type: string; correct_index: number }>;
    };

    expect(body.quiz).toBeTruthy();
    expect(body.quiz.title).toBe('Get Quiz Test');
    expect(body.quiz.ai_generated).toBe(true);
    expect(body.questions.length).toBe(2);
    expect(body.questions[0].question_type).toBe('multiple_choice');
    expect(body.questions[0].correct_index).toBe(0);
    expect(body.questions[1].question_type).toBe('true_false');
  });
});

// ── 4. Dashboard lesson page — route guards ───────────────────────────────────

test.describe('4 · Dashboard lesson editor page', () => {
  test('redirects to login when unauthenticated', async ({ page }) => {
    const res = await page.goto(
      '/dashboard/courses/00000000-0000-0000-0000-000000000001/lessons/00000000-0000-0000-0000-000000000002',
      { waitUntil: 'commit' },
    );
    const url = page.url();
    const isLoginRedirect = url.includes('/auth/login') || url.includes('/login');
    const hasSignIn = await page.locator('text=sign in').isVisible().catch(() => false);
    expect(isLoginRedirect || hasSignIn).toBe(true);
  });

  test('GET /api/courses/[courseId]/lessons/[lessonId]/quiz returns 404 for unknown course', async ({ request }) => {
    const jwt = await login(request);
    const res = await request.get(
      '/api/courses/00000000-0000-0000-0000-000000000099/lessons/00000000-0000-0000-0000-000000000099/quiz',
      { headers: { Authorization: `Bearer ${jwt}` } },
    );
    expect(res.status()).toBe(404);
  });
});

// ── 5. AI quiz generate from lessonId (DB fetch) ──────────────────────────────

test.describe('5 · Quiz generation from lessonId', () => {
  test('generates or gracefully fails for real lesson with content', async ({ request }) => {
    const jwt = await login(request);
    const { lessonId } = await createCourseWithLesson(request, jwt);

    const res = await request.post('/api/quiz/generate', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { lessonId, numQuestions: 3 },
    });

    // 200 = Vercel deployment (AI works), 503 = local (no OIDC), either is valid
    expect([200, 503]).toContain(res.status());

    const body = await res.json() as { yaml?: string; questions?: unknown[]; error?: string };
    if (res.status() === 200) {
      expect(typeof body.yaml).toBe('string');
      expect(Array.isArray(body.questions)).toBe(true);
    } else {
      expect(typeof body.error).toBe('string');
    }
  });

  test('full flow: generate then save quiz via API', async ({ request }) => {
    const jwt = await login(request);
    const { courseId, lessonId } = await createCourseWithLesson(request, jwt);

    // Step 1: Generate
    const genRes = await request.post('/api/quiz/generate', {
      headers: { Authorization: `Bearer ${jwt}` },
      data: { lessonId, numQuestions: 2 },
    });

    expect([200, 503]).toContain(genRes.status());

    if (genRes.status() === 503) {
      // AI not available — test save-only flow with mock data
      const saveRes = await request.post(`/api/courses/${courseId}/lessons/${lessonId}/quiz`, {
        headers: { Authorization: `Bearer ${jwt}` },
        data: {
          quizId: 'mock-ai-quiz',
          title: 'TypeScript Generics Quiz (Mock)',
          questions: [
            {
              type: 'multiple_choice',
              prompt: 'What is the syntax for a generic function?',
              choices: ['function f<T>()', 'function f(T)', 'function f[T]()', 'generic function f()'],
              answer: 0,
              explanation: 'Angle brackets denote type parameters.',
              points: 1,
            },
            {
              type: 'true_false',
              prompt: 'TypeScript generics provide compile-time type checking.',
              answer: true,
              explanation: 'Yes, this is their primary purpose.',
              points: 1,
            },
          ],
        },
      });
      expect(saveRes.status()).toBe(200);
      const saved = await saveRes.json() as { questionsCreated: number };
      expect(saved.questionsCreated).toBe(2);
      return;
    }

    // Step 2: Save the AI-generated quiz
    const genBody = await genRes.json() as {
      yaml: string;
      questions: Array<{ type: string; prompt: string; choices?: string[]; answer: number | boolean; explanation: string; points: number }>;
      quizId: string;
      title: string;
    };

    const saveRes = await request.post(`/api/courses/${courseId}/lessons/${lessonId}/quiz`, {
      headers: { Authorization: `Bearer ${jwt}` },
      data: {
        quizId: genBody.quizId || 'ai-generated-quiz',
        title: genBody.title || 'AI Generated Quiz',
        questions: genBody.questions,
        yaml: genBody.yaml,
      },
    });
    expect(saveRes.status()).toBe(200);
    const saved = await saveRes.json() as { questionsCreated: number; quizSlug: string };
    expect(saved.questionsCreated).toBeGreaterThanOrEqual(1);
    expect(typeof saved.quizSlug).toBe('string');

    // Step 3: Verify retrieval
    const getRes = await request.get(`/api/courses/${courseId}/lessons/${lessonId}/quiz`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    expect(getRes.status()).toBe(200);
    const gotten = await getRes.json() as { quiz: { ai_generated: boolean }; questions: unknown[] };
    expect(gotten.quiz.ai_generated).toBe(true);
    expect(gotten.questions.length).toBe(saved.questionsCreated);
  });
});
