import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveUser } from '@/lib/auth/resolve-user';
import { trackCoursePublished } from '@/lib/analytics/server';

/**
 * PATCH /api/courses/[courseId]/publish
 *
 * Toggle published state for a course owned by the authenticated creator.
 * Body: { published: boolean }
 *
 * Returns: { courseId, published, published_at }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { courseId: string } },
) {
  const user = await resolveUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { published?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body.published !== 'boolean') {
    return NextResponse.json({ error: '`published` must be a boolean' }, { status: 400 });
  }

  const serviceSupa = createServiceClient();

  // Verify course ownership before updating
  const { data: course } = await serviceSupa
    .from('courses')
    .select('id, creator_id, published')
    .eq('id', params.courseId)
    .single();

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  if (course.creator_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await serviceSupa
    .from('courses')
    .update({
      published: body.published,
      published_at: body.published ? now : null,
      updated_at: now,
    })
    .eq('id', params.courseId)
    .select('id, published, published_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Track publish event (only when publishing, not unpublishing)
  if (body.published) {
    await trackCoursePublished({ userId: user.id, courseId: params.courseId });
  }

  return NextResponse.json({
    courseId: params.courseId,
    published: updated.published,
    published_at: updated.published_at,
  });
}
