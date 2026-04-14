import type { Metadata } from "next";
import Link from "next/link";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Security — DocsCI",
  description: "DocsCI sandbox security model, RBAC, RLS policies, runtime caps, and responsible disclosure.",
};

function Section({ id, icon, title, children }: { id: string; icon: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-12" data-testid={`security-section-${id}`}>
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h2>
      {children}
    </section>
  );
}

function CapRow({ cap, limit, note }: { cap: string; limit: string; note?: string }) {
  return (
    <tr className="border-b border-gray-800">
      <td className="py-2 pr-6 text-gray-300 font-mono text-sm">{cap}</td>
      <td className="py-2 pr-6 text-green-400 font-mono text-sm">{limit}</td>
      <td className="py-2 text-gray-500 text-xs">{note}</td>
    </tr>
  );
}

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <NavBar />
      {/* Breadcrumb */}
      <div className="border-b border-gray-800 px-6 py-2 flex items-center gap-3 text-sm max-w-7xl mx-auto">
        <Link href="/docs" className="text-gray-500 hover:text-gray-300">Docs</Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-400">Security</span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-red-400 text-xs font-medium uppercase tracking-wide mb-2">Security</div>
        <h1 className="text-3xl font-bold text-white mb-3">Security & Trust</h1>
        <h2 className="text-base text-gray-400 mt-1 mb-4">Security model — how DocsCI keeps your code and data safe</h2>
        <p className="text-gray-400 mb-10">
          DocsCI executes user-supplied code. This page documents how we isolate that execution,
          how access control is enforced at the database layer, and what limits apply to every run.
        </p>

        {/* Nav strip */}
        <div className="flex flex-wrap gap-2 mb-10 text-xs">
          {[
            { href: "#sandbox", label: "Sandbox isolation" },
            { href: "#rbac", label: "RBAC & roles" },
            { href: "#rls", label: "Row-level security" },
            { href: "#caps", label: "Runtime caps" },
            { href: "#network", label: "Network policy" },
            { href: "#secrets", label: "Secrets" },
            { href: "#disclosure", label: "Disclosure" },
          ].map(({ href, label }) => (
            <a key={href} href={href} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full border border-gray-600 transition-colors">
              {label}
            </a>
          ))}
        </div>

        <Section id="sandbox" icon="📦" title="Sandbox isolation">
          <div className="space-y-4 text-gray-400 text-sm">
            <p>
              <strong className="text-white">Sandbox architecture:</strong> Every code snippet runs inside an <strong className="text-white">ephemeral sandbox</strong> that is
              torn down immediately after execution. We use two sandbox strategies:
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  title: "JavaScript / TypeScript",
                  subtitle: "vm2 / isolated-vm",
                  points: [
                    "Runs in a restricted V8 context via isolated-vm",
                    "No access to Node.js built-ins (fs, child_process, net)",
                    "Separate V8 isolate — no shared heap with the host",
                    "Memory limit: 64 MB per isolate",
                    "CPU timeout: per-snippet (default 20 s)",
                  ],
                },
                {
                  title: "Python",
                  subtitle: "Pyodide (WebAssembly)",
                  points: [
                    "Runs in a WebAssembly sandbox via Pyodide",
                    "No native system calls from Python",
                    "File system is a virtual in-memory FS (memfs)",
                    "No network access by default",
                    "Memory limit: 128 MB per instance",
                  ],
                },
              ].map((box) => (
                <div key={box.title} className="p-4 bg-gray-900 border border-gray-700 rounded-xl">
                  <p className="text-white font-medium mb-0.5">{box.title}</p>
                  <p className="text-gray-500 text-xs mb-3">{box.subtitle}</p>
                  <ul className="space-y-1">
                    {box.points.map((p) => (
                      <li key={p} className="flex gap-2 text-xs">
                        <span className="text-green-500 shrink-0">✓</span>
                        <span className="text-gray-400">{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="p-4 bg-yellow-950 border border-yellow-800 rounded-xl">
              <p className="text-yellow-300 font-medium text-xs mb-1">⚠️ Secret scanning before execution</p>
              <p className="text-yellow-200 text-xs">
                Every snippet is scanned for credentials (AWS keys, API tokens, private keys, connection strings)
                using 40+ regex patterns <em>before</em> it enters the sandbox. Snippets containing secrets are
                flagged as findings and <strong>not executed</strong>.
              </p>
            </div>
          </div>
        </Section>

        <Section id="rbac" icon="🔐" title="Org roles">
          <p className="text-gray-400 text-sm mb-4">
            Three roles exist at the organization level. Roles are stored in{" "}
            <code className="bg-gray-800 px-1 rounded text-green-300">docsci_org_members.role</code> and
            enforced both in the API layer and at the database via RLS.
          </p>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 py-2 pr-8 font-medium">Permission</th>
                  <th className="text-center text-gray-400 py-2 pr-4 font-medium">👁 Viewer</th>
                  <th className="text-center text-blue-400 py-2 pr-4 font-medium">✏️ Editor</th>
                  <th className="text-center text-purple-400 py-2 font-medium">👑 Owner</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {[
                  ["Trigger CI runs", "✗", "✓", "✓"],
                  ["View findings & run history", "✓", "✓", "✓"],
                  ["Manage projects", "✗", "✓", "✓"],
                  ["Invite members", "✗", "✓", "✓"],
                  ["Change member roles", "✗", "✗", "✓"],
                  ["Remove members", "✗", "✗", "✓"],
                  ["Delete organization", "✗", "✗", "✓"],
                  ["Change billing", "✗", "✗", "✓"],
                  ["Create owner invites", "✗", "✗", "✓"],
                ].map(([perm, viewer, editor, owner]) => (
                  <tr key={perm} className="border-b border-gray-800">
                    <td className="py-2 pr-8 text-gray-300">{perm}</td>
                    <td className="py-2 pr-4 text-center">{viewer === "✓" ? <span className="text-green-400">✓</span> : <span>❌</span>}</td>
                    <td className="py-2 pr-4 text-center">{editor === "✓" ? <span className="text-green-400">✓</span> : <span className="text-red-500">✗</span>}</td>
                    <td className="py-2 text-center">{owner === "✓" ? <span className="text-green-400">✓</span> : <span className="text-red-500">✗</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-gray-500 text-xs">
            The last owner of an organization cannot be demoted or removed. Attempting to do so returns HTTP 409.
          </p>
        </Section>

        <Section id="rls" icon="🛡️" title="Row-Level Security (RLS)">
          <p className="text-gray-400 text-sm mb-4">
            All tables use Postgres Row-Level Security. Even if the API layer is bypassed, data is
            inaccessible unless the authenticated user has a matching membership record.
          </p>
          <div className="space-y-3">
            {[
              {
                table: "docsci_orgs",
                policies: [
                  { cmd: "SELECT", rule: "User is a member of the org" },
                  { cmd: "UPDATE", rule: "User is owner or editor" },
                  { cmd: "INSERT", rule: "Any authenticated user (own org creation)" },
                ],
              },
              {
                table: "docsci_org_members",
                policies: [
                  { cmd: "SELECT", rule: "User is in the same org" },
                  { cmd: "INSERT", rule: "Caller is owner of the org" },
                  { cmd: "UPDATE", rule: "Caller is owner of the org" },
                  { cmd: "DELETE", rule: "Caller is owner, or removing themselves" },
                ],
              },
              {
                table: "docsci_projects",
                policies: [
                  { cmd: "SELECT", rule: "User is a member of the project's org" },
                  { cmd: "UPDATE/INSERT", rule: "User is owner or editor in the org" },
                ],
              },
              {
                table: "docsci_runs",
                policies: [
                  { cmd: "SELECT", rule: "User is a member of the run's org" },
                  { cmd: "INSERT", rule: "User is owner or editor (viewers blocked)" },
                ],
              },
              {
                table: "docsci_invite_tokens",
                policies: [
                  { cmd: "SELECT", rule: "User is owner or editor in the org" },
                  { cmd: "INSERT", rule: "User is owner or editor in the org" },
                  { cmd: "DELETE", rule: "User is owner in the org" },
                ],
              },
            ].map((t) => (
              <div key={t.table} className="p-4 bg-gray-900 border border-gray-700 rounded-lg">
                <p className="font-mono text-green-300 text-sm mb-2">{t.table}</p>
                <div className="space-y-1">
                  {t.policies.map((p) => (
                    <div key={p.cmd} className="flex gap-3 text-xs">
                      <span className="text-gray-500 w-24 shrink-0 font-mono">{p.cmd}</span>
                      <span className="text-gray-400">{p.rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="caps" icon="⏱️" title="Runtime caps">
          <p className="text-gray-400 text-sm mb-4">
            Every sandbox run enforces hard limits. These cannot be overridden by{" "}
            <code className="bg-gray-800 px-1 rounded text-green-300">docsci.yml</code> beyond the stated maximums.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 py-2 pr-6 font-medium text-sm">Cap</th>
                  <th className="text-left text-gray-400 py-2 pr-6 font-medium text-sm">Default</th>
                  <th className="text-left text-gray-400 py-2 font-medium text-sm">Note</th>
                </tr>
              </thead>
              <tbody>
                <CapRow cap="Snippet execution timeout" limit="20 s" note="Max 60 s via docsci.yml" />
                <CapRow cap="JS/TS memory per isolate" limit="64 MB" note="Hard limit — OOM kills the isolate" />
                <CapRow cap="Python memory (Pyodide)" limit="128 MB" note="WASM linear memory limit" />
                <CapRow cap="Run total timeout" limit="5 min" note="All snippets in a run" />
                <CapRow cap="Snippets per run" limit="500" note="Additional snippets skipped with warning" />
                <CapRow cap="Docs files per run" limit="1 000" note="glob expansion cap" />
                <CapRow cap="Doc file size" limit="1 MB" note="Files larger than 1 MB are skipped" />
                <CapRow cap="OpenAPI spec size" limit="2 MB" note="Larger specs rejected at API" />
                <CapRow cap="Secret scan patterns" limit="40+" note="Runs before execution, not configurable off" />
                <CapRow cap="Network allowlist entries" limit="20" note="Per org, owner-configurable" />
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="network" icon="🌐" title="Network allowlist">
          <div className="space-y-3 text-gray-400 text-sm">
            <p>
              By default, snippet sandboxes have <strong className="text-white">no outbound network access</strong>. Private RFC-1918 ranges are always blocked (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16).
              Outbound calls will silently fail or time out.
            </p>
            <p>
              To allow specific domains (e.g. your staging API), configure an allowlist in{" "}
              <code className="bg-gray-800 px-1 rounded text-green-300">docsci.yml</code>:
            </p>
            <pre className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-xs text-green-300">{`security:
  network_isolated: false          # default
  allowlist:
    - api.example.com
    - "*.stripe.com"`}</pre>
            <p>
              Set <code className="bg-gray-800 px-1 rounded">network_isolated: true</code> to enforce a total
              network block — useful for regulated environments.
            </p>
            <p className="text-gray-500 text-xs">
              The allowlist is enforced at the sandbox level, not the DNS level.
              Wildcard patterns (<code>*.example.com</code>) match one subdomain level only.
            </p>
          </div>
        </Section>

        <Section id="secrets" icon="🔑" title="Secrets & Credentials">
          <div className="space-y-3 text-gray-400 text-sm">
            <p>
              DocsCI does not store any customer secrets or API keys. Each run uses an{" "}
              <strong className="text-white">ephemeral credential</strong> scoped to the specific Supabase
              project for the duration of the run.
            </p>
            <div className="p-4 bg-gray-900 border border-gray-700 rounded-xl">
              <p className="text-white text-sm font-medium mb-2">What we do store:</p>
              <ul className="space-y-1 text-xs text-gray-400">
                <li className="flex gap-2"><span className="text-green-500">✓</span> GitHub/GitLab OAuth tokens (encrypted at rest, Supabase-managed)</li>
                <li className="flex gap-2"><span className="text-green-500">✓</span> Org membership records and roles</li>
                <li className="flex gap-2"><span className="text-green-500">✓</span> Run results, findings, and snippets (your CI output)</li>
                <li className="flex gap-2"><span className="text-red-500">✗</span> Your API keys, env vars, or production credentials</li>
                <li className="flex gap-2"><span className="text-red-500">✗</span> The contents of your sandbox network requests</li>
              </ul>
            </div>
          </div>
        </Section>

        <Section id="disclosure" icon="📬" title="Responsible Disclosure">
          <div className="text-gray-400 text-sm space-y-3">
            <p>
              If you find a security vulnerability in DocsCI, please report it responsibly.
              We aim to acknowledge reports within <strong className="text-white">48 hours</strong> and
              release a fix within <strong className="text-white">14 days</strong> for critical issues.
            </p>
            <div className="p-4 bg-gray-900 border border-gray-700 rounded-xl">
              <p className="text-white font-medium mb-2">How to report</p>
              <ul className="space-y-1 text-xs">
                <li>📧 Email: <a href="mailto:hello@snippetci.com" className="text-indigo-400 underline">hello@snippetci.com</a> with subject line <code className="bg-gray-800 px-1 rounded">[SECURITY]</code></li>
                <li>🔒 Use our PGP key (linked in email signature) for sensitive reports</li>
                <li>🚫 Please do not open public GitHub issues for security vulnerabilities</li>
              </ul>
            </div>
            <p className="text-gray-500 text-xs">
              We do not currently offer a paid bug bounty program but will credit responsible reporters
              in our changelog and security advisory.
            </p>
          </div>
        </Section>

        {/* SOC 2 callout */}
        <div className="bg-indigo-950 border border-indigo-800 rounded-xl p-6 flex items-start gap-4">
          <span className="text-3xl">🏆</span>
          <div>
            <h3 className="text-indigo-200 font-semibold mb-1">Enterprise security review</h3>
            <p className="text-indigo-300 text-sm mb-3">
              Need a security questionnaire, SOC 2 report, or pen test results? Contact us and we&apos;ll
              send our security package within one business day.
            </p>
            <a
              href="mailto:hello@snippetci.com?subject=Security review request"
              className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors font-medium"
              data-testid="security-contact-btn"
            >
              Request security package →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
