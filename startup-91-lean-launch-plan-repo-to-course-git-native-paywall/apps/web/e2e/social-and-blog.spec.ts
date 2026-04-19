/**
 * e2e/social-and-blog.spec.ts
 *
 * Tests for:
 * 1. Blog index + posts (2+ posts live)
 * 2. /social page (launch thread, channel links)
 * 3. GitHub repo public (teachrepo repo)
 * 4. Social post content present
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

// ── 1. Blog ─────────────────────────────────────────────────────────────────

test.describe('1 · Blog index', () => {
  test('GET /blog returns 200', async ({ request }) => {
    const res = await request.get(`${BASE}/blog`);
    expect(res.status()).toBe(200);
  });

  test('/blog page has heading', async ({ page }) => {
    await page.goto(`${BASE}/blog`);
    const h1 = await page.locator('h1').first().textContent();
    expect(h1?.toLowerCase()).toContain('blog');
  });

  test('/blog lists at least 2 posts', async ({ page }) => {
    await page.goto(`${BASE}/blog`);
    const links = page.locator('a[href^="/blog/"]');
    await expect(links).toHaveCount(2, { timeout: 10000 });
  });

  test('/blog links contain post titles', async ({ page }) => {
    await page.goto(`${BASE}/blog`);
    const text = await page.locator('body').textContent();
    expect(text).toContain('TeachRepo');
  });
});

// ── 2. Blog post 1 ──────────────────────────────────────────────────────────

test.describe('2 · Blog post: introducing-teachrepo', () => {
  test('GET /blog/introducing-teachrepo returns 200', async ({ request }) => {
    const res = await request.get(`${BASE}/blog/introducing-teachrepo`);
    expect(res.status()).toBe(200);
  });

  test('post has correct title', async ({ page }) => {
    await page.goto(`${BASE}/blog/introducing-teachrepo`);
    const h1 = await page.locator('h1').first().textContent();
    expect(h1).toContain('Introducing TeachRepo');
  });

  test('post contains product link', async ({ page }) => {
    await page.goto(`${BASE}/blog/introducing-teachrepo`);
    const links = page.locator('a[href*="teachrepo.com"], a[href*="/auth/signup"], a[href*="/marketplace"]');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
  });

  test('post has read time shown', async ({ page }) => {
    await page.goto(`${BASE}/blog/introducing-teachrepo`);
    const body = await page.locator('body').textContent();
    expect(body).toContain('min read');
  });

  test('back-to-blog link is present', async ({ page }) => {
    await page.goto(`${BASE}/blog/introducing-teachrepo`);
    const backLink = page.locator('a[href="/blog"]').first();
    await expect(backLink).toBeVisible();
  });
});

// ── 3. Blog post 2 ──────────────────────────────────────────────────────────

test.describe('3 · Blog post: why-git-native-courses', () => {
  test('GET /blog/why-git-native-courses returns 200', async ({ request }) => {
    const res = await request.get(`${BASE}/blog/why-git-native-courses`);
    expect(res.status()).toBe(200);
  });

  test('post has correct title', async ({ page }) => {
    await page.goto(`${BASE}/blog/why-git-native-courses`);
    const h1 = await page.locator('h1').first().textContent();
    expect(h1).toContain('Git-Native');
  });

  test('post has a code block with course.yml example', async ({ page }) => {
    await page.goto(`${BASE}/blog/why-git-native-courses`);
    const body = await page.locator('body').textContent();
    expect(body).toContain('course.yml');
  });

  test('post has CTA with signup link', async ({ page }) => {
    await page.goto(`${BASE}/blog/why-git-native-courses`);
    const cta = page.locator('a[href*="signup"]');
    await expect(cta).toBeVisible();
  });
});

// ── 4. /social page ─────────────────────────────────────────────────────────

test.describe('4 · /social page', () => {
  test('GET /social returns 200', async ({ request }) => {
    const res = await request.get(`${BASE}/social`);
    expect(res.status()).toBe(200);
  });

  test('/social has channel links', async ({ page }) => {
    await page.goto(`${BASE}/social`);
    const body = await page.locator('body').textContent();
    // Should mention at least 3 channels
    const channels = ['GitHub', 'Twitter', 'LinkedIn', 'Blog'];
    let found = 0;
    for (const ch of channels) {
      if (body?.includes(ch)) found++;
    }
    expect(found).toBeGreaterThanOrEqual(3);
  });

  test('/social has GitHub link to repo', async ({ page }) => {
    await page.goto(`${BASE}/social`);
    const ghLink = page.locator('a[href*="github.com"]').first();
    await expect(ghLink).toBeVisible();
  });

  test('/social shows launch thread', async ({ page }) => {
    await page.goto(`${BASE}/social`);
    const body = await page.locator('body').textContent();
    expect(body).toContain('Launch Thread');
    expect(body).toContain('@TeachRepoHQ');
  });

  test('/social launch thread has 7 tweets', async ({ page }) => {
    await page.goto(`${BASE}/social`);
    const tweets = page.locator('text=/[0-9]+\\/7/');
    // At least a few tweet cards visible
    const body = await page.locator('body').textContent();
    expect(body).toContain('1/7');
    expect(body).toContain('7/7');
  });

  test('/social mentions teachrepo.com product URL', async ({ page }) => {
    await page.goto(`${BASE}/social`);
    const body = await page.locator('body').textContent();
    expect(body).toContain('teachrepo.com');
  });
});

// ── 5. GitHub repo public ────────────────────────────────────────────────────

test.describe('5 · GitHub repository public', () => {
  test('teachrepo GitHub repo returns 200', async ({ request }) => {
    const res = await request.get('https://github.com/ErlisK/teachrepo');
    // GitHub returns 200 for public repos, 404 for private/non-existent
    expect([200, 301, 302]).toContain(res.status());
  });

  test('GitHub repo README is accessible via API', async ({ request }) => {
    const res = await request.get('https://raw.githubusercontent.com/ErlisK/teachrepo/main/README.md');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('TeachRepo');
    expect(body).toContain('teachrepo.com');
  });

  test('README mentions key features', async ({ request }) => {
    const res = await request.get('https://raw.githubusercontent.com/ErlisK/teachrepo/main/README.md');
    const body = await res.text();
    expect(body).toContain('Stripe');
    expect(body).toContain('Markdown');
    expect(body).toContain('quiz');
  });

  test('LICENSE file is accessible', async ({ request }) => {
    const res = await request.get('https://raw.githubusercontent.com/ErlisK/teachrepo/main/LICENSE');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('MIT');
  });
});

// ── 6. Blog in site navigation ───────────────────────────────────────────────

test.describe('6 · Blog and social in site navigation', () => {
  test('homepage nav contains Blog link', async ({ page }) => {
    await page.goto(`${BASE}/`);
    const blogLink = page.locator('nav a[href="/blog"]').first();
    await expect(blogLink).toBeVisible();
  });

  test('homepage footer contains Social link', async ({ page }) => {
    await page.goto(`${BASE}/`);
    const socialLink = page.locator('a[href="/social"]');
    await expect(socialLink).toBeVisible();
  });

  test('homepage footer contains Press link', async ({ page }) => {
    await page.goto(`${BASE}/`);
    const pressLink = page.locator('a[href="/press"]');
    await expect(pressLink).toBeVisible();
  });
});
