// CI Pipeline orchestrator
// Fetches docs files from GitHub, extracts code snippets, executes them,
// detects API drift, generates AI fix comments, and updates the run record

import { SupabaseClient } from "@supabase/supabase-js";
import { executeSnippet } from "./sandbox";
import { generateAIFix } from "./ai-fix";

interface Repo {
  id: string;
  org_id: string;
  github_repo: string;
  docs_path: string;
  openapi_path?: string;
  sdk_languages: string[];
}

interface CodeSnippet {
  language: string;
  code: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
}

const SNIPPET_REGEX = /```(\w+)\n([\s\S]*?)```/g;
const LANGUAGE_MAP: Record<string, string> = {
  python: "python", py: "python",
  javascript: "javascript", js: "javascript",
  typescript: "typescript", ts: "typescript",
};

export async function runCIPipeline(
  runId: string,
  repo: Repo,
  supabase: SupabaseClient
): Promise<void> {
  let snippets: CodeSnippet[] = [];
  let driftDetected = false;

  try {
    // 1. Fetch docs files from GitHub
    snippets = await fetchDocsSnippets(repo);

    const total = snippets.length;
    let passed = 0;
    let failed = 0;

    // 2. Execute each snippet
    for (const snippet of snippets) {
      const lang = LANGUAGE_MAP[snippet.language.toLowerCase()];
      if (!lang) continue; // skip unsupported languages

      const result = await executeSnippet({
        code: snippet.code,
        language: lang,
        timeout_ms: 15000,
      });

      let aiFix: string | undefined;
      let patchDiff: string | undefined;

      if (!result.success) {
        failed++;
        // Generate AI fix suggestion
        const fixResult = await generateAIFix({
          code: snippet.code,
          language: lang,
          error: result.error || result.stderr,
          filePath: snippet.filePath,
        });
        aiFix = fixResult.suggestion;
        patchDiff = fixResult.patch;
      } else {
        passed++;
      }

      // Store snippet result
      await supabase.from("docsci_snippet_results").insert({
        run_id: runId,
        file_path: snippet.filePath,
        line_start: snippet.lineStart,
        line_end: snippet.lineEnd,
        language: lang,
        code: snippet.code,
        status: result.success ? "pass" : "fail",
        exit_code: result.exitCode,
        stdout: result.stdout?.slice(0, 4000),
        stderr: result.stderr?.slice(0, 4000),
        error_message: result.error?.slice(0, 2000),
        ai_fix_suggestion: aiFix,
        patch_diff: patchDiff,
        execution_ms: 0,
      });

      // Check for API drift (look for endpoint references that may have changed)
      if (result.stderr?.includes("404") || result.stderr?.includes("deprecated")) {
        driftDetected = true;
      }
    }

    // 3. Update run record with results
    await supabase
      .from("docsci_ci_runs")
      .update({
        status: failed > 0 ? "failed" : "passed",
        examples_total: total,
        examples_passed: passed,
        examples_failed: failed,
        drift_detected: driftDetected,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);

  } catch (err) {
    console.error("CI pipeline error:", err);
    await supabase
      .from("docsci_ci_runs")
      .update({
        status: "failed",
        examples_total: snippets.length,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);
  }
}

async function fetchDocsSnippets(repo: Repo): Promise<CodeSnippet[]> {
  const snippets: CodeSnippet[] = [];
  const docsPath = repo.docs_path.replace(/\/$/, "");

  try {
    // Fetch docs tree from GitHub
    const treeRes = await fetch(
      `https://api.github.com/repos/${repo.github_repo}/git/trees/HEAD?recursive=1`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          ...(process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {}),
        },
      }
    );

    if (!treeRes.ok) {
      console.warn(`GitHub tree fetch failed for ${repo.github_repo}`);
      return snippets;
    }

    const tree = await treeRes.json();
    const mdFiles = (tree.tree as { path: string; type: string }[])
      .filter(f => f.type === "blob" && f.path.startsWith(docsPath) && /\.(md|mdx)$/.test(f.path))
      .slice(0, 20); // limit to 20 files per run

    for (const file of mdFiles) {
      const fileRes = await fetch(
        `https://raw.githubusercontent.com/${repo.github_repo}/HEAD/${file.path}`
      );
      if (!fileRes.ok) continue;
      const content = await fileRes.text();

      let match;
      let lineOffset = 0;
    void lineOffset; // used for line tracking
    const lines = content.split("\n");

      SNIPPET_REGEX.lastIndex = 0;
      while ((match = SNIPPET_REGEX.exec(content)) !== null) {
        const lang = match[1].toLowerCase();
        const code = match[2].trim();

        if (!code || code.length < 5) continue;
        if (!LANGUAGE_MAP[lang]) continue;

        // Calculate line numbers
        const beforeMatch = content.slice(0, match.index);
        const lineStart = beforeMatch.split("\n").length;
        const codeLines = code.split("\n").length;

        snippets.push({
          language: lang,
          code,
          filePath: file.path,
          lineStart,
          lineEnd: lineStart + codeLines + 2,
        });

        if (snippets.length >= 50) break; // cap at 50 snippets total
      }

      lineOffset += lines.length;
      if (snippets.length >= 50) break;
    }
  } catch (err) {
    console.error("fetchDocsSnippets error:", err);
  }

  return snippets;
}
