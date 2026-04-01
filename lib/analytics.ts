/**
 * Analytics module — lightweight in-browser event bus.
 *
 * Events are:
 *  1. Stored in localStorage (ring buffer, max 500 events) for offline resilience
 *  2. Logged to console in development
 *  3. Ready to be flushed to any analytics backend (PostHog, Amplitude, custom)
 *
 * The event schema is the source of truth in lib/types.ts.
 */

import type { AppEvent, EventName } from "./types";

const SESSION_ID_KEY = "focusdo:session_id";
const EVENT_BUFFER_KEY = "focusdo:events";
const MAX_BUFFER_SIZE = 500;

// ─── Session ID ───────────────────────────────────────────────────────────────

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = sessionStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

// ─── Buffer ───────────────────────────────────────────────────────────────────

function readBuffer(): AppEvent[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(EVENT_BUFFER_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeBuffer(events: AppEvent[]): void {
  if (typeof window === "undefined") return;
  const trimmed = events.slice(-MAX_BUFFER_SIZE);
  localStorage.setItem(EVENT_BUFFER_KEY, JSON.stringify(trimmed));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Track an event. Partial — ts and session_id are auto-filled.
 */
export function track<E extends AppEvent>(
  partial: Omit<E, "ts" | "session_id">
): void {
  const event = {
    ...partial,
    ts: Date.now(),
    session_id: getSessionId(),
  } as E;

  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", event.event, event);
  }

  const buffer = readBuffer();
  buffer.push(event);
  writeBuffer(buffer);

  // TODO Phase 2: flush to analytics backend
  // flushToBackend(event);
}

/**
 * Read all buffered events (for dashboards / export).
 */
export function getEvents(): AppEvent[] {
  return readBuffer();
}

/**
 * Get aggregated stats — used by the built-in dashboard.
 */
export function getStats() {
  const events = readBuffer();

  const completions = events.filter(
    (e): e is Extract<AppEvent, { event: "task_completed" }> =>
      e.event === "task_completed"
  );

  const creations = events.filter((e) => e.event === "task_created");

  const kbCompletions = completions.filter(
    (e) => e.input_method === "keyboard"
  );

  const medianMs = (() => {
    const times = completions
      .map((e) => e.time_to_complete_ms)
      .sort((a, b) => a - b);
    if (!times.length) return null;
    const mid = Math.floor(times.length / 2);
    return times.length % 2
      ? times[mid]
      : (times[mid - 1] + times[mid]) / 2;
  })();

  const kbShortcutEvents = events.filter(
    (e) => e.event === "keyboard_shortcut_used"
  );

  const errors = events.filter((e) => e.event === "error_caught");

  const errorRate =
    events.length > 0 ? (errors.length / events.length) * 100 : 0;

  return {
    // H1 metric
    medianCompletionMs: medianMs,
    medianCompletionSec: medianMs != null ? medianMs / 1000 : null,
    h1Pass: medianMs != null && medianMs < 60_000,

    // H2 metric
    totalCompletions: completions.length,
    kbCompletions: kbCompletions.length,
    kbCompletionPct:
      completions.length > 0
        ? (kbCompletions.length / completions.length) * 100
        : null,
    h2Pass:
      completions.length > 0
        ? kbCompletions.length / completions.length >= 0.7
        : null,

    // H3 metric
    totalEvents: events.length,
    errorCount: errors.length,
    errorRatePct: errorRate,
    h3Pass: errorRate < 1,

    // general
    totalCreations: creations.length,
    keyboardShortcutUses: kbShortcutEvents.length,
  };
}

/**
 * Clear event buffer (for testing / reset).
 */
export function clearEvents(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(EVENT_BUFFER_KEY);
  }
}

// ─── Global Error Capture ─────────────────────────────────────────────────────

if (typeof window !== "undefined") {
  window.addEventListener("error", (e) => {
    track({
      event: "error_caught",
      message: e.message,
      stack: e.error?.stack,
    } as Omit<Extract<AppEvent, { event: "error_caught" }>, "ts" | "session_id">);
  });

  window.addEventListener("unhandledrejection", (e) => {
    track({
      event: "error_caught",
      message: String(e.reason),
    } as Omit<Extract<AppEvent, { event: "error_caught" }>, "ts" | "session_id">);
  });
}
