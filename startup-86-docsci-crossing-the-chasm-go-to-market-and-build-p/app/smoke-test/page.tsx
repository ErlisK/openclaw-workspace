"use client";

import { useState } from "react";

interface SmokeResult {
  probe: {
    operationId: string;
    method: string;
    path: string;
    url: string;
    description: string;
    body?: Record<string, unknown>;
  };
  status: "pass" | "fail" | "blocked" | "error" | "skipped";
  statusCode?: number;
  latencyMs?: number;
  responseBody?: string;
  error?: string;
  detail: string;
}

interface SmokeRunSummary {
  baseUrl: string;
  specTitle: string;
  specVersion: string;
  probeCount: number;
  passCount: number;
  failCount: number;
  blockedCount: number;
  errorCount: number;
  skippedCount: number;
  totalLatencyMs: number;
  results: SmokeResult[];
  ranAt: string;
}

const STATUS_COLOR: Record<string, string> = {
  pass: "text-green-600 bg-green-50",
  fail: "text-red-600 bg-red-50",
  blocked: "text-yellow-600 bg-yellow-50",
  error: "text-orange-600 bg-orange-50",
  skipped: "text-gray-400 bg-gray-50",
};

const STATUS_ICON: Record<string, string> = {
  pass: "✓",
  fail: "✗",
  blocked: "⊘",
  error: "⚠",
  skipped: "—",
};

const SAMPLE_SPEC_URL =
  "https://raw.githubusercontent.com/APIs-guru/openapi-directory/main/APIs/github.com/1.1.4/openapi.yaml";
const SAMPLE_BASE_URL = "https://httpbin.org";
const SAMPLE_SPEC_TEXT = `openapi: "3.1.0"
info:
  title: httpbin
  version: "1.0"
servers:
  - url: https://httpbin.org
paths:
  /get:
    get:
      operationId: httpbinGet
      summary: GET test endpoint
      responses:
        "200":
          description: Returns GET data
  /post:
    post:
      operationId: httpbinPost
      summary: POST test endpoint
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                key:
                  type: string
                  example: value
      responses:
        "200":
          description: Returns POST data
  /status/200:
    get:
      operationId: status200
      summary: Returns 200 status
      responses:
        "200":
          description: OK
  /status/404:
    get:
      operationId: status404
      summary: Returns 404 status (expected fail)
      responses:
        "404":
          description: Not found
`;

