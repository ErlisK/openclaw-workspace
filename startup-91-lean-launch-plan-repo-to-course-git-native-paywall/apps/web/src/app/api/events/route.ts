import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

const VALID_EVENT_NAMES = [
  'signup_completed', 'login', 'logout',
  'onboarding_started',
  'repo_import_started', 'repo_import_completed',
  'course_created', 'course_published', 'course_unpublished',
  'checkout_started', 'checkout_initiated', 'checkout_completed',
  'entitlement_granted',
  'quiz_submitted', 'quiz_attempted',
  'ai_quiz_generated',
  'lesson_viewed', 'sandbox_viewed', 'sandbox_opened',
  'affiliate_link_clicked',
] as const;

const EventSchema = z.object({
  event_name: z.enum(VALID_EVENT_NAMES),
  course_id: z.string().uuid().optional().nullable(),
  lesson_id: z.string().uuid().optional().nullable(),
  quiz_id: z.string().uuid().optional().nullable(),
  session_id: z.string().optional().nullable(),
  properties: z.record(z.unknown()).default({}),
});

// Events that are safe for anonymous/unauthenticated callers
const ANONYMOUS_ALLOWLIST = new Set(['lesson_viewed', 'page_view', 'sandbox_viewed']);

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = EventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.errors }, { status: 400 });
  }

  const { event_name, course_id, lesson_id, properties } = parsed.data;

  // Get user from session (server-side — never from request body)
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

  // Require auth for high-value events
  if (!user && !ANONYMOUS_ALLOWLIST.has(event_name)) {
    return NextResponse.json({ error: 'Authentication required for this event' }, { status: 401 });
  }

  // Write to Supabase events table
  const serviceSupa = createServiceClient();
  const { error: insertError } = await serviceSupa.from('events').insert({
    event_name,
    user_id: user?.id ?? null,
    course_id: course_id ?? null,
    lesson_id: lesson_id ?? null,
    properties: { ...properties, session_id: parsed.data.session_id ?? null },
  });

  if (insertError) {
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
