"use client";
/**
 * /dashboard/metrics — Run metrics dashboard
 * Shows aggregated run stats, time-series chart, finding breakdown, recent runs.
 */
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Summary = {
  total_runs: number;
  passed_runs: number;
  failed_runs: number;
  pass_rate_pct: number;
  total_findings: number;
  avg_duration_ms: number;
  avg_findings_per_run: number;
  snippets_total: number;
  snippets_passed: number;
  snippets_failed: number;
  drift_detected_count: number;
};

type TimePoint = {
  date: string;
  runs: number;
  passed: number;
  failed: number;
  findings: number;
};

type RecentRun = {
  id: string;
  status: string;
  branch: string;
  commit_sha: string;
  duration_ms: number;
  finding_count: number;
  snippets_total: number;
  snippets_failed: number;
  completed_at: string | null;
};

type MetricsData = {
  window_days: number;
  summary: Summary;
  time_series: TimePoint[];
  finding_breakdown: { by_severity: Record<string, number>; by_kind: Record<string, number> };
  top_failing_files: Array<{ file_path: string; error_count: number }>;
  recent_runs: RecentRun[];
};

function StatCard({
  label,
  value,
  sub,
  color,
  testId,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  testId?: string;
}) {
  return (
    <div className="p-5 bg-gray-900 border border-gray-700 rounded-xl" data-testid={testId}>
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color ?? "text-white"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    passed: "bg-green-900 text-green-300 border-green-700",
    failed: "bg-red-900 text-red-300 border-red-700",
    running: "bg-yellow-900 text-yellow-300 border-yellow-700",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${map[status] ?? "bg-gray-800 text-gray-400 border-gray-600"}`}>
      {status}
    </span>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-6 text-right">{value}</span>
    </div>
  );
}

function TimeSeriesChart({ data }: { data: TimePoint[] }) {
  if (data.length === 0) return <p className="text-gray-500 text-sm text-center py-6">No data</p>;
  const maxRuns = Math.max(...data.map(d => d.runs), 1);
  return (
    <div className="overflow-x-auto" data-testid="time-series-chart">
      <div className="flex items-end gap-1 h-24 min-w-0">
        {data.map(d => (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 min-w-0" title={`${d.date}: ${d.runs} runs, ${d.findings} findings`}>
            <div
              className="w-full rounded-t"
              style={{
                height: `${Math.max((d.runs / maxRuns) * 80, d.runs > 0 ? 4 : 0)}px`,
                background: d.failed > 0 ? "#ef4444" : "#22c55e",
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-600 mt-1">
        <span>{data[0]?.date?.slice(5)}</span>
        <span>{data[data.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  );
}

export default function MetricsDashboard() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/metrics?days=${days}`);
    if (!res.ok) { setError("Failed to load metrics"); setLoading(false); return; }
    const d = await res.json();
    setData(d);
    setError(null);
    setLoading(false);
  }, [days]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="metrics-dashboard">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Run Metrics</h1>
            <p className="text-gray-400 text-sm mt-1">CI pipeline health and trends</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={days}
              onChange={e => setDays(parseInt(e.target.value))}
              className="bg-gray-800 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none"
              data-testid="days-selector"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button onClick={load} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-600 transition-colors">
              ↺ Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950 border border-red-700 rounded-lg text-red-300 text-sm" data-testid="metrics-error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24" data-testid="metrics-loading">
            <div className="text-gray-500 animate-pulse">Loading metrics…</div>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="summary-cards">
              <StatCard
                label="Total runs"
                value={data.summary.total_runs}
                sub={`${days}d window`}
                testId="stat-total-runs"
              />
              <StatCard
                label="Pass rate"
                value={`${data.summary.pass_rate_pct}%`}
                sub={`${data.summary.passed_runs} passed / ${data.summary.failed_runs} failed`}
                color={data.summary.pass_rate_pct >= 80 ? "text-green-400" : data.summary.pass_rate_pct >= 50 ? "text-yellow-400" : "text-red-400"}
                testId="stat-pass-rate"
              />
              <StatCard
                label="Total findings"
                value={data.summary.total_findings}
                sub={`${data.summary.avg_findings_per_run} avg/run`}
                color={data.summary.total_findings > 0 ? "text-yellow-400" : "text-green-400"}
                testId="stat-findings"
              />
              <StatCard
                label="Avg duration"
                value={`${(data.summary.avg_duration_ms / 1000).toFixed(1)}s`}
                sub={`${data.summary.snippets_total} snippets total`}
                testId="stat-duration"
              />
            </div>

            {/* Secondary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Snippets passed" value={data.summary.snippets_passed} color="text-green-400" testId="stat-snippets-passed" />
              <StatCard label="Snippets failed" value={data.summary.snippets_failed} color={data.summary.snippets_failed > 0 ? "text-red-400" : "text-green-400"} testId="stat-snippets-failed" />
              <StatCard label="Drift detected" value={data.summary.drift_detected_count} color={data.summary.drift_detected_count > 0 ? "text-yellow-400" : "text-green-400"} testId="stat-drift" />
              <StatCard label="Snippet pass rate" value={data.summary.snippets_total > 0 ? `${Math.round((data.summary.snippets_passed / data.summary.snippets_total) * 100)}%` : "—"} testId="stat-snippet-pass-rate" />
            </div>

            {/* Time series + Finding breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 bg-gray-900 border border-gray-700 rounded-xl" data-testid="time-series-section">
                <h3 className="text-white font-semibold mb-4">Run history</h3>
                <TimeSeriesChart data={data.time_series} />
                <div className="flex gap-4 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-500 inline-block" /> Passed</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500 inline-block" /> Failed</span>
                </div>
              </div>

              <div className="p-5 bg-gray-900 border border-gray-700 rounded-xl" data-testid="finding-breakdown-section">
                <h3 className="text-white font-semibold mb-4">Findings by type</h3>
                {Object.keys(data.finding_breakdown.by_kind).length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-6">No findings 🎉</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(data.finding_breakdown.by_kind)
                      .sort(([, a], [, b]) => b - a)
                      .map(([kind, count]) => (
                        <div key={kind}>
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>{kind}</span>
                            <span>{count}</span>
                          </div>
                          <MiniBar value={count} max={data.summary.total_findings} color="bg-yellow-500" />
                        </div>
                      ))}
                  </div>
                )}

                {Object.keys(data.finding_breakdown.by_severity).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-xs text-gray-500 mb-2">By severity</p>
                    <div className="flex gap-3">
                      {Object.entries(data.finding_breakdown.by_severity).map(([sev, count]) => (
                        <div key={sev} className="text-center">
                          <p className={`text-lg font-bold ${sev === "error" ? "text-red-400" : sev === "warning" ? "text-yellow-400" : "text-blue-400"}`}>{count}</p>
                          <p className="text-xs text-gray-500">{sev}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Top failing files */}
            {data.top_failing_files.length > 0 && (
              <div className="p-5 bg-gray-900 border border-gray-700 rounded-xl" data-testid="top-failing-files">
                <h3 className="text-white font-semibold mb-4">Top failing files</h3>
                <div className="space-y-2">
                  {data.top_failing_files.slice(0, 8).map(f => (
                    <div key={f.file_path} className="flex items-center justify-between">
                      <span className="text-sm font-mono text-gray-400 truncate">{f.file_path}</span>
                      <span className="text-sm text-red-400 font-medium ml-4 shrink-0">{f.error_count} errors</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent runs */}
            <div className="p-5 bg-gray-900 border border-gray-700 rounded-xl" data-testid="recent-runs-section">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-semibold">Recent runs</h3>
                <Link href="/dashboard/runs" className="text-xs text-indigo-400 hover:text-indigo-300">
                  View all →
                </Link>
              </div>
              {data.recent_runs.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No runs yet — trigger your first CI run</p>
              ) : (
                <div className="space-y-2">
                  {data.recent_runs.map(run => (
                    <div key={run.id} className="flex items-center gap-4 p-3 bg-gray-800 rounded-lg text-sm">
                      <StatusBadge status={run.status} />
                      <span className="text-gray-400 font-mono text-xs">{run.commit_sha}</span>
                      <span className="text-gray-400 truncate flex-1">{run.branch}</span>
                      <span className="text-gray-500 text-xs">{run.finding_count} findings</span>
                      <span className="text-gray-500 text-xs">{((run.duration_ms ?? 0) / 1000).toFixed(1)}s</span>
                      {run.completed_at && (
                        <span className="text-gray-600 text-xs shrink-0">
                          {new Date(run.completed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Export link */}
            <div className="p-4 bg-gray-900 border border-gray-700 rounded-xl flex justify-between items-center">
              <div>
                <p className="text-sm text-white font-medium">Export metrics data</p>
                <p className="text-xs text-gray-500">Download as JSON for BI tools or dashboards</p>
              </div>
              <a
                href={`/api/metrics?days=${days}`}
                download={`docsci-metrics-${days}d.json`}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-600 transition-colors"
                data-testid="export-metrics-btn"
              >
                ⬇ Export JSON
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
