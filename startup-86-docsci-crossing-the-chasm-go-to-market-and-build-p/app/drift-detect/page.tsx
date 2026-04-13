"use client";

import { useState, useEffect } from "react";

interface DriftFinding {
  type: string;
  severity: "error" | "warning" | "info";
  file: string;
  line?: number;
  language?: string;
  evidence: string;
  message: string;
  suggestion: string;
  specPath?: string;
  specOperationId?: string;
}

interface DriftReport {
  specTitle: string;
  specVersion: string;
  docsAnalyzed: number;
  fencesAnalyzed: number;
  findings: DriftFinding[];
  endpointCoverage: {
    total: number;
    covered: number;
    uncovered: string[];
  };
  ranAt: string;
}

const SEVERITY_COLOR: Record<string, string> = {
  error: "bg-red-50 border-red-200 text-red-800",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
  info: "bg-blue-50 border-blue-200 text-blue-700",
};

const SEVERITY_ICON: Record<string, string> = {
  error: "✗",
  warning: "⚠",
  info: "ℹ",
};

const TYPE_LABELS: Record<string, string> = {
  endpoint_not_in_spec: "Endpoint not in spec",
  wrong_method: "Wrong HTTP method",
  sdk_method_removed: "SDK method removed/unknown",
  required_param_missing: "Required param missing",
  missing_example: "No doc coverage",
  deprecated_pattern: "Deprecated pattern",
  wrong_response_shape: "Wrong response shape",
};

const SAMPLE_SPEC = `openapi: "3.1.0"
info:
  title: Acme API
  version: "2.1.0"
servers:
  - url: https://api.acme.com/v2
paths:
  /init:
    post:
      operationId: initClient
      summary: Initialize client session (replaces deprecated /connect)
      description: "Breaking change in v2.0: POST /connect removed. Use POST /init instead."
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [api_key]
              properties:
                api_key:
                  type: string
      responses:
        "200":
          description: Session initialized
  /status:
    get:
      operationId: getStatus
      summary: Get client status
      responses:
        "200":
          description: Current status
  /users:
    get:
      operationId: listUsers
      summary: List users
      responses:
        "200":
          description: Users list`;

const SAMPLE_DOC = {
  path: "docs/getting-started.md",
  content: "# Getting Started\n\nHere is how to connect:",
  codeFences: [
    {
      language: "python",
      code: `# Old pattern — drift!
client = AcmeClient(api_key="sk_test_abc123")
client.connect()  # removed in v2, should be client.init()
print(client.status())`,
      startLine: 10,
    },
    {
      language: "python",
      code: `# Using requests — wrong method!
import requests
response = requests.get("/init", json={"api_key": "sk_test_abc123"})`,
      startLine: 25,
    },
    {
      language: "python",
      code: `# Correct usage
import requests
response = requests.post("/init", json={"api_key": "sk_test_abc123"})
print(response.status_code)`,
      startLine: 40,
    },
  ],
};

