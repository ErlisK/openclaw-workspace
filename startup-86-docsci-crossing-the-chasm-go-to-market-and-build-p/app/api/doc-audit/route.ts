/**
 * POST /api/doc-audit
 *
 * Accessibility + copy lint audit for Markdown documentation.
 * Optionally generates AI suggestions for top findings and a patch diff.
 *
 * Request body:
 *   markdown: string         — The raw Markdown content to audit
 *   path?: string            — File path label (for display)
 *   ai_suggestions?: boolean — Whether to generate AI fixes (default: true)
 *   max_ai_fixes?: number    — Max findings to generate AI suggestions for (default: 3)
 *
 * Response (200): DocAuditReport
 * Response (400): { error: string }
 *
 * GET: returns sample run against the fixture docs/getting-started.md
 */

import { NextRequest, NextResponse } from "next/server";
import { checkAccessibility } from "@/lib/a11y-check";
import { lintCopy } from "@/lib/copy-lint";
import { createGateway } from "@ai-sdk/gateway";
import { generateText } from "ai";
import { readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

// ── Types ─────────────────────────────────────────────────────────────────

interface AISuggestion {
  findingType: string;
  original: string;
  suggested: string;
  explanation: string;
}

interface PatchHunk {
  file: string;
  line: number;
  original: string;
  replacement: string;
  type: "a11y" | "copy";
}

export interface DocAuditReport {
  path: string;
  a11y: {
    violations: number;
    warnings: number;
    passes: number;
    findings: unknown[];
  };
  copy: {
    findings: unknown[];
    stats: {
      words: number;
      sentences: number;
      fleschKincaidGrade: number;
      fleschReadingEase: number;
      avgWordsPerSentence: number;
    };
  };
  aiSuggestions: AISuggestion[];
  patch: string; // unified diff format
  patchHunks: PatchHunk[];
  totalFindings: number;
  ranAt: string;
}

// ── Patch generation ──────────────────────────────────────────────────────

function buildPatch(
  markdown: string,
  filePath: string,
  hunks: PatchHunk[]
): string {
  if (hunks.length === 0) return "";

  const lines = markdown.split("\n");
  const diffs: string[] = [];

  diffs.push(`--- a/${filePath}`);
  diffs.push(`+++ b/${filePath}`);

  for (const hunk of hunks) {
    if (hunk.line === 0) continue; // skip global-level findings

    const lineIdx = hunk.line - 1;
    if (lineIdx < 0 || lineIdx >= lines.length) continue;

    const origLine = lines[lineIdx];
    if (!origLine.includes(hunk.original)) continue;

    const newLine = origLine.replace(hunk.original, hunk.replacement);
    const ctxStart = Math.max(0, lineIdx - 1);
    const ctxEnd = Math.min(lines.length - 1, lineIdx + 1);

    diffs.push(`@@ -${hunk.line},${ctxEnd - ctxStart + 1} +${hunk.line},${ctxEnd - ctxStart + 1} @@`);
    if (ctxStart < lineIdx) diffs.push(` ${lines[ctxStart]}`);
    diffs.push(`-${origLine}`);
    diffs.push(`+${newLine}`);
    if (ctxEnd > lineIdx) diffs.push(` ${lines[ctxEnd]}`);
  }

  return diffs.join("\n");
}

// ── AI suggestions ─────────────────────────────────────────────────────────

async function generateAISuggestions(
  markdown: string,
  findings: Array<{
    type: string;
    text?: string;
    line?: number;
    message: string;
    suggestion: string;
  }>,
  maxFixes: number
): Promise<{ suggestions: AISuggestion[]; hunks: PatchHunk[] }> {
  const topFindings = findings
    .filter((f) => f.line && f.line > 0 && f.text)
    .slice(0, maxFixes);

  if (topFindings.length === 0) {
    return { suggestions: [], hunks: [] };
  }

  const lines = markdown.split("\n");
  const suggestions: AISuggestion[] = [];
  const hunks: PatchHunk[] = [];

  try {
    const gateway = createGateway();

    // Batch all fixes in a single LLM call to save tokens
    const prompt = `You are a technical documentation editor. Fix the following issues in Markdown docs.
For each finding, provide a rewritten version of the problematic text.
Be concise. Preserve technical meaning. Use active voice. Follow inclusive language guidelines.

${topFindings
  .map(
    (f, i) =>
      `Finding ${i + 1} [${f.type}] at line ${f.line}:
Problem: ${f.message}
Original text: "${f.text}"
Guidance: ${f.suggestion}`
  )
  .join("\n\n")}

Respond with a JSON array (no markdown fences) like:
[
  {
    "finding": 1,
    "original": "exact text from the doc",
    "suggested": "improved version",
    "explanation": "one sentence why"
  }
]`;

    const result = await generateText({
      model: gateway("anthropic/claude-haiku-4-5"),
      prompt,
      maxOutputTokens: 800,
    });

    const raw = result.text.trim();
    const jsonStart = raw.indexOf("[");
    const jsonEnd = raw.lastIndexOf("]");
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as Array<{
        finding: number;
        original: string;
        suggested: string;
        explanation: string;
      }>;

      for (const item of parsed) {
        const finding = topFindings[item.finding - 1];
        if (!finding) continue;

        suggestions.push({
          findingType: finding.type,
          original: item.original,
          suggested: item.suggested,
          explanation: item.explanation,
        });

        // Build a hunk for the patch
        if (finding.line && finding.line > 0 && item.original && item.suggested) {
          const lineIdx = finding.line - 1;
          if (lineIdx < lines.length && lines[lineIdx].includes(item.original)) {
            hunks.push({
              file: "doc",
              line: finding.line,
              original: item.original,
              replacement: item.suggested,
              type: finding.type.includes("a11y") ? "a11y" : "copy",
            });
          }
        }
      }
    }
  } catch {
    // AI unavailable in local dev — return empty
  }

  return { suggestions, hunks };
}

