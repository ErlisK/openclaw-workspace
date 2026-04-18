import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * requireAuth — verify the user has a valid Supabase session.
 * Returns the authenticated user or throws (redirects/responds).
 *
 * Usage in Server Components:
 *   const user = await requireAuth();
 *
 * Usage in Route Handlers:
 *   const result = await requireAuthForRoute();
 *   if (result.error) return result.error;
 *   const { user } = result;
 */
export async function requireAuth(redirectTo = '/login') {
  const supabase = createServerClient();

  // ALWAYS use getUser() — not getSession() — to re-validate the JWT server-side
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect(redirectTo);
  }

  return user;
}

/**
 * requireAuthForRoute — for use in Route Handlers (returns Response, doesn't redirect).
 */
export async function requireAuthForRoute(): Promise<
  | { user: NonNullable<Awaited<ReturnType<typeof requireAuth>>>; error: null }
  | { user: null; error: NextResponse }
> {
  const supabase = createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      ),
    };
  }

  return { user, error: null };
}

/**
 * requireEnrollment — verify the user has active entitlement for a course.
 * Redirects to the course landing page if not enrolled.
 *
 * Security: RLS (is_enrolled function) enforces this at the DB level.
 * This function adds an explicit server-side check for defence-in-depth.
 *
 * Usage in Server Components (lesson pages):
 *   await requireEnrollment(courseId, courseSlug);
 */
export async function requireEnrollment(
  courseId: string,
  courseSlug: string
): Promise<void> {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/courses/${courseSlug}/learn`);
  }

  // RLS enforces is_enrolled(course_id) — no row returned if not enrolled
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id, entitlement_granted_at, entitlement_revoked_at')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .not('entitlement_granted_at', 'is', null)
    .is('entitlement_revoked_at', null)
    .maybeSingle();

  if (!enrollment) {
    // No active entitlement — redirect to course landing (purchase page)
    redirect(`/courses/${courseSlug}?gate=enrollment`);
  }
}

/**
 * requireEnrollmentForRoute — for Route Handlers.
 * Returns a typed result instead of redirecting.
 */
export async function requireEnrollmentForRoute(
  courseId: string
): Promise<
  | { enrolled: true; error: null }
  | { enrolled: false; error: NextResponse }
> {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      enrolled: false,
      error: NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      ),
    };
  }

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .not('entitlement_granted_at', 'is', null)
    .is('entitlement_revoked_at', null)
    .maybeSingle();

  if (!enrollment) {
    return {
      enrolled: false,
      error: NextResponse.json(
        { error: 'Forbidden', code: 'ENROLLMENT_REQUIRED' },
        { status: 403 }
      ),
    };
  }

  return { enrolled: true, error: null };
}
