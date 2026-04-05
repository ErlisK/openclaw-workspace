/**
 * lib/billing.ts — Billing & MRR utilities
 */
import { supabaseAdmin } from "./supabase";

export interface MrrSummary {
  current_mrr_cents: number;
  mrr_growth_pct: number | null;
  paying_orgs: number;
  churned_orgs_30d: number;
  trial_orgs: number;
}

export async function getMrrSummary(): Promise<MrrSummary> {
  try {
    const { data: orgs } = await supabaseAdmin
      .from("crr_orgs")
      .select("id, plan, mrr_cents, status, created_at")
      .eq("status", "active");

    const paying = (orgs ?? []).filter(o => o.plan === "pro" || o.plan === "starter" || o.plan === "enterprise");
    const trials = (orgs ?? []).filter(o => o.plan === "trial");
    const mrr = paying.reduce((sum: number, o: { mrr_cents?: number }) => sum + (o.mrr_cents ?? 0), 0);

    return {
      current_mrr_cents: mrr,
      mrr_growth_pct: null,
      paying_orgs: paying.length,
      churned_orgs_30d: 0,
      trial_orgs: trials.length,
    };
  } catch {
    return {
      current_mrr_cents: 0,
      mrr_growth_pct: null,
      paying_orgs: 0,
      churned_orgs_30d: 0,
      trial_orgs: 0,
    };
  }
}
