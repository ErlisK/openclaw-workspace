import { createServiceClient } from '@/lib/supabase/service';

export type EventName =
  | 'onboarding_started' | 'course_created' | 'course_published'
  | 'lesson_viewed' | 'checkout_initiated' | 'checkout_completed'
  | 'entitlement_granted' | 'affiliate_link_clicked' | 'ai_quiz_generated'
  | 'sandbox_opened' | 'quiz_attempted';

export interface TrackOptions {
  eventName: EventName;
  userId?: string | null;
  courseId?: string | null;
  lessonId?: string | null;
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
      properties: opts.properties ?? {},
    });
  } catch (err) {
    console.error('[analytics] track error:', err);
  }
}

export const trackLessonViewed = (opts: Omit<TrackOptions, 'eventName'>) =>
  track({ ...opts, eventName: 'lesson_viewed' });

export const trackCheckoutCompleted = (opts: Omit<TrackOptions, 'eventName'>) =>
  track({ ...opts, eventName: 'checkout_completed' });

export const trackEntitlementGranted = (opts: Omit<TrackOptions, 'eventName'>) =>
  track({ ...opts, eventName: 'entitlement_granted' });
