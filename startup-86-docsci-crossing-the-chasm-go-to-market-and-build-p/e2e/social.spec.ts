/**
 * e2e/social.spec.ts — /social launch content page tests
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE = process.env.BASE_URL || "http://localhost:3000";

test.describe("/social — launch content page", () => {
  test("loads and returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/social`);
    expect(res.ok()).toBeTruthy();
  });

  test("renders h1", async ({ page }) => {
    await page.goto(`${BASE}/social`);
    await expect(page.locator("[data-testid='social-h1']")).toBeVisible();
  });

  test("has Twitter/X thread section", async ({ page }) => {
    await page.goto(`${BASE}/social`);
    await expect(page.locator("[data-testid='twitter-section']")).toBeVisible();
  });

  test("shows 6 tweets in thread", async ({ page }) => {
    await page.goto(`${BASE}/social`);
    for (let i = 1; i <= 6; i++) {
      await expect(page.locator(`[data-testid='tweet-${i}']`)).toBeVisible();
    }
  });

  test("has LinkedIn section", async ({ page }) => {
    await page.goto(`${BASE}/social`);
    await expect(page.locator("[data-testid='linkedin-section']")).toBeVisible();
    await expect(page.locator("[data-testid='linkedin-post']")).toBeVisible();
  });

  test("has Hacker News section", async ({ page }) => {
    await page.goto(`${BASE}/social`);
    await expect(page.locator("[data-testid='hn-section']")).toBeVisible();
    await expect(page.locator("[data-testid='hn-post']")).toBeVisible();
  });

  test("has Indie Hackers section", async ({ page }) => {
    await page.goto(`${BASE}/social`);
    await expect(page.locator("[data-testid='ih-section']")).toBeVisible();
    await expect(page.locator("[data-testid='ih-post']")).toBeVisible();
  });

  test("has account setup checklist", async ({ page }) => {
    await page.goto(`${BASE}/social`);
    await expect(page.locator("[data-testid='checklist-section']")).toBeVisible();
  });

  test("all content links to snippetci.com", async ({ page }) => {
    await page.goto(`${BASE}/social`);
    const content = await page.content();
    expect(content).toContain("snippetci.com");
  });

  test("Twitter thread mentions snippetci.com", async ({ page }) => {
    await page.goto(`${BASE}/social`);
    const thread = await page.locator("[data-testid='twitter-thread']").textContent();
    expect(thread).toContain("snippetci.com");
  });

  test("has meta section with og/twitter tags", async ({ page }) => {
    await page.goto(`${BASE}/social`);
    await expect(page.locator("[data-testid='meta-section']")).toBeVisible();
    const content = await page.content();
    expect(content).toContain("og:title");
  });

  test("links back to /launch", async ({ page }) => {
    await page.goto(`${BASE}/social`);
    const content = await page.content();
    expect(content).toContain("/launch");
  });
});

test.describe("Sitemap — /social", () => {
  test("sitemap includes /social", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    expect(await res.text()).toContain("/social");
  });

  test("sitemap total ≥ 38 URLs", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    const count = ((await res.text()).match(/<url>/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(38);
  });
});

test.describe("Social source validation", () => {
  const base = process.cwd();

  test("app/social/page.tsx exists", () => {
    expect(fs.existsSync(path.join(base, "app/social/page.tsx"))).toBe(true);
  });

  test("social page has 6-tweet thread", () => {
    const content = fs.readFileSync(path.join(base, "app/social/page.tsx"), "utf8");
    expect(content).toContain("twitterThread");
    // 6 entries
    const matches = content.match(/\{\s*n:\s*\d/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(6);
  });

  test("social page mentions all 4 platforms", () => {
    const content = fs.readFileSync(path.join(base, "app/social/page.tsx"), "utf8");
    expect(content).toContain("LinkedIn");
    expect(content).toContain("Hacker News");
    expect(content).toContain("Indie Hackers");
    expect(content).toContain("Twitter");
  });

  test("social page links to snippetci.com", () => {
    const content = fs.readFileSync(path.join(base, "app/social/page.tsx"), "utf8");
    expect(content).toContain("snippetci.com");
  });

  test("sitemap.ts includes /social", () => {
    const content = fs.readFileSync(path.join(base, "app/sitemap.ts"), "utf8");
    expect(content).toContain("/social");
  });
});
