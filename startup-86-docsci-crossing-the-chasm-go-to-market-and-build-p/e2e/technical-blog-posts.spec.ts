/**
 * e2e/technical-blog-posts.spec.ts
 *
 * Tests for the 3 new technical blog posts:
 * - /blog/hermetic-snippet-execution
 * - /blog/detecting-api-drift-openapi
 * - /blog/automating-accessibility-checks-docs
 * Plus updated blog index showing 6 posts.
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE = process.env.BASE_URL || "http://localhost:3000";

// ── /blog/hermetic-snippet-execution ─────────────────────────────────────────

test.describe("/blog/hermetic-snippet-execution", () => {
  test("loads and returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/blog/hermetic-snippet-execution`);
    expect(res.ok()).toBeTruthy();
  });

  test("renders h1 about hermetic execution", async ({ page }) => {
    await page.goto(`${BASE}/blog/hermetic-snippet-execution`);
    await expect(page.locator("[data-testid='post-h1']")).toBeVisible();
    const text = await page.locator("[data-testid='post-h1']").textContent();
    expect(text?.toLowerCase()).toContain("hermetic");
  });

  test("has JSON-LD BlogPosting", async ({ request }) => {
    const res = await request.get(`${BASE}/blog/hermetic-snippet-execution`);
    const html = await res.text();
    expect(html).toContain("BlogPosting");
  });

  test("mentions V8 isolates", async ({ page }) => {
    await page.goto(`${BASE}/blog/hermetic-snippet-execution`);
    const content = await page.content();
    expect(content.toLowerCase()).toContain("v8");
  });

  test("mentions Pyodide", async ({ page }) => {
    await page.goto(`${BASE}/blog/hermetic-snippet-execution`);
    const content = await page.content();
    expect(content.toLowerCase()).toContain("pyodide");
  });

  test("mentions network allowlist", async ({ page }) => {
    await page.goto(`${BASE}/blog/hermetic-snippet-execution`);
    const content = await page.content();
    expect(content.toLowerCase()).toContain("allowlist");
  });

  test("has at least 3 code blocks", async ({ page }) => {
    await page.goto(`${BASE}/blog/hermetic-snippet-execution`);
    const pres = page.locator("pre");
    const count = await pres.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("has signup CTA", async ({ page }) => {
    await page.goto(`${BASE}/blog/hermetic-snippet-execution`);
    const link = page.locator("a[href='/signup']");
    await expect(link.first()).toBeVisible();
  });
});

// ── /blog/detecting-api-drift-openapi ────────────────────────────────────────

test.describe("/blog/detecting-api-drift-openapi", () => {
  test("loads and returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/blog/detecting-api-drift-openapi`);
    expect(res.ok()).toBeTruthy();
  });

  test("renders h1 about API drift", async ({ page }) => {
    await page.goto(`${BASE}/blog/detecting-api-drift-openapi`);
    await expect(page.locator("[data-testid='post-h1']")).toBeVisible();
    const text = await page.locator("[data-testid='post-h1']").textContent();
    expect(text?.toLowerCase()).toContain("drift");
  });

  test("has JSON-LD BlogPosting", async ({ request }) => {
    const res = await request.get(`${BASE}/blog/detecting-api-drift-openapi`);
    const html = await res.text();
    expect(html).toContain("BlogPosting");
  });

  test("mentions OpenAPI spec parsing", async ({ page }) => {
    await page.goto(`${BASE}/blog/detecting-api-drift-openapi`);
    const content = await page.content();
    expect(content).toContain("OpenAPI");
  });

  test("shows drift severity table", async ({ page }) => {
    await page.goto(`${BASE}/blog/detecting-api-drift-openapi`);
    const content = await page.content();
    expect(content).toContain("critical");
    expect(content).toContain("warning");
  });

  test("includes PR comment example", async ({ page }) => {
    await page.goto(`${BASE}/blog/detecting-api-drift-openapi`);
    const pres = page.locator("pre");
    const count = await pres.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });
});

// ── /blog/automating-accessibility-checks-docs ───────────────────────────────

test.describe("/blog/automating-accessibility-checks-docs", () => {
  test("loads and returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/blog/automating-accessibility-checks-docs`);
    expect(res.ok()).toBeTruthy();
  });

  test("renders h1 about accessibility", async ({ page }) => {
    await page.goto(`${BASE}/blog/automating-accessibility-checks-docs`);
    await expect(page.locator("[data-testid='post-h1']")).toBeVisible();
    const text = await page.locator("[data-testid='post-h1']").textContent();
    expect(text?.toLowerCase()).toContain("accessibility");
  });

  test("has JSON-LD BlogPosting", async ({ request }) => {
    const res = await request.get(`${BASE}/blog/automating-accessibility-checks-docs`);
    const html = await res.text();
    expect(html).toContain("BlogPosting");
  });

  test("mentions axe-core", async ({ page }) => {
    await page.goto(`${BASE}/blog/automating-accessibility-checks-docs`);
    const content = await page.content();
    expect(content.toLowerCase()).toContain("axe-core");
  });

  test("mentions WCAG", async ({ page }) => {
    await page.goto(`${BASE}/blog/automating-accessibility-checks-docs`);
    const content = await page.content();
    expect(content).toContain("WCAG");
  });

  test("shows heading hierarchy rule", async ({ page }) => {
    await page.goto(`${BASE}/blog/automating-accessibility-checks-docs`);
    const content = await page.content();
    expect(content.toLowerCase()).toContain("heading");
  });

  test("shows docsci.yml config example", async ({ page }) => {
    await page.goto(`${BASE}/blog/automating-accessibility-checks-docs`);
    const content = await page.content();
    expect(content).toContain("docsci.yml");
  });
});

// ── /blog index — 6 posts ─────────────────────────────────────────────────────

test.describe("/blog — 6 posts total", () => {
  test("shows at least 6 posts", async ({ page }) => {
    await page.goto(`${BASE}/blog`);
    await expect(page.locator("[data-testid='posts-list']")).toBeVisible();
    const posts = page.locator("[data-testid^='post-']");
    const count = await posts.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test("includes hermetic snippet execution post", async ({ page }) => {
    await page.goto(`${BASE}/blog`);
    const content = await page.content();
    expect(content.toLowerCase()).toContain("hermetic");
  });

  test("includes detecting api drift openapi post", async ({ page }) => {
    await page.goto(`${BASE}/blog`);
    const content = await page.content();
    expect(content).toContain("detecting-api-drift-openapi");
  });

  test("includes accessibility checks post", async ({ page }) => {
    await page.goto(`${BASE}/blog`);
    const content = await page.content();
    expect(content).toContain("accessibility");
  });
});

// ── Sitemap ───────────────────────────────────────────────────────────────────

test.describe("Sitemap — 3 new blog posts", () => {
  test("includes /blog/hermetic-snippet-execution", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    expect((await res.text())).toContain("/blog/hermetic-snippet-execution");
  });

  test("includes /blog/detecting-api-drift-openapi", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    expect((await res.text())).toContain("/blog/detecting-api-drift-openapi");
  });

  test("includes /blog/automating-accessibility-checks-docs", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    expect((await res.text())).toContain("/blog/automating-accessibility-checks-docs");
  });

  test("sitemap total ≥ 35 URLs", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    const count = ((await res.text()).match(/<url>/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(35);
  });
});

// ── Source code validation ────────────────────────────────────────────────────

test.describe("Technical blog source validation", () => {
  const base = process.cwd();

  test("all 3 new blog posts exist", () => {
    const slugs = ["hermetic-snippet-execution", "detecting-api-drift-openapi", "automating-accessibility-checks-docs"];
    for (const slug of slugs) {
      expect(fs.existsSync(path.join(base, `app/blog/${slug}/page.tsx`))).toBe(true);
    }
  });

  test("all 3 new posts have BlogPosting JSON-LD", () => {
    const slugs = ["hermetic-snippet-execution", "detecting-api-drift-openapi", "automating-accessibility-checks-docs"];
    for (const slug of slugs) {
      const content = fs.readFileSync(path.join(base, `app/blog/${slug}/page.tsx`), "utf8");
      expect(content).toContain("BlogPosting");
      expect(content).toContain("snippetci.com");
    }
  });

  test("hermetic post covers V8, Pyodide, and network isolation", () => {
    const content = fs.readFileSync(path.join(base, "app/blog/hermetic-snippet-execution/page.tsx"), "utf8");
    expect(content.toLowerCase()).toContain("v8");
    expect(content.toLowerCase()).toContain("pyodide");
    expect(content.toLowerCase()).toContain("allowlist");
  });

  test("openapi drift post covers spec parsing, claims extraction, diff algorithm", () => {
    const content = fs.readFileSync(path.join(base, "app/blog/detecting-api-drift-openapi/page.tsx"), "utf8");
    expect(content).toContain("OpenAPI");
    expect(content).toContain("critical");
    expect(content).toContain("EndpointContract");
  });

  test("accessibility post covers axe-core, WCAG, and docsci.yml config", () => {
    const content = fs.readFileSync(path.join(base, "app/blog/automating-accessibility-checks-docs/page.tsx"), "utf8");
    expect(content).toContain("axe-core");
    expect(content).toContain("WCAG");
    expect(content).toContain("docsci.yml");
  });

  test("blog index includes all 6 post slugs", () => {
    const content = fs.readFileSync(path.join(base, "app/blog/page.tsx"), "utf8");
    const slugs = [
      "hermetic-snippet-execution",
      "detecting-api-drift-openapi",
      "automating-accessibility-checks-docs",
      "broken-docs-cost",
      "api-drift-detection",
      "github-actions-docs-ci",
    ];
    for (const slug of slugs) {
      expect(content).toContain(slug);
    }
  });

  test("sitemap.ts includes all 3 new post URLs", () => {
    const content = fs.readFileSync(path.join(base, "app/sitemap.ts"), "utf8");
    expect(content).toContain("/blog/hermetic-snippet-execution");
    expect(content).toContain("/blog/detecting-api-drift-openapi");
    expect(content).toContain("/blog/automating-accessibility-checks-docs");
  });
});
