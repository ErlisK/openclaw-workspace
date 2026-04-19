import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getCreatorPlan } from '@/lib/subscription/server';
import { PLANS, planHasFeature, type CreatorPlan } from '@/lib/subscription/plans';

/**
 * Check if the current authenticated user is enrolled in a course (buyer entitlement).
 */
export async function checkEntitlement(options: { courseId: string }): Promise<{
  enrolled: boolean;
  userId: string | null;
}> {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const serviceSupa = createServiceClient();
  const { data: course } = await serviceSupa
    .from('courses')
    .select('price_cents')
    .eq('id', options.courseId)
    .single();

  if (course?.price_cents === 0) {
    return { enrolled: true, userId: user?.id ?? null };
  }

  if (!user) return { enrolled: false, userId: null };

  const { data } = await serviceSupa
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', options.courseId)
    .is('entitlement_revoked_at', null)
    .maybeSingle();

  return { enrolled: !!data, userId: user.id };
}

/**
 * Check if the authenticated user (as creator) has access to a plan feature.
 * Used to gate premium creator features (AI quiz, analytics, custom domain, etc.)
 */
export async function checkCreatorFeature(
  userId: string,
  feature: keyof typeof PLANS['free']['limits']
): Promise<{ allowed: boolean; plan: CreatorPlan; upgradeRequired: boolean }> {
  const plan = await getCreatorPlan(userId);
  const allowed = planHasFeature(plan, feature);
  return { allowed, plan, upgradeRequired: !allowed };
}

/**
 * Returns the creator's current plan — convenience wrapper.
 */
export { getCreatorPlan };
