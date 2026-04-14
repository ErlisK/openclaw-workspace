import type { Metadata } from "next";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Changelog — DocsCI",
  description: "What's new in DocsCI — release notes, new features, and improvements.",
  alternates: { canonical: "https://snippetci.com/changelog" },
};

const ENTRIES = [
  {
    version: "0.9.0",
    date: "2026-04-14",
    type: "release",
    changes: [
      { kind: "new", text: "AI-generated fix suggestions for failed snippet runs — click to apply directly to your PR." },
      { kind: "new", text: "GitLab CI integration: native support for `.gitlab-ci.yml` pipeline configuration." },
      { kind: "new", text: "API Reference documentation at /docs/api with full endpoint specs and auth guide." },
      { kind: "new", text: "Status page at /status showing live service health and historical uptime." },
      { kind: "imp", text: "Sandbox runner cold-start time reduced from 4.2s to 1.1s via pre-warmed V8 isolate pool." },
      { kind: "imp", text: "Drift detection now handles deeply-nested `$ref` chains in OpenAPI 3.1 specs." },
      { kind: "fix", text: "Password reset flow now correctly sends Supabase reset email and handles callback redirect." },
    ],
  },
  {
    version: "0.8.0",
    date: "2026-03-28",
    type: "release",
    changes: [
      { kind: "new", text: "Hermetic Python execution via Pyodide WebAssembly — no network egress, fully deterministic." },
      { kind: "new", text: "PR comment integration: inline annotations on broken examples with file + line precision." },
      { kind: "new", text: "Customer-hosted runner option for air-gapped and on-prem environments (Enterprise)." },
      { kind: "imp", text: "Accessibility checker now runs axe-core 4.9 with WCAG 2.2 AA ruleset." },
      { kind: "fix", text: "Fixed false-positive drift alerts on optional query parameters with default values." },
    ],
  },
  {
    version: "0.7.0",
    date: "2026-03-07",
    type: "release",
    changes: [
      { kind: "new", text: "OpenAPI import: paste a spec URL or upload a file to auto-generate smoke test assertions." },
      { kind: "new", text: "API smoke tests against staging: validates response schemas, status codes, and latency." },
      { kind: "new", text: "Organization management: invite team members, assign roles (admin / member / viewer)." },
      { kind: "imp", text: "Network allowlist editor now supports CIDR notation and per-snippet overrides." },
      { kind: "fix", text: "Supabase RLS policies tightened — org members can no longer read other orgs' run data." },
    ],
  },
  {
    version: "0.6.0",
    date: "2026-02-14",
    type: "release",
    changes: [
      { kind: "new", text: "API drift detection: compares your live OpenAPI spec against documentation to flag mismatches." },
      { kind: "new", text: "Copy linting: detects passive voice, undefined jargon, and inconsistent terminology." },
      { kind: "new", text: "GitHub Actions template: one YAML block to wire DocsCI into any existing workflow." },
      { kind: "imp", text: "Dashboard run list now paginates and supports filtering by status, repo, and branch." },
    ],
  },
  {
    version: "0.5.0",
    date: "2026-01-20",
    type: "release",
    changes: [
      { kind: "new", text: "Snippet execution for JavaScript/TypeScript (Node 20), Python 3.12, and cURL examples." },
      { kind: "new", text: "Ephemeral credentials: per-run API keys rotated automatically after execution." },
      { kind: "new", text: "Free tier: up to 500 snippet runs/month, 1 repo, community support." },
      { kind: "new", text: "Pro tier ($99/mo): unlimited runs, 10 repos, Slack/email alerts, priority support." },
    ],
  },
];

const kindLabel: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-indigo-900 text-indigo-300 border-indigo-700" },
  imp: { label: "Improved", color: "bg-blue-900 text-blue-300 border-blue-700" },
  fix: { label: "Fixed", color: "bg-green-900 text-green-300 border-green-700" },
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <NavBar />

      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-2 text-indigo-400 text-sm font-medium tracking-wide uppercase">Changelog</div>
        <h1 className="text-4xl font-bold text-white mb-4">What&apos;s new</h1>
        <p className="text-gray-400 text-lg leading-relaxed mb-12">
          New features, improvements, and fixes — updated with every release.
        </p>

        <div className="space-y-12">
          {ENTRIES.map((entry) => (
            <div key={entry.version} className="relative">
              {/* Version header */}
              <div className="flex items-baseline gap-4 mb-5">
                <h2 className="text-white text-2xl font-bold">v{entry.version}</h2>
                <time className="text-gray-500 text-sm">
                  {new Date(entry.date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
              </div>

              {/* Changes */}
              <ul className="space-y-3">
                {entry.changes.map((change, i) => {
                  const badge = kindLabel[change.kind];
                  return (
                    <li key={i} className="flex items-start gap-3">
                      <span
                        className={`shrink-0 mt-0.5 text-xs font-medium px-2 py-0.5 rounded border ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                      <p className="text-gray-300 text-sm leading-relaxed">{change.text}</p>
                    </li>
                  );
                })}
              </ul>

              {/* Divider */}
              <div className="border-b border-gray-800 mt-10" />
            </div>
          ))}
        </div>

        {/* Subscribe CTA */}
        <div className="mt-12 bg-gray-900 border border-gray-700 rounded-2xl p-8 text-center">
          <h3 className="text-white font-semibold mb-2">Stay up to date</h3>
          <p className="text-gray-400 text-sm mb-4">
            Follow releases on GitHub or subscribe to the newsletter for release highlights.
          </p>
          <a
            href="mailto:hello@snippetci.com?subject=Subscribe to DocsCI changelog"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Subscribe to updates
          </a>
        </div>
      </div>

      <footer className="border-t border-gray-800 text-center py-8 text-gray-600 text-sm">
        <p>
          Questions?{" "}
          <a href="mailto:hello@snippetci.com" className="text-gray-400 hover:text-white transition-colors">
            hello@snippetci.com
          </a>
        </p>
      </footer>
    </div>
  );
}
