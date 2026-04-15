/**
 * analytics/events.ts
 *
 * Strongly-typed PostHog event wrappers.
 * Call these from server-side Route Handlers (via the REST Capture API)
 * or from client components (via posthog-js).
 *
 * Key events:
 *   sign_up              — user created account
 *   login                — user authenticated
 *   create_project       — user created a project
 *   create_job_draft     — user created a job (draft)
 *   publish_job          — job transitioned to published
 *   claim_job            — tester claimed/assigned a job
 *   start_session        — tester started a test session
 *   stop_session         — session ended (complete, expired, abandoned)
 *   submit_feedback      — tester submitted feedback/report
 *   purchase_credits     — Stripe checkout completed, credits added
 */

// ── Client-side tracking (posthog-js) ─────────────────────────────────────
// Safe to call in 'use client' components.
// These are no-ops if PostHog hasn't been initialized.

import posthog from 'posthog-js'

type EventProperties = Record<string, string | number | boolean | null | undefined>

function capture(event: string, properties?: EventProperties) {
  if (typeof window === 'undefined') return
  try { posthog.capture(event, properties) } catch { /* swallow in test/SSR */ }
}

export const analytics = {
  /** User created a new account */
  signUp(userId: string, email?: string) {
    posthog.identify(userId, { email })
    capture('sign_up', { user_id: userId, email })
  },

  /** User logged in */
  login(userId: string, email?: string) {
    posthog.identify(userId, { email })
    capture('login', { user_id: userId, email })
  },

  /** User created a new project */
  createProject(projectId: string, name?: string) {
    capture('create_project', { project_id: projectId, name })
  },

  /** User saved a job draft */
  createJobDraft(jobId: string, tier?: string, title?: string) {
    capture('create_job_draft', { job_id: jobId, tier, title })
  },

  /** Job published (credits held) */
  publishJob(jobId: string, tier?: string, creditsHeld?: number) {
    capture('publish_job', { job_id: jobId, tier, credits_held: creditsHeld })
  },

  /** Tester claimed/assigned a job */
  claimJob(jobId: string, testerId: string) {
    capture('claim_job', { job_id: jobId, tester_id: testerId })
  },

  /** Tester started a test session */
  startSession(sessionId: string, jobId: string, testerId?: string) {
    capture('start_session', { session_id: sessionId, job_id: jobId, tester_id: testerId })
  },

  /** Session ended */
  stopSession(sessionId: string, jobId: string, reason?: 'complete' | 'expired' | 'abandoned') {
    capture('stop_session', { session_id: sessionId, job_id: jobId, reason })
  },

  /** Tester submitted feedback report */
  submitFeedback(sessionId: string, jobId: string, hasBugs?: boolean) {
    capture('submit_feedback', { session_id: sessionId, job_id: jobId, has_bugs: hasBugs })
  },

  /** Stripe checkout completed, credits added */
  purchaseCredits(userId: string, creditsPurchased: number, packLabel?: string, amountCents?: number) {
    capture('purchase_credits', {
      user_id: userId,
      credits_purchased: creditsPurchased,
      pack: packLabel,
      amount_cents: amountCents,
    })
  },

  /** Identify user (call after auth state resolves) */
  identify(userId: string, traits?: Record<string, string | number | boolean | null | undefined>) {
    if (typeof window === 'undefined') return
    try { posthog.identify(userId, traits) } catch { /* swallow */ }
  },

  /** Reset identity on sign-out */
  reset() {
    if (typeof window === 'undefined') return
    try { posthog.reset() } catch { /* swallow */ }
  },
}

// ── Server-side tracking (REST Capture API) ───────────────────────────────
// Call from Route Handlers, Server Actions, or webhook handlers.
// Never imports posthog-js.

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || ''
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

export async function captureServerEvent(
  event: string,
  distinctId: string,
  properties?: EventProperties
): Promise<void> {
  if (!POSTHOG_KEY) return
  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event,
        distinct_id: distinctId,
        properties: { ...properties, $lib: 'posthog-node-server' },
        timestamp: new Date().toISOString(),
      }),
    })
  } catch (e) {
    // Non-fatal: analytics should never crash the main flow
    console.warn('[analytics] captureServerEvent failed:', e)
  }
}
