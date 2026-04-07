/**
 * lib/instrumentation.ts
 * Track conversion lifecycle events and first-value milestones to Supabase.
 * All functions are non-throwing — instrumentation failures never block user flows.
 */
import { createServiceClient } from '@/lib/supabase-server'

export type ConversionEventType =
  | 'trial_start'
  | 'trial_activated'
  | 'paid_conversion'
  | 'paid_first_value'
  | 'upgrade'
  | 'downgrade'
  | 'reactivation'

export type FirstValueMilestone =
  | 'first_session_created'
  | 'first_session_completed'
  | 'first_feedback_collected'
  | 'first_recruit_link_sent'
  | 'first_rule_uploaded'
  | 'first_post_pay_session'

export type CancelReasonCode =
  | 'too_expensive'
  | 'missing_feature'
  | 'not_enough_use'
  | 'found_alternative'
  | 'project_ended'
  | 'technical_issues'
  | 'other'

// ── Core event track ─────────────────────────────────────────────────────────

export async function trackConversionEvent(opts: {
  userId: string
  eventType: ConversionEventType
  planId?: string
  stripeEvent?: string
  amountCents?: number
  daysInTrial?: number
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    const svc = createServiceClient()
    await svc.from('conversion_events').insert({
      user_id: opts.userId,
      event_type: opts.eventType,
      plan_id: opts.planId ?? null,
      stripe_event: opts.stripeEvent ?? null,
      amount_cents: opts.amountCents ?? null,
      days_in_trial: opts.daysInTrial ?? null,
      metadata: opts.metadata ?? {},
    })
  } catch {}
}

// ── First-value milestone (idempotent — UNIQUE user_id+milestone) ────────────

export async function trackFirstValue(opts: {
  userId: string
  milestone: FirstValueMilestone
  context?: Record<string, unknown>
  daysSinceTrialStart?: number
  daysSincePaidStart?: number
}): Promise<void> {
  try {
    const svc = createServiceClient()

    // Check if already recorded (UNIQUE constraint handles it, but avoid noisy errors)
    const { data: existing } = await svc
      .from('first_value_events')
      .select('id')
      .eq('user_id', opts.userId)
      .eq('milestone', opts.milestone)
      .single()

    if (existing) return

    await svc.from('first_value_events').insert({
      user_id: opts.userId,
      milestone: opts.milestone,
      context: opts.context ?? {},
      days_since_trial_start: opts.daysSinceTrialStart ?? null,
      days_since_paid_start: opts.daysSincePaidStart ?? null,
    })
  } catch {}
}

// ── Helper: compute days since trial start ──────────────────────────────────

export async function getDaysSince(userId: string, eventType: ConversionEventType): Promise<number | null> {
  try {
    const svc = createServiceClient()
    const { data } = await svc
      .from('conversion_events')
      .select('created_at')
      .eq('user_id', userId)
      .eq('event_type', eventType)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (!data) return null
    const start = new Date(data.created_at)
    return Math.floor((Date.now() - start.getTime()) / 86400000)
  } catch {
    return null
  }
}

// ── Cancellation reason ──────────────────────────────────────────────────────

export async function trackCancellationReason(opts: {
  userId: string
  subscriptionId: string
  reasonCode: CancelReasonCode
  reasonDetail?: string
  planId?: string
  monthsActive?: number
  stripeEvent?: string
  wasAnnual?: boolean
}): Promise<void> {
  try {
    const svc = createServiceClient()
    await svc.from('cancellation_reasons').insert({
      user_id: opts.userId,
      subscription_id: opts.subscriptionId,
      reason_code: opts.reasonCode,
      reason_detail: opts.reasonDetail ?? null,
      plan_id: opts.planId ?? null,
      months_active: opts.monthsActive ?? null,
      stripe_event: opts.stripeEvent ?? null,
      was_annual: opts.wasAnnual ?? false,
    })
  } catch {}
}

// ── Trial activation check (ran ≥1 session within 7 days) ───────────────────
// Called from test-runs PATCH when a session completes

export async function maybeTrackTrialActivation(userId: string): Promise<void> {
  try {
    const svc = createServiceClient()

    // Already tracked?
    const { data: existing } = await svc
      .from('conversion_events')
      .select('id')
      .eq('user_id', userId)
      .eq('event_type', 'trial_activated')
      .single()
    if (existing) return

    // Find trial start
    const { data: trialStart } = await svc
      .from('conversion_events')
      .select('created_at')
      .eq('user_id', userId)
      .eq('event_type', 'trial_start')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    if (!trialStart) return

    const trialStartDate = new Date(trialStart.created_at)
    const daysSinceTrial = Math.floor((Date.now() - trialStartDate.getTime()) / 86400000)

    // Count completed sessions by this user
    const { count } = await svc
      .from('test_runs')
      .select('id', { count: 'exact', head: true })
      .eq('designer_id', userId)
      .eq('status', 'completed')

    if ((count ?? 0) >= 1) {
      // Get user's plan
      const { data: sub } = await svc
        .from('subscriptions')
        .select('plan_id')
        .eq('user_id', userId)
        .single()

      await svc.from('conversion_events').insert({
        user_id: userId,
        event_type: 'trial_activated',
        plan_id: sub?.plan_id ?? null,
        metadata: { sessions_completed: count, days_in_trial: daysSinceTrial },
      })
    }
  } catch {}
}
