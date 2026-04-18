import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Check if the current authenticated user is enrolled in a course.
 * Returns enrolled=true if:
 *   - The course is free (price_cents=0)
 *   - The user has an active enrollment (entitlement not revoked)
 */
export async function checkEntitlement(options: { courseId: string }): Promise<{
  enrolled: boolean;
  userId: string | null;
}> {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Check if course is free — free courses are always "enrolled"
  const serviceSupa = createServiceClient();
  const { data: course } = await serviceSupa
    .from('courses')
    .select('price_cents')
    .eq('id', options.courseId)
    .single();

  if (course?.price_cents === 0) {
    // Free course — everyone has access
    return { enrolled: true, userId: user?.id ?? null };
  }

  if (!user) return { enrolled: false, userId: null };

  // Check enrollment row (entitlement_revoked_at IS NULL = still active)
  const { data } = await serviceSupa
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', options.courseId)
    .is('entitlement_revoked_at', null)
    .maybeSingle();

  return { enrolled: !!data, userId: user.id };
}
