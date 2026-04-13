"use client";

import { useState } from "react";
import Link from "next/link";

interface FencePreview {
  language: string;
  line: number;
  preview: string;
}

interface FileResult {
  path: string;
  title: string;
  word_count: number;
  code_fences: number;
  links: number;
  headings: number;
  languages: string[];
  fence_previews: FencePreview[];
}

interface ImportResult {
  ok: boolean;
  repo: { owner: string; repo: string; branch: string; url: string };
  scan: {
    files_found: number;
    files_scanned: number;
    docs_parsed: number;
    total_code_fences: number;
    total_links: number;
    languages: string[];
    language_breakdown: Record<string, number>;
    openapi_files: string[];
    duration_ms: number;
  };
  files: FileResult[];
}

const EXAMPLE_REPOS = [
  { label: "supabase/supabase", url: "https://github.com/supabase/supabase" },
  { label: "trpc/trpc", url: "https://github.com/trpc/trpc" },
  { label: "vercel/next.js", url: "https://github.com/vercel/next.js" },
  { label: "facebook/docusaurus", url: "https://github.com/facebook/docusaurus" },
];

const LANG_COLORS: Record<string, string> = {
  python: "bg-blue-900/60 text-blue-300 border-blue-700/50",
  javascript: "bg-yellow-900/60 text-yellow-300 border-yellow-700/50",
  typescript: "bg-blue-900/60 text-blue-200 border-blue-600/50",
  go: "bg-cyan-900/60 text-cyan-300 border-cyan-700/50",
  bash: "bg-gray-800 text-gray-300 border-gray-600/50",
  ruby: "bg-red-900/60 text-red-300 border-red-700/50",
  java: "bg-orange-900/60 text-orange-300 border-orange-700/50",
  rust: "bg-orange-900/60 text-orange-200 border-orange-600/50",
};

