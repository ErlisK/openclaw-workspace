/**
 * e2e/seo-structured-data.spec.ts
 *
 * Verifies SEO basics: sitemap, robots.txt, OG meta, JSON-LD structured data
 * on course pages and lesson pages.
 */
import { test, expect } from '@playwright/test';

const FREE_COURSE_SLUG = 'git-for-engineers';

test.describe('1 · sitemap.xml', () => {
  test('returns 200 with XML content-type', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    const ct = res.headers()['content-type'] ?? '';
    expect(ct).toContain('xml');
  });

  test('contains course URLs', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    const text = await res.text();
    expect(text).toContain('/courses/');
    expect(text).toContain('teachrepo.com');
  });

  test('contains docs URLs', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    const text = await res.text();
    expect(text).toContain('/docs');
  });
});

test.describe('2 · robots.txt', () => {
  test('returns 200', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
  });

  test('disallows /dashboard/ and /api/', async ({ request }) => {
    const res = await request.get('/robots.txt');
    const text = await res.text();
    expect(text).toContain('Disallow: /dashboard/');
    expect(text).toContain('Disallow: /api/');
  });

  test('contains Sitemap directive pointing to teachrepo.com', async ({ request }) => {
    const res = await request.get('/robots.txt');
    const text = await res.text();
    expect(text).toContain('Sitemap:');
    expect(text).toContain('teachrepo.com');
  });

  test('blocks AI crawlers (GPTBot etc)', async ({ request }) => {
    const res = await request.get('/robots.txt');
    const text = await res.text();
    expect(text).toMatch(/GPTBot|ChatGPT|anthropic-ai/);
  });
});

test.describe('3 · Course page OpenGraph meta', () => {
  test('course page has og:title', async ({ page }) => {
    await page.goto(`/courses/${FREE_COURSE_SLUG}`);
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
    expect(ogTitle!.length).toBeGreaterThan(3);
  });

  test('course page has og:description', async ({ page }) => {
    await page.goto(`/courses/${FREE_COURSE_SLUG}`);
    const ogDesc = await page.locator('meta[property="og:description"]').getAttribute('content');
    expect(ogDesc).toBeTruthy();
  });

  test('course page has og:url', async ({ page }) => {
    await page.goto(`/courses/${FREE_COURSE_SLUG}`);
    const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
    expect(ogUrl).toContain('teachrepo.com');
    expect(ogUrl).toContain(FREE_COURSE_SLUG);
  });

  test('course page has twitter:card meta', async ({ page }) => {
    await page.goto(`/courses/${FREE_COURSE_SLUG}`);
    const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content');
    expect(twitterCard).toBe('summary_large_image');
  });

  test('course page has canonical link', async ({ page }) => {
    await page.goto(`/courses/${FREE_COURSE_SLUG}`);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toContain(FREE_COURSE_SLUG);
  });
});

test.describe('4 · Course page JSON-LD structured data', () => {
  test('course page includes application/ld+json script', async ({ page }) => {
    await page.goto(`/courses/${FREE_COURSE_SLUG}`);
    const scripts = await page.locator('script[type="application/ld+json"]').all();
    expect(scripts.length).toBeGreaterThanOrEqual(1);
  });

  test('JSON-LD has @type: Course', async ({ page }) => {
    await page.goto(`/courses/${FREE_COURSE_SLUG}`);
    const scripts = await page.locator('script[type="application/ld+json"]').all();
    let found = false;
    for (const s of scripts) {
      const text = await s.innerHTML();
      try {
        const data = JSON.parse(text);
        if (data['@type'] === 'Course') { found = true; break; }
      } catch { /* ignore */ }
    }
    expect(found).toBe(true);
  });

  test('JSON-LD Course has name, url, provider', async ({ page }) => {
    await page.goto(`/courses/${FREE_COURSE_SLUG}`);
    const scripts = await page.locator('script[type="application/ld+json"]').all();
    let courseData: Record<string, unknown> | null = null;
    for (const s of scripts) {
      const text = await s.innerHTML();
      try {
        const data = JSON.parse(text) as Record<string, unknown>;
        if (data['@type'] === 'Course') { courseData = data; break; }
      } catch { /* ignore */ }
    }
    expect(courseData).not.toBeNull();
    expect(courseData!['name']).toBeTruthy();
    expect(courseData!['url']).toContain('teachrepo.com');
    expect(courseData!['provider']).toBeTruthy();
  });

  test('JSON-LD Course has Offer with price', async ({ page }) => {
    await page.goto(`/courses/${FREE_COURSE_SLUG}`);
    const scripts = await page.locator('script[type="application/ld+json"]').all();
    let offer: Record<string, unknown> | null = null;
    for (const s of scripts) {
      const text = await s.innerHTML();
      try {
        const data = JSON.parse(text) as Record<string, unknown>;
        if (data['@type'] === 'Course' && data['offers']) {
          offer = data['offers'] as Record<string, unknown>;
          break;
        }
      } catch { /* ignore */ }
    }
    expect(offer).not.toBeNull();
    expect(offer!['@type']).toBe('Offer');
    expect(offer!['priceCurrency']).toBeTruthy();
  });
});

test.describe('5 · Lesson page structured data', () => {
  test('free lesson page has application/ld+json', async ({ page }) => {
    // Navigate to first lesson of free course
    await page.goto(`/courses/${FREE_COURSE_SLUG}`);
    // Click first free lesson link if available
    const freeLink = page.locator('a[href*="/lessons/"]').first();
    const lessonHref = await freeLink.getAttribute('href').catch(() => null);
    if (!lessonHref) {
      test.skip(true, 'No free lesson link found on course page');
      return;
    }
    await page.goto(lessonHref);
    const scripts = await page.locator('script[type="application/ld+json"]').all();
    expect(scripts.length).toBeGreaterThanOrEqual(1);
  });

  test('free lesson JSON-LD has @type: LearningResource', async ({ page }) => {
    await page.goto(`/courses/${FREE_COURSE_SLUG}`);
    const freeLink = page.locator('a[href*="/lessons/"]').first();
    const lessonHref = await freeLink.getAttribute('href').catch(() => null);
    if (!lessonHref) {
      test.skip(true, 'No lesson link found');
      return;
    }
    await page.goto(lessonHref);
    const scripts = await page.locator('script[type="application/ld+json"]').all();
    let found = false;
    for (const s of scripts) {
      const text = await s.innerHTML();
      try {
        const data = JSON.parse(text) as Record<string, unknown>;
        if (data['@type'] === 'LearningResource') { found = true; break; }
      } catch { /* ignore */ }
    }
    expect(found).toBe(true);
  });
});

test.describe('6 · Home page meta', () => {
  test('home page has description meta', async ({ page }) => {
    await page.goto('/');
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc).toBeTruthy();
    expect(desc!.length).toBeGreaterThan(10);
  });

  test('home page has og:title', async ({ page }) => {
    await page.goto('/');
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
  });
});
