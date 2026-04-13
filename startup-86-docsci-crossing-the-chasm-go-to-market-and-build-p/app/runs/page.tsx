"use client";

import { useState, useEffect } from "react";

interface Run {
  id: string;
  status: string;
  branch: string;
  commit_sha: string;
  snippets_total: number;
  snippets_passed: number;
  snippets_failed: number;
  drift_detected: boolean;
  duration_ms: number;
  started_at: string;
  completed_at?: string;
}

interface Finding {
  id: string;
  kind: string;
  severity: string;
  file_path: string;
  line_start?: number;
  language?: string;
  code_snippet?: string;
  error_message?: string;
  resolved: boolean;
}

interface Suggestion {
  id: string;
  finding_id: string;
  explanation: string;
  fixed_code?: string;
  patch_diff?: string;
  pr_comment_body?: string;
  applied: boolean;
  dismissed: boolean;
}

const SEV_COLOR: Record<string, string> = {
  error: "bg-red-50 border-red-200 text-red-800",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
  info: "bg-blue-50 border-blue-200 text-blue-700",
};

const KIND_ICON: Record<string, string> = {
  snippet: "⚡",
  a11y: "♿",
  copy: "✍️",
  drift: "🔍",
};

const STATUS_COLOR: Record<string, string> = {
  passed: "text-green-600 bg-green-50",
  failed: "text-red-600 bg-red-50",
  running: "text-blue-600 bg-blue-50 animate-pulse",
  queued: "text-gray-600 bg-gray-50",
};

