/**
 * e2e/open-source.spec.ts
 *
 * Tests for:
 * 1. GitHub repos (teachrepo-template, teachrepo-cli) — public, have README + LICENSE
 * 2. Homepage "Open Source" section with repo links
 * 3. /docs/cli page
 * 4. /docs/template page
 * 5. Docs index has CLI + Template links
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const GH_RAW = 'https://raw.githubusercontent.com/ErlisK';

// ── 1. GitHub repos ──────────────────────────────────────────────────────────

test.describe('1 · teachrepo-template repo', () => {
  test('README is accessible on GitHub', async ({ request }) => {
    const res = await request.get(`${GH_RAW}/teachrepo-template/main/README.md`);
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('TeachRepo');
    expect(body).toContain('teachrepo.com');
  });

  test('README has quick start section', async ({ request }) => {
    const res = await request.get(`${GH_RAW}/teachrepo-template/main/README.md`);
    const body = await res.text();
    expect(body).toContain('Quick Start');
    expect(body).toContain('git clone');
  });

  test('course.yml template exists', async ({ request }) => {
    const res = await request.get(`${GH_RAW}/teachrepo-template/main/course.yml`);
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('price_cents');
    expect(body).toContain('lessons:');
  });

  test('lessons directory has 4 lesson files', async ({ request }) => {
    for (const lesson of ['01-introduction', '02-core-concepts', '03-advanced', '04-conclusion']) {
      const res = await request.get(`${GH_RAW}/teachrepo-template/main/lessons/${lesson}.md`);
      expect(res.status()).toBe(200);
    }
  });

  test('lesson 02 has a quiz in frontmatter', async ({ request }) => {
    const res = await request.get(`${GH_RAW}/teachrepo-template/main/lessons/02-core-concepts.md`);
    const body = await res.text();
    expect(body).toContain('quiz:');
    expect(body).toContain('answer:');
  });

  test('lesson 03 has a sandbox in frontmatter', async ({ request }) => {
    const res = await request.get(`${GH_RAW}/teachrepo-template/main/lessons/03-advanced.md`);
    const body = await res.text();
    expect(body).toContain('sandbox:');
    expect(body).toContain('provider:');
  });

  test('GitHub Actions workflow exists', async ({ request }) => {
    const res = await request.get(`${GH_RAW}/teachrepo-template/main/.github/workflows/deploy.yml`);
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('teachrepo import');
  });

  test('LICENSE is MIT', async ({ request }) => {
    const res = await request.get(`${GH_RAW}/teachrepo-template/main/LICENSE`);
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('MIT');
  });

  test('.env.example has required vars', async ({ request }) => {
    const res = await request.get(`${GH_RAW}/teachrepo-template/main/.env.example`);
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('STRIPE_SECRET_KEY');
    expect(body).toContain('SUPABASE');
  });
});

test.describe('2 · teachrepo-cli repo', () => {
  test('README is accessible on GitHub', async ({ request }) => {
    const res = await request.get(`${GH_RAW}/teachrepo-cli/main/README.md`);
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('@teachrepo/cli');
    expect(body).toContain('teachrepo import');
  });

  test('README has all 4 commands documented', async ({ request }) => {
    const res = await request.get(`${GH_RAW}/teachrepo-cli/main/README.md`);
    const body = await res.text();
    expect(body).toContain('teachrepo import');
    expect(body).toContain('teachrepo validate');
    expect(body).toContain('teachrepo new');
    expect(body).toContain('teachrepo whoami');
  });

  test('package.json has correct package name', async ({ request }) => {
    const res = await request.get(`${GH_RAW}/teachrepo-cli/main/package.json`);
    expect(res.status()).toBe(200);
    const body = await res.text();
    const pkg = JSON.parse(body);
    expect(pkg.name).toBe('@teachrepo/cli');
    expect(pkg.bin?.teachrepo).toBeDefined();
  });

  test('validate lib source exists', async ({ request }) => {
    const res = await request.get(`${GH_RAW}/teachrepo-cli/main/src/lib/validate.ts`);
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('validateCourseYml');
    expect(body).toContain('quiz');
    expect(body).toContain('sandbox');
  });

  test('LICENSE is MIT', async ({ request }) => {
    const res = await request.get(`${GH_RAW}/teachrepo-cli/main/LICENSE`);
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('MIT');
  });
});

// ── 3. Homepage Open Source section ─────────────────────────────────────────

test.describe('3 · Homepage Open Source section', () => {
  test('homepage has Open Source heading', async ({ page }) => {
    await page.goto(`${BASE}/`);
    const body = await page.locator('body').textContent();
    expect(body).toContain('Open Source');
  });

  test('homepage links to teachrepo-template', async ({ page }) => {
    await page.goto(`${BASE}/`);
    const link = page.locator('a[href*="teachrepo-template"]');
    await expect(link.first()).toBeVisible();
  });

  test('homepage links to teachrepo-cli', async ({ page }) => {
    await page.goto(`${BASE}/`);
    const link = page.locator('a[href*="teachrepo-cli"]');
    await expect(link.first()).toBeVisible();
  });

  test('homepage shows CLI install snippet', async ({ page }) => {
    await page.goto(`${BASE}/`);
    const body = await page.locator('body').textContent();
    expect(body).toContain('npm install -g @teachrepo/cli');
  });

  test('homepage has link to /docs/cli', async ({ page }) => {
    await page.goto(`${BASE}/`);
    const link = page.locator('a[href="/docs/cli"]');
    await expect(link.first()).toBeVisible();
  });

  test('homepage has link to /docs/self-hosting', async ({ page }) => {
    await page.goto(`${BASE}/`);
    const link = page.locator('a[href="/docs/self-hosting"]');
    await expect(link.first()).toBeVisible();
  });
});

// ── 4. /docs/cli page ────────────────────────────────────────────────────────

test.describe('4 · /docs/cli page', () => {
  test('returns 200', async ({ request }) => {
    expect((await request.get(`${BASE}/docs/cli`)).status()).toBe(200);
  });

  test('has CLI heading', async ({ page }) => {
    await page.goto(`${BASE}/docs/cli`);
    const h1 = await page.locator('h1').first().textContent();
    expect(h1?.toLowerCase()).toContain('cli');
  });

  test('documents all 4 commands', async ({ page }) => {
    await page.goto(`${BASE}/docs/cli`);
    const body = await page.locator('body').textContent();
    expect(body).toContain('teachrepo import');
    expect(body).toContain('teachrepo validate');
    expect(body).toContain('teachrepo new');
    expect(body).toContain('teachrepo whoami');
  });

  test('shows npm install command', async ({ page }) => {
    await page.goto(`${BASE}/docs/cli`);
    const body = await page.locator('body').textContent();
    expect(body).toContain('npm install -g @teachrepo/cli');
  });

  test('links to GitHub repo', async ({ page }) => {
    await page.goto(`${BASE}/docs/cli`);
    const link = page.locator('a[href*="teachrepo-cli"]');
    await expect(link.first()).toBeVisible();
  });
});

// ── 5. /docs/template page ────────────────────────────────────────────────────

test.describe('5 · /docs/template page', () => {
  test('returns 200', async ({ request }) => {
    expect((await request.get(`${BASE}/docs/template`)).status()).toBe(200);
  });

  test('has Template heading', async ({ page }) => {
    await page.goto(`${BASE}/docs/template`);
    const h1 = await page.locator('h1').first().textContent();
    expect(h1?.toLowerCase()).toContain('template');
  });

  test('shows file structure', async ({ page }) => {
    await page.goto(`${BASE}/docs/template`);
    const body = await page.locator('body').textContent();
    expect(body).toContain('course.yml');
    expect(body).toContain('lessons/');
    expect(body).toContain('deploy.yml');
  });

  test('shows course.yml example', async ({ page }) => {
    await page.goto(`${BASE}/docs/template`);
    const body = await page.locator('body').textContent();
    expect(body).toContain('price_cents');
    expect(body).toContain('access: free');
    expect(body).toContain('access: paid');
  });

  test('links to GitHub template repo', async ({ page }) => {
    await page.goto(`${BASE}/docs/template`);
    const link = page.locator('a[href*="teachrepo-template"]');
    await expect(link.first()).toBeVisible();
  });
});

// ── 6. Docs index ────────────────────────────────────────────────────────────

test.describe('6 · Docs index has CLI and Template links', () => {
  test('docs index links to /docs/cli', async ({ page }) => {
    await page.goto(`${BASE}/docs`);
    const link = page.locator('a[href="/docs/cli"]');
    await expect(link).toBeVisible();
  });

  test('docs index links to /docs/template', async ({ page }) => {
    await page.goto(`${BASE}/docs`);
    const link = page.locator('a[href="/docs/template"]');
    await expect(link).toBeVisible();
  });
});
