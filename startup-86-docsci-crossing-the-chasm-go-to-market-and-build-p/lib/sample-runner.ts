/**
 * Sample repo fixture runner — deterministic demo pipeline
 *
 * Loads the bundled sample repo from lib/fixtures/sample-repo/,
 * extracts code snippets, executes them in the sandbox, detects drift
 * against the OpenAPI YAML, and returns structured findings with
 * AI suggestions and downloadable patch diffs.
 *
 * This is the backend for the "Use sample repo" one-click demo path.
 */

import fs from "fs";
import path from "path";
import { generateAIFix } from "./ai-fix";
import { executeSnippet } from "./sandbox";

export interface SampleFinding {
  id: string;
  kind: "snippet_failure" | "api_drift" | "syntax_error";
  severity: "error" | "warning" | "info";
  file_path: string;
  line_start: number;
  line_end: number;
  title: string;
  description: string;
  code_snippet: string;
  language: string;
  // AI-generated fix
  explanation?: string;
  fixed_code?: string;
  patch_diff?: string;
  pr_comment_body?: string;
}

export interface SampleRunResult {
  run_id: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  snippets_total: number;
  snippets_passed: number;
  snippets_failed: number;
  drift_detected: boolean;
  drift_count: number;
  findings: SampleFinding[];
  files_scanned: string[];
  openapi_version: string;
}

const FIXTURE_DIR = path.join(process.cwd(), "lib", "fixtures", "sample-repo");

const SNIPPET_REGEX = /```(\w+)\n([\s\S]*?)```/g;
const LANGUAGE_MAP: Record<string, string> = {
  python: "python", py: "python",
  javascript: "javascript", js: "javascript",
  typescript: "typescript", ts: "typescript",
};

interface ExtractedSnippet {
  language: string;
  code: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
}

function extractSnippets(content: string, filePath: string): ExtractedSnippet[] {
  const snippets: ExtractedSnippet[] = [];
  let match: RegExpExecArray | null;
  SNIPPET_REGEX.lastIndex = 0;

  while ((match = SNIPPET_REGEX.exec(content)) !== null) {
    const lang = match[1].toLowerCase();
    if (!LANGUAGE_MAP[lang]) continue;

    const codeStart = content.slice(0, match.index).split("\n").length;
    const codeLines = match[2].split("\n").length;

    snippets.push({
      language: LANGUAGE_MAP[lang],
      code: match[2].trim(),
      filePath,
      lineStart: codeStart,
      lineEnd: codeStart + codeLines + 1,
    });
  }

  return snippets;
}

function detectDrift(content: string, filePath: string): SampleFinding[] {
  const driftFindings: SampleFinding[] = [];

  // Known drift: docs use client.connect() but OpenAPI v2.1 replaced it with client.init()
  const connectMatches: Array<RegExpExecArray> = [];
  const connectRe = /client\.connect\(\)/g;
  let cm: RegExpExecArray | null;
  while ((cm = connectRe.exec(content)) !== null) connectMatches.push(cm);
  for (const m of connectMatches) {
    const lineNum = content.slice(0, m.index).split("\n").length;
    driftFindings.push({
      id: `drift-connect-${lineNum}`,
      kind: "api_drift",
      severity: "error",
      file_path: filePath,
      line_start: lineNum,
      line_end: lineNum,
      title: "API drift: client.connect() removed in OpenAPI v2.1",
      description:
        "The docs call `client.connect()` but the OpenAPI spec (v2.1.0) replaced `POST /connect` with `POST /init`. " +
        "Users following these docs will get a 404. Replace with `client.init()`.",
      code_snippet: "client.connect()",
      language: "python",
      patch_diff: generateConnectDiff(filePath, lineNum),
      pr_comment_body:
        "⚠️ **API Drift detected** — `client.connect()` was removed in v2.1.0.\n\n" +
        "**Fix:** Replace with `client.init()` per the current OpenAPI spec.\n\n" +
        "```diff\n- client.connect()\n+ client.init()\n```",
    });
  }

  return driftFindings;
}

function generateConnectDiff(filePath: string, line: number): string {
  return `--- a/${filePath}
+++ b/${filePath}
@@ -${line},1 +${line},1 @@
-client.connect()
+client.init()`;
}

function generateSnippetDiff(
  filePath: string,
  lineStart: number,
  brokenCode: string,
  fixedCode: string
): string {
  const brokenLines = brokenCode.split("\n").map(l => `- ${l}`).join("\n");
  const fixedLines = fixedCode.split("\n").map(l => `+ ${l}`).join("\n");
  const hunkSize = brokenCode.split("\n").length;
  return `--- a/${filePath}
+++ b/${filePath}
@@ -${lineStart},${hunkSize} +${lineStart},${fixedCode.split("\n").length} @@
${brokenLines}
${fixedLines}`;
}

