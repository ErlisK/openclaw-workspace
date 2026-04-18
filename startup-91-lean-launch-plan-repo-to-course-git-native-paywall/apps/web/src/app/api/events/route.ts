import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { track } from '@/lib/analytics/server';
import { z } from 'zod';

/**
 * POST /api/events
 *
 * Client-to-server analytics bridge.
 * Called by trackClient() in lib/analytics/client.ts via fetch / sendBeacon.
 *
 * This endpoint:
 *   1. Validates the event payload
 *   2. Extracts the authenticated user (if any) from the Supabase session
 *   3. Hashes the IP address for anonymous event dedup
 *   4. Writes to Supabase `events` table via track()
 *   5. Optionally forwards to PostHog (handled inside track())
 *
 * Always returns 204 No Content on success.
 * Returns 400 on schema validation failure.
 *
 * Security:
 *   - user_id is taken from the server-side session — never from the request body
 *   - IP is hashed server-side — raw IPs never stored
 *   - event_name is validated against the allowed enum
 */

// Allowed event names — matches AnalyticsEventName type
const ALLOWED_EVENTS = [
  'onboarding_started',
  'onboarding_completed',
  'course_created',
  'course_published',
  'lesson_viewed',
  'quiz_attempted',
  'quiz_passed',
  'checkout_initiated',
  'checkout_completed',
  'entitlement_granted',
  'affiliate_link_clicked',
  'affiliate_conversion',
  'ai_quiz_generated',
  'ai_quiz_accepted',
  'ai_quiz_discarded',
  'sandbox_opened',
] as const;

const EventPayloadSchema = z.object({
  event_name: z.enum(ALLOWED_EVENTS),
  course_id: z.string().uuid().nullable().optional(),
  lesson_id: z.string().uuid().nullable().optional(),
  quiz_id: z.string().uuid().nullable().optional(),
  affiliate_id: z.string().uuid().nullable().optional(),
  session_id: z.string().max(128).nullable().optional(),
  properties: z.record(z.unknown()).optional().default({}),
});

export async function POST(req: Request): Promise<NextResponse> {
  // ─── 1. Parse and validate body ───────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400 }
    );
  }

  const parsed = EventPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid event payload', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { event_name, course_id, lesson_id, quiz_id, affiliate_id, session_id, properties } =
    parsed.data;

  // ─── 2. Extract user from session (server-side — never trust client body) ─
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ─── 3. Hash IP for anonymous dedup ────────────────────────────────────────
  const ipHash = await hashIp(req);

  // ─── 4. Write event (Supabase primary + optional PostHog) ─────────────────
  await track({
    eventName: event_name,
    userId: user?.id ?? null,
    courseId: course_id ?? null,
    lessonId: lesson_id ?? null,
    quizId: quiz_id ?? null,
    affiliateId: affiliate_id ?? null,
    sessionId: session_id ?? null,
    ipHash,
    properties: properties as Record<string, unknown>,
  });

  // 204 No Content — client doesn't need a response body
  return new NextResponse(null, { status: 204 });
}

// ─── IP Hashing ────────────────────────────────────────────────────────────

async function hashIp(req: Request): Promise<string | null> {
  try {
    // Vercel sets x-forwarded-for; fallback to x-real-ip
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      null;

    if (!ip) return null;

    // Daily salt prevents cross-day correlation while allowing same-day dedup
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const salt = process.env.IP_HASH_SALT ?? 'teachrepo-default-salt';
    const data = new TextEncoder().encode(`${ip}:${today}:${salt}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}
