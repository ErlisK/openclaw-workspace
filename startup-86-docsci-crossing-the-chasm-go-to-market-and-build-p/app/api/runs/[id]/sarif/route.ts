/**
 * GET /api/runs/[runId]/sarif
 *
 * Exports a DocsCI run as SARIF 2.1.0 — the standard format for
 * CI security/quality annotations (GitHub Code Scanning, GitLab SAST, etc.)
 *
 * SARIF spec: https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html
 *
 * Query params:
 *   download=1     — add Content-Disposition: attachment header
 *   resolved=false — exclude resolved findings (default: include all)
 *
 * Usage in GitHub Actions:
 *   - uses: github/codeql-action/upload-sarif@v3
 *     with:
 *       sarif_file: docsci-results.sarif
 *
 * Usage in GitLab CI:
 *   artifacts:
 *     reports:
 *       sast: docsci-results.sarif
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SARIF_VERSION = "2.1.0";
const SARIF_SCHEMA = "https://json.schemastore.org/sarif-2.1.0.json";
const TOOL_NAME = "DocsCI";
const TOOL_VERSION = "1.0.0";
const TOOL_URI = "https://snippetci.com";
const TOOL_INFO_URI = "https://snippetci.com/docs/security";

function svc() {
  return createServiceClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!,
  );
}

// Map DocsCI severity → SARIF level
function severityToLevel(severity: string): "error" | "warning" | "note" | "none" {
  switch (severity) {
    case "error": return "error";
    case "warning": return "warning";
    case "info": return "note";
    default: return "note";
  }
}

// Map finding kind → rule description
const RULE_METADATA: Record<string, { name: string; shortDescription: string; helpUri: string; tags: string[] }> = {
  "snippet_error": {
    name: "Code snippet execution failed",
    shortDescription: "A fenced code block in the documentation failed when executed",
    helpUri: "https://snippetci.com/docs/checks#snippets",
    tags: ["documentation", "code-quality"],
  },
  "a11y": {
    name: "Accessibility violation",
    shortDescription: "Documentation contains content that violates WCAG 2.1 accessibility guidelines",
    helpUri: "https://snippetci.com/docs/checks#accessibility",
    tags: ["documentation", "accessibility"],
  },
  "copy_lint": {
    name: "Copy quality issue",
    shortDescription: "Documentation contains passive voice, weasel words, or readability issues",
    helpUri: "https://snippetci.com/docs/checks#copy-lint",
    tags: ["documentation", "readability"],
  },
  "drift": {
    name: "API drift detected",
    shortDescription: "Documentation references an endpoint or parameter not found in the OpenAPI spec",
    helpUri: "https://snippetci.com/docs/checks#drift",
    tags: ["documentation", "api-consistency"],
  },
  "secret": {
    name: "Secret detected in code example",
    shortDescription: "A code example in the documentation appears to contain a hardcoded credential",
    helpUri: "https://snippetci.com/docs/security#secrets",
    tags: ["security", "documentation"],
  },
};

function getRuleId(kind: string): string {
  return `DOCSCI-${kind.toUpperCase().replace(/[^A-Z0-9]/g, "-")}`;
}

function getRuleMeta(kind: string) {
  return RULE_METADATA[kind] ?? {
    name: kind,
    shortDescription: `DocsCI check: ${kind}`,
    helpUri: TOOL_INFO_URI,
    tags: ["documentation"],
  };
}

type Finding = {
  id: string;
  kind: string;
  severity: string;
  file_path: string;
  line_start: number | null;
  line_end: number | null;
  language: string | null;
  code_snippet: string | null;
  error_message: string | null;
  resolved: boolean;
  created_at: string;
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const runId = params.id;
  const sp = req.nextUrl.searchParams;
  const download = sp.get("download") === "1";
  const excludeResolved = sp.get("resolved") === "false";

  const db = svc();

  // Fetch run
  const { data: run, error: runErr } = await db
    .from("docsci_runs")
    .select("id, project_id, status, branch, commit_sha, duration_ms, started_at, completed_at")
    .eq("id", runId)
    .maybeSingle();

  if (runErr || !run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  // Fetch findings
  let q = db
    .from("docsci_findings")
    .select("id, kind, severity, file_path, line_start, line_end, language, code_snippet, error_message, resolved, created_at")
    .eq("run_id", runId)
    .order("file_path")
    .order("line_start");

  if (excludeResolved) q = q.eq("resolved", false);

  const { data: findings } = await q;
  const typedFindings = (findings ?? []) as Finding[];

  // Collect unique rules
  const ruleIds = Array.from(new Set(typedFindings.map(f => f.kind)));
  const rules = ruleIds.map(kind => {
    const meta = getRuleMeta(kind);
    return {
      id: getRuleId(kind),
      name: meta.name,
      shortDescription: { text: meta.shortDescription },
      helpUri: meta.helpUri,
      properties: {
        tags: meta.tags,
        "problem.severity": severityToLevel(
          typedFindings.find(f => f.kind === kind)?.severity ?? "info"
        ),
      },
    };
  });

  // Build results
  const results = typedFindings.map(f => {
    const lineStart = f.line_start ?? 1;
    const lineEnd = f.line_end ?? lineStart;
    const message = f.error_message ?? `${f.kind} finding in ${f.file_path}`;

    const result: Record<string, unknown> = {
      ruleId: getRuleId(f.kind),
      level: severityToLevel(f.severity),
      message: { text: message },
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: f.file_path,
              uriBaseId: "%SRCROOT%",
            },
            region: {
              startLine: lineStart,
              endLine: lineEnd,
            },
          },
        },
      ],
      properties: {
        docsci_id: f.id,
        kind: f.kind,
        resolved: f.resolved,
        created_at: f.created_at,
        ...(f.language && { language: f.language }),
      },
    };

    if (f.code_snippet) {
      result.codeFlows = [
        {
          threadFlows: [
            {
              locations: [
                {
                  location: {
                    physicalLocation: {
                      artifactLocation: { uri: f.file_path, uriBaseId: "%SRCROOT%" },
                      region: { startLine: lineStart, endLine: lineEnd },
                    },
                    message: { text: f.code_snippet.slice(0, 500) },
                  },
                },
              ],
            },
          ],
        },
      ];
    }

    if (f.resolved) {
      result.suppressions = [
        {
          kind: "inSource",
          status: "accepted",
          justification: "Marked as resolved in DocsCI",
        },
      ];
    }

    return result;
  });

  // SARIF document
  const sarif = {
    $schema: SARIF_SCHEMA,
    version: SARIF_VERSION,
    runs: [
      {
        tool: {
          driver: {
            name: TOOL_NAME,
            version: TOOL_VERSION,
            informationUri: TOOL_URI,
            rules,
            properties: {
              docsci_run_id: run.id,
              docsci_branch: run.branch,
              docsci_commit_sha: run.commit_sha,
              docsci_status: run.status,
              docsci_duration_ms: run.duration_ms,
            },
          },
        },
        results,
        invocations: [
          {
            executionSuccessful: run.status !== "failed",
            startTimeUtc: run.started_at,
            endTimeUtc: run.completed_at ?? run.started_at,
            toolExecutionNotifications: [],
          },
        ],
        properties: {
          docsci_run_id: run.id,
          run_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://snippetci.com"}/runs/${run.id}`,
        },
      },
    ],
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/sarif+json; charset=utf-8",
  };
  if (download) {
    headers["Content-Disposition"] = `attachment; filename="docsci-run-${runId.slice(0, 8)}.sarif"`;
  }

  return new NextResponse(JSON.stringify(sarif, null, 2), { headers });
}
