import { supabaseAdmin } from "./supabase";
import { evaluateEvent, diffToRawEvent, type RawEvent } from "./rule-engine";
import { diffToFacts, lookupTemplate, logSummaryAudit } from "./summarizer";

// Vendor slugs mapped to each detector type
export const DETECTOR_VENDOR_SLUGS: Record<string, string[]> = {
  workspace: ["google-workspace", "gsuite", "google-admin", "google", "google_workspace"],
  stripe: ["stripe"],
  aws_cloudtrail: ["aws", "amazon-web-services"],
  aws_eventbridge: ["aws", "amazon-web-services"],
  tos_url: [], // Uses connector config.urls
};

export const RISK_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

export interface OrgConnector {
  id: string;
  org_id: string;
  type: "workspace" | "stripe" | "tos_url" | "custom" | "aws_cloudtrail" | "aws_eventbridge";
  vendor_slug?: string;
  label?: string;
  config: {
    domain?: string;
    min_risk?: string;
    urls?: string[];
    vendor_slugs?: string[];
    aws_account_id?: string;
  };
  status: string;
}

interface DiffRow {
  id: string;
  vendor_slug: string;
  risk_level: string;
  risk_category: string;
  title: string;
  description?: string;
  summary?: string;
  source_url?: string;
  detection_method?: string;
  collected_at?: string;
}

/**
 * Run all detectors for an org → create crr_org_alerts.
 * Uses the Rule Engine to classify diffs with richer context.
 */
export async function runDetectorsForOrg(orgId: string): Promise<{
  newAlerts: number;
  connectors: number;
  engine_stats: { evaluated: number; matched: number };
}> {
  const { data: connectors, error } = await supabaseAdmin
    .from("crr_org_connectors")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "active");

  if (error || !connectors?.length) {
    return { newAlerts: 0, connectors: 0, engine_stats: { evaluated: 0, matched: 0 } };
  }

  // Get existing alert diff_ids for this org (dedup)
  const { data: existingAlerts } = await supabaseAdmin
    .from("crr_org_alerts")
    .select("diff_id, title")
    .eq("org_id", orgId)
    .gte("created_at", new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString());

  const existingDiffIds = new Set((existingAlerts ?? []).map((a: { diff_id: string | null }) => a.diff_id).filter(Boolean));
  const existingTitles = new Set((existingAlerts ?? []).map((a: { title: string }) => a.title).filter(Boolean));

  let totalNew = 0;
  let totalEvaluated = 0;
  let totalMatched = 0;

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  for (const connector of connectors as OrgConnector[]) {
    const minRisk = connector.config?.min_risk ?? "medium";
    const minRank = RISK_RANK[minRisk] ?? 2;

    // Determine which vendor slugs this connector covers
    let vendorSlugs: string[] = [];
    if (connector.type === "workspace") vendorSlugs = DETECTOR_VENDOR_SLUGS.workspace;
    else if (connector.type === "stripe") vendorSlugs = DETECTOR_VENDOR_SLUGS.stripe;
    else if (connector.type === "aws_cloudtrail") vendorSlugs = DETECTOR_VENDOR_SLUGS.aws_cloudtrail;
    else if (connector.type === "aws_eventbridge") vendorSlugs = DETECTOR_VENDOR_SLUGS.aws_eventbridge;
    else if (connector.type === "tos_url" && connector.config?.vendor_slugs?.length) {
      vendorSlugs = connector.config.vendor_slugs;
    } else if (connector.type === "custom") {
      vendorSlugs = connector.config?.vendor_slugs ?? [];
    }

    // ── ToS URL connector: custom URL monitoring ──────────────────────────
    if (connector.type === "tos_url" && connector.config?.urls?.length) {
      await processTosDiffs(orgId, connector, existingDiffIds, existingTitles, since, totalNew);
      continue;
    }

    if (!vendorSlugs.length) continue;

    // Pull matching diffs from the last 30 days
    const { data: diffs } = await supabaseAdmin
      .from("crr_diffs")
      .select("id, vendor_slug, risk_level, risk_category, title, description, source_url, detection_method, collected_at")
      .in("vendor_slug", vendorSlugs)
      .gte("collected_at", since)
      .order("collected_at", { ascending: false })
      .limit(200);

    if (!diffs?.length) continue;

    // Filter by min_risk AND dedup
    const newDiffs = (diffs as DiffRow[]).filter(d =>
      RISK_RANK[d.risk_level] >= minRank && !existingDiffIds.has(d.id)
    );

    if (!newDiffs.length) continue;
    totalEvaluated += newDiffs.length;

    // ── Rule Engine evaluation ────────────────────────────────────────────
    const alertRows = [];
    for (const diff of newDiffs) {
      const event: RawEvent = diffToRawEvent({ ...diff, description: diff.description ?? "" });
      const result = await evaluateEvent(event, { orgId });

      if (result.top_match) {
        // Rule engine found a matching rule — use enriched classification + template
        const match = result.top_match;
        if (!existingTitles.has(match.title)) {
          // Build full template output (impact + action)
          const facts = diffToFacts({ ...diff, description: diff.description ?? "" });
          facts.event_name = event.event_name;
          facts.rule_name = match.rule.rule_name;
          facts.confidence_score = match.score;
          facts.match_reason = match.match_reason;
          const { fn, key } = lookupTemplate(facts, match.risk_category, match.rule.detection_method);
          const tpl = fn(facts);

          alertRows.push({
            org_id: orgId,
            diff_id: diff.id,
            vendor_slug: diff.vendor_slug,
            risk_level: match.risk_level,
            risk_category: match.risk_category,
            severity: match.severity,
            title: tpl.title.includes("change detected") ? match.title : tpl.title,
            summary: tpl.summary,
            impact_text: tpl.impact,
            action_text: tpl.action,
            source_url: diff.source_url ?? "",
            confidence: Math.round(match.score * 1000) / 1000,
            raw_facts: facts,
            template_key: key,
            summary_method: "template",
            detection_method: match.rule.detection_method,
          });
          existingDiffIds.add(diff.id);
          existingTitles.add(match.title);
          totalMatched++;
        }
      } else {
        // No rule match: fall back to diff's own classification (passthrough)
        const fallbackTitle = diff.title;
        if (!existingTitles.has(fallbackTitle)) {
          const facts = diffToFacts({ ...diff, description: diff.description ?? "" });
          const { fn, key } = lookupTemplate(facts, diff.risk_category, diff.detection_method);
          const tpl = fn(facts);
          alertRows.push({
            org_id: orgId,
            diff_id: diff.id,
            vendor_slug: diff.vendor_slug,
            risk_level: diff.risk_level,
            risk_category: diff.risk_category,
            severity: diff.risk_level === "high" ? "critical" : "high",
            title: tpl.title.includes("change detected") ? fallbackTitle : tpl.title,
            summary: tpl.summary || diff.description || diff.summary || "",
            impact_text: tpl.impact,
            action_text: tpl.action,
            source_url: diff.source_url ?? "",
            raw_facts: facts,
            template_key: key,
            summary_method: "passthrough",
            detection_method: diff.detection_method,
          });
          existingDiffIds.add(diff.id);
          existingTitles.add(fallbackTitle);
        }
      }
    }

    if (alertRows.length) {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("crr_org_alerts")
        .insert(alertRows)
        .select("id, org_id, template_key, summary_method");
      if (!insertError) {
        totalNew += alertRows.length;
        // Log audit entries async (no await)
        for (const row of (inserted ?? [])) {
          logSummaryAudit(row.id, orgId, {
            title: "", summary: "", impact: "", action: "",
            method: row.summary_method as "template" | "passthrough",
            templateKey: row.template_key ?? "unknown",
            rawFacts: {},
          }, 0);
        }
      }
    }

    // Update connector metadata
    await supabaseAdmin
      .from("crr_org_connectors")
      .update({
        last_run_at: new Date().toISOString(),
        last_diff_count: newDiffs.length,
      })
      .eq("id", connector.id);
  }

  return {
    newAlerts: totalNew,
    connectors: connectors.length,
    engine_stats: { evaluated: totalEvaluated, matched: totalMatched },
  };
}

