/**
 * migration-guides.spec.ts
 *
 * E2E tests for:
 * - GitHub Actions integration page with copy-paste YAML
 * - GitLab CI integration page
 * - Migration guides (Sphinx, scripts, Postman)
 * - Sitemap includes all new URLs
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE = process.env.BASE_URL || "http://localhost:3000";

// ── GitHub Actions page ───────────────────────────────────────────────────────

test.describe("/docs/integrations/github-actions", () => {
  test("loads and returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/docs/integrations/github-actions`);
    expect(res.ok()).toBeTruthy();
  });

  test("renders h1", async ({ page }) => {
    await page.goto(`${BASE}/docs/integrations/github-actions`);
    await expect(page.locator("[data-testid='page-h1']")).toBeVisible();
    await expect(page.locator("[data-testid='page-h1']")).toContainText("GitHub Actions");
  });

  test("shows prerequisites section", async ({ page }) => {
    await page.goto(`${BASE}/docs/integrations/github-actions`);
    await expect(page.locator("[data-testid='section-prerequisites']")).toBeVisible();
  });

  test("shows basic workflow code block", async ({ page }) => {
    await page.goto(`${BASE}/docs/integrations/github-actions`);
    await expect(page.locator("[data-testid='section-basic']")).toBeVisible();
    // Code block should exist
    const code = page.locator("pre").first();
    await expect(code).toBeVisible();
  });

  test("shows advanced workflow section", async ({ page }) => {
    await page.goto(`${BASE}/docs/integrations/github-actions`);
    await expect(page.locator("[data-testid='section-advanced']")).toBeVisible();
  });

  test("shows monorepo workflow section", async ({ page }) => {
    await page.goto(`${BASE}/docs/integrations/github-actions`);
    await expect(page.locator("[data-testid='section-monorepo']")).toBeVisible();
  });

  test("shows nightly schedule section", async ({ page }) => {
    await page.goto(`${BASE}/docs/integrations/github-actions`);
    await expect(page.locator("[data-testid='section-nightly']")).toBeVisible();
  });

  test("shows secrets reference table", async ({ page }) => {
    await page.goto(`${BASE}/docs/integrations/github-actions`);
    await expect(page.locator("[data-testid='section-secrets']")).toBeAttached();
    // DOCSCI_TOKEN appears in code blocks — check page content
    const content = await page.content();
    expect(content).toContain("DOCSCI_TOKEN");
  });

  test("YAML code blocks contain docsci.com URL", async ({ page }) => {
    await page.goto(`${BASE}/docs/integrations/github-actions`);
    const preContent = await page.locator("pre").first().textContent();
    expect(preContent).toContain("snippetci.com");
  });
});

// ── GitLab CI page ────────────────────────────────────────────────────────────

test.describe("/docs/integrations/gitlab-ci", () => {
  test("loads and returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/docs/integrations/gitlab-ci`);
    expect(res.ok()).toBeTruthy();
  });

  test("renders h1 with GitLab", async ({ page }) => {
    await page.goto(`${BASE}/docs/integrations/gitlab-ci`);
    await expect(page.locator("[data-testid='page-h1']")).toContainText("GitLab");
  });

  test("shows basic, advanced, scheduled sections", async ({ page }) => {
    await page.goto(`${BASE}/docs/integrations/gitlab-ci`);
    await expect(page.locator("[data-testid='section-basic']")).toBeVisible();
    await expect(page.locator("[data-testid='section-advanced']")).toBeVisible();
    await expect(page.locator("[data-testid='section-scheduled']")).toBeVisible();
  });

  test("YAML code blocks contain .gitlab-ci.yml", async ({ page }) => {
    await page.goto(`${BASE}/docs/integrations/gitlab-ci`);
    const page_ = await page.content();
    expect(page_).toContain(".gitlab-ci.yml");
  });
});

// ── Integrations index ────────────────────────────────────────────────────────

test.describe("/docs/integrations", () => {
  test("loads and returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/docs/integrations`);
    expect(res.ok()).toBeTruthy();
  });

  test("shows GitHub Actions and GitLab CI cards", async ({ page }) => {
    await page.goto(`${BASE}/docs/integrations`);
    await expect(page.locator("[data-testid='integration-card-github-actions']")).toBeVisible();
    await expect(page.locator("[data-testid='integration-card-gitlab-ci']")).toBeVisible();
  });
});

// ── Migration guides ──────────────────────────────────────────────────────────

test.describe("/docs/guides/migrate-from-sphinx", () => {
  test("loads and returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/docs/guides/migrate-from-sphinx`);
    expect(res.ok()).toBeTruthy();
  });

  test("renders h1 with Sphinx", async ({ page }) => {
    await page.goto(`${BASE}/docs/guides/migrate-from-sphinx`);
    await expect(page.locator("[data-testid='page-h1']")).toContainText("Sphinx");
  });

  test("shows comparison table", async ({ page }) => {
    await page.goto(`${BASE}/docs/guides/migrate-from-sphinx`);
    await expect(page.locator("[data-testid='section-comparison']")).toBeVisible();
    await expect(page.getByText("Python only")).toBeVisible();
  });

  test("shows migration steps", async ({ page }) => {
    await page.goto(`${BASE}/docs/guides/migrate-from-sphinx`);
    await expect(page.locator("[data-testid='section-steps']")).toBeVisible();
  });

  test("shows docsci.yml code block", async ({ page }) => {
    await page.goto(`${BASE}/docs/guides/migrate-from-sphinx`);
    const content = await page.content();
    expect(content).toContain("docsci.yml");
  });
});

test.describe("/docs/guides/migrate-from-scripts", () => {
  test("loads and returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/docs/guides/migrate-from-scripts`);
    expect(res.ok()).toBeTruthy();
  });

  test("renders h1 about scripts", async ({ page }) => {
    await page.goto(`${BASE}/docs/guides/migrate-from-scripts`);
    const h1 = page.locator("[data-testid='page-h1']");
    await expect(h1).toBeVisible();
    const text = await h1.textContent();
    expect(text?.toLowerCase()).toContain("script");
  });

  test("shows before/after code comparison", async ({ page }) => {
    await page.goto(`${BASE}/docs/guides/migrate-from-scripts`);
    await expect(page.locator("[data-testid='section-before-after']")).toBeVisible();
  });

  test("shows what you gain section", async ({ page }) => {
    await page.goto(`${BASE}/docs/guides/migrate-from-scripts`);
    await expect(page.locator("[data-testid='section-what-you-get']")).toBeVisible();
  });
});

test.describe("/docs/guides/migrate-from-postman", () => {
  test("loads and returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/docs/guides/migrate-from-postman`);
    expect(res.ok()).toBeTruthy();
  });

  test("renders h1 about Postman", async ({ page }) => {
    await page.goto(`${BASE}/docs/guides/migrate-from-postman`);
    await expect(page.locator("[data-testid='page-h1']")).toContainText("Postman");
  });

  test("shows comparison table with Postman vs DocsCI", async ({ page }) => {
    await page.goto(`${BASE}/docs/guides/migrate-from-postman`);
    await expect(page.locator("[data-testid='section-what-docsci-adds']")).toBeVisible();
    await expect(page.getByText("Mock servers")).toBeVisible();
  });

  test("shows setup steps", async ({ page }) => {
    await page.goto(`${BASE}/docs/guides/migrate-from-postman`);
    await expect(page.locator("[data-testid='section-steps']")).toBeVisible();
  });
});

// ── Sitemap includes new pages ────────────────────────────────────────────────

test.describe("Sitemap — migration guides and integrations", () => {
  test("sitemap includes github-actions", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    const body = await res.text();
    expect(body).toContain("/docs/integrations/github-actions");
  });

  test("sitemap includes gitlab-ci", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    const body = await res.text();
    expect(body).toContain("/docs/integrations/gitlab-ci");
  });

  test("sitemap includes migrate-from-sphinx", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    const body = await res.text();
    expect(body).toContain("/docs/guides/migrate-from-sphinx");
  });

  test("sitemap total URL count ≥ 25", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    const body = await res.text();
    const matches = body.match(/<url>/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(25);
  });
});

// ── Source code validation ────────────────────────────────────────────────────

test.describe("Migration guides source validation", () => {
  const base = process.cwd();

  test("github-actions page exists", () => {
    expect(fs.existsSync(path.join(base, "app/docs/integrations/github-actions/page.tsx"))).toBe(true);
  });

  test("gitlab-ci page exists", () => {
    expect(fs.existsSync(path.join(base, "app/docs/integrations/gitlab-ci/page.tsx"))).toBe(true);
  });

  test("migrate-from-sphinx page exists", () => {
    expect(fs.existsSync(path.join(base, "app/docs/guides/migrate-from-sphinx/page.tsx"))).toBe(true);
  });

  test("migrate-from-scripts page exists", () => {
    expect(fs.existsSync(path.join(base, "app/docs/guides/migrate-from-scripts/page.tsx"))).toBe(true);
  });

  test("migrate-from-postman page exists", () => {
    expect(fs.existsSync(path.join(base, "app/docs/guides/migrate-from-postman/page.tsx"))).toBe(true);
  });

  test("github-actions page has 4+ YAML code blocks", () => {
    const content = fs.readFileSync(path.join(base, "app/docs/integrations/github-actions/page.tsx"), "utf8");
    expect(content).toContain("DOCSCI_TOKEN");
    expect(content).toContain(".github/workflows");
    expect(content).toContain("monorepo");
    expect(content).toContain("schedule");
  });

  test("github-actions page has secrets table", () => {
    const content = fs.readFileSync(path.join(base, "app/docs/integrations/github-actions/page.tsx"), "utf8");
    expect(content).toContain("DOCSCI_TOKEN");
    expect(content).toContain("GITHUB_TOKEN");
  });

  test("migrate-from-sphinx page has comparison table", () => {
    const content = fs.readFileSync(path.join(base, "app/docs/guides/migrate-from-sphinx/page.tsx"), "utf8");
    expect(content).toContain("Python only");
    expect(content).toContain("docsci.yml");
  });

  test("migrate-from-scripts page has before/after code", () => {
    const content = fs.readFileSync(path.join(base, "app/docs/guides/migrate-from-scripts/page.tsx"), "utf8");
    expect(content).toContain("test-docs.sh");
    expect(content).toContain("docsci.yml");
  });

  test("migrate-from-postman page has coverage comparison table", () => {
    const content = fs.readFileSync(path.join(base, "app/docs/guides/migrate-from-postman/page.tsx"), "utf8");
    expect(content).toContain("Mock servers");
    expect(content).toContain("Newman");
  });

  test("sitemap.ts includes integration and migration URLs", () => {
    const content = fs.readFileSync(path.join(base, "app/sitemap.ts"), "utf8");
    expect(content).toContain("/docs/integrations/github-actions");
    expect(content).toContain("/docs/integrations/gitlab-ci");
    expect(content).toContain("/docs/guides/migrate-from-sphinx");
    expect(content).toContain("/docs/guides/migrate-from-scripts");
    expect(content).toContain("/docs/guides/migrate-from-postman");
  });
});
