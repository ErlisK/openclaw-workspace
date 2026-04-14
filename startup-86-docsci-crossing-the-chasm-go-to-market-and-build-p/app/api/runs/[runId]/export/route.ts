/**
 * GET /api/runs/[runId]/export
 *
 * Exports a run as a structured JSON report.
 *
 * Query params:
 *   format=json (default)    — full JSON report
 *   include=findings,snippets,summary (comma-separated, default: all)
 *   resolved=true|false      — filter findings by resolved status
 *   severity=error,warning,info — filter findings by severity (comma-separated)
 *
 * Response: application/json  (Content-Disposition: attachment when ?download=1)
 *
 * Schema:
 * {
 *   schema_version: "1.0",
 *   generated_at: ISO timestamp,
 *   run: { id, project_id, status, branch, commit_sha, ... },
 *   summary: { total_findings, by_severity, by_kind, snippets_total, ... },
 *   findings: [...],
 *   snippets: [...]   (optional, included when include=snippets or include=all)
 * }
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

type Finding = {
  id: string;
  run_id: string;
  project_id: string;
  kind: string;
  severity: string;
  file_path: string;
  line_start: number | null;
  line_end: number | null;
  language: string | null;
  code_snippet: string | null;
  error_message: string | null;
  stdout: string | null;
  stderr: string | null;
  resolved: boolean;
  created_at: string;
};

type SnippetResult = {
  id: string;
  run_id: string;
  file_path: string;
  line_start: number | null;
  line_end: number | null;
  language: string | null;
  code: string | null;
  status: string;
  exit_code: number | null;
  stdout: string | null;
  stderr: string | null;
  error_message: string | null;
  execution_ms: number | null;
};

type Run = {
  id: string;
  project_id: string;
  status: string;
  branch: string;
  commit_sha: string;
  snippets_total: number;
  snippets_passed: number;
  snippets_failed: number;
  drift_detected: boolean;
  duration_ms: number;
  started_at: string;
  completed_at: string | null;
};

export async function GET(
  req: NextRequest,
  { params }: { params: { runId: string } },
) {
  const runId = params.runId;
  const sp = req.nextUrl.searchParams;
  const download = sp.get("download") === "1";
  const includeParam = sp.get("include") || "all";
  const includeAll = includeParam === "all";
  const includeSnippets = includeAll || includeParam.split(",").includes("snippets");
  const includeFindings = includeAll || includeParam.split(",").includes("findings");
  const includeSummary = includeAll || includeParam.split(",").includes("summary");

  const resolvedFilter = sp.get("resolved");
  const severityFilter = sp.get("severity")?.split(",").filter(Boolean) ?? [];

  const db = svc();

  // Fetch run
  const { data: run, error: runErr } = await db
    .from("docsci_runs")
    .select("id, project_id, status, branch, commit_sha, snippets_total, snippets_passed, snippets_failed, drift_detected, duration_ms, started_at, completed_at")
    .eq("id", runId)
    .maybeSingle();

  if (runErr || !run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const typedRun = run as Run;

  // Fetch findings
  let findings: Finding[] = [];
  if (includeFindings) {
    let q = db
      .from("docsci_findings")
      .select("id, run_id, project_id, kind, severity, file_path, line_start, line_end, language, code_snippet, error_message, stdout, stderr, resolved, created_at")
      .eq("run_id", runId)
      .order("severity", { ascending: true })
      .order("file_path", { ascending: true });

    if (resolvedFilter === "true") q = q.eq("resolved", true);
    else if (resolvedFilter === "false") q = q.eq("resolved", false);

    if (severityFilter.length > 0) q = q.in("severity", severityFilter);

    const { data } = await q;
    findings = (data ?? []) as Finding[];
  }

  // Fetch snippet results
  let snippets: SnippetResult[] = [];
  if (includeSnippets) {
    const { data } = await db
      .from("docsci_snippet_results")
      .select("id, run_id, file_path, line_start, line_end, language, code, status, exit_code, stdout, stderr, error_message, execution_ms")
      .eq("run_id", runId)
      .order("file_path")
      .order("line_start");
    snippets = (data ?? []) as SnippetResult[];
  }

  // Build summary
  const bySeverity: Record<string, number> = {};
  const byKind: Record<string, number> = {};
  for (const f of findings) {
    bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
    byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;
  }

  const summary = includeSummary ? {
    total_findings: findings.length,
    unresolved_findings: findings.filter(f => !f.resolved).length,
    resolved_findings: findings.filter(f => f.resolved).length,
    by_severity: bySeverity,
    by_kind: byKind,
    snippets_total: typedRun.snippets_total,
    snippets_passed: typedRun.snippets_passed,
    snippets_failed: typedRun.snippets_failed,
    drift_detected: typedRun.drift_detected,
    duration_ms: typedRun.duration_ms,
  } : undefined;

  const report = {
    schema_version: "1.0",
    generated_at: new Date().toISOString(),
    source: "https://snippetci.com",
    run: typedRun,
    ...(includeSummary && { summary }),
    ...(includeFindings && { findings }),
    ...(includeSnippets && { snippets }),
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
  };
  if (download) {
    headers["Content-Disposition"] = `attachment; filename="docsci-run-${runId.slice(0, 8)}.json"`;
  }

  return new NextResponse(JSON.stringify(report, null, 2), { headers });
}
