import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "DocsCI Docs — Setup Guide, GitHub Actions, API Reference",
  description: "Complete setup guide: connect your GitHub repo, configure the CI pipeline, install the GitHub Actions template, and run your first docs verification.",
};

const SETUP_STEPS = [
  {
    step: "1",
    title: "Sign up & create your org",
    code: null,
    desc: "Create a free account at snippetci.com/signup. Create an org matching your GitHub organization name.",
  },
  {
    step: "2",
    title: "Import your GitHub repo",
    code: "POST https://snippetci.com/api/repos\n{\n  \"repo_url\": \"https://github.com/your-org/your-repo\",\n  \"org_id\": \"<your-org-id>\",\n  \"docs_path\": \"docs/\",\n  \"sdk_languages\": [\"python\", \"typescript\"]\n}",
    desc: "Import any public GitHub repo by URL. DocsCI auto-detects your docs folder structure.",
  },
  {
    step: "3",
    title: "Add the GitHub Actions workflow",
    code: null,
    desc: 'Copy the template to .github/workflows/docsci.yml and add DOCSCI_API_KEY as a repository secret.',
    templateLink: "/templates/docsci.yml",
  },
  {
    step: "4",
    title: "Import your OpenAPI spec (optional)",
    code: "POST https://snippetci.com/api/openapi-import\n{\n  \"source_url\": \"https://api.your-company.com/openapi.json\",\n  \"org_id\": \"<your-org-id>\"\n}",
    desc: "Point DocsCI at your staging API spec. It checks all docs examples against the live schema on every run.",
  },
  {
    step: "5",
    title: "Trigger your first run",
    code: "POST https://snippetci.com/api/runs\n{\n  \"repo_id\": \"<your-repo-id>\",\n  \"branch\": \"main\"\n}",
    desc: "DocsCI fetches your docs, extracts code snippets, executes them in hermetic sandboxes, and generates AI fix suggestions for failures.",
  },
];

const API_ENDPOINTS = [
  { method: "GET", path: "/api/healthcheck", auth: "None", desc: "Supabase connectivity & RLS status" },
  { method: "GET", path: "/api/repos", auth: "Bearer", desc: "List repos for current user's orgs" },
  { method: "POST", path: "/api/repos", auth: "Bearer", desc: "Import a public GitHub repo by URL" },
  { method: "GET", path: "/api/runs", auth: "Bearer", desc: "List recent CI runs (filter by repo_id)" },
  { method: "POST", path: "/api/runs", auth: "Bearer", desc: "Trigger a new CI run for a repo" },
  { method: "GET", path: "/api/runs/[id]", auth: "Bearer", desc: "Get run details + all snippet results" },
  { method: "POST", path: "/api/snippets", auth: "Bearer", desc: "Execute a code snippet in sandbox (JS/TS/Python)" },
  { method: "POST", path: "/api/openapi-import", auth: "Bearer", desc: "Import an OpenAPI spec from a URL" },
  { method: "POST", path: "/api/ai-fix", auth: "Bearer", desc: "Generate AI fix suggestion + patch diff" },
  { method: "GET", path: "/api/audit-log", auth: "Bearer", desc: "Paginated audit log for current org" },
];

const SANDBOX_SPECS = [
  { feature: "JS/TS execution", value: "Node.js subprocess — no network, no fs writes" },
  { feature: "Python execution", value: "Isolated Python subprocess — no network access" },
  { feature: "Timeout", value: "10s default, configurable up to 60s" },
  { feature: "Memory limit", value: "256MB per snippet" },
  { feature: "Network access", value: "Blocked (allowlist via customer-hosted runner)" },
  { feature: "Filesystem writes", value: "Blocked — tmpdir only, auto-cleaned" },
  { feature: "Credentials", value: "Ephemeral — never shared between runs" },
  { feature: "Customer-hosted runners", value: "Bring your own infra with your real API credentials" },
];

