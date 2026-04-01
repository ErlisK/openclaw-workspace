// @vitest-environment jsdom
/**
 * Unit tests — lib/env.ts (feature flags) + lib/seed.ts
 *
 * Runs under jsdom (localStorage available for seed tests).
 * Flag tests use vi.stubEnv for isolated env simulation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ── Feature Flags ─────────────────────────────────────────────────────────────

describe("getFeatureFlags()", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns safe defaults when no env vars are set", async () => {
    vi.stubEnv("NEXT_PUBLIC_FLAG_FOCUS_MODE_DEFAULT", "");
    vi.stubEnv("NEXT_PUBLIC_FLAG_TODAY_CAP", "");
    vi.stubEnv("NEXT_PUBLIC_FLAG_AUTH_ENABLED", "");
    vi.stubEnv("NEXT_PUBLIC_SEED_DATA", "");

    const { getFeatureFlags, _resetFlagCache } = await import("../../lib/env");
    _resetFlagCache();
    const flags = getFeatureFlags();

    expect(flags.focusModeDefault).toBe(false);
    expect(flags.todayCap).toBe(3);
    expect(flags.authEnabled).toBe(true);
    expect(flags.seedData).toBe(false);

    vi.unstubAllEnvs();
  });

  it("parses focusModeDefault=1 as true", async () => {
    vi.stubEnv("NEXT_PUBLIC_FLAG_FOCUS_MODE_DEFAULT", "1");
    const { getFeatureFlags, _resetFlagCache } = await import("../../lib/env");
    _resetFlagCache();
    expect(getFeatureFlags().focusModeDefault).toBe(true);
    vi.unstubAllEnvs();
  });

  it("parses focusModeDefault=true as true", async () => {
    vi.stubEnv("NEXT_PUBLIC_FLAG_FOCUS_MODE_DEFAULT", "true");
    const { getFeatureFlags, _resetFlagCache } = await import("../../lib/env");
    _resetFlagCache();
    expect(getFeatureFlags().focusModeDefault).toBe(true);
    vi.unstubAllEnvs();
  });

  it("parses focusModeDefault=0 as false", async () => {
    vi.stubEnv("NEXT_PUBLIC_FLAG_FOCUS_MODE_DEFAULT", "0");
    const { getFeatureFlags, _resetFlagCache } = await import("../../lib/env");
    _resetFlagCache();
    expect(getFeatureFlags().focusModeDefault).toBe(false);
    vi.unstubAllEnvs();
  });

  it("clamps todayCap to 1–10 range", async () => {
    vi.stubEnv("NEXT_PUBLIC_FLAG_TODAY_CAP", "0");
    const { getFeatureFlags, _resetFlagCache } = await import("../../lib/env");
    _resetFlagCache();
    expect(getFeatureFlags().todayCap).toBe(1);
    vi.unstubAllEnvs();
  });

  it("clamps todayCap > 10 to 10", async () => {
    vi.stubEnv("NEXT_PUBLIC_FLAG_TODAY_CAP", "99");
    const { getFeatureFlags, _resetFlagCache } = await import("../../lib/env");
    _resetFlagCache();
    expect(getFeatureFlags().todayCap).toBe(10);
    vi.unstubAllEnvs();
  });

  it("parses todayCap=5 correctly", async () => {
    vi.stubEnv("NEXT_PUBLIC_FLAG_TODAY_CAP", "5");
    const { getFeatureFlags, _resetFlagCache } = await import("../../lib/env");
    _resetFlagCache();
    expect(getFeatureFlags().todayCap).toBe(5);
    vi.unstubAllEnvs();
  });

  it("parses authEnabled=0 as false", async () => {
    vi.stubEnv("NEXT_PUBLIC_FLAG_AUTH_ENABLED", "0");
    const { getFeatureFlags, _resetFlagCache } = await import("../../lib/env");
    _resetFlagCache();
    expect(getFeatureFlags().authEnabled).toBe(false);
    vi.unstubAllEnvs();
  });

  it("parses seedData=true as true", async () => {
    vi.stubEnv("NEXT_PUBLIC_SEED_DATA", "true");
    const { getFeatureFlags, _resetFlagCache } = await import("../../lib/env");
    _resetFlagCache();
    expect(getFeatureFlags().seedData).toBe(true);
    vi.unstubAllEnvs();
  });

  it("memoises flags on repeated calls", async () => {
    const { getFeatureFlags, _resetFlagCache } = await import("../../lib/env");
    _resetFlagCache();
    const a = getFeatureFlags();
    const b = getFeatureFlags();
    expect(a).toBe(b); // same object reference
  });

  it("_resetFlagCache() clears the cache", async () => {
    const { getFeatureFlags, _resetFlagCache } = await import("../../lib/env");
    _resetFlagCache();
    const a = getFeatureFlags();
    _resetFlagCache();
    const b = getFeatureFlags();
    expect(a).not.toBe(b); // different objects after reset
  });
});

// ── Seed Data ─────────────────────────────────────────────────────────────────

describe("lib/seed.ts", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("injectSeedTasks() returns non-empty array", async () => {
    const { injectSeedTasks } = await import("../../lib/seed");
    const tasks = injectSeedTasks();
    expect(tasks.length).toBeGreaterThan(0);
  });

  it("injectSeedTasks() writes to localStorage", async () => {
    const { injectSeedTasks } = await import("../../lib/seed");
    injectSeedTasks();
    const stored = localStorage.getItem("focusdo:tasks");
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
  });

  it("seed tasks have list field (today or backlog)", async () => {
    const { injectSeedTasks } = await import("../../lib/seed");
    const tasks = injectSeedTasks();
    for (const t of tasks) {
      expect(["today", "backlog"]).toContain(t.list);
    }
  });

  it("seed tasks have valid priority", async () => {
    const { injectSeedTasks } = await import("../../lib/seed");
    const tasks = injectSeedTasks();
    for (const t of tasks) {
      expect(["high", "medium", "low"]).toContain(t.priority);
    }
  });

  it("seed tasks are all status=active", async () => {
    const { injectSeedTasks } = await import("../../lib/seed");
    const tasks = injectSeedTasks();
    for (const t of tasks) {
      expect(t.status).toBe("active");
    }
  });

  it("today tasks are ≤3 (respects TODAY_CAP)", async () => {
    const { injectSeedTasks } = await import("../../lib/seed");
    const tasks = injectSeedTasks();
    const today = tasks.filter((t) => t.list === "today");
    expect(today.length).toBeLessThanOrEqual(3);
  });

  it("hasSeedTasks() returns true after inject", async () => {
    const { injectSeedTasks, hasSeedTasks } = await import("../../lib/seed");
    injectSeedTasks();
    expect(hasSeedTasks()).toBe(true);
  });

  it("hasSeedTasks() returns false on empty storage", async () => {
    const { hasSeedTasks } = await import("../../lib/seed");
    expect(hasSeedTasks()).toBe(false);
  });

  it("clearSeedTasks() removes seed tasks but not user tasks", async () => {
    const { injectSeedTasks, clearSeedTasks } = await import("../../lib/seed");
    // Inject seeds
    injectSeedTasks();
    // Add a fake user task alongside seed tasks
    const current = JSON.parse(localStorage.getItem("focusdo:tasks") ?? "[]");
    current.push({ id: "user-123", text: "My task", status: "active",
      priority: "low", list: "backlog", order: 999, createdAt: Date.now() });
    localStorage.setItem("focusdo:tasks", JSON.stringify(current));

    clearSeedTasks();

    const after = JSON.parse(localStorage.getItem("focusdo:tasks") ?? "[]");
    expect(after.some((t: { id: string }) => t.id === "user-123")).toBe(true);
    expect(after.every((t: { id: string }) => !t.id.startsWith("seed-"))).toBe(true);
  });
});
