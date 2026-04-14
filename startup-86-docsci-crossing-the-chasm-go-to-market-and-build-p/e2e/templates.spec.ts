/**
 * templates.spec.ts — CI templates, curl script, migration guide E2E tests
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";

// ── /api/templates ─────────────────────────────────────────────────────────────

test.describe("GET /api/templates — template registry", () => {
  test("returns template list with metadata", async ({ request }) => {
    const res = await request.get(`${BASE}/api/templates`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.total).toBeGreaterThanOrEqual(4);
    expect(Array.isArray(body.templates)).toBe(true);
  });

  test("template list includes all expected IDs", async ({ request }) => {
    const res = await request.get(`${BASE}/api/templates`);
    const body = await res.json();
    const ids = body.templates.map((t: { id: string }) => t.id);
    expect(ids).toContain("github-actions");
    expect(ids).toContain("gitlab-ci");
    expect(ids).toContain("curl-fallback");
    expect(ids).toContain("docsci-yml");
  });

  test("templates have required metadata fields", async ({ request }) => {
    const res = await request.get(`${BASE}/api/templates`);
    const body = await res.json();
    for (const tpl of body.templates) {
      expect(typeof tpl.id).toBe("string");
      expect(typeof tpl.name).toBe("string");
      expect(typeof tpl.filename).toBe("string");
      expect(typeof tpl.description).toBe("string");
      expect(typeof tpl.content_type).toBe("string");
      expect(typeof tpl.size_bytes).toBe("number");
      expect(tpl.size_bytes).toBeGreaterThan(100);
      expect(tpl.download_url).toContain("/api/templates");
    }
  });

  test("templates are categorized into ci/config/hook", async ({ request }) => {
    const res = await request.get(`${BASE}/api/templates`);
    const body = await res.json();
    expect(Array.isArray(body.categories.ci)).toBe(true);
    expect(body.categories.ci).toContain("github-actions");
    expect(body.categories.ci).toContain("curl-fallback");
    expect(Array.isArray(body.categories.config)).toBe(true);
    expect(body.categories.config).toContain("docsci-yml");
  });
});

test.describe("GET /api/templates?id=<id> — download single template", () => {
  test("github-actions template is valid YAML with required fields", async ({ request }) => {
    const res = await request.get(`${BASE}/api/templates?id=github-actions`);
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).toContain("name: DocsCI");
    expect(text).toContain("snippetci.com/api/runs/queue");
    expect(text).toContain("DOCSCI_TOKEN");
    expect(text).toContain("DOCSCI_PROJECT_ID");
    expect(text).toContain("status");
    expect(text).toContain("finding_count");
  });

  test("github-actions download sets content-disposition header", async ({ request }) => {
    const res = await request.get(`${BASE}/api/templates?id=github-actions&download=1`);
    expect(res.ok()).toBeTruthy();
    const cd = res.headers()["content-disposition"];
    expect(cd).toContain("attachment");
    expect(cd).toContain("docsci.yml");
  });

  test("curl-fallback template is a valid bash script", async ({ request }) => {
    const res = await request.get(`${BASE}/api/templates?id=curl-fallback`);
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).toContain("#!/usr/bin/env bash");
    expect(text).toContain("DOCSCI_TOKEN");
    expect(text).toContain("DOCSCI_PROJECT_ID");
    expect(text).toContain("snippetci.com");
    expect(text).toContain("api/runs/queue");
    expect(text).toContain("set -euo pipefail");
    expect(text).toContain("DOCSCI_BRANCH");
    expect(text).toContain("DOCSCI_COMMIT");
    expect(text).toContain("DOCSCI_FAIL_FAST");
  });

  test("curl-fallback download has correct content-type", async ({ request }) => {
    const res = await request.get(`${BASE}/api/templates?id=curl-fallback&download=1`);
    expect(res.ok()).toBeTruthy();
    const ct = res.headers()["content-type"] ?? "";
    expect(ct).toContain("text");
  });

  test("gitlab-ci template has correct GitLab CI syntax", async ({ request }) => {
    const res = await request.get(`${BASE}/api/templates?id=gitlab-ci`);
    const text = await res.text();
    expect(text).toContain("stages:");
    expect(text).toContain("docs-ci");
    expect(text).toContain("DOCSCI_TOKEN");
    expect(text).toContain("DOCSCI_PROJECT_ID");
    expect(text).toContain("CI_COMMIT_BRANCH");
    expect(text).toContain("CI_COMMIT_SHA");
  });

  test("docsci-yml template has all config sections", async ({ request }) => {
    const res = await request.get(`${BASE}/api/templates?id=docsci-yml`);
    const text = await res.text();
    expect(text).toContain("version: 1");
    expect(text).toContain("docs:");
    expect(text).toContain("openapi:");
    expect(text).toContain("snippets:");
    expect(text).toContain("security:");
    expect(text).toContain("checks:");
    expect(text).toContain("timeout_seconds");
    expect(text).toContain("skip_patterns");
  });

  test("pre-commit template is present", async ({ request }) => {
    const res = await request.get(`${BASE}/api/templates?id=pre-commit`);
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).toContain("pre-commit");
    expect(text).toContain("docsci");
  });

  test("unknown template id returns 404", async ({ request }) => {
    const res = await request.get(`${BASE}/api/templates?id=does-not-exist`);
    expect(res.status()).toBe(404);
  });
});

// ── /docs/templates page ──────────────────────────────────────────────────────

test.describe("/docs/templates page", () => {
  test("page loads with heading", async ({ page }) => {
    await page.goto(`${BASE}/docs/templates`);
    await expect(page.getByRole("heading", { name: /CI Templates/i })).toBeVisible();
  });

  test("GitHub Actions section is present", async ({ page }) => {
    await page.goto(`${BASE}/docs/templates`);
    await expect(page.locator("[data-testid='template-github-actions']")).toBeVisible();
    await expect(page.locator("[data-testid='code-github-actions']")).toBeVisible();
  });

  test("curl fallback section is present", async ({ page }) => {
    await page.goto(`${BASE}/docs/templates`);
    await expect(page.locator("[data-testid='template-curl-fallback']")).toBeVisible();
    await expect(page.locator("[data-testid='code-curl-fallback']")).toBeVisible();
    // env var docs in the page (shown in an info box)
    const envSection = page.locator("[data-testid='template-curl-fallback']");
    await expect(envSection.getByText("DOCSCI_BRANCH").first()).toBeVisible();
    await expect(envSection.getByText("DOCSCI_FAIL_FAST").first()).toBeVisible();
  });

  test("GitLab CI section is present", async ({ page }) => {
    await page.goto(`${BASE}/docs/templates`);
    await expect(page.locator("[data-testid='template-gitlab-ci']")).toBeVisible();
    await expect(page.locator("[data-testid='code-gitlab-ci']")).toBeVisible();
  });

  test("docsci.yml config section is present", async ({ page }) => {
    await page.goto(`${BASE}/docs/templates`);
    await expect(page.locator("[data-testid='template-docsci-yml']")).toBeVisible();
    await expect(page.locator("[data-testid='code-docsci-yml']")).toBeVisible();
  });

  test("all download links are present", async ({ page }) => {
    await page.goto(`${BASE}/docs/templates`);
    await expect(page.locator("[data-testid='download-github-actions']")).toBeVisible();
    await expect(page.locator("[data-testid='download-curl-fallback']")).toBeVisible();
    await expect(page.locator("[data-testid='download-gitlab-ci']")).toBeVisible();
    await expect(page.locator("[data-testid='download-docsci-yml']")).toBeVisible();
  });

  test("download links point to /api/templates", async ({ page }) => {
    await page.goto(`${BASE}/docs/templates`);
    const ghHref = await page.locator("[data-testid='download-github-actions']").getAttribute("href");
    expect(ghHref).toContain("/api/templates?id=github-actions");
    const curlHref = await page.locator("[data-testid='download-curl-fallback']").getAttribute("href");
    expect(curlHref).toContain("/api/templates?id=curl-fallback");
  });

  test("migration guide CTA is present", async ({ page }) => {
    await page.goto(`${BASE}/docs/templates`);
    await expect(page.locator("[data-testid='migration-cta']")).toBeVisible();
    await expect(page.locator("[data-testid='migration-guide-link']")).toBeVisible();
  });

  test("migration guide link navigates to /docs/guides/migration", async ({ page }) => {
    await page.goto(`${BASE}/docs/templates`);
    await page.click("[data-testid='migration-guide-link']");
    await expect(page).toHaveURL(/\/docs\/guides\/migration/);
  });

  test("programmatic access section shows API curl examples", async ({ page }) => {
    await page.goto(`${BASE}/docs/templates`);
    await expect(page.getByText("Programmatic access")).toBeVisible();
    await expect(page.getByText("/api/templates?id=github-actions", { exact: false })).toBeVisible();
  });
});

// ── /docs/guides/migration ────────────────────────────────────────────────────

test.describe("/docs/guides/migration page", () => {
  test("migration guide page loads with heading", async ({ page }) => {
    await page.goto(`${BASE}/docs/guides/migration`);
    await expect(page.getByRole("heading", { name: /Migrating from ad-hoc doctests/i })).toBeVisible();
  });

  test("before vs after comparison table is present", async ({ page }) => {
    await page.goto(`${BASE}/docs/guides/migration`);
    await expect(page.getByText("Before vs. After")).toBeVisible();
    await expect(page.getByText("Run tests manually before releases")).toBeVisible();
    await expect(page.getByText("Runs on every push automatically")).toBeVisible();
  });

  test("step-by-step migration steps are present", async ({ page }) => {
    await page.goto(`${BASE}/docs/guides/migration`);
    await expect(page.getByText("Create a DocsCI project")).toBeVisible();
    await expect(page.getByText("Run your first check")).toBeVisible();
    await expect(page.getByText("Add the CI template")).toBeVisible();
    await expect(page.getByText("Remove your old doctest scripts")).toBeVisible();
  });

  test("migration cards show pytest and Jupyter replacements", async ({ page }) => {
    await page.goto(`${BASE}/docs/guides/migration`);
    await expect(page.getByText("pytest --doctest-glob")).toBeVisible();
    await expect(page.getByText("nbval / nbmake (Jupyter)")).toBeVisible();
    await expect(page.getByText("Custom bash test script")).toBeVisible();
  });

  test("skip patterns example is present with backward compat examples", async ({ page }) => {
    await page.goto(`${BASE}/docs/guides/migration`);
    // Skip patterns section heading
    await expect(page.getByText("Configure skip markers")).toBeVisible();
    // Code block contains the patterns
    const codeBlock = page.locator("pre").filter({ hasText: "doctest: skip" });
    await expect(codeBlock.first()).toBeVisible();
  });

  test("FAQ section is present", async ({ page }) => {
    await page.goto(`${BASE}/docs/guides/migration`);
    await expect(page.getByText("Frequently asked questions")).toBeVisible();
    await expect(page.getByText("Can I keep running pytest doctests alongside DocsCI?")).toBeVisible();
  });

  test("CTA links to signup and templates", async ({ page }) => {
    await page.goto(`${BASE}/docs/guides/migration`);
    const signupLink = page.locator("a[href='/signup']").last();
    await expect(signupLink).toBeVisible();
    const templatesLink = page.locator("a[href='/docs/templates']").last();
    await expect(templatesLink).toBeVisible();
  });

  test("breadcrumb navigation back to docs and guides", async ({ page }) => {
    await page.goto(`${BASE}/docs/guides/migration`);
    await expect(page.locator("a[href='/docs']")).toBeVisible();
    await expect(page.locator("a[href='/docs/guides']")).toBeVisible();
  });
});

// ── Integration: templates API + docs pages ───────────────────────────────────

test.describe("Templates integration", () => {
  test("all template download endpoints return 200", async ({ request }) => {
    for (const id of ["github-actions", "gitlab-ci", "curl-fallback", "docsci-yml", "pre-commit"]) {
      const res = await request.get(`${BASE}/api/templates?id=${id}&download=1`);
      expect(res.ok(), `Template ${id} should return 200`).toBeTruthy();
      const text = await res.text();
      expect(text.length, `Template ${id} should have content`).toBeGreaterThan(100);
    }
  });

  test("curl-fallback contains all documented env vars", async ({ request }) => {
    const res = await request.get(`${BASE}/api/templates?id=curl-fallback`);
    const text = await res.text();
    const requiredVars = [
      "DOCSCI_TOKEN",
      "DOCSCI_PROJECT_ID",
      "DOCSCI_BRANCH",
      "DOCSCI_COMMIT",
      "DOCSCI_FAIL_FAST",
      "DOCSCI_TIMEOUT",
      "DOCSCI_API_URL",
    ];
    for (const v of requiredVars) {
      expect(text, `curl script should contain ${v}`).toContain(v);
    }
  });

  test("github-actions template contains PR annotation step", async ({ request }) => {
    const res = await request.get(`${BASE}/api/templates?id=github-actions`);
    const text = await res.text();
    expect(text).toContain("Annotate PR");
    expect(text).toContain("pull_request");
    expect(text).toContain("createComment");
  });

  test("github-actions template has fail step with error annotation", async ({ request }) => {
    const res = await request.get(`${BASE}/api/templates?id=github-actions`);
    const text = await res.text();
    expect(text).toContain("::error::");
    expect(text).toContain("exit 1");
  });

  test("/docs/templates responds 200", async ({ request }) => {
    const res = await request.get(`${BASE}/docs/templates`);
    expect(res.ok()).toBeTruthy();
  });

  test("/docs/guides/migration responds 200", async ({ request }) => {
    const res = await request.get(`${BASE}/docs/guides/migration`);
    expect(res.ok()).toBeTruthy();
  });
});
