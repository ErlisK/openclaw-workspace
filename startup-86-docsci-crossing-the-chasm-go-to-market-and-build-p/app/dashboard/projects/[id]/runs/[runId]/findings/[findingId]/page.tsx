"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

interface Finding {
  id: string;
  run_id: string;
  project_id: string;
  kind: string;
  severity: string;
  file_path: string;
  line_start?: number;
  line_end?: number;
  language?: string;
  code_snippet?: string;
  error_message?: string;
  stdout?: string;
  stderr?: string;
  resolved: boolean;
  created_at: string;
}

interface Suggestion {
  id: string;
  finding_id: string;
  run_id?: string;
  explanation?: string;
  fixed_code?: string;
  patch_diff?: string;
  pr_comment_body?: string;
  applied: boolean;
  dismissed: boolean;
  model?: string;
  created_at?: string;
}

const KIND_LABELS: Record<string, { label: string; icon: string; desc: string }> = {
  snippet_failure: { label: "Snippet Failure", icon: "⚡", desc: "Code example execution failed" },
  accessibility: { label: "Accessibility", icon: "♿", desc: "WCAG accessibility violation" },
  copy: { label: "Copy Issue", icon: "✍️", desc: "Writing quality or policy issue" },
  api_drift: { label: "API Drift", icon: "🔍", desc: "Doc/API mismatch detected" },
  smoke_test: { label: "Smoke Test", icon: "🔥", desc: "API smoke test failed" },
};

const SEV_COLORS: Record<string, string> = {
  error: "bg-red-900/30 border-red-700 text-red-300",
  warning: "bg-yellow-900/30 border-yellow-700 text-yellow-300",
  info: "bg-blue-900/30 border-blue-700 text-blue-300",
};

