/**
 * GET /api/demo-run/patch?run_id=<id>&finding=<id>
 *
 * Runs a fresh sample pipeline and returns a downloadable .patch file
 * for the specified finding. If no finding is specified, returns a
 * combined patch for all findings with patch_diff.
 */
import { NextResponse } from "next/server";
import { runSampleRepoPipeline } from "@/lib/sample-runner";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const findingId = url.searchParams.get("finding");

  // Run the pipeline to get fresh findings (deterministic)
  let result;
  try {
    result = await runSampleRepoPipeline(false);
  } catch (err) {
    return NextResponse.json({ error: "Failed to generate patch", detail: String(err) }, { status: 500 });
  }

  const findings = findingId
    ? result.findings.filter(f => f.id === findingId || f.id.includes(findingId))
    : result.findings.filter(f => f.patch_diff);

  if (findings.length === 0) {
    return NextResponse.json({ error: "No findings with patch diffs found", run_id: result.run_id }, { status: 404 });
  }

  // Build a unified patch file
  const patchContent = [
    `# DocsCI Patch — Sample Repo Demo`,
    `# Run ID: ${result.run_id}`,
    `# Generated: ${result.completed_at}`,
    `# Findings: ${findings.length}`,
    `# Duration: ${result.duration_ms}ms`,
    ``,
    ...findings.map(f => [
      `# === Finding: ${f.id} ===`,
      `# Kind: ${f.kind} | Severity: ${f.severity}`,
      `# File: ${f.file_path}:${f.line_start}`,
      `# ${f.title}`,
      `#`,
      `# ${f.description.replace(/\n/g, "\n# ")}`,
      ``,
      f.patch_diff ?? `# No patch available for this finding`,
      ``,
    ].join("\n")),
  ].join("\n");

  const filename = findingId
    ? `docsci-fix-${findingId.slice(0, 20)}.patch`
    : `docsci-all-fixes-${result.run_id}.patch`;

  return new Response(patchContent, {
    headers: {
      "Content-Type": "text/x-patch",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
