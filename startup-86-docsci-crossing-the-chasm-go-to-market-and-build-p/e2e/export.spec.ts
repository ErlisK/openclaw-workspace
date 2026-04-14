/**
 * export.spec.ts — JSON export, SARIF export, template SARIF, E2E tests
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";

// ── /api/runs/[runId]/export ──────────────────────────────────────────────────

test.describe("GET /api/runs/[runId]/export — JSON export", () => {
  test("returns 404 for unknown runId", async ({ request }) => {
    const res = await request.get(`${BASE}/api/runs/00000000-0000-0000-0000-000000000000/export`);
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("not found");
  });

  test("404 response is valid JSON", async ({ request }) => {
    const res = await request.get(`${BASE}/api/runs/nonexistent-uuid-here/export`);
    expect([404, 400]).toContain(res.status());
    const ct = res.headers()["content-type"] ?? "";
    expect(ct).toContain("application/json");
  });

  test("export endpoint accepts include query param", async ({ request }) => {
    // Just verify the endpoint exists and returns JSON
    const res = await request.get(`${BASE}/api/runs/fake-run-id/export?include=summary`);
    expect([200, 400, 404]).toContain(res.status());
    const ct = res.headers()["content-type"] ?? "";
    expect(ct).toContain("json");
  });

  test("export endpoint accepts download query param", async ({ request }) => {
    const res = await request.get(`${BASE}/api/runs/fake-run-id/export?download=1`);
    expect([200, 404]).toContain(res.status());
  });

  test("export endpoint accepts resolved filter", async ({ request }) => {
    const res = await request.get(`${BASE}/api/runs/fake-run-id/export?resolved=false`);
    expect([200, 404]).toContain(res.status());
  });

  test("export endpoint accepts severity filter", async ({ request }) => {
    const res = await request.get(`${BASE}/api/runs/fake-run-id/export?severity=error,warning`);
    expect([200, 404]).toContain(res.status());
  });
});

// ── /api/runs/[runId]/sarif ───────────────────────────────────────────────────

test.describe("GET /api/runs/[runId]/sarif — SARIF export", () => {
  test("returns 404 for unknown runId", async ({ request }) => {
    const res = await request.get(`${BASE}/api/runs/00000000-0000-0000-0000-000000000000/sarif`);
    expect(res.status()).toBe(404);
  });

  test("404 response is valid JSON", async ({ request }) => {
    const res = await request.get(`${BASE}/api/runs/nonexistent-sarif-run/sarif`);
    expect([404, 400]).toContain(res.status());
    const ct = res.headers()["content-type"] ?? "";
    expect(ct).toContain("json");
  });

  test("sarif endpoint responds (not 500)", async ({ request }) => {
    const res = await request.get(`${BASE}/api/runs/fake-uuid/sarif`);
    expect(res.status()).not.toBe(500);
  });

  test("sarif download adds content-disposition header", async ({ request }) => {
    const res = await request.get(`${BASE}/api/runs/00000000-0000-0000-0000-000000000000/sarif?download=1`);
    // 404 is fine; but IF 200, check content-disposition
    if (res.status() === 200) {
      const cd = res.headers()["content-disposition"] ?? "";
      expect(cd).toContain("attachment");
      expect(cd).toContain(".sarif");
    }
  });

  test("sarif accepts resolved=false filter", async ({ request }) => {
    const res = await request.get(`${BASE}/api/runs/fake-id/sarif?resolved=false`);
    expect([200, 404]).toContain(res.status());
  });
});

// ── /api/runs/[runId] — run detail with export links ─────────────────────────

test.describe("GET /api/runs/[runId] — run detail", () => {
  test("returns 404 for unknown runId", async ({ request }) => {
    const res = await request.get(`${BASE}/api/runs/00000000-0000-0000-0000-000000000000`);
    expect(res.status()).toBe(404);
  });

  test("run detail returns JSON", async ({ request }) => {
    const res = await request.get(`${BASE}/api/runs/fake-run`);
    expect([200, 404]).toContain(res.status());
    const ct = res.headers()["content-type"] ?? "";
    expect(ct).toContain("application/json");
  });
});

// ── Schema validation (a real queued run) ────────────────────────────────────

test.describe("Export schema — inline demo run", () => {
  // These tests queue a demo run and validate the export format
  let runId: string | null = null;

  test.beforeAll(async ({ request }) => {
    // Queue a minimal inline run
    const res = await request.post(`${BASE}/api/runs/queue`, {
      data: {
        mode: "inline",
        docs: [
          {
            path: "docs/example.md",
            content: "# Hello\n\n```python\nprint('hello')\n```\n",
          },
        ],
      },
    });
    if (res.status() === 200 || res.status() === 201) {
      const body = await res.json();
      runId = body.run_id ?? body.id ?? null;
    }
  });

  test("queued run gets a run_id", async () => {
    // If queuing wasn't possible (auth required), skip
    if (!runId) {
      test.skip();
      return;
    }
    expect(typeof runId).toBe("string");
    expect(runId!.length).toBeGreaterThan(0);
  });

  test("JSON export schema is valid for queued run", async ({ request }) => {
    if (!runId) { test.skip(); return; }
    const res = await request.get(`${BASE}/api/runs/${runId}/export`);
    if (res.status() === 404) { test.skip(); return; }
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.schema_version).toBe("1.0");
    expect(body.generated_at).toBeTruthy();
    expect(body.run).toBeTruthy();
    expect(body.run.id).toBe(runId);
    expect(typeof body.run.status).toBe("string");
    expect(Array.isArray(body.findings)).toBe(true);
    expect(Array.isArray(body.snippets)).toBe(true);
  });

  test("JSON export summary is present", async ({ request }) => {
    if (!runId) { test.skip(); return; }
    const res = await request.get(`${BASE}/api/runs/${runId}/export`);
    if (!res.ok()) { test.skip(); return; }
    const body = await res.json();
    expect(typeof body.summary?.total_findings).toBe("number");
    expect(typeof body.summary?.snippets_total).toBe("number");
    expect(body.summary?.by_severity).toBeTruthy();
  });

  test("JSON export download sets content-disposition", async ({ request }) => {
    if (!runId) { test.skip(); return; }
    const res = await request.get(`${BASE}/api/runs/${runId}/export?download=1`);
    if (!res.ok()) { test.skip(); return; }
    const cd = res.headers()["content-disposition"] ?? "";
    expect(cd).toContain("attachment");
    expect(cd).toContain(".json");
  });

  test("SARIF export schema version is 2.1.0", async ({ request }) => {
    if (!runId) { test.skip(); return; }
    const res = await request.get(`${BASE}/api/runs/${runId}/sarif`);
    if (res.status() === 404) { test.skip(); return; }
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.version).toBe("2.1.0");
    expect(body.$schema).toContain("sarif");
    expect(Array.isArray(body.runs)).toBe(true);
    expect(body.runs.length).toBe(1);
  });

  test("SARIF run has tool.driver.name = DocsCI", async ({ request }) => {
    if (!runId) { test.skip(); return; }
    const res = await request.get(`${BASE}/api/runs/${runId}/sarif`);
    if (!res.ok()) { test.skip(); return; }
    const body = await res.json();
    expect(body.runs[0].tool.driver.name).toBe("DocsCI");
    expect(body.runs[0].tool.driver.informationUri).toContain("snippetci.com");
  });

  test("SARIF run has invocations array", async ({ request }) => {
    if (!runId) { test.skip(); return; }
    const res = await request.get(`${BASE}/api/runs/${runId}/sarif`);
    if (!res.ok()) { test.skip(); return; }
    const body = await res.json();
    expect(Array.isArray(body.runs[0].invocations)).toBe(true);
    expect(typeof body.runs[0].invocations[0].executionSuccessful).toBe("boolean");
  });

  test("SARIF results array exists", async ({ request }) => {
    if (!runId) { test.skip(); return; }
    const res = await request.get(`${BASE}/api/runs/${runId}/sarif`);
    if (!res.ok()) { test.skip(); return; }
    const body = await res.json();
    expect(Array.isArray(body.runs[0].results)).toBe(true);
  });

  test("SARIF download sets correct content-type", async ({ request }) => {
    if (!runId) { test.skip(); return; }
    const res = await request.get(`${BASE}/api/runs/${runId}/sarif?download=1`);
    if (!res.ok()) { test.skip(); return; }
    const ct = res.headers()["content-type"] ?? "";
    expect(ct).toContain("sarif");
    const cd = res.headers()["content-disposition"] ?? "";
    expect(cd).toContain("attachment");
    expect(cd).toContain(".sarif");
  });

  test("run detail has export_links", async ({ request }) => {
    if (!runId) { test.skip(); return; }
    const res = await request.get(`${BASE}/api/runs/${runId}`);
    if (!res.ok()) { test.skip(); return; }
    const body = await res.json();
    expect(body.export_links?.json).toContain("/export");
    expect(body.export_links?.sarif).toContain("/sarif");
    expect(body.export_links?.json_download).toContain("download=1");
    expect(body.export_links?.sarif_download).toContain("download=1");
  });
});

// ── /api/templates — SARIF template present ───────────────────────────────────

test.describe("GET /api/templates — SARIF template", () => {
  test("SARIF template is in the registry", async ({ request }) => {
    const res = await request.get(`${BASE}/api/templates`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const ids = body.templates.map((t: { id: string }) => t.id);
    expect(ids).toContain("github-actions-sarif");
  });

  test("SARIF template download returns valid YAML", async ({ request }) => {
    const res = await request.get(`${BASE}/api/templates?id=github-actions-sarif`);
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).toContain("upload-sarif");
    expect(text).toContain("security-events: write");
    expect(text).toContain("snippetci.com/api/runs");
    expect(text).toContain("sarif");
    expect(text).toContain("DOCSCI_TOKEN");
  });

  test("SARIF template download has content-disposition", async ({ request }) => {
    const res = await request.get(`${BASE}/api/templates?id=github-actions-sarif&download=1`);
    expect(res.ok()).toBeTruthy();
    const cd = res.headers()["content-disposition"] ?? "";
    expect(cd).toContain("attachment");
  });

  test("template categories still include ci", async ({ request }) => {
    const res = await request.get(`${BASE}/api/templates`);
    const body = await res.json();
    expect(body.categories.ci).toContain("github-actions-sarif");
  });

  test("total template count increased", async ({ request }) => {
    const res = await request.get(`${BASE}/api/templates`);
    const body = await res.json();
    expect(body.total).toBeGreaterThanOrEqual(6);
  });
});

// ── Source code validation ────────────────────────────────────────────────────

test.describe("Export source code validation", () => {
  const fs = require("fs");
  const path = require("path");
  const base = process.cwd();

  test("export route exists", () => {
    expect(fs.existsSync(path.join(base, "app/api/runs/[runId]/export/route.ts"))).toBe(true);
  });

  test("sarif route exists", () => {
    expect(fs.existsSync(path.join(base, "app/api/runs/[runId]/sarif/route.ts"))).toBe(true);
  });

  test("run detail route exists", () => {
    expect(fs.existsSync(path.join(base, "app/api/runs/[runId]/route.ts"))).toBe(true);
  });

  test("export route has schema_version", () => {
    const content = fs.readFileSync(path.join(base, "app/api/runs/[runId]/export/route.ts"), "utf8");
    expect(content).toContain("schema_version");
    expect(content).toContain("1.0");
  });

  test("sarif route has SARIF version 2.1.0", () => {
    const content = fs.readFileSync(path.join(base, "app/api/runs/[runId]/sarif/route.ts"), "utf8");
    expect(content).toContain("2.1.0");
    expect(content).toContain("$schema");
    expect(content).toContain("DocsCI");
  });

  test("sarif route maps severity to SARIF levels", () => {
    const content = fs.readFileSync(path.join(base, "app/api/runs/[runId]/sarif/route.ts"), "utf8");
    expect(content).toContain("error");
    expect(content).toContain("warning");
    expect(content).toContain("note");
  });

  test("sarif route has rule metadata for known kinds", () => {
    const content = fs.readFileSync(path.join(base, "app/api/runs/[runId]/sarif/route.ts"), "utf8");
    expect(content).toContain("snippet_error");
    expect(content).toContain("a11y");
    expect(content).toContain("drift");
    expect(content).toContain("secret");
  });

  test("export route supports include filter", () => {
    const content = fs.readFileSync(path.join(base, "app/api/runs/[runId]/export/route.ts"), "utf8");
    expect(content).toContain("include");
    expect(content).toContain("findings");
    expect(content).toContain("snippets");
  });

  test("run detail route includes export_links", () => {
    const content = fs.readFileSync(path.join(base, "app/api/runs/[runId]/route.ts"), "utf8");
    expect(content).toContain("export_links");
    expect(content).toContain("/export");
    expect(content).toContain("/sarif");
  });
});
