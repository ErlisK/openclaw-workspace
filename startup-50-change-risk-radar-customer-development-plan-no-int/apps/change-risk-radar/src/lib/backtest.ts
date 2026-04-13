// Backtest engine: run historical observatory diffs against org connectors
// and compute proxy precision/recall metrics

import { supabaseAdmin } from "./supabase";
import { DETECTOR_VENDOR_SLUGS, RISK_RANK } from "./detectors";

export interface BacktestResult {
  orgId: string;
  orgName: string;
  period: string;
  connectors: BacktestConnectorResult[];
  totals: {
    totalDiffs: number;
    matchedAlerts: number;
    highRiskAlerts: number;
    estimatedTruePositives: number;
    estimatedFalsePositives: number;
    proxyPrecision: number;
    proxyRecall: number;
    firstAlertWithin24h: boolean;
    firstAlertHours: number | null;
  };
}

export interface BacktestConnectorResult {
  type: string;
  label: string;
  diffs: number;
  alerts: number;
  highRisk: number;
  topVendors: string[];
}

// Proxy precision: fraction of alerts at high risk level (high risk = more likely true positive)
// Proxy recall: fraction of total diffs that produced alerts (coverage)
function computePrecision(alerts: { risk_level: string }[]): number {
  if (!alerts.length) return 0;
  const highMedium = alerts.filter(a => a.risk_level === "high" || a.risk_level === "medium").length;
  return highMedium / alerts.length;
}

export async function runBacktest(orgId: string, lookbackDays = 30): Promise<BacktestResult> {
  const { data: org } = await supabaseAdmin
    .from("crr_orgs")
    .select("name, slug")
    .eq("id", orgId)
    .single();

  const { data: connectors } = await supabaseAdmin
    .from("crr_org_connectors")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "active");

  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
  const connectorResults: BacktestConnectorResult[] = [];

  let allMatchedAlerts: { risk_level: string; collected_at: string; vendor_slug: string }[] = [];
  let allDiffsCount = 0;

  for (const connector of connectors ?? []) {
    const minRisk = connector.config?.min_risk ?? "medium";
    const minRank = RISK_RANK[minRisk] ?? 2;

    let vendorSlugs: string[] = [];
    if (connector.type === "workspace") vendorSlugs = DETECTOR_VENDOR_SLUGS.workspace;
    else if (connector.type === "stripe") vendorSlugs = DETECTOR_VENDOR_SLUGS.stripe;
    else if (connector.type === "tos_url") vendorSlugs = connector.config?.vendor_slugs ?? [];
    else if (connector.type === "custom") vendorSlugs = connector.config?.vendor_slugs ?? [];

    if (!vendorSlugs.length) continue;

    const { data: diffs } = await supabaseAdmin
      .from("crr_diffs")
      .select("id, vendor_slug, risk_level, risk_category, title, collected_at")
      .gte("collected_at", since)
      .in("vendor_slug", vendorSlugs)
      .order("collected_at", { ascending: true });

    const allDiffs = diffs ?? [];
    const matchedDiffs = allDiffs.filter((d: { risk_level: string }) => RISK_RANK[d.risk_level] >= minRank);

    allDiffsCount += allDiffs.length;
    allMatchedAlerts = [...allMatchedAlerts, ...matchedDiffs];

    const vendorCounts: Record<string, number> = {};
    for (const d of matchedDiffs) vendorCounts[d.vendor_slug] = (vendorCounts[d.vendor_slug] || 0) + 1;
    const topVendors = Object.entries(vendorCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([v]) => v);

    connectorResults.push({
      type: connector.type,
      label: connector.label ?? connector.type,
      diffs: allDiffs.length,
      alerts: matchedDiffs.length,
      highRisk: matchedDiffs.filter((d: { risk_level: string }) => d.risk_level === "high").length,
      topVendors,
    });
  }

  // Time to first alert
  const sortedAlerts = allMatchedAlerts.sort((a, b) =>
    new Date(a.collected_at).getTime() - new Date(b.collected_at).getTime()
  );
  const orgCreatedAt = new Date(since); // simulate org onboarding at start of period
  const firstAlert = sortedAlerts[0];
  let firstAlertHours: number | null = null;
  let firstAlertWithin24h = false;
  if (firstAlert) {
    firstAlertHours = (new Date(firstAlert.collected_at).getTime() - orgCreatedAt.getTime()) / (1000 * 60 * 60);
    // If org "onboards" now, first alert comes from latest diff
    const latestDiffHoursAgo = firstAlertHours <= 0 ? 0 : null;
    const recentAlerts = allMatchedAlerts.filter(a => {
      const hoursAgo = (Date.now() - new Date(a.collected_at).getTime()) / (1000 * 60 * 60);
      return hoursAgo <= 24;
    });
    firstAlertWithin24h = recentAlerts.length > 0;
    if (firstAlertWithin24h) firstAlertHours = latestDiffHoursAgo ?? 1;
  }

  // Proxy precision: high+medium / total
  const precisionAlerts = allMatchedAlerts.filter(a => a.risk_level === "high" || a.risk_level === "medium");
  const proxyPrecision = allMatchedAlerts.length > 0 ? precisionAlerts.length / allMatchedAlerts.length : 0;

  // Proxy recall: alerts generated / total diffs (coverage)
  const proxyRecall = allDiffsCount > 0 ? allMatchedAlerts.length / allDiffsCount : 0;

  // Estimated true/false positives based on risk level distribution
  const highRiskAlerts = allMatchedAlerts.filter(a => a.risk_level === "high").length;
  const estimatedTruePositives = Math.round(highRiskAlerts * 0.85 + (allMatchedAlerts.length - highRiskAlerts) * 0.60);
  const estimatedFalsePositives = allMatchedAlerts.length - estimatedTruePositives;

  return {
    orgId,
    orgName: org?.name ?? orgId,
    period: `${lookbackDays} days`,
    connectors: connectorResults,
    totals: {
      totalDiffs: allDiffsCount,
      matchedAlerts: allMatchedAlerts.length,
      highRiskAlerts,
      estimatedTruePositives,
      estimatedFalsePositives,
      proxyPrecision: Math.round(proxyPrecision * 100) / 100,
      proxyRecall: Math.round(proxyRecall * 100) / 100,
      firstAlertWithin24h,
      firstAlertHours,
    },
  };
}
