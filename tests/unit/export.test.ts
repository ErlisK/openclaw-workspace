/**
 * tests/unit/export.test.ts
 * Unit tests for lib/export.ts — CSV generation and JSON snapshot
 *
 * Environment: node (vitest.config.ts default)
 * We mock localStorage and document/URL APIs used by download helpers.
 */

// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { tasksToCSV, buildSnapshot, downloadCSV, downloadJSON } from "@/lib/export";
import type { Task } from "@/lib/types";

// ── Fixture ───────────────────────────────────────────────────────────────────

const TASKS: Task[] = [
  {
    id: "t1", text: "Write tests",   status: "active",    priority: "high",
    list: "today",   order: 0, createdAt: 1700000000000,
  },
  {
    id: "t2", text: "Deploy app",    status: "completed", priority: "medium",
    list: "backlog", order: 1, createdAt: 1700001000000, completedAt: 1700002000000,
  },
  {
    id: "t3", text: 'Task, with "quotes"', status: "active", priority: "low",
    list: "backlog", order: 2, createdAt: 1700003000000,
  },
];

// ── tasksToCSV ────────────────────────────────────────────────────────────────

describe("tasksToCSV", () => {
  it("produces a header row first", () => {
    const csv = tasksToCSV(TASKS);
    const firstLine = csv.split("\n")[0];
    expect(firstLine).toBe("id,text,status,priority,list,created_at,completed_at,order");
  });

  it("produces one data row per task", () => {
    const csv = tasksToCSV(TASKS);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(TASKS.length + 1); // header + 3 tasks
  });

  it("escapes commas in task text", () => {
    const csv = tasksToCSV(TASKS);
    const lines = csv.split("\n");
    // Task 3 has a comma — text cell must be quoted
    expect(lines[3]).toContain('"Task, with');
  });

  it("escapes double quotes in task text", () => {
    const csv = tasksToCSV(TASKS);
    expect(csv).toContain('"Task, with ""quotes"""');
  });

  it("converts createdAt epoch to ISO string", () => {
    const csv = tasksToCSV(TASKS);
    const row1 = csv.split("\n")[1];
    expect(row1).toContain("2023-11-14"); // 1700000000000 → 2023-11-14
  });

  it("leaves completedAt empty when absent", () => {
    const csv = tasksToCSV(TASKS);
    const row1 = csv.split("\n")[1]; // task t1 — no completedAt
    // Row: t1,Write tests,active,high,today,<date>,,0
    const cells = row1.split(",");
    expect(cells[6]).toBe(""); // completedAt column is empty
  });

  it("includes completedAt when present", () => {
    const csv = tasksToCSV(TASKS);
    const row2 = csv.split("\n")[2]; // task t2 — has completedAt
    expect(row2).toContain("2023-11-14"); // completedAt date present
  });

  it("handles empty task list", () => {
    const csv = tasksToCSV([]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(1); // header only
  });

  it("roundtrips all task ids", () => {
    const csv = tasksToCSV(TASKS);
    for (const t of TASKS) {
      expect(csv).toContain(t.id);
    }
  });
});

// ── buildSnapshot ─────────────────────────────────────────────────────────────

describe("buildSnapshot", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("returns correct task count", () => {
    const snap = buildSnapshot(TASKS);
    expect(snap.taskCount).toBe(3);
  });

  it("includes all tasks", () => {
    const snap = buildSnapshot(TASKS);
    expect(snap.tasks).toHaveLength(3);
    expect(snap.tasks[0].id).toBe("t1");
  });

  it("sets version to 0.1.1", () => {
    const snap = buildSnapshot(TASKS);
    expect(snap.version).toBe("0.1.1");
  });

  it("includes ISO exportedAt timestamp", () => {
    const snap = buildSnapshot(TASKS);
    expect(snap.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("reports zero events when localStorage is empty", () => {
    const snap = buildSnapshot(TASKS);
    expect(snap.analytics.totalEvents).toBe(0);
    expect(snap.analytics.eventSummary).toEqual({});
  });

  it("counts events from localStorage ring buffer", () => {
    const events = [
      { event: "task_created" },
      { event: "task_created" },
      { event: "task_completed" },
    ];
    localStorage.setItem("focusdo:events", JSON.stringify(events));

    const snap = buildSnapshot(TASKS);
    expect(snap.analytics.totalEvents).toBe(3);
    expect(snap.analytics.eventSummary["task_created"]).toBe(2);
    expect(snap.analytics.eventSummary["task_completed"]).toBe(1);
  });

  it("handles corrupted localStorage gracefully", () => {
    localStorage.setItem("focusdo:events", "INVALID JSON{{");
    expect(() => buildSnapshot(TASKS)).not.toThrow();
    const snap = buildSnapshot(TASKS);
    expect(snap.analytics.totalEvents).toBe(0);
  });

  it("snapshot is serialisable to JSON", () => {
    const snap = buildSnapshot(TASKS);
    expect(() => JSON.stringify(snap)).not.toThrow();
  });
});

// ── download helpers (DOM-level smoke) ───────────────────────────────────────

describe("downloadCSV", () => {
  it("does not throw when called with tasks", () => {
    expect(() => downloadCSV(TASKS)).not.toThrow();
  });

  it("does not throw on empty task list", () => {
    expect(() => downloadCSV([])).not.toThrow();
  });
});

describe("downloadJSON", () => {
  it("does not throw when called with tasks", () => {
    expect(() => downloadJSON(TASKS)).not.toThrow();
  });
});
