import type { Task, Priority, TaskList, TaskStatus } from "./types";

const STORAGE_KEY = "focusdo:tasks";

// ─── Persistence ──────────────────────────────────────────────────────────────

export function loadTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Task[];
    // Migration: old tasks without `list` default to "backlog"
    return raw.map((t) => ({ ...t, list: t.list ?? ("backlog" as TaskList) }));
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createTask(
  text:     string,
  priority: Priority  = "medium",
  list:     TaskList  = "backlog",
  order:    number    = 0
): Task {
  return {
    id:        crypto.randomUUID(),
    text:      text.trim(),
    status:    "active",
    priority,
    list,
    createdAt: Date.now(),
    order,
  };
}

// ─── Pure Mutators ────────────────────────────────────────────────────────────

export function completeTask(tasks: Task[], id: string): Task[] {
  return tasks.map((t) =>
    t.id === id && t.status === "active"
      ? { ...t, status: "completed" as TaskStatus, completedAt: Date.now() }
      : t
  );
}

export function deleteTask(tasks: Task[], id: string): Task[] {
  return tasks.map((t) =>
    t.id === id
      ? { ...t, status: "deleted" as TaskStatus, deletedAt: Date.now() }
      : t
  );
}

export function updateTaskText(tasks: Task[], id: string, text: string): Task[] {
  return tasks.map((t) => (t.id === id ? { ...t, text: text.trim() } : t));
}

export function updateTaskPriority(tasks: Task[], id: string, priority: Priority): Task[] {
  return tasks.map((t) => (t.id === id ? { ...t, priority } : t));
}

/** Promote task to "today" list (caller must check cap first). */
export function promoteTask(tasks: Task[], id: string): Task[] {
  const todayCount = tasks.filter(
    (t) => t.list === "today" && t.status === "active"
  ).length;
  return tasks.map((t) =>
    t.id === id && t.list === "backlog"
      ? { ...t, list: "today" as TaskList, order: todayCount }
      : t
  );
}

/** Demote task back to "backlog". */
export function demoteTask(tasks: Task[], id: string): Task[] {
  const backlogCount = tasks.filter(
    (t) => t.list === "backlog" && t.status === "active"
  ).length;
  return tasks.map((t) =>
    t.id === id && t.list === "today"
      ? { ...t, list: "backlog" as TaskList, order: backlogCount }
      : t
  );
}

// ─── Selectors ────────────────────────────────────────────────────────────────

const P_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

function byPriorityThenOrder(a: Task, b: Task) {
  const p = P_RANK[a.priority] - P_RANK[b.priority];
  return p !== 0 ? p : a.order - b.order;
}

export function getTodayTasks(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.list === "today" && t.status === "active")
    .sort(byPriorityThenOrder);
}

export function getBacklogTasks(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.list === "backlog" && t.status === "active")
    .sort(byPriorityThenOrder);
}

/** Alias kept for focus mode (same as getTodayTasks) */
export function getActiveTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.status === "active").sort(byPriorityThenOrder);
}

export function getFocusTasks(tasks: Task[]): Task[] {
  return getTodayTasks(tasks).slice(0, 3);
}

export function getCompletedTasks(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.status === "completed")
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
}

export function canPromote(tasks: Task[]): boolean {
  return getTodayTasks(tasks).length < 3;
}
