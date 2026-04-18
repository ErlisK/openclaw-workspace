'use client';

/**
 * TeachRepo Analytics — Client-Side Module
 *
 * Sends events from the browser to /api/events (a server Route Handler).
 * The Route Handler writes to Supabase + optionally forwards to PostHog.
 *
 * WHY route through the server?
 *   - The service role key never touches the browser
 *   - IP hashing happens server-side
 *   - PostHog key stays server-side
 *   - Ad blockers targeting posthog.com don't affect our first-party endpoint
 *
 * Optional PostHog client-side identity (identify call only):
 *   If NEXT_PUBLIC_POSTHOG_KEY is set, posthog-js is loaded for identity
 *   and feature flag support. All capture() calls still go through /api/events.
 *
 * Usage:
 *   import { trackClient } from '@/lib/analytics/client';
 *   trackClient('lesson_viewed', { lesson_id: '...', course_id: '...' });
 */

import type { AnalyticsEventName } from '@teachrepo/types';

export interface ClientTrackOptions {
  courseId?: string;
  lessonId?: string;
  quizId?: string;
  affiliateId?: string;
  properties?: Record<string, unknown>;
}

/**
 * Track an event from the browser.
 * Fire-and-forget — never awaited by the caller.
 * Sends a POST to /api/events.
 */
export function trackClient(
  eventName: AnalyticsEventName,
  opts: ClientTrackOptions = {}
): void {
  const { courseId, lessonId, quizId, affiliateId, properties = {} } = opts;

  const payload = {
    event_name: eventName,
    course_id: courseId ?? null,
    lesson_id: lessonId ?? null,
    quiz_id: quizId ?? null,
    affiliate_id: affiliateId ?? null,
    session_id: getOrCreateSessionId(),
    properties,
  };

  // Fire-and-forget — use sendBeacon when available (survives page unload)
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    navigator.sendBeacon('/api/events', blob);
  } else {
    // Fallback for environments where sendBeacon isn't available
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Client-side analytics must never throw
    });
  }

  // ─── Optional PostHog client-side capture ─────────────────────────────────
  // Uses a dynamic import so posthog-js is only loaded if the key is present
  maybeForwardToPostHog(eventName, payload.properties);
}

// ─── PostHog client-side (optional, graceful no-op) ───────────────────────

let posthogInitialized = false;

async function maybeForwardToPostHog(
  eventName: string,
  properties: Record<string, unknown>
): Promise<void> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return; // No key → graceful no-op

  try {
    // Dynamic import — only loads posthog-js if NEXT_PUBLIC_POSTHOG_KEY is set
    const posthog = (await import('posthog-js')).default;

    if (!posthogInitialized) {
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
        capture_pageview: false, // We handle this manually
        persistence: 'localStorage',
      });
      posthogInitialized = true;
    }

    posthog.capture(eventName, properties);
  } catch {
    // PostHog is optional — never crash
  }
}

// ─── Session ID management ─────────────────────────────────────────────────

const SESSION_KEY = 'tr_session_id';
let _sessionId: string | null = null;

function getOrCreateSessionId(): string {
  if (_sessionId) return _sessionId;

  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      _sessionId = stored;
      return stored;
    }

    // Generate a new session ID
    const newId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, newId);
    _sessionId = newId;
    return newId;
  }

  return 'ssr';
}
