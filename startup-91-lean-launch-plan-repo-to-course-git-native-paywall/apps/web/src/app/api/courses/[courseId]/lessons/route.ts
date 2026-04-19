/**
 * GET /api/courses/[courseId]/lessons
 *
 * Returns lesson list for a published course.
 * Unauthenticated requests only see free (is_preview=true) lessons.
 * Enrolled users (or course creators) see all lessons.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

interface RouteContext {
  params: { courseId: string };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { courseId } = params;

  if (!courseId || !/^[0-9a-f-]{36}$/.test(courseId)) {
    return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
  }

  const serviceSupa = createServiceClient();

  // Verify course exists and is published
  const { data: course } = await serviceSupa
    .from('courses')
    .select('id, creator_id, price_cents')
    .eq('id', courseId)
    .eq('published', true)
    .maybeSingle();

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  // Determine user access level
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

  let isEnrolled = false;
  let isCreator = false;

  if (user) {
    isCreator = course.creator_id === user.id;

    if (!isCreator && course.price_cents > 0) {
      const { data: enrollment } = await serviceSupa
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .is('entitlement_revoked_at', null)
        .maybeSingle();
      isEnrolled = !!enrollment;
    } else {
      // Free course — always enrolled
      isEnrolled = true;
    }
  } else if (course.price_cents === 0) {
    // Free course, unauthenticated
    isEnrolled = true;
  }

  const canSeeAll = isCreator || isEnrolled;

  // Fetch lessons
  let query = serviceSupa
    .from('lessons')
    .select('id, slug, title, description, order_index, is_preview, estimated_minutes, has_quiz')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });

  if (!canSeeAll) {
    query = query.eq('is_preview', true);
  }

  const { data: lessons, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = (lessons ?? []).map((l) => ({
    id: l.id,
    slug: l.slug,
    title: l.title,
    description: l.description ?? null,
    order: l.order_index,
    access: l.is_preview ? 'free' : 'paid',
    preview: l.is_preview,
    estimated_minutes: l.estimated_minutes ?? null,
    has_quiz: l.has_quiz ?? false,
  }));

  return NextResponse.json({ lessons: result, total: result.length });
}
