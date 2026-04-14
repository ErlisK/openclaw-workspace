/**
 * GET /api/metrics
 *
 * Aggregated run metrics for the dashboard.
 * Query params:
 *   project_id   — filter by project (optional)
 *   org_id       — filter by org (optional)
 *   days         — lookback window in days (default: 30, max: 90)
 *   granularity  — "day" | "week" (default: day)
 *
 * Response:
 * {
 *   summary: {
 *     total_runs, passed_runs, failed_runs, pass_rate_pct,
 *     total_findings, avg_duration_ms, avg_findings_per_run,
 *     snippets_total, snippets_passed, snippets_failed,
 *     drift_detected_count
 *   },
 *   time_series: [{ date, runs, passed, failed, findings }],
 *   finding_breakdown: { by_severity, by_kind },
 *   top_failing_files: [{ file_path, error_count }],
 *   recent_runs: [{ id, status, branch, duration_ms, finding_count, completed_at }]
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function svc() {
  return createServiceClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!,
  );
}

export async function GET(req: NextRequest) {
  try { await requireUser() } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const sp = req.nextUrl.searchParams;
  const projectId = sp.get("project_id");
  const orgId = sp.get("org_id");
  const days = Math.min(parseInt(sp.get("days") ?? "30"), 90);
  const granularity = sp.get("granularity") === "week" ? "week" : "day";

  const db = svc();
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  // ── Runs query ─────────────────────────────────────────────────────────────
  let runsQ = db
    .from("docsci_runs")
    .select("id, status, branch, commit_sha, snippets_total, snippets_passed, snippets_failed, drift_detected, duration_ms, started_at, completed_at, project_id")
    .gte("started_at", since)
    .order("started_at", { ascending: false });

  if (projectId) runsQ = runsQ.eq("project_id", projectId);

  const { data: runs } = await runsQ;
  const allRuns = runs ?? [];

  // ── Findings query ─────────────────────────────────────────────────────────
  const runIds = allRuns.map(r => r.id);
  let findings: Array<{ kind: string; severity: string; file_path: string; run_id: string }> = [];
  if (runIds.length > 0) {
    let fQ = db
      .from("docsci_findings")
      .select("kind, severity, file_path, run_id")
      .in("run_id", runIds);
    const { data: fd } = await fQ;
    findings = (fd ?? []) as typeof findings;
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const totalRuns = allRuns.length;
  const passedRuns = allRuns.filter(r => r.status === "passed").length;
  const failedRuns = allRuns.filter(r => r.status === "failed").length;
  const passRatePct = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 100) : 100;
  const totalFindings = findings.length;
  const avgDurationMs = totalRuns > 0
    ? Math.round(allRuns.reduce((a, r) => a + (r.duration_ms ?? 0), 0) / totalRuns)
    : 0;
  const avgFindingsPerRun = totalRuns > 0 ? parseFloat((totalFindings / totalRuns).toFixed(1)) : 0;
  const snippetsTotal = allRuns.reduce((a, r) => a + (r.snippets_total ?? 0), 0);
  const snippetsPassed = allRuns.reduce((a, r) => a + (r.snippets_passed ?? 0), 0);
  const snippetsFailed = allRuns.reduce((a, r) => a + (r.snippets_failed ?? 0), 0);
  const driftCount = allRuns.filter(r => r.drift_detected).length;

  // ── Time series ────────────────────────────────────────────────────────────
  const buckets: Record<string, { date: string; runs: number; passed: number; failed: number; findings: number }> = {};
  for (const run of allRuns) {
    const d = new Date(run.started_at);
    let key: string;
    if (granularity === "week") {
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
      key = monday.toISOString().slice(0, 10);
    } else {
      key = d.toISOString().slice(0, 10);
    }
    if (!buckets[key]) buckets[key] = { date: key, runs: 0, passed: 0, failed: 0, findings: 0 };
    buckets[key].runs++;
    if (run.status === "passed") buckets[key].passed++;
    else buckets[key].failed++;
  }
  for (const f of findings) {
    const run = allRuns.find(r => r.id === f.run_id);
    if (run) {
      const d = new Date(run.started_at);
      const key = d.toISOString().slice(0, 10);
      if (buckets[key]) buckets[key].findings++;
    }
  }
  const timeSeries = Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));

  // ── Finding breakdown ──────────────────────────────────────────────────────
  const bySeverity: Record<string, number> = {};
  const byKind: Record<string, number> = {};
  for (const f of findings) {
    bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
    byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;
  }

  // ── Top failing files ──────────────────────────────────────────────────────
  const fileErrors: Record<string, number> = {};
  for (const f of findings) {
    fileErrors[f.file_path] = (fileErrors[f.file_path] ?? 0) + 1;
  }
  const topFailingFiles = Object.entries(fileErrors)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([file_path, error_count]) => ({ file_path, error_count }));

  // ── Recent runs ────────────────────────────────────────────────────────────
  const findingsByRun: Record<string, number> = {};
  for (const f of findings) findingsByRun[f.run_id] = (findingsByRun[f.run_id] ?? 0) + 1;

  const recentRuns = allRuns.slice(0, 10).map(r => ({
    id: r.id,
    status: r.status,
    branch: r.branch,
    commit_sha: r.commit_sha?.slice(0, 8),
    duration_ms: r.duration_ms,
    finding_count: findingsByRun[r.id] ?? 0,
    snippets_total: r.snippets_total,
    snippets_failed: r.snippets_failed,
    completed_at: r.completed_at,
    project_id: r.project_id,
  }));

  return NextResponse.json({
    window_days: days,
    since,
    summary: {
      total_runs: totalRuns,
      passed_runs: passedRuns,
      failed_runs: failedRuns,
      pass_rate_pct: passRatePct,
      total_findings: totalFindings,
      avg_duration_ms: avgDurationMs,
      avg_findings_per_run: avgFindingsPerRun,
      snippets_total: snippetsTotal,
      snippets_passed: snippetsPassed,
      snippets_failed: snippetsFailed,
      drift_detected_count: driftCount,
    },
    time_series: timeSeries,
    finding_breakdown: {
      by_severity: bySeverity,
      by_kind: byKind,
    },
    top_failing_files: topFailingFiles,
    recent_runs: recentRuns,
  });
}
