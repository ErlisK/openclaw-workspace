import { describe, it, expect } from "vitest";
import {
  createTask, completeTask, deleteTask, updateTaskText, updateTaskPriority,
  promoteTask, demoteTask,
  getTodayTasks, getBacklogTasks, getActiveTasks, getFocusTasks, getCompletedTasks,
  canPromote,
} from "@/lib/tasks";
import type { Task } from "@/lib/types";

function mk(o: Partial<Task> = {}): Task {
  return {
    id: crypto.randomUUID(), text: "task", status: "active",
    priority: "medium", list: "backlog", createdAt: Date.now(), order: 0, ...o,
  };
}

// ─── createTask ───────────────────────────────────────────────────────────────
describe("createTask", () => {
  it("trims text and sets defaults", () => {
    const t = createTask("  hello  ", "high", "today", 2);
    expect(t.text).toBe("hello");
    expect(t.status).toBe("active");
    expect(t.priority).toBe("high");
    expect(t.list).toBe("today");
    expect(t.order).toBe(2);
  });
  it("defaults to backlog + medium priority", () => {
    const t = createTask("x");
    expect(t.list).toBe("backlog");
    expect(t.priority).toBe("medium");
  });
  it("generates unique ids", () => {
    expect(createTask("a").id).not.toBe(createTask("b").id);
  });
});

// ─── completeTask ─────────────────────────────────────────────────────────────
describe("completeTask", () => {
  it("marks active task completed", () => {
    const ts = [mk({ id: "t1" })];
    const res = completeTask(ts, "t1");
    expect(res[0].status).toBe("completed");
    expect(res[0].completedAt).toBeDefined();
  });
  it("is pure — does not mutate", () => {
    const ts = [mk({ id: "t1" })];
    const snap = JSON.stringify(ts);
    completeTask(ts, "t1");
    expect(JSON.stringify(ts)).toBe(snap);
  });
  it("no-ops on already-completed task", () => {
    const ts = [mk({ id: "t1", status: "completed", completedAt: 999 })];
    expect(completeTask(ts, "t1")[0].completedAt).toBe(999);
  });
});

// ─── deleteTask ───────────────────────────────────────────────────────────────
describe("deleteTask", () => {
  it("soft-deletes", () => {
    const ts = [mk({ id: "t1" })];
    const res = deleteTask(ts, "t1");
    expect(res[0].status).toBe("deleted");
    expect(res[0].deletedAt).toBeDefined();
  });
  it("is pure", () => {
    const ts = [mk()];
    const snap = JSON.stringify(ts);
    deleteTask(ts, ts[0].id);
    expect(JSON.stringify(ts)).toBe(snap);
  });
});

// ─── updateTaskText ───────────────────────────────────────────────────────────
describe("updateTaskText", () => {
  it("trims text", () => {
    const ts = [mk({ id: "t1", text: "old" })];
    expect(updateTaskText(ts, "t1", "  new  ")[0].text).toBe("new");
  });
});

// ─── updateTaskPriority ───────────────────────────────────────────────────────
describe("updateTaskPriority", () => {
  it("changes priority", () => {
    const ts = [mk({ id: "t1", priority: "low" })];
    expect(updateTaskPriority(ts, "t1", "high")[0].priority).toBe("high");
  });
});

// ─── promoteTask ──────────────────────────────────────────────────────────────
describe("promoteTask", () => {
  it("moves backlog task to today", () => {
    const ts = [mk({ id: "t1", list: "backlog" })];
    const res = promoteTask(ts, "t1");
    expect(res[0].list).toBe("today");
  });
  it("no-ops if already today", () => {
    const ts = [mk({ id: "t1", list: "today" })];
    const res = promoteTask(ts, "t1");
    expect(res[0].list).toBe("today");
  });
  it("is pure", () => {
    const ts = [mk({ id: "t1" })];
    const snap = JSON.stringify(ts);
    promoteTask(ts, "t1");
    expect(JSON.stringify(ts)).toBe(snap);
  });
});

// ─── demoteTask ───────────────────────────────────────────────────────────────
describe("demoteTask", () => {
  it("moves today task to backlog", () => {
    const ts = [mk({ id: "t1", list: "today" })];
    expect(demoteTask(ts, "t1")[0].list).toBe("backlog");
  });
  it("no-ops if already backlog", () => {
    const ts = [mk({ id: "t1", list: "backlog" })];
    expect(demoteTask(ts, "t1")[0].list).toBe("backlog");
  });
});

// ─── canPromote ───────────────────────────────────────────────────────────────
describe("canPromote", () => {
  it("true when today < 3", () => {
    const ts = [mk({ list: "today" }), mk({ list: "today" })];
    expect(canPromote(ts)).toBe(true);
  });
  it("false when today = 3", () => {
    const ts = [mk({ list: "today" }), mk({ list: "today" }), mk({ list: "today" })];
    expect(canPromote(ts)).toBe(false);
  });
  it("ignores completed today tasks", () => {
    const ts = [
      mk({ list: "today", status: "completed" }),
      mk({ list: "today", status: "completed" }),
      mk({ list: "today", status: "completed" }),
    ];
    expect(canPromote(ts)).toBe(true);
  });
});

// ─── Selectors ────────────────────────────────────────────────────────────────
describe("getTodayTasks", () => {
  it("returns only active today tasks sorted by priority", () => {
    const ts = [
      mk({ list: "today",   priority: "low",    order: 0 }),
      mk({ list: "today",   priority: "high",   order: 1 }),
      mk({ list: "backlog", priority: "high",   order: 2 }),
      mk({ list: "today",   status: "completed" }),
    ];
    const res = getTodayTasks(ts);
    expect(res).toHaveLength(2);
    expect(res[0].priority).toBe("high");
    expect(res[1].priority).toBe("low");
  });
});

describe("getBacklogTasks", () => {
  it("returns only active backlog tasks", () => {
    const ts = [
      mk({ list: "today" }),
      mk({ list: "backlog" }),
      mk({ list: "backlog", status: "deleted" }),
    ];
    expect(getBacklogTasks(ts)).toHaveLength(1);
  });
});

describe("getFocusTasks", () => {
  it("caps at 3", () => {
    const ts = Array.from({ length: 5 }, (_, i) => mk({ list: "today", order: i }));
    expect(getFocusTasks(ts)).toHaveLength(3);
  });
});

describe("getCompletedTasks", () => {
  it("returns newest first", () => {
    const ts = [
      mk({ status: "completed", completedAt: 1000 }),
      mk({ status: "completed", completedAt: 2000 }),
    ];
    const res = getCompletedTasks(ts);
    expect(res[0].completedAt).toBe(2000);
  });
});

describe("getActiveTasks", () => {
  it("returns all active regardless of list", () => {
    const ts = [
      mk({ list: "today" }),
      mk({ list: "backlog" }),
      mk({ status: "completed" }),
    ];
    expect(getActiveTasks(ts)).toHaveLength(2);
  });
});
