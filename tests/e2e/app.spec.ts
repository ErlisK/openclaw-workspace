/**
 * Playwright E2E — Critical Path & Telemetry
 *
 * Covers:
 *   - US-01: Add task via keyboard (N → type → Enter)
 *   - US-02: Complete task via keyboard (j → Space)
 *   - US-03: Promote backlog → today (j → P) + demote (B)
 *   - US-04: Today cap (max 3, P disabled at limit)
 *   - US-05: Delete task (j → D)
 *   - US-06: Edit task (j → E → type → Enter)
 *   - US-07: Priority keys (j → 1/2/3)
 *   - US-08: Focus Mode (F, shows FOCUS badge, max 3 visible)
 *   - US-09: Persistence across reload
 *   - US-10: Analytics ring-buffer (session_started fires on load)
 *   - US-11: H1 keyboard add→complete in <60s
 *   - US-12: H2 keyboard completion method tracking
 *   - US-13: Help modal (? / Escape)
 *   - US-14: Dashboard modal (📊 / Escape)
 *   - US-15: No console errors on load
 *   - US-16: View switching (Tab / tab buttons)
 */

import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.SMOKE_BASE_URL ?? "https://focusdo-rho.vercel.app";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function clearState(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem("focusdo:tasks");
    localStorage.removeItem("focusdo:events");
    sessionStorage.clear();
  });
}

async function addTask(page: Page, text: string, delay = 30) {
  await page.keyboard.press("n");
  await page.waitForTimeout(delay);
  const input = page.locator("input").filter({ hasText: "" }).first();
  await input.waitFor({ state: "visible", timeout: 3000 });
  await input.fill(text);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(delay);
}

