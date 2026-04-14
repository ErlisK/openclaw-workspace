/**
 * GET /api/runs/[runId]
 * Returns run details + findings summary + export links.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function svc() {
  return createServiceClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!,
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const runId = params.id;
  const db = svc();

  const { data: run, error } = await db
    .from("docsci_runs")
    .select("id, project_id, status, branch, commit_sha, snippets_total, snippets_passed, snippets_failed, drift_detected, duration_ms, started_at, completed_at")
    .eq("id", runId)
    .maybeSingle();

  if (error || !run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const { data: findingSummary } = await db
    .from("docsci_findings")
    .select("severity, resolved")
    .eq("run_id", runId);

  const findings = findingSummary ?? [];
  const bySeverity: Record<string, number> = {};
  for (const f of findings) {
    bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
  }

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://snippetci.com";

  return NextResponse.json({
    ...run,
    finding_count: findings.length,
    findings_by_severity: bySeverity,
    export_links: {
      json: `${APP_URL}/api/runs/${runId}/export`,
      json_download: `${APP_URL}/api/runs/${runId}/export?download=1`,
      sarif: `${APP_URL}/api/runs/${runId}/sarif`,
      sarif_download: `${APP_URL}/api/runs/${runId}/sarif?download=1`,
    },
  });
}