// ─── ToS URL processing (unchanged from original) ────────────────────────────
async function processTosDiffs(
  orgId: string,
  connector: OrgConnector,
  existingDiffIds: Set<string | null>,
  existingTitles: Set<string>,
  since: string,
  _totalNew: number
): Promise<number> {
  const urls = connector.config?.urls ?? [];
  const urlPatterns = urls.map((u: string) => {
    try { return new URL(u).hostname; } catch { return u; }
  });

  const { data: allDiffs } = await supabaseAdmin
    .from("crr_diffs")
    .select("id, vendor_slug, risk_level, risk_category, title, description, source_url, detection_method")
    .gte("collected_at", since)
    .order("collected_at", { ascending: false })
    .limit(500);

  const matching = (allDiffs ?? []).filter((d: DiffRow) =>
    urlPatterns.some((p: string) => d.source_url?.includes(p)) &&
    !existingDiffIds.has(d.id)
  );

  if (!matching.length) return 0;

  const alertRows = matching
    .filter((d: DiffRow) => !existingTitles.has(d.title))
    .map((d: DiffRow) => ({
      org_id: orgId,
      diff_id: d.id,
      vendor_slug: d.vendor_slug,
      risk_level: d.risk_level,
      risk_category: d.risk_category,
      severity: d.risk_level === "high" ? "critical" : "high",
      title: d.title,
      summary: d.description ?? d.summary ?? "",
      source_url: d.source_url ?? "",
    }));

  if (alertRows.length) {
    await supabaseAdmin.from("crr_org_alerts").insert(alertRows);
  }
  return alertRows.length;
}
