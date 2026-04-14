/**
 * e2e/case-study.spec.ts — case study page tests
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE = process.env.BASE_URL || "http://localhost:3000";

test.describe("/case-studies — index", () => {
  test("loads 200", async ({ request }) => {
    expect((await request.get(`${BASE}/case-studies`)).ok()).toBeTruthy();
  });

  test("renders h1", async ({ page }) => {
    await page.goto(`${BASE}/case-studies`);
    await expect(page.locator("[data-testid='case-studies-h1']")).toBeVisible();
  });

  test("links to SDK case study", async ({ page }) => {
    await page.goto(`${BASE}/case-studies`);
    await expect(page.locator("[data-testid='case-study-link']")).toBeVisible();
  });
});

test.describe("/case-studies/sdk-docs-broken-examples", () => {
  test("loads 200", async ({ request }) => {
    expect((await request.get(`${BASE}/case-studies/sdk-docs-broken-examples`)).ok()).toBeTruthy();
  });

  test("renders h1 about broken examples", async ({ page }) => {
    await page.goto(`${BASE}/case-studies/sdk-docs-broken-examples`);
    const h1 = page.locator("[data-testid='case-study-h1']");
    await expect(h1).toBeVisible();
    expect(await h1.textContent()).toContain("94%");
  });

  test("has JSON-LD Article schema", async ({ request }) => {
    const html = await (await request.get(`${BASE}/case-studies/sdk-docs-broken-examples`)).text();
    expect(html).toContain("Article");
    expect(html).toContain("snippetci.com");
  });

  test("shows key metrics", async ({ page }) => {
    await page.goto(`${BASE}/case-studies/sdk-docs-broken-examples`);
    await expect(page.locator("[data-testid='key-metrics']")).toBeVisible();
    const content = await page.content();
    expect(content).toContain("1.2%");
    expect(content).toContain("77%");
  });

  test("shows failures chart section", async ({ page }) => {
    await page.goto(`${BASE}/case-studies/sdk-docs-broken-examples`);
    await expect(page.locator("[data-testid='failures-chart-section']")).toBeVisible();
    await expect(page.locator("[data-testid='failures-chart']")).toBeVisible();
  });

  test("shows support tickets chart", async ({ page }) => {
    await page.goto(`${BASE}/case-studies/sdk-docs-broken-examples`);
    await expect(page.locator("[data-testid='support-chart-section']")).toBeVisible();
  });

  test("shows sample findings (4)", async ({ page }) => {
    await page.goto(`${BASE}/case-studies/sdk-docs-broken-examples`);
    await expect(page.locator("[data-testid='sample-findings-section']")).toBeVisible();
    for (let i = 0; i < 4; i++) {
      await expect(page.locator(`[data-testid='finding-${i}']`)).toBeVisible();
    }
  });

  test("shows ROI table with $14,200 saving", async ({ page }) => {
    await page.goto(`${BASE}/case-studies/sdk-docs-broken-examples`);
    await expect(page.locator("[data-testid='roi-section']")).toBeVisible();
    const content = await page.content();
    expect(content).toContain("14,200");
  });

  test("shows methodology section", async ({ page }) => {
    await page.goto(`${BASE}/case-studies/sdk-docs-broken-examples`);
    await expect(page.locator("[data-testid='methodology-section']")).toBeVisible();
  });

  test("download run report link exists", async ({ page }) => {
    await page.goto(`${BASE}/case-studies/sdk-docs-broken-examples`);
    await expect(page.locator("[data-testid='download-report']")).toBeVisible();
  });

  test("has CTA with signup link", async ({ page }) => {
    await page.goto(`${BASE}/case-studies/sdk-docs-broken-examples`);
    await expect(page.locator("[data-testid='case-study-cta']")).toBeVisible();
  });

  test("links to related blog posts", async ({ page }) => {
    await page.goto(`${BASE}/case-studies/sdk-docs-broken-examples`);
    const content = await page.content();
    expect(content).toContain("/blog/broken-docs-cost");
    expect(content).toContain("/blog/hermetic-snippet-execution");
  });
});

test.describe("Run report download", () => {
  test("GET /case-studies/acme-sdk-run-report.json returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/case-studies/acme-sdk-run-report.json`);
    expect(res.ok()).toBeTruthy();
  });

  test("run report is valid JSON with required fields", async ({ request }) => {
    const res = await request.get(`${BASE}/case-studies/acme-sdk-run-report.json`);
    const json = await res.json();
    expect(json.report_id).toBeDefined();
    expect(json.summary).toBeDefined();
    expect(json.releases).toBeDefined();
    expect(Array.isArray(json.releases)).toBe(true);
    expect(json.releases.length).toBeGreaterThanOrEqual(8);
  });

  test("run report shows 94% improvement", async ({ request }) => {
    const res = await request.get(`${BASE}/case-studies/acme-sdk-run-report.json`);
    const json = await res.json();
    const before = json.summary.failure_rate_before_pct;
    const after = json.summary.failure_rate_after_pct;
    const improvement = ((before - after) / before) * 100;
    expect(improvement).toBeGreaterThan(90);
  });

  test("run report has sample findings", async ({ request }) => {
    const res = await request.get(`${BASE}/case-studies/acme-sdk-run-report.json`);
    const json = await res.json();
    expect(json.sample_findings).toBeDefined();
    expect(json.sample_findings.length).toBeGreaterThanOrEqual(3);
  });
});

test.describe("Sitemap — case studies", () => {
  test("sitemap includes /case-studies", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    expect(await res.text()).toContain("/case-studies");
  });

  test("sitemap includes /case-studies/sdk-docs-broken-examples", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    expect(await res.text()).toContain("/case-studies/sdk-docs-broken-examples");
  });

  test("sitemap total ≥ 41 URLs", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    const count = ((await res.text()).match(/<url>/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(41);
  });
});

test.describe("Case study source validation", () => {
  const base = process.cwd();

  test("case study page exists", () => {
    expect(fs.existsSync(path.join(base, "app/case-studies/sdk-docs-broken-examples/page.tsx"))).toBe(true);
  });

  test("run report JSON exists", () => {
    expect(fs.existsSync(path.join(base, "public/case-studies/acme-sdk-run-report.json"))).toBe(true);
  });

  test("run report has 8 releases", () => {
    const json = JSON.parse(fs.readFileSync(path.join(base, "public/case-studies/acme-sdk-run-report.json"), "utf8"));
    expect(json.releases.length).toBe(8);
  });

  test("case study page has JSON-LD and snippetci.com", () => {
    const content = fs.readFileSync(path.join(base, "app/case-studies/sdk-docs-broken-examples/page.tsx"), "utf8");
    expect(content).toContain("Article");
    expect(content).toContain("snippetci.com");
  });

  test("sitemap.ts includes both case study URLs", () => {
    const content = fs.readFileSync(path.join(base, "app/sitemap.ts"), "utf8");
    expect(content).toContain("/case-studies");
    expect(content).toContain("/case-studies/sdk-docs-broken-examples");
  });
});