export default function DriftDetectPage() {
  const [specText, setSpecText] = useState(SAMPLE_SPEC);
  const [docPath, setDocPath] = useState(SAMPLE_DOC.path);
  const [docContent, setDocContent] = useState(
    SAMPLE_DOC.codeFences.map((f) => `\`\`\`${f.language}\n${f.code}\n\`\``).join("\n\n")
  );
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DriftReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "error" | "warning" | "info">("all");
  const [sampleSummary, setSampleSummary] = useState<{
    findingCount: number;
    coveragePercent: number;
    topFindings: Array<{ type: string; severity: string; message: string }>;
  } | null>(null);

  // Load sample summary on mount
  useEffect(() => {
    fetch("/api/drift-detect")
      .then((r) => r.json())
      .then((d) => {
        if (d.sample_run) setSampleSummary(d.sample_run);
      })
      .catch(() => null);
  }, []);

  // Parse doc content into codeFences
  function parseDocFences(content: string) {
    const fences: { language: string; code: string }[] = [];
    const regex = /```(\w*)\n([\s\S]*?)```/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(content)) !== null) {
      fences.push({ language: m[1] || "text", code: m[2] });
    }
    return fences;
  }

  const run = async () => {
    setLoading(true);
    setError(null);
    setReport(null);

    const fences = parseDocFences(docContent);
    if (fences.length === 0) {
      setError("No code fences found in doc content. Wrap code in triple backticks.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/drift-detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openapi_text: specText,
          docs: [
            {
              path: docPath || "input.md",
              content: docContent,
              codeFences: fences,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Unknown error");
      else setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const runOnSampleRepo = async () => {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      // Use the pre-populated sample spec + doc
      const fences = parseDocFences(
        SAMPLE_DOC.codeFences.map((f) => `\`\`\`${f.language}\n${f.code}\n\``).join("\n\n")
      );
      const res = await fetch("/api/drift-detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openapi_text: SAMPLE_SPEC,
          docs: [{ path: "docs/getting-started.md", content: "", codeFences: SAMPLE_DOC.codeFences }],
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Unknown error");
      else setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const filtered = report
    ? filter === "all"
      ? report.findings
      : report.findings.filter((f) => f.severity === filter)
    : [];

  const errorCount = report?.findings.filter((f) => f.severity === "error").length ?? 0;
  const warnCount = report?.findings.filter((f) => f.severity === "warning").length ?? 0;
  const infoCount = report?.findings.filter((f) => f.severity === "info").length ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🔍</span>
            <h1 className="text-2xl font-bold text-gray-900">Drift Detection</h1>
          </div>
          <p className="text-gray-500 text-sm">
            Compare OpenAPI endpoints, methods, and required params against your
            doc examples. Automatically flags broken, removed, or mismatched patterns.
          </p>
        </div>

        {/* Live sample stats */}
        {sampleSummary && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
            <p className="text-sm font-medium text-indigo-700 mb-2">
              Sample repo: Acme API v2.1.0 — live drift analysis
            </p>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="px-2 py-1 bg-white rounded-full border border-indigo-200 text-indigo-600">
                {sampleSummary.findingCount} findings
              </span>
              <span className="px-2 py-1 bg-white rounded-full border border-indigo-200 text-indigo-600">
                {sampleSummary.coveragePercent}% endpoint coverage
              </span>
              {sampleSummary.topFindings.slice(0, 2).map((f, i) => (
                <span key={i} className="px-2 py-1 bg-white rounded-full border border-indigo-200 text-indigo-600 max-w-xs truncate">
                  {SEVERITY_ICON[f.severity]} {TYPE_LABELS[f.type] ?? f.type}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Input form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OpenAPI Spec (YAML or JSON)
            </label>
            <textarea
              value={specText}
              onChange={(e) => setSpecText(e.target.value)}
              className="w-full h-64 font-mono text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Paste your OpenAPI spec here..."
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Doc file path
              </label>
              <input
                value={docPath}
                onChange={(e) => setDocPath(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="docs/getting-started.md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Doc content (Markdown with code fences)
              </label>
              <textarea
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                className="w-full h-48 font-mono text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Paste Markdown with ```python / ```javascript code blocks..."
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={run}
            disabled={loading || !specText || !docContent}
            className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Analyzing drift…
              </span>
            ) : (
              "🔍 Detect Drift"
            )}
          </button>
          <button
            onClick={runOnSampleRepo}
            disabled={loading}
            className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Run on sample repo
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
            {/* Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {report.specTitle}{" "}
                    <span className="text-gray-400 font-normal text-sm">v{report.specVersion}</span>
                  </h2>
                  <p className="text-xs text-gray-400">
                    {report.docsAnalyzed} docs · {report.fencesAnalyzed} code fences analyzed
                  </p>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(report.ranAt).toLocaleTimeString()}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {errorCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    ✗ {errorCount} errors
                  </span>
                )}
                {warnCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                    ⚠ {warnCount} warnings
                  </span>
                )}
                {infoCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    ℹ {infoCount} info
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {report.endpointCoverage.covered}/{report.endpointCoverage.total} endpoints covered
                </span>
              </div>

              {/* Coverage bar */}
              {report.endpointCoverage.total > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Endpoint coverage</span>
                    <span>
                      {Math.round(
                        (report.endpointCoverage.covered / report.endpointCoverage.total) * 100
                      )}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{
                        width: `${(report.endpointCoverage.covered / report.endpointCoverage.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2">
              {(["all", "error", "warning", "info"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors capitalize ${
                    filter === f
                      ? "bg-indigo-600 text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {f === "all" ? `All (${report.findings.length})` : f}
                </button>
              ))}
            </div>

            {/* Findings list */}
            <div className="space-y-2">
              {filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
                  {filter === "all"
                    ? "No drift findings! Docs and spec are in sync. ✓"
                    : `No ${filter} findings.`}
                </div>
              ) : (
                filtered.map((f, i) => (
                  <div
                    key={i}
                    className={`border rounded-xl p-4 ${SEVERITY_COLOR[f.severity]}`}
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <span className="font-bold text-sm flex-shrink-0">
                        {SEVERITY_ICON[f.severity]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="font-medium text-sm">{f.message}</span>
                          <span className="text-xs opacity-60 px-1.5 py-0.5 rounded bg-black/5">
                            {TYPE_LABELS[f.type] ?? f.type}
                          </span>
                        </div>
                        <p className="text-xs opacity-70">
                          {f.file}
                          {f.line ? `:${f.line}` : ""}
                          {f.language ? ` · ${f.language}` : ""}
                        </p>
                      </div>
                    </div>

                    {f.evidence && (
                      <code className="block text-xs bg-black/5 rounded px-2 py-1 font-mono mt-2 truncate">
                        {f.evidence}
                      </code>
                    )}

                    <p className="text-xs mt-2 opacity-80">
                      💡 {f.suggestion}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400 space-x-4">
          <a href="/smoke-test" className="hover:text-gray-600">Smoke Tests</a>
          <a href="/demo" className="hover:text-gray-600">Demo</a>
          <a href="/import" className="hover:text-gray-600">Repo Import</a>
          <a href="/" className="hover:text-gray-600">Home</a>
        </div>
      </div>
    </div>
  );
}
