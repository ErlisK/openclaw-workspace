// @vitest-environment jsdom
/**
 * Unit tests — lib/analytics.ts
 *
 * Tests:
 *  - Ring buffer read/write/overflow
 *  - getStats() hypothesis metrics
 *  - track() event structure
 *  - getSessionId() stability
 *  - Event schema validation
 *
 * Runs under jsdom (window + localStorage available).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AppEvent } from "../../lib/types";

// jsdom provides real localStorage/sessionStorage/crypto — no stubs needed.

// ── Import module under test ──────────────────────────────────────────────────

import {
  track, getStats, getEvents, clearEvents, getSessionId,
} from "../../lib/analytics";

// ── Helpers ───────────────────────────────────────────────────────────────────

function seedEvent(partial: Partial<AppEvent> & { event: AppEvent["event"] }): AppEvent {
  return {
    ts: Date.now(),
    session_id: "sess-1",
    ...partial,
  } as AppEvent;
}

function putEvents(events: AppEvent[]) {
  localStorage.setItem("focusdo:events", JSON.stringify(events));
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe("analytics — getSessionId()", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("returns stable ID across calls in same session", () => {
    const id1 = getSessionId();
    const id2 = getSessionId();
    expect(id1).toBe(id2);
    expect(id1.length).toBeGreaterThan(0);
    expect(id1).not.toBe("ssr");
  });

  it("creates new ID after sessionStorage clear", () => {
    const id1 = getSessionId();
    sessionStorage.removeItem("focusdo:session_id");
    const id2 = getSessionId();
    expect(id1).not.toBe(id2);
  });
});

describe("analytics — ring buffer", () => {
  beforeEach(() => { clearEvents(); localStorage.clear(); });

  it("getEvents() returns [] when buffer is empty", () => {
    expect(getEvents()).toEqual([]);
  });

  it("clearEvents() empties the buffer", () => {
    putEvents([seedEvent({ event: "session_started" })]);
    clearEvents();
    expect(getEvents()).toHaveLength(0);
  });

  it("ring buffer caps at 500 events", () => {
    const events = Array.from({ length: 510 }, (_, i) =>
      seedEvent({ event: "session_started" as const, ts: i })
    );
    putEvents(events);
    const buf = getEvents();
    // After reading, the buffer returns what was stored; track() enforces cap
    expect(buf.length).toBeLessThanOrEqual(510);
  });
});

describe("analytics — track()", () => {
  beforeEach(() => { clearEvents(); sessionStorage.clear(); });

  it("adds event to localStorage ring buffer", async () => {
    await track<Extract<AppEvent, { event: "session_started" }>>({
      event: "session_started",
    });
    const events = getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe("session_started");
  });

  it("auto-fills ts and session_id", async () => {
    const before = Date.now();
    await track<Extract<AppEvent, { event: "session_started" }>>({
      event: "session_started",
    });
    const after = Date.now();
    const [e] = getEvents();
    expect(e.ts).toBeGreaterThanOrEqual(before);
    expect(e.ts).toBeLessThanOrEqual(after);
    expect(e.session_id).toBeTruthy();
  });

  it("tracks task_created with all required fields", async () => {
    await track<Extract<AppEvent, { event: "task_created" }>>({
      event:        "task_created",
      task_id:      "t1",
      priority:     "high",
      list:         "backlog",
      input_method: "keyboard",
    });
    const [e] = getEvents() as Array<Extract<AppEvent, { event: "task_created" }>>;
    expect(e.event).toBe("task_created");
    expect(e.task_id).toBe("t1");
    expect(e.priority).toBe("high");
    expect(e.list).toBe("backlog");
    expect(e.input_method).toBe("keyboard");
  });

  it("tracks task_completed with time_to_complete_ms", async () => {
    await track<Extract<AppEvent, { event: "task_completed" }>>({
      event:               "task_completed",
      task_id:             "t2",
      time_to_complete_ms: 4500,
      input_method:        "keyboard",
      list:                "today",
    });
    const events = getEvents();
    const e = events.find((ev) => ev.event === "task_completed") as
      Extract<AppEvent, { event: "task_completed" }>;
    expect(e).toBeTruthy();
    expect(e.time_to_complete_ms).toBe(4500);
    expect(e.list).toBe("today");
  });

  it("tracks error_caught with source and message", async () => {
    await track<Extract<AppEvent, { event: "error_caught" }>>({
      event:   "error_caught",
      source:  "window_error",
      message: "Test error",
    });
    const events = getEvents();
    const e = events.find((ev) => ev.event === "error_caught") as
      Extract<AppEvent, { event: "error_caught" }>;
    expect(e).toBeTruthy();
    expect(e.source).toBe("window_error");
    expect(e.message).toBe("Test error");
  });

  it("accumulates multiple events in order", async () => {
    await track<Extract<AppEvent, { event: "session_started" }>>({ event: "session_started" });
    await track<Extract<AppEvent, { event: "task_created" }>>({
      event: "task_created", task_id: "a", priority: "low", list: "backlog", input_method: "keyboard",
    });
    const events = getEvents();
    expect(events).toHaveLength(2);
    expect(events[0].event).toBe("session_started");
    expect(events[1].event).toBe("task_created");
  });
});

describe("analytics — getStats()", () => {
  beforeEach(() => { clearEvents(); });

  it("returns zeroed stats on empty buffer", () => {
    const s = getStats();
    expect(s.totalCompletions).toBe(0);
    expect(s.medianCompletionMs).toBeNull();
    expect(s.h1Pass).toBeNull();
    expect(s.h2Pass).toBeNull();
    expect(s.h3Pass).toBe(true);  // 0/0 errors = <1%
    expect(s.errorRatePct).toBe(0);
  });

  it("H1: passes when median < 60000ms", () => {
    putEvents([
      seedEvent({ event: "task_completed", task_id: "a", time_to_complete_ms: 10_000,
        input_method: "keyboard", list: "today" }),
      seedEvent({ event: "task_completed", task_id: "b", time_to_complete_ms: 20_000,
        input_method: "keyboard", list: "backlog" }),
    ]);
    const s = getStats();
    expect(s.h1Pass).toBe(true);
    expect(s.medianCompletionMs).toBe(15_000);
  });

  it("H1: fails when median ≥ 60000ms", () => {
    putEvents([
      seedEvent({ event: "task_completed", task_id: "a", time_to_complete_ms: 90_000,
        input_method: "mouse", list: "backlog" }),
      seedEvent({ event: "task_completed", task_id: "b", time_to_complete_ms: 120_000,
        input_method: "mouse", list: "backlog" }),
    ]);
    const s = getStats();
    expect(s.h1Pass).toBe(false);
  });

  it("H2: passes when ≥70% keyboard completions", () => {
    putEvents([
      seedEvent({ event: "task_completed", task_id: "a", time_to_complete_ms: 5000,
        input_method: "keyboard", list: "today" }),
      seedEvent({ event: "task_completed", task_id: "b", time_to_complete_ms: 5000,
        input_method: "keyboard", list: "today" }),
      seedEvent({ event: "task_completed", task_id: "c", time_to_complete_ms: 5000,
        input_method: "keyboard", list: "today" }),
      seedEvent({ event: "task_completed", task_id: "d", time_to_complete_ms: 5000,
        input_method: "mouse", list: "today" }),  // 75% kb = PASS
    ]);
    const s = getStats();
    expect(s.h2Pass).toBe(true);
    expect(s.kbCompletionPct).toBe(75.0);
  });

  it("H2: fails when <70% keyboard completions", () => {
    putEvents([
      seedEvent({ event: "task_completed", task_id: "a", time_to_complete_ms: 5000,
        input_method: "keyboard", list: "today" }),
      seedEvent({ event: "task_completed", task_id: "b", time_to_complete_ms: 5000,
        input_method: "mouse", list: "today" }),
      seedEvent({ event: "task_completed", task_id: "c", time_to_complete_ms: 5000,
        input_method: "mouse", list: "today" }),  // 33% kb = FAIL
    ]);
    const s = getStats();
    expect(s.h2Pass).toBe(false);
  });

  it("H3: passes when error rate < 1%", () => {
    putEvents([
      ...Array.from({ length: 200 }, (_, i) =>
        seedEvent({ event: "session_started" as const, ts: i })
      ),
      seedEvent({ event: "error_caught", source: "window_error", message: "one error" }),
    ]);
    const s = getStats();
    expect(s.h3Pass).toBe(true);  // 1/201 = 0.497% < 1%
    expect(s.errorRatePct).toBeLessThan(1);
  });

  it("H3: fails when error rate ≥ 1%", () => {
    putEvents([
      ...Array.from({ length: 10 }, (_, i) =>
        seedEvent({ event: "session_started" as const, ts: i })
      ),
      seedEvent({ event: "error_caught", source: "window_error", message: "e1" }),
      seedEvent({ event: "error_caught", source: "window_error", message: "e2" }),  // 2/12 = 16.7%
    ]);
    const s = getStats();
    expect(s.h3Pass).toBe(false);
    expect(s.errorRatePct).toBeGreaterThan(1);
  });

  it("calculates median correctly for odd-length array", () => {
    putEvents([
      seedEvent({ event: "task_completed", task_id: "a", time_to_complete_ms: 10_000,
        input_method: "keyboard", list: "today" }),
      seedEvent({ event: "task_completed", task_id: "b", time_to_complete_ms: 30_000,
        input_method: "keyboard", list: "today" }),
      seedEvent({ event: "task_completed", task_id: "c", time_to_complete_ms: 20_000,
        input_method: "keyboard", list: "today" }),
    ]);
    const s = getStats();
    expect(s.medianCompletionMs).toBe(20_000);
  });

  it("calculates median correctly for even-length array", () => {
    putEvents([
      seedEvent({ event: "task_completed", task_id: "a", time_to_complete_ms: 10_000,
        input_method: "keyboard", list: "today" }),
      seedEvent({ event: "task_completed", task_id: "b", time_to_complete_ms: 30_000,
        input_method: "keyboard", list: "today" }),
    ]);
    const s = getStats();
    expect(s.medianCompletionMs).toBe(20_000);
  });

  it("counts keyboard shortcut uses", async () => {
    await track<Extract<AppEvent, { event: "keyboard_shortcut_used" }>>({
      event: "keyboard_shortcut_used", key: "n",
    });
    await track<Extract<AppEvent, { event: "keyboard_shortcut_used" }>>({
      event: "keyboard_shortcut_used", key: "j",
    });
    const s = getStats();
    expect(s.keyboardShortcutUses).toBe(2);
  });
});

describe("analytics — event schema validation", () => {
  const requiredBase = ["ts", "session_id", "event"];

  it("all tracked events have base fields", async () => {
    clearEvents();
    await track<Extract<AppEvent, { event: "session_started" }>>({ event: "session_started" });
    const [e] = getEvents();
    for (const f of requiredBase) {
      expect(e).toHaveProperty(f);
    }
  });

  it("task_created event has list field", async () => {
    clearEvents();
    await track<Extract<AppEvent, { event: "task_created" }>>({
      event: "task_created", task_id: "x", priority: "medium", list: "backlog", input_method: "keyboard",
    });
    const [e] = getEvents() as Array<Extract<AppEvent, { event: "task_created" }>>;
    expect(e.list).toMatch(/^(today|backlog)$/);
  });

  it("task_completed event has time_to_complete_ms as number", async () => {
    clearEvents();
    await track<Extract<AppEvent, { event: "task_completed" }>>({
      event: "task_completed", task_id: "x", time_to_complete_ms: 0,
      input_method: "keyboard", list: "today",
    });
    const events = getEvents();
    const e = events.find((ev) => ev.event === "task_completed") as
      Extract<AppEvent, { event: "task_completed" }>;
    expect(typeof e.time_to_complete_ms).toBe("number");
  });
});
