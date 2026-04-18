// ============================================================
// Analytics event types
// ============================================================

export type AnalyticsEventName =
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'course_created'
  | 'course_published'
  | 'lesson_viewed'
  | 'quiz_attempted'
  | 'quiz_passed'
  | 'checkout_initiated'
  | 'checkout_completed'
  | 'entitlement_granted'
  | 'affiliate_link_clicked'
  | 'affiliate_conversion'
  | 'ai_quiz_generated'
  | 'ai_quiz_accepted'
  | 'ai_quiz_discarded'
  | 'sandbox_opened';

export interface AnalyticsEvent {
  id: string;
  userId: string | null;
  eventName: AnalyticsEventName;
  properties: Record<string, unknown>;
  courseId: string | null;
  lessonId: string | null;
  sessionId: string | null;
  ipHash: string | null;
  createdAt: string;
}

// Per-event property shapes for type safety at call sites
export interface OnboardingCompletedProperties {
  source: 'web' | 'cli';
  durationSeconds: number;
  numLessons: number;
  hasQuiz: boolean;
  hasPrice: boolean;
}

export interface CheckoutInitiatedProperties {
  priceCents: number;
  currency: string;
  stripeSessionId: string;
  affiliateRef: string | null;
  sourcePage: 'course_landing' | 'lesson_gate' | 'dashboard';
}

export interface EntitlementGrantedProperties {
  stripeSessionId: string;
  latencyMs: number;
  method: 'webhook' | 'manual';
}

export interface AiQuizGeneratedProperties {
  lessonSlug: string;
  model: string;
  numQuestionsGenerated: number;
  generationMs: number;
  source: 'web' | 'cli';
}
