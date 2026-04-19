/**
 * TeachRepo Creator Plan definitions.
 * Keep in sync with Stripe product metadata[tier].
 */

export type CreatorPlan = 'free' | 'creator';

export interface PlanDefinition {
  id: CreatorPlan;
  name: string;
  monthlyPriceCents: number;
  annualPriceCents: number;
  features: string[];
  limits: {
    maxCourses: number | null;       // null = unlimited
    maxLessonsPerCourse: number | null;
    aiQuizzesPerMonth: number | null;
    customDomain: boolean;
    marketplaceListing: boolean;
    analyticsRetentionDays: number;
    prioritySupport: boolean;
    revSharePct: number;             // marketplace rev-share we take
  };
}

export const PLANS: Record<CreatorPlan, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free / Self-Hosted',
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    features: [
      'Full platform source code (MIT)',
      'Deploy to any host (Vercel, Netlify, VPS)',
      'Git-native course authoring',
      'Stripe checkout integration',
      'Auto-graded YAML quizzes',
      'Gated code sandboxes',
      'Affiliate/referral tracking',
      'Community support',
    ],
    limits: {
      maxCourses: 3,
      maxLessonsPerCourse: 10,
      aiQuizzesPerMonth: 3,
      customDomain: false,
      marketplaceListing: false,
      analyticsRetentionDays: 7,
      prioritySupport: false,
      revSharePct: 0,
    },
  },
  creator: {
    id: 'creator',
    name: 'Hosted Creator',
    monthlyPriceCents: 2900,
    annualPriceCents: 27900,
    features: [
      'Everything in Free, fully managed',
      'Unlimited courses & lessons',
      'Custom domain (teachrepo.com/your-brand)',
      'Marketplace listing & discovery',
      'Unlimited AI quiz generation',
      'Analytics — 90-day retention',
      'Creator funnel dashboard',
      'Priority email support',
      'Optional marketplace rev-share (10%)',
    ],
    limits: {
      maxCourses: null,
      maxLessonsPerCourse: null,
      aiQuizzesPerMonth: null,
      customDomain: true,
      marketplaceListing: true,
      analyticsRetentionDays: 90,
      prioritySupport: true,
      revSharePct: 10,
    },
  },
};

export const STRIPE_PRICE_IDS = {
  creator_monthly: process.env.CREATOR_PRICE_MONTHLY ?? 'price_1TNvxxGt92XrRvUuDafkteHv',
  creator_annual:  process.env.CREATOR_PRICE_ANNUAL  ?? 'price_1TNvxxGt92XrRvUuC8P0nQ81',
};

/** Returns true if the user's plan grants access to a feature */
export function planHasFeature(plan: CreatorPlan, feature: keyof PlanDefinition['limits']): boolean {
  const limits = PLANS[plan].limits;
  const val = limits[feature];
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val > 0;
  return val !== null; // null = unlimited = true
}
