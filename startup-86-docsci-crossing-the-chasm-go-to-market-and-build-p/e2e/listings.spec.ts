/**
 * e2e/listings.spec.ts — /listings directory submissions page tests
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE = process.env.BASE_URL || "http://localhost:3000";

test.describe("/listings — directory submissions page", () => {
  test("loads and returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/listings`);
    expect(res.ok()).toBeTruthy();
  });

  test("renders h1", async ({ page }) => {
    await page.goto(`${BASE}/listings`);
    await expect(page.locator("[data-testid='listings-h1']")).toBeVisible();
  });

  test("shows 3+ submitted awesome-list entries", async ({ page }) => {
    await page.goto(`${BASE}/listings`);
    const section = page.locator("[data-testid='section-awesome-lists']");
    await expect(section).toBeVisible();
    const items = section.locator("[data-testid^='listing-']");
    expect(await items.count()).toBeGreaterThanOrEqual(3);
  });

  test("shows submission counts", async ({ page }) => {
    await page.goto(`${BASE}/listings`);
    await expect(page.locator("[data-testid='submission-counts']")).toBeVisible();
  });

  test("shows awesome-docs listing", async ({ page }) => {
    await page.goto(`${BASE}/listings`);
    await expect(page.locator("[data-testid='listing-awesome-docs']")).toBeVisible();
  });

  test("shows awesome-technical-writing listing", async ({ page }) => {
    await page.goto(`${BASE}/listings`);
    await expect(page.locator("[data-testid='listing-awesome-technical-writing']")).toBeVisible();
  });

  test("shows awesome-api-devtools listing", async ({ page }) => {
    await page.goto(`${BASE}/listings`);
    await expect(page.locator("[data-testid='listing-awesome-api-devtools']")).toBeVisible();
  });

  test("shows community posts section", async ({ page }) => {
    await page.goto(`${BASE}/listings`);
    const section = page.locator("[data-testid='section-community-posts']");
    await expect(section).toBeVisible();
    const items = section.locator("[data-testid^='listing-']");
    expect(await items.count()).toBeGreaterThanOrEqual(4);
  });

  test("links to GitHub forks for awesome-lists", async ({ page }) => {
    await page.goto(`${BASE}/listings`);
    const content = await page.content();
    expect(content).toContain("github.com/ErlisK");
  });

  test("content links to snippetci.com", async ({ page }) => {
    await page.goto(`${BASE}/listings`);
    const content = await page.content();
    expect(content).toContain("snippetci.com");
  });
});

test.describe("Sitemap — /listings", () => {
  test("sitemap includes /listings", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    expect(await res.text()).toContain("/listings");
  });

  test("sitemap total ≥ 39 URLs", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    const count = ((await res.text()).match(/<url>/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(39);
  });
});

test.describe("Listings source validation", () => {
  const base = process.cwd();

  test("app/listings/page.tsx exists", () => {
    expect(fs.existsSync(path.join(base, "app/listings/page.tsx"))).toBe(true);
  });

  test("listings page includes all 3 awesome-list repos", () => {
    const content = fs.readFileSync(path.join(base, "app/listings/page.tsx"), "utf8");
    expect(content).toContain("testthedocs/awesome-docs");
    expect(content).toContain("BolajiAyodeji/awesome-technical-writing");
    expect(content).toContain("yosriady/awesome-api-devtools");
  });

  test("listings page links to ErlisK forks on GitHub", () => {
    const content = fs.readFileSync(path.join(base, "app/listings/page.tsx"), "utf8");
    expect(content).toContain("ErlisK/awesome-docs");
    expect(content).toContain("ErlisK/awesome-technical-writing");
    expect(content).toContain("ErlisK/awesome-api-devtools");
  });

  test("listings page includes 4 community platforms", () => {
    const content = fs.readFileSync(path.join(base, "app/listings/page.tsx"), "utf8");
    expect(content).toContain("Hacker News");
    expect(content).toContain("Product Hunt");
    expect(content).toContain("Indie Hackers");
    expect(content).toContain("BetaList");
  });

  test("sitemap.ts includes /listings", () => {
    const content = fs.readFileSync(path.join(base, "app/sitemap.ts"), "utf8");
    expect(content).toContain("/listings");
  });
});
