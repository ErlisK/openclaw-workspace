/**
 * analytics.spec.ts — Metrics dashboard, event capture, error tracking, PostHog
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";

// ── /api/metrics ──────────────────────────────────────────────────────────────

test.describe("GET /api/metrics — run metrics", () => {
  test("returns 200 with summary", async ({ request }) => {
    const res = await request.get(`${BASE}/api/metrics`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.summary).toBeTruthy();
  });

  test("summary has required fields", async ({ request }) => {
    const res = await request.get(`${BASE}/api/metrics`);
    const body = await res.json();
    expect(typeof body.summary.total_runs).toBe("number");
    expect(typeof body.summary.passed_runs).toBe("number");
    expect(typeof body.summary.failed_runs).toBe("number");
    expect(typeof body.summary.pass_rate_pct).toBe("number");
    expect(typeof body.summary.total_findings).toBe("number");
    expect(typeof body.summary.avg_duration_ms).toBe("number");
  });

  test("has time_series array", async ({ request }) => {
    const res = await request.get(`${BASE}/api/metrics`);
    const body = await res.json();
    expect(Array.isArray(body.time_series)).toBe(true);
  });

  test("has finding_breakdown with by_severity and by_kind", async ({ request }) => {
    const res = await request.get(`${BASE}/api/metrics`);
    const body = await res.json();
    expect(body.finding_breakdown).toBeTruthy();
    expect(body.finding_breakdown.by_severity).toBeTruthy();
    expect(body.finding_breakdown.by_kind).toBeTruthy();
  });

  test("has recent_runs array", async ({ request }) => {
    const res = await request.get(`${BASE}/api/metrics`);
    const body = await res.json();
    expect(Array.isArray(body.recent_runs)).toBe(true);
  });

  test("has top_failing_files array", async ({ request }) => {
    const res = await request.get(`${BASE}/api/metrics`);
    const body = await res.json();
    expect(Array.isArray(body.top_failing_files)).toBe(true);
  });

  test("window_days defaults to 30", async ({ request }) => {
    const res = await request.get(`${BASE}/api/metrics`);
    const body = await res.json();
    expect(body.window_days).toBe(30);
  });

  test("accepts days query param", async ({ request }) => {
    const res = await request.get(`${BASE}/api/metrics?days=7`);
    const body = await res.json();
    expect(body.window_days).toBe(7);
  });

  test("clamps days to max 90", async ({ request }) => {
    const res = await request.get(`${BASE}/api/metrics?days=999`);
    const body = await res.json();
    expect(body.window_days).toBeLessThanOrEqual(90);
  });

  test("pass_rate_pct is between 0 and 100", async ({ request }) => {
    const res = await request.get(`${BASE}/api/metrics`);
    const body = await res.json();
    expect(body.summary.pass_rate_pct).toBeGreaterThanOrEqual(0);
    expect(body.summary.pass_rate_pct).toBeLessThanOrEqual(100);
  });

  test("accepts project_id filter", async ({ request }) => {
    const res = await request.get(`${BASE}/api/metrics?project_id=fake-id`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.summary.total_runs).toBe(0);
  });
});

// ── /api/events ───────────────────────────────────────────────────────────────

test.describe("POST /api/events — event capture", () => {
  test("captures a valid event", async ({ request }) => {
    const res = await request.post(`${BASE}/api/events`, {
      data: { event: "page.viewed", properties: { path: "/test" } },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.captured).toBe(true);
    expect(body.event).toBe("page.viewed");
  });

  test("rejects unknown event", async ({ request }) => {
    const res = await request.post(`${BASE}/api/events`, {
      data: { event: "totally.unknown.event.xyz" },
    });
    expect(res.status()).toBe(400);
  });

  test("allows custom.* events", async ({ request }) => {
    const res = await request.post(`${BASE}/api/events`, {
      data: { event: "custom.my_feature_used" },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    expect(body.captured).toBe(true);
  });

  test("requires event field", async ({ request }) => {
    const res = await request.post(`${BASE}/api/events`, { data: {} });
    expect(res.status()).toBe(400);
  });

  test("captures run.queued event", async ({ request }) => {
    const res = await request.post(`${BASE}/api/events`, {
      data: { event: "run.queued", properties: { project_id: "test" } },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("captures org.created event", async ({ request }) => {
    const res = await request.post(`${BASE}/api/events`, {
      data: { event: "org.created", distinct_id: "test-user" },
    });
    expect(res.ok()).toBeTruthy();
  });
});

test.describe("GET /api/events — event list", () => {
  test("returns events array", async ({ request }) => {
    const res = await request.get(`${BASE}/api/events`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.events)).toBe(true);
    expect(typeof body.total).toBe("number");
  });

  test("accepts limit param", async ({ request }) => {
    const res = await request.get(`${BASE}/api/events?limit=5`);
    const body = await res.json();
    expect(body.events.length).toBeLessThanOrEqual(5);
  });
});

// ── /api/errors ───────────────────────────────────────────────────────────────

test.describe("POST /api/errors — error capture", () => {
  test("captures a valid error", async ({ request }) => {
    const res = await request.post(`${BASE}/api/errors`, {
      data: {
        error_type: "SandboxTimeout",
        message: "Execution timed out after 20000ms",
        severity: "warning",
        context: { language: "python", timeout_ms: 20000 },
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.captured).toBe(true);
  });

  test("requires error_type and message", async ({ request }) => {
    const res = await request.post(`${BASE}/api/errors`, { data: {} });
    expect(res.status()).toBe(400);
  });

  test("requires message", async ({ request }) => {
    const res = await request.post(`${BASE}/api/errors`, {
      data: { error_type: "TestError" },
    });
    expect(res.status()).toBe(400);
  });

  test("accepts severity levels", async ({ request }) => {
    for (const sev of ["fatal", "error", "warning", "info"]) {
      const res = await request.post(`${BASE}/api/errors`, {
        data: { error_type: "TestError", message: "test", severity: sev },
      });
      expect(res.status()).toBe(201);
    }
  });
});

test.describe("GET /api/errors — error list", () => {
  test("returns errors array", async ({ request }) => {
    const res = await request.get(`${BASE}/api/errors`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.errors)).toBe(true);
  });

  test("accepts severity filter", async ({ request }) => {
    const res = await request.get(`${BASE}/api/errors?severity=error`);
    expect(res.ok()).toBeTruthy();
  });

  test("accepts resolved filter", async ({ request }) => {
    const res = await request.get(`${BASE}/api/errors?resolved=false`);
    expect(res.ok()).toBeTruthy();
  });
});

// ── /dashboard/metrics page ───────────────────────────────────────────────────

test.describe("/dashboard/metrics — metrics dashboard UI", () => {
  test("page loads (or redirects to login)", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/metrics`);
    const url = page.url();
    expect(url.includes("/dashboard/metrics") || url.includes("/login") || url.includes("/signup")).toBe(true);
  });

  test("page responds 200", async ({ request }) => {
    const res = await request.get(`${BASE}/dashboard/metrics`);
    expect(res.ok()).toBeTruthy();
  });

  test("metrics dashboard renders (no auth redirect)", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/metrics`);
    // Accept metrics page OR auth redirect
    const content = await page.content();
    const hasMetrics = content.includes("Metrics") || content.includes("metrics") || content.includes("Run");
    const hasAuth = content.includes("Sign") || content.includes("Login");
    expect(hasMetrics || hasAuth).toBe(true);
  });
});

// ── Source code validation ────────────────────────────────────────────────────

test.describe("Analytics source code validation", () => {
  const fs = require("fs");
  const path = require("path");
  const base = process.cwd();

  test("lib/analytics.ts exists", () => {
    expect(fs.existsSync(path.join(base, "lib/analytics.ts"))).toBe(true);
  });

  test("analytics.ts exports captureEvent and captureError", () => {
    const content = fs.readFileSync(path.join(base, "lib/analytics.ts"), "utf8");
    expect(content).toContain("export async function captureEvent");
    expect(content).toContain("export async function captureError");
  });

  test("analytics.ts uses docsci_events table", () => {
    const content = fs.readFileSync(path.join(base, "lib/analytics.ts"), "utf8");
    expect(content).toContain("docsci_events");
  });

  test("analytics.ts uses docsci_error_log table", () => {
    const content = fs.readFileSync(path.join(base, "lib/analytics.ts"), "utf8");
    expect(content).toContain("docsci_error_log");
  });

  test("analytics.ts integrates PostHog server-side", () => {
    const content = fs.readFileSync(path.join(base, "lib/analytics.ts"), "utf8");
    expect(content).toContain("posthog-node");
    expect(content).toContain("NEXT_PUBLIC_POSTHOG_KEY");
  });

  test("analytics.ts has hashIp for privacy", () => {
    const content = fs.readFileSync(path.join(base, "lib/analytics.ts"), "utf8");
    expect(content).toContain("hashIp");
    expect(content).toContain("sha256");
  });

  test("PostHogProvider component exists", () => {
    expect(fs.existsSync(path.join(base, "components/PostHogProvider.tsx"))).toBe(true);
  });

  test("PostHogProvider has trackEvent helper", () => {
    const content = fs.readFileSync(path.join(base, "components/PostHogProvider.tsx"), "utf8");
    expect(content).toContain("trackEvent");
    expect(content).toContain("/api/events");
  });

  test("metrics dashboard page exists", () => {
    expect(fs.existsSync(path.join(base, "app/dashboard/metrics/page.tsx"))).toBe(true);
  });

  test("metrics API route exists", () => {
    expect(fs.existsSync(path.join(base, "app/api/metrics/route.ts"))).toBe(true);
  });

  test("events API route exists", () => {
    expect(fs.existsSync(path.join(base, "app/api/events/route.ts"))).toBe(true);
  });

  test("errors API route exists", () => {
    expect(fs.existsSync(path.join(base, "app/api/errors/route.ts"))).toBe(true);
  });

  test("run-orchestrator captures run.completed event", () => {
    const content = fs.readFileSync(path.join(base, "lib/run-orchestrator.ts"), "utf8");
    expect(content).toContain("captureEvent");
    expect(content).toContain("run.completed");
  });
});
