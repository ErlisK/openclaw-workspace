/**
 * core-journey.spec.ts — sample repo demo + core flow tests
 *
 * Tests the "Use sample repo" one-click path:
 *   1. GET /api/demo-run manifest
 *   2. POST /api/demo-run → run completes with findings
 *   3. Findings have patch_diffs and fixed_code
 *   4. GET /api/demo-run/patch → downloadable .patch file
 *   5. /demo page loads and renders the CTA
 *   6. /api/health 200
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";

test.describe("Sample repo demo — API", () => {
  test("GET /api/demo-run returns manifest with fixture files", async ({ request }) => {
    const res = await request.get(`${BASE}/api/demo-run`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.sample_repo.files).toContain("openapi.yaml");
    expect(body.sample_repo.docs_files.length).toBeGreaterThanOrEqual(2);
    expect(body.usage.demo_run).toBe("POST /api/demo-run");
  });

  test("POST /api/demo-run completes in under 2 minutes", async ({ request }) => {
    const res = await request.post(`${BASE}/api/demo-run`, {
      timeout: 120_000,
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.duration_ms).toBeLessThan(120_000);
    expect(body.run_id).toMatch(/^demo-/);
  });

  test("POST /api/demo-run returns snippets_total >= 8", async ({ request }) => {
    const res = await request.post(`${BASE}/api/demo-run`, { timeout: 120_000 });
    const body = await res.json();
    expect(body.snippets_total).toBeGreaterThanOrEqual(8);
  });

  test("POST /api/demo-run detects drift (openapi.yaml drift signature)", async ({ request }) => {
    const res = await request.post(`${BASE}/api/demo-run`, { timeout: 120_000 });
    const body = await res.json();
    expect(body.drift_detected).toBe(true);
    expect(body.drift_count).toBeGreaterThanOrEqual(1);
  });

  test("POST /api/demo-run findings include at least 3 with patch_diffs", async ({ request }) => {
    const res = await request.post(`${BASE}/api/demo-run`, { timeout: 120_000 });
    const body = await res.json();
    expect(body.findings.length).toBeGreaterThanOrEqual(3);

    const withPatches = body.findings.filter(
      (f: { patch_diff?: string }) => f.patch_diff && f.patch_diff.length > 0
    );
    expect(withPatches.length).toBeGreaterThanOrEqual(3);
  });

  test("POST /api/demo-run findings include snippet_failure and api_drift kinds", async ({ request }) => {
    const res = await request.post(`${BASE}/api/demo-run`, { timeout: 120_000 });
    const body = await res.json();
    const kinds = body.findings.map((f: { kind: string }) => f.kind);
    expect(kinds).toContain("snippet_failure");
    expect(kinds).toContain("api_drift");
  });

  test("POST /api/demo-run snippets_passed > 0 (some snippets are clean)", async ({ request }) => {
    const res = await request.post(`${BASE}/api/demo-run`, { timeout: 120_000 });
    const body = await res.json();
    expect(body.snippets_passed).toBeGreaterThan(0);
    expect(body.snippets_failed).toBeGreaterThan(0);
  });

  test("POST /api/demo-run findings have fixed_code for snippet failures", async ({ request }) => {
    const res = await request.post(`${BASE}/api/demo-run`, { timeout: 120_000 });
    const body = await res.json();
    const snippetFailures = body.findings.filter(
      (f: { kind: string; fixed_code?: string }) => f.kind === "snippet_failure"
    );
    const withFix = snippetFailures.filter(
      (f: { fixed_code?: string }) => f.fixed_code && f.fixed_code.length > 0
    );
    expect(withFix.length).toBeGreaterThanOrEqual(2);
  });
});

test.describe("Sample repo demo — patch download", () => {
  test("GET /api/demo-run/patch returns a .patch file with content-disposition", async ({ request }) => {
    const res = await request.get(`${BASE}/api/demo-run/patch`, { timeout: 120_000 });
    expect(res.ok()).toBeTruthy();
    const disposition = res.headers()["content-disposition"] ?? "";
    expect(disposition).toContain("attachment");
    expect(disposition).toContain(".patch");

    const body = await res.text();
    expect(body).toContain("# DocsCI Patch");
    expect(body).toContain("---");
    expect(body).toContain("+++");
  });

  test("GET /api/demo-run/patch includes drift fix (connect → init)", async ({ request }) => {
    const res = await request.get(`${BASE}/api/demo-run/patch`, { timeout: 120_000 });
    const body = await res.text();
    expect(body).toContain("client.connect()");
    expect(body).toContain("client.init()");
  });

  test("GET /api/demo-run/patch?finding=drift-connect returns single patch", async ({ request }) => {
    const res = await request.get(`${BASE}/api/demo-run/patch?finding=drift-connect`, {
      timeout: 120_000,
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toContain("api_drift");
  });
});

test.describe("Demo page UI", () => {
  test("/demo page loads with CTA button", async ({ page }) => {
    await page.goto(`${BASE}/demo`);
    await expect(page.locator("h1")).toContainText(/sample repo/i);
    await expect(page.locator("button")).toContainText(/use sample repo/i);
  });

  test("/demo page shows fixture summary", async ({ page }) => {
    await page.goto(`${BASE}/demo`);
    await expect(page.locator("text=openapi.yaml")).toBeVisible();
    await expect(page.locator("text=getting-started.md")).toBeVisible();
  });

  test("/demo page triggers run and shows findings", async ({ page }) => {
    await page.goto(`${BASE}/demo`);
    await page.click("button:has-text('Use sample repo')");

    // Wait for results (up to 2 minutes)
    await expect(page.locator("text=Run complete")).toBeVisible({ timeout: 120_000 });
    await expect(page.locator("h2:has-text('Findings')")).toBeVisible();

    // At least one finding card visible
    const findings = page.locator("[class*='border rounded-xl']");
    await expect(findings.first()).toBeVisible();
  });

  test("/demo page shows download patch button after run", async ({ page }) => {
    await page.goto(`${BASE}/demo`);
    await page.click("button:has-text('Use sample repo')");
    await expect(page.locator("text=Run complete")).toBeVisible({ timeout: 120_000 });
    await expect(page.locator("text=Download all patches")).toBeVisible();
  });
});
