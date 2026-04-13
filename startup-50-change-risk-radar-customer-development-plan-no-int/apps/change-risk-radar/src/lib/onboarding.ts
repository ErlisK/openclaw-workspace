/**
 * onboarding.ts — Trial checklist progress, activation tracking, TTV computation
 *
 * Checklist steps (in order):
 *   1. sign_up           ✓ (always done on load)
 *   2. connect_connector Add Stripe, AWS, Workspace, Shopify, or Salesforce
 *   3. get_first_alert   Wait for the first risk alert to appear
 *   4. react_to_alert    Mark an alert useful/acknowledged/snooze/FP
 *   5. set_notifications Add email or webhook for alerts
 *   6. invite_team       Optional — more team members = stickier
 *   7. upgrade           Convert from trial to paid
 *
 * Time-to-value: tracked at each activation milestone, stored in crr_orgs.
 */

import { supabaseAdmin } from "@/lib/supabase";
import { trackFunnelEvent } from "@/lib/funnel";

// ─── Step Definitions ─────────────────────────────────────────────────────────

export type OnboardingStepId =
  | "sign_up"
  | "connect_connector"
  | "get_first_alert"
  | "react_to_alert"
  | "set_notifications"
  | "invite_team"
  | "upgrade";

export interface OnboardingStep {
  id: OnboardingStepId;
  order: number;
  title: string;
  description: string;
  action_label: string;
  action_url_key: string; // resolved with orgSlug + token at display time
  optional: boolean;
  points: number; // activation score contribution
}

export const CHECKLIST_STEPS: OnboardingStep[] = [
  {
    id: "sign_up",
    order: 1,
    title: "Account created",
    description: "You're in. 14-day free trial, no credit card required.",
    action_label: "Done",
    action_url_key: "dashboard",
    optional: false,
    points: 25,
  },
  {
    id: "connect_connector",
    order: 2,
    title: "Connect your first integration",
    description: "Stripe, AWS CloudTrail, Google Workspace, Shopify, or Salesforce. Takes 2 minutes.",
    action_label: "Connect now →",
    action_url_key: "connect",
    optional: false,
    points: 25,
  },
  {
    id: "get_first_alert",
    order: 3,
    title: "Receive your first risk alert",
    description: "Once connected, we'll detect changes in real-time. p95 latency ≤5 minutes.",
    action_label: "View alerts →",
    action_url_key: "dashboard",
    optional: false,
    points: 25,
  },
  {
    id: "react_to_alert",
    order: 4,
    title: "React to an alert",
    description: "Mark alerts as useful, acknowledge, snooze, or flag as false positive. This trains the engine.",
    action_label: "Review alerts →",
    action_url_key: "dashboard",
    optional: false,
    points: 25,
  },
  {
    id: "set_notifications",
    order: 5,
    title: "Set up email or webhook alerts",
    description: "Get notified the moment we detect a change. Works with email, PagerDuty, and webhooks.",
    action_label: "Add notifications →",
    action_url_key: "notifications",
    optional: true,
    points: 10,
  },
  {
    id: "invite_team",
    order: 6,
    title: "Share with your team",
    description: "Forward your magic link to engineers, finance, or ops who should see these alerts.",
    action_label: "Share →",
    action_url_key: "share",
    optional: true,
    points: 5,
  },
  {
    id: "upgrade",
    order: 7,
    title: "Upgrade to a paid plan",
    description: "Keep your connectors active and alert history beyond 14 days.",
    action_label: "View plans →",
    action_url_key: "billing",
    optional: false,
    points: 0,
  },
];

// ─── Progress Computation ─────────────────────────────────────────────────────

export interface StepStatus {
  step: OnboardingStep;
  completed: boolean;
  completed_at: string | null;
  skipped: boolean;
}

export interface OnboardingProgress {
  org_id: string;
  steps: StepStatus[];
  completed_count: number;
  total_required: number;
  pct_complete: number;
  current_step: OnboardingStepId;
  is_complete: boolean;
  activation_score: number;
  trial_days_left: number | null;
  trial_day: number;
  ttv_connector_ms: number | null;
  ttv_alert_ms: number | null;
  ttv_reaction_ms: number | null;
  time_to_value_achieved: boolean;
}

/**
 * Compute onboarding progress for an org by querying live state.
 * Combines stored progress rows with live DB state for accuracy.
 */
