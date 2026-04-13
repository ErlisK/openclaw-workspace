"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  github_repo?: string;
  docs_path?: string;
  ci_enabled: boolean;
  created_at: string;
}

const SEV_BADGE: Record<string, string> = {
  free: "bg-gray-800 text-gray-300",
  starter: "bg-indigo-900 text-indigo-300",
  pro: "bg-purple-900 text-purple-300",
  enterprise: "bg-yellow-900 text-yellow-300",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    github_repo: "",
    docs_path: "docs",
    openapi_path: "",
  });

  const loadProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to load projects");
      const data = await res.json();
      setProjects(data.projects ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProjects(); }, []);

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create project");
      setProjects(prev => [data.project, ...prev]);
      setShowForm(false);
      setForm({ name: "", github_repo: "", docs_path: "docs", openapi_path: "" });
    } catch (e) {
      setError(String(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-gray-400 text-sm mt-1">Connect your docs repos and start CI runs</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-500 transition-colors"
          data-testid="new-project-btn"
        >
          + New Project
        </button>
      </div>

      {/* Create project form */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-white mb-4">New Project</h2>
          <form onSubmit={createProject} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Project name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="My API Docs"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                data-testid="project-name-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">GitHub repo</label>
              <input
                type="text"
                value={form.github_repo}
                onChange={e => setForm(f => ({ ...f, github_repo: e.target.value }))}
                placeholder="org/repo"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                data-testid="project-repo-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Docs path</label>
                <input
                  type="text"
                  value={form.docs_path}
                  onChange={e => setForm(f => ({ ...f, docs_path: e.target.value }))}
                  placeholder="docs"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">OpenAPI path</label>
                <input
                  type="text"
                  value={form.openapi_path}
                  onChange={e => setForm(f => ({ ...f, openapi_path: e.target.value }))}
                  placeholder="openapi.yaml"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                data-testid="create-project-submit"
              >
                {creating ? "Creating…" : "Create Project"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(null); }}
                className="px-4 py-2 bg-gray-700 text-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error state */}
      {error && !showForm && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-6 text-red-300 text-sm">{error}</div>
      )}

      {/* Project list */}
      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">📁</div>
          <p className="text-white font-medium mb-1">No projects yet</p>
          <p className="text-gray-400 text-sm mb-4">Create your first project to start running CI on your docs</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-500 transition-colors"
          >
            + New Project
          </button>
        </div>
      ) : (
        <div className="space-y-3" data-testid="project-list">
          {projects.map(project => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="block bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition-colors group"
              data-testid="project-card"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                      {project.name}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${project.ci_enabled ? "bg-green-900 text-green-300" : "bg-gray-700 text-gray-400"}`}>
                      {project.ci_enabled ? "CI enabled" : "CI off"}
                    </span>
                  </div>
                  {project.github_repo && (
                    <p className="text-gray-400 text-sm font-mono">{project.github_repo}</p>
                  )}
                  <p className="text-gray-500 text-xs mt-1">
                    docs: {project.docs_path || "docs"} · created {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-gray-600 group-hover:text-gray-400 ml-4">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Back nav */}
      <div className="mt-8 text-xs text-gray-600">
        <Link href="/dashboard" className="hover:text-gray-400">← Dashboard</Link>
      </div>
    </div>
  );
}
