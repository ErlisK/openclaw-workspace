import { createServiceClient } from '@/lib/supabase/service';

export type EventName =
  // Auth
  | 'signup_completed'
  // Import
  | 'repo_import_started'
  | 'repo_import_completed'
  // Course lifecycle
  | 'course_created'
  | 'course_published'
  // Checkout
  | 'checkout_started'
  | 'checkout_completed'
  // Learning
  | 'lesson_viewed'
  | 'quiz_submitted'
  | 'sandbox_viewed'
  // Misc
  | 'onboarding_started'
  | 'entitlement_granted'
  | 'affiliate_link_clicked'
  | 'ai_quiz_generated';

export interface TrackOptions {
  eventName: EventName;
  userId?: string | null;
  courseId?: string | null;
  lessonId?: string | null;
  quizId?: string | null;
  properties?: Record<string, unknown>;
}

/**
 * Track an analytics event server-side to Supabase events table.
 * Never throws — errors are logged and swallowed.
 */
export async function track(opts: TrackOptions): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from('events').insert({
      event_name: opts.eventName,
      user_id: opts.userId ?? null,
      course_id: opts.courseId ?? null,
      lesson_id: opts.lessonId ?? null,
      quiz_id: opts.quizId ?? null,
      properties: opts.properties ?? {},
    });
  } catch (err) {
    console.error('[analytics] track error:', err);
  }
}

// ── Convenience wrappers ────────────────────────────────────────────────────

export const trackSignupCompleted = (opts: Omit<TrackOptions, 'eventName'>) =>
  track({ ...opts, eventName: 'signup_completed' });

export const trackRepoImportStarted = (opts: Omit<TrackOptions, 'eventName'>) =>
  track({ ...opts, eventName: 'repo_import_started' });

export const trackRepoImportCompleted = (opts: Omit<TrackOptions, 'eventName'>) =>
  track({ ...opts, eventName: 'repo_import_completed' });

export const trackCoursePublished = (opts: Omit<TrackOptions, 'eventName'>) =>
  track({ ...opts, eventName: 'course_published' });

export const trackCheckoutStarted = (opts: Omit<TrackOptions, 'eventName'>) =>
  track({ ...opts, eventName: 'checkout_started' });

export const trackCheckoutCompleted = (opts: Omit<TrackOptions, 'eventName'>) =>
  track({ ...opts, eventName: 'checkout_completed' });

export const trackLessonViewed = (opts: Omit<TrackOptions, 'eventName'>) =>
  track({ ...opts, eventName: 'lesson_viewed' });

export const trackQuizSubmitted = (opts: Omit<TrackOptions, 'eventName'>) =>
  track({ ...opts, eventName: 'quiz_submitted' });

export const trackSandboxViewed = (opts: Omit<TrackOptions, 'eventName'>) =>
  track({ ...opts, eventName: 'sandbox_viewed' });

export const trackEntitlementGranted = (opts: Omit<TrackOptions, 'eventName'>) =>
  track({ ...opts, eventName: 'entitlement_granted' });
