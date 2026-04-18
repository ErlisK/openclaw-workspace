import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

const FreeEnrollSchema = z.object({
  courseId: z.string().uuid(),
});

/**
 * POST /api/enroll/free
 *
 * Creates an enrollment for a free course — no Stripe involved.
 * Idempotent: calling twice has no effect.
 */
export async function POST(req: NextRequest) {
  // 1. Parse + validate BEFORE auth (so bad input always → 400, not 401)
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = FreeEnrollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.errors },
      { status: 400 }
    );
  }

  // 2. Auth
  const supabase = createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { courseId } = parsed.data;
  const serviceSupa = createServiceClient();

  // Verify the course is actually free
  const { data: course } = await serviceSupa
    .from('courses')
    .select('id, slug, pricing_model, price_cents, published')
    .eq('id', courseId)
    .single();

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  if (!course.published) {
    return NextResponse.json({ error: 'Course not published' }, { status: 404 });
  }

  if (course.pricing_model !== 'free' && course.price_cents > 0) {
    return NextResponse.json(
      { error: 'This course requires payment — use POST /api/checkout' },
      { status: 400 }
    );
  }

  // Idempotent upsert — set entitlement_granted_at so is_enrolled() returns true via RLS
  const now = new Date().toISOString();
  await serviceSupa.from('enrollments').upsert(
    {
      user_id: user.id,
      course_id: courseId,
      purchase_id: null,
      entitlement_granted_at: now,
      enrolled_at: now,
    },
    { onConflict: 'user_id,course_id', ignoreDuplicates: true }
  );

  // Get first lesson
  const { data: firstLesson } = await serviceSupa
    .from('lessons')
    .select('slug')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true })
    .limit(1)
    .single();

  return NextResponse.json({
    enrolled: true,
    courseSlug: course.slug,
    firstLessonSlug: firstLesson?.slug ?? null,
  });
}
