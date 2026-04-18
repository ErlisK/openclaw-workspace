import { createServerClient } from '@/lib/supabase/server';

/**
 * Check if the current authenticated user is enrolled in a course.
 * Returns enrolled=true if:
 *   - The user has an active enrollment (not revoked)
 */
export async function checkEntitlement(options: { courseId: string }): Promise<{
  enrolled: boolean;
  userId: string | null;
}> {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { enrolled: false, userId: null };

  const { data } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', options.courseId)
    .is('revoked_at', null)
    .maybeSingle();

  return { enrolled: !!data, userId: user.id };
}