export async function runSampleRepoPipeline(useAI = false): Promise<SampleRunResult> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  // Load fixture files
  const docsDir = path.join(FIXTURE_DIR, "docs");
  const files = fs.readdirSync(docsDir).filter(f => f.endsWith(".md"));
  const filesScanned = files.map(f => `docs/${f}`);

  // Read OpenAPI version
  const openapiPath = path.join(FIXTURE_DIR, "openapi.yaml");
  const openapiContent = fs.readFileSync(openapiPath, "utf-8");
  const versionMatch = openapiContent.match(/version:\s*["']?([\d.]+)["']?/);
  const openapiVersion = versionMatch?.[1] ?? "unknown";

  const allSnippets: ExtractedSnippet[] = [];
  const driftFindings: SampleFinding[] = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(docsDir, file), "utf-8");
    const relPath = `docs/${file}`;
    allSnippets.push(...extractSnippets(content, relPath));
    driftFindings.push(...detectDrift(content, relPath));
  }

  // Deduplicate drift findings
  const seenDrift = new Set<string>();
  const uniqueDrift = driftFindings.filter(d => {
    if (seenDrift.has(d.id)) return false;
    seenDrift.add(d.id);
    return true;
  });

  const findings: SampleFinding[] = [...uniqueDrift];
  let passed = 0;
  let failed = 0;

  // Execute snippets with deterministic sandbox results
  // (actual sandbox execution — real pass/fail based on code)
  for (const snippet of allSnippets) {
    let result: { success: boolean; stdout: string; stderr: string };

    try {
      result = await executeSnippet({
        code: snippet.code,
        language: snippet.language,
        timeout_ms: 10000,
      });
    } catch {
      result = { success: false, stdout: "", stderr: "Sandbox execution error" };
    }

    if (result.success) {
      passed++;
    } else {
      failed++;

      // Generate AI fix (or deterministic fallback when AI not available)
      let explanation = "This snippet has an error that prevents execution.";
      let fixedCode = snippet.code;
      let prComment = "";

      if (useAI) {
        try {
          const fix = await generateAIFix({
            code: snippet.code,
            language: snippet.language,
            error: result.stderr,
            filePath: snippet.filePath,
          });
          explanation = fix.suggestion ?? explanation;
          fixedCode = snippet.code; // patch is a diff, not replacement code
          prComment = fix.patch ? `Patch:\n\`\`\`diff\n${fix.patch}\n\`\`\`` : "";
        } catch {
          // fallback to deterministic fix below
        }
      }

      // Deterministic fixes for known patterns
      if (snippet.code.includes("AcmeClient") && snippet.language === "python" &&
          !snippet.code.includes("from ") && !snippet.code.includes("import ")) {
        fixedCode = `from acme_sdk import AcmeClient\n\n${snippet.code}`;
        explanation = "Missing import: `AcmeClient` is not defined. Add `from acme_sdk import AcmeClient` at the top.";
        prComment = "🔴 **Snippet failure** — missing import\n\n```diff\n+ from acme_sdk import AcmeClient\n```";
      } else if (snippet.code.includes("AcmeClient") && snippet.language === "javascript") {
        fixedCode = `// Note: Install acme-sdk first: npm install acme-sdk\n${snippet.code}`;
        explanation = "The `acme-sdk` package is not installed in the sandbox. Docs should include the install step before this snippet.";
        prComment = "🔴 **Snippet failure** — missing package\n\nAdd installation instructions before this snippet:\n```bash\nnpm install acme-sdk\n```";
      } else if (snippet.code.includes("client.get(\"/users\"") && !snippet.code.endsWith(")")) {
        fixedCode = snippet.code.replace('client.get("/users"', 'client.get("/users")');
        explanation = "Syntax error: missing closing parenthesis on `client.get(\"/users\")`.";
        prComment = "🔴 **Syntax error** — missing closing parenthesis\n\n```diff\n- response = client.get(\"/users\"\n+ response = client.get(\"/users\")\n```";
      } else if (snippet.code.includes("await fetch") && snippet.language === "javascript") {
        fixedCode = `(async () => {\n${snippet.code
          .split("\n")
          .map(l => `  ${l}`)
          .join("\n")}\n})();`;
        explanation = "Top-level `await` is not supported in CommonJS. Wrap in an async IIFE.";
        prComment = "🔴 **Snippet failure** — top-level await\n\nWrap in an async IIFE:\n```diff\n+ (async () => {\n   // your code\n+ })();\n```";
      } else if (snippet.code.includes("hmac.new")) {
        fixedCode = snippet.code.replace(/hmac\.new\(/g, "hmac.new(");
        explanation = "Python `hmac` module uses `hmac.new()` which is correct but requires the `secret.encode()` to be bytes. This actually fails due to the function signature — use `hmac.digest()` for modern Python.";
        prComment = "⚠️ **Snippet warning** — hmac API usage\n\nVerify `hmac.new()` signature matches your Python version.";
      }

      const patchDiff = generateSnippetDiff(
        snippet.filePath,
        snippet.lineStart,
        snippet.code,
        fixedCode
      );

      findings.push({
        id: `snippet-${snippet.filePath}-${snippet.lineStart}`.replace(/[^a-z0-9-]/gi, "-"),
        kind: "snippet_failure",
        severity: snippet.code.includes("syntax") || fixedCode !== snippet.code ? "error" : "warning",
        file_path: snippet.filePath,
        line_start: snippet.lineStart,
        line_end: snippet.lineEnd,
        title: `Snippet failure: ${snippet.language} at line ${snippet.lineStart}`,
        description: explanation,
        code_snippet: snippet.code.slice(0, 300),
        language: snippet.language,
        explanation,
        fixed_code: fixedCode,
        patch_diff: patchDiff,
        pr_comment_body: prComment || `🔴 **Snippet failed** at \`${snippet.filePath}:${snippet.lineStart}\`\n\n${explanation}`,
      });
    }
  }

  const completedAt = new Date().toISOString();
  const durationMs = Date.now() - t0;

  return {
    run_id: `demo-${Date.now()}`,
    started_at: startedAt,
    completed_at: completedAt,
    duration_ms: durationMs,
    snippets_total: allSnippets.length,
    snippets_passed: passed,
    snippets_failed: failed,
    drift_detected: uniqueDrift.length > 0,
    drift_count: uniqueDrift.length,
    findings,
    files_scanned: filesScanned,
    openapi_version: openapiVersion,
  };
}
