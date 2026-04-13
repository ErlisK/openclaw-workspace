"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

interface Run {
  id: string;
  status: string;
  branch: string;
  commit_sha?: string;
  snippets_total: number;
  snippets_passed: number;
  snippets_failed: number;
  drift_detected: boolean;
  duration_ms?: number;
  started_at: string;
  completed_at?: string;
  project_id: string;
}

interface Finding {
  id: string;
  kind: string;
  severity: string;
  file_path: string;
  line_start?: number;
  line_end?: number;
  language?: string;
  code_snippet?: string;
  error_message?: string;
  resolved: boolean;
  created_at: string;
}

interface SuggestionSummary {
  id: string;
  finding_id: string;
  patch_diff?: string;
  explanation?: string;
}

const KIND_LABELS: Record<string, string> = {
  snippet_failure: "⚡ Snippet",
  accessibility: "♿ A11y",
  copy: "✍️ Copy",
  api_drift: "🔍 Drift",
  smoke_test: "🔥 Smoke",
};

const SEV_COLORS: Record<string, string> = {
  error: "border-red-700 bg-red-900/20 text-red-300",
  warning: "border-yellow-700 bg-yellow-900/20 text-yellow-300",
  info: "border-blue-700 bg-blue-900/20 text-blue-300",
};

const SEV_BADGE: Record<string, string> = {
  error: "bg-red-900 text-red-300",
  warning: "bg-yellow-900 text-yellow-300",
  info: "bg-blue-900 text-blue-300",
};

const STATUS_COLORS: Record<string, string> = {
  passed: "bg-green-900 text-green-300",
  failed: "bg-red-900 text-red-300",
  running: "bg-blue-900 text-blue-300 animate-pulse",
  pending: "bg-gray-700 text-gray-300",
};

export default function RunPage({ params }: { params: Promise<{ id: string; runId: string }> }) {
  const { id, runId } = use(params);
  const [run, setRun] = useState<Run | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // Get run from queue list
        const runsRes = await fetch("/api/runs/queue");
        if (runsRes.ok) {
          const data = await runsRes.json();
          const found = (data.runs ?? []).find((r: Run) => r.id === runId);
          setRun(found ?? null);
        }

        // Get findings
        const findRes = await fetch(`/api/findings?run_id=${runId}`);
        if (findRes.ok) {
          const data = await findRes.json();
          setFindings(data.findings ?? []);
          setSuggestions(data.suggestions ?? []);
        }
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [runId]);

  const filtered = filter === "all"
    ? findings
    : filter === "error" || filter === "warning" || filter === "info"
      ? findings.filter(f => f.severity === filter)
      : findings.filter(f => f.kind === filter);

  const hasSuggestion = (findingId: string) =>
    suggestions.some(s => s.finding_id === findingId && (s.patch_diff || s.explanation));

  const kinds = Array.from(new Set(findings.map(f => f.kind)));
  const errorCount = findings.filter(f => f.severity === "error").length;
  const warnCount = findings.filter(f => f.severity === "warning").length;
  const fixCount = suggestions.filter(s => s.patch_diff || s.explanation).length;

  if (loading) return <div className="max-w-4xl mx-auto py-16 px-4 text-center text-gray-500">Loading…</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Breadcrumb */}
      <div className="text-xs text-gray-500 mb-6 flex items-center gap-2">
        <Link href="/dashboard" className="hover:text-gray-300">Dashboard</Link>
        <span>/</span>
        <Link href="/dashboard/projects" className="hover:text-gray-300">Projects</Link>
        <span>/</span>
        <Link href={`/dashboard/projects/${id}`} className="hover:text-gray-300">Project</Link>
        <span>/</span>
        <span className="text-gray-300">Run {runId.slice(0, 8)}</span>
      </div>

      {/* Run summary */}
      {run && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${STATUS_COLORS[run.status] ?? "bg-gray-700 text-gray-300"}`}>
              {run.status}
            </span>
            <span className="text-gray-400 font-mono text-sm">
              {run.branch}/{run.commit_sha?.slice(0, 7) ?? "HEAD"}
            </span>
            {run.drift_detected && (
              <span className="text-xs bg-orange-900 text-orange-300 px-2 py-0.5 rounded-full">drift detected</span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-3 text-center text-sm">
            <div className="bg-gray-800 rounded-lg py-3">
              <div className="text-2xl font-bold text-white">{run.snippets_total ?? 0}</div>
              <div className="text-gray-400 text-xs mt-0.5">snippets</div>
            </div>
            <div className="bg-green-900/30 border border-green-800 rounded-lg py-3">
              <div className="text-2xl font-bold text-green-300">{run.snippets_passed ?? 0}</div>
              <div className="text-gray-400 text-xs mt-0.5">passed</div>
            </div>
            <div className="bg-red-900/30 border border-red-800 rounded-lg py-3">
              <div className="text-2xl font-bold text-red-300">{run.snippets_failed ?? 0}</div>
              <div className="text-gray-400 text-xs mt-0.5">failed</div>
            </div>
            <div className="bg-gray-800 rounded-lg py-3">
              <div className="text-2xl font-bold text-white">{findings.length}</div>
              <div className="text-gray-400 text-xs mt-0.5">findings</div>
            </div>
          </div>

          <div className="flex gap-2 mt-4 flex-wrap text-xs">
            {errorCount > 0 && <span className="px-2.5 py-1 bg-red-900 text-red-300 rounded-full">{errorCount} errors</span>}
            {warnCount > 0 && <span className="px-2.5 py-1 bg-yellow-900 text-yellow-300 rounded-full">{warnCount} warnings</span>}
            {fixCount > 0 && <span className="px-2.5 py-1 bg-purple-900 text-purple-300 rounded-full">{fixCount} AI fixes</span>}
            {run.duration_ms && <span className="px-2.5 py-1 bg-gray-700 text-gray-300 rounded-full">{(run.duration_ms / 1000).toFixed(1)}s</span>}
          </div>
        </div>
      )}

      {/* Findings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Findings</h2>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {["all", "error", "warning", ...kinds].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                filter === f
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {KIND_LABELS[f] ?? f} ({
                f === "all" ? findings.length
                  : f === "error" || f === "warning" || f === "info"
                    ? findings.filter(x => x.severity === f).length
                    : findings.filter(x => x.kind === f).length
              })
            </button>
          ))}
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {filtered.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-400 text-sm">No findings in this category</p>
          </div>
        ) : (
          <div className="space-y-2" data-testid="findings-list">
            {filtered.map(finding => (
              <Link
                key={finding.id}
                href={`/dashboard/projects/${id}/runs/${runId}/findings/${finding.id}`}
                className={`block border rounded-xl p-4 hover:opacity-90 transition-opacity ${SEV_COLORS[finding.severity] ?? "border-gray-700 bg-gray-900"}`}
                data-testid="finding-row"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-medium">{KIND_LABELS[finding.kind] ?? finding.kind}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${SEV_BADGE[finding.severity]}`}>
                        {finding.severity}
                      </span>
                      {hasSuggestion(finding.id) && (
                        <span className="text-xs px-2 py-0.5 bg-purple-900 text-purple-300 rounded-full">AI fix</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-white truncate">
                      {finding.error_message?.slice(0, 100)}
                    </p>
                    <p className="text-xs opacity-60 mt-0.5">
                      {finding.file_path}
                      {finding.line_start ? `:${finding.line_start}` : ""}
                      {finding.language ? ` · ${finding.language}` : ""}
                    </p>
                  </div>
                  <span className="text-gray-500 text-sm">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
