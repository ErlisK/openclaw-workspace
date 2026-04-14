import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE = process.env.BASE_URL || "http://localhost:3000";

// ── API: /api/analytics/goals ─────────────────────────────────────────────────

test.describe("/api/analytics/goals", () => {
  test("returns 200 with goals array", async ({ request }) => {
    const res = await request.get(`${BASE}/api/analytics/goals`);
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json).toHaveProperty("goals");
    expect(Array.isArray(json.goals)).toBe(true);
  });

  test("returns 5 goals", async ({ request }) => {
    const res = await request.get(`${BASE}/api/analytics/goals`);
    const json = await res.json();
    expect(json.goals.length).toBe(5);
  });

  test("goals have required fields", async ({ request }) => {
    const res = await request.get(`${BASE}/api/analytics/goals`);
    const json = await res.json();
    for (const goal of json.goals) {
      expect(goal).toHaveProperty("id");
      expect(goal).toHaveProperty("label");
      expect(goal).toHaveProperty("target_30d");
      expect(goal).toHaveProperty("count_30d");
      expect(goal).toHaveProperty("pct_of_target");
    }
  });

  test("includes project_created goal with target 50", async ({ request }) => {
    const res = await request.get(`${BASE}/api/analytics/goals`);
    const json = await res.json();
    const goal = json.goals.find((g: { id: string }) => g.id === "project_created");
    expect(goal).toBeDefined();
    expect(goal.target_30d).toBe(50);
  });

  test("includes run_completed goal with target 500", async ({ request }) => {
    const res = await request.get(`${BASE}/api/analytics/goals`);
    const json = await res.json();
    const goal = json.goals.find((g: { id: string }) => g.id === "run_completed");
    expect(goal).toBeDefined();
    expect(goal.target_30d).toBe(500);
  });

  test("includes patch_downloaded goal with target 100", async ({ request }) => {
    const res = await request.get(`${BASE}/api/analytics/goals`);
    const json = await res.json();
    const goal = json.goals.find((g: { id: string }) => g.id === "patch_downloaded");
    expect(goal).toBeDefined();
    expect(goal.target_30d).toBe(100);
  });

  test("includes user_signup goal", async ({ request }) => {
    const res = await request.get(`${BASE}/api/analytics/goals`);
    const json = await res.json();
    const goal = json.goals.find((g: { id: string }) => g.id === "user_signup");
    expect(goal).toBeDefined();
  });

  test("includes template_viewed goal", async ({ request }) => {
    const res = await request.get(`${BASE}/api/analytics/goals`);
    const json = await res.json();
    const goal = json.goals.find((g: { id: string }) => g.id === "template_viewed");
    expect(goal).toBeDefined();
  });

  test("includes funnel with 4 steps", async ({ request }) => {
    const res = await request.get(`${BASE}/api/analytics/goals`);
    const json = await res.json();
    expect(json.funnel).toBeDefined();
    expect(json.funnel).toHaveProperty("signups");
    expect(json.funnel).toHaveProperty("projects_created");
    expect(json.funnel).toHaveProperty("runs_completed");
    expect(json.funnel).toHaveProperty("patches_downloaded");
  });

  test("includes recent_events array", async ({ request }) => {
    const res = await request.get(`${BASE}/api/analytics/goals`);
    const json = await res.json();
    expect(Array.isArray(json.recent_events)).toBe(true);
  });

  test("includes last_updated ISO timestamp", async ({ request }) => {
    const res = await request.get(`${BASE}/api/analytics/goals`);
    const json = await res.json();
    expect(json.last_updated).toBeDefined();
    expect(() => new Date(json.last_updated)).not.toThrow();
  });

  test("all goals have numeric counts", async ({ request }) => {
    const res = await request.get(`${BASE}/api/analytics/goals`);
    const json = await res.json();
    for (const g of json.goals) {
      expect(typeof g.count_30d).toBe("number");
      expect(typeof g.count_all_time).toBe("number");
      expect(typeof g.count_7d).toBe("number");
      expect(typeof g.count_today).toBe("number");
    }
  });

  test("pct_of_target is between 0 and 100", async ({ request }) => {
    const res = await request.get(`${BASE}/api/analytics/goals`);
    const json = await res.json();
    for (const g of json.goals) {
      expect(g.pct_of_target).toBeGreaterThanOrEqual(0);
      expect(g.pct_of_target).toBeLessThanOrEqual(100);
    }
  });
});