// ── Load sample fixture ────────────────────────────────────────────────────

function loadSampleMarkdown(): { markdown: string; path: string } | null {
  try {
    const p = join(process.cwd(), "lib/fixtures/sample-repo/docs/getting-started.md");
    return { markdown: readFileSync(p, "utf8"), path: "docs/getting-started.md" };
  } catch {
    return null;
  }
}

// ── GET: sample run ────────────────────────────────────────────────────────

export async function GET() {
  const sample = loadSampleMarkdown();
  if (!sample) {
    return NextResponse.json({ error: "Sample fixture not found" }, { status: 404 });
  }

  const [a11y, copy] = await Promise.all([
    checkAccessibility(sample.markdown),
    Promise.resolve(lintCopy(sample.markdown)),
  ]);

  return NextResponse.json({
    endpoint: "POST /api/doc-audit",
    description: "Accessibility + copy lint audit for Markdown docs",
    request: {
      markdown: "string — Raw Markdown content",
      path: "string (optional) — File path label",
      ai_suggestions: "boolean (default: true) — Generate AI fix suggestions",
      max_ai_fixes: "number (default: 3) — Max findings to AI-fix",
    },
    sample_run: {
      path: sample.path,
      a11y: {
        violations: a11y.violations,
        warnings: a11y.warnings,
        passes: a11y.passes,
        topFindings: a11y.findings.slice(0, 3).map((f) => ({
          ruleId: (f as { ruleId: string }).ruleId,
          impact: (f as { impact: string }).impact,
          message: (f as { description: string }).description,
        })),
      },
      copy: {
        grade: copy.stats.fleschKincaidGrade,
        words: copy.stats.words,
        findingCount: copy.findings.length,
        topFindings: copy.findings.slice(0, 3).map((f) => ({
          type: (f as { type: string }).type,
          severity: (f as { severity: string }).severity,
          message: (f as { message: string }).message,
        })),
      },
      totalFindings: a11y.findings.length + copy.findings.length,
    },
  });
}

// ── POST: full audit ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    markdown,
    path: filePath = "document.md",
    ai_suggestions = true,
    max_ai_fixes = 3,
  } = body as {
    markdown?: string;
    path?: string;
    ai_suggestions?: boolean;
    max_ai_fixes?: number;
  };

  if (!markdown || typeof markdown !== "string") {
    return NextResponse.json(
      { error: "markdown (string) is required" },
      { status: 400 }
    );
  }

  if (markdown.length > 100_000) {
    return NextResponse.json(
      { error: "markdown too large (max 100KB)" },
      { status: 400 }
    );
  }

  // Run checks in parallel
  const [a11yReport, copyReport] = await Promise.all([
    checkAccessibility(markdown),
    Promise.resolve(lintCopy(markdown)),
  ]);

  // Merge findings for AI
  const allFindings = [
    ...a11yReport.findings.map((f) => ({
      type: "a11y_" + (f as { ruleId: string }).ruleId,
      text: (f as { html: string }).html,
      line: (f as { line?: number }).line,
      message: (f as { description: string }).description,
      suggestion: (f as { fix: string }).fix,
    })),
    ...copyReport.findings.map((f) => ({
      type: (f as { type: string }).type,
      text: (f as { text: string }).text,
      line: (f as { line: number }).line,
      message: (f as { message: string }).message,
      suggestion: (f as { suggestion: string }).suggestion,
    })),
  ].filter((f) => f.line !== undefined && f.line > 0);

  // AI suggestions
  const { suggestions, hunks } = ai_suggestions
    ? await generateAISuggestions(markdown, allFindings, Number(max_ai_fixes) || 3)
    : { suggestions: [], hunks: [] };

  // Build patch
  const patch = buildPatch(markdown, String(filePath), hunks);

  const report: DocAuditReport = {
    path: String(filePath),
    a11y: {
      violations: a11yReport.violations,
      warnings: a11yReport.warnings,
      passes: a11yReport.passes,
      findings: a11yReport.findings,
    },
    copy: {
      findings: copyReport.findings,
      stats: copyReport.stats,
    },
    aiSuggestions: suggestions,
    patch,
    patchHunks: hunks,
    totalFindings: a11yReport.findings.length + copyReport.findings.length,
    ranAt: new Date().toISOString(),
  };

  return NextResponse.json(report, {
    headers: { "Cache-Control": "no-store" },
  });
}
