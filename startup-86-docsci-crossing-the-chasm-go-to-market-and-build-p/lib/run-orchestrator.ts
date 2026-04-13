/**
 * lib/run-orchestrator.ts
 *
 * Enhanced CI run orchestrator.
 *
 * For a given run (project + docs content), executes all analyzers in parallel:
 *   1. Code snippet execution (sandbox)
 *   2. Accessibility check (axe-core + structural)
 *   3. Copy lint (passive voice, sensitive terms, etc.)
 *   4. Drift detection (OpenAPI vs docs)
 *
 * Persists results to Supabase:
 *   docsci_runs     — run record with status, counts, timing
 *   docsci_findings — one row per finding (broken snippet, a11y, copy, drift)
 *   docsci_suggestions — AI suggestions + patch diff for each finding
 *
 * Can be called server-side (from API route or server action).
 * Does NOT require auth — use the service role key.
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { executeSnippet } from "./sandbox";
import { checkAccessibility } from "./a11y-check";
import { lintCopy } from "./copy-lint";
import { detectDrift, type DocFile } from "./drift-detect";
import * as yaml from "js-yaml";
import { createGateway } from "@ai-sdk/gateway";
import { generateText } from "ai";

// ── Types ─────────────────────────────────────────────────────────────────

export interface RunInput {
  /** UUID for the run. Caller must generate and pre-insert the run row. */
  runId: string;
  projectId: string;
  /** Content of each doc file */
  docs: DocFile[];
  /** OpenAPI spec YAML/JSON (optional, for drift detection) */
  openapiText?: string;
  /** Commit SHA label */
  commitSha?: string;
  /** Branch label */
  branch?: string;
}

export interface OrchestratorResult {
  runId: string;
  status: "passed" | "failed";
  findingCount: number;
  suggestionCount: number;
  durationMs: number;
  snippetsTotal: number;
  snippetsPassed: number;
  snippetsFailed: number;
  driftDetected: boolean;
}

// ── Supabase service client ───────────────────────────────────────────────

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!;
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}

// ── Extract code fences from doc content ─────────────────────────────────

function parseFences(content: string): Array<{ language: string; code: string; startLine: number }> {
  const fences: Array<{ language: string; code: string; startLine: number }> = [];
  const lines = content.split("\n");
  let inFence = false;
  let lang = "";
  let fenceLines: string[] = [];
  let startLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inFence && /^```(\w*)/.test(line)) {
      inFence = true;
      lang = line.match(/^```(\w*)/)?.[1] ?? "";
      fenceLines = [];
      startLine = i + 2; // 1-indexed, content starts next line
    } else if (inFence && /^```\s*$/.test(line)) {
      if (fenceLines.join("").trim()) {
        fences.push({ language: lang || "text", code: fenceLines.join("\n"), startLine });
      }
      inFence = false;
      fenceLines = [];
    } else if (inFence) {
      fenceLines.push(line);
    }
  }
  return fences;
}

// ── AI suggestion generator ────────────────────────────────────────────────

async function generateSuggestion(
  findingType: string,
  code: string,
  errorMessage: string,
  filePath: string,
  language: string
): Promise<{ explanation: string; fixedCode: string; patchDiff: string; prCommentBody: string } | null> {
  try {
    const gateway = createGateway();
    const prompt = `You are a technical documentation expert. A DocsCI pipeline found this issue.

Finding type: ${findingType}
File: ${filePath}
Language: ${language}
Problem: ${errorMessage}
Code:
\`\`\`${language}
${code.slice(0, 500)}
\`\`\`

Provide a fix in JSON (no markdown fences):
{
  "explanation": "One sentence explaining the problem and fix",
  "fixedCode": "The corrected code snippet",
  "prComment": "A GitHub PR comment body with the fix suggestion"
}`;

    const result = await generateText({
      model: gateway("anthropic/claude-haiku-4-5"),
      prompt,
      maxOutputTokens: 600,
    });

    const raw = result.text.trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end < 0) return null;

    const parsed = JSON.parse(raw.slice(start, end + 1)) as {
      explanation: string;
      fixedCode: string;
      prComment: string;
    };

    // Build a simple unified diff
    const originalLines = code.split("\n");
    const fixedLines = (parsed.fixedCode || "").split("\n");
    const patch = [
      `--- a/${filePath}`,
      `+++ b/${filePath}`,
      `@@ -1,${originalLines.length} +1,${fixedLines.length} @@`,
      ...originalLines.map(l => `-${l}`),
      ...fixedLines.map(l => `+${l}`),
    ].join("\n");

    return {
      explanation: parsed.explanation || "",
      fixedCode: parsed.fixedCode || "",
      patchDiff: patch,
      prCommentBody: parsed.prComment || "",
    };
  } catch {
    return null;
  }
}

