"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ProjectWizard, type WizardResult } from "@/components/ProjectWizard";

interface Project {
  id: string;
  name: string;
  github_repo?: string;
  docs_path?: string;
  ci_enabled: boolean;
  created_at: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const createProject = async (form: WizardResult) => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          github_repo: form.github_repo,
          docs_path: form.docs_path,
          openapi_path: form.openapi_path,
          sdk_languages: form.sdk_languages,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create project");
      setProjects(prev => [data.project, ...prev]);
      setShowWizard(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Wizard overlay */}
      {showWizard && (
        <ProjectWizard
          onComplete={createProject}
          onCancel={() => { setShowWizard(false); setError(null); }}
          creating={creating}
          error={error}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-gray-400 text-sm mt-1">Connect your docs repos and start CI runs</p>
        </div>
        <button
          onClick={() => { setError(null); setShowWizard(true); }}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-500 transition-colors"
          data-testid="new-project-btn"
        >
          + New Project
        </button>
      </div>

      {/* Error state (outside wizard) */}
      {error && !showWizard && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-6 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Project list */}
      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">📁</div>
          <p className="text-white font-medium mb-1">No projects yet</p>
          <p className="text-gray-400 text-sm mb-4">
            Create your first project to start running CI on your docs
          </p>
          <button
            onClick={() => setShowWizard(true)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-500 transition-colors"
            data-testid="new-project-empty-cta"
          >
            + New Project
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map(project => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="block bg-gray-900 border border-gray-700 hover:border-gray-500 rounded-xl p-5 transition-colors"
              data-testid="project-card"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">{project.name}</h3>
                  {project.github_repo && (
                    <p className="text-gray-400 text-sm mt-0.5">{project.github_repo}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      project.ci_enabled
                        ? "bg-green-900 text-green-300"
                        : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {project.ci_enabled ? "CI on" : "CI off"}
                  </span>
                  <span className="text-gray-500 text-sm">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
