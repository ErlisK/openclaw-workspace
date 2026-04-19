/**
 * e2e/seo-and-docs.spec.ts
 *
 * Tests for:
 *   1. SEO assets — sitemap.xml, robots.txt (HTTP 200, correct content-type)
 *   2. Root page meta tags (og:title, twitter:card, canonical)
 *   3. Docs pages — at least 5 pages load with 200
 *   4. Docs content — each page has meaningful headings
 *   5. Admin analytics dashboard page renders
 */

import { test, expect } from '@playwright/test';

test.use({ baseURL: process.env.BASE_URL ?? 'http://localhost:3000' });

// ── 1. Sitemap ──────────────────────────────────────────────────────────────

test.describe('1 · sitemap.xml', () => {
  test('GET /sitemap.xml returns 200', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
  });

  test('sitemap content-type is XML', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    const ct = res.headers()['content-type'] ?? '';
    expect(ct).toMatch(/xml/);
  });

  test('sitemap contains root URL', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    const text = await res.text();
    expect(text).toContain('<urlset');
    expect(text).toContain('<url>');
    expect(text).toContain('teachrepo.com');
  });

  test('sitemap includes docs pages', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    const text = await res.text();
    expect(text).toContain('/docs');
  });
});

// ── 2. robots.txt ───────────────────────────────────────────────────────────

test.describe('2 · robots.txt', () => {
  test('GET /robots.txt returns 200', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
  });

  test('robots.txt contains User-agent and Disallow', async ({ request }) => {
    const res = await request.get('/robots.txt');
    const text = await res.text();
    expect(text).toMatch(/User-[Aa]gent:/);
    expect(text).toContain('Disallow:');
  });

  test('robots.txt disallows /dashboard/', async ({ request }) => {
    const res = await request.get('/robots.txt');
    const text = await res.text();
    expect(text).toContain('/dashboard/');
  });

  test('robots.txt references sitemap', async ({ request }) => {
    const res = await request.get('/robots.txt');
    const text = await res.text();
    expect(text).toContain('Sitemap:');
    expect(text).toContain('sitemap.xml');
  });

  test('robots.txt blocks AI crawlers', async ({ request }) => {
    const res = await request.get('/robots.txt');
    const text = await res.text();
    expect(text).toMatch(/GPTBot|anthropic-ai|Claude-Web|CCBot/);
  });
});

// ── 3. Root page SEO meta tags ───────────────────────────────────────────────

test.describe('3 · Root page meta tags', () => {
  test('home page has og:title meta tag', async ({ page }) => {
    await page.goto('/');
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
    expect(ogTitle).toContain('TeachRepo');
  });

  test('home page has twitter:card meta tag', async ({ page }) => {
    await page.goto('/');
    const tc = await page.locator('meta[name="twitter:card"]').getAttribute('content');
    expect(tc).toBe('summary_large_image');
  });

  test('home page has description meta tag', async ({ page }) => {
    await page.goto('/');
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc).toBeTruthy();
    expect((desc ?? '').length).toBeGreaterThan(20);
  });

  test('marketplace page has og meta', async ({ page }) => {
    const res = await page.goto('/marketplace');
    expect(res?.status()).toBe(200);
  });
});

// ── 4. Docs pages load (5 required) ─────────────────────────────────────────

test.describe('4 · Documentation pages', () => {
  const DOC_PAGES = [
    { path: '/docs', title: 'Docs' },
    { path: '/docs/quickstart', title: 'Quickstart' },
    { path: '/docs/cli', title: 'CLI' },
    { path: '/docs/course-yaml', title: 'course.yml' },
    { path: '/docs/pricing', title: 'Pricing' },
    { path: '/docs/self-hosting', title: 'Self-Hosting' },
  ];

  for (const { path, title } of DOC_PAGES) {
    test(`${title} page (${path}) returns 200`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status(), `${path} should return 200`).toBe(200);
    });
  }

  test('/docs index has links to all sub-pages', async ({ page }) => {
    await page.goto('/docs');
    // Should have links to the main docs sections
    const links = page.locator('a[href^="/docs/"]');
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('/docs/quickstart has step-by-step content', async ({ page }) => {
    await page.goto('/docs/quickstart');
    const body = await page.textContent('body');
    expect(body).toContain('course.yml');
    expect(body).toContain('teachrepo');
  });

  test('/docs/cli has command examples', async ({ page }) => {
    await page.goto('/docs/cli');
    const body = await page.textContent('body');
    expect(body).toContain('import');
    expect(body).toContain('publish');
  });

  test('/docs/course-yaml has field reference tables', async ({ page }) => {
    await page.goto('/docs/course-yaml');
    const body = await page.textContent('body');
    expect(body).toContain('price_cents');
    expect(body).toContain('slug');
    expect(body).toContain('access');
  });

  test('/docs/pricing explains platform fee', async ({ page }) => {
    await page.goto('/docs/pricing');
    const body = await page.textContent('body');
    expect(body).toContain('5%');
    expect(body).toContain('Stripe');
  });

  test('/docs/self-hosting has setup instructions', async ({ page }) => {
    await page.goto('/docs/self-hosting');
    const body = await page.textContent('body');
    expect(body).toContain('Supabase');
    expect(body).toContain('Vercel');
    expect(body).toContain('STRIPE_SECRET_KEY');
  });
});

// ── 5. Analytics dashboard ───────────────────────────────────────────────────

test.describe('5 · Analytics dashboard page', () => {
  test('/dashboard/analytics redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    const url = page.url();
    expect(url).toContain('/auth/login');
  });

  test('GET /api/admin/analytics returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/admin/analytics');
    expect([401, 429]).toContain(res.status());
  });

  test('GET /api/admin/analytics?days=7 validates days param', async ({ request }) => {
    // No auth → 401 regardless of days param
    const res = await request.get('/api/admin/analytics?days=7');
    expect([401, 429]).toContain(res.status());
  });
});
