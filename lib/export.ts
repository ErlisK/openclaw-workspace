/**
 * lib/export.ts — client-side data export utilities
 *
 * Supported formats:
 *   - CSV  (tasks + analytics summary)
 *   - JSON (full data snapshot for portability)
 *
 * No server round-trip; everything comes from localStorage.
 * Files are downloaded via a temporary <a> element.
 */

import type { Task } from "@/lib/types";

// ── CSV ───────────────────────────────────────────────────────────────────────

const CSV_HEADERS = [
  "id",
  "text",
  "status",
  "priority",
  "list",
  "created_at",
  "completed_at",
  "order",
] as const;

function escapeCsv(value: string | number | undefined | null): string {
  if (value == null) return "";
  const str = String(value);
  // Wrap in quotes if contains comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toIsoOrEmpty(ms: number | undefined | null): string {
  if (!ms) return "";
  try { return new Date(ms).toISOString(); }
  catch { return ""; }
}

export function tasksToCSV(tasks: Task[]): string {
  const rows: string[] = [CSV_HEADERS.join(",")];
  for (const t of tasks) {
    rows.push([
      escapeCsv(t.id),
      escapeCsv(t.text),
      escapeCsv(t.status),
      escapeCsv(t.priority),
      escapeCsv(t.list),
      escapeCsv(toIsoOrEmpty(t.createdAt)),
      escapeCsv(toIsoOrEmpty(t.completedAt)),
      escapeCsv(t.order),
    ].join(","));
  }
  return rows.join("\n");
}

// ── JSON ─────────────────────────────────────────────────────────────────────

export interface ExportSnapshot {
  exportedAt:  string;   // ISO timestamp
  version:     string;   // app version
  taskCount:   number;
  tasks:       Task[];
  analytics: {
    totalEvents:    number;
    eventSummary:   Record<string, number>;
  };
}

export function buildSnapshot(tasks: Task[]): ExportSnapshot {
  let totalEvents = 0;
  const eventSummary: Record<string, number> = {};

  try {
    const raw = localStorage.getItem("focusdo:events");
    if (raw) {
      const events: Array<{ event: string }> = JSON.parse(raw);
      totalEvents = events.length;
      for (const e of events) {
        eventSummary[e.event] = (eventSummary[e.event] ?? 0) + 1;
      }
    }
  } catch { /* ignore */ }

  return {
    exportedAt:  new Date().toISOString(),
    version:     "0.1.1",
    taskCount:   tasks.length,
    tasks,
    analytics: { totalEvents, eventSummary },
  };
}

// ── Download helpers ─────────────────────────────────────────────────────────

function download(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function timestamp(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export function downloadCSV(tasks: Task[]): void {
  download(tasksToCSV(tasks), `focusdo-tasks-${timestamp()}.csv`, "text/csv;charset=utf-8;");
}

export function downloadJSON(tasks: Task[]): void {
  const snapshot = buildSnapshot(tasks);
  download(JSON.stringify(snapshot, null, 2), `focusdo-export-${timestamp()}.json`, "application/json");
}
