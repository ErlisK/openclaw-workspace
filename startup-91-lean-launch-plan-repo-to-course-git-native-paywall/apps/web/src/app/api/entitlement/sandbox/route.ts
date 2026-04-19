/**
 * GET /api/entitlement/sandbox?courseId=<uuid>&lessonId=<uuid>
 *
 * Returns the sandbox URL for a lesson ONLY if the current user is enrolled
 * (or the course is free, or the lesson is a preview).
 *
 * This endpoint enables client-side sandbox loading without exposing the real
 * URL in server-rendered HTML for unenrolled users.
 *
 * Response (enrolled):
 *   { enrolled: true, url: "https://stackblitz.com/...", provider: "stackblitz" }
 *
 * Response (not enrolled / no sandbox):
 *   { enrolled: false, url: null, checkoutUrl: "/courses/slug#enroll" }
 *
 * Used by: creator previews, client-side sandbox components
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkEntitlement } from '@/lib/entitlement/check';
import { createServiceClient } from '@/lib/supabase/service';

function inferProvider(url: string): string {
  if (url.includes('stackblitz.com')) return 'stackblitz';
  if (url.includes('codesandbox.io')) return 'codesandbox';
  if (url.includes('codepen.io')) return 'codepen';
  return 'generic';
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('courseId');
  const lessonId = searchParams.get('lessonId');

  if (!courseId || !lessonId) {
    return NextResponse.json(
      { error: 'courseId and lessonId are required' },
      { status: 400 },
    );
  }

  const supa = createServiceClient();

  // Fetch lesson
  const { data: lesson } = await supa
    .from('lessons')
    .select('id, slug, sandbox_url, has_sandbox, is_preview, course_id')
    .eq('id', lessonId)
    .eq('course_id', courseId)
    .single();

  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }

  // Free lessons / previews always get the sandbox
  if (lesson.is_preview) {
    return NextResponse.json({
      enrolled: true,
      url: lesson.sandbox_url ?? null,
      provider: lesson.sandbox_url ? inferProvider(lesson.sandbox_url) : null,
      isPreview: true,
    });
  }

  // Check enrollment
  const { enrolled } = await checkEntitlement({ courseId });

  if (!enrolled) {
    // Fetch course slug for CTA
    const { data: course } = await supa
      .from('courses')
      .select('slug, price_cents, currency')
      .eq('id', courseId)
      .single();

    return NextResponse.json({
      enrolled: false,
      url: null,
      provider: null,
      checkoutUrl: course ? `/courses/${course.slug}#enroll` : null,
      priceDisplay: course
        ? course.price_cents === 0
          ? 'Free'
          : `$${(course.price_cents / 100).toFixed(0)} ${(course.currency ?? 'usd').toUpperCase()}`
        : null,
    });
  }

  return NextResponse.json({
    enrolled: true,
    url: lesson.sandbox_url ?? null,
    provider: lesson.sandbox_url ? inferProvider(lesson.sandbox_url) : null,
  });
}
