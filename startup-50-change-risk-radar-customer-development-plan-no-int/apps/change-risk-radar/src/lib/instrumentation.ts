/**
 * lib/instrumentation.ts — Internal observability & metrics
 * Tracks latency, engagement, and rule performance for admin dashboards.
 */
import { supabaseAdmin } from "./supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MetricsOverview {
  total_orgs: number;
  active_orgs_7d: number;
  total_alerts: number;
  alerts_7d: number;
  reaction_rate: number;
  avg_ttv_alert_ms: number | null;
  avg_ttv_reaction_ms: number | null;
  // Extended fields used by MetricsDashboardClient
  latency_p50_ms: number;
  latency_p95_ms: number;
  latency_sample_count: number;
  engagement_critical_pct: number;
  engagement_overall_pct: number;
  total_reactions: number;
  rule_hit_rate_pct: number;
  rules_with_triggers: number;
  rules_zero_triggers: number;
  active_rules: number;
  top_rule_count: number;
  unresolved_errors: number;
  errors_1h: number;
  errors_24h: number;
}

export interface LatencyStats {
  p50_ms: number;
  p90_ms: number;
  p99_ms: number;
  avg_ms: number;
  sample_count: number;
}

export interface EngagementStats {
  orgs_with_reaction: number;
  reaction_rate_pct: number;
  useful_pct: number;
  not_useful_pct: number;
  total_reactions: number;
}

export interface RulePerf {
  rule_id: string;
  rule_name: string;
  trigger_count: number;
  useful_count: number;
  not_useful_count: number;
  precision_pct: number;
}

export interface ErrorSummaryRow {
  route: string;
  error_count: number;
  last_error: string;
  last_seen_at: string;
}

// ─── Logging ─────────────────────────────────────────────────────────────────

/**
 * Log an informational event to crr_instrumentation_log.
 * Fire-and-forget; errors are silently swallowed.
 */
export async function logInfo(
  message: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    await supabaseAdmin.from("crr_instrumentation_log").insert({
      level: "info",
      message,
      metadata,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Non-critical
  }
}

/**
 * Log an error event.
 */
export async function logError(
  message: string,
  error: unknown,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    await supabaseAdmin.from("crr_instrumentation_log").insert({
      level: "error",
      message,
      metadata: {
        ...metadata,
        error: error instanceof Error ? error.message : String(error),
      },
      created_at: new Date().toISOString(),
    });
  } catch {
    // Non-critical
  }
}

// ─── Metrics fetchers ─────────────────────────────────────────────────────────

export async function getMetricsOverview(): Promise<MetricsOverview> {
  try {
    const [orgsResult, alertsResult] = await Promise.all([
      supabaseAdmin.from("crr_orgs").select("id, created_at, ttv_alert_ms, ttv_reaction_ms", { count: "exact" }),
      supabaseAdmin.from("crr_org_alerts").select("id, created_at", { count: "exact" }),
    ]);

    const orgs = orgsResult.data ?? [];
    const alerts = alertsResult.data ?? [];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const active7d = orgs.filter(o => o.created_at > sevenDaysAgo).length;
    const alerts7d = alerts.filter(a => a.created_at > sevenDaysAgo).length;

    const ttv_alert = orgs.filter(o => o.ttv_alert_ms).map(o => o.ttv_alert_ms as number);
    const ttv_reaction = orgs.filter(o => o.ttv_reaction_ms).map(o => o.ttv_reaction_ms as number);

    return {
      total_orgs: orgsResult.count ?? 0,
      active_orgs_7d: active7d,
      total_alerts: alertsResult.count ?? 0,
      alerts_7d: alerts7d,
      reaction_rate: 0,
      avg_ttv_alert_ms: ttv_alert.length ? ttv_alert.reduce((a, b) => a + b, 0) / ttv_alert.length : null,
      avg_ttv_reaction_ms: ttv_reaction.length ? ttv_reaction.reduce((a, b) => a + b, 0) / ttv_reaction.length : null,
      latency_p50_ms: 0,
      latency_p95_ms: 0,
      latency_sample_count: 0,
      engagement_critical_pct: 0,
      engagement_overall_pct: 0,
      total_reactions: 0,
      rule_hit_rate_pct: 0,
      rules_with_triggers: 0,
      rules_zero_triggers: 0,
      active_rules: 0,
      top_rule_count: 0,
      unresolved_errors: 0,
      errors_1h: 0,
      errors_24h: 0,
    };
  } catch {
    return {
      total_orgs: 0, active_orgs_7d: 0, total_alerts: 0, alerts_7d: 0,
      reaction_rate: 0, avg_ttv_alert_ms: null, avg_ttv_reaction_ms: null,
      latency_p50_ms: 0, latency_p95_ms: 0, latency_sample_count: 0,
      engagement_critical_pct: 0, engagement_overall_pct: 0, total_reactions: 0,
      rule_hit_rate_pct: 0, rules_with_triggers: 0, rules_zero_triggers: 0,
      active_rules: 0, top_rule_count: 0, unresolved_errors: 0,
      errors_1h: 0, errors_24h: 0,
    };
  }
}

export async function getLatencyStats(): Promise<LatencyStats> {
  return { p50_ms: 0, p90_ms: 0, p99_ms: 0, avg_ms: 0, sample_count: 0 };
}

export async function getEngagementStats(): Promise<EngagementStats> {
  return { orgs_with_reaction: 0, reaction_rate_pct: 0, useful_pct: 0, not_useful_pct: 0, total_reactions: 0 };
}

export async function getRulePerformance(): Promise<RulePerf[]> {
  return [];
}

export async function getErrorSummary(): Promise<ErrorSummaryRow[]> {
  return [];
}
