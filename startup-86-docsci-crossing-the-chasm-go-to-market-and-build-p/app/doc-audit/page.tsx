"use client";

import { useState, useEffect } from "react";

interface A11yFinding {
  ruleId: string;
  impact: "critical" | "serious" | "moderate" | "minor";
  description: string;
  html: string;
  line?: number;
  suggestion: string;
  fix: string;
  source: "axe" | "structural";
}

interface CopyFinding {
  type: string;
  severity: "error" | "warning" | "info";
  line: number;
  text: string;
  message: string;
  suggestion: string;
}

interface AISuggestion {
  findingType: string;
  original: string;
  suggested: string;
  explanation: string;
}

interface DocAuditReport {
  path: string;
  a11y: {
    violations: number;
    warnings: number;
    passes: number;
    findings: A11yFinding[];
  };
  copy: {
    findings: CopyFinding[];
    stats: {
      words: number;
      sentences: number;
      fleschKincaidGrade: number;
      fleschReadingEase: number;
      avgWordsPerSentence: number;
    };
  };
  aiSuggestions: AISuggestion[];
  patch: string;
  patchHunks: unknown[];
  totalFindings: number;
  ranAt: string;
}

const IMPACT_COLOR: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  serious: "bg-orange-100 text-orange-800 border-orange-200",
  moderate: "bg-yellow-100 text-yellow-800 border-yellow-200",
  minor: "bg-blue-100 text-blue-700 border-blue-200",
  error: "bg-red-100 text-red-800 border-red-200",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  info: "bg-blue-100 text-blue-700 border-blue-200",
};

const SAMPLE_MARKDOWN = `# Getting Started

Welcome to the **Acme API**. This guide is very easy to follow.

## Images

![](https://example.com/dashboard.png)

Click here to [read more](#auth).

## User Management

The configuration is set by the system. Users are created automatically.
Make sure to sanity check your setup before deploying to the blacklist environment.

#### This skips from h2 to h4 (bad!)

The SDK was designed to be basically easy to use. We think you might want to 
just call the init method. It is possible that some configuration is required.
`;