export default function FindingDetailPage({
  params,
}: {
  params: Promise<{ id: string; runId: string; findingId: string }>;
}) {
  const { id, runId, findingId } = use(params);
  const [finding, setFinding] = useState<Finding | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPatch, setShowPatch] = useState(false);
  const [showPrComment, setShowPrComment] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/findings?id=${findingId}`);
        if (!res.ok) throw new Error("Failed to load finding");
        const data = await res.json();
        setFinding(data.finding ?? null);
        setSuggestions(data.suggestions ?? []);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [findingId]);

  const downloadPatch = (suggestion: Suggestion) => {
    if (!suggestion.patch_diff) return;
    const blob = new Blob([suggestion.patch_diff], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fix-${findingId.slice(0, 8)}.patch`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const kindMeta = finding ? (KIND_LABELS[finding.kind] ?? { label: finding.kind, icon: "🔍", desc: "" }) : null;
  const primarySuggestion = suggestions[0] ?? null;

  if (loading) return <div className="max-w-4xl mx-auto py-16 px-4 text-center text-gray-500">Loading…</div>;
  if (!finding) return (
    <div className="max-w-4xl mx-auto py-16 px-4 text-center">
      <p className="text-red-400">{error || "Finding not found"}</p>
      <Link href={`/dashboard/projects/${id}/runs/${runId}`} className="text-indigo-400 text-sm mt-2 block">← Back to run</Link>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Breadcrumb */}
      <div className="text-xs text-gray-500 mb-6 flex items-center gap-2 flex-wrap">
        <Link href="/dashboard" className="hover:text-gray-300">Dashboard</Link>
        <span>/</span>
        <Link href="/dashboard/projects" className="hover:text-gray-300">Projects</Link>
        <span>/</span>
        <Link href={`/dashboard/projects/${id}`} className="hover:text-gray-300">Project</Link>
        <span>/</span>
        <Link href={`/dashboard/projects/${id}/runs/${runId}`} className="hover:text-gray-300">
          Run {runId.slice(0, 8)}
        </Link>
        <span>/</span>
        <span className="text-gray-300">Finding</span>
      </div>

      {/* Finding header */}
      <div className={`border rounded-xl p-6 mb-6 ${SEV_COLORS[finding.severity] ?? "bg-gray-900 border-gray-700"}`}>
        <div className="flex items-start gap-3 mb-3">
          <span className="text-3xl">{kindMeta?.icon}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="font-bold text-lg text-white">{kindMeta?.label}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                finding.severity === "error" ? "bg-red-800 text-red-200" :
                finding.severity === "warning" ? "bg-yellow-800 text-yellow-200" :
                "bg-blue-800 text-blue-200"
              }`}>
                {finding.severity}
              </span>
              {primarySuggestion && (
                <span className="text-xs px-2.5 py-1 bg-purple-900 text-purple-300 rounded-full font-semibold">
                  ✓ AI Fix Available
                </span>
              )}
            </div>
            <p className="text-sm opacity-80">{kindMeta?.desc}</p>
          </div>
        </div>

        <div className="font-mono text-sm bg-black/30 rounded-lg p-3">
          {finding.file_path}
          {finding.line_start ? `:${finding.line_start}` : ""}
          {finding.line_end && finding.line_end !== finding.line_start ? `–${finding.line_end}` : ""}
          {finding.language ? ` (${finding.language})` : ""}
        </div>
      </div>

      {/* Error message */}
      {finding.error_message && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-2">Description</h2>
          <p className="text-white text-sm whitespace-pre-wrap">{finding.error_message}</p>
        </div>
      )}

      {/* Code snippet that failed */}
      {finding.code_snippet && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-300">
              {finding.kind === "snippet_failure" ? "Failed snippet" : "Code context"}
            </h2>
            {finding.language && (
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{finding.language}</span>
            )}
          </div>
          <pre className="text-sm text-gray-200 bg-black/40 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap font-mono">
            {finding.code_snippet}
          </pre>
        </div>
      )}

      {/* Stdout / stderr */}
      {(finding.stdout || finding.stderr) && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-5">
          {finding.stdout && (
            <>
              <h2 className="text-sm font-semibold text-gray-300 mb-2">stdout</h2>
              <pre className="text-xs text-gray-300 bg-black/40 rounded p-3 overflow-x-auto whitespace-pre-wrap font-mono mb-3">
                {finding.stdout.slice(0, 1000)}
              </pre>
            </>
          )}
          {finding.stderr && (
            <>
              <h2 className="text-sm font-semibold text-red-400 mb-2">stderr</h2>
              <pre className="text-xs text-red-300 bg-red-950/30 rounded p-3 overflow-x-auto whitespace-pre-wrap font-mono">
                {finding.stderr.slice(0, 1000)}
              </pre>
            </>
          )}
        </div>
      )}

      {/* AI suggestion */}
      {primarySuggestion ? (
        <div className="bg-gray-900 border border-purple-800 rounded-xl p-6 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-purple-400">🤖</span>
            <h2 className="font-semibold text-white">AI-Suggested Fix</h2>
            {primarySuggestion.model && (
              <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded ml-auto">{primarySuggestion.model}</span>
            )}
          </div>

          {/* Explanation */}
          {primarySuggestion.explanation && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Explanation</h3>
              <p className="text-sm text-gray-200 whitespace-pre-wrap">{primarySuggestion.explanation}</p>
            </div>
          )}

          {/* Fixed code */}
          {primarySuggestion.fixed_code && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Fixed Code</h3>
                <button
                  onClick={() => copyToClipboard(primarySuggestion.fixed_code!)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre className="text-sm text-green-300 bg-green-950/30 border border-green-800 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap font-mono">
                {primarySuggestion.fixed_code}
              </pre>
            </div>
          )}

          {/* Patch diff */}
          {primarySuggestion.patch_diff && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Unified Diff</h3>
                <button
                  onClick={() => setShowPatch(p => !p)}
                  className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showPatch ? "Hide" : "Show diff"}
                </button>
              </div>
              {showPatch && (
                <pre className="text-xs font-mono bg-black/60 rounded-lg p-4 overflow-x-auto whitespace-pre text-gray-300 mb-3 border border-gray-700">
                  {primarySuggestion.patch_diff.split("\n").map((line, i) => (
                    <span
                      key={i}
                      className={
                        line.startsWith("+") && !line.startsWith("+++")
                          ? "text-green-400"
                          : line.startsWith("-") && !line.startsWith("---")
                            ? "text-red-400"
                            : line.startsWith("@@")
                              ? "text-blue-400"
                              : ""
                      }
                    >
                      {line}{"\n"}
                    </span>
                  ))}
                </pre>
              )}

              {/* Download button */}
              <button
                onClick={() => downloadPatch(primarySuggestion)}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors"
                data-testid="download-patch-btn"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download unified diff (.patch)
              </button>
            </div>
          )}

          {/* PR comment */}
          {primarySuggestion.pr_comment_body && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">PR Comment</h3>
                <button
                  onClick={() => setShowPrComment(p => !p)}
                  className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showPrComment ? "Hide" : "Preview"}
                </button>
              </div>
              {showPrComment && (
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                    {primarySuggestion.pr_comment_body}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(primarySuggestion.pr_comment_body!)}
                    className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    {copied ? "Copied!" : "Copy to clipboard"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-5 text-center">
          <p className="text-gray-400 text-sm">No AI suggestion available for this finding.</p>
          <p className="text-gray-500 text-xs mt-1">AI suggestions are generated for error-level findings on Vercel deployment.</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href={`/dashboard/projects/${id}/runs/${runId}`}
          className="px-4 py-2.5 bg-gray-800 text-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors"
        >
          ← Back to run
        </Link>
        {primarySuggestion?.patch_diff && (
          <button
            onClick={() => downloadPatch(primarySuggestion)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors"
            data-testid="download-patch-btn-footer"
          >
            ↓ Download .patch
          </button>
        )}
      </div>
    </div>
  );
}
