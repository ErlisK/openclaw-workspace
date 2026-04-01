import type { Task, Priority, TaskStatus } from "./types";

const STORAGE_KEY = "focusdo:tasks";

// ─── Persistence ──────────────────────────────────────────────────────────────

export function loadTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// ─── Factories ────────────────────────────────────────────────────────────────

export function createTask(
  text: string,
  priority: Priority = "medium",
  existingCount = 0
): Task {
  return {
    id: crypto.randomUUID(),
    text: text.trim(),
    status: "active",
    priority,
    createdAt: Date.now(),
    order: existingCount,
  };
}

// ─── Mutators (pure — return new array) ───────────────────────────────────────

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

export function updateTaskPriority(
  tasks: Task[],
  id: string,
  priority: Priority
): Task[] {
  return tasks.map((t) => (t.id === id ? { ...t, priority } : t));
}

export function reorderTasks(tasks: Task[], fromIdx: number, toIdx: number): Task[] {
  const active = tasks.filter((t) => t.status === "active");
  const [moved] = active.splice(fromIdx, 1);
  active.splice(toIdx, 0, moved);
  const reordered = active.map((t, i) => ({ ...t, order: i }));
  const rest = tasks.filter((t) => t.status !== "active");
  return [...reordered, ...rest];
}

// ─── Selectors ────────────────────────────────────────────────────────────────

export function getActiveTasks(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.status === "active")
    .sort((a, b) => {
      const pOrder = { high: 0, medium: 1, low: 2 };
      const pd = pOrder[a.priority] - pOrder[b.priority];
      return pd !== 0 ? pd : a.order - b.order;
    });
}

export function getFocusTasks(tasks: Task[]): Task[] {
  return getActiveTasks(tasks).slice(0, 3);
}

export function getCompletedTasks(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.status === "completed")
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
}
