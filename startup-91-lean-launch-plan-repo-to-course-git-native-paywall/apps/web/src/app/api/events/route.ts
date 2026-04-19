import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

const VALID_EVENT_NAMES = [
  'signup_completed', 'login', 'logout',
  'repo_import_started', 'repo_import_completed',
  'course_published', 'course_unpublished',
  'checkout_started', 'checkout_completed',
  'quiz_submitted', 'lesson_viewed', 'sandbox_viewed',
] as const;

const EventSchema = z.object({
  event_name: z.enum(VALID_EVENT_NAMES),
  course_id: z.string().uuid().optional().nullable(),
  lesson_id: z.string().uuid().optional().nullable(),
  quiz_id: z.string().uuid().optional().nullable(),
  session_id: z.string().optional().nullable(),
  properties: z.record(z.unknown()).default({}),
});

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

  // Write to Supabase events table
  const serviceSupa = createServiceClient();
  await serviceSupa.from('events').insert({
    event_name,
    user_id: user?.id ?? null,
    course_id: course_id ?? null,
    lesson_id: lesson_id ?? null,
    properties: { ...properties, session_id: parsed.data.session_id ?? null },
  }).then(() => null, () => null); // Non-critical — swallow errors

  return new NextResponse(null, { status: 204 });
}
