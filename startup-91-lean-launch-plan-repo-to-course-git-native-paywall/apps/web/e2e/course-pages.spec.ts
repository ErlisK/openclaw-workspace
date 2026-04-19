import { test, expect } from '@playwright/test';

// Uses baseURL from playwright.config.ts (set via BASE_URL env)
// e.g. BASE_URL=https://startup-91-lean-launch-plan-repo-to-course-git-nativ-4yle3l4ub.vercel.app npx playwright test

test.describe('Course pages', () => {
  test('Course detail renders with 200 and shows course content', async ({ page }) => {
    const res = await page.goto('/courses/git-for-engineers');
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1')).toContainText(/Git for Engineers/i);
    // Lessons section
    await expect(page.locator('h2', { hasText: /course content/i })).toBeVisible();
  });

  test('Marketplace lists at least 1 course card', async ({ page }) => {
    await page.goto('/marketplace', { waitUntil: 'networkidle' });
    // At least one <article> course card should be visible
    const cards = page.locator('article');
    await expect(cards.first()).toBeVisible();
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);
    // courses-grid should be present
    await expect(page.locator('[data-testid="courses-grid"]')).toBeVisible();
  });
});

test.describe('API health', () => {
  test('GET /api/courses?q=git returns 200 with courses', async ({ request }) => {
    const res = await request.get('/api/courses?q=git');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.courses).toBeDefined();
    expect(Array.isArray(data.courses)).toBe(true);
    expect(data.courses.length).toBeGreaterThan(0);
  });

  test('GET /api/courses returns 200 without version error', async ({ request }) => {
    const res = await request.get('/api/courses');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.courses).toBeDefined();
    expect(Array.isArray(data.courses)).toBe(true);
  });

  test('GET /api/courses/:id/lessons returns 200 with lessons', async ({ request }) => {
    // Get a course ID first
    const coursesRes = await request.get('/api/courses?q=git');
    const { courses } = await coursesRes.json();
    expect(courses.length).toBeGreaterThan(0);
    const courseId = courses[0].id;

    const res = await request.get(`/api/courses/${courseId}/lessons`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.lessons).toBeDefined();
    expect(Array.isArray(data.lessons)).toBe(true);
    expect(data.lessons.length).toBeGreaterThan(0);
    // Free lessons should be visible unauthenticated
    const freeLesson = data.lessons.find((l: { access: string }) => l.access === 'free');
    expect(freeLesson).toBeDefined();
  });

  test('POST /api/events rejects high-value events from anonymous users', async ({ request }) => {
    const res = await request.post('/api/events', {
      data: { event_name: 'checkout_completed' },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/events allows safe anonymous events', async ({ request }) => {
    const res = await request.post('/api/events', {
      data: { event_name: 'lesson_viewed' },
    });
    // 204 = accepted, not 401
    expect(res.status()).not.toBe(401);
  });
});

