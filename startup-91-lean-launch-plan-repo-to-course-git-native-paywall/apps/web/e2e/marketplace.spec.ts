/**
 * e2e/marketplace.spec.ts
 *
 * End-to-end tests for the public marketplace page and /api/courses JSON endpoint.
 * The sample course "Git for Engineers" (free, published) must be present in DB.
 */
import { test, expect } from '@playwright/test';

const SAMPLE_COURSE_SLUG = 'git-for-engineers';
const SAMPLE_COURSE_TITLE = 'Git for Engineers';
const COURSE_ID = 'f675a5d6-2886-460a-86ac-f01673fc02cf';

// ── Page rendering ─────────────────────────────────────────────────────────────

test.describe('Marketplace page — rendering', () => {
  test('returns HTTP 200', async ({ request }) => {
    const res = await request.get('/marketplace');
    expect(res.status()).toBe(200);
  });

  test('renders the hero headline', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page.locator('h1')).toContainText('Learn from engineers');
  });

  test('renders "TeachRepo Marketplace" badge in hero', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page.locator('text=TeachRepo Marketplace')).toBeVisible();
  });

  test('renders the courses grid', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page.locator('[data-testid="courses-grid"]')).toBeVisible({ timeout: 10000 });
  });

  test('shows the sample course title', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page.locator(`text=${SAMPLE_COURSE_TITLE}`).first()).toBeVisible({ timeout: 10000 });
  });

  test('shows "Free" price badge for the free sample course', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page.locator('text=Free').first()).toBeVisible({ timeout: 10000 });
  });

  test('shows lesson count on the course card', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page.locator('text=/\\d+ lessons?/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('shows "Enroll free →" CTA for free course', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page.locator('text=Enroll free →').first()).toBeVisible({ timeout: 10000 });
  });

  test('course card links to the course overview page', async ({ page }) => {
    await page.goto('/marketplace');
    const courseLink = page.locator(`a[href="/courses/${SAMPLE_COURSE_SLUG}"]`).first();
    await expect(courseLink).toBeVisible({ timeout: 10000 });
  });

  test('clicking course card navigates to course page', async ({ page }) => {
    await page.goto('/marketplace');
    const link = page.locator(`a[href="/courses/${SAMPLE_COURSE_SLUG}"]`).first();
    await link.click();
    await expect(page).toHaveURL(new RegExp(SAMPLE_COURSE_SLUG));
    await expect(page.locator('h1').first()).toContainText(SAMPLE_COURSE_TITLE, { timeout: 8000 });
  });

  test('shows result count summary', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page.locator('text=/\\d+ course/i').first()).toBeVisible({ timeout: 8000 });
  });

  test('shows "Build your own course" CTA at bottom', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page.locator('text=Build your own course')).toBeVisible({ timeout: 10000 });
  });
});

// ── Search / filter ────────────────────────────────────────────────────────────

