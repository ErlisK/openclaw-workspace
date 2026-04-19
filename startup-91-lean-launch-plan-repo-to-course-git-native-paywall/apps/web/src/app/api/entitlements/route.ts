/**
 * GET /api/entitlements
 *
 * Returns the complete entitlement matrix for the current authenticated user.
 * Used by UI components to show locked/unlocked state without multiple API calls.
 *
 * Response shape:
 * {
 *   authenticated: boolean,
 *   plan: 'free' | 'creator',
 *   planName: string,
 *   features: {
 *     [featureKey]: { allowed: boolean, limit?: number | null, upgradeUrl?: string }
 *   },
 *   limits: { maxCourses, maxLessonsPerCourse, aiQuizzesPerMonth, ... },
 *   subscription: { ... } | null,
 *   usageCounts: { courses: number, lessonsMax: number, aiQuizzesThisMonth: number }
 * }
 */
import { NextRequest, NextResponse } from 'next/server';
import { resolveUser } from '@/lib/auth/resolve-user';
import { getCreatorPlan } from '@/lib/subscription/server';
import { PLANS } from '@/lib/subscription/plans';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(req: NextRequest) {
  const user = await resolveUser(req);

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      plan: 'free',
      planName: PLANS['free'].name,
      features: buildFeatureMap('free'),
      limits: PLANS['free'].limits,
      subscription: null,
      usageCounts: null,
    });
  }

  const plan = await getCreatorPlan(user.id);
  const supa = createServiceClient();

  // Fetch subscription record
  const { data: sub } = await supa
    .from('subscriptions')
    .select('status, current_period_end, cancel_at_period_end, stripe_price_id')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Usage counts
  const { count: courseCount } = await supa
    .from('courses')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', user.id);

  // AI quizzes this month
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const { count: aiQuizzesThisMonth } = await supa
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('event_name', 'ai_quiz_generated')
    .gte('created_at', monthStart.toISOString());

  // Max lessons across courses
  const { data: lessonCounts } = await supa
    .from('lessons')
    .select('course_id')
    .in(
      'course_id',
      await supa
        .from('courses')
        .select('id')
        .eq('creator_id', user.id)
        .then((r) => (r.data ?? []).map((c: { id: string }) => c.id))
    );

  const lessonsByCourse: Record<string, number> = {};
  for (const l of lessonCounts ?? []) {
    lessonsByCourse[l.course_id] = (lessonsByCourse[l.course_id] ?? 0) + 1;
  }
  const maxLessonsInAnyCourse = Math.max(0, ...Object.values(lessonsByCourse));

  const planLimits = PLANS[plan].limits;

  return NextResponse.json({
    authenticated: true,
    plan,
    planName: PLANS[plan].name,
    features: buildFeatureMap(plan),
    limits: planLimits,
    subscription: sub ?? null,
    usageCounts: {
      courses: courseCount ?? 0,
      lessonsMax: maxLessonsInAnyCourse,
      aiQuizzesThisMonth: aiQuizzesThisMonth ?? 0,
    },
    atLimit: {
      courses: planLimits.maxCourses !== null && (courseCount ?? 0) >= planLimits.maxCourses,
      aiQuizzes: planLimits.aiQuizzesPerMonth !== null && (aiQuizzesThisMonth ?? 0) >= planLimits.aiQuizzesPerMonth,
    },
    upgradeUrl: plan === 'free' ? '/pricing' : null,
  });
}

function buildFeatureMap(plan: 'free' | 'creator') {
  const limits = PLANS[plan].limits;
  return {
    customDomain: {
      allowed: limits.customDomain,
      upgradeUrl: limits.customDomain ? null : '/pricing',
      label: limits.customDomain ? 'Enabled' : 'Requires Creator plan',
    },
    marketplaceListing: {
      allowed: limits.marketplaceListing,
      upgradeUrl: limits.marketplaceListing ? null : '/pricing',
      label: limits.marketplaceListing ? 'Enabled' : 'Requires Creator plan',
    },
    marketplacePriority: {
      allowed: limits.marketplaceListing, // same gate
      upgradeUrl: limits.marketplaceListing ? null : '/pricing',
      label: limits.marketplaceListing ? 'Available' : 'Requires Creator plan',
    },
    aiQuizGeneration: {
      allowed: limits.aiQuizzesPerMonth !== 0,
      limit: limits.aiQuizzesPerMonth,
      upgradeUrl: limits.aiQuizzesPerMonth !== null ? '/pricing' : null,
      label: limits.aiQuizzesPerMonth === null
        ? 'Unlimited'
        : `${limits.aiQuizzesPerMonth}/month on Free`,
    },
    affiliateMax: {
      allowed: true,
      limit: plan === 'creator' ? 50 : 30,
      upgradeUrl: plan === 'creator' ? null : '/pricing',
      label: plan === 'creator' ? 'Up to 50%' : 'Up to 30% (Free) · Upgrade for 50%',
    },
    analyticsRetention: {
      allowed: true,
      limit: limits.analyticsRetentionDays,
      label: `${limits.analyticsRetentionDays}-day retention`,
    },
    prioritySupport: {
      allowed: limits.prioritySupport,
      upgradeUrl: limits.prioritySupport ? null : '/pricing',
      label: limits.prioritySupport ? 'Enabled' : 'Requires Creator plan',
    },
    unlimitedCourses: {
      allowed: limits.maxCourses === null,
      limit: limits.maxCourses,
      upgradeUrl: limits.maxCourses !== null ? '/pricing' : null,
      label: limits.maxCourses === null ? 'Unlimited' : `Up to ${limits.maxCourses} on Free`,
    },
  };
}
