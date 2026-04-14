/**
 * e2e/launch-blog.spec.ts
 *
 * Tests for:
 * - /launch page (directory submissions, Show HN post, templates, blog links)
 * - /blog index
 * - 3 blog posts with JSON-LD
 * - /public/templates files accessible
 * - Sitemap includes blog + launch
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE = process.env.BASE_URL || "http://localhost:3000";

// ── /launch ───────────────────────────────────────────────────────────────────

test.describe("/launch", () => {
  test("loads and returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/launch`);
    expect(res.ok()).toBeTruthy();
  });

  test("renders h1 'DocsCI is live'", async ({ page }) => {
    await page.goto(`${BASE}/launch`);
    await expect(page.locator("[data-testid='page-h1']")).toContainText("DocsCI is live");
  });

  test("shows submissions section with 4 platforms", async ({ page }) => {
    await page.goto(`${BASE}/launch`);
    await expect(page.locator("[data-testid='submissions-section']")).toBeVisible();
    await expect(page.locator("[data-testid='hn-link']")).toBeVisible();
    await expect(page.locator("[data-testid='ph-link']")).toBeVisible();
    await expect(page.locator("[data-testid='ih-link']")).toBeVisible();
    await expect(page.locator("[data-testid='bl-link']")).toBeVisible();
  });

  test("shows Show HN post text", async ({ page }) => {
    await page.goto(`${BASE}/launch`);
    await expect(page.locator("[data-testid='show-hn-section']")).toBeVisible();
    const text = await page.locator("[data-testid='show-hn-section']").textContent();
    expect(text).toContain("Show HN");
    expect(text).toContain("snippetci.com");
  });

  test("shows Product Hunt submission copy", async ({ page }) => {
    await page.goto(`${BASE}/launch`);
    await expect(page.locator("[data-testid='ph-section']")).toBeVisible();
    const text = await page.locator("[data-testid='ph-section']").textContent();
    expect(text).toContain("drift");
  });

  test("shows Indie Hackers launch post", async ({ page }) => {
    await page.goto(`${BASE}/launch`);
    await expect(page.locator("[data-testid='ih-section']")).toBeVisible();
  });

  test("shows templates section with 2 downloadable files", async ({ page }) => {
    await page.goto(`${BASE}/launch`);
    await expect(page.locator("[data-testid='templates-section']")).toBeVisible();
    await expect(page.locator("[data-testid='template-docsci-github-actions.yml']")).toBeVisible();
    await expect(page.locator("[data-testid='template-docsci.yml']")).toBeVisible();
  });

  test("shows blog section with 3 posts", async ({ page }) => {
    await page.goto(`${BASE}/launch`);
    await expect(page.locator("[data-testid='blog-section']")).toBeVisible();
    const links = page.locator("[data-testid='blog-section'] a");
    expect(await links.count()).toBeGreaterThanOrEqual(3);
  });

  test("has signup CTA link", async ({ page }) => {
    await page.goto(`${BASE}/launch`);
    const signup = page.locator("a[href='/signup']").first();
    await expect(signup).toBeVisible();
  });
});

// ── /blog index ───────────────────────────────────────────────────────────────

test.describe("/blog", () => {
  test("loads and returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/blog`);
    expect(res.ok()).toBeTruthy();
  });

  test("renders h1 'Blog'", async ({ page }) => {
    await page.goto(`${BASE}/blog`);
    await expect(page.locator("[data-testid='page-h1']")).toContainText("Blog");
  });

  test("shows 3 posts", async ({ page }) => {
    await page.goto(`${BASE}/blog`);
    await expect(page.locator("[data-testid='posts-list']")).toBeVisible();
    const posts = page.locator("[data-testid^='post-']");
    await expect(posts).toHaveCount(3);
  });

  test("lists all 3 blog post titles", async ({ page }) => {
    await page.goto(`${BASE}/blog`);
    const content = await page.content();
    expect(content).toContain("Broken Documentation");
    expect(content).toContain("API Drift");
    expect(content).toContain("GitHub Actions");
  });
});

// ── Blog post: broken-docs-cost ───────────────────────────────────────────────

test.describe("/blog/broken-docs-cost", () => {
  test("loads and returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/blog/broken-docs-cost`);
    expect(res.ok()).toBeTruthy();
  });

  test("renders h1", async ({ page }) => {
    await page.goto(`${BASE}/blog/broken-docs-cost`);
    await expect(page.locator("[data-testid='post-h1']")).toBeVisible();
    const text = await page.locator("[data-testid='post-h1']").textContent();
    expect(text).toContain("$47K");
  });

  test("has JSON-LD BlogPosting", async ({ request }) => {
    const res = await request.get(`${BASE}/blog/broken-docs-cost`);
    const html = await res.text();
    expect(html).toContain("BlogPosting");
  });

  test("contains code example", async ({ page }) => {
    await page.goto(`${BASE}/blog/broken-docs-cost`);
    const pre = page.locator("pre").first();
    await expect(pre).toBeVisible();
  });

  test("has CTA link to signup", async ({ page }) => {
    await page.goto(`${BASE}/blog/broken-docs-cost`);
    const cta = page.locator("a[href='/signup']");
    await expect(cta.first()).toBeVisible();
  });
});

// ── Blog post: api-drift-detection ────────────────────────────────────────────

test.describe("/blog/api-drift-detection", () => {
  test("loads and returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/blog/api-drift-detection`);
    expect(res.ok()).toBeTruthy();
  });

  test("renders h1 about API drift", async ({ page }) => {
    await page.goto(`${BASE}/blog/api-drift-detection`);
    await expect(page.locator("[data-testid='post-h1']")).toContainText("API Drift");
  });

  test("has JSON-LD BlogPosting", async ({ request }) => {
    const res = await request.get(`${BASE}/blog/api-drift-detection`);
    const html = await res.text();
    expect(html).toContain("BlogPosting");
  });

  test("shows 3 detection layers", async ({ page }) => {
    await page.goto(`${BASE}/blog/api-drift-detection`);
    const content = await page.content();
    expect(content).toContain("Schema diffing");
    expect(content).toContain("Live probe");
    expect(content).toContain("SDK execution");
  });
});

// ── Blog post: github-actions-docs-ci ─────────────────────────────────────────

test.describe("/blog/github-actions-docs-ci", () => {
  test("loads and returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/blog/github-actions-docs-ci`);
    expect(res.ok()).toBeTruthy();
  });

  test("renders h1 about GitHub Actions", async ({ page }) => {
    await page.goto(`${BASE}/blog/github-actions-docs-ci`);
    await expect(page.locator("[data-testid='post-h1']")).toContainText("GitHub Actions");
  });

  test("has JSON-LD BlogPosting", async ({ request }) => {
    const res = await request.get(`${BASE}/blog/github-actions-docs-ci`);
    const html = await res.text();
    expect(html).toContain("BlogPosting");
  });

  test("contains 4 code blocks (basic, PR comments, monorepo, nightly)", async ({ page }) => {
    await page.goto(`${BASE}/blog/github-actions-docs-ci`);
    const pres = page.locator("pre");
    const count = await pres.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });
});

// ── Public templates ──────────────────────────────────────────────────────────

test.describe("Public templates", () => {
  test("docsci-github-actions.yml is accessible", async ({ request }) => {
    const res = await request.get(`${BASE}/templates/docsci-github-actions.yml`);
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).toContain("DOCSCI_TOKEN");
  });

  test("docsci.yml is accessible", async ({ request }) => {
    const res = await request.get(`${BASE}/templates/docsci.yml`);
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).toContain("snippetci.com");
  });
});

// ── Sitemap ───────────────────────────────────────────────────────────────────

test.describe("Sitemap — blog and launch", () => {
  test("includes /launch", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    const body = await res.text();
    expect(body).toContain("/launch");
  });

  test("includes /blog", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    const body = await res.text();
    expect(body).toContain("/blog");
  });

  test("includes all 3 blog post URLs", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    const body = await res.text();
    expect(body).toContain("/blog/broken-docs-cost");
    expect(body).toContain("/blog/api-drift-detection");
    expect(body).toContain("/blog/github-actions-docs-ci");
  });

  test("sitemap total ≥ 30 URLs", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    const body = await res.text();
    const count = (body.match(/<url>/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(30);
  });
});

// ── Source code validation ────────────────────────────────────────────────────

test.describe("Launch + blog source validation", () => {
  const base = process.cwd();

  test("app/launch/page.tsx exists", () => {
    expect(fs.existsSync(path.join(base, "app/launch/page.tsx"))).toBe(true);
  });

  test("app/blog/page.tsx exists", () => {
    expect(fs.existsSync(path.join(base, "app/blog/page.tsx"))).toBe(true);
  });

  test("all 3 blog posts exist", () => {
    for (const slug of ["broken-docs-cost", "api-drift-detection", "github-actions-docs-ci"]) {
      expect(fs.existsSync(path.join(base, `app/blog/${slug}/page.tsx`))).toBe(true);
    }
  });

  test("all 3 blog posts have JSON-LD", () => {
    for (const slug of ["broken-docs-cost", "api-drift-detection", "github-actions-docs-ci"]) {
      const content = fs.readFileSync(path.join(base, `app/blog/${slug}/page.tsx`), "utf8");
      expect(content).toContain("BlogPosting");
    }
  });

  test("public templates exist", () => {
    expect(fs.existsSync(path.join(base, "public/templates/docsci-github-actions.yml"))).toBe(true);
    expect(fs.existsSync(path.join(base, "public/templates/docsci.yml"))).toBe(true);
  });

  test("launch page mentions all 4 platforms", () => {
    const content = fs.readFileSync(path.join(base, "app/launch/page.tsx"), "utf8");
    expect(content).toContain("Hacker News");
    expect(content).toContain("Product Hunt");
    expect(content).toContain("Indie Hackers");
    expect(content).toContain("BetaList");
  });

  test("launch page links to all 3 blog posts", () => {
    const content = fs.readFileSync(path.join(base, "app/launch/page.tsx"), "utf8");
    expect(content).toContain("/blog/broken-docs-cost");
    expect(content).toContain("/blog/api-drift-detection");
    expect(content).toContain("/blog/github-actions-docs-ci");
  });

  test("sitemap.ts includes blog and launch URLs", () => {
    const content = fs.readFileSync(path.join(base, "app/sitemap.ts"), "utf8");
    expect(content).toContain("/launch");
    expect(content).toContain("/blog");
    expect(content).toContain("/blog/broken-docs-cost");
    expect(content).toContain("/blog/api-drift-detection");
    expect(content).toContain("/blog/github-actions-docs-ci");
  });
});
