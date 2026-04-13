import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";

test.describe("DocsCI core pages", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto(BASE);
    await expect(page).toHaveTitle(/DocsCI/);
    await expect(page.getByText("Stop shipping")).toBeVisible();
  });

  test("research page loads with competitive matrix", async ({ page }) => {
    await page.goto(`${BASE}/docs/research`);
    await expect(page).toHaveTitle(/Research/);
    await expect(page.getByRole("heading", { name: /Competitive Matrix/ })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Mintlify" }).first()).toBeVisible();
  });

  test("research page shows beachhead quantification", async ({ page }) => {
    await page.goto(`${BASE}/docs/research`);
    await expect(page.getByRole("heading", { name: /Beachhead Quantification/ })).toBeVisible();
    // 4,704 appears as a key metric
    await expect(page.getByText("4,704").first()).toBeVisible();
  });

  test("research page shows pain point corpus", async ({ page }) => {
    await page.goto(`${BASE}/docs/research`);
    await expect(page.getByRole("heading", { name: /Pain-Point Corpus/ })).toBeVisible();
  });

  test("research.md is served as static file", async ({ page }) => {
    const res = await page.goto(`${BASE}/docs/research.md`);
    expect(res?.status()).toBe(200);
    const body = await page.content();
    expect(body).toContain("DocsCI");
  });
});

test.describe("Admin research page", () => {
  test("admin page requires auth", async ({ page }) => {
    await page.goto(`${BASE}/admin/research`);
    // Should show login form, not data
    await expect(page.getByText("Admin Key")).toBeVisible();
    await expect(page.getByText("Access Research DB")).toBeVisible();
  });

  test("admin API returns 401 without key", async ({ request }) => {
    const res = await request.get(`${BASE}/api/market-research`);
    expect(res.status()).toBe(401);
  });

  test("admin API returns data with valid key", async ({ request }) => {
    const res = await request.get(`${BASE}/api/market-research?type=all&limit=5`, {
      headers: { "x-admin-key": process.env.ADMIN_KEY || "docsci-admin-2025" },
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.records).toBeDefined();
    expect(json.counts).toBeDefined();
    expect(json.total).toBeGreaterThan(0);
  });

  test("admin page login flow", async ({ page }) => {
    await page.goto(`${BASE}/admin/research`);
    await page.fill("input[type='password']", process.env.ADMIN_KEY || "docsci-admin-2025");
    await page.click("button[type='submit']");
    // After login: wait for the admin UI heading or table-related text
    await expect(
      page.getByRole("heading", { name: /Research Admin/ }).or(page.getByText("market_research"))
    ).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Market research API", () => {
  test("filters by type=competitor", async ({ request }) => {
    const res = await request.get(`${BASE}/api/market-research?type=competitor`, {
      headers: { "x-admin-key": process.env.ADMIN_KEY || "docsci-admin-2025" },
    });
    const json = await res.json();
    expect(json.records.every((r: { research_type: string }) => r.research_type === "competitor")).toBe(true);
  });

  test("filters by type=pain_point", async ({ request }) => {
    const res = await request.get(`${BASE}/api/market-research?type=pain_point&limit=10`, {
      headers: { "x-admin-key": process.env.ADMIN_KEY || "docsci-admin-2025" },
    });
    const json = await res.json();
    expect(json.total).toBeGreaterThanOrEqual(10);
  });

  test("search filter works", async ({ request }) => {
    const res = await request.get(`${BASE}/api/market-research?q=Mintlify`, {
      headers: { "x-admin-key": process.env.ADMIN_KEY || "docsci-admin-2025" },
    });
    const json = await res.json();
    expect(json.records.length).toBeGreaterThan(0);
  });
});

test.describe("ICP page", () => {
  test("ICP page loads with correct title", async ({ page }) => {
    await page.goto(`${BASE}/docs/icp`);
    await expect(page).toHaveTitle(/ICP/);
    await expect(page.getByRole("heading", { name: /Docusaurus.*OpenAPI.*Node/ })).toBeVisible();
  });

  test("ICP page shows stack fingerprint", async ({ page }) => {
    await page.goto(`${BASE}/docs/icp`);
    await expect(page.getByRole("heading", { name: /Stack Fingerprint/ })).toBeVisible();
    // Look for openapi text in the table
    await expect(page.getByText(/docusaurus-plugin-openapi/).first()).toBeVisible();
    await expect(page.getByText(/89%/).first()).toBeVisible();
  });

  test("ICP page shows JTBD", async ({ page }) => {
    await page.goto(`${BASE}/docs/icp`);
    await expect(page.getByRole("heading", { name: /Jobs To Be Done/ })).toBeVisible();
    // Primary JTBD text contains 'SDK release'
    await expect(page.getByText(/SDK release/).first()).toBeVisible();
  });

  test("ICP page shows trigger moments", async ({ page }) => {
    await page.goto(`${BASE}/docs/icp`);
    await expect(page.getByRole("heading", { name: /Trigger Moments/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "SDK Release Spike" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "New Head of DevRel Hired" })).toBeVisible();
  });

  test("ICP page shows segment sizing", async ({ page }) => {
    await page.goto(`${BASE}/docs/icp`);
    await expect(page.getByRole("heading", { name: /Segment Sizing/ })).toBeVisible();
    await expect(page.getByText("$36M")).toBeVisible();
  });

  test("research page links to ICP page", async ({ page }) => {
    await page.goto(`${BASE}/docs/research`);
    const icpLink = page.getByRole("link", { name: /Full ICP spec/ });
    await expect(icpLink).toBeVisible();
    await icpLink.click();
    await expect(page).toHaveURL(/\/docs\/icp/);
  });
});
