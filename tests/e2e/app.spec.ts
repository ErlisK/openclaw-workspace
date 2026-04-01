/**
 * Playwright E2E smoke tests
 * Tests the critical path: load app → add task → complete task
 *
 * Usage:
 *   SMOKE_BASE_URL=https://focusdo-mvp.vercel.app npx playwright test
 *   SMOKE_BASE_URL=http://localhost:3000 npx playwright test
 */

import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.SMOKE_BASE_URL ?? "https://focusdo-mvp.vercel.app";

test.describe("FocusDo — E2E Smoke Suite", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Clear localStorage between tests
    await page.evaluate(() => {
      localStorage.removeItem("focusdo:tasks");
      localStorage.removeItem("focusdo:events");
    });
    await page.reload();
  });

  // ── US-01: App loads ───────────────────────────────────────────────────────
  test("app loads with correct title and empty state", async ({ page }) => {
    await expect(page).toHaveTitle(/FocusDo/);
    await expect(page.getByText("FocusDo")).toBeVisible();
    await expect(page.getByText("New task")).toBeVisible();
  });

  // ── US-01: Add task via keyboard ──────────────────────────────────────────
  test("H1/H2 critical path: add and complete task via keyboard", async ({ page }) => {
    const start = Date.now();

    // Press N to open input
    await page.keyboard.press("n");
    const input = page.locator("input[placeholder*='What needs doing']");
    await expect(input).toBeFocused();

    // Type task and submit
    await input.fill("Smoke test task");
    await page.keyboard.press("Enter");

    // Task should appear
    await expect(page.getByText("Smoke test task")).toBeVisible();

    // Navigate to task and complete it
    await page.keyboard.press("j");
    await page.keyboard.press(" ");

    // Task should move to completed
    await expect(page.getByText("Smoke test task")).not.toBeVisible();

    const elapsed = Date.now() - start;
    console.log(`H1 capture-to-completion: ${elapsed}ms (target: < 60 000ms)`);
    // Note: this is a bot — H1 < 60s is easy for automation
    expect(elapsed).toBeLessThan(60_000);
  });

  // ── US-07: Focus Mode ─────────────────────────────────────────────────────
  test("Focus Mode shows max 3 tasks", async ({ page }) => {
    // Add 5 tasks
    for (let i = 1; i <= 5; i++) {
      await page.keyboard.press("n");
      await page.locator("input[placeholder*='What needs doing']").fill(`Task ${i}`);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(50);
    }

    // Toggle Focus Mode
    await page.keyboard.press("f");
    await expect(page.getByText("FOCUS")).toBeVisible();

    // Should show exactly 3 tasks
    const taskItems = page.locator('[class*="rounded-lg"]').filter({ hasText: /Task [1-5]/ });
    await expect(taskItems).toHaveCount(3);

    // Toggle off
    await page.keyboard.press("f");
    await expect(page.getByText("FOCUS")).not.toBeVisible();
  });

  // ── US-03: Keyboard navigation ────────────────────────────────────────────
  test("keyboard navigation selects tasks", async ({ page }) => {
    // Add two tasks
    await page.keyboard.press("n");
    await page.locator("input[placeholder*='What needs doing']").fill("Task Alpha");
    await page.keyboard.press("Enter");

    await page.keyboard.press("n");
    await page.locator("input[placeholder*='What needs doing']").fill("Task Beta");
    await page.keyboard.press("Enter");

    // Navigate
    await page.keyboard.press("j"); // select first
    await page.keyboard.press("j"); // move to second

    // Second task should be highlighted
    const betaRow = page.locator('[class*="border-emerald"]').filter({ hasText: "Task Beta" });
    await expect(betaRow).toBeVisible();
  });

  // ── US-05: Delete task ────────────────────────────────────────────────────
  test("delete task via keyboard", async ({ page }) => {
    await page.keyboard.press("n");
    await page.locator("input[placeholder*='What needs doing']").fill("Delete me");
    await page.keyboard.press("Enter");

    await expect(page.getByText("Delete me")).toBeVisible();

    await page.keyboard.press("j");
    await page.keyboard.press("d");

    await expect(page.getByText("Delete me")).not.toBeVisible();
  });

  // ── US-09: Persistence ────────────────────────────────────────────────────
  test("tasks survive page reload", async ({ page }) => {
    await page.keyboard.press("n");
    await page.locator("input[placeholder*='What needs doing']").fill("Persistent task");
    await page.keyboard.press("Enter");

    await expect(page.getByText("Persistent task")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Persistent task")).toBeVisible();
  });

  // ── US-10: Hypothesis Dashboard ───────────────────────────────────────────
  test("dashboard opens and shows hypothesis metrics", async ({ page }) => {
    await page.click('button[title*="dashboard"]');
    await expect(page.getByText("MVP Hypothesis Dashboard")).toBeVisible();
    await expect(page.getByText("H1")).toBeVisible();
    await expect(page.getByText("H2")).toBeVisible();
    await expect(page.getByText("H3")).toBeVisible();

    // Close with click-outside
    await page.keyboard.press("Escape");
  });

  // ── Help modal ────────────────────────────────────────────────────────────
  test("help modal shows keyboard shortcuts", async ({ page }) => {
    await page.keyboard.press("?");
    await expect(page.getByText("Keyboard Shortcuts")).toBeVisible();
    await expect(page.getByText("New task")).toBeVisible();
    await expect(page.getByText("Toggle Focus Mode")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByText("Keyboard Shortcuts")).not.toBeVisible();
  });

  // ── Security: no JS errors on load ───────────────────────────────────────
  test("no console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Filter known non-issues
    const realErrors = errors.filter(
      (e) =>
        !e.includes("Sentry") &&
        !e.includes("posthog") &&
        !e.includes("404") // missing icons expected at MVP
    );

    expect(realErrors).toHaveLength(0);
  });
});
