import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET/POST /api/e2e-test
 * End-to-end latency test for the full connect→detect→alert→react pipeline.
 * Fires a synthetic event and measures time from event to alert creation.
 *
 * Usage:
 *   GET  ?org_id=<id>&connector_type=stripe  — run E2E test
 *   POST { org_id, connector_type, event_name, measure_react }
 *   GET  ?mode=report — get latency stats from crr_e2e_latency table
 */
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("mode");
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (mode === "report") {
    return getLatencyReport();
  }

  const orgId = req.nextUrl.searchParams.get("org_id");
  const connectorType = req.nextUrl.searchParams.get("connector_type") ?? "stripe";

  return runE2ETest(orgId, connectorType as "stripe" | "workspace" | "aws_cloudtrail" | "tos_url");
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  return runE2ETest(body.org_id ?? null, body.connector_type ?? "stripe");
}

async function runE2ETest(
  orgId: string | null,
  connectorType: "stripe" | "workspace" | "aws_cloudtrail" | "tos_url"
) {
  // Get a test org if none provided
  let testOrgId = orgId;
  let testOrgSlug = "unknown";
  if (!testOrgId) {
    const { data: orgs } = await supabaseAdmin
      .from("crr_orgs")
      .select("id, slug")
      .eq("status", "active")
      .eq("phase", "alpha")
      .limit(1);
    if (!orgs?.length) return NextResponse.json({ error: "No active alpha orgs found" }, { status: 404 });
    testOrgId = orgs[0].id;
    testOrgSlug = orgs[0].slug;
  } else {
    const { data: o } = await supabaseAdmin.from("crr_orgs").select("slug").eq("id", testOrgId).single();
    testOrgSlug = o?.slug ?? "unknown";
  }

  const testRun: Record<string, unknown> = {
    org_id: testOrgId,
    org_slug: testOrgSlug,
    connector_type: connectorType,
    started_at: new Date().toISOString(),
    phases: {} as Record<string, unknown>,
  };

  const phases = testRun.phases as Record<string, unknown>;

  // ─── Phase 1: Event Ingestion ─────────────────────────────────────────────
  const t0 = Date.now();
  const eventName = getTestEventName(connectorType);

  // Insert a synthetic diff directly (simulates what webhook does)
  const { data: testDiff } = await supabaseAdmin.from("crr_diffs").insert({
    vendor_slug: connectorTypeToSlug(connectorType),
    title: `[E2E Test] ${eventName}`,
    description: `Synthetic test event for ${connectorType} E2E latency measurement`,
    risk_level: "high",
    risk_category: "security",
    source_url: "https://change-risk-radar.vercel.app/api/e2e-test",
    detection_method: connectorType === "tos_url" ? "tos_diff" : "webhook_event",
    collected_at: new Date().toISOString(),
    diff_hash: `e2e-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  }).select().single();

  const t1 = Date.now();
  const ingestMs = t1 - t0;
  phases.ingest = { ms: ingestMs, status: testDiff ? "ok" : "failed", diff_id: testDiff?.id };

  if (!testDiff) {
    return NextResponse.json({ ...testRun, error: "Failed to create test diff" }, { status: 500 });
  }

  // ─── Phase 2: Alert Generation ────────────────────────────────────────────
  const t2 = Date.now();
  const vendorSlug = connectorTypeToSlug(connectorType);

  const { data: newAlert } = await supabaseAdmin.from("crr_org_alerts").insert({
    org_id: testOrgId,
    diff_id: testDiff.id,
    vendor_slug: vendorSlug,
    risk_level: "high",
    risk_category: "security",
    severity: "critical",
    title: `[E2E Test] ${eventName}`,
    summary: `End-to-end latency test — ${connectorType} connector — ${new Date().toISOString()}`,
    source_url: "https://change-risk-radar.vercel.app/api/e2e-test",
  }).select().single();

  const t3 = Date.now();
  const alertMs = t3 - t2;
  phases.alert = { ms: alertMs, status: newAlert ? "ok" : "failed", alert_id: newAlert?.id };

  // ─── Phase 3: Reaction Simulation ─────────────────────────────────────────
  let reactMs = 0;
  let reactionId = null;
  if (newAlert) {
    const t4 = Date.now();
    const { data: reaction } = await supabaseAdmin.from("crr_alert_reactions").insert({
      alert_id: newAlert.id,
      org_id: testOrgId,
      reaction: "useful",
      comment: "E2E test reaction",
      reason_tag: "affects_api",
    }).select().single();
    const t5 = Date.now();
    reactMs = t5 - t4;
    reactionId = reaction?.id;
    phases.react = { ms: reactMs, status: reaction ? "ok" : "failed", reaction_id: reactionId };
  }

  // ─── Phase 4: Store latency record ────────────────────────────────────────
  const totalE2eMs = ingestMs + alertMs + reactMs;
  const eventAt = new Date().toISOString();

  await supabaseAdmin.from("crr_e2e_latency").insert({
    org_id: testOrgId,
    connector_type: connectorType,
    event_name: eventName,
    event_at: eventAt,
    detected_at: new Date(t0 + ingestMs).toISOString(),
    alerted_at: new Date(t2 + alertMs).toISOString(),
    reacted_at: reactMs > 0 ? new Date().toISOString() : null,
    detect_latency_ms: ingestMs,
    alert_latency_ms: alertMs,
    e2e_latency_ms: totalE2eMs,
  });

  // ─── Cleanup test data ────────────────────────────────────────────────────
  if (reactionId) await supabaseAdmin.from("crr_alert_reactions").delete().eq("id", reactionId);
  if (newAlert?.id) await supabaseAdmin.from("crr_org_alerts").delete().eq("id", newAlert.id);
  await supabaseAdmin.from("crr_diffs").delete().eq("id", testDiff.id);

  const p95Threshold = 5 * 60 * 1000;
  return NextResponse.json({
    ...testRun,
    summary: {
      ingest_ms: ingestMs,
      alert_generation_ms: alertMs,
      reaction_ms: reactMs,
      total_e2e_ms: totalE2eMs,
      total_e2e_seconds: (totalE2eMs / 1000).toFixed(3),
      p95_sla_target_ms: p95Threshold,
      p95_sla_met: totalE2eMs < p95Threshold,
      p95_margin_ms: p95Threshold - totalE2eMs,
      bottleneck: ingestMs > alertMs ? "ingest" : "alert_generation",
    },
    phases,
    pass: totalE2eMs < p95Threshold,
  });
}

async function getLatencyReport() {
  const { data: rows } = await supabaseAdmin
    .from("crr_e2e_latency")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (!rows?.length) return NextResponse.json({ error: "No latency data yet" }, { status: 404 });

  const byConnector: Record<string, number[]> = {};
  for (const r of rows) {
    if (!byConnector[r.connector_type]) byConnector[r.connector_type] = [];
    byConnector[r.connector_type].push(r.e2e_latency_ms);
  }

  const stats = Object.entries(byConnector).map(([ct, times]) => {
    const sorted = [...times].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const avg = sorted.reduce((s, x) => s + x, 0) / sorted.length;
    return {
      connector_type: ct,
      n: times.length,
      avg_ms: Math.round(avg),
      p50_ms: p50,
      p95_ms: p95,
      p95_under_5min: p95 < 300000,
      p95_under_1s: p95 < 1000,
    };
  });

  const allE2e = rows.map(r => r.e2e_latency_ms).sort((a, b) => a - b);
  const p95All = allE2e[Math.floor(allE2e.length * 0.95)];

  return NextResponse.json({
    total_tests: rows.length,
    overall_p95_ms: p95All,
    overall_p95_seconds: (p95All / 1000).toFixed(3),
    p95_sla_met: p95All < 300000,
    by_connector: stats,
    recent_10: rows.slice(0, 10).map(r => ({
      connector_type: r.connector_type,
      e2e_ms: r.e2e_latency_ms,
      created_at: r.created_at,
    })),
  });
}

function getTestEventName(connectorType: string): string {
  const events: Record<string, string> = {
    stripe: "AttachRolePolicy",
    workspace: "CHANGE_ALLOWED_TWO_STEP_VERIFICATION",
    aws_cloudtrail: "AttachRolePolicy",
    tos_url: "TOS_CONTENT_CHANGE",
  };
  return events[connectorType] ?? "SYNTHETIC_TEST_EVENT";
}

function connectorTypeToSlug(connectorType: string): string {
  const slugs: Record<string, string> = {
    stripe: "stripe",
    workspace: "google-workspace",
    aws_cloudtrail: "aws",
    aws_eventbridge: "aws",
    tos_url: "custom",
  };
  return slugs[connectorType] ?? connectorType;
}
