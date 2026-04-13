"use client";

import { useState } from "react";

interface Finding {
  id: string;
  kind: string;
  severity: string;
  file_path: string;
  line_start: number;
  title: string;
  description: string;
  code_snippet: string;
  language: string;
  explanation?: string;
  fixed_code?: string;
  patch_diff?: string;
  pr_comment_body?: string;
}

interface RunResult {
  run_id: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  snippets_total: number;
  snippets_passed: number;
  snippets_failed: number;
  drift_detected: boolean;
  drift_count: number;
  findings: Finding[];
  files_scanned: string[];
  openapi_version: string;
  meta: { sample_repo: string; ai_suggestions: boolean };
}

const SEVERITY_COLORS: Record<string, string> = {
  error: "text-red-400 bg-red-950/40 border-red-700/50",
  warning: "text-yellow-400 bg-yellow-950/40 border-yellow-700/50",
  info: "text-blue-400 bg-blue-950/40 border-blue-700/50",
};

const KIND_LABELS: Record<string, string> = {
  snippet_failure: "Snippet failure",
  api_drift: "API drift",
  syntax_error: "Syntax error",
};

export default function DemoPage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<string | null>(null);

  async function startDemo() {
    setRunning(true);
    setError(null);
    setResult(null);
    setExpanded(new Set());

    try {
      const res = await fetch("/api/demo-run", { method: "POST" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data: RunResult = await res.json();
      setResult(data);
      // Auto-expand first 3 findings
      const firstThree = new Set(data.findings.slice(0, 3).map(f => f.id));
      setExpanded(firstThree);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  async function downloadPatch(findingId?: string) {
    const key = findingId ?? "all";
    setDownloading(key);
    const url = findingId
      ? `/api/demo-run/patch?finding=${encodeURIComponent(findingId)}`
      : `/api/demo-run/patch`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] ?? "docsci-fix.patch";

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      alert(`Download failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setDownloading(null);
    }
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <a href="/" className="text-gray-500 hover:text-white text-sm">← Home</a>
        <span className="text-gray-700">/</span>
        <span className="text-sm text-gray-300">Demo — Sample Repo Run</span>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-xs text-indigo-300 bg-indigo-950/40 border border-indigo-700/50 px-3 py-1.5 rounded-full mb-4">
            ⚗️ Live demo — no signup required
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            Run DocsCI on a Sample Repo
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
            One click triggers a full docs-CI pipeline against a bundled Docusaurus-style repo with
            intentionally broken snippets, a Python/JS/TS fixture, and an OpenAPI YAML with a drift
            signature. See real findings and download patch diffs.
          </p>
        </div>

        {/* Fixture summary */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-8 text-sm">
          <div className="font-medium text-white mb-3 flex items-center gap-2">
            📁 Sample repo contents
          </div>
          <div className="grid grid-cols-2 gap-2 text-gray-400">
            {[
              ["docs/getting-started.md", "4 snippets (2 broken: missing import, drift)"],
              ["docs/webhooks.md", "4 snippets (2 broken: NameError, top-level await)"],
              ["openapi.yaml", "Acme API v2.1.0 — /init replaced /connect"],
              ["README.md", "Project overview"],
            ].map(([file, desc]) => (
              <div key={file} className="flex items-start gap-2">
                <span className="text-gray-600 shrink-0">•</span>
                <div>
                  <span className="text-gray-300 font-mono text-xs">{file}</span>
                  <span className="text-gray-500 ml-2">{desc}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-500">
            Expected: ~5 snippet failures · 1–2 drift findings · patch diffs for all
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mb-10">
          <button
            onClick={startDemo}
            disabled={running}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl text-base transition-colors"
          >
            {running ? (
              <>
                <span className="animate-spin">⚙️</span>
                Running pipeline…
              </>
            ) : (
              <>⚡ Use sample repo</>
            )}
          </button>
          {running && (
            <p className="text-sm text-gray-500 mt-2">
              Extracting snippets → executing in sandbox → detecting drift…
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-950/40 border border-red-700/50 rounded-xl p-4 mb-6 text-red-300 text-sm">
            ❌ {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div>
            {/* Run summary */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white">Run complete</h2>
                <span className="text-xs text-gray-500">{result.duration_ms}ms</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {[
                  { label: "Snippets", value: result.snippets_total, sub: "total" },
                  { label: "Passed", value: result.snippets_passed, sub: "✅", color: "text-green-400" },
                  { label: "Failed", value: result.snippets_failed, sub: "❌", color: "text-red-400" },
                  { label: "Drift", value: result.drift_count, sub: result.drift_detected ? "⚠️ detected" : "✓ none", color: result.drift_detected ? "text-yellow-400" : "text-green-400" },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div className={`text-2xl font-bold ${s.color ?? "text-white"}`}>{s.value}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-800">
                <span className="text-xs text-gray-500">Files: {result.files_scanned.join(", ")}</span>
                <span className="text-xs text-gray-600">·</span>
                <span className="text-xs text-gray-500">OpenAPI {result.openapi_version}</span>
              </div>
            </div>

            {/* Download all */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">
                {result.findings.length} Findings
              </h2>
              <button
                onClick={() => downloadPatch()}
                disabled={downloading === "all"}
                className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 border border-indigo-700/50 hover:border-indigo-500/50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {downloading === "all" ? "⏳" : "⬇️"} Download all patches
              </button>
            </div>

            {/* Findings list */}
            <div className="space-y-3">
              {result.findings.map(finding => (
                <div
                  key={finding.id}
                  className={`border rounded-xl overflow-hidden ${SEVERITY_COLORS[finding.severity] ?? "border-gray-700 bg-gray-900"}`}
                >
                  {/* Finding header */}
                  <button
                    className="w-full text-left px-5 py-4 flex items-start gap-3"
                    onClick={() => toggleExpand(finding.id)}
                  >
                    <span className="text-lg shrink-0">
                      {finding.kind === "api_drift" ? "⚠️" : "🔴"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium uppercase tracking-wide opacity-70">
                          {KIND_LABELS[finding.kind] ?? finding.kind}
                        </span>
                        <span className="text-xs opacity-50">
                          {finding.file_path}:{finding.line_start}
                        </span>
                      </div>
                      <div className="font-medium text-sm mt-0.5">{finding.title}</div>
                    </div>
                    <span className="text-gray-500 text-sm shrink-0">
                      {expanded.has(finding.id) ? "▲" : "▼"}
                    </span>
                  </button>

                  {/* Expanded details */}
                  {expanded.has(finding.id) && (
                    <div className="border-t border-current/20 px-5 py-4 space-y-4 bg-gray-950/30">
                      <p className="text-sm opacity-80 leading-relaxed">{finding.description}</p>

                      {/* Broken code */}
                      <div>
                        <div className="text-xs font-medium opacity-60 mb-1.5">Failing snippet</div>
                        <pre className="bg-gray-900/70 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
                          {finding.code_snippet}
                        </pre>
                      </div>

                      {/* Fixed code */}
                      {finding.fixed_code && finding.fixed_code !== finding.code_snippet && (
                        <div>
                          <div className="text-xs font-medium text-green-400/80 mb-1.5">AI suggested fix</div>
                          <pre className="bg-green-950/30 border border-green-800/30 rounded-lg p-3 text-xs text-green-300 overflow-x-auto whitespace-pre-wrap">
                            {finding.fixed_code}
                          </pre>
                        </div>
                      )}

                      {/* Patch diff */}
                      {finding.patch_diff && (
                        <div>
                          <div className="text-xs font-medium opacity-60 mb-1.5">Patch diff</div>
                          <pre className="bg-gray-900/70 rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap">
                            {finding.patch_diff.split("\n").map((line, i) => (
                              <span
                                key={i}
                                className={
                                  line.startsWith("+") ? "text-green-400" :
                                  line.startsWith("-") ? "text-red-400" :
                                  line.startsWith("@@") ? "text-blue-400" :
                                  "text-gray-400"
                                }
                              >
                                {line}{"\n"}
                              </span>
                            ))}
                          </pre>
                        </div>
                      )}

                      {/* PR comment */}
                      {finding.pr_comment_body && (
                        <div>
                          <div className="text-xs font-medium opacity-60 mb-1.5">
                            GitHub PR comment
                          </div>
                          <pre className="bg-gray-900/70 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
                            {finding.pr_comment_body}
                          </pre>
                        </div>
                      )}

                      {/* Download patch */}
                      {finding.patch_diff && (
                        <button
                          onClick={() => downloadPatch(finding.id)}
                          disabled={downloading === finding.id}
                          className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-700/50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {downloading === finding.id ? "⏳" : "⬇️"} Download .patch
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer CTA */}
            <div className="mt-10 text-center bg-gray-900 border border-gray-800 rounded-2xl p-8">
              <h3 className="font-semibold text-white mb-2">Run DocsCI on your own repo</h3>
              <p className="text-sm text-gray-400 mb-6">
                Connect your GitHub org and get your first real CI run in under 5 minutes.
              </p>
              <div className="flex items-center justify-center gap-4">
                <a
                  href="/signup"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                >
                  Get started free
                </a>
                <a
                  href="/docs-guide"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Read the docs →
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