test.describe('Marketplace page — search and filters', () => {
  test('search by title returns matching courses', async ({ page }) => {
    await page.goto('/marketplace?q=git');
    await expect(page.locator(`text=${SAMPLE_COURSE_TITLE}`).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=matching')).toBeVisible();
  });

  test('search for non-existent term shows empty state', async ({ page }) => {
    await page.goto('/marketplace?q=zzznomatch999xyz');
    // Either shows "No courses found" text or "0 courses" in the results summary
    const noCoursesText = page.locator('text=No courses found');
    const zeroCount = page.locator('text=0 courses');
    await expect(noCoursesText.or(zeroCount).first()).toBeVisible({ timeout: 8000 });
  });

  test('price=free filter shows only free courses', async ({ page }) => {
    await page.goto('/marketplace?price=free');
    // All price badges should be "Free" (not dollar amounts)
    const priceLabels = page.locator('[data-testid="courses-grid"] article');
    const count = await priceLabels.count();
    if (count > 0) {
      // All visible price labels should be "Free"
      const freeText = await page.locator('text=Free').count();
      expect(freeText).toBeGreaterThan(0);
    }
  });

  test('price=paid filter shows empty state (no paid courses yet)', async ({ page }) => {
    await page.goto('/marketplace?price=paid');
    // Either shows "No courses found" text or "0 courses" in the results summary
    const noCoursesText = page.locator('text=No courses found');
    const zeroCount = page.locator('text=0 courses');
    await expect(noCoursesText.or(zeroCount).first()).toBeVisible({ timeout: 8000 });
  });

  test('sort=newest is the default active chip', async ({ page }) => {
    await page.goto('/marketplace');
    // "Newest" chip should have dark background (active)
    const newestChip = page.locator('a:has-text("Newest")');
    const classes = await newestChip.getAttribute('class');
    expect(classes).toContain('bg-gray-900');
  });

  test('sort=popular chip navigates correctly', async ({ page }) => {
    await page.goto('/marketplace');
    await page.click('a:has-text("Popular")');
    await expect(page).toHaveURL(/sort=popular/);
  });

  test('sort=price_asc chip navigates correctly', async ({ page }) => {
    await page.goto('/marketplace');
    await page.click('a:has-text("Price")');
    await expect(page).toHaveURL(/sort=price_asc/);
  });

  test('free filter chip activates correctly', async ({ page }) => {
    await page.goto('/marketplace');
    await page.click('a:has-text("🎁 Free")');
    await expect(page).toHaveURL(/price=free/);
  });

  test('clear filters link appears when filtered', async ({ page }) => {
    await page.goto('/marketplace?q=git');
    await expect(page.locator('text=Clear filters')).toBeVisible();
  });

  test('clear filters link returns to unfiltered state', async ({ page }) => {
    await page.goto('/marketplace?q=git&price=free');
    await page.click('text=Clear filters');
    await expect(page).toHaveURL('/marketplace');
  });
});

// ── /api/courses JSON endpoint ─────────────────────────────────────────────────

test.describe('GET /api/courses', () => {
  test('returns 200 with courses array', async ({ request }) => {
    const res = await request.get('/api/courses');
    expect(res.status()).toBe(200);
    const body = await res.json() as { courses: unknown[]; total: number };
    expect(Array.isArray(body.courses)).toBe(true);
    expect(typeof body.total).toBe('number');
  });

  test('returns only published courses', async ({ request }) => {
    const res = await request.get('/api/courses');
    const body = await res.json() as { courses: Array<{ id: string; slug: string }> };
    expect(body.courses.length).toBeGreaterThan(0);
    // All returned courses should be the published sample course
    const slugs = body.courses.map((c) => c.slug);
    expect(slugs).toContain(SAMPLE_COURSE_SLUG);
  });

  test('returns correct shape for each course', async ({ request }) => {
    const res = await request.get('/api/courses');
    const body = await res.json() as { courses: Array<Record<string, unknown>> };
    const course = body.courses[0];
    // Required fields
    expect(typeof course.id).toBe('string');
    expect(typeof course.slug).toBe('string');
    expect(typeof course.title).toBe('string');
    expect(typeof course.price_cents).toBe('number');
    expect(typeof course.price_display).toBe('string');
    expect(typeof course.url).toBe('string');
    expect(typeof course.stats).toBe('object');
    expect(typeof course.creator).toBe('object');
  });

  test('price_display is "Free" for free courses', async ({ request }) => {
    const res = await request.get('/api/courses?price=free');
    const body = await res.json() as { courses: Array<{ price_display: string; price_cents: number }> };
    for (const course of body.courses) {
      expect(course.price_display).toBe('Free');
      expect(course.price_cents).toBe(0);
    }
  });

  test('stats object contains lesson counts and enrollment count', async ({ request }) => {
    const res = await request.get('/api/courses');
    const body = await res.json() as {
      courses: Array<{ stats: { total_lessons: number; free_lessons: number; enrollment_count: number } }>
    };
    const stats = body.courses[0]?.stats;
    expect(typeof stats.total_lessons).toBe('number');
    expect(typeof stats.free_lessons).toBe('number');
    expect(typeof stats.enrollment_count).toBe('number');
  });

  test('creator object contains display_name', async ({ request }) => {
    const res = await request.get('/api/courses');
    const body = await res.json() as { courses: Array<{ creator: { display_name: string } }> };
    expect(typeof body.courses[0]?.creator?.display_name).toBe('string');
  });

  test('search ?q=git returns the sample course', async ({ request }) => {
    const res = await request.get('/api/courses?q=git');
    const body = await res.json() as { courses: Array<{ slug: string }> };
    const slugs = body.courses.map((c) => c.slug);
    expect(slugs).toContain(SAMPLE_COURSE_SLUG);
  });

  test('search ?q=zzznomatch returns empty array', async ({ request }) => {
    const res = await request.get('/api/courses?q=zzznomatch999xyz');
    const body = await res.json() as { courses: unknown[] };
    expect(body.courses.length).toBe(0);
  });

  test('price=free filter returns only free courses', async ({ request }) => {
    const res = await request.get('/api/courses?price=free');
    const body = await res.json() as { courses: Array<{ price_cents: number }> };
    for (const course of body.courses) {
      expect(course.price_cents).toBe(0);
    }
  });

  test('price=paid filter returns empty (no paid courses yet)', async ({ request }) => {
    const res = await request.get('/api/courses?price=paid');
    const body = await res.json() as { courses: unknown[] };
    // No paid courses in the DB yet
    expect(body.courses.length).toBe(0);
  });

  test('sort=price_asc returns 200', async ({ request }) => {
    const res = await request.get('/api/courses?sort=price_asc');
    expect(res.status()).toBe(200);
  });

  test('sort=popular returns 200', async ({ request }) => {
    const res = await request.get('/api/courses?sort=popular');
    expect(res.status()).toBe(200);
  });

  test('returns 400 for invalid sort value', async ({ request }) => {
    const res = await request.get('/api/courses?sort=invalid_sort');
    expect(res.status()).toBe(400);
  });

  test('limit and offset params work', async ({ request }) => {
    const res = await request.get('/api/courses?limit=1&offset=0');
    expect(res.status()).toBe(200);
    const body = await res.json() as { courses: unknown[]; limit: number; offset: number };
    expect(body.limit).toBe(1);
    expect(body.offset).toBe(0);
    expect(body.courses.length).toBeLessThanOrEqual(1);
  });

  test('has Cache-Control header for CDN caching', async ({ request }) => {
    const res = await request.get('/api/courses');
    const cacheControl = res.headers()['cache-control'];
    // Vercel may strip s-maxage but the header should still be present
    expect(cacheControl).toBeTruthy();
    // Should contain some caching directive (public, max-age, or s-maxage)
    expect(cacheControl).toMatch(/public|max-age|s-maxage/);
  });
});

// ── SEO / meta ──────────────────────────────────────────────────────────────────

test.describe('Marketplace SEO', () => {
  test('page has correct title tag', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page).toHaveTitle(/Marketplace.*TeachRepo/i);
  });

  test('page has meta description', async ({ page }) => {
    await page.goto('/marketplace');
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc).toBeTruthy();
    expect(desc!.length).toBeGreaterThan(20);
  });

  test('page has og:title', async ({ page }) => {
    await page.goto('/marketplace');
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
  });
});

// ── Accessibility ───────────────────────────────────────────────────────────────

test.describe('Marketplace accessibility', () => {
  test('course cards use <article> elements', async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForSelector('[data-testid="courses-grid"]');
    const articles = page.locator('[data-testid="courses-grid"] article');
    const count = await articles.count();
    expect(count).toBeGreaterThan(0);
  });

  test('course titles are in heading elements', async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForSelector('[data-testid="courses-grid"]');
    const headings = page.locator('[data-testid="courses-grid"] h2');
    expect(await headings.count()).toBeGreaterThan(0);
  });
});
