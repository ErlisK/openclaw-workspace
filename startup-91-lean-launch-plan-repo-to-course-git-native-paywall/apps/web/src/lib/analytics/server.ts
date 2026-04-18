/**
 * TeachRepo Analytics — Server-Side Tracker
 *
 * Primary sink: Supabase `events` table (always written, server-side only)
 * Optional sink: PostHog REST API (graceful no-op if POSTHOG_KEY is absent)
 *
 * Usage in Route Handlers and Server Actions:
 *   import { track } from '@/lib/analytics/server';
 *
 *   await track({
 *     eventName: 'lesson_viewed',
 *     userId: user.id,
 *     courseId: course.id,
 *     lessonId: lesson.id,
 *     properties: { is_preview: lesson.is_preview },
 *   });
 *
 * Design:
 *   - Never throws — analytics failures are logged but never crash the request
 *   - Writes to Supabase via service client (bypasses RLS — events are server-authored)
 *   - PostHog is fire-and-forget (awaited for correctness but errors are swallowed)
 */

import { createServiceClient } from '@/lib/supabase/service';
import type { AnalyticsEventName } from '@teachrepo/types';

export interface TrackOptions {
  eventName: AnalyticsEventName;
  userId?: string | null;      // null for anonymous events
  courseId?: string | null;
  lessonId?: string | null;
  quizId?: string | null;
  affiliateId?: string | null;
  sessionId?: string | null;
  ipHash?: string | null;
  properties?: Record<string, unknown>;
}

/**
 * Track an analytics event.
 *
 * Writes to Supabase `events` table (primary, always).
 * Optionally forwards to PostHog if POSTHOG_KEY is set.
 *
 * Safe to call from any server context — never throws.
 */
export async function track(opts: TrackOptions): Promise<void> {
  const {
    eventName,
    userId = null,
    courseId = null,
    lessonId = null,
    quizId = null,
    affiliateId = null,
    sessionId = null,
    ipHash = null,
    properties = {},
  } = opts;

  // ─── 1. Write to Supabase events table ────────────────────────────────────
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from('events').insert({
      event_name: eventName,
      user_id: userId,
      course_id: courseId,
      lesson_id: lessonId,
      quiz_id: quizId,
      affiliate_id: affiliateId,
      session_id: sessionId,
      ip_hash: ipHash,
      properties,
    });

    if (error) {
      console.error('[analytics/server] Supabase insert failed:', error.message);
    }
  } catch (err) {
    console.error('[analytics/server] Supabase error:', err);
  }

  // ─── 2. Optional PostHog forwarding ────────────────────────────────────────
  const posthogKey = process.env.POSTHOG_KEY;
  const posthogHost = process.env.POSTHOG_HOST ?? 'https://app.posthog.com';

  if (posthogKey && userId) {
    // PostHog requires a distinct_id — skip anonymous events
    try {
      await forwardToPostHog({
        apiKey: posthogKey,
        host: posthogHost,
        distinctId: userId,
        eventName,
        properties: {
          ...properties,
          course_id: courseId,
          lesson_id: lessonId,
          quiz_id: quizId,
          affiliate_id: affiliateId,
          $session_id: sessionId,
        },
      });
    } catch (err) {
      // PostHog is optional — never let it crash the request
      console.warn('[analytics/server] PostHog forward failed (graceful no-op):', err);
    }
  }
}

// ─── PostHog REST API ──────────────────────────────────────────────────────

interface PostHogCapturePayload {
  apiKey: string;
  host: string;
  distinctId: string;
  eventName: string;
  properties: Record<string, unknown>;
}

async function forwardToPostHog({
  apiKey,
  host,
  distinctId,
  eventName,
  properties,
}: PostHogCapturePayload): Promise<void> {
  const url = `${host.replace(/\/$/, '')}/capture/`;

  const payload = {
    api_key: apiKey,
    event: eventName,
    distinct_id: distinctId,
    properties: {
      ...properties,
      $lib: 'teachrepo-server',
    },
    timestamp: new Date().toISOString(),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    // Short timeout — PostHog is best-effort
    signal: AbortSignal.timeout(3000),
  });

  if (!res.ok) {
    throw new Error(`PostHog API returned ${res.status}`);
  }
}

// ─── Convenience wrappers for common events ───────────────────────────────

/** Track a lesson view server-side (called from the lesson Server Component) */
export async function trackLessonViewed(opts: {
  userId: string | null;
  courseId: string;
  lessonId: string;
  isPreview: boolean;
  sessionId?: string;
}) {
  return track({
    eventName: 'lesson_viewed',
    userId: opts.userId,
    courseId: opts.courseId,
    lessonId: opts.lessonId,
    sessionId: opts.sessionId,
    properties: {
      is_preview: opts.isPreview,
    },
  });
}

/** Track checkout initiated (called from the checkout Route Handler) */
export async function trackCheckoutInitiated(opts: {
  userId: string;
  courseId: string;
  priceCents: number;
  currency: string;
  stripeSessionId: string;
  affiliateRef?: string | null;
}) {
  return track({
    eventName: 'checkout_initiated',
    userId: opts.userId,
    courseId: opts.courseId,
    properties: {
      price_cents: opts.priceCents,
      currency: opts.currency,
      stripe_session_id: opts.stripeSessionId,
      affiliate_ref: opts.affiliateRef ?? null,
    },
  });
}

/** Track checkout completed (called from the Stripe webhook handler) */
export async function trackCheckoutCompleted(opts: {
  userId: string;
  courseId: string;
  amountCents: number;
  currency: string;
  stripeSessionId: string;
  affiliateId?: string | null;
}) {
  return track({
    eventName: 'checkout_completed',
    userId: opts.userId,
    courseId: opts.courseId,
    affiliateId: opts.affiliateId,
    properties: {
      amount_cents: opts.amountCents,
      currency: opts.currency,
      stripe_session_id: opts.stripeSessionId,
    },
  });
}

/** Track entitlement granted (called from the Stripe webhook handler) */
export async function trackEntitlementGranted(opts: {
  userId: string;
  courseId: string;
  stripeSessionId: string;
  latencyMs: number;
}) {
  return track({
    eventName: 'entitlement_granted',
    userId: opts.userId,
    courseId: opts.courseId,
    properties: {
      stripe_session_id: opts.stripeSessionId,
      latency_ms: opts.latencyMs,
      method: 'webhook',
    },
  });
}

/** Track quiz attempted (called from quiz submission Route Handler) */
export async function trackQuizAttempted(opts: {
  userId: string;
  courseId: string;
  lessonId: string;
  quizId: string;
  scorePct: number;
  passed: boolean;
  attemptNumber: number;
  aiGenerated: boolean;
}) {
  return track({
    eventName: 'quiz_attempted',
    userId: opts.userId,
    courseId: opts.courseId,
    lessonId: opts.lessonId,
    quizId: opts.quizId,
    properties: {
      score_pct: opts.scorePct,
      passed: opts.passed,
      attempt_number: opts.attemptNumber,
      quiz_source: opts.aiGenerated ? 'ai_generated' : 'manual',
    },
  });
}
