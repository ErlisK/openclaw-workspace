/**
 * lib/funnel.ts — Funnel event tracking
 * Tracks product funnel events to crr_funnel_events table.
 */
import { supabaseAdmin } from "./supabase";

export interface FunnelStep {
  step: string;
  event_name: string;
  unique_count: number;
  total_count: number;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
}

export type FunnelEventName =
  | "page_visit"
  | "pricing_view"
  | "signup_start"
  | "signup_complete"
  | "trial_start"
  | "connector_add"
  | "first_alert"
  | "react_to_alert"
  | "upgrade"
  | string;

export interface FunnelEventProps {
  orgId?: string;
  source?: string;
  campaign?: string;
  properties?: Record<string, unknown>;
}

/**
 * Track a funnel event. Fire-and-forget (non-blocking).
 */
export async function trackFunnelEvent(
  event: FunnelEventName,
  props: FunnelEventProps = {}
): Promise<void> {
  try {
    await supabaseAdmin.from("crr_funnel_events").insert({
      event_name: event,
      org_id: props.orgId ?? null,
      source: props.source ?? null,
      campaign: props.campaign ?? null,
      properties: props.properties ?? {},
      created_at: new Date().toISOString(),
    });
  } catch {
    // Non-critical — silently ignore
  }
}

/**
 * Get funnel steps summary for admin dashboard.
 */
export async function getFunnelSteps(): Promise<FunnelStep[]> {
  try {
    const { data } = await supabaseAdmin
      .from("crr_funnel_events")
      .select("event_name, org_id, created_at")
      .order("created_at", { ascending: false })
      .limit(10000);

    if (!data?.length) return [];

    const stepMap: Record<string, { orgs: Set<string>; total: number; first?: string; last?: string }> = {};
    for (const row of data) {
      const e = row.event_name;
      if (!stepMap[e]) stepMap[e] = { orgs: new Set(), total: 0 };
      stepMap[e].total++;
      if (row.org_id) stepMap[e].orgs.add(row.org_id);
      if (!stepMap[e].first || row.created_at < stepMap[e].first!) stepMap[e].first = row.created_at;
      if (!stepMap[e].last || row.created_at > stepMap[e].last!) stepMap[e].last = row.created_at;
    }

    return Object.entries(stepMap).map(([event_name, s]) => ({
      step: event_name,
      event_name,
      unique_count: s.orgs.size,
      total_count: s.total,
      first_seen_at: s.first ?? null,
      last_seen_at: s.last ?? null,
    }));
  } catch {
    return [];
  }
}
