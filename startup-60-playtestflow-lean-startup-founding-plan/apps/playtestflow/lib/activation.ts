/**
 * lib/activation.ts
 *
 * Server-side activation event tracking for the designer funnel.
 *
 * A1 — project created
 * A2 — first rule version uploaded
 * A3 — recruit link published (session status → 'recruiting')
 * A4 — first session scheduled (session with scheduled_at set)
 * A5 — first session completed
 * A6 — second session completed
 *
 * Each event:
 * 1. Inserts a row into the `events` table (event_type = 'activation_*')
 * 2. Updates `designer_profiles.a{N}_*_at` timestamp if not already set (first-win only)
 * 3. Updates `beta_cohort.a{N}_at` timestamp if not already set
 */

import { createServiceClient } from './supabase-server'

export type ActivationStep = 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6'

const STEP_META: Record<ActivationStep, {
  event_type: string
  profile_col: string
  cohort_col: string
  label: string
}> = {
  A1: { event_type: 'activation_a1_project_created',   profile_col: 'a1_signed_up_at',       cohort_col: 'a1_at', label: 'Project created' },
  A2: { event_type: 'activation_a2_rules_uploaded',    profile_col: 'a2_project_created_at',  cohort_col: 'a2_at', label: 'Rules uploaded' },
  A3: { event_type: 'activation_a3_link_published',    profile_col: 'a3_rules_uploaded_at',   cohort_col: 'a3_at', label: 'Recruit link published' },
  A4: { event_type: 'activation_a4_session_scheduled', profile_col: 'a4_session_published_at',cohort_col: 'a4_at', label: 'Session scheduled' },
  A5: { event_type: 'activation_a5_first_complete',    profile_col: 'a5_first_signup_at',     cohort_col: 'a5_at', label: 'First session complete' },
  A6: { event_type: 'activation_a6_second_complete',   profile_col: 'a6_feedback_received_at',cohort_col: 'a6_at', label: 'Second session complete' },
}

export interface TrackActivationOptions {
  designerId: string
  step: ActivationStep
  sessionId?: string        // for session-level events
  projectId?: string        // for project-level events
  metadata?: Record<string, unknown>
}

/**
 * Track an activation milestone. Non-throwing — logs errors to console.
 * Safe to call from any server route/action.
 */
export async function trackActivation({
  designerId,
  step,
  sessionId,
  projectId,
  metadata = {},
}: TrackActivationOptions): Promise<void> {
  const svc = createServiceClient()
  const meta = STEP_META[step]
  const now = new Date().toISOString()

  try {
    // 1. Insert activation event
    const eventPayload: Record<string, unknown> = {
      event_type: meta.event_type,
      tester_id: `designer:${designerId}`,  // namespace to distinguish designer events
      event_data: {
        designer_id: designerId,
        step,
        label: meta.label,
        project_id: projectId ?? null,
        session_id: sessionId ?? null,
        ...metadata,
      },
      failure_point: false,
      created_at: now,
    }

    // session_id FK is required on events table — only attach if provided and valid
    if (sessionId) {
      eventPayload.session_id = sessionId
    } else if (projectId) {
      // Look up a session for this project to satisfy FK, or use a sentinel approach
      // For project-only events, skip session_id (use a dummy approach if FK allows NULL)
      // The events table has session_id NOT NULL — use the designer's most recent session
      const { data: latestSession } = await svc
        .from('playtest_sessions')
        .select('id')
        .eq('designer_id', designerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (latestSession) eventPayload.session_id = latestSession.id
    }

    if (eventPayload.session_id) {
      await svc.from('events').insert(eventPayload)
    }

    // 2. Update designer_profiles — only set if not already set (first-win)
    await svc
      .from('designer_profiles')
      .upsert(
        { id: designerId, [meta.profile_col]: now, updated_at: now },
        { onConflict: 'id', ignoreDuplicates: false }
      )

    // Don't overwrite if already set
    await svc
      .from('designer_profiles')
      .update({ [meta.profile_col]: now, updated_at: now })
      .eq('id', designerId)
      .is(meta.profile_col, null)

    // 3. Update beta_cohort — only if not already set
    await svc
      .from('beta_cohort')
      .update({ [meta.cohort_col]: now })
      .eq('designer_id', designerId)
      .is(meta.cohort_col, null)

  } catch (err) {
    // Non-throwing — activation tracking should never break the main flow
    console.error(`[activation] Failed to track ${step} for designer ${designerId}:`, err)
  }
}

/**
 * Check which activation steps a designer has completed.
 * Returns a map of step → timestamp or null.
 */
export async function getActivationStatus(designerId: string): Promise<Record<ActivationStep, string | null>> {
  const svc = createServiceClient()

  const { data } = await svc
    .from('designer_profiles')
    .select('a1_signed_up_at, a2_project_created_at, a3_rules_uploaded_at, a4_session_published_at, a5_first_signup_at, a6_feedback_received_at')
    .eq('id', designerId)
    .single()

  if (!data) {
    return { A1: null, A2: null, A3: null, A4: null, A5: null, A6: null }
  }

  return {
    A1: data.a1_signed_up_at,
    A2: data.a2_project_created_at,
    A3: data.a3_rules_uploaded_at,
    A4: data.a4_session_published_at,
    A5: data.a5_first_signup_at,
    A6: data.a6_feedback_received_at,
  }
}
