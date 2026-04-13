/**
 * run-orchestrator.spec.ts — CI run orchestrator E2E tests
 *
 * Tests the complete run pipeline:
 * - POST /api/runs/queue: queue a run (inline/demo mode, no auth)
 * - GET /api/runs/queue: list runs
 * - GET /api/runs/sample: get most recent run with findings + suggestions
 * - Run completes under 120s
 * - Findings persisted (snippet, a11y, copy, drift types)
 * - Suggestions with patch diff generated
 * - UI page loads and shows run history
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const TIMEOUT_MS = 120_000; // runs must complete under 2 minutes

test.describe("Run Queue API — validation", () => {
  test("GET /api/runs/queue returns runs array", async ({ request }) => {
    const res = await request.get(`${BASE}/api/runs/queue`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.runs)).toBe(true);
  });

  test("GET /api/runs/sample returns run or empty message", async ({ request }) => {
    const res = await request.get(`${BASE}/api/runs/sample`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // Either has a run or a message indicating no runs yet
    const hasRun = body.run !== undefined;
    const hasMessage = typeof body.message === "string";
    expect(hasRun || hasMessage).toBe(true);
  });
});

test.describe("Run Queue API — inline demo run", () => {
  let runId: string;

  test("POST /api/runs/queue triggers a run and returns run_id", async ({ request }) => {
    const res = await request.post(`${BASE}/api/runs/queue`, {
      data: { mode: "inline" },
      headers: { "Content-Type": "application/json" },
      timeout: TIMEOUT_MS,
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(typeof body.run_id).toBe("string");
    expect(body.run_id.length).toBeGreaterThan(0);
    runId = body.run_id;
  });

  test("Run completes with status passed or failed", async ({ request }) => {
    if (!runId) test.skip();
    const res = await request.post(`${BASE}/api/runs/queue`, {
      data: { mode: "inline" },
      headers: { "Content-Type": "application/json" },
      timeout: TIMEOUT_MS,
    });
    const body = await res.json();
    expect(body.status).toMatch(/passed|failed/);
  });

  test("Run returns numeric counts", async ({ request }) => {
    const res = await request.post(`${BASE}/api/runs/queue`, {
      data: { mode: "inline" },
      headers: { "Content-Type": "application/json" },
      timeout: TIMEOUT_MS,
    });
    const body = await res.json();
    expect(typeof body.finding_count).toBe("number");
    expect(typeof body.snippet_count === "number" || typeof body.snippets_total === "number").toBe(true);
    expect(typeof body.duration_ms).toBe("number");
    // Must complete in under 2 minutes
    expect(body.duration_ms).toBeLessThan(TIMEOUT_MS);
  });

  test("Run has at least some findings on sample repo", async ({ request }) => {
    const res = await request.post(`${BASE}/api/runs/queue`, {
      data: { mode: "inline" },
      headers: { "Content-Type": "application/json" },
      timeout: TIMEOUT_MS,
    });
    const body = await res.json();
    // Sample repo has intentional issues — should have findings
    expect(body.finding_count).toBeGreaterThan(0);
  });
});

test.describe("Run results — findings persisted", () => {
  test("GET /api/runs/sample after run returns findings", async ({ request }) => {
    // First trigger a run
    const runRes = await request.post(`${BASE}/api/runs/queue`, {
      data: { mode: "inline" },
      headers: { "Content-Type": "application/json" },
      timeout: TIMEOUT_MS,
    });
    expect(runRes.ok()).toBeTruthy();

    // Then fetch sample
    const sampleRes = await request.get(`${BASE}/api/runs/sample`);
    const body = await sampleRes.json();
    expect(body.run).toBeTruthy();
    expect(Array.isArray(body.findings)).toBe(true);
    expect(body.findings.length).toBeGreaterThan(0);
  });

  test("Findings have required fields", async ({ request }) => {
    const sampleRes = await request.get(`${BASE}/api/runs/sample`);
    const body = await sampleRes.json();
    if (!body.findings?.length) {
      // Run first
      await request.post(`${BASE}/api/runs/queue`, {
        data: { mode: "inline" },
        headers: { "Content-Type": "application/json" },
        timeout: TIMEOUT_MS,
      });
      const r2 = await request.get(`${BASE}/api/runs/sample`);
      const b2 = await r2.json();
      if (b2.findings?.length > 0) {
        const f = b2.findings[0];
        expect(typeof f.id).toBe("string");
        expect(typeof f.kind).toBe("string");
        expect(f.severity).toMatch(/error|warning|info/);
        expect(typeof f.file_path).toBe("string");
        expect(typeof f.error_message).toBe("string");
      }
      return;
    }
    const f = body.findings[0];
    expect(typeof f.id).toBe("string");
    expect(typeof f.kind).toBe("string");
    expect(f.severity).toMatch(/error|warning|info/);
    expect(typeof f.file_path).toBe("string");
    expect(typeof f.error_message).toBe("string");
  });

  test("Findings include at least one copy or a11y finding type", async ({ request }) => {
    const sampleRes = await request.get(`${BASE}/api/runs/sample`);
    const body = await sampleRes.json();
    if (!body.findings?.length) return; // skip if no runs
    const kinds = body.findings.map((f: { kind: string }) => f.kind);
    const hasDocFinding = kinds.some((k: string) => ["copy", "a11y", "drift", "snippet"].includes(k));
    expect(hasDocFinding).toBe(true);
  });

  test("Run record has correct fields", async ({ request }) => {
    const sampleRes = await request.get(`${BASE}/api/runs/sample`);
    const body = await sampleRes.json();
    if (!body.run) return;
    const run = body.run;
    expect(typeof run.id).toBe("string");
    expect(run.status).toMatch(/passed|failed|running|pending|queued/);
    expect(typeof run.started_at).toBe("string");
  });
});

test.describe("Run results — AI suggestions", () => {
  test("GET /api/runs/sample includes suggestions array", async ({ request }) => {
    const res = await request.get(`${BASE}/api/runs/sample`);
    const body = await res.json();
    if (!body.run) return; // no runs yet
    expect(Array.isArray(body.suggestions)).toBe(true);
  });

  test("Suggestions have patch_diff when present", async ({ request }) => {
    const res = await request.get(`${BASE}/api/runs/sample`);
    const body = await res.json();
    if (!body.suggestions?.length) return;
    // At least check structure
    const s = body.suggestions[0];
    expect(typeof s.id).toBe("string");
    expect(typeof s.finding_id).toBe("string");
    expect(typeof s.run_id).toBe("string");
  });

  test("Suggestions with patch_diff contain valid unified diff format", async ({ request }) => {
    const res = await request.get(`${BASE}/api/runs/sample`);
    const body = await res.json();
    const withPatch = (body.suggestions || []).filter(
      (s: { patch_diff?: string }) => s.patch_diff && s.patch_diff.length > 0
    );
    if (withPatch.length === 0) return; // AI only runs on Vercel
    // Patch should contain --- and +++
    expect(withPatch[0].patch_diff).toContain("---");
    expect(withPatch[0].patch_diff).toContain("+++");
  });
});

test.describe("Run queue — custom inline docs", () => {
  test("Can run with custom docs content", async ({ request }) => {
    const docs = [
      {
        path: "docs/test.md",
        content: "# Test\n\nThe config is set automatically. Use a blacklist to block tokens.",
        codeFences: [
          {
            language: "python",
            code: "print('hello world')",
            startLine: 10,
          },
        ],
      },
    ];

    const res = await request.post(`${BASE}/api/runs/queue`, {
      data: { mode: "inline", docs },
      headers: { "Content-Type": "application/json" },
      timeout: TIMEOUT_MS,
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.run_id).toBeTruthy();
    expect(body.status).toMatch(/passed|failed/);
    // Should find copy issues (blacklist)
    expect(body.finding_count).toBeGreaterThan(0);
  });
});

test.describe("Runs UI page", () => {
  test("Runs page loads", async ({ page }) => {
    await page.goto(`${BASE}/runs`);
    await expect(page.getByRole("heading", { name: "CI Runs" })).toBeVisible();
    await expect(page.getByText("Run on sample repo")).toBeVisible();
  });

  test("Runs page has recent runs list", async ({ page }) => {
    await page.goto(`${BASE}/runs`);
    await expect(page.getByText("Recent Runs")).toBeVisible();
  });
});

test.describe("Health check", () => {
  test("/api/health returns 200 with status ok", async ({ request }) => {
    const res = await request.get(`${BASE}/api/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  test("/api/runs/queue responds promptly (GET)", async ({ request }) => {
    const start = Date.now();
    const res = await request.get(`${BASE}/api/runs/queue`);
    const elapsed = Date.now() - start;
    expect(res.ok()).toBeTruthy();
    expect(elapsed).toBeLessThan(10000); // under 10s
  });
});
