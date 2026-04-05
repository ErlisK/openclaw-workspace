/**
 * lib/plan-enforcement.ts — Trial & plan enforcement utilities
 * Sweeps expired trials and downgrades orgs.
 */
import { supabaseAdmin } from "./supabase";

export interface TrialSweepResult {
  swept: number;
  errors: number;
  orgs: string[];
}

/**
 * Sweep expired trial orgs and update their status.
 * Called by the nudges cron job.
 */
export async function sweepExpiredTrials(): Promise<TrialSweepResult> {
  const result: TrialSweepResult = { swept: 0, errors: 0, orgs: [] };

  try {
    // Find orgs with expired trials (trial_ends_at < now and still on trial plan)
    const { data: expiredOrgs } = await supabaseAdmin
      .from("crr_orgs")
      .select("id, slug, name, plan, trial_ends_at")
      .eq("status", "active")
      .eq("plan", "trial")
      .lt("trial_ends_at", new Date().toISOString())
      .not("trial_ends_at", "is", null);

    if (!expiredOrgs?.length) return result;

    for (const org of expiredOrgs) {
      try {
        await supabaseAdmin
          .from("crr_orgs")
          .update({ plan: "trial_expired", updated_at: new Date().toISOString() })
          .eq("id", org.id);
        result.swept++;
        result.orgs.push(org.slug);
      } catch {
        result.errors++;
      }
    }
  } catch {
    // Non-critical — silently ignore
  }

  return result;
}

/**
 * Check if an org is within their plan limits.
 */
export function isWithinPlanLimits(
  plan: string,
  usage: { connectors?: number; alerts_this_month?: number }
): { allowed: boolean; reason?: string } {
  const limits: Record<string, { connectors: number; alerts: number }> = {
    free: { connectors: 1, alerts: 50 },
    trial: { connectors: 5, alerts: 500 },
    starter: { connectors: 3, alerts: 200 },
    pro: { connectors: 10, alerts: 2000 },
    enterprise: { connectors: 999, alerts: 999999 },
    trial_expired: { connectors: 0, alerts: 0 },
  };

  const planLimits = limits[plan] ?? limits.free;

  if (usage.connectors !== undefined && usage.connectors > planLimits.connectors) {
    return { allowed: false, reason: `Connector limit exceeded (${usage.connectors}/${planLimits.connectors})` };
  }
  if (usage.alerts_this_month !== undefined && usage.alerts_this_month > planLimits.alerts) {
    return { allowed: false, reason: `Alert limit exceeded (${usage.alerts_this_month}/${planLimits.alerts})` };
  }

  return { allowed: true };
}