export async function computeProgress(orgId: string): Promise<OnboardingProgress> {
  // Fetch everything in parallel
  const [
    { data: org },
    { data: sub },
    { data: storedProgress },
    { count: connectorCount },
    { data: firstAlert },
    { count: reactionCount },
    { count: notifChannelCount },
  ] = await Promise.all([
    supabaseAdmin.from("crr_orgs").select("id,slug,name,activation_score,first_alert_at,connector_count,trial_started_at,trial_ends_at,ttv_connector_ms,ttv_alert_ms,ttv_reaction_ms,billing_plan,setup_complete,onboarding_step").eq("id", orgId).single(),
    supabaseAdmin.from("crr_subscriptions").select("status,trial_start,trial_end,plan_id").eq("org_id", orgId).single(),
    supabaseAdmin.from("crr_onboarding_progress").select("step,completed,completed_at,skipped").eq("org_id", orgId),
    supabaseAdmin.from("crr_org_connectors").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "active"),
    supabaseAdmin.from("crr_org_alerts").select("id,created_at").eq("org_id", orgId).order("created_at", { ascending: true }).limit(1),
    supabaseAdmin.from("crr_alert_reactions").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    supabaseAdmin.from("crr_notification_channels").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("is_active", true),
  ]);

  const progressMap = new Map<string, { completed: boolean; completed_at: string | null; skipped: boolean }>(
    (storedProgress ?? []).map(p => [p.step, { completed: p.completed, completed_at: p.completed_at, skipped: p.skipped ?? false }])
  );

  const hasConnector = (connectorCount ?? 0) > 0;
  const hasAlert = (firstAlert?.length ?? 0) > 0;
  const hasReaction = (reactionCount ?? 0) > 0;
  const hasNotifications = (notifChannelCount ?? 0) > 0;
  const isPaid = sub?.plan_id !== "trial" && sub?.status === "active";

  // Trial timing
  const trialStart = sub?.trial_start ? new Date(sub.trial_start) : org?.trial_started_at ? new Date(org.trial_started_at) : new Date();
  const trialEnd = sub?.trial_end ? new Date(sub.trial_end) : org?.trial_ends_at ? new Date(org.trial_ends_at) : new Date(trialStart.getTime() + 14 * 86_400_000);
  const trialDayMs = Date.now() - trialStart.getTime();
  const trialDay = Math.max(0, Math.floor(trialDayMs / 86_400_000));
  const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86_400_000));

  // Live state map
  const liveCompleted: Partial<Record<OnboardingStepId, boolean>> = {
    sign_up: true,
    connect_connector: hasConnector,
    get_first_alert: hasAlert,
    react_to_alert: hasReaction,
    set_notifications: hasNotifications,
    invite_team: progressMap.get("invite_team")?.completed ?? false,
    upgrade: isPaid,
  };

  // Build steps array
  const steps: StepStatus[] = CHECKLIST_STEPS.map(step => {
    const stored = progressMap.get(step.id);
    const completed = liveCompleted[step.id] ?? stored?.completed ?? false;
    const completedAt = stored?.completed_at ?? (completed && step.id === "get_first_alert" ? firstAlert?.[0]?.created_at ?? null : null);
    return {
      step,
      completed,
      completed_at: completedAt ?? null,
      skipped: stored?.skipped ?? false,
    };
  });

  const required = steps.filter(s => !s.step.optional && s.step.id !== "upgrade");
  const completedRequired = required.filter(s => s.completed);
  const pct = required.length > 0 ? Math.round((completedRequired.length / required.length) * 100) : 0;

  // Current step = first incomplete required step
  const nextRequired = steps.find(s => !s.completed && !s.step.optional && s.step.id !== "upgrade");
  const nextOptional = steps.find(s => !s.completed && s.step.optional);
  const currentStep = nextRequired?.step.id ?? nextOptional?.step.id ?? "upgrade";

  const isComplete = completedRequired.length === required.length;
  const score = org?.activation_score ?? 0;
  const ttvValue = hasAlert && org?.ttv_alert_ms !== null;

  return {
    org_id: orgId,
    steps,
    completed_count: completedRequired.length,
    total_required: required.length,
    pct_complete: pct,
    current_step: currentStep,
    is_complete: isComplete,
    activation_score: score,
    trial_days_left: sub?.status === "trialing" ? daysLeft : null,
    trial_day: trialDay,
    ttv_connector_ms: org?.ttv_connector_ms ?? null,
    ttv_alert_ms: org?.ttv_alert_ms ?? null,
    ttv_reaction_ms: org?.ttv_reaction_ms ?? null,
    time_to_value_achieved: ttvValue,
  };
}

// ─── Step Completion Recording ────────────────────────────────────────────────

/**
 * Record a checklist step as complete. Idempotent.
 */
