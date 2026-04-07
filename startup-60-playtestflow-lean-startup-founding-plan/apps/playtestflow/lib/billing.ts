import { createServiceClient } from '@/lib/supabase-server'
import { getPlan, PlanId } from '@/lib/stripe'

export interface UserPlan {
  planId: PlanId
  status: string
  maxProjects: number | null
  maxSessionsMo: number | null
  teamSeats: number
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  trialEnd: Date | null
  isTrialing: boolean
  isPaid: boolean
  isFree: boolean
}

/**
 * Get the active subscription for a user (server-side only).
 * Falls back to free plan if no subscription found.
 * Non-throwing: returns free plan on any error.
 */
export async function getUserPlan(userId: string): Promise<UserPlan> {
  try {
    const svc = createServiceClient()
    const { data: sub } = await svc
      .from('subscriptions')
      .select('plan_id, status, stripe_customer_id, stripe_subscription_id, trial_end')
      .eq('user_id', userId)
      .single()

    if (!sub) return buildFreePlan()

    const plan = getPlan(sub.plan_id)
    const isTrialing = sub.status === 'trialing'
    const isPaid = sub.status === 'active' && sub.plan_id !== 'free'

    return {
      planId: sub.plan_id as PlanId,
      status: sub.status,
      maxProjects: plan.maxProjects,
      maxSessionsMo: plan.maxSessionsMo,
      teamSeats: plan.teamSeats,
      stripeCustomerId: sub.stripe_customer_id ?? null,
      stripeSubscriptionId: sub.stripe_subscription_id ?? null,
      trialEnd: sub.trial_end ? new Date(sub.trial_end) : null,
      isTrialing,
      isPaid,
      isFree: sub.plan_id === 'free',
    }
  } catch (err) {
    console.error('[getUserPlan] error', err)
    return buildFreePlan()
  }
}

function buildFreePlan(): UserPlan {
  const plan = getPlan('free')
  return {
    planId: 'free',
    status: 'active',
    maxProjects: plan.maxProjects,
    maxSessionsMo: plan.maxSessionsMo,
    teamSeats: plan.teamSeats,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    trialEnd: null,
    isTrialing: false,
    isPaid: false,
    isFree: true,
  }
}

/**
 * Get current-period usage for a user.
 */
export async function getUserUsage(userId: string): Promise<{ sessionsUsed: number; projectsActive: number; limitHit: boolean }> {
  try {
    const svc = createServiceClient()
    const { data } = await svc
      .from('usage_ledger')
      .select('sessions_used, projects_active, limit_hit')
      .eq('user_id', userId)
      .order('period_start', { ascending: false })
      .limit(1)
      .single()

    return {
      sessionsUsed: data?.sessions_used ?? 0,
      projectsActive: data?.projects_active ?? 0,
      limitHit: data?.limit_hit ?? false,
    }
  } catch {
    return { sessionsUsed: 0, projectsActive: 0, limitHit: false }
  }
}

/**
 * Check if user can create a new session. Returns { allowed, reason }.
 * Non-throwing.
 */
export async function canCreateSession(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const [userPlan, usage] = await Promise.all([getUserPlan(userId), getUserUsage(userId)])

    if (userPlan.maxSessionsMo === null) return { allowed: true }
    if (usage.sessionsUsed >= userPlan.maxSessionsMo) {
      return {
        allowed: false,
        reason: `You've used ${usage.sessionsUsed}/${userPlan.maxSessionsMo} sessions this month. Upgrade to run more.`,
      }
    }
    return { allowed: true }
  } catch {
    return { allowed: true } // fail open — never block on instrumentation errors
  }
}

/**
 * Check if user can create a new project.
 */
export async function canCreateProject(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const [userPlan, usage] = await Promise.all([getUserPlan(userId), getUserUsage(userId)])

    if (userPlan.maxProjects === null) return { allowed: true }
    if (usage.projectsActive >= userPlan.maxProjects) {
      return {
        allowed: false,
        reason: `You've reached your project limit (${userPlan.maxProjects}). Upgrade to add more.`,
      }
    }
    return { allowed: true }
  } catch {
    return { allowed: true }
  }
}
