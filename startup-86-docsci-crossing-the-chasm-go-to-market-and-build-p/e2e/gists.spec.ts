/**
 * e2e/gists.spec.ts
 *
 * Tests for the /gists page (public templates hub) and all 4 template files.
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE = process.env.BASE_URL || "http://localhost:3000";

// ── /gists page ──────────────────────────────────────────────────────────────

test.describe("/gists — public templates page", () => {
  test("loads and returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/gists`);
    expect(res.ok()).toBeTruthy();
  });

  test("renders h1 'Public Templates'", async ({ page }) => {
    await page.goto(`${BASE}/gists`);
    await expect(page.locator("[data-testid='gists-h1']")).toBeVisible();
  });

  test("shows templates list", async ({ page }) => {
    await page.goto(`${BASE}/gists`);
    await expect(page.locator("[data-testid='templates-list']")).toBeVisible();
  });

  test("shows all 4 templates", async ({ page }) => {
    await page.goto(`${BASE}/gists`);
    const templates = ["github-actions", "docsci-config", "gitlab-ci", "pre-commit"];
    for (const t of templates) {
      await expect(page.locator(`[data-testid='template-${t}']`)).toBeVisible();
    }
  });

  test("github-actions template has download and raw links", async ({ page }) => {
    await page.goto(`${BASE}/gists`);
    await expect(page.locator("[data-testid='download-github-actions']")).toBeVisible();
    await expect(page.locator("[data-testid='raw-github-actions']")).toBeVisible();
  });

  test("raw links point to /templates/ files", async ({ page }) => {
    await page.goto(`${BASE}/gists`);
    const rawLink = page.locator("[data-testid='raw-github-actions']");
    const href = await rawLink.getAttribute("href");
    expect(href).toContain("/templates/");
  });

  test("has quick start code block", async ({ page }) => {
    await page.goto(`${BASE}/gists`);
    const pre = page.locator("pre");
    const count = await pre.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("links to GitHub Actions docs", async ({ page }) => {
    await page.goto(`${BASE}/gists`);
    const content = await page.content();
    expect(content).toContain("/docs/integrations/github-actions");
  });

  test("mentions snippetci.com in raw URL display", async ({ page }) => {
    await page.goto(`${BASE}/gists`);
    const content = await page.content();
    expect(content).toContain("snippetci.com");
  });
});

// ── Public template files ─────────────────────────────────────────────────────

test.describe("Public template files", () => {
  test("GET /templates/docsci-github-actions.yml returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/templates/docsci-github-actions.yml`);
    expect(res.ok()).toBeTruthy();
  });

  test("GitHub Actions template contains workflow content", async ({ request }) => {
    const res = await request.get(`${BASE}/templates/docsci-github-actions.yml`);
    const text = await res.text();
    expect(text).toContain("DocsCI");
    expect(text).toContain("DOCSCI_TOKEN");
  });

  test("GET /templates/docsci.yml returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/templates/docsci.yml`);
    expect(res.ok()).toBeTruthy();
  });

  test("docsci.yml config contains required keys", async ({ request }) => {
    const res = await request.get(`${BASE}/templates/docsci.yml`);
    const text = await res.text();
    expect(text).toContain("snippets");
  });

  test("GET /templates/docsci-gitlab-ci.yml returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/templates/docsci-gitlab-ci.yml`);
    expect(res.ok()).toBeTruthy();
  });

  test("GitLab CI template contains docs:verify job", async ({ request }) => {
    const res = await request.get(`${BASE}/templates/docsci-gitlab-ci.yml`);
    const text = await res.text();
    expect(text).toContain("docs:verify");
    expect(text).toContain("DOCSCI_TOKEN");
  });

  test("GET /templates/docsci-pre-commit.yaml returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/templates/docsci-pre-commit.yaml`);
    expect(res.ok()).toBeTruthy();
  });

  test("pre-commit template mentions docsci-snippets hook", async ({ request }) => {
    const res = await request.get(`${BASE}/templates/docsci-pre-commit.yaml`);
    const text = await res.text();
    expect(text).toContain("docsci-snippets");
  });
});

// ── GitHub Actions docs page links to /gists ─────────────────────────────────

test.describe("GitHub Actions docs — gists link", () => {
  test("integrations/github-actions page loads", async ({ request }) => {
    const res = await request.get(`${BASE}/docs/integrations/github-actions`);
    expect(res.ok()).toBeTruthy();
  });

  test("github-actions docs links to /gists", async ({ page }) => {
    await page.goto(`${BASE}/docs/integrations/github-actions`);
    const content = await page.content();
    expect(content).toContain("/gists");
  });
});

// ── Sitemap ───────────────────────────────────────────────────────────────────

test.describe("Sitemap — gists page", () => {
  test("sitemap includes /gists", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    expect(await res.text()).toContain("/gists");
  });

  test("sitemap total ≥ 37 URLs", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    const count = ((await res.text()).match(/<url>/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(37);
  });
});

// ── Source validation ─────────────────────────────────────────────────────────

test.describe("Gists source validation", () => {
  const base = process.cwd();

  test("app/gists/page.tsx exists", () => {
    expect(fs.existsSync(path.join(base, "app/gists/page.tsx"))).toBe(true);
  });

  test("all 4 public template files exist", () => {
    const files = [
      "public/templates/docsci-github-actions.yml",
      "public/templates/docsci.yml",
      "public/templates/docsci-gitlab-ci.yml",
      "public/templates/docsci-pre-commit.yaml",
    ];
    for (const f of files) {
      expect(fs.existsSync(path.join(base, f))).toBe(true);
    }
  });

  test("gists page shows all 4 template IDs", () => {
    const content = fs.readFileSync(path.join(base, "app/gists/page.tsx"), "utf8");
    expect(content).toContain("github-actions");
    expect(content).toContain("docsci-config");
    expect(content).toContain("gitlab-ci");
    expect(content).toContain("pre-commit");
  });

  test("gists page links to snippetci.com raw URLs", () => {
    const content = fs.readFileSync(path.join(base, "app/gists/page.tsx"), "utf8");
    expect(content).toContain("snippetci.com");
    expect(content).toContain("/templates/docsci-github-actions.yml");
  });

  test("github-actions docs page links to /gists", () => {
    const content = fs.readFileSync(path.join(base, "app/docs/integrations/github-actions/page.tsx"), "utf8");
    expect(content).toContain("/gists");
  });

  test("sitemap.ts includes /gists", () => {
    const content = fs.readFileSync(path.join(base, "app/sitemap.ts"), "utf8");
    expect(content).toContain("/gists");
  });
});
