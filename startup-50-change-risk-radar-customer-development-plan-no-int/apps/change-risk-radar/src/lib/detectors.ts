import { supabaseAdmin } from "./supabase";

// Vendor slugs mapped to each detector type
export const DETECTOR_VENDOR_SLUGS: Record<string, string[]> = {
  workspace: ["google-workspace", "gsuite", "google-admin", "google", "google_workspace"],
  stripe: ["stripe"],
  tos_url: [], // Uses connector config.urls
};

export const RISK_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

export interface OrgConnector {
  id: string;
  org_id: string;
  type: "workspace" | "stripe" | "tos_url" | "custom";
  vendor_slug?: string;
  label?: string;
  config: {
    domain?: string;     // for workspace
    min_risk?: string;   // high | medium | low
    urls?: string[];     // for tos_url
    vendor_slugs?: string[]; // for custom
  };
  status: string;
}

// Run all detectors for an org → create crr_org_alerts
export async function runDetectorsForOrg(orgId: string): Promise<{
  newAlerts: number;
  connectors: number;
}> {
  // Fetch org connectors
  const { data: connectors, error } = await supabaseAdmin
    .from("crr_org_connectors")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "active");

  if (error || !connectors?.length) return { newAlerts: 0, connectors: 0 };

  // Get existing alert diff_ids for this org (avoid duplication)
  const { data: existingAlerts } = await supabaseAdmin
    .from("crr_org_alerts")
    .select("diff_id")
    .eq("org_id", orgId);
  const existingDiffIds = new Set((existingAlerts ?? []).map((a: { diff_id: string }) => a.diff_id).filter(Boolean));

  let totalNew = 0;

  for (const connector of connectors as OrgConnector[]) {
    const minRisk = connector.config?.min_risk ?? "medium";
    const minRank = RISK_RANK[minRisk] ?? 2;

    let vendorSlugs: string[] = [];
    if (connector.type === "workspace") vendorSlugs = DETECTOR_VENDOR_SLUGS.workspace;
    else if (connector.type === "stripe") vendorSlugs = DETECTOR_VENDOR_SLUGS.stripe;
    else if (connector.type === "tos_url") vendorSlugs = connector.config?.vendor_slugs ?? [];
    else if (connector.type === "custom") vendorSlugs = connector.config?.vendor_slugs ?? [];

    if (!vendorSlugs.length && connector.type !== "tos_url") continue;

    // Pull matching diffs from last 30 days
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    let query = supabaseAdmin
      .from("crr_diffs")
      .select("id, vendor_slug, risk_level, risk_category, title, description, source_url, collected_at")
      .gte("collected_at", since)
      .order("collected_at", { ascending: false })
      .limit(200);

    if (vendorSlugs.length) {
      query = query.in("vendor_slug", vendorSlugs);
    }

    // For tos_url type with custom URLs, look for matching source_url patterns
    if (connector.type === "tos_url" && connector.config?.urls?.length) {
      const urlPatterns = connector.config.urls.map((u: string) => {
        try { return new URL(u).hostname; } catch { return u; }
      });
      // Pull all recent diffs and filter client-side (Supabase doesn't support array LIKE)
      const { data: allDiffs } = await supabaseAdmin
        .from("crr_diffs")
        .select("id, vendor_slug, risk_level, risk_category, title, description, source_url, collected_at")
        .gte("collected_at", since)
        .order("collected_at", { ascending: false })
        .limit(500);

      const matching = (allDiffs ?? []).filter((d: { source_url?: string; diff_id?: string }) =>
        urlPatterns.some((p: string) => d.source_url?.includes(p)) && !existingDiffIds.has(d.diff_id ?? "")
      );

      const newAlerts = matching.map((d: {
        id: string; vendor_slug: string; risk_level: string; risk_category: string;
        title: string; description?: string; source_url?: string;
      }) => ({
        org_id: orgId,
        diff_id: d.id,
        vendor_slug: d.vendor_slug,
        risk_level: d.risk_level,
        risk_category: d.risk_category,
        title: d.title,
        summary: d.description ?? (d as any).summary,
        source_url: d.source_url,
      }));

      if (newAlerts.length) {
        await supabaseAdmin.from("crr_org_alerts").insert(newAlerts);
        totalNew += newAlerts.length;
      }
      continue;
    }

    const { data: diffs } = await query;
    if (!diffs?.length) continue;

    const newDiffs = diffs.filter((d: { id: string; risk_level: string }) =>
      RISK_RANK[d.risk_level] >= minRank && !existingDiffIds.has(d.id)
    );

    if (!newDiffs.length) continue;

    const alertRows = newDiffs.map((d: {
      id: string; vendor_slug: string; risk_level: string; risk_category: string;
      title: string; description?: string; source_url?: string;
    }) => ({
      org_id: orgId,
      diff_id: d.id,
      vendor_slug: d.vendor_slug,
      risk_level: d.risk_level,
      risk_category: d.risk_category,
      title: d.title,
      summary: d.description ?? (d as any).summary,
      source_url: d.source_url,
    }));

    await supabaseAdmin.from("crr_org_alerts").insert(alertRows);
    newDiffs.forEach((d: { id: string }) => existingDiffIds.add(d.id));
    totalNew += alertRows.length;

    // Update connector last_run
    await supabaseAdmin
      .from("crr_org_connectors")
      .update({ last_run_at: new Date().toISOString(), last_diff_count: newDiffs.length })
      .eq("id", connector.id);
  }

  return { newAlerts: totalNew, connectors: connectors.length };
}
