"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  github_repo?: string;
  docs_path?: string;
  openapi_path?: string;
  ci_enabled: boolean;
  created_at: string;
}

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
}

const STATUS_COLORS: Record<string, string> = {
  passed: "bg-green-900 text-green-300",
  failed: "bg-red-900 text-red-300",
  running: "bg-blue-900 text-blue-300 animate-pulse",
  pending: "bg-gray-700 text-gray-300",
  cancelled: "bg-gray-700 text-gray-400",
};

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runMsg, setRunMsg] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // Load project from projects list
        const projRes = await fetch("/api/projects");
        if (projRes.ok) {
          const data = await projRes.json();
          const found = (data.projects ?? []).find((p: Project) => p.id === id);
          if (found) setProject(found);
        }

        // Load runs for this project
        const runsRes = await fetch(`/api/runs/queue`);
        if (runsRes.ok) {
          const data = await runsRes.json();
          const projectRuns = (data.runs ?? []).filter((r: Run & { project_id: string }) => r.project_id === id);
          setRuns(projectRuns);
        }
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const triggerRun = async () => {
    setTriggering(true);
    setRunMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/runs/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "inline", project_id: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Run failed");
      setRunMsg(`Run completed: ${data.finding_count} finding(s), ${data.suggestion_count ?? 0} AI fix(es) — ${(data.duration_ms / 1000).toFixed(1)}s`);

      // Reload runs
      const runsRes = await fetch("/api/runs/queue");
      if (runsRes.ok) {
        const runsData = await runsRes.json();
        const projectRuns = (runsData.runs ?? []).filter((r: Run & { project_id: string }) => r.project_id === id);
        setRuns(projectRuns);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setTriggering(false);
    }
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto py-16 px-4 text-center text-gray-500">Loading…</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Breadcrumb */}
      <div className="text-xs text-gray-500 mb-6 flex items-center gap-2">
        <Link href="/dashboard" className="hover:text-gray-300">Dashboard</Link>
        <span>/</span>
        <Link href="/dashboard/projects" className="hover:text-gray-300">Projects</Link>
        <span>/</span>
        <span className="text-gray-300">{project?.name ?? id.slice(0, 8)}</span>
      </div>

      {/* Project header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1" data-testid="project-name">
              {project?.name ?? "Project"}
            </h1>
            {project?.github_repo && (
              <p className="text-gray-400 font-mono text-sm mb-1">
                📦 {project.github_repo}
              </p>
            )}
            <div className="flex gap-3 text-xs text-gray-500 mt-2">
              {project?.docs_path && <span>docs: {project.docs_path}</span>}
              {project?.openapi_path && <span>openapi: {project.openapi_path}</span>}
              <span className={`px-2 py-0.5 rounded-full ${project?.ci_enabled ? "bg-green-900 text-green-300" : "bg-gray-700 text-gray-400"}`}>
                {project?.ci_enabled ? "CI enabled" : "CI off"}
              </span>
            </div>
          </div>
          <button
            onClick={triggerRun}
            disabled={triggering}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition-colors flex items-center gap-2"
            data-testid="trigger-run-btn"
          >
            {triggering ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Running…
              </>
            ) : "▶ Run CI"}
          </button>
        </div>

        {runMsg && (
          <div className="mt-4 bg-green-900/30 border border-green-700 rounded-lg px-4 py-2 text-green-300 text-sm">
            ✓ {runMsg}
          </div>
        )}
        {error && (
          <div className="mt-4 bg-red-900/30 border border-red-700 rounded-lg px-4 py-2 text-red-300 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Run history */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Run History</h2>
        {runs.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
            <p className="text-gray-400 text-sm">No runs yet. Click "Run CI" to start your first run.</p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="run-list">
            {runs.map(run => (
              <Link
                key={run.id}
                href={`/dashboard/projects/${id}/runs/${run.id}`}
                className="block bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-colors group"
                data-testid="run-row"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[run.status] ?? "bg-gray-700 text-gray-300"}`}>
                      {run.status}
                    </span>
                    <span className="text-sm font-mono text-gray-400">
                      {run.branch}/{run.commit_sha?.slice(0, 7) ?? "HEAD"}
                    </span>
                    {run.drift_detected && (
                      <span className="text-xs bg-orange-900 text-orange-300 px-2 py-0.5 rounded-full">drift</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{run.snippets_passed ?? 0}/{run.snippets_total ?? 0} snippets</span>
                    {run.duration_ms && <span>{(run.duration_ms / 1000).toFixed(1)}s</span>}
                    <span>{new Date(run.started_at).toLocaleString()}</span>
                    <span className="text-gray-600 group-hover:text-gray-400">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
