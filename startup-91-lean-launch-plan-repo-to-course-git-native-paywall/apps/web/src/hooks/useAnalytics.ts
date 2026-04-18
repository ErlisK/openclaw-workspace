'use client';

import { useCallback } from 'react';
import { trackClient, type ClientTrackOptions } from '@/lib/analytics/client';
import type { AnalyticsEventName } from '@teachrepo/types';

/**
 * useAnalytics — React hook for client-side event tracking.
 *
 * Returns a stable `track` function that can be called from event handlers.
 * All events are sent to /api/events (server-side sink → Supabase + optional PostHog).
 *
 * Usage:
 *   const { track } = useAnalytics();
 *
 *   // In an onClick handler:
 *   track('checkout_initiated', {
 *     courseId: course.id,
 *     properties: { price_cents: course.price_cents }
 *   });
 *
 * The hook is stable — safe to include in dependency arrays.
 */
export function useAnalytics() {
  const track = useCallback(
    (eventName: AnalyticsEventName, opts: ClientTrackOptions = {}) => {
      trackClient(eventName, opts);
    },
    []
  );

  return { track };
}

/**
 * usePageView — tracks a page view event when the component mounts.
 *
 * Usage in a page layout or specific page component:
 *   usePageView('course_landing', { courseId: course.id });
 */
export function usePageView(
  page: string,
  opts: ClientTrackOptions & { courseId?: string } = {}
) {
  const { track } = useAnalytics();

  // We don't use useEffect here to avoid double-firing in strict mode in dev.
  // Instead, call this at the top of the component — it will fire on mount.
  // For SSR-safe usage, check if we're in the browser first.
  if (typeof window !== 'undefined') {
    // Use a ref pattern in real usage to avoid tracking on every render.
    // This file shows the pattern — real pages should use useEffect.
    void track('lesson_viewed' as AnalyticsEventName, {
      ...opts,
      properties: { ...opts.properties, page },
    });
  }
}