export default function DocAuditPage() {
  const [markdown, setMarkdown] = useState(SAMPLE_MARKDOWN);
  const [filePath, setFilePath] = useState("docs/getting-started.md");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DocAuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"a11y" | "copy" | "ai" | "patch">("a11y");
  const [sampleStats, setSampleStats] = useState<{
    totalFindings: number;
    a11yViolations: number;
    copyFindings: number;
    grade: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/doc-audit")
      .then((r) => r.json())
      .then((d) => {
        if (d.sample_run) {
          setSampleStats({
            totalFindings: d.sample_run.totalFindings,
            a11yViolations: d.sample_run.a11y.violations + d.sample_run.a11y.warnings,
            copyFindings: d.sample_run.copy.findingCount,
            grade: d.sample_run.copy.grade,
          });
        }
      })
      .catch(() => null);
  }, []);

  const run = async (useFixture = false) => {
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const body = useFixture
        ? { markdown: SAMPLE_MARKDOWN, path: filePath, ai_suggestions: true }
        : { markdown, path: filePath, ai_suggestions: true };

      const res = await fetch("/api/doc-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Unknown error");
      else { setReport(data); setActiveTab("a11y"); }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const downloadPatch = () => {
    if (!report?.patch) return;
    const blob = new Blob([report.patch], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "doc-fixes.patch";
    a.click();
    URL.revokeObjectURL(url);
  };

  const gradeColor = (grade: number) => {
    if (grade <= 8) return "text-green-600";
    if (grade <= 12) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">♿</span>
            <h1 className="text-2xl font-bold text-gray-900">Doc Audit</h1>
          </div>
          <p className="text-gray-500 text-sm">
            Render Markdown to HTML, run axe-core accessibility checks, and lint copy for passive
            voice, reading grade, sensitive terms, and more. Generates AI-powered fix suggestions
            and a downloadable patch diff.
          </p>
        </div>

        {/* Live stats */}
        {sampleStats && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
            <p className="text-sm font-medium text-purple-700 mb-2">
              Sample doc: getting-started.md — live audit results
            </p>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="px-2 py-1 bg-white rounded-full border border-purple-200 text-purple-600">
                {sampleStats.totalFindings} total findings
              </span>
              <span className="px-2 py-1 bg-white rounded-full border border-purple-200 text-purple-600">
                {sampleStats.a11yViolations} a11y issues
              </span>
              <span className="px-2 py-1 bg-white rounded-full border border-purple-200 text-purple-600">
                {sampleStats.copyFindings} copy issues
              </span>
              <span className={`px-2 py-1 bg-white rounded-full border border-purple-200 font-semibold ${gradeColor(sampleStats.grade)}`}>
                FK Grade {sampleStats.grade}
              </span>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-4">
          <div className="flex gap-3 mb-3">
            <input
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="docs/getting-started.md"
            />
          </div>
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            className="w-full h-64 font-mono text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Paste Markdown content to audit..."
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => run()}
            disabled={loading || !markdown}
            className="flex-1 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Auditing…
              </span>
            ) : (
              "♿ Run Doc Audit"
            )}
          </button>
          <button
            onClick={() => { setMarkdown(SAMPLE_MARKDOWN); run(true); }}
            disabled={loading}
            className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Run on sample
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Results */}
        {report && (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                <div>
                  <h2 className="font-semibold text-gray-900">{report.path}</h2>
                  <p className="text-xs text-gray-400">
                    {report.copy.stats.words} words · {report.copy.stats.sentences} sentences ·{" "}
                    {new Date(report.ranAt).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    {report.a11y.violations} a11y violations
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                    {report.a11y.warnings} structural warnings
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {report.copy.findings.length} copy issues
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${gradeColor(report.copy.stats.fleschKincaidGrade)} bg-gray-100`}>
                    FK Grade {report.copy.stats.fleschKincaidGrade}
                  </span>
                </div>
              </div>

              {/* Reading stats */}
              <div className="grid grid-cols-3 gap-2 text-xs text-center">
                <div className="bg-gray-50 rounded-lg py-2">
                  <div className="font-bold text-lg text-gray-700">{report.copy.stats.avgWordsPerSentence}</div>
                  <div className="text-gray-400">avg words/sentence</div>
                </div>
                <div className="bg-gray-50 rounded-lg py-2">
                  <div className={`font-bold text-lg ${gradeColor(report.copy.stats.fleschKincaidGrade)}`}>{report.copy.stats.fleschKincaidGrade}</div>
                  <div className="text-gray-400">FK grade level</div>
                </div>
                <div className="bg-gray-50 rounded-lg py-2">
                  <div className="font-bold text-lg text-gray-700">{report.copy.stats.fleschReadingEase}</div>
                  <div className="text-gray-400">readability ease</div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              {([
                ["a11y", `Accessibility (${report.a11y.violations + report.a11y.warnings})`],
                ["copy", `Copy (${report.copy.findings.length})`],
                ["ai", `AI Fixes (${report.aiSuggestions.length})`],
                ["patch", `Patch${report.patch ? " ↓" : ""}`],
              ] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    activeTab === tab
                      ? "bg-purple-600 text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* A11y tab */}
            {activeTab === "a11y" && (
              <div className="space-y-2">
                {report.a11y.findings.length === 0 ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center text-green-700 text-sm">
                    ✓ No accessibility issues found!
                  </div>
                ) : (
                  report.a11y.findings.map((f, i) => (
                    <div key={i} className={`border rounded-xl p-4 ${IMPACT_COLOR[f.impact]}`}>
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold uppercase opacity-60 mt-0.5">{f.impact}</span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{f.description}</p>
                          <p className="text-xs opacity-70 mt-0.5">
                            Rule: {f.ruleId} · {f.source}
                            {f.line ? ` · line ${f.line}` : ""}
                          </p>
                          {f.html && (
                            <code className="block text-xs bg-black/5 rounded px-2 py-1 font-mono mt-1 truncate">
                              {f.html.slice(0, 100)}
                            </code>
                          )}
                          <p className="text-xs mt-1.5 opacity-80">💡 {f.fix}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Copy tab */}
            {activeTab === "copy" && (
              <div className="space-y-2">
                {report.copy.findings.length === 0 ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center text-green-700 text-sm">
                    ✓ No copy issues found!
                  </div>
                ) : (
                  report.copy.findings.map((f, i) => (
                    <div key={i} className={`border rounded-xl p-4 ${IMPACT_COLOR[f.severity]}`}>
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold uppercase opacity-60 mt-0.5">{f.severity}</span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{f.message}</p>
                          <p className="text-xs opacity-70 mt-0.5">
                            {f.type.replace(/_/g, " ")}
                            {f.line > 0 ? ` · line ${f.line}` : ""}
                          </p>
                          {f.text && (
                            <code className="block text-xs bg-black/5 rounded px-2 py-1 font-mono mt-1 truncate">
                              {f.text.slice(0, 100)}
                            </code>
                          )}
                          <p className="text-xs mt-1.5 opacity-80">💡 {f.suggestion}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* AI Fixes tab */}
            {activeTab === "ai" && (
              <div className="space-y-3">
                {report.aiSuggestions.length === 0 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-gray-500 text-sm">
                    {report.totalFindings === 0
                      ? "No findings to fix!"
                      : "AI suggestions are generated on Vercel deployment (requires Vercel AI Gateway)."}
                  </div>
                ) : (
                  report.aiSuggestions.map((s, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                          {s.findingType.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-gray-400">AI suggestion</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Before</p>
                          <code className="block text-xs bg-red-50 border border-red-100 rounded p-2 text-red-800">
                            {s.original}
                          </code>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">After</p>
                          <code className="block text-xs bg-green-50 border border-green-100 rounded p-2 text-green-800">
                            {s.suggested}
                          </code>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">{s.explanation}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Patch tab */}
            {activeTab === "patch" && (
              <div>
                {!report.patch ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-gray-500 text-sm">
                    No patch available (AI suggestions needed to generate patch diff).
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs text-gray-500">
                        Unified diff — {report.patchHunks.length} hunk(s)
                      </p>
                      <button
                        onClick={downloadPatch}
                        className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        ↓ Download .patch
                      </button>
                    </div>
                    <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 text-xs font-mono overflow-x-auto whitespace-pre">
                      {report.patch.split("\n").map((line, i) => (
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
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400 space-x-4">
          <a href="/drift-detect" className="hover:text-gray-600">Drift Detection</a>
          <a href="/smoke-test" className="hover:text-gray-600">Smoke Tests</a>
          <a href="/demo" className="hover:text-gray-600">Demo</a>
          <a href="/" className="hover:text-gray-600">Home</a>
        </div>
      </div>
    </div>
  );
}
