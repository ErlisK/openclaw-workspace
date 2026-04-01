/**
 * Unit tests — pure functions in lib/tasks.ts
 * These have zero side effects, no browser API, no network.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createTask,
  completeTask,
  deleteTask,
  updateTaskText,
  updateTaskPriority,
  getActiveTasks,
  getFocusTasks,
  getCompletedTasks,
} from "@/lib/tasks";
import type { Task } from "@/lib/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: crypto.randomUUID(),
    text: "Test task",
    status: "active",
    priority: "medium",
    createdAt: Date.now(),
    order: 0,
    ...overrides,
  };
}

// ─── createTask ───────────────────────────────────────────────────────────────

describe("createTask", () => {
  it("creates an active task with trimmed text", () => {
    const t = createTask("  hello  ", "high", 0);
    expect(t.text).toBe("hello");
    expect(t.status).toBe("active");
    expect(t.priority).toBe("high");
  });

  it("assigns order from existingCount", () => {
    const t = createTask("task", "medium", 5);
    expect(t.order).toBe(5);
  });

  it("generates a unique id", () => {
    const a = createTask("a");
    const b = createTask("b");
    expect(a.id).not.toBe(b.id);
  });

  it("defaults priority to medium", () => {
    const t = createTask("task");
    expect(t.priority).toBe("medium");
  });

  it("sets createdAt to roughly now", () => {
    const before = Date.now();
    const t = createTask("task");
    const after = Date.now();
    expect(t.createdAt).toBeGreaterThanOrEqual(before);
    expect(t.createdAt).toBeLessThanOrEqual(after);
  });
});

// ─── completeTask ─────────────────────────────────────────────────────────────

describe("completeTask", () => {
  it("sets status to completed and adds completedAt", () => {
    const tasks = [makeTask({ id: "t1" })];
    const result = completeTask(tasks, "t1");
    expect(result[0].status).toBe("completed");
    expect(result[0].completedAt).toBeDefined();
  });

  it("is pure — does not mutate original array", () => {
    const tasks = [makeTask({ id: "t1" })];
    const original = JSON.stringify(tasks);
    completeTask(tasks, "t1");
    expect(JSON.stringify(tasks)).toBe(original);
  });

  it("does not affect other tasks", () => {
    const tasks = [makeTask({ id: "t1" }), makeTask({ id: "t2" })];
    const result = completeTask(tasks, "t1");
    expect(result[1].status).toBe("active");
    expect(result[1].completedAt).toBeUndefined();
  });

  it("no-ops on already-completed task", () => {
    const tasks = [makeTask({ id: "t1", status: "completed", completedAt: 12345 })];
    const result = completeTask(tasks, "t1");
    expect(result[0].completedAt).toBe(12345); // unchanged
  });
});

// ─── deleteTask ───────────────────────────────────────────────────────────────

describe("deleteTask", () => {
  it("sets status to deleted and adds deletedAt", () => {
    const tasks = [makeTask({ id: "t1" })];
    const result = deleteTask(tasks, "t1");
    expect(result[0].status).toBe("deleted");
    expect(result[0].deletedAt).toBeDefined();
  });

  it("is pure", () => {
    const tasks = [makeTask({ id: "t1" })];
    const original = JSON.stringify(tasks);
    deleteTask(tasks, "t1");
    expect(JSON.stringify(tasks)).toBe(original);
  });
});

// ─── updateTaskText ───────────────────────────────────────────────────────────

describe("updateTaskText", () => {
  it("updates text and trims", () => {
    const tasks = [makeTask({ id: "t1", text: "old" })];
    const result = updateTaskText(tasks, "t1", "  new text  ");
    expect(result[0].text).toBe("new text");
  });

  it("does not mutate other fields", () => {
    const task = makeTask({ id: "t1", priority: "high" });
    const result = updateTaskText([task], "t1", "new");
    expect(result[0].priority).toBe("high");
  });
});

// ─── updateTaskPriority ───────────────────────────────────────────────────────

describe("updateTaskPriority", () => {
  it("updates priority", () => {
    const tasks = [makeTask({ id: "t1", priority: "low" })];
    const result = updateTaskPriority(tasks, "t1", "high");
    expect(result[0].priority).toBe("high");
  });
});

// ─── Selectors ───────────────────────────────────────────────────────────────

describe("getActiveTasks", () => {
  it("returns only active tasks", () => {
    const tasks = [
      makeTask({ status: "active" }),
      makeTask({ status: "completed" }),
      makeTask({ status: "deleted" }),
    ];
    expect(getActiveTasks(tasks)).toHaveLength(1);
  });

  it("sorts by priority: high → medium → low", () => {
    const tasks = [
      makeTask({ id: "low",  priority: "low",    order: 0 }),
      makeTask({ id: "high", priority: "high",   order: 1 }),
      makeTask({ id: "med",  priority: "medium",  order: 2 }),
    ];
    const result = getActiveTasks(tasks);
    expect(result.map((t) => t.id)).toEqual(["high", "med", "low"]);
  });

  it("returns empty array when all tasks are done/deleted", () => {
    const tasks = [
      makeTask({ status: "completed" }),
      makeTask({ status: "deleted" }),
    ];
    expect(getActiveTasks(tasks)).toHaveLength(0);
  });
});

describe("getFocusTasks", () => {
  it("returns at most 3 active tasks", () => {
    const tasks = Array.from({ length: 8 }, (_, i) =>
      makeTask({ order: i })
    );
    expect(getFocusTasks(tasks)).toHaveLength(3);
  });

  it("returns fewer than 3 when < 3 active exist", () => {
    const tasks = [makeTask(), makeTask()];
    expect(getFocusTasks(tasks)).toHaveLength(2);
  });

  it("returns high-priority tasks first", () => {
    const tasks = [
      makeTask({ id: "med", priority: "medium", order: 0 }),
      makeTask({ id: "lo",  priority: "low",    order: 1 }),
      makeTask({ id: "hi",  priority: "high",   order: 2 }),
      makeTask({ id: "hi2", priority: "high",   order: 3 }),
    ];
    const focus = getFocusTasks(tasks);
    expect(focus[0].id).toBe("hi");
    expect(focus[1].id).toBe("hi2");
    expect(focus[2].id).toBe("med");
  });
});

describe("getCompletedTasks", () => {
  it("returns only completed tasks, newest first", () => {
    const tasks = [
      makeTask({ status: "active" }),
      makeTask({ status: "completed", completedAt: 1000 }),
      makeTask({ status: "completed", completedAt: 2000 }),
      makeTask({ status: "deleted" }),
    ];
    const result = getCompletedTasks(tasks);
    expect(result).toHaveLength(2);
    expect(result[0].completedAt).toBe(2000); // newest first
    expect(result[1].completedAt).toBe(1000);
  });
});
