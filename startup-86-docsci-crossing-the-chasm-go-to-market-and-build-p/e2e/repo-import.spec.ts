/**
 * repo-import.spec.ts — Playwright tests for the repo import feature
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";

test.describe("Repo import API — GET", () => {
  test("GET /api/repo-import returns usage docs", async ({ request }) => {
    const res = await request.get(`${BASE}/api/repo-import`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.endpoint).toBe("POST /api/repo-import");
    expect(body.supported).toContain("GitHub public repos");
  });
});

test.describe("Repo import API — validation", () => {
  test("POST without body returns 400", async ({ request }) => {
    const res = await request.post(`${BASE}/api/repo-import`, {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("url");
  });

  test("POST with non-GitHub URL returns 400", async ({ request }) => {
    const res = await request.post(`${BASE}/api/repo-import`, {
      data: { url: "https://gitlab.com/owner/repo" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("GitHub");
  });

  test("POST with invalid GitHub URL returns 400 or 404", async ({ request }) => {
    const res = await request.post(`${BASE}/api/repo-import`, {
      data: { url: "https://github.com/this-repo-does-not-exist-xyzabc-99999/no-repo" },
      headers: { "Content-Type": "application/json" },
      timeout: 30_000,
    });
    expect([400, 404, 500]).toContain(res.status());
  });
});

test.describe("Repo import API — real public repo", () => {
  // These tests hit real GitHub API — they use trpc/trpc which is stable
  test("POST trpc/trpc imports successfully", async ({ request }) => {
    const res = await request.post(`${BASE}/api/repo-import`, {
      data: { url: "https://github.com/trpc/trpc" },
      headers: { "Content-Type": "application/json" },
      timeout: 60_000,
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.repo.owner).toBe("trpc");
    expect(body.repo.repo).toBe("trpc");
  });

  test("POST trpc/trpc extracts code fences", async ({ request }) => {
    const res = await request.post(`${BASE}/api/repo-import`, {
      data: { url: "https://github.com/trpc/trpc" },
      headers: { "Content-Type": "application/json" },
      timeout: 60_000,
    });
    const body = await res.json();
    expect(body.scan.total_code_fences).toBeGreaterThan(0);
    expect(body.scan.docs_parsed).toBeGreaterThan(0);
    expect(body.code_fences.length).toBeGreaterThan(0);
  });

  test("POST trpc/trpc returns files with title and word_count", async ({ request }) => {
    const res = await request.post(`${BASE}/api/repo-import`, {
      data: { url: "https://github.com/trpc/trpc" },
      headers: { "Content-Type": "application/json" },
      timeout: 60_000,
    });
    const body = await res.json();
    const file = body.files[0];
    expect(file.path).toBeTruthy();
    expect(file.word_count).toBeGreaterThan(0);
    expect(typeof file.code_fences).toBe("number");
    expect(typeof file.links).toBe("number");
  });

  test("POST trpc/trpc completes under 30 seconds", async ({ request }) => {
    const res = await request.post(`${BASE}/api/repo-import`, {
      data: { url: "https://github.com/trpc/trpc" },
      headers: { "Content-Type": "application/json" },
      timeout: 60_000,
    });
    const body = await res.json();
    expect(body.scan.duration_ms).toBeLessThan(30_000);
  });

  test("POST returns language breakdown", async ({ request }) => {
    const res = await request.post(`${BASE}/api/repo-import`, {
      data: { url: "https://github.com/trpc/trpc" },
      headers: { "Content-Type": "application/json" },
      timeout: 60_000,
    });
    const body = await res.json();
    expect(body.scan.languages.length).toBeGreaterThan(0);
    expect(typeof body.scan.language_breakdown).toBe("object");
  });

  test("POST returns fence_previews for files with code", async ({ request }) => {
    const res = await request.post(`${BASE}/api/repo-import`, {
      data: { url: "https://github.com/trpc/trpc" },
      headers: { "Content-Type": "application/json" },
      timeout: 60_000,
    });
    const body = await res.json();
    const withFences = body.files.filter((f: { code_fences: number }) => f.code_fences > 0);
    expect(withFences.length).toBeGreaterThan(0);
    const first = withFences[0];
    expect(first.fence_previews.length).toBeGreaterThan(0);
    expect(first.fence_previews[0].language).toBeTruthy();
    expect(first.fence_previews[0].preview).toBeTruthy();
  });
});

test.describe("Repo import UI", () => {
  test("/import page loads with URL input", async ({ page }) => {
    await page.goto(`${BASE}/import`);
    await expect(page.locator("h1")).toContainText(/import/i);
    await expect(page.locator("input[type=url]")).toBeVisible();
    await expect(page.locator("button:has-text('Import')")).toBeVisible();
  });

  test("/import page shows example repos", async ({ page }) => {
    await page.goto(`${BASE}/import`);
    await expect(page.locator("text=supabase/supabase")).toBeVisible();
    await expect(page.locator("text=trpc/trpc")).toBeVisible();
  });

  test("/import page shows empty state by default", async ({ page }) => {
    await page.goto(`${BASE}/import`);
    await expect(page.locator("text=Enter a GitHub URL")).toBeVisible();
  });

  test("/import page runs import and shows results", async ({ page }) => {
    await page.goto(`${BASE}/import`);
    await page.fill("input[type=url]", "https://github.com/trpc/trpc");
    await page.click("button:has-text('Import')");

    // Wait for results
    await expect(page.locator("text=trpc/trpc")).toBeVisible({ timeout: 60_000 });
    await expect(page.locator("text=docs parsed")).toBeVisible({ timeout: 60_000 });
  });
});
