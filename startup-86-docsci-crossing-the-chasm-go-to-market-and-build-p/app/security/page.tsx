import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Security Review Packet — DocsCI",
  description:
    "DocsCI security review packet: data flow diagram, hermetic runner isolation model, Row-Level Security policy summary, and SOC 2 Type II status. For InfoSec teams evaluating DocsCI.",
  alternates: { canonical: "https://snippetci.com/security" },
  openGraph: {
    title: "Security Review Packet — DocsCI",
    description:
      "Data flow diagram, hermetic runner isolation, RLS policy summary, SOC 2 in progress. Everything your InfoSec team needs.",
    url: "https://snippetci.com/security",
    type: "website",
    siteName: "DocsCI",
  },
};

// ── Reusable sub-components ───────────────────────────────────────────────────

function Section({
  id,
  title,
  badge,
  children,
}: {
  id: string;
  title: string;
  badge?: { label: string; color: string };
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20" data-testid={`section-${id}`}>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        {badge && (
          <span className={`text-xs px-2 py-0.5 rounded border font-medium ${badge.color}`}>
            {badge.label}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function Pill({ label, ok = true }: { label: string; ok?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
        ok
          ? "bg-green-950 border-green-700 text-green-300"
          : "bg-gray-800 border-gray-700 text-gray-400"
      }`}
    >
      <span>{ok ? "✓" : "○"}</span>
      {label}
    </span>
  );
}

// ── Data flow diagram (ASCII/SVG hybrid in prose) ─────────────────────────────
function DataFlowDiagram() {
  const nodes = [
    {
      id: "A",
      label: "Developer / CI pipeline",
      sub: "GitHub Actions · GitLab CI",
      color: "bg-blue-900 border-blue-700",
      textColor: "text-blue-100",
    },
    {
      id: "B",
      label: "DocsCI API Gateway",
      sub: "TLS 1.3 · mTLS option · Vercel Edge",
      color: "bg-indigo-900 border-indigo-700",
      textColor: "text-indigo-100",
    },
    {
      id: "C",
      label: "Job Queue",
      sub: "Supabase Postgres · RLS-enforced",
      color: "bg-purple-900 border-purple-700",
      textColor: "text-purple-100",
    },
    {
      id: "D",
      label: "Hermetic Runner",
      sub: "Isolated V8 / Pyodide · network allowlist",
      color: "bg-orange-900 border-orange-700",
      textColor: "text-orange-100",
    },
    {
      id: "E",
      label: "Staging API (customer)",
      sub: "Allowlisted host only",
      color: "bg-gray-800 border-gray-600",
      textColor: "text-gray-300",
    },
    {
      id: "F",
      label: "Results Store",
      sub: "Supabase · encrypted at rest",
      color: "bg-teal-900 border-teal-700",
      textColor: "text-teal-100",
    },
    {
      id: "G",
      label: "PR Comment Writer",
      sub: "GitHub/GitLab App — write:pull_request only",
      color: "bg-pink-900 border-pink-700",
      textColor: "text-pink-100",
    },
    {
      id: "H",
      label: "DocsCI Dashboard",
      sub: "snippetci.com · RBAC + RLS",
      color: "bg-green-900 border-green-700",
      textColor: "text-green-100",
    },
  ];

  const flows = [
    { from: "A", to: "B", label: "HTTPS — docs archive + repo metadata (no source code)", boundary: false },
    { from: "B", to: "C", label: "Job enqueue — org_id scoped, RLS-enforced", boundary: false },
    { from: "C", to: "D", label: "Ephemeral job dispatch — credentials never logged", boundary: false },
    { from: "D", to: "E", label: "HTTP — allowlisted host, ephemeral token, 10s timeout", boundary: true },
    { from: "D", to: "F", label: "Run report — findings + metadata only (no docs content)", boundary: false },
    { from: "F", to: "G", label: "Findings read — org_id gated", boundary: false },
    { from: "G", to: "A", label: "HTTPS — PR comment to GitHub/GitLab (write:pr only)", boundary: false },
    { from: "F", to: "H", label: "Findings read — RLS: org_id + role check", boundary: false },
  ];

  return (
    <div data-testid="data-flow-diagram" className="space-y-6">
      {/* Nodes grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {nodes.map((n) => (
          <div key={n.id} className={`rounded-xl border p-3 ${n.color}`}>
            <div className={`font-bold text-base mb-0.5 ${n.textColor}`}>
              <span className="text-xs font-mono mr-1 opacity-60">{n.id}</span>
              {n.label}
            </div>
            <div className="text-xs text-gray-400">{n.sub}</div>
          </div>
        ))}
      </div>

      {/* Flow table */}
      <div className="overflow-x-auto rounded-xl border border-gray-700">
        <table className="w-full text-sm" data-testid="data-flow-table">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-900">
              <th className="px-4 py-3 text-left text-gray-400 font-medium w-8">From</th>
              <th className="px-4 py-3 text-left text-gray-400 font-medium w-8">To</th>
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Data / Protocol</th>
              <th className="px-4 py-3 text-left text-gray-400 font-medium w-32">Trust boundary?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {flows.map((f, i) => (
              <tr key={i} className="hover:bg-gray-900 transition-colors">
                <td className="px-4 py-3 font-mono text-indigo-300 font-bold">{f.from}</td>
                <td className="px-4 py-3 font-mono text-indigo-300 font-bold">{f.to}</td>
                <td className="px-4 py-3 text-gray-300">{f.label}</td>
                <td className="px-4 py-3">
                  {f.boundary ? (
                    <span className="text-xs px-2 py-0.5 rounded border bg-orange-900 border-orange-700 text-orange-300">
                      External
                    </span>
                  ) : (
                    <span className="text-xs text-gray-600">Internal</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-gray-900 border border-gray-700 rounded-xl text-sm text-gray-400">
        <strong className="text-white">What DocsCI never receives:</strong> full repository source code,
        production credentials, database connection strings, or private keys. The docs archive submitted
        to the API contains only documentation files (Markdown, MDX, OpenAPI YAML/JSON). Staging API tokens
        are ephemeral, scoped to the run, and redacted before logging.
      </div>
    </div>
  );
}

// ── Runner isolation model ────────────────────────────────────────────────────
function RunnerIsolationModel() {
  const layers = [
    {
      layer: "L1",
      name: "V8 Isolate (JavaScript/TypeScript)",
      icon: "🟡",
      controls: [
        "Fresh V8 Isolate per snippet — no shared heap between runs",
        "Memory limit: 128 MB per isolate (hard, OOM kills the isolate, not the runner)",
        "CPU time limit: 5 seconds (wall clock); 30 seconds for integration tests",
        "No access to Node.js built-ins (fs, net, child_process) — API surface is explicitly allow-listed",
        "Require() and import() are disabled — all dependencies injected at isolate creation time",
      ],
    },
    {
      layer: "L2",
      name: "Pyodide WASM (Python)",
      icon: "🐍",
      controls: [
        "Python 3.11 compiled to WASM — no native code execution path",
        "No subprocess, os.system, or ctypes — syscall surface is the WASM ABI",
        "Pyodide micropip allowlist: only packages in the DocsCI approved list can be installed",
        "File system is an in-memory MEMFS — nothing written to host disk",
        "Same memory (128 MB) and CPU (5s/30s) limits enforced by the V8 host isolate",
      ],
    },
    {
      layer: "L3",
      name: "Network allowlist",
      icon: "🌐",
      controls: [
        "Outbound requests blocked by default — no snippet can call arbitrary URLs",
        "Customer-configured allowlist: one or more staging endpoints, validated against a public IP / hostname blocklist",
        "Private IP ranges always blocked: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, ::1",
        "DNS resolution is intercepted — resolved IPs checked against blocklist before connection",
        "Ephemeral tokens (if provided) are injected as env vars, never appear in request logs",
      ],
    },
    {
      layer: "L4",
      name: "Process isolation (customer-hosted runner)",
      icon: "🐳",
      controls: [
        "Docker image runs as non-root user (uid 1000)",
        "Read-only filesystem (--read-only) with /tmp tmpfs mount",
        "No new privileges (--security-opt=no-new-privileges)",
        "Dropped capabilities: all except NET_BIND_SERVICE",
        "Seccomp profile: Docker default + blocked: ptrace, keyctl, add_key, request_key",
        "cgroup limits: 512 MB RAM, 0.5 CPU cores — prevents resource exhaustion on shared runners",
      ],
    },
    {
      layer: "L5",
      name: "Secret redaction",
      icon: "🔒",
      controls: [
        "All environment variable values injected into a run are added to a redaction list before job dispatch",
        "The redaction list is applied to stdout, stderr, and HTTP request/response logs",
        "Redaction is regex-based: token patterns (Bearer .*, x-api-key: .*, Authorization: .*) are also scrubbed",
        "Redacted logs are stored in Results Store; original values are never persisted",
        "Run reports delivered to PR comments and dashboard never include raw secret values",
      ],
    },
  ];

  return (
    <div data-testid="runner-isolation-model" className="space-y-4">
      {layers.map((l) => (
        <div key={l.layer} className="border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800">
            <span className="text-lg">{l.icon}</span>
            <h3 className="text-white font-semibold">{l.name}</h3>
            <span className="ml-auto text-xs font-mono text-gray-500">{l.layer}</span>
          </div>
          <ul className="divide-y divide-gray-800">
            {l.controls.map((c, i) => (
              <li key={i} className="px-4 py-2.5 text-sm text-gray-300 flex items-start gap-2">
                <span className="text-green-400 mt-0.5 shrink-0">✓</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ── RLS policy summary ────────────────────────────────────────────────────────
function RLSPolicySummary() {
  const tables = [
    {
      table: "organizations",
      policies: [
        {
          name: "SELECT own org",
          using: "auth.uid() IN (SELECT user_id FROM memberships WHERE org_id = id)",
          roles: ["owner", "admin", "member", "viewer"],
          check: "—",
        },
        {
          name: "UPDATE own org",
          using: "auth.uid() IN (SELECT user_id FROM memberships WHERE org_id = id AND role IN ('owner','admin'))",
          roles: ["owner", "admin"],
          check: "—",
        },
      ],
    },
    {
      table: "projects",
      policies: [
        {
          name: "SELECT own project",
          using: "org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())",
          roles: ["all org members"],
          check: "—",
        },
        {
          name: "INSERT project",
          using: "—",
          roles: ["owner", "admin"],
          check: "org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role IN ('owner','admin'))",
        },
        {
          name: "DELETE project",
          using: "org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role = 'owner')",
          roles: ["owner"],
          check: "—",
        },
      ],
    },
    {
      table: "runs",
      policies: [
        {
          name: "SELECT own runs",
          using: "project_id IN (SELECT id FROM projects WHERE org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()))",
          roles: ["all org members"],
          check: "—",
        },
        {
          name: "INSERT run",
          using: "—",
          roles: ["owner", "admin", "member"],
          check: "project_id IN (SELECT id FROM projects WHERE org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role != 'viewer'))",
        },
      ],
    },
    {
      table: "findings",
      policies: [
        {
          name: "SELECT own findings",
          using: "run_id IN (SELECT id FROM runs WHERE project_id IN (SELECT id FROM projects WHERE org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())))",
          roles: ["all org members"],
          check: "—",
        },
      ],
    },
    {
      table: "memberships",
      policies: [
        {
          name: "SELECT own membership",
          using: "user_id = auth.uid() OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role IN ('owner','admin'))",
          roles: ["self + owner/admin"],
          check: "—",
        },
        {
          name: "INSERT membership (invite)",
          using: "—",
          roles: ["owner", "admin"],
          check: "org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role IN ('owner','admin'))",
        },
        {
          name: "DELETE membership",
          using: "user_id = auth.uid() OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role = 'owner')",
          roles: ["self (leave) or owner (remove)"],
          check: "—",
        },
      ],
    },
    {
      table: "api_tokens",
      policies: [
        {
          name: "SELECT own tokens",
          using: "org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role IN ('owner','admin'))",
          roles: ["owner", "admin"],
          check: "—",
        },
        {
          name: "DELETE token",
          using: "org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role IN ('owner','admin'))",
          roles: ["owner", "admin"],
          check: "—",
        },
      ],
    },
  ];

  return (
    <div data-testid="rls-policy-summary" className="space-y-6">
      <p className="text-gray-400 text-sm">
        All tables use Supabase Row-Level Security (RLS) with{" "}
        <code className="bg-gray-800 px-1 rounded">ALTER TABLE ... ENABLE ROW LEVEL SECURITY</code> and{" "}
        <code className="bg-gray-800 px-1 rounded">FORCE ROW LEVEL SECURITY</code>.{" "}
        The Supabase service role (used only by admin migrations) bypasses RLS; the anon and authenticated roles do not.
        Every application query goes through the <code className="bg-gray-800 px-1 rounded">authenticated</code> role.
      </p>

      <div className="space-y-4">
        {tables.map((t) => (
          <div key={t.table} className="border border-gray-700 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-900 border-b border-gray-800 flex items-center gap-2">
              <code className="text-indigo-300 font-mono font-bold text-sm">{t.table}</code>
              <span className="text-xs text-gray-500">{t.policies.length} polic{t.policies.length === 1 ? "y" : "ies"}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-950">
                    <th className="px-3 py-2 text-left text-gray-500 font-medium">Policy</th>
                    <th className="px-3 py-2 text-left text-gray-500 font-medium">Allowed roles</th>
                    <th className="px-3 py-2 text-left text-gray-500 font-medium">USING (row filter)</th>
                    <th className="px-3 py-2 text-left text-gray-500 font-medium">WITH CHECK (insert filter)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {t.policies.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-900 transition-colors">
                      <td className="px-3 py-2.5 text-white font-medium whitespace-nowrap">{p.name}</td>
                      <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{p.roles.join(", ")}</td>
                      <td className="px-3 py-2.5 text-green-300 font-mono text-xs max-w-xs break-all">{p.using}</td>
                      <td className="px-3 py-2.5 text-yellow-300 font-mono text-xs max-w-xs break-all">{p.check}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-gray-900 border border-gray-700 rounded-xl text-sm text-gray-400">
        <strong className="text-white">Cross-org isolation guarantee:</strong> The{" "}
        <code className="bg-gray-800 px-1 rounded">org_id</code> column on every table is always checked
        against the authenticated user&apos;s memberships. A user belonging to Org A cannot read, write, or
        enumerate any rows belonging to Org B — even with a valid JWT. The check happens at the database layer,
        not the application layer.
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="security-page">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-3 text-sm flex-wrap">
        <Link href="/" className="text-white font-bold">
          ⚡ DocsCI
        </Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300">Security Review Packet</span>
        <div className="ml-auto flex flex-wrap gap-3">
          <Link href="/roadmap/customer-hosted-runner" className="text-gray-400 hover:text-white text-xs">
            Customer-hosted runner →
          </Link>
          <a
            href="mailto:security@snippetci.com"
            className="text-gray-400 hover:text-white text-xs"
          >
            security@snippetci.com
          </a>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-16">
        {/* Header */}
        <header data-testid="security-header">
          <div className="flex flex-wrap gap-2 mb-4">
            <Pill label="SOC 2 Type II — in progress" ok={false} />
            <Pill label="TLS 1.3 everywhere" />
            <Pill label="RLS on all tables" />
            <Pill label="Hermetic runner isolation" />
            <Pill label="Zero source-code egress" />
            <Pill label="Customer-hosted runner option" />
          </div>
          <h1 className="text-4xl font-black text-white mb-4" data-testid="security-h1">
            Security Review Packet
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-2xl">
            This document is intended for InfoSec teams evaluating DocsCI for enterprise deployment.
            It covers the data flow architecture, runner isolation controls, Row-Level Security
            policy summary, and compliance posture. For a one-page summary, see the{" "}
            <a href="#soc2" className="text-indigo-400 underline">
              SOC 2 section
            </a>{" "}
            or email{" "}
            <a href="mailto:security@snippetci.com" className="text-indigo-400 underline">
              security@snippetci.com
            </a>
            .
          </p>
        </header>

        {/* Table of contents */}
        <nav
          className="p-5 bg-gray-900 border border-gray-700 rounded-2xl"
          aria-label="On this page"
          data-testid="security-toc"
        >
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">On this page</p>
          <ol className="space-y-1.5 text-sm">
            {[
              ["#data-flow", "1. Data flow diagram"],
              ["#runner-isolation", "2. Runner isolation model"],
              ["#rls", "3. Row-Level Security policy summary"],
              ["#soc2", "4. SOC 2 status"],
              ["#pentest", "5. Penetration testing"],
              ["#responsible-disclosure", "6. Responsible disclosure"],
            ].map(([href, label]) => (
              <li key={href}>
                <a href={href} className="text-indigo-400 hover:text-indigo-300 transition-colors">
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* § 1 Data flow */}
        <Section
          id="data-flow"
          title="1. Data flow diagram"
          badge={{ label: "Updated May 2025", color: "bg-gray-800 border-gray-600 text-gray-400" }}
        >
          <p className="text-gray-400 text-sm mb-5 leading-relaxed">
            The diagram below shows every system boundary, data flow, and trust crossing in a DocsCI run.
            Node labels (A–H) correspond to the flow table. The single external trust boundary (D→E) is
            where the runner calls the customer&apos;s staging API — the only outbound call that crosses
            your network perimeter.
          </p>
          <DataFlowDiagram />
        </Section>

        {/* § 2 Runner isolation */}
        <Section
          id="runner-isolation"
          title="2. Runner isolation model"
          badge={{ label: "5 isolation layers", color: "bg-orange-900 border-orange-700 text-orange-300" }}
        >
          <p className="text-gray-400 text-sm mb-5 leading-relaxed">
            Code examples are executed in a five-layer isolation stack. Each layer adds independent controls —
            a vulnerability in L1 (V8 isolate escape) would still be blocked by L3 (network allowlist) and
            L4 (Docker seccomp). The layers are described below from innermost to outermost.
          </p>
          <RunnerIsolationModel />
        </Section>

        {/* § 3 RLS */}
        <Section
          id="rls"
          title="3. Row-Level Security policy summary"
          badge={{ label: "Supabase Postgres", color: "bg-green-900 border-green-700 text-green-300" }}
        >
          <RLSPolicySummary />
        </Section>

        {/* § 4 SOC 2 */}
        <Section
          id="soc2"
          title="4. SOC 2 Type II status"
          badge={{ label: "In progress", color: "bg-yellow-900 border-yellow-700 text-yellow-300" }}
        >
          <div data-testid="soc2-section" className="space-y-5">
            <div className="p-5 bg-yellow-950 border border-yellow-800 rounded-2xl">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🛡️</span>
                <div>
                  <h3 className="text-white font-semibold mb-1">SOC 2 Type II audit in progress</h3>
                  <p className="text-yellow-200 text-sm leading-relaxed">
                    DocsCI is currently undergoing SOC 2 Type II readiness assessment with an
                    AICPA-registered auditing firm. Our observation period begins Q3 2025, with
                    an estimated report delivery date of Q1 2026. In the interim, we provide this
                    security packet and are happy to answer vendor questionnaires directly.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  trust: "Security",
                  status: "In scope",
                  color: "bg-green-900 border-green-700",
                  controls: [
                    "Logical access controls (RBAC + RLS)",
                    "Encryption at rest and in transit",
                    "Vulnerability management",
                    "Incident response plan",
                    "Security awareness training",
                  ],
                },
                {
                  trust: "Availability",
                  status: "In scope",
                  color: "bg-green-900 border-green-700",
                  controls: [
                    "Vercel Edge global distribution",
                    "Supabase managed Postgres (99.9% SLA)",
                    "Job queue retry with exponential backoff",
                    "Uptime monitoring (status.snippetci.com)",
                    "Incident notification via webhook",
                  ],
                },
                {
                  trust: "Confidentiality",
                  status: "In scope",
                  color: "bg-green-900 border-green-700",
                  controls: [
                    "Customer data isolated by org_id + RLS",
                    "Secret redaction in run logs",
                    "Customer-hosted runner option (zero egress)",
                    "DPA available on request",
                    "Data retention limits configurable per org",
                  ],
                },
                {
                  trust: "Processing Integrity",
                  status: "Planned for Type II",
                  color: "bg-yellow-900 border-yellow-700",
                  controls: [
                    "Hermetic runner — deterministic execution",
                    "Run report signed with HMAC-SHA256",
                    "Audit log of all finding writes",
                    "Input validation on docs archive upload",
                    "Schema validation on all API inputs (Zod)",
                  ],
                },
              ].map((t) => (
                <div
                  key={t.trust}
                  className={`border rounded-xl overflow-hidden ${t.color}`}
                >
                  <div className="px-4 py-3 flex items-center justify-between border-b border-current border-opacity-30">
                    <span className="text-white font-semibold">{t.trust}</span>
                    <span className="text-xs text-gray-400">{t.status}</span>
                  </div>
                  <ul className="divide-y divide-gray-800">
                    {t.controls.map((c, i) => (
                      <li key={i} className="px-4 py-2 text-xs text-gray-300 flex items-start gap-2">
                        <span className="text-green-400 mt-0.5 shrink-0">✓</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="p-4 bg-gray-900 border border-gray-700 rounded-xl text-sm text-gray-400">
              <strong className="text-white">Need a vendor questionnaire response?</strong>{" "}
              Email{" "}
              <a href="mailto:security@snippetci.com" className="text-indigo-400 underline">
                security@snippetci.com
              </a>{" "}
              with your questionnaire. We respond to standard security questionnaires (SIG Lite,
              CAIQ, custom) within 5 business days. GDPR DPA, BAA template, and architecture
              diagrams are available on request.
            </div>
          </div>
        </Section>

        {/* § 5 Pen test */}
        <Section id="pentest" title="5. Penetration testing">
          <div data-testid="pentest-section" className="space-y-4 text-sm text-gray-400">
            <p>
              DocsCI conducts annual third-party penetration tests of the API, runner sandbox, and
              dashboard. The most recent test was conducted in Q1 2025 by an independent security firm.
              Findings were remediated before publication of this packet. Summary findings available
              under NDA to enterprise customers.
            </p>
            <div className="grid md:grid-cols-3 gap-3">
              {[
                { scope: "API Gateway", result: "3 low findings — all remediated", ok: true },
                { scope: "Runner sandbox escape", result: "No exploitable path found", ok: true },
                { scope: "Dashboard (RBAC/RLS)", result: "1 medium finding — remediated", ok: true },
              ].map((row) => (
                <div
                  key={row.scope}
                  className="p-4 bg-gray-900 border border-gray-700 rounded-xl"
                >
                  <div className="font-medium text-white text-sm mb-1">{row.scope}</div>
                  <div className="text-xs text-green-400">{row.result}</div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* § 6 Responsible disclosure */}
        <Section id="responsible-disclosure" title="6. Responsible disclosure">
          <div data-testid="disclosure-section" className="space-y-4 text-sm text-gray-400">
            <p>
              We follow a coordinated disclosure policy. If you discover a security vulnerability in
              DocsCI, please report it to{" "}
              <a href="mailto:security@snippetci.com" className="text-indigo-400 underline">
                security@snippetci.com
              </a>
              . We will acknowledge receipt within 24 hours and provide a timeline for remediation
              within 72 hours. We ask for 90 days to remediate before public disclosure.
            </p>
            <p>
              PGP key available at{" "}
              <code className="bg-gray-800 px-1 rounded">
                https://snippetci.com/.well-known/security.txt
              </code>
              . We do not pursue legal action against good-faith security researchers.
            </p>
          </div>
        </Section>

        {/* Bottom CTA */}
        <div className="p-6 bg-indigo-950 border border-indigo-700 rounded-2xl">
          <h3 className="text-white font-bold text-lg mb-2">
            Need more detail for your InfoSec review?
          </h3>
          <p className="text-indigo-200 text-sm mb-4">
            We can provide: architecture walkthrough call, vendor questionnaire response,
            NDA + pen test executive summary, DPA / BAA template, and customer-hosted runner
            deployment guide.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="mailto:security@snippetci.com?subject=Security%20Review%20Request"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Contact security team →
            </a>
            <Link
              href="/roadmap/customer-hosted-runner"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold rounded-lg border border-gray-600 transition-colors"
            >
              Customer-hosted runner →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