export default function SmokeTestPage() {
  const [mode, setMode] = useState<"url" | "text">("text");
  const [specUrl, setSpecUrl] = useState("");
  const [specText, setSpecText] = useState(SAMPLE_SPEC_TEXT);
  const [baseUrl, setBaseUrl] = useState(SAMPLE_BASE_URL);
  const [authHeader, setAuthHeader] = useState("");
  const [maxProbes, setMaxProbes] = useState(20);
  const [timeoutMs, setTimeoutMs] = useState(10000);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SmokeRunSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const body: Record<string, unknown> = {
        base_url: baseUrl,
        max_probes: maxProbes,
        timeout_ms: timeoutMs,
      };
      if (mode === "url") body.openapi_url = specUrl;
      else body.openapi_text = specText;
      if (authHeader) body.auth_header = authHeader;

      const res = await fetch("/api/smoke-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Unknown error");
      } else {
        setResult(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const toggle = (i: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🔬</span>
            <h1 className="text-2xl font-bold text-gray-900">API Smoke Tests</h1>
          </div>
          <p className="text-gray-500 text-sm">
            Auto-generate GET/POST probes from your OpenAPI spec and run them
            against a staging URL. Enforce allowlists, collect status codes and
            latency.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 space-y-5">
          {/* Mode tabs */}
          <div>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setMode("text")}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  mode === "text"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Paste spec
              </button>
              <button
                onClick={() => setMode("url")}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  mode === "url"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Spec URL
              </button>
            </div>

            {mode === "text" ? (
              <textarea
                value={specText}
                onChange={(e) => setSpecText(e.target.value)}
                className="w-full h-48 font-mono text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Paste your OpenAPI YAML or JSON here..."
              />
            ) : (
              <input
                value={specUrl}
                onChange={(e) => setSpecUrl(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="https://api.example.com/openapi.yaml"
              />
            )}
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Staging Base URL <span className="text-red-500">*</span>
            </label>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="https://staging-api.example.com"
            />
            <p className="text-xs text-gray-400 mt-1">
              HTTPS only. Private IPs (10.x, 192.168.x, localhost) are blocked.
            </p>
          </div>

          {/* Auth header */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Auth Header{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              value={authHeader}
              onChange={(e) => setAuthHeader(e.target.value)}
              type="password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Bearer sk_test_..."
            />
          </div>

          {/* Options row */}
          <div className="flex gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Max probes
              </label>
              <input
                type="number"
                value={maxProbes}
                onChange={(e) => setMaxProbes(Number(e.target.value))}
                min={1}
                max={50}
                className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Timeout (ms)
              </label>
              <input
                type="number"
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(Number(e.target.value))}
                min={1000}
                max={30000}
                step={1000}
                className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Run button */}
          <button
            onClick={run}
            disabled={loading || !baseUrl || (mode === "url" ? !specUrl : !specText)}
            className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Running smoke tests…
              </span>
            ) : (
              "▶ Run Smoke Tests"
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 text-sm font-medium">Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {result.specTitle}{" "}
                    <span className="text-gray-400 font-normal text-sm">
                      v{result.specVersion}
                    </span>
                  </h2>
                  <p className="text-xs text-gray-400 font-mono">{result.baseUrl}</p>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(result.ranAt).toLocaleTimeString()}
                </div>
              </div>

              {/* Stat pills */}
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  {result.probeCount} probes
                </span>
                {result.passCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    ✓ {result.passCount} pass
                  </span>
                )}
                {result.failCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    ✗ {result.failCount} fail
                  </span>
                )}
                {result.blockedCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                    ⊘ {result.blockedCount} blocked
                  </span>
                )}
                {result.errorCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                    ⚠ {result.errorCount} error
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                  ⏱ {result.totalLatencyMs}ms total
                </span>
              </div>
            </div>

            {/* Results table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {result.results.map((r, i) => (
                <div key={i} className="border-b border-gray-100 last:border-0">
                  <button
                    onClick={() => toggle(i)}
                    className="w-full text-left px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Status badge */}
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0 ${STATUS_COLOR[r.status]}`}
                      >
                        {STATUS_ICON[r.status]}
                      </span>

                      {/* Method badge */}
                      <span
                        className={`font-mono text-xs font-bold px-2 py-0.5 rounded flex-shrink-0 ${
                          r.probe.method === "GET"
                            ? "bg-blue-100 text-blue-700"
                            : r.probe.method === "POST"
                            ? "bg-green-100 text-green-700"
                            : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {r.probe.method}
                      </span>

                      {/* Path */}
                      <span className="font-mono text-sm text-gray-800 flex-1 truncate">
                        {r.probe.path}
                      </span>

                      {/* Status code + latency */}
                      <div className="flex items-center gap-2 text-xs text-gray-400 flex-shrink-0">
                        {r.statusCode && (
                          <span
                            className={
                              r.statusCode < 300
                                ? "text-green-600"
                                : r.statusCode < 500
                                ? "text-yellow-600"
                                : "text-red-600"
                            }
                          >
                            {r.statusCode}
                          </span>
                        )}
                        {r.latencyMs !== undefined && (
                          <span>{r.latencyMs}ms</span>
                        )}
                        <span className="text-gray-300">
                          {expandedRows.has(i) ? "▲" : "▼"}
                        </span>
                      </div>
                    </div>

                    {/* Detail line */}
                    <p className="text-xs text-gray-400 mt-1 ml-9">{r.detail}</p>
                  </button>

                  {/* Expanded body */}
                  {expandedRows.has(i) && (
                    <div className="px-5 pb-4 ml-9 space-y-2">
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">URL: </span>
                        <span className="font-mono">{r.probe.url}</span>
                      </div>
                      {r.probe.body !== undefined && (
                        <div className="text-xs text-gray-500">
                          <span className="font-medium">Request body: </span>
                          <pre className="mt-1 bg-gray-50 rounded p-2 text-xs font-mono overflow-auto max-h-24">
                            {JSON.stringify(r.probe.body, null, 2)}
                          </pre>
                        </div>
                      )}
                      {r.responseBody && (
                        <div className="text-xs text-gray-500">
                          <span className="font-medium">Response: </span>
                          <pre className="mt-1 bg-gray-50 rounded p-2 text-xs font-mono overflow-auto max-h-32">
                            {r.responseBody}
                          </pre>
                        </div>
                      )}
                      {r.error && (
                        <div className="text-xs text-red-600">
                          <span className="font-medium">Error: </span>
                          {r.error}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer links */}
        <div className="mt-8 text-center text-xs text-gray-400 space-x-4">
          <a href="/demo" className="hover:text-gray-600">Demo</a>
          <a href="/import" className="hover:text-gray-600">Repo Import</a>
          <a href="/" className="hover:text-gray-600">Home</a>
        </div>
      </div>
    </div>
  );
}
