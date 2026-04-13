import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/alerts/instant — Immediately generate alerts for an org.
 * Used by webhooks after processing real-time events (Stripe, Workspace, CloudTrail).
 * Targets p95 latency ≤ 5 minutes end-to-end.
 *
 * Called internally by webhook handlers to skip the 6h cron cycle.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const token = req.headers.get("x-org-token") || req.nextUrl.searchParams.get("token");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";

  let orgId: string | null = null;

  if (auth === `Bearer ${secret}`) {
    // Admin/internal: can specify any org
    const body = await req.json().catch(() => ({}));
    orgId = body.org_id ?? null;
  } else if (token) {
    const { data: org } = await supabaseAdmin
      .from("crr_orgs")
      .select("id")
      .eq("magic_token", token)
      .eq("status", "active")
      .single();
    orgId = org?.id ?? null;
  }

  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const start = Date.now();

  // Get recent unprocessed diffs from last 10 minutes (hot path after webhook)
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: recentDiffs } = await supabaseAdmin
    .from("crr_diffs")
    .select("id, vendor_slug, title, description, risk_level, risk_category, source_url, diff_hash")
    .gte("collected_at", cutoff)
    .in("risk_level", ["high", "medium"])
    .order("collected_at", { ascending: false })
    .limit(50);

  // Get connectors for this org
  const { data: connectors } = await supabaseAdmin
    .from("crr_org_connectors")
    .select("type, vendor_slug")
    .eq("org_id", orgId)
    .eq("status", "active");

  const connectorVendors = new Set(
    (connectors ?? []).flatMap((c: { type: string; vendor_slug: string | null }) => {
      if (c.type === "stripe") return ["stripe"];
      if (c.type === "workspace") return ["google-workspace", "google", "gsuite"];
      if (c.type === "aws_cloudtrail") return ["aws", "amazon-web-services"];
      if (c.type === "tos_url") return [];  // uses ToS detector separately
      return [c.vendor_slug].filter(Boolean) as string[];
    })
  );

  // Get existing alert hashes to avoid duplication
  const { data: existingAlerts } = await supabaseAdmin
    .from("crr_org_alerts")
    .select("diff_id")
    .eq("org_id", orgId)
    .gte("created_at", cutoff);

  const existingDiffIds = new Set((existingAlerts ?? []).map((a: { diff_id: string | null }) => a.diff_id));

  let newAlerts = 0;
  for (const diff of recentDiffs ?? []) {
    if (existingDiffIds.has(diff.id)) continue;
    if (!connectorVendors.has(diff.vendor_slug)) continue;

    await supabaseAdmin.from("crr_org_alerts").insert({
      org_id: orgId,
      diff_id: diff.id,
      vendor_slug: diff.vendor_slug,
      risk_level: diff.risk_level,
      risk_category: diff.risk_category,
      severity: diff.risk_level === "high" ? "critical" : "high",
      title: diff.title,
      summary: diff.description,
      source_url: diff.source_url,
    });
    newAlerts++;
  }

  // Also check for unprocessed CloudTrail events for this org
  const { data: pendingCTEvents } = await supabaseAdmin
    .from("crr_cloudtrail_events")
    .select("id, event_name, risk_level, risk_category, title, summary, event_time")
    .eq("org_id", orgId)
    .eq("processed", true)
    .eq("alert_generated", true)
    .gte("created_at", cutoff)
    .limit(20);

  for (const evt of pendingCTEvents ?? []) {
    const { data: existing } = await supabaseAdmin
      .from("crr_org_alerts")
      .select("id")
      .eq("org_id", orgId)
      .eq("title", evt.title)
      .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
      .limit(1);

    if (existing?.length) continue;

    await supabaseAdmin.from("crr_org_alerts").insert({
      org_id: orgId,
      vendor_slug: "aws",
      risk_level: evt.risk_level,
      risk_category: evt.risk_category,
      severity: evt.risk_level === "high" ? "critical" : "high",
      title: evt.title,
      summary: evt.summary,
      source_url: "https://console.aws.amazon.com/cloudtrail/home",
      created_at: evt.event_time,
    });
    newAlerts++;
  }

  const latencyMs = Date.now() - start;

  return NextResponse.json({
    ok: true,
    org_id: orgId,
    new_alerts: newAlerts,
    latency_ms: latencyMs,
    latency_target_met: latencyMs < 5 * 60 * 1000,
    timestamp: new Date().toISOString(),
  });
}
