/**
 * Job lifecycle state machine
 * Defines valid transitions and guards for each status change.
 */

import type { JobStatus } from './types'

// Valid transitions: from → allowed nexts
export const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  draft:      ['published', 'cancelled'],
  published:  ['assigned', 'cancelled', 'expired'],
  assigned:   ['complete', 'expired', 'cancelled'],
  complete:   [],                           // terminal
  expired:    [],                           // terminal
  cancelled:  [],                           // terminal
}

export type TransitionError = { ok: false; error: string; code: string }
export type TransitionOk    = { ok: true }
export type TransitionResult = TransitionOk | TransitionError

/**
 * Validate that a status transition is permitted.
 * Does NOT check ownership — that's the caller's responsibility.
 */
export function validateTransition(
  from: JobStatus,
  to: JobStatus,
  options: { actorIsClient?: boolean; actorIsTester?: boolean } = {}
): TransitionResult {
  const allowed = VALID_TRANSITIONS[from]

  if (!allowed) {
    return { ok: false, error: `Unknown current status: ${from}`, code: 'INVALID_STATUS' }
  }

  if (!allowed.includes(to)) {
    return {
      ok: false,
      error: `Cannot transition from '${from}' to '${to}'. Allowed: ${allowed.join(', ') || 'none (terminal state)'}`,
      code: 'INVALID_TRANSITION',
    }
  }

  // Role-based guards
  if (to === 'published' && !options.actorIsClient) {
    return { ok: false, error: 'Only the job owner can publish', code: 'FORBIDDEN' }
  }
  if (to === 'assigned') {
    // assigned is set by the system when a tester accepts — not a direct client transition
    if (options.actorIsClient) {
      return { ok: false, error: 'Clients cannot directly assign jobs; testers accept them', code: 'FORBIDDEN' }
    }
  }
  if (to === 'complete') {
    // Only the tester (via assignment submission) can mark complete
    if (options.actorIsClient && !options.actorIsTester) {
      return { ok: false, error: 'Only the assigned tester can complete a job', code: 'FORBIDDEN' }
    }
  }
  if (to === 'cancelled') {
    // Both client and system can cancel; tester cannot cancel
    if (options.actorIsTester && !options.actorIsClient) {
      return { ok: false, error: 'Testers cannot cancel jobs', code: 'FORBIDDEN' }
    }
  }

  return { ok: true }
}

/**
 * Determine if a job should be expired based on its published_at timestamp.
 * Default expiry: 72 hours after publishing.
 */
export const JOB_EXPIRY_HOURS = 72

export function isJobExpired(publishedAt: string | null, nowMs = Date.now()): boolean {
  if (!publishedAt) return false
  const publishedMs = new Date(publishedAt).getTime()
  return nowMs - publishedMs > JOB_EXPIRY_HOURS * 60 * 60 * 1000
}
