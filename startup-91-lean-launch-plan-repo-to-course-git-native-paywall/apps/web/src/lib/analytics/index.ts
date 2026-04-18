/**
 * Analytics module barrel export.
 *
 * Server-side (Route Handlers, Server Components, Server Actions):
 *   import { track, trackLessonViewed, trackCheckoutCompleted } from '@/lib/analytics/server';
 *
 * Client-side (Client Components):
 *   import { trackClient } from '@/lib/analytics/client';
 *
 * React hook (Client Components):
 *   import { useAnalytics } from '@/hooks/useAnalytics';
 */

// Server-side exports (no 'use client' — safe for server imports)
export {
  track,
  trackLessonViewed,
  trackCheckoutInitiated,
  trackCheckoutCompleted,
  trackEntitlementGranted,
  trackQuizAttempted,
} from './server';
export type { TrackOptions } from './server';