export async function markStepComplete(
  orgId: string,
  step: OnboardingStepId,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const now = new Date().toISOString();

  await supabaseAdmin.from("crr_onboarding_progress").upsert({
    org_id: orgId,
    step,
    completed: true,
    completed_at: now,
    metadata,
  }, { onConflict: "org_id,step" });

  // Record TTV timestamps on crr_orgs
  if (step === "connect_connector") {
    const { data: org } = await supabaseAdmin.from("crr_orgs").select("created_at, ttv_connector_ms").eq("id", orgId).single();
    if (org && !org.ttv_connector_ms) {
      const ttv = Date.now() - new Date(org.created_at).getTime();
      await supabaseAdmin.from("crr_orgs").update({ ttv_connector_ms: ttv }).eq("id", orgId);
      void trackFunnelEvent("connector_add", { orgId });
    }
  }

  if (step === "get_first_alert") {
    const { data: org } = await supabaseAdmin.from("crr_orgs").select("created_at, ttv_alert_ms").eq("id", orgId).single();
    if (org && !org.ttv_alert_ms) {
      const ttv = Date.now() - new Date(org.created_at).getTime();
      await supabaseAdmin.from("crr_orgs").update({ ttv_alert_ms: ttv, first_alert_at: now }).eq("id", orgId);
      void trackFunnelEvent("first_alert", { orgId });
    }
  }

  if (step === "react_to_alert") {
    const { data: org } = await supabaseAdmin.from("crr_orgs").select("created_at, ttv_reaction_ms").eq("id", orgId).single();
    if (org && !org.ttv_reaction_ms) {
      const ttv = Date.now() - new Date(org.created_at).getTime();
      await supabaseAdmin.from("crr_orgs").update({ ttv_reaction_ms: ttv }).eq("id", orgId);
    }
  }

  // Check if setup is now complete
  const progress = await computeProgress(orgId);
  if (progress.is_complete && !progress.steps.find(s => s.step.id === "upgrade")?.completed) {
    await supabaseAdmin.from("crr_orgs").update({
      setup_complete: true,
      setup_complete_at: now,
      onboarding_step: "complete",
    }).eq("id", orgId);
  }
}

// ─── Admin TTV Analytics ──────────────────────────────────────────────────────

export interface TtvStats {
  median_connector_hours: number | null;
  median_alert_hours: number | null;
  median_reaction_hours: number | null;
  pct_reached_first_alert: number;
  pct_reacted: number;
  pct_set_notifications: number;
  avg_activation_score: number;
  orgs_at_step: Record<OnboardingStepId, number>;
}

export async function getTtvStats(): Promise<TtvStats> {
  const { data: orgs } = await supabaseAdmin
    .from("crr_orgs")
    .select("activation_score, ttv_connector_ms, ttv_alert_ms, ttv_reaction_ms, onboarding_step, first_alert_at, connector_count");

  if (!orgs?.length) {
    return {
      median_connector_hours: null,
      median_alert_hours: null,
      median_reaction_hours: null,
      pct_reached_first_alert: 0,
      pct_reacted: 0,
      pct_set_notifications: 0,
      avg_activation_score: 0,
      orgs_at_step: {} as Record<OnboardingStepId, number>,
    };
  }

  const total = orgs.length;
  const median = (arr: number[]) => {
    if (!arr.length) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  };

  const connectorTtv = orgs.filter(o => o.ttv_connector_ms).map(o => o.ttv_connector_ms! / 3_600_000);
  const alertTtv = orgs.filter(o => o.ttv_alert_ms).map(o => o.ttv_alert_ms! / 3_600_000);
  const reactionTtv = orgs.filter(o => o.ttv_reaction_ms).map(o => o.ttv_reaction_ms! / 3_600_000);

  const orgsAtStep: Record<string, number> = {};
  for (const org of orgs) {
    const step = org.onboarding_step ?? "sign_up";
    orgsAtStep[step] = (orgsAtStep[step] ?? 0) + 1;
  }

  return {
    median_connector_hours: median(connectorTtv),
    median_alert_hours: median(alertTtv),
    median_reaction_hours: median(reactionTtv),
    pct_reached_first_alert: Math.round((orgs.filter(o => o.first_alert_at).length / total) * 100),
    pct_reacted: Math.round((orgs.filter(o => o.ttv_reaction_ms).length / total) * 100),
    pct_set_notifications: 0, // filled from notification_channels
    avg_activation_score: Math.round(orgs.reduce((s, o) => s + (o.activation_score ?? 0), 0) / total),
    orgs_at_step: orgsAtStep as Record<OnboardingStepId, number>,
  };
}
