/**
 * lib/seed.ts — Staging / local seed data
 *
 * Activated when NEXT_PUBLIC_SEED_DATA=true (see lib/env.ts).
 * Injects realistic demo tasks into localStorage so testers land on a
 * non-empty state that exercises all UI paths.
 *
 * Does NOT hit Supabase — works offline, no auth required.
 * Safe to call multiple times (idempotent via localStorage check).
 */

import { saveTasks } from "./tasks";
import type { Task, Priority, TaskList } from "./types";

// ── Seed task definitions ─────────────────────────────────────────────────────

interface SeedDef {
  text:     string;
  priority: Priority;
  list:     TaskList;
}

const SEED_TASKS: SeedDef[] = [
  // Today — show Today cap in action (3 tasks)
  { text: "Review pull requests",           priority: "high",   list: "today"   },
  { text: "Write daily standup update",     priority: "medium", list: "today"   },
  { text: "Fix the login redirect bug",     priority: "high",   list: "today"   },
  // Backlog — show Backlog list with priority variety
  { text: "Refactor authentication module", priority: "medium", list: "backlog" },
  { text: "Add unit tests for task store",  priority: "medium", list: "backlog" },
  { text: "Update README with setup steps", priority: "low",    list: "backlog" },
  { text: "Design new onboarding flow",     priority: "low",    list: "backlog" },
  { text: "Upgrade Node.js to v22",         priority: "low",    list: "backlog" },
];

// ── Inject ────────────────────────────────────────────────────────────────────

/**
 * Build seed tasks, persist to localStorage, and return the array.
 * Called once when the app loads with NEXT_PUBLIC_SEED_DATA=true
 * and localStorage is empty.
 */
export function injectSeedTasks(): Task[] {
  const now = Date.now();

  const tasks: Task[] = SEED_TASKS.map((def, i) => ({
    id:         `seed-${i}-${Math.random().toString(36).slice(2, 8)}`,
    text:       def.text,
    status:     "active" as const,
    priority:   def.priority,
    list:       def.list,
    order:      i * 10,
    createdAt:  now - (SEED_TASKS.length - i) * 60_000,  // staggered timestamps
    completedAt: undefined,
    deletedAt:   undefined,
  }));

  saveTasks(tasks);
  return tasks;
}

/**
 * Check if seed tasks are currently loaded in localStorage.
 */
export function hasSeedTasks(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("focusdo:tasks");
    if (!raw) return false;
    const tasks: Task[] = JSON.parse(raw);
    return tasks.some((t) => t.id.startsWith("seed-"));
  } catch {
    return false;
  }
}

/**
 * Clear seed tasks from localStorage (useful for manual testing reset).
 * Only removes tasks with id prefix "seed-"; user tasks are preserved.
 */
export function clearSeedTasks(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("focusdo:tasks");
    if (!raw) return;
    const tasks: Task[] = JSON.parse(raw);
    const kept = tasks.filter((t) => !t.id.startsWith("seed-"));
    localStorage.setItem("focusdo:tasks", JSON.stringify(kept));
  } catch {}
}
