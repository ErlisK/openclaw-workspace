import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security — DocsCI",
  description: "Sandbox architecture, network allowlists, secret scanning, ephemeral credentials.",
};

export default function SecurityDocsPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-6 text-sm">
        <Link href="/docs" className="text-white font-bold">← Docs</Link>
        <span className="text-gray-600">/</span>
        <span className="text-gray-400">Security</span>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-yellow-400 text-xs font-medium uppercase tracking-wide mb-2">Security</div>
        <h1 className="text-3xl font-bold text-white mb-3">Security model</h1>
        <p className="text-gray-400 mb-10">
          DocsCI executes untrusted code in hermetic sandboxes with strict resource caps,
          network allowlists, and automatic secret redaction.
        </p>

        {/* Sandbox architecture */}
        <section id="sandbox" className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>🏗️</span> Sandbox architecture
          </h2>
          <div className="space-y-3 text-sm text-gray-400">
            <p>Each code snippet runs in an isolated execution context:</p>
            <ul className="list-disc list-inside ml-4 space-y-1.5">
              <li><strong className="text-white">Ephemeral sandbox ID</strong> — every run gets a unique <code className="bg-gray-800 px-1 rounded text-green-300">sbx_&lt;16hex&gt;</code> identifier for audit trail correlation</li>
              <li><strong className="text-white">Python snippets</strong> — Pyodide WASM (browser-safe, no native syscalls)</li>
              <li><strong className="text-white">JavaScript/TypeScript</strong> — isolated-vm with <code className="bg-gray-800 px-1 rounded text-green-300">--no-allow-eval</code>, no <code>process</code> access</li>
              <li><strong className="text-white">No filesystem access</strong> — snippets run in memory-only contexts</li>
              <li><strong className="text-white">No subprocess spawning</strong> — <code>os.system</code>, <code>subprocess</code>, <code>exec</code> are monkey-patched to throw</li>
            </ul>
          </div>
        </section>

        {/* Runtime caps */}
        <section id="caps" className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>⏱️</span> Runtime caps
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 py-2 pr-8 font-medium">Limit</th>
                  <th className="text-left text-gray-400 py-2 font-medium">Value</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {[
                  ["Max snippet execution time", "20 seconds (default), 60 seconds (max)"],
                  ["Max total run time", "60 seconds (Vercel hobby), 5 min (Pro)"],
                  ["Max stdout/stderr size", "64 KB per snippet"],
                  ["Max log storage (after redaction)", "32 KB per snippet"],
                  ["Max snippets per run", "Unlimited (parallel)"],
                  ["Max findings per run", "Unlimited"],
                ].map(([limit, value]) => (
                  <tr key={limit} className="border-b border-gray-800">
                    <td className="py-2 pr-8 text-white">{limit}</td>
                    <td className="py-2 font-mono text-green-300">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Network allowlist */}
        <section id="allowlist" className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>🌐</span> Network allowlist
          </h2>
          <div className="space-y-3 text-sm text-gray-400">
            <p>All outbound network requests from sandboxes are validated before execution:</p>
            <ul className="list-disc list-inside ml-4 space-y-1.5">
              <li><strong className="text-white">HTTPS only</strong> — HTTP URLs are blocked</li>
              <li><strong className="text-white">Private IPs blocked</strong> — RFC-1918 (10.x, 172.16-31.x, 192.168.x), loopback (127.x, ::1), link-local (169.254.x)</li>
              <li><strong className="text-white">AWS IMDS blocked</strong> — 169.254.169.254 and metadata.google.internal</li>
              <li><strong className="text-white">Per-project allowlist</strong> — configure allowed domains in Project Settings; wildcard support (<code className="bg-gray-800 px-1 rounded text-green-300">*.example.com</code>)</li>
              <li><strong className="text-white">Network isolation mode</strong> — disable ALL outbound access for air-gapped testing</li>
            </ul>
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 mt-2">
              <p className="text-gray-500 text-xs font-medium mb-2">Example allowlist config (via Project Wizard)</p>
              <pre className="text-xs text-green-300">{`domains: ["api.stripe.com", "*.example.com"]
networkIsolated: false`}</pre>
            </div>
          </div>
        </section>

        {/* Secret scanning */}
        <section id="secrets" className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>🔑</span> Secret scanning & log redaction
          </h2>
          <div className="space-y-3 text-sm text-gray-400">
            <p><strong className="text-white">Pre-execution scan</strong> — before running any snippet, DocsCI scans the code for hardcoded secrets:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Stripe keys (<code className="bg-gray-800 px-1 rounded">sk_live_</code>, <code className="bg-gray-800 px-1 rounded">sk_test_</code>)</li>
              <li>GitHub tokens (<code className="bg-gray-800 px-1 rounded">ghp_</code>, <code className="bg-gray-800 px-1 rounded">gho_</code>, <code className="bg-gray-800 px-1 rounded">github_pat_</code>)</li>
              <li>AWS access keys (<code className="bg-gray-800 px-1 rounded">AKIA</code>, <code className="bg-gray-800 px-1 rounded">ASIA</code>)</li>
              <li>JWTs, PEM private keys, Postgres DSNs with passwords</li>
            </ul>
            <p className="mt-2"><strong className="text-white">Post-execution redaction</strong> — stdout/stderr are run through 12 redaction rules before storage in Supabase. Secrets are replaced with <code className="bg-gray-800 px-1 rounded text-yellow-300">[REDACTED]</code> tokens.</p>
            <p><strong className="text-white">Env var stripping</strong> — environment variables matching secret patterns (TOKEN, SECRET, KEY, PASSWORD, etc.) are stripped before subprocess execution.</p>
          </div>
        </section>

        {/* RBAC */}
        <section id="rbac" className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>👥</span> Org roles (RBAC)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 py-2 pr-8 font-medium">Action</th>
                  <th className="text-center text-gray-400 py-2 px-4 font-medium">Viewer</th>
                  <th className="text-center text-gray-400 py-2 px-4 font-medium">Admin</th>
                  <th className="text-center text-gray-400 py-2 font-medium">Owner</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {[
                  ["View projects & runs", "✅", "✅", "✅"],
                  ["View findings & AI fixes", "✅", "✅", "✅"],
                  ["Download patch diffs", "✅", "✅", "✅"],
                  ["Trigger CI runs", "❌", "✅", "✅"],
                  ["Create/delete projects", "❌", "✅", "✅"],
                  ["Manage integrations", "❌", "✅", "✅"],
                  ["Invite members", "❌", "❌", "✅"],
                  ["Billing & plan", "❌", "❌", "✅"],
                ].map(([action, viewer, admin, owner]) => (
                  <tr key={action} className="border-b border-gray-800">
                    <td className="py-2 pr-8 text-white">{action}</td>
                    <td className="py-2 px-4 text-center">{viewer}</td>
                    <td className="py-2 px-4 text-center">{admin}</td>
                    <td className="py-2 text-center">{owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-gray-500 text-xs mt-3">
            RBAC is enforced at both the API layer (HTTP 403) and in Supabase Row Level Security policies.
          </p>
        </section>

        {/* SOC 2 */}
        <section id="soc2" className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>🛡️</span> Compliance posture
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: "✅", label: "Row-Level Security", desc: "All tables enforced in Supabase Postgres" },
              { icon: "✅", label: "Audit logging", desc: "Every run and finding written to audit_log" },
              { icon: "✅", label: "Secret redaction", desc: "Logs sanitized before persistence" },
              { icon: "✅", label: "HTTPS only", desc: "All endpoints TLS; sandbox blocks HTTP" },
              { icon: "🔜", label: "SOC 2 Type II", desc: "In progress (Enterprise plan)" },
              { icon: "🔜", label: "Customer-hosted runners", desc: "On roadmap for Q2" },
            ].map((item) => (
              <div key={item.label} className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span>{item.icon}</span>
                  <span className="text-white text-sm font-medium">{item.label}</span>
                </div>
                <p className="text-gray-500 text-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="border-t border-gray-800 pt-6 text-gray-500 text-sm">
          Security questions? Email <a href="mailto:hello@snippetci.com" className="text-gray-300 underline">hello@snippetci.com</a> or{" "}
          <Link href="/docs/getting-started" className="text-indigo-400 underline">get started</Link>.
        </div>
      </div>
    </div>
  );
}