// ── Main orchestrator ─────────────────────────────────────────────────────

export async function runOrchestrator(input: RunInput): Promise<OrchestratorResult> {
  const startTime = Date.now();
  const supabase = getServiceClient();

  const { runId, projectId, docs, openapiText } = input;

  let snippetsTotal = 0;
  let snippetsPassed = 0;
  let snippetsFailed = 0;
  let driftDetected = false;
  let findingCount = 0;
  let suggestionCount = 0;

  // Update run to "running"
  await supabase
    .from("docsci_runs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", runId);

  try {
    // ── Collect all analyzer tasks ─────────────────────────────────────

    const analyzerTasks: Promise<void>[] = [];

    // 1. Per-doc: a11y + copy lint
    for (const doc of docs) {
      const docContent = doc.content;
      if (!docContent || docContent.length < 20) continue;

      analyzerTasks.push(
        (async () => {
          const [a11yReport, copyReport] = await Promise.all([
            checkAccessibility(docContent),
            Promise.resolve(lintCopy(docContent)),
          ]);

          const findingsToInsert = [
            ...a11yReport.findings.map((f) => ({
              run_id: runId,
              project_id: projectId,
              kind: "accessibility" as const,
              severity: (f as { impact: string }).impact === "critical" ? "error"
                : (f as { impact: string }).impact === "serious" ? "error"
                : (f as { impact: string }).impact === "moderate" ? "warning"
                : "info",
              file_path: doc.path,
              line_start: (f as { line?: number }).line ?? null,
              error_message: (f as { description: string }).description,
              code_snippet: (f as { html: string }).html?.slice(0, 500) ?? null,
              resolved: false,
            })),
            ...copyReport.findings.map((f) => ({
              run_id: runId,
              project_id: projectId,
              kind: "copy" as const,
              severity: (f as { severity: string }).severity,
              file_path: doc.path,
              line_start: (f as { line: number }).line || null,
              error_message: (f as { message: string }).message,
              code_snippet: (f as { text: string }).text?.slice(0, 500) ?? null,
              resolved: false,
            })),
          ];

          if (findingsToInsert.length > 0) {
            const { data: inserted } = await supabase
              .from("docsci_findings")
              .insert(findingsToInsert)
              .select("id, kind, error_message, code_snippet, file_path, severity");

            findingCount += findingsToInsert.length;

            // Generate AI suggestions for error-level findings (max 3)
            const errorFindings = (inserted || [])
              .filter((f) => f.severity === "error")
              .slice(0, 3);

            for (const finding of errorFindings) {
              const suggestion = await generateSuggestion(
                finding.kind,
                finding.code_snippet ?? "",
                finding.error_message ?? "",
                finding.file_path ?? doc.path,
                "markdown"
              );
              if (suggestion) {
                await supabase.from("docsci_suggestions").insert({
                  finding_id: finding.id,
                  run_id: runId,
                  model: "claude-haiku-4-5",
                  explanation: suggestion.explanation,
                  fixed_code: suggestion.fixedCode,
                  patch_diff: suggestion.patchDiff,
                  pr_comment_body: suggestion.prCommentBody,
                  applied: false,
                  dismissed: false,
                });
                suggestionCount++;
              }
            }
          }
        })()
      );

      // 2. Code snippet execution
      const fences = parseFences(docContent);
      for (const fence of fences) {
        const lang = fence.language.toLowerCase();
        if (!["python", "javascript", "typescript", "js", "ts", "py"].includes(lang)) continue;
        const execLang = lang === "py" ? "python" : lang === "js" ? "javascript" : lang === "ts" ? "typescript" : lang;

        snippetsTotal++;
        analyzerTasks.push(
          (async () => {
            const result = await executeSnippet({
              code: fence.code,
              language: execLang,
              timeout_ms: 20000,
            });

            if (result.success) {
              snippetsPassed++;
            } else {
              snippetsFailed++;
              findingCount++;

              // Insert finding
              const { data: inserted } = await supabase
                .from("docsci_findings")
                .insert({
                  run_id: runId,
                  project_id: projectId,
                  kind: "snippet_failure",
                  severity: "error",
                  file_path: doc.path,
                  line_start: fence.startLine,
                  language: execLang,
                  code_snippet: fence.code.slice(0, 2000),
                  error_message: (result.error || result.stderr || "execution failed").slice(0, 1000),
                  stdout: result.stdout?.slice(0, 2000),
                  stderr: result.stderr?.slice(0, 2000),
                  resolved: false,
                })
                .select("id")
                .single();

              // AI suggestion for failed snippets
              if (inserted?.id) {
                const suggestion = await generateSuggestion(
                  "snippet",
                  fence.code,
                  result.error || result.stderr || "execution failed",
                  doc.path,
                  execLang
                );
                if (suggestion) {
                  await supabase.from("docsci_suggestions").insert({
                    finding_id: inserted.id,
                    run_id: runId,
                    model: "claude-haiku-4-5",
                    explanation: suggestion.explanation,
                    fixed_code: suggestion.fixedCode,
                    patch_diff: suggestion.patchDiff,
                    pr_comment_body: suggestion.prCommentBody,
                    applied: false,
                    dismissed: false,
                  });
                  suggestionCount++;
                }
              }
            }

            // Also persist to docsci_snippet_results for backward compat
            await supabase.from("docsci_snippet_results").insert({
              run_id: runId,
              file_path: doc.path,
              line_start: fence.startLine,
              line_end: fence.startLine + fence.code.split("\n").length,
              language: execLang,
              code: fence.code.slice(0, 4000),
              status: result.success ? "pass" : "fail",
              stdout: result.stdout?.slice(0, 4000),
              stderr: result.stderr?.slice(0, 4000),
              error_message: result.error?.slice(0, 2000),
              execution_ms: 0,
            });
          })()
        );
      }
    }

    // 3. Drift detection (if OpenAPI spec provided)
    if (openapiText && docs.length > 0) {
      analyzerTasks.push(
        (async () => {
          try {
            const spec = yaml.load(openapiText) as Record<string, unknown>;
            const driftReport = detectDrift(spec, docs);
            const driftFindings = driftReport.findings.filter(
              (f) => f.severity !== "info"
            );
            driftDetected = driftFindings.length > 0;

            if (driftFindings.length > 0) {
              const toInsert = driftFindings.map((f) => ({
                run_id: runId,
                project_id: projectId,
                kind: "api_drift" as const,
                severity: f.severity === "error" ? "error" : "warning",
                file_path: f.file,
                error_message: f.message.slice(0, 1000),
                code_snippet: f.evidence.slice(0, 500),
                resolved: false,
              }));
              const { data: inserted } = await supabase
                .from("docsci_findings")
                .insert(toInsert)
                .select("id, severity, error_message, code_snippet, file_path");
              findingCount += toInsert.length;

              // AI suggestions for error-level drift findings (max 2)
              for (const finding of (inserted || []).filter(f => f.severity === "error").slice(0, 2)) {
                const suggestion = await generateSuggestion(
                  "drift",
                  finding.code_snippet ?? "",
                  finding.error_message ?? "",
                  finding.file_path ?? "docs",
                  "markdown"
                );
                if (suggestion) {
                  await supabase.from("docsci_suggestions").insert({
                    finding_id: finding.id,
                    run_id: runId,
                    model: "claude-haiku-4-5",
                    explanation: suggestion.explanation,
                    fixed_code: suggestion.fixedCode,
                    patch_diff: suggestion.patchDiff,
                    pr_comment_body: suggestion.prCommentBody,
                    applied: false,
                    dismissed: false,
                  });
                  suggestionCount++;
                }
              }
            }
          } catch {
            // drift detect failure is non-fatal
          }
        })()
      );
    }

    // Wait for all analyzers to complete
    await Promise.all(analyzerTasks);

    const durationMs = Date.now() - startTime;
    const status: "passed" | "failed" = snippetsFailed > 0 || findingCount > 0 ? "failed" : "passed";

    // Update run record
    await supabase
      .from("docsci_runs")
      .update({
        status,
        snippets_total: snippetsTotal,
        snippets_passed: snippetsPassed,
        snippets_failed: snippetsFailed,
        drift_detected: driftDetected,
        duration_ms: durationMs,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);

    return {
      runId,
      status,
      findingCount,
      suggestionCount,
      durationMs,
      snippetsTotal,
      snippetsPassed,
      snippetsFailed,
      driftDetected,
    };
  } catch (err) {
    console.error("runOrchestrator error:", err);
    const durationMs = Date.now() - startTime;
    await supabase
      .from("docsci_runs")
      .update({
        status: "failed",
        snippets_total: snippetsTotal,
        duration_ms: durationMs,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);
    throw err;
  }
}