export default function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "snippet" | "a11y" | "copy" | "drift">("all");
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);

  const loadRuns = async () => {
    const r = await fetch("/api/runs/queue");
    const d = await r.json();
    setRuns(d.runs || []);
  };

  const loadSample = async () => {
    const r = await fetch("/api/runs/sample");
    const d = await r.json();
    if (d.run) {
      setSelectedRun(d.run);
      setFindings(d.findings || []);
      setSuggestions(d.suggestions || []);
    }
  };

  useEffect(() => {
    loadRuns();
    loadSample();
  }, []);

  const triggerRun = async () => {
    setRunning(true);
    try {
      const r = await fetch("/api/runs/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "inline" }),
      });
      const d = await r.json();
      if (d.run_id) {
        await loadRuns();
        // Load the new run
        const runRes = await fetch("/api/runs/sample");
        const runData = await runRes.json();
        if (runData.run) {
          setSelectedRun(runData.run);
          setFindings(runData.findings || []);
          setSuggestions(runData.suggestions || []);
        }
      }
    } finally {
      setRunning(false);
    }
  };

  const selectRun = async (run: Run) => {
    setSelectedRun(run);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    const [findingsRes, suggestionsRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/docsci_findings?run_id=eq.${run.id}&order=created_at`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      }),
      fetch(`${supabaseUrl}/rest/v1/docsci_suggestions?run_id=eq.${run.id}&order=created_at`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      }),
    ]);

    const [f, s] = await Promise.all([findingsRes.json(), suggestionsRes.json()]);
    setFindings(Array.isArray(f) ? f : []);
    setSuggestions(Array.isArray(s) ? s : []);
  };

  const downloadPatch = (suggestion: Suggestion) => {
    if (!suggestion.patch_diff) return;
    const blob = new Blob([suggestion.patch_diff], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fix-${suggestion.id.slice(0, 8)}.patch`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredFindings = activeTab === "all"
    ? findings
    : findings.filter(f => f.kind === activeTab);

  const getSuggestion = (findingId: string) =>
    suggestions.find(s => s.finding_id === findingId);

  const errorCount = findings.filter(f => f.severity === "error").length;
  const warnCount = findings.filter(f => f.severity === "warning").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CI Runs</h1>
            <p className="text-gray-500 text-sm mt-1">
              Run the full pipeline: snippets, accessibility, copy, and drift detection
            </p>
          </div>
          <button
            onClick={triggerRun}
            disabled={running}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {running ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Running…
              </span>
            ) : (
              "▶ Run on sample repo"
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Run list */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-800 text-sm mb-3">Recent Runs</h2>
            {runs.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No runs yet</p>
            ) : (
              <div className="space-y-2">
                {runs.map((run) => (
                  <button
                    key={run.id}
                    onClick={() => selectRun(run)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedRun?.id === run.id
                        ? "border-indigo-300 bg-indigo-50"
                        : "border-gray-100 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[run.status] || "text-gray-600 bg-gray-50"}`}>
                        {run.status}
                      </span>
                      <span className="text-xs text-gray-400">
                        {run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : "—"}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-gray-600 truncate">
                      {run.branch}/{run.commit_sha?.slice(0, 8)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(run.started_at).toLocaleTimeString()}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Run details */}
          <div className="lg:col-span-2 space-y-4">
            {selectedRun ? (
              <>
                {/* Summary */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOR[selectedRun.status] || ""}`}>
                          {selectedRun.status}
                        </span>
                        <span className="text-sm font-mono text-gray-500">
                          {selectedRun.branch}/{selectedRun.commit_sha?.slice(0, 8)}
                        </span>
                        {selectedRun.drift_detected && (
                          <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">drift detected</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(selectedRun.started_at).toLocaleString()}
                        {selectedRun.duration_ms ? ` · ${(selectedRun.duration_ms / 1000).toFixed(1)}s` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-gray-50 rounded-lg py-2">
                      <div className="font-bold text-lg text-gray-700">{selectedRun.snippets_total ?? 0}</div>
                      <div className="text-gray-400">snippets</div>
                    </div>
                    <div className="bg-green-50 rounded-lg py-2">
                      <div className="font-bold text-lg text-green-600">{selectedRun.snippets_passed ?? 0}</div>
                      <div className="text-gray-400">passed</div>
                    </div>
                    <div className="bg-red-50 rounded-lg py-2">
                      <div className="font-bold text-lg text-red-600">{selectedRun.snippets_failed ?? 0}</div>
                      <div className="text-gray-400">failed</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg py-2">
                      <div className="font-bold text-lg text-gray-700">{findings.length}</div>
                      <div className="text-gray-400">findings</div>
                    </div>
                  </div>

                  {(errorCount > 0 || warnCount > 0) && (
                    <div className="flex gap-2 mt-3">
                      {errorCount > 0 && (
                        <span className="text-xs px-2.5 py-1 bg-red-100 text-red-700 rounded-full">
                          {errorCount} errors
                        </span>
                      )}
                      {warnCount > 0 && (
                        <span className="text-xs px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                          {warnCount} warnings
                        </span>
                      )}
                      {suggestions.length > 0 && (
                        <span className="text-xs px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full">
                          {suggestions.length} AI fixes
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Findings */}
                {findings.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex gap-2 mb-4 flex-wrap">
                      {(["all", "snippet", "a11y", "copy", "drift"] as const).map((tab) => {
                        const count = tab === "all" ? findings.length : findings.filter(f => f.kind === tab).length;
                        return (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                              activeTab === tab
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {KIND_ICON[tab] || "📋"} {tab} ({count})
                          </button>
                        );
                      })}
                    </div>

                    <div className="space-y-3">
                      {filteredFindings.map((finding) => {
                        const suggestion = getSuggestion(finding.id);
                        const isSelected = selectedFinding?.id === finding.id;
                        return (
                          <div key={finding.id} className={`border rounded-xl overflow-hidden ${SEV_COLOR[finding.severity]}`}>
                            <button
                              className="w-full text-left p-4"
                              onClick={() => setSelectedFinding(isSelected ? null : finding)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className="text-base">{KIND_ICON[finding.kind] || "📋"}</span>
                                    <span className="font-medium text-sm">{finding.error_message?.slice(0, 80)}</span>
                                    {suggestion && (
                                      <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">AI fix ✓</span>
                                    )}
                                  </div>
                                  <p className="text-xs opacity-70">
                                    {finding.file_path}
                                    {finding.line_start ? `:${finding.line_start}` : ""}
                                    {finding.language ? ` · ${finding.language}` : ""}
                                    {" · "}{finding.kind}
                                  </p>
                                </div>
                                <span className="text-xs opacity-50">{isSelected ? "▲" : "▼"}</span>
                              </div>
                            </button>

                            {isSelected && (
                              <div className="border-t border-current border-opacity-20 p-4 space-y-3">
                                {finding.code_snippet && (
                                  <div>
                                    <p className="text-xs font-medium mb-1 opacity-70">Code</p>
                                    <pre className="text-xs bg-black/5 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                                      {finding.code_snippet.slice(0, 400)}
                                    </pre>
                                  </div>
                                )}

                                {suggestion ? (
                                  <div className="space-y-2">
                                    <p className="text-xs font-medium opacity-70">AI Fix Suggestion</p>
                                    <p className="text-xs">{suggestion.explanation}</p>
                                    {suggestion.fixed_code && (
                                      <pre className="text-xs bg-green-50 border border-green-200 text-green-900 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                                        {suggestion.fixed_code.slice(0, 400)}
                                      </pre>
                                    )}
                                    {suggestion.patch_diff && (
                                      <button
                                        onClick={() => downloadPatch(suggestion)}
                                        className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                        data-testid="download-patch"
                                      >
                                        ↓ Download .patch
                                      </button>
                                    )}
                                    {suggestion.pr_comment_body && (
                                      <details className="text-xs">
                                        <summary className="cursor-pointer opacity-70">PR comment</summary>
                                        <pre className="mt-1 bg-black/5 rounded p-2 whitespace-pre-wrap">
                                          {suggestion.pr_comment_body}
                                        </pre>
                                      </details>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-xs opacity-60">
                                    No AI suggestion available (generated on Vercel deployment)
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <p className="text-gray-400 text-sm mb-4">No run selected</p>
                <p className="text-gray-400 text-xs">Click "Run on sample repo" to start a run or select one from the list</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400 space-x-4">
          <a href="/doc-audit" className="hover:text-gray-600">Doc Audit</a>
          <a href="/drift-detect" className="hover:text-gray-600">Drift Detection</a>
          <a href="/smoke-test" className="hover:text-gray-600">Smoke Tests</a>
          <a href="/demo" className="hover:text-gray-600">Demo</a>
          <a href="/" className="hover:text-gray-600">Home</a>
        </div>
      </div>
    </div>
  );
}