export default function ImportPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function handleImport(importUrl = url) {
    if (!importUrl.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setExpanded(new Set());
    setUrl(importUrl);

    try {
      const res = await fetch("/api/repo-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setResult(data);
      // Auto-expand first 5 files
      const first5 = new Set<string>(data.files.slice(0, 5).map((f: FileResult) => f.path));
      setExpanded(first5);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function toggleFile(path: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Nav */}
      <div className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <Link href="/" className="text-gray-500 hover:text-white text-sm">← Home</Link>
        <span className="text-gray-700">/</span>
        <span className="text-sm text-gray-300">Import repo</span>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 text-xs text-green-300 bg-green-950/40 border border-green-700/50 px-3 py-1.5 rounded-full mb-4">
            🔓 Public repos — no token required
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Import a GitHub repo</h1>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xl">
            Paste any public GitHub URL. DocsCI fetches the repo tree, downloads Markdown docs,
            and parses code fences with remark — extracting language, line numbers, and content
            ready for execution and drift analysis.
          </p>
        </div>

        {/* Import form */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            GitHub repository URL
          </label>
          <div className="flex gap-3">
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleImport(); }}
              placeholder="https://github.com/owner/repo"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50"
              disabled={loading}
            />
            <button
              onClick={() => handleImport()}
              disabled={loading || !url.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-5 py-3 rounded-xl text-sm transition-colors whitespace-nowrap"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⚙️</span> Importing…
                </span>
              ) : (
                "Import →"
              )}
            </button>
          </div>

          {/* Example repos */}
          <div className="mt-4">
            <span className="text-xs text-gray-500 mr-2">Try an example:</span>
            {EXAMPLE_REPOS.map(ex => (
              <button
                key={ex.url}
                onClick={() => handleImport(ex.url)}
                disabled={loading}
                className="text-xs text-indigo-400 hover:text-indigo-300 mr-3 disabled:opacity-50"
              >
                {ex.label}
              </button>
            ))}
          </div>
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
            {/* Summary */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-white text-lg">
                    {result.repo.owner}/{result.repo.repo}
                  </h2>
                  <div className="text-xs text-gray-500 mt-0.5">
                    branch: {result.repo.branch} · {result.scan.duration_ms}ms
                  </div>
                </div>
                <a
                  href={result.repo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-gray-500 hover:text-white"
                >
                  View on GitHub ↗
                </a>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
                {[
                  { label: "Files found", value: result.scan.files_found },
                  { label: "Scanned", value: result.scan.files_scanned },
                  { label: "Parsed", value: result.scan.docs_parsed },
                  { label: "Code fences", value: result.scan.total_code_fences },
                  { label: "Links", value: result.scan.total_links },
                  { label: "OpenAPI", value: result.scan.openapi_files.length },
                ].map(s => (
                  <div key={s.label} className="text-center bg-gray-800/50 rounded-lg py-2 px-1">
                    <div className="text-xl font-bold text-white">{s.value}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Languages */}
              {result.scan.languages.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {Object.entries(result.scan.language_breakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([lang, count]) => (
                      <span
                        key={lang}
                        className={`text-xs px-2 py-0.5 rounded-full border ${LANG_COLORS[lang] ?? "bg-gray-800 text-gray-400 border-gray-600/50"}`}
                      >
                        {lang} ({count})
                      </span>
                    ))}
                </div>
              )}

              {/* OpenAPI */}
              {result.scan.openapi_files.length > 0 && (
                <div className="text-xs text-yellow-300 bg-yellow-950/30 border border-yellow-700/30 px-3 py-2 rounded-lg">
                  ⚠️ OpenAPI spec detected: {result.scan.openapi_files.join(", ")} — drift analysis will run on CI
                </div>
              )}

              {/* Run demo CTA */}
              <div className="mt-4 pt-4 border-t border-gray-800 flex items-center gap-3">
                <Link
                  href="/demo"
                  className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  ⚡ Run CI pipeline on sample →
                </Link>
                <Link href="/signup" className="text-sm text-gray-400 hover:text-white">
                  Sign up to run CI on this repo →
                </Link>
              </div>
            </div>

            {/* File list */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-white">
                {result.files.length} docs parsed
              </h3>
              <button
                onClick={() => {
                  if (expanded.size === result.files.length) setExpanded(new Set());
                  else setExpanded(new Set(result.files.map(f => f.path)));
                }}
                className="text-xs text-gray-500 hover:text-white"
              >
                {expanded.size === result.files.length ? "Collapse all" : "Expand all"}
              </button>
            </div>

            <div className="space-y-2">
              {result.files.map(file => (
                <div key={file.path} className="border border-gray-800 rounded-xl overflow-hidden bg-gray-900">
                  <button
                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-800/50 transition-colors"
                    onClick={() => toggleFile(file.path)}
                  >
                    <span className="text-gray-500">📄</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-mono truncate">{file.path}</div>
                      {file.title !== "Untitled" && (
                        <div className="text-xs text-gray-500 truncate">{file.title}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 shrink-0">
                      {file.code_fences > 0 && (
                        <span className="text-indigo-400">{file.code_fences} fences</span>
                      )}
                      {file.links > 0 && <span>{file.links} links</span>}
                      <span>{file.word_count.toLocaleString()} words</span>
                    </div>
                    <span className="text-gray-600 text-sm ml-2">
                      {expanded.has(file.path) ? "▲" : "▼"}
                    </span>
                  </button>

                  {expanded.has(file.path) && (
                    <div className="border-t border-gray-800 px-4 py-3 space-y-3">
                      {/* Language tags */}
                      {file.languages.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {file.languages.map(lang => (
                            <span
                              key={lang}
                              className={`text-xs px-2 py-0.5 rounded-full border ${LANG_COLORS[lang] ?? "bg-gray-800 text-gray-400 border-gray-600/50"}`}
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Code fence previews */}
                      {file.fence_previews.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-gray-500">Code fence previews</div>
                          {file.fence_previews.map((fp, i) => (
                            <div key={i} className="bg-gray-800/70 rounded-lg p-3">
                              <div className="text-xs text-gray-500 mb-1.5">
                                <span className="text-indigo-400 font-medium">{fp.language}</span>
                                {" "}· line {fp.line}
                              </div>
                              <pre className="text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
                                {fp.preview}
                              </pre>
                            </div>
                          ))}
                        </div>
                      )}

                      {file.code_fences === 0 && (
                        <div className="text-xs text-gray-600 italic">
                          No code fences found in this file
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state instructions */}
        {!result && !loading && !error && (
          <div className="text-center py-16 text-gray-600">
            <div className="text-4xl mb-4">📂</div>
            <p className="text-sm">Enter a GitHub URL above to scan the repo&apos;s docs</p>
          </div>
        )}
      </div>
    </div>
  );
}
