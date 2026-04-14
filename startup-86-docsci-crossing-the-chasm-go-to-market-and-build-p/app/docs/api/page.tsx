import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import Link from "next/link";

export const metadata: Metadata = {
  title: "API Reference — DocsCI",
  description: "Complete API reference for DocsCI — authentication, runs, findings, tokens, and webhooks.",
  alternates: { canonical: "https://snippetci.com/docs/api" },
};

export default function ApiReferencePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <NavBar />

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/docs" className="hover:text-gray-300 transition-colors">Docs</Link>
          <span>/</span>
          <span className="text-gray-300">API Reference</span>
        </div>

        <div className="mb-2 text-indigo-400 text-sm font-medium tracking-wide uppercase">API Reference</div>
        <h1 className="text-4xl font-bold text-white mb-4">DocsCI REST API</h1>
        <p className="text-gray-400 text-lg leading-relaxed mb-10">
          The DocsCI API lets you queue runs, retrieve findings, manage projects, and integrate
          DocsCI into any CI/CD system — not just GitHub Actions.
        </p>

        {/* Base URL */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl px-5 py-4 mb-12 flex items-center gap-3">
          <span className="text-gray-500 text-sm font-mono shrink-0">Base URL</span>
          <code className="text-indigo-300 font-mono text-sm">https://snippetci.com/api</code>
        </div>

        {/* Auth */}
        <section className="mb-12">
          <h2 className="text-white text-2xl font-semibold mb-4" id="authentication">Authentication</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            All API requests require a bearer token. Generate a token in your{" "}
            <Link href="/dashboard/settings" className="text-indigo-400 hover:text-indigo-300 transition-colors">
              Dashboard → Settings → API Tokens
            </Link>
            . Pass it in the <code className="bg-gray-800 px-1 py-0.5 rounded text-xs text-indigo-300">Authorization</code> header:
          </p>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 font-mono text-sm text-green-300 leading-relaxed">
            <span className="text-gray-500">curl</span> https://snippetci.com/api/runs/queue \<br />
            {"  "}<span className="text-gray-500">-H</span> <span className="text-yellow-300">&quot;Authorization: Bearer $DOCSCI_TOKEN&quot;</span> \<br />
            {"  "}<span className="text-gray-500">-H</span> <span className="text-yellow-300">&quot;Content-Type: application/json&quot;</span> \<br />
            {"  "}<span className="text-gray-500">-d</span> <span className="text-yellow-300">&apos;&#123;&quot;repo&quot;:&quot;owner/repo&quot;,&quot;sha&quot;:&quot;abc123&quot;&#125;&apos;</span>
          </div>
        </section>

        {/* Endpoints */}
        <section className="mb-12">
          <h2 className="text-white text-2xl font-semibold mb-6" id="endpoints">Endpoints</h2>

          {/* Runs */}
          <div className="space-y-6">
            <EndpointCard
              method="POST"
              path="/api/runs/queue"
              summary="Queue a documentation run"
              description="Triggers a new DocsCI run against a given repository commit. Returns a run ID you can poll for results."
              request={{
                fields: [
                  { name: "repo", type: "string", required: true, desc: "GitHub repository in owner/repo format." },
                  { name: "sha", type: "string", required: false, desc: "Git commit SHA to check. Defaults to the HEAD of the default branch." },
                  { name: "branch", type: "string", required: false, desc: "Branch name. Used if sha is not provided." },
                  { name: "pr_number", type: "integer", required: false, desc: "Pull request number. When provided, DocsCI posts inline PR comments." },
                  { name: "checks", type: "string[]", required: false, desc: "Subset of checks to run: snippets, drift, accessibility, copy. Defaults to all." },
                ],
              }}
              response={`{
  "id": "run_01HX...",
  "status": "queued",
  "repo": "owner/repo",
  "sha": "abc123",
  "created_at": "2026-04-14T10:00:00Z",
  "url": "https://snippetci.com/runs/run_01HX..."
}`}
            />

            <EndpointCard
              method="GET"
              path="/api/runs/{runId}"
              summary="Get a run"
              description="Retrieve the current status and findings summary for a run."
              response={`{
  "id": "run_01HX...",
  "status": "completed",  // queued | running | completed | failed
  "repo": "owner/repo",
  "sha": "abc123",
  "created_at": "2026-04-14T10:00:00Z",
  "completed_at": "2026-04-14T10:02:34Z",
  "summary": {
    "total": 42,
    "passed": 39,
    "failed": 3,
    "skipped": 0
  }
}`}
            />

            <EndpointCard
              method="GET"
              path="/api/runs"
              summary="List runs"
              description="Returns paginated run history for the authenticated user's organization."
              params={[
                { name: "limit", type: "integer", desc: "Max results (1–100, default 20)." },
                { name: "offset", type: "integer", desc: "Pagination offset." },
                { name: "repo", type: "string", desc: "Filter by repository (owner/repo)." },
                { name: "status", type: "string", desc: "Filter by status: queued | running | completed | failed." },
              ]}
              response={`{
  "runs": [ { "id": "...", "status": "completed", ... } ],
  "total": 128,
  "limit": 20,
  "offset": 0
}`}
            />

            <EndpointCard
              method="GET"
              path="/api/findings"
              summary="Get findings for a run"
              description="Returns detailed findings (failed checks) for a completed run."
              params={[
                { name: "run_id", type: "string", desc: "Required. The run ID to fetch findings for." },
                { name: "kind", type: "string", desc: "Filter by finding type: snippet | drift | accessibility | copy." },
              ]}
              response={`{
  "findings": [
    {
      "id": "fnd_01HX...",
      "kind": "snippet",
      "severity": "error",
      "file": "docs/quickstart.md",
      "line": 42,
      "message": "Python snippet exited with code 1: ModuleNotFoundError: No module named 'requests'",
      "snippet": "import requests\\nrequests.get('https://...')",
      "suggested_fix": "import httpx\\nhttpx.get('https://...')"
    }
  ]
}`}
            />

            <EndpointCard
              method="POST"
              path="/api/tokens"
              summary="Create an API token"
              description="Generates a new API token scoped to the authenticated user's organization."
              request={{
                fields: [
                  { name: "name", type: "string", required: true, desc: "Human-readable label for this token (e.g. 'GitHub Actions prod')." },
                  { name: "expires_at", type: "ISO 8601", required: false, desc: "Optional expiry date. Tokens without expiry are valid until revoked." },
                ],
              }}
              response={`{
  "id": "tok_01HX...",
  "name": "GitHub Actions prod",
  "token": "dci_live_xxxxxxxxxxxxxxxxxxxx",
  "created_at": "2026-04-14T10:00:00Z",
  "expires_at": null
}

// Note: the token value is returned only once. Store it securely.`}
            />

            <EndpointCard
              method="GET"
              path="/api/health"
              summary="Health check"
              description="Returns service status. No authentication required. Use this for uptime monitoring."
              response={`{
  "status": "ok",
  "db": "ok",
  "auth": "ok",
  "uptime": 86400,
  "version": "0.9.0"
}`}
            />
          </div>
        </section>

        {/* Error codes */}
        <section className="mb-12">
          <h2 className="text-white text-2xl font-semibold mb-4" id="errors">Error responses</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            All errors return JSON with an <code className="bg-gray-800 px-1 py-0.5 rounded text-xs text-indigo-300">error</code> field.
          </p>
          <div className="bg-gray-900 border border-gray-700 rounded-xl divide-y divide-gray-800">
            {[
              { code: "400", meaning: "Bad Request — invalid or missing parameters." },
              { code: "401", meaning: "Unauthorized — missing or invalid API token." },
              { code: "403", meaning: "Forbidden — token lacks permission for this resource." },
              { code: "404", meaning: "Not Found — run, finding, or resource doesn't exist." },
              { code: "429", meaning: "Too Many Requests — rate limit exceeded. Retry after the Retry-After header." },
              { code: "500", meaning: "Internal Server Error — something went wrong on our side." },
            ].map(({ code, meaning }) => (
              <div key={code} className="flex gap-4 px-5 py-3">
                <code className="text-yellow-300 font-mono text-sm w-12 shrink-0">{code}</code>
                <p className="text-gray-400 text-sm">{meaning}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Rate limits */}
        <section className="mb-12">
          <h2 className="text-white text-2xl font-semibold mb-4" id="rate-limits">Rate limits</h2>
          <div className="bg-gray-900 border border-gray-700 rounded-xl divide-y divide-gray-800">
            {[
              { tier: "Free", limit: "60 requests / minute per token" },
              { tier: "Pro", limit: "600 requests / minute per token" },
              { tier: "Enterprise", limit: "Custom — contact sales" },
            ].map(({ tier, limit }) => (
              <div key={tier} className="flex justify-between px-5 py-3">
                <span className="text-gray-300 text-sm font-medium">{tier}</span>
                <span className="text-gray-400 text-sm font-mono">{limit}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Versioning */}
        <section className="mb-12">
          <h2 className="text-white text-2xl font-semibold mb-4" id="versioning">Versioning</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            The current API is <strong className="text-gray-300">v1</strong> (implicit — no version prefix required in URLs). When breaking changes are introduced, a new version prefix will be added (e.g. <code className="bg-gray-800 px-1 py-0.5 rounded text-xs text-indigo-300">/api/v2/...</code>) and the old version will remain available for 12 months with deprecation notices.
          </p>
        </section>

        {/* Support */}
        <div className="bg-indigo-950 border border-indigo-800 rounded-2xl p-8">
          <h3 className="text-white font-semibold mb-2">Need help with the API?</h3>
          <p className="text-indigo-300 text-sm mb-4">
            Email us at{" "}
            <a href="mailto:hello@snippetci.com" className="underline hover:text-indigo-200 transition-colors">
              hello@snippetci.com
            </a>{" "}
            or open an issue on GitHub.
          </p>
          <Link
            href="/docs/getting-started"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Back to Getting Started →
          </Link>
        </div>
      </div>

      <footer className="border-t border-gray-800 text-center py-8 text-gray-600 text-sm">
        <p>
          <a href="mailto:hello@snippetci.com" className="text-gray-400 hover:text-white transition-colors">
            hello@snippetci.com
          </a>
        </p>
      </footer>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-blue-900 text-blue-300 border-blue-700",
    POST: "bg-green-900 text-green-300 border-green-700",
    PATCH: "bg-yellow-900 text-yellow-300 border-yellow-700",
    DELETE: "bg-red-900 text-red-300 border-red-700",
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded border font-mono ${colors[method] ?? "bg-gray-800 text-gray-300 border-gray-600"}`}>
      {method}
    </span>
  );
}

function EndpointCard({
  method,
  path,
  summary,
  description,
  request,
  params,
  response,
}: {
  method: string;
  path: string;
  summary: string;
  description: string;
  request?: { fields: { name: string; type: string; required: boolean; desc: string }[] };
  params?: { name: string; type: string; desc: string }[];
  response: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-700">
        <MethodBadge method={method} />
        <code className="text-white font-mono text-sm">{path}</code>
        <span className="ml-auto text-gray-400 text-sm">{summary}</span>
      </div>

      <div className="px-6 py-5 space-y-5">
        <p className="text-gray-400 text-sm">{description}</p>

        {request && (
          <div>
            <div className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-2">Request body</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800">
                  <th className="text-left pb-2 font-medium w-1/4">Field</th>
                  <th className="text-left pb-2 font-medium w-1/6">Type</th>
                  <th className="text-left pb-2 font-medium w-1/6">Required</th>
                  <th className="text-left pb-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {request.fields.map((f) => (
                  <tr key={f.name}>
                    <td className="py-2 font-mono text-indigo-300 text-xs">{f.name}</td>
                    <td className="py-2 text-gray-500 text-xs">{f.type}</td>
                    <td className="py-2 text-xs">{f.required ? <span className="text-red-400">required</span> : <span className="text-gray-600">optional</span>}</td>
                    <td className="py-2 text-gray-400 text-xs">{f.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {params && (
          <div>
            <div className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-2">Query parameters</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800">
                  <th className="text-left pb-2 font-medium w-1/4">Param</th>
                  <th className="text-left pb-2 font-medium w-1/6">Type</th>
                  <th className="text-left pb-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {params.map((p) => (
                  <tr key={p.name}>
                    <td className="py-2 font-mono text-indigo-300 text-xs">{p.name}</td>
                    <td className="py-2 text-gray-500 text-xs">{p.type}</td>
                    <td className="py-2 text-gray-400 text-xs">{p.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div>
          <div className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-2">Response</div>
          <pre className="bg-gray-950 border border-gray-700 rounded-lg px-4 py-4 text-xs text-green-300 font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">
            {response}
          </pre>
        </div>
      </div>
    </div>
  );
}
