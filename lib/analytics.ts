/**
 * Analytics — PostHog primary, Supabase events table secondary, localStorage fallback
 *
 * Priority order:
 *  1. PostHog (configured via NEXT_PUBLIC_POSTHOG_KEY)
 *  2. Supabase events table (if user is authenticated)
 *  3. localStorage ring-buffer (always — offline resilience + H1/H2/H3 local dashboard)
 *
 * Event names (canonical):
 *   session_started, task_created, task_completed, task_deleted,
 *   focus_mode_toggled, keyboard_shortcut_used, error_caught
 */

import type { AppEvent, EventName } from "./types";

// ─── Session ID ───────────────────────────────────────────────────────────────

const SESSION_KEY = "focusdo:session_id";
const EVENT_BUFFER_KEY = "focusdo:events";
const MAX_BUFFER = 500;

export function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

// ─── Local Ring Buffer ────────────────────────────────────────────────────────

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
  localStorage.setItem(EVENT_BUFFER_KEY, JSON.stringify(events.slice(-MAX_BUFFER)));
}

// ─── PostHog ──────────────────────────────────────────────────────────────────

let _posthog: typeof import("posthog-js").default | null = null;

async function getPostHog() {
  if (_posthog) return _posthog;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || typeof window === "undefined") return null;
  try {
    const { default: posthog } = await import("posthog-js");
    if (!posthog.__loaded) {
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",
        capture_pageview: false,  // we fire session_started manually
        capture_pageleave: true,
        persistence: "localStorage+cookie",
        autocapture: false,       // keyboard-first UX — manual events only
        disable_session_recording: true,  // Phase 2: enable with consent
      });
    }
    _posthog = posthog;
    return posthog;
  } catch {
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Track an event across all destinations.
 * ts and session_id are auto-filled.
 */
export async function track<E extends AppEvent>(
  partial: Omit<E, "ts" | "session_id">
): Promise<void> {
  const event = {
    ...partial,
    ts: Date.now(),
    session_id: getSessionId(),
  } as E;

  // 1. localStorage (always)
  const buffer = readBuffer();
  buffer.push(event);
  writeBuffer(buffer);

  // 2. PostHog (if configured)
  const ph = await getPostHog();
  if (ph) {
    const { event: name, ts: _, session_id: __, ...properties } = event as unknown as Record<string, unknown>;
    ph.capture(name as string, {
      ...properties,
      $session_id: getSessionId(),
    });
  }

  // 3. Supabase events table (Phase 2 — requires server-side route to avoid
  //    service-role exposure; stubbed here for documentation)
  //
  // if (isSupabaseConfigured && userId) {
  //   await supabase.from("events").insert({
  //     session_id: getSessionId(),
  //     event: event.event,
  //     ts: new Date(event.ts).toISOString(),
  //     user_id: userId,
  //     properties: event as unknown as Json,
  //   });
  // }

  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", event.event, event);
  }
}

/** Identify user in PostHog after sign-in */
export async function identify(userId: string, traits?: Record<string, unknown>) {
  const ph = await getPostHog();
  if (ph) ph.identify(userId, traits);
}

/** Reset identity on sign-out */
export async function resetIdentity() {
  const ph = await getPostHog();
  if (ph) ph.reset();
}

// ─── Stats (local dashboard) ──────────────────────────────────────────────────

export function getStats() {
  const events = readBuffer();

  const completions = events.filter(
    (e): e is Extract<AppEvent, { event: "task_completed" }> =>
      e.event === "task_completed"
  );
  const creations  = events.filter((e) => e.event === "task_created");
  const kbCompletions = completions.filter((e) => e.input_method === "keyboard");
  const errors     = events.filter((e) => e.event === "error_caught");
  const shortcuts  = events.filter((e) => e.event === "keyboard_shortcut_used");

  const medianMs = (() => {
    const times = completions.map((e) => e.time_to_complete_ms).sort((a, b) => a - b);
    if (!times.length) return null;
    const mid = Math.floor(times.length / 2);
    return times.length % 2 ? times[mid] : (times[mid - 1] + times[mid]) / 2;
  })();

  const errorRate = events.length > 0 ? (errors.length / events.length) * 100 : 0;
  const kbPct = completions.length > 0
    ? (kbCompletions.length / completions.length) * 100
    : null;

  return {
    // H1
    medianCompletionMs: medianMs,
    medianCompletionSec: medianMs != null ? +(medianMs / 1000).toFixed(1) : null,
    h1Pass: medianMs != null ? medianMs < 60_000 : null,
    // H2
    totalCompletions: completions.length,
    kbCompletions: kbCompletions.length,
    kbCompletionPct: kbPct != null ? +kbPct.toFixed(1) : null,
    h2Pass: kbPct != null ? kbPct >= 70 : null,
    // H3
    totalEvents: events.length,
    errorCount: errors.length,
    errorRatePct: +errorRate.toFixed(3),
    h3Pass: errorRate < 1,
    // general
    totalCreations: creations.length,
    keyboardShortcutUses: shortcuts.length,
  };
}

export function getEvents() { return readBuffer(); }
export function clearEvents() {
  if (typeof window !== "undefined") localStorage.removeItem(EVENT_BUFFER_KEY);
}

// ─── Global error capture ─────────────────────────────────────────────────────

if (typeof window !== "undefined") {
  window.addEventListener("error", (e) => {
    track<Extract<AppEvent, { event: "error_caught" }>>({
      event: "error_caught",
      message: e.message,
      stack: (e.error as Error)?.stack,
    });
  });
  window.addEventListener("unhandledrejection", (e) => {
    track<Extract<AppEvent, { event: "error_caught" }>>({
      event: "error_caught",
      message: String(e.reason),
    });
  });
}
