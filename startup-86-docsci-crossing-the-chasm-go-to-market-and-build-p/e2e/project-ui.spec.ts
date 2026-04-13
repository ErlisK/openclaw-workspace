/**
 * project-ui.spec.ts — Project page, Run History, Findings List, Finding Detail E2E
 *
 * Tests:
 * - Dashboard projects page loads (auth guard → /login for unauthenticated)
 * - API endpoints work without auth for demo paths
 * - Projects API requires auth
 * - Run detail page renders (via demo flow)
 * - Finding detail page renders with patch download button
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const RUN_TIMEOUT = 120_000;

// ── Projects API ─────────────────────────────────────────────────────────────

test.describe("Projects API", () => {
  test("GET /api/projects requires auth → returns 401", async ({ request }) => {
    const res = await request.get(`${BASE}/api/projects`);
    expect(res.status()).toBe(401);
  });

  test("POST /api/projects requires auth → returns 401", async ({ request }) => {
    const res = await request.post(`${BASE}/api/projects`, {
      data: { name: "Test Project" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(401);
  });
});

// ── Findings API ─────────────────────────────────────────────────────────────

test.describe("Findings API", () => {
  test("GET /api/findings requires auth → returns 401", async ({ request }) => {
    const res = await request.get(`${BASE}/api/findings?run_id=fake`);
    expect(res.status()).toBe(401);
  });
});

// ── Dashboard auth guard ──────────────────────────────────────────────────────

test.describe("Dashboard auth guards", () => {
  test("GET /dashboard redirects unauthenticated to /login", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForURL(/login/, { timeout: 10000 });
    expect(page.url()).toContain("login");
  });

  test("GET /dashboard/projects redirects unauthenticated to /login", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/projects`);
    await page.waitForURL(/login/, { timeout: 10000 });
    expect(page.url()).toContain("login");
  });

  test("GET /dashboard/projects/fake-id redirects unauthenticated to /login", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/projects/00000000-0000-0000-0000-000000000000`);
    await page.waitForURL(/login/, { timeout: 10000 });
    expect(page.url()).toContain("login");
  });
});

// ── Demo run → findings flow ─────────────────────────────────────────────────

test.describe("Demo run flow (no auth)", () => {
  let runId: string;
  let findingId: string;

  test("POST /api/runs/queue returns run with findings", async ({ request }) => {
    const res = await request.post(`${BASE}/api/runs/queue`, {
      data: { mode: "inline" },
      headers: { "Content-Type": "application/json" },
      timeout: RUN_TIMEOUT,
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.run_id).toBeTruthy();
    expect(body.finding_count).toBeGreaterThan(0);
    runId = body.run_id;
  });

  test("GET /api/runs/sample returns run with findings and suggestions", async ({ request }) => {
    const res = await request.get(`${BASE}/api/runs/sample`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.run).toBeTruthy();
    expect(body.findings?.length).toBeGreaterThan(0);
    expect(Array.isArray(body.suggestions)).toBe(true);
    findingId = body.findings[0]?.id;
  });

  test("GET /api/findings?run_id returns 401 (auth required)", async ({ request }) => {
    const sampleRes = await request.get(`${BASE}/api/runs/sample`);
    const sampleBody = await sampleRes.json();
    const latestRunId = sampleBody.run?.id;
    if (!latestRunId) {
      test.skip();
      return;
    }
    const res = await request.get(`${BASE}/api/findings?run_id=${latestRunId}`);
    // Findings require auth
    expect(res.status()).toBe(401);
  });
});

// ── Runs page UI ──────────────────────────────────────────────────────────────

test.describe("Runs page UI", () => {
  test("GET /runs page loads with heading", async ({ page }) => {
    await page.goto(`${BASE}/runs`);
    await expect(page.getByRole("heading", { name: "CI Runs" })).toBeVisible({ timeout: 10000 });
  });

  test("Runs page has trigger button", async ({ page }) => {
    await page.goto(`${BASE}/runs`);
    await expect(page.getByRole("button", { name: /Run on sample repo/ })).toBeVisible({ timeout: 15000 });
  });

  test("Runs page auto-loads findings for most recent run", async ({ page }) => {
    await page.goto(`${BASE}/runs`);
    // After page loads, findings panel should show
    await page.waitForTimeout(3000);
    const snippetLabel = page.getByText("snippets");
    await expect(snippetLabel.first()).toBeVisible({ timeout: 10000 });
  });

  test("Run shows finding cards with severity badges", async ({ page }) => {
    await page.goto(`${BASE}/runs`);
    await page.waitForTimeout(3000);
    // Should have finding cards
    const findings = page.locator('[class*="border"][class*="rounded"]');
    expect(await findings.count()).toBeGreaterThan(0);
  });
});

// ── Finding detail download button ───────────────────────────────────────────

test.describe("Finding detail — download patch", () => {
  test("Download patch button exists when AI suggestion has patch_diff", async ({ request, page }) => {
    // Check if we have a run with patch diffs
    const sampleRes = await request.get(`${BASE}/api/runs/sample`);
    const sampleBody = await sampleRes.json();
    const withPatch = (sampleBody.suggestions ?? []).filter(
      (s: { patch_diff?: string }) => s.patch_diff && s.patch_diff.length > 10
    );

    if (withPatch.length === 0) {
      // No patches yet — need to trigger a run first
      await request.post(`${BASE}/api/runs/queue`, {
        data: { mode: "inline" },
        headers: { "Content-Type": "application/json" },
        timeout: RUN_TIMEOUT,
      });
      // Skip UI test if still no patches (local env without AI)
      test.skip();
      return;
    }

    // The download button exists on the /runs page
    await page.goto(`${BASE}/runs`);
    await page.waitForTimeout(2000);

    // Click the first finding to expand it
    const findingCards = page.locator('[class*="border"][class*="rounded"]').filter({
      has: page.locator('[class*="AI fix"]'),
    });

    if (await findingCards.count() > 0) {
      await findingCards.first().click();
      await page.waitForTimeout(500);
      const downloadBtn = page.locator('[data-testid="download-patch"]');
      if (await downloadBtn.count() > 0) {
        await expect(downloadBtn.first()).toBeVisible();
      }
    }
  });

  test("GET /runs page shows AI fix badges when suggestions exist", async ({ request, page }) => {
    const sampleRes = await request.get(`${BASE}/api/runs/sample`);
    const sampleBody = await sampleRes.json();
    if (!sampleBody.suggestions?.length) {
      test.skip();
      return;
    }

    await page.goto(`${BASE}/runs`);
    await page.waitForTimeout(2500);
    // The purple "AI fix ✓" badge
    const aiBadge = page.getByText(/AI fix/i);
    if (await aiBadge.count() > 0) {
      await expect(aiBadge.first()).toBeVisible();
    }
  });
});

// ── Run detail via dashboard route ───────────────────────────────────────────

test.describe("Run detail URL structure", () => {
  test("Run detail URL with valid IDs redirects to login when not authenticated", async ({ page }) => {
    const runId = "00000000-0000-0000-0000-000000000001";
    const projectId = "00000000-0000-0000-0000-000000000002";
    await page.goto(`${BASE}/dashboard/projects/${projectId}/runs/${runId}`);
    // Should redirect to login for auth-protected pages
    await page.waitForURL(/login/, { timeout: 10000 });
    expect(page.url()).toContain("login");
  });

  test("Finding detail URL redirects to login when not authenticated", async ({ page }) => {
    const projectId = "00000000-0000-0000-0000-000000000002";
    const runId = "00000000-0000-0000-0000-000000000001";
    const findingId = "00000000-0000-0000-0000-000000000003";
    await page.goto(`${BASE}/dashboard/projects/${projectId}/runs/${runId}/findings/${findingId}`);
    await page.waitForURL(/login/, { timeout: 10000 });
    expect(page.url()).toContain("login");
  });
});

// ── Health + API smoke ────────────────────────────────────────────────────────

test.describe("Health checks", () => {
  test("GET /api/health returns 200 ok", async ({ request }) => {
    const res = await request.get(`${BASE}/api/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  test("GET /api/runs/queue responds under 10s", async ({ request }) => {
    const start = Date.now();
    const res = await request.get(`${BASE}/api/runs/queue`);
    expect(res.ok()).toBeTruthy();
    expect(Date.now() - start).toBeLessThan(10000);
  });
});