export default function DocsGuidePage() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <span className="font-bold text-xl text-white">DocsCI</span>
          </Link>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <Link href="/docs/research" className="hover:text-white">Research</Link>
            <Link href="/docs/icp" className="hover:text-white">ICP</Link>
            <span className="text-white">Docs</span>
            <Link href="/dashboard/playground" className="hover:text-white">Playground</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-green-950 border border-green-700 rounded-full px-4 py-1.5 text-sm text-green-300 mb-6">
            📖 Setup Guide
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Get started with DocsCI
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl">
            Prevent broken examples and API/SDK drift from reaching production. 
            Set up in under 5 minutes with the GitHub Actions template.
          </p>
          <div className="flex gap-3 mt-6">
            <Link href="/signup" className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-medium transition-colors text-sm">
              Start free →
            </Link>
            <a href="/templates/docsci.yml" className="bg-gray-800 hover:bg-gray-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors text-sm">
              ↓ Download GH Actions template
            </a>
            <Link href="/dashboard/playground" className="bg-gray-800 hover:bg-gray-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors text-sm">
              ⚗️ Try the playground
            </Link>
          </div>
        </div>

        {/* Setup steps */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-white mb-6">🚀 Quick setup</h2>
          <div className="space-y-5">
            {SETUP_STEPS.map(s => (
              <div key={s.step} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-indigo-600 text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                    {s.step}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-2">{s.title}</h3>
                    <p className="text-gray-400 text-sm mb-3">{s.desc}</p>
                    {s.code && (
                      <pre className="bg-gray-950 border border-gray-700 rounded-lg p-4 text-xs font-mono text-gray-300 overflow-x-auto">
                        {s.code}
                      </pre>
                    )}
                    {s.templateLink && (
                      <a
                        href={s.templateLink}
                        className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 mt-2"
                      >
                        ↓ Download docsci.yml
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sandbox specs */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-white mb-2">🔒 Hermetic Sandbox Specifications</h2>
          <p className="text-gray-400 text-sm mb-6">
            Every snippet runs in an ephemeral, isolated environment. No shared state between runs — 
            eliminates flakiness caused by external dependencies.
          </p>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-5 py-3 text-gray-400 font-medium">Feature</th>
                  <th className="text-left px-5 py-3 text-gray-400 font-medium">Behavior</th>
                </tr>
              </thead>
              <tbody>
                {SANDBOX_SPECS.map((s, i) => (
                  <tr key={s.feature} className={`border-b border-gray-800/50 ${i % 2 === 0 ? "bg-gray-900/20" : ""}`}>
                    <td className="px-5 py-3 text-gray-300 font-medium text-sm">{s.feature}</td>
                    <td className="px-5 py-3 text-gray-400 text-sm">{s.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* API reference */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-white mb-2">📡 API Reference</h2>
          <p className="text-gray-400 text-sm mb-6">
            All endpoints require <code className="bg-gray-800 px-1 rounded text-xs">Authorization: Bearer &lt;supabase-jwt&gt;</code> except healthcheck.
          </p>
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium w-16">Method</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Endpoint</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium w-20">Auth</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {API_ENDPOINTS.map((e, i) => (
                  <tr key={e.path} className={`border-b border-gray-800/50 ${i % 2 === 0 ? "bg-gray-900/20" : ""}`}>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        e.method === "GET" ? "bg-blue-950 text-blue-400" : "bg-green-950 text-green-400"
                      }`}>
                        {e.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-200">{e.path}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{e.auth}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{e.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* CI features list */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-white mb-6">✅ Whole-product checklist</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              ["✅", "Self-serve auth: email/password + Google OAuth"],
              ["✅", "GitHub repo import by URL (public repos)"],
              ["✅", "Sample repo one-click run"],
              ["✅", "JS/TS snippet execution in isolated Node sandbox"],
              ["✅", "Python snippet execution in isolated subprocess"],
              ["✅", "OpenAPI URL import with HTTPS + allowlist enforcement"],
              ["✅", "HTTP allowlist for smoke tests (blocks private IPs)"],
              ["✅", "AI-generated fix PR comments (Claude via Vercel AI Gateway)"],
              ["✅", "Downloadable patch diffs (unified diff format)"],
              ["✅", "Clear run reports with per-snippet pass/fail status"],
              ["✅", "Audit log for all org actions"],
              ["✅", "GitHub Actions template (docsci.yml)"],
              ["✅", "RLS policies on all 5 DB tables"],
              ["✅", "Supabase auth trigger (auto-creates profile on signup)"],
              ["🚧", "Accessibility checks (WCAG — roadmap Q3)"],
              ["🚧", "Copy tone/clarity checks (AI — roadmap Q3)"],
              ["🚧", "Customer-hosted runner (self-host — roadmap Q4)"],
            ].map(([status, item]) => (
              <div key={item} className={`flex items-start gap-2 p-3 rounded-lg border ${
                status === "✅" ? "bg-green-950/20 border-green-800/40" : "bg-gray-900 border-gray-800"
              }`}>
                <span className="text-sm">{status}</span>
                <span className={`text-sm ${status === "✅" ? "text-gray-200" : "text-gray-500"}`}>{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="bg-indigo-950/50 border border-indigo-700 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to ship docs that work?</h2>
          <p className="text-gray-400 mb-6 max-w-xl mx-auto">
            10 design partner slots open. We&apos;ll set up your first pipeline together in a 30-minute call.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup" className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-lg font-medium transition-colors">
              Start free
            </Link>
            <a href="mailto:hello@snippetci.com" className="text-gray-400 hover:text-white text-sm transition-colors">
              hello@snippetci.com →
            </a>
          </div>
        </div>
      </div>

      <footer className="border-t border-gray-800 max-w-5xl mx-auto px-6 py-8 flex justify-between text-sm text-gray-500 mt-8">
        <span>© 2025 DocsCI · snippetci.com</span>
        <div className="flex gap-4">
          <Link href="/docs/research" className="hover:text-gray-300">Research</Link>
          <Link href="/docs/icp" className="hover:text-gray-300">ICP</Link>
          <a href="mailto:hello@snippetci.com" className="hover:text-gray-300">Contact</a>
        </div>
      </footer>
    </main>
  );
}
