/**
 * e2e/blog-posts.spec.ts
 *
 * Tests all 5 blog posts and the blog index.
 * Verifies: HTTP 200, correct headings, key content, CTAs, back links.
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

// ── Blog index ───────────────────────────────────────────────────────────────

test.describe('Blog index', () => {
  test('GET /blog returns 200', async ({ request }) => {
    const res = await request.get(`${BASE}/blog`);
    expect(res.status()).toBe(200);
  });

  test('/blog lists 5 posts', async ({ page }) => {
    await page.goto(`${BASE}/blog`);
    const links = page.locator('a[href^="/blog/"]');
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('/blog has all 3 technical posts listed', async ({ page }) => {
    await page.goto(`${BASE}/blog`);
    const body = await page.locator('body').textContent();
    expect(body).toContain('Markdown to Paywalled Course');
    expect(body).toContain('YAML-Frontmatter Quizzes');
    expect(body).toContain('Gated Sandboxes');
  });

  test('/blog has tag labels', async ({ page }) => {
    await page.goto(`${BASE}/blog`);
    const body = await page.locator('body').textContent();
    expect(body).toContain('tutorial');
    expect(body).toContain('engineering');
  });
});

// ── Post 1: From Markdown to Paywalled Course ────────────────────────────────

test.describe('Post: from-markdown-to-paywalled-course', () => {
  const url = `${BASE}/blog/from-markdown-to-paywalled-course`;

  test('returns 200', async ({ request }) => {
    expect((await request.get(url)).status()).toBe(200);
  });

  test('has correct h1', async ({ page }) => {
    await page.goto(url);
    const h1 = await page.locator('h1').first().textContent();
    expect(h1).toContain('Markdown');
    expect(h1).toContain('Paywalled Course');
  });

  test('shows course.yml code block', async ({ page }) => {
    await page.goto(url);
    const body = await page.locator('body').textContent();
    expect(body).toContain('course.yml');
    expect(body).toContain('price_cents');
  });

  test('shows 5-step structure', async ({ page }) => {
    await page.goto(url);
    const body = await page.locator('body').textContent();
    expect(body).toContain('Step 1');
    expect(body).toContain('Step 5');
  });

  test('has Stripe mentioned', async ({ page }) => {
    await page.goto(url);
    const body = await page.locator('body').textContent();
    expect(body).toContain('Stripe');
  });

  test('has CTA with signup link', async ({ page }) => {
    await page.goto(url);
    const cta = page.locator('a[href*="signup"]');
    await expect(cta).toBeVisible();
  });

  test('has back-to-blog link', async ({ page }) => {
    await page.goto(url);
    await expect(page.locator('a[href="/blog"]').first()).toBeVisible();
  });

  test('shows read time', async ({ page }) => {
    await page.goto(url);
    expect(await page.locator('body').textContent()).toContain('min read');
  });
});

// ── Post 2: YAML Frontmatter Quizzes ─────────────────────────────────────────

test.describe('Post: yaml-frontmatter-quizzes', () => {
  const url = `${BASE}/blog/yaml-frontmatter-quizzes`;

  test('returns 200', async ({ request }) => {
    expect((await request.get(url)).status()).toBe(200);
  });

  test('has correct h1', async ({ page }) => {
    await page.goto(url);
    const h1 = await page.locator('h1').first().textContent();
    expect(h1).toContain('YAML');
    expect(h1).toContain('Quiz');
  });

  test('shows YAML quiz schema example', async ({ page }) => {
    await page.goto(url);
    const body = await page.locator('body').textContent();
    expect(body).toContain('quiz:');
    expect(body).toContain('options:');
    expect(body).toContain('answer:');
  });

  test('explains client-side grading', async ({ page }) => {
    await page.goto(url);
    const body = await page.locator('body').textContent();
    expect(body).toContain('client-side');
  });

  test('mentions explanation field', async ({ page }) => {
    await page.goto(url);
    const body = await page.locator('body').textContent();
    expect(body).toContain('explanation');
  });

  test('has security section', async ({ page }) => {
    await page.goto(url);
    const body = await page.locator('body').textContent();
    expect(body?.toLowerCase()).toContain('cheat');
  });

  test('has CTA', async ({ page }) => {
    await page.goto(url);
    const cta = page.locator('a[href*="marketplace"], a[href*="signup"]').first();
    await expect(cta).toBeVisible();
  });
});

// ── Post 3: Gated Sandboxes ──────────────────────────────────────────────────

test.describe('Post: gated-sandboxes', () => {
  const url = `${BASE}/blog/gated-sandboxes`;

  test('returns 200', async ({ request }) => {
    expect((await request.get(url)).status()).toBe(200);
  });

  test('has correct h1', async ({ page }) => {
    await page.goto(url);
    const h1 = await page.locator('h1').first().textContent();
    expect(h1).toContain('Sandbox');
  });

  test('mentions StackBlitz', async ({ page }) => {
    await page.goto(url);
    const body = await page.locator('body').textContent();
    expect(body).toContain('StackBlitz');
  });

  test('shows sandbox YAML config', async ({ page }) => {
    await page.goto(url);
    const body = await page.locator('body').textContent();
    expect(body).toContain('provider: stackblitz');
  });

  test('shows gating code example', async ({ page }) => {
    await page.goto(url);
    const body = await page.locator('body').textContent();
    expect(body).toContain('hasAccess');
  });

  test('has comparison table', async ({ page }) => {
    await page.goto(url);
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });

  test('has best practices section', async ({ page }) => {
    await page.goto(url);
    const body = await page.locator('body').textContent();
    expect(body?.toLowerCase()).toContain('best practice');
  });

  test('has CTA with signup', async ({ page }) => {
    await page.goto(url);
    const cta = page.locator('a[href*="signup"]');
    await expect(cta).toBeVisible();
  });
});

// ── GitHub cross-posts ───────────────────────────────────────────────────────

test.describe('Cross-posts on GitHub', () => {
  const githubRaw = 'https://raw.githubusercontent.com/ErlisK/teachrepo/main/posts';

  test('from-markdown-to-paywalled-course.md exists on GitHub', async ({ request }) => {
    const res = await request.get(`${githubRaw}/from-markdown-to-paywalled-course.md`);
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('teachrepo.com');
    expect(body).toContain('canonical_url');
  });

  test('yaml-frontmatter-quizzes.md exists on GitHub', async ({ request }) => {
    const res = await request.get(`${githubRaw}/yaml-frontmatter-quizzes.md`);
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('quiz:');
  });

  test('gated-sandboxes.md exists on GitHub', async ({ request }) => {
    const res = await request.get(`${githubRaw}/gated-sandboxes.md`);
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('StackBlitz');
  });

  test('cross-post files have canonical_url pointing to teachrepo.com', async ({ request }) => {
    for (const slug of ['from-markdown-to-paywalled-course', 'yaml-frontmatter-quizzes', 'gated-sandboxes']) {
      const res = await request.get(`${githubRaw}/${slug}.md`);
      const body = await res.text();
      expect(body).toContain('canonical_url: https://teachrepo.com/blog/');
    }
  });
});