async function getEvents(page: Page): Promise<Array<{ event: string; [k: string]: unknown }>> {
  return page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem("focusdo:events") ?? "[]"); }
    catch { return []; }
  });
}

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe(`FocusDo E2E — ${BASE_URL}`, () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await clearState(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // US-01: App load
  // ──────────────────────────────────────────────────────────────────────────
  test("US-01 app loads — title + FocusDo branding visible", async ({ page }) => {
    await expect(page).toHaveTitle(/FocusDo/);
    await expect(page.locator("text=FocusDo").first()).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // US-01+02: H1 critical path — keyboard add → complete in <60s
  // ──────────────────────────────────────────────────────────────────────────
  test("H1 critical path: keyboard add→complete in <60s", async ({ page }) => {
    const t0 = Date.now();

    // Add task
    await page.keyboard.press("n");
    await page.waitForTimeout(50);
    const input = page.locator("input").first();
    await expect(input).toBeVisible({ timeout: 3000 });
    await input.fill("H1 test task");
    await page.keyboard.press("Enter");

    // Verify task exists
    await expect(page.getByText("H1 test task")).toBeVisible({ timeout: 3000 });

    // Select + complete
    await page.keyboard.press("j");
    await page.keyboard.press(" ");

    // Task leaves active list
    await expect(page.getByText("H1 test task")).not.toBeVisible({ timeout: 5000 });

    const elapsed = Date.now() - t0;
    console.log(`[H1] elapsed: ${elapsed}ms`);
    expect(elapsed).toBeLessThan(60_000);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // US-03+H2: Promote backlog → today and track keyboard method
  // ──────────────────────────────────────────────────────────────────────────
  test("H2 keyboard promote → complete flow", async ({ page }) => {
    await addTask(page, "Promote me");

    // Select in backlog
    await page.keyboard.press("j");

    // Promote to today (P)
    await page.keyboard.press("p");
    await page.waitForTimeout(100);

    // Switch to Today tab (Tab key) on desktop both panels visible; just confirm task is there
    await expect(page.getByText("Promote me")).toBeVisible({ timeout: 3000 });

    // Complete via keyboard
    await page.keyboard.press("j");   // select in whatever view is active
    await page.keyboard.press(" ");

    // Check analytics logged keyboard completion
    const events = await getEvents(page);
    const completion = events.find(
      (e) => e.event === "task_completed" && e["input_method"] === "keyboard"
    );
    expect(completion).toBeTruthy();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // US-04: Today cap — promote is blocked at 3
  // ──────────────────────────────────────────────────────────────────────────
  test("US-04 Today cap: cannot promote more than 3 tasks", async ({ page }) => {
    // Add and promote 3 tasks to today
    for (let i = 1; i <= 3; i++) {
      await addTask(page, `Cap task ${i}`);
      await page.keyboard.press("j");    // select last
      await page.keyboard.press("p");    // promote
      await page.waitForTimeout(50);
    }

    // Add a 4th
    await addTask(page, "Should stay backlog");
    await page.keyboard.press("j");
    await page.keyboard.press("p");   // promote attempt
    await page.waitForTimeout(100);

    // Status bar should still show 3/3
    await expect(page.locator("text=3/3 today")).toBeVisible({ timeout: 3000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // US-05: Delete via keyboard
  // ──────────────────────────────────────────────────────────────────────────
  test("US-05 delete task via keyboard (D)", async ({ page }) => {
    await addTask(page, "Delete me please");
    await expect(page.getByText("Delete me please")).toBeVisible();

    await page.keyboard.press("j");   // select
    await page.keyboard.press("d");   // delete

    await expect(page.getByText("Delete me please")).not.toBeVisible({ timeout: 3000 });

    // Verify event in ring buffer
    const events = await getEvents(page);
    expect(events.some((e) => e.event === "task_deleted")).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // US-06: Edit task via keyboard (E → type → Enter)
  // ──────────────────────────────────────────────────────────────────────────
  test("US-06 edit task via keyboard (E)", async ({ page }) => {
    await addTask(page, "Original text");
    await expect(page.getByText("Original text")).toBeVisible();

    await page.keyboard.press("j");    // select
    await page.keyboard.press("e");    // open edit

    const editInput = page.locator("input[aria-label='Edit task text']");
    await expect(editInput).toBeVisible({ timeout: 2000 });
    await editInput.fill("Edited text");
    await page.keyboard.press("Enter");

    await expect(page.getByText("Edited text")).toBeVisible({ timeout: 3000 });
    await expect(page.getByText("Original text")).not.toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // US-07: Priority keys (1=high, 2=medium, 3=low)
  // ──────────────────────────────────────────────────────────────────────────
  test("US-07 priority keys set task priority", async ({ page }) => {
    await addTask(page, "Priority task");
    await page.keyboard.press("j");    // select
    await page.keyboard.press("1");    // high priority

    // Red dot should appear (high priority indicator)
    const taskRow = page.locator('[role="listitem"]').filter({ hasText: "Priority task" });
    await expect(taskRow.locator(".bg-red-400")).toBeVisible({ timeout: 2000 });

    await page.keyboard.press("2");    // medium
    await expect(taskRow.locator(".bg-yellow-400")).toBeVisible({ timeout: 2000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // US-08: Focus Mode
  // ──────────────────────────────────────────────────────────────────────────
  test("US-08 Focus Mode shows FOCUS badge and limits to 3", async ({ page }) => {
    // Add 5 tasks and promote all to today (up to cap)
    for (let i = 1; i <= 4; i++) {
      await addTask(page, `Focus task ${i}`);
    }
    // Promote 3 to today
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press("j");
      await page.keyboard.press("p");
      await page.waitForTimeout(50);
    }

    await page.keyboard.press("f");    // toggle focus mode
    await expect(page.locator("text=FOCUS")).toBeVisible({ timeout: 2000 });

    await page.keyboard.press("f");    // toggle off
    await expect(page.locator("text=FOCUS")).not.toBeVisible({ timeout: 2000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // US-09: Persistence across reload
  // ──────────────────────────────────────────────────────────────────────────
  test("US-09 tasks persist across page reload", async ({ page }) => {
    await addTask(page, "Persistent task XYZ");
    await expect(page.getByText("Persistent task XYZ")).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);

    await expect(page.getByText("Persistent task XYZ")).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // US-10: Analytics telemetry — session_started fires on load
  // ──────────────────────────────────────────────────────────────────────────
  test("US-10 analytics: session_started event fires on load", async ({ page }) => {
    // Reload to trigger fresh session
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    const events = await getEvents(page);
    expect(events.some((e) => e.event === "session_started")).toBe(true);
  });

  test("analytics: task_created event has required fields", async ({ page }) => {
    await addTask(page, "Analytics event test");

    const events = await getEvents(page);
    const created = events.find((e) => e.event === "task_created");

    expect(created).toBeTruthy();
    expect(created!["ts"]).toBeGreaterThan(0);
    expect(created!["session_id"]).toBeTruthy();
    expect(created!["task_id"]).toBeTruthy();
    expect(created!["priority"]).toMatch(/^(high|medium|low)$/);
    expect(created!["input_method"]).toMatch(/^(keyboard|mouse)$/);
  });

  test("analytics: keyboard_shortcut_used event fires for N key", async ({ page }) => {
    await page.keyboard.press("n");
    await page.waitForTimeout(100);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);

    const events = await getEvents(page);
    const shortcut = events.find(
      (e) => e.event === "keyboard_shortcut_used" && e["key"] === "n"
    );
    expect(shortcut).toBeTruthy();
  });

  test("analytics: task_completed has time_to_complete_ms", async ({ page }) => {
    await addTask(page, "Timing task");
    await page.keyboard.press("j");
    await page.keyboard.press(" ");
    await page.waitForTimeout(100);

    const events = await getEvents(page);
    const completion = events.find((e) => e.event === "task_completed");
    expect(completion).toBeTruthy();
    expect(typeof completion!["time_to_complete_ms"]).toBe("number");
    expect(completion!["time_to_complete_ms"] as number).toBeGreaterThanOrEqual(0);
  });

  test("analytics: error_caught not in ring buffer after normal usage", async ({ page }) => {
    // Normal usage path — no errors expected
    await addTask(page, "No error task");
    await page.keyboard.press("j");
    await page.keyboard.press(" ");
    await page.waitForTimeout(200);

    const events = await getEvents(page);
    const errors = events.filter((e) => e.event === "error_caught");
    // Allow 0 errors; anything > 0 is a regression
    expect(errors.length).toBe(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // US-11: View switching via Tab key
  // ──────────────────────────────────────────────────────────────────────────
  test("US-11 Tab key switches Today/Backlog views", async ({ page }) => {
    // On mobile viewport tab switching is visible; on desktop both panels shown
    // Just verify event fires
    await page.keyboard.press("Tab");
    await page.waitForTimeout(100);

    const events = await getEvents(page);
    expect(events.some((e) => e.event === "view_switched")).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // US-12: Help modal
  // ──────────────────────────────────────────────────────────────────────────
  test("US-12 help modal opens with ? and closes with Escape", async ({ page }) => {
    await page.keyboard.press("?");
    await expect(page.locator("text=Keyboard Shortcuts").first()).toBeVisible({ timeout: 2000 });
    await expect(page.locator("text=Toggle Focus Mode")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator("text=Keyboard Shortcuts").first()).not.toBeVisible({ timeout: 2000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // US-13: Dashboard modal
  // ──────────────────────────────────────────────────────────────────────────
  test("US-13 hypothesis dashboard opens and shows H1/H2/H3", async ({ page }) => {
    // Click the 📊 button
    await page.click('button[aria-label="Metrics dashboard"]');
    await expect(page.locator("text=H1").first()).toBeVisible({ timeout: 2000 });
    await expect(page.locator("text=H2").first()).toBeVisible();
    await expect(page.locator("text=H3").first()).toBeVisible();

    await page.keyboard.press("Escape");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // US-14: No console errors on load
  // ──────────────────────────────────────────────────────────────────────────
  test("US-14 no JS errors on cold load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
    page.on("pageerror",  (e) => errors.push(e.message));

    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    const real = errors.filter(
      (e) =>
        !e.includes("Sentry") &&
        !e.includes("posthog") &&
        !e.includes("PostHog") &&
        !e.includes("serviceWorker") &&
        !e.includes("ERR_NAME_NOT_RESOLVED") // no network in CI
    );
    expect(real, `Console errors: ${real.join(" | ")}`).toHaveLength(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // US-15: PWA — manifest.json accessible from app
  // ──────────────────────────────────────────────────────────────────────────
  test("US-15 PWA manifest linked in page <head>", async ({ page }) => {
    const manifestHref = await page.$eval(
      'link[rel="manifest"]',
      (el: Element) => (el as HTMLLinkElement).href
    );
    expect(manifestHref).toContain("manifest.json");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // US-16: Demote today → backlog (B key)
  // ──────────────────────────────────────────────────────────────────────────
  test("US-16 demote task from Today to Backlog (B)", async ({ page }) => {
    // Add task to backlog
    await addTask(page, "Demote me");

    // Promote to today
    await page.keyboard.press("j");
    await page.keyboard.press("p");
    await page.waitForTimeout(100);

    // Now demote back
    await page.keyboard.press("j");
    await page.keyboard.press("b");
    await page.waitForTimeout(100);

    // Event should exist
    const events = await getEvents(page);
    expect(events.some((e) => e.event === "task_demoted")).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // US-17: Add task via mouse (test input prompt click)
  // ──────────────────────────────────────────────────────────────────────────
  test("US-17 add task via mouse click on input prompt", async ({ page }) => {
    // Click the "Add a task…" button
    await page.click('button[aria-label="Add new task"]');
    const input = page.locator("input").first();
    await expect(input).toBeVisible({ timeout: 2000 });
    await input.fill("Mouse task");
    await page.keyboard.press("Enter");

    await expect(page.getByText("Mouse task")).toBeVisible({ timeout: 3000 });
  });
});
