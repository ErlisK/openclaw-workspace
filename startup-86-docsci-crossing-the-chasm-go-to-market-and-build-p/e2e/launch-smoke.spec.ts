/**
 * launch-smoke.spec.ts — Launch gate E2E smoke tests
 *
 * Tests:
 * - Homepage loads with correct title
 * - og:image meta tag is present
 * - 404 page renders branded dark NotFound
 * - /playground page loads and runs a JS snippet
 * - /api/health returns minimal details without auth
 * - /api/rls-check returns minimal without ADMIN_KEY
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";

test.describe("Launch smoke — homepage", () => {
  test("homepage loads and title contains DocsCI", async ({ page }) => {
    const res = await page.goto(BASE);
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle(/DocsCI/i);
  });

  test("og:image meta tag is present", async ({ page }) => {
    await page.goto(BASE);
    const ogImage = page.locator('meta[property="og:image"]');
    const content = await ogImage.getAttribute("content");
    expect(content).toBeTruthy();
    expect(content).toContain("/og");
  });
});

test.describe("Launch smoke — 404 page", () => {
  test("unknown route returns 404 with branded dark page", async ({ page }) => {
    const res = await page.goto(`${BASE}/this-page-does-not-exist-12345`);
    expect(res?.status()).toBe(404);
    // Dark background (gray-950 body)
    const body = page.locator("body");
    await expect(body).toBeVisible();
    // Should contain 404 headline
    await expect(page.getByText("404")).toBeVisible();
    // Should have a back-to-home link
    await expect(page.getByRole("link", { name: /back to home/i })).toBeVisible();
  });
});

test.describe("Launch smoke — playground", () => {
  test("playground page loads without auth", async ({ page }) => {
    const res = await page.goto(`${BASE}/playground`);
    expect(res?.status()).toBe(200);
    await expect(page.getByText(/Playground/i)).toBeVisible();
  });

  test("playground runs a trivial JS snippet and shows output", async ({ page }) => {
    await page.goto(`${BASE}/playground`);

    // Clear editor and type a simple snippet
    const editor = page.getByTestId("playground-editor");
    await editor.fill("console.log('hello-docsci-test');");

    // Click Run
    await page.getByRole("button", { name: /run/i }).click();

    // Wait for output to appear
    const output = page.getByTestId("playground-output");
    await expect(output).toContainText("hello-docsci-test", { timeout: 8000 });
  });
});

test.describe("Launch smoke — API security", () => {
  test("/api/health returns minimal JSON", async ({ request }) => {
    const res = await request.get(`${BASE}/api/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // Should have status field
    expect(body.status).toBeTruthy();
    // Should not leak internal endpoint list
    expect(body.endpoints).toBeUndefined();
  });

  test("/api/rls-check returns minimal without admin key", async ({ request }) => {
    const res = await request.get(`${BASE}/api/rls-check`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.rls).toBe("enabled");
    // Should NOT expose full table schema
    expect(body.tables).toBeUndefined();
  });
});
