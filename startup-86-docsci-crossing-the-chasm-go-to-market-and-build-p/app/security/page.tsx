import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Security — DocsCI",
  description: "How DocsCI executes untrusted code safely: hermetic sandboxes, secret redaction, RBAC, and runtime caps.",
  openGraph: {
    title: "Security — DocsCI",
    description: "Hermetic sandboxes, per-project memory caps, secret redaction before logging, and full RLS-enforced RBAC.",
    url: "https://snippetci.com/security",
  },
};

function TrustBadge({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-full text-sm text-gray-300">
      <span className="text-green-400">✓</span> {label}
    </div>
  );
}

function CapCard({ cap, value, note, icon }: { cap: string; value: string; note?: string; icon: string }) {
  return (
    <div className="p-4 bg-gray-900 border border-gray-700 rounded-xl">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <span className="text-green-400 font-mono font-bold">{value}</span>
      </div>
      <p className="text-white text-sm font-medium">{cap}</p>
      {note && <p className="text-gray-500 text-xs mt-1">{note}</p>}
    </div>
  );
}

function SandboxLayer({ title, tech, points }: { title: string; tech: string; points: string[] }) {
  return (
    <div className="p-5 bg-gray-900 border border-gray-700 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">{title}</h3>
        <span className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded border border-gray-600 font-mono">{tech}</span>
      </div>
      <ul className="space-y-1.5">
        {points.map((p) => (
          <li key={p} className="flex gap-2 text-sm">
            <span className="text-green-400 shrink-0 mt-0.5">✓</span>
            <span className="text-gray-400">{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-white font-bold text-lg flex items-center gap-2">
          <span>📄</span> DocsCI
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/docs/security" className="text-gray-400 hover:text-white transition-colors">Detailed docs ↗</Link>
          <Link href="/signup" className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-950 border border-green-800 rounded-full text-green-400 text-xs mb-6">
          <span>🔒</span> Security overview
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">
          Built to execute untrusted code safely
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
          DocsCI runs code from your documentation in hermetic, ephemeral sandboxes with hard resource caps,
          secret redaction before logging, and no shared state between runs.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {[
            "Ephemeral sandboxes",
            "64 MB memory cap",
            "20 s execution timeout",
            "Secret redaction",
            "No data persistence in sandbox",
            "RLS-enforced RBAC",
          ].map((b) => (
            <TrustBadge key={b} label={b} />
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-16 space-y-12">

        {/* Sandbox isolation */}
        <section data-testid="security-sandbox">
          <h2 className="text-2xl font-bold text-white mb-2">Hermetic sandbox execution</h2>
          <p className="text-gray-400 mb-6">
            Every code snippet runs in an isolated environment. The sandbox is torn down immediately after
            execution — no state persists between runs.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <SandboxLayer
              title="JavaScript / TypeScript"
              tech="isolated-vm (V8)"
              points={[
                "Separate V8 isolate — no shared heap",
                "No access to fs, net, process, require",
                "Console output captured and capped at 64 KB",
                "Memory limit: configurable (default 64 MB)",
                "CPU / wall-clock timeout enforced",
              ]}
            />
            <SandboxLayer
              title="Python"
              tech="Pyodide (WASM)"
              points={[
                "CPython compiled to WebAssembly",
                "No native system calls",
                "Virtual in-memory file system (memfs)",
                "requests module stubbed with allowlist",
                "Memory: 128 MB WASM linear memory limit",
              ]}
            />
          </div>
          <div className="p-4 bg-yellow-950 border border-yellow-800 rounded-xl text-sm" data-testid="secret-scan-note">
            <p className="text-yellow-300 font-medium mb-1">⚠️ Pre-execution secret scan</p>
            <p className="text-yellow-200">
              Every snippet is scanned for credentials — AWS keys, Stripe keys, GitHub tokens, JWTs,
              private keys, connection strings, and more — <strong>before</strong> it enters the sandbox.
              Snippets containing secrets are flagged as findings and <strong>not executed</strong>.
            </p>
          </div>
        </section>

        {/* Runtime caps */}
        <section data-testid="security-caps">
          <h2 className="text-2xl font-bold text-white mb-2">Runtime caps</h2>
          <p className="text-gray-400 mb-6">
            Hard limits enforced per execution — no snippet can exceed these regardless of{" "}
            <code className="bg-gray-800 px-1 rounded text-green-300">docsci.yml</code> configuration.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <CapCard cap="Snippet timeout" value="20 s" note="Max 60 s via config" icon="⏱️" />
            <CapCard cap="JS/TS memory" value="64 MB" note="Configurable up to 256 MB" icon="🧠" />
            <CapCard cap="Python memory" value="128 MB" note="WASM linear memory" icon="🐍" />
            <CapCard cap="Output cap" value="64 KB" note="stdout + stderr combined" icon="📤" />
            <CapCard cap="Snippets/run" value="500" note="Additional snippets skipped" icon="📝" />
            <CapCard cap="Docs/run" value="1 000" note="glob expansion limit" icon="📂" />
            <CapCard cap="File size" value="1 MB" note="Larger files skipped" icon="📄" />
            <CapCard cap="OpenAPI spec" value="2 MB" note="Rejected at API layer" icon="🔗" />
          </div>
          <div className="p-4 bg-gray-900 border border-gray-700 rounded-xl text-sm">
            <p className="text-gray-400">
              Caps are configurable per project via{" "}
              <code className="text-green-300">docsci.yml</code>{" "}
              within the stated bounds. Use{" "}
              <Link href="/api/sandbox-security?action=caps" className="text-indigo-400 underline" target="_blank" rel="noopener">
                /api/sandbox-security?action=caps
              </Link>
              {" "}to see effective limits for your configuration.
            </p>
          </div>
        </section>

        {/* Secret redaction */}
        <section data-testid="security-redaction">
          <h2 className="text-2xl font-bold text-white mb-2">Secret redaction in logs</h2>
          <p className="text-gray-400 mb-4">
            Before any execution output is written to the database, it is passed through a multi-rule
            redaction pipeline. Even if a snippet accidentally prints a secret, it will be replaced with
            a placeholder before storage.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
            {[
              "JWTs (3-part base64url)",
              "Stripe sk_/pk_/rk_ keys",
              "GitHub tokens (ghp_, ghx_, PATs)",
              "AWS access keys (AKIA/ASIA/AROA)",
              "Bearer token values",
              "URL api_key= params",
              "Supabase project URLs",
              "PEM private key blocks",
              "PostgreSQL DSNs with passwords",
              "MongoDB connection strings",
              "Slack tokens (xoxb-, xoxp-)",
              "SendGrid API keys",
              "Twilio auth tokens",
              "X-API-Key header values",
              "Generic SECRET/TOKEN=... patterns",
            ].map((item) => (
              <div key={item} className="flex gap-2 text-xs p-2 bg-gray-900 border border-gray-700 rounded-lg">
                <span className="text-red-400 shrink-0">🔑</span>
                <span className="text-gray-400">{item}</span>
              </div>
            ))}
          </div>
          <div className="p-4 bg-gray-900 border border-gray-700 rounded-xl text-sm font-mono">
            <p className="text-gray-500 text-xs mb-2">Example: redacted stdout</p>
            <p className="text-gray-400">
              <span className="text-red-400 line-through">sk_live_abcdef123456789…</span>
              {" → "}
              <span className="text-green-400">[REDACTED_STRIPE_KEY]</span>
            </p>
            <p className="text-gray-400 mt-1">
              <span className="text-red-400 line-through">eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ…</span>
              {" → "}
              <span className="text-green-400">[REDACTED_JWT]</span>
            </p>
            <p className="text-gray-400 mt-1">
              <span className="text-red-400 line-through">postgres://user:S3cr3t@db.example.com/prod</span>
              {" → "}
              <span className="text-green-400">postgresql://[REDACTED]@[REDACTED]/[REDACTED]</span>
            </p>
          </div>
          <p className="text-gray-500 text-xs mt-3">
            Test the redaction pipeline live: <code className="bg-gray-800 px-1 rounded">POST /api/sandbox-security</code> with{" "}
            <code className="bg-gray-800 px-1 rounded">{"{ \"action\": \"redact_logs\", \"text\": \"...\" }"}</code>
          </p>
        </section>

        {/* Network policy */}
        <section data-testid="security-network">
          <h2 className="text-2xl font-bold text-white mb-2">Network policy</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-gray-900 border border-gray-700 rounded-xl">
              <h3 className="text-white font-semibold mb-3">Default (allowlist mode)</h3>
              <ul className="space-y-1.5 text-sm text-gray-400">
                <li className="flex gap-2"><span className="text-red-400">✗</span> No outbound network by default</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span> Configure specific domains in docsci.yml</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span> HTTPS-only (no http://)</li>
                <li className="flex gap-2"><span className="text-red-400">✗</span> Private IP ranges always blocked</li>
                <li className="flex gap-2"><span className="text-red-400">✗</span> AWS IMDS (169.254.x) blocked</li>
              </ul>
            </div>
            <div className="p-5 bg-gray-900 border border-gray-700 rounded-xl">
              <h3 className="text-white font-semibold mb-3">Isolated mode (network_isolated: true)</h3>
              <ul className="space-y-1.5 text-sm text-gray-400">
                <li className="flex gap-2"><span className="text-red-400">✗</span> All outbound blocked unconditionally</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span> Recommended for regulated environments</li>
                <li className="flex gap-2"><span className="text-green-400">✓</span> No allowlist entries honored</li>
              </ul>
              <pre className="mt-3 text-xs bg-gray-800 rounded p-2 text-green-300">{`security:
  network_isolated: true`}</pre>
            </div>
          </div>
        </section>

        {/* RBAC */}
        <section data-testid="security-rbac">
          <h2 className="text-2xl font-bold text-white mb-2">Access control (RBAC + RLS)</h2>
          <p className="text-gray-400 mb-4">
            Three roles — owner, editor, viewer — are enforced at both the API layer and the Postgres
            Row-Level Security layer. Even direct database access is gated by RLS policies.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 py-2 pr-6 font-medium">Permission</th>
                  <th className="text-center text-purple-400 py-2 pr-4 font-medium">👑 Owner</th>
                  <th className="text-center text-blue-400 py-2 pr-4 font-medium">✏️ Editor</th>
                  <th className="text-center text-gray-400 py-2 font-medium">👁 Viewer</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {[
                  ["Trigger CI runs", "✓", "✓", "✗"],
                  ["View findings + history", "✓", "✓", "✓"],
                  ["Manage projects", "✓", "✓", "✗"],
                  ["Create invite links", "✓", "✓", "✗"],
                  ["Change member roles", "✓", "✗", "✗"],
                  ["Delete org", "✓", "✗", "✗"],
                ].map(([perm, o, e, v]) => (
                  <tr key={perm} className="border-b border-gray-800">
                    <td className="py-2 pr-6">{perm}</td>
                    <td className="py-2 pr-4 text-center">{o === "✓" ? <span className="text-green-400">✓</span> : <span className="text-red-500">✗</span>}</td>
                    <td className="py-2 pr-4 text-center">{e === "✓" ? <span className="text-green-400">✓</span> : <span className="text-red-500">✗</span>}</td>
                    <td className="py-2 text-center">{v === "✓" ? <span className="text-green-400">✓</span> : <span className="text-red-500">✗</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-gray-500 text-xs mt-3">
            <Link href="/docs/security#rls" className="text-indigo-400 underline">Full RLS policy documentation →</Link>
          </p>
        </section>

        {/* Enterprise */}
        <section>
          <div className="bg-indigo-950 border border-indigo-800 rounded-2xl p-8 flex items-start gap-6">
            <span className="text-4xl">🏢</span>
            <div>
              <h2 className="text-xl font-bold text-indigo-200 mb-2">Enterprise security review</h2>
              <p className="text-indigo-300 mb-4">
                Need a security questionnaire, pen test results, or a custom data processing agreement?
                We&apos;ll respond within one business day.
              </p>
              <div className="flex gap-3 flex-wrap">
                <a
                  href="mailto:hello@snippetci.com?subject=Security review request"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
                  data-testid="security-contact-cta"
                >
                  Contact security team →
                </a>
                <Link
                  href="/docs/security"
                  className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl transition-colors"
                >
                  Detailed docs
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Disclosure */}
        <section data-testid="security-disclosure">
          <h2 className="text-xl font-bold text-white mb-3">Responsible disclosure</h2>
          <p className="text-gray-400 text-sm mb-3">
            Found a vulnerability? Email{" "}
            <a href="mailto:hello@snippetci.com?subject=[SECURITY]" className="text-indigo-400 underline">
              hello@snippetci.com
            </a>{" "}
            with subject <code className="bg-gray-800 px-1 rounded">[SECURITY]</code>.
            We acknowledge within 48 hours and aim to fix critical issues within 14 days.
          </p>
          <p className="text-gray-500 text-xs">
            Please do not open public GitHub issues for security vulnerabilities.
          </p>
        </section>
      </div>
    </div>
  );
}