// ── API: /api/events — patch_downloaded ──────────────────────────────────────

test.describe("/api/events — patch_downloaded", () => {
  test("accepts patch_downloaded event", async ({ request }) => {
    const res = await request.post(`${BASE}/api/events`, {
      data: {
        event: "patch_downloaded",
        distinct_id: "test-patch-e2e",
        properties: { source: "e2e-test", run_id: "test-run-001" },
      },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.event).toBe("patch_downloaded");
  });

  test("accepts patch.downloaded event", async ({ request }) => {
    const res = await request.post(`${BASE}/api/events`, {
      data: {
        event: "patch.downloaded",
        distinct_id: "test-patch-e2e-2",
      },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("rejects unknown event names", async ({ request }) => {
    const res = await request.post(`${BASE}/api/events`, {
      data: { event: "totally_fake_event_xyz" },
    });
    expect(res.status()).toBe(400);
  });
});

// ── /analytics-walkthrough page ──────────────────────────────────────────────

test.describe("/analytics-walkthrough", () => {
  test("page loads and returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/analytics-walkthrough`);
    expect(res.ok()).toBeTruthy();
  });

  test("renders h1 about walkthrough", async ({ page }) => {
    await page.goto(`${BASE}/analytics-walkthrough`);
    await expect(page.locator("[data-testid='page-h1']")).toBeVisible({ timeout: 10000 });
    const text = await page.locator("[data-testid='page-h1']").textContent();
    expect(text?.toLowerCase()).toContain("walkthrough");
  });

  test("shows events list with 5 rows", async ({ page }) => {
    await page.goto(`${BASE}/analytics-walkthrough`);
    const rows = page.locator("[data-testid^='event-row-']");
    await expect(rows).toHaveCount(5, { timeout: 10000 });
  });

  test("shows event schema section", async ({ page }) => {
    await page.goto(`${BASE}/analytics-walkthrough`);
    await expect(page.locator("[data-testid='event-schema']")).toBeVisible({ timeout: 10000 });
  });

  test("events complete and show completion message", async ({ page }) => {
    await page.goto(`${BASE}/analytics-walkthrough`);
    await expect(page.locator("[data-testid='completion-message']")).toBeVisible({ timeout: 20000 });
    const msg = await page.locator("[data-testid='completion-message']").textContent();
    expect(msg).toContain("5 events");
  });

  test("completion shows link to analytics dashboard", async ({ page }) => {
    await page.goto(`${BASE}/analytics-walkthrough`);
    await expect(page.locator("[data-testid='completion-message']")).toBeVisible({ timeout: 20000 });
    const link = page.locator("a[href='/dashboard/analytics']");
    await expect(link).toBeVisible();
  });
});

// ── /dashboard/analytics — auth-protected page ───────────────────────────────

test.describe("/dashboard/analytics page (auth-protected)", () => {
  test("page responds (auth redirect expected)", async ({ request }) => {
    const res = await request.get(`${BASE}/dashboard/analytics`, { maxRedirects: 0 });
    // Accepts 200 (if no auth guard), 302/307 (auth redirect), or 401
    expect([200, 302, 307, 401]).toContain(res.status());
  });

  test("dashboard/analytics/page.tsx source uses correct data-testids", () => {
    const base = process.cwd();
    const content = fs.readFileSync(path.join(base, "app/dashboard/analytics/page.tsx"), "utf8");
    expect(content).toContain("data-testid=\"analytics-dashboard\"");
    expect(content).toContain("data-testid=\"goals-grid\"");
    expect(content).toContain("data-testid=\"funnel-section\"");
    expect(content).toContain("data-testid=\"recent-events\"");
    expect(content).toContain("goal-card-");
  });
});

// ── Seeded walkthrough: 5 events via API ─────────────────────────────────────

test.describe("Seeded walkthrough — 5 core events", () => {
  const distinct_id = `e2e-seed-${Date.now()}`;

  test("fires user.signup", async ({ request }) => {
    const res = await request.post(`${BASE}/api/events`, {
      data: { event: "user.signup", distinct_id, properties: { source: "e2e-seed" } },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.event).toBe("user.signup");
  });

  test("fires project.created", async ({ request }) => {
    const res = await request.post(`${BASE}/api/events`, {
      data: { event: "project.created", distinct_id, properties: { source: "e2e-seed" } },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.event).toBe("project.created");
  });

  test("fires run.completed", async ({ request }) => {
    const res = await request.post(`${BASE}/api/events`, {
      data: { event: "run.completed", distinct_id, properties: { source: "e2e-seed", status: "passed" } },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.event).toBe("run.completed");
  });

  test("fires patch_downloaded", async ({ request }) => {
    const res = await request.post(`${BASE}/api/events`, {
      data: { event: "patch_downloaded", distinct_id, properties: { source: "e2e-seed" } },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.event).toBe("patch_downloaded");
  });

  test("fires template.viewed", async ({ request }) => {
    const res = await request.post(`${BASE}/api/events`, {
      data: { event: "template.viewed", distinct_id, properties: { source: "e2e-seed" } },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.event).toBe("template.viewed");
  });

  test("goals API returns 5 queryable goals after seeding", async ({ request }) => {
    const res = await request.get(`${BASE}/api/analytics/goals`);
    const json = await res.json();
    expect(json.goals.length).toBe(5);
    for (const g of json.goals) {
      expect(typeof g.count_30d).toBe("number");
      expect(typeof g.count_all_time).toBe("number");
    }
  });
});

// ── Source code validation ────────────────────────────────────────────────────

test.describe("Analytics source validation", () => {
  const base = process.cwd();

  test("api/analytics/goals/route.ts exists", () => {
    expect(fs.existsSync(path.join(base, "app/api/analytics/goals/route.ts"))).toBe(true);
  });

  test("dashboard/analytics/page.tsx exists", () => {
    expect(fs.existsSync(path.join(base, "app/dashboard/analytics/page.tsx"))).toBe(true);
  });

  test("analytics-walkthrough/page.tsx exists", () => {
    expect(fs.existsSync(path.join(base, "app/analytics-walkthrough/page.tsx"))).toBe(true);
  });

  test("goals route defines all 5 goal ids", () => {
    const content = fs.readFileSync(path.join(base, "app/api/analytics/goals/route.ts"), "utf8");
    for (const id of ["project_created", "run_completed", "patch_downloaded", "user_signup", "template_viewed"]) {
      expect(content).toContain(id);
    }
  });

  test("goals route has correct targets", () => {
    const content = fs.readFileSync(path.join(base, "app/api/analytics/goals/route.ts"), "utf8");
    expect(content).toContain("target_30d: 50");   // project_created
    expect(content).toContain("target_30d: 500");  // run_completed
    expect(content).toContain("target_30d: 100");  // patch_downloaded
  });

  test("events route allows patch_downloaded and patch.downloaded", () => {
    const content = fs.readFileSync(path.join(base, "app/api/events/route.ts"), "utf8");
    expect(content).toContain("patch_downloaded");
    expect(content).toContain("patch.downloaded");
  });

  test("dashboard shows goal cards for 3 required goals", () => {
    const content = fs.readFileSync(path.join(base, "app/dashboard/analytics/page.tsx"), "utf8");
    expect(content).toContain("project_created");
    expect(content).toContain("run_completed");
    expect(content).toContain("patch_downloaded");
  });

  test("walkthrough page fires all 5 events", () => {
    const content = fs.readFileSync(path.join(base, "app/analytics-walkthrough/page.tsx"), "utf8");
    expect(content).toContain("user.signup");
    expect(content).toContain("project.created");
    expect(content).toContain("run.completed");
    expect(content).toContain("patch_downloaded");
    expect(content).toContain("template.viewed");
  });
});
