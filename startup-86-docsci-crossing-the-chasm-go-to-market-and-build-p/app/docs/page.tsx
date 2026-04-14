import Link from "next/link";
import NavBar from "@/components/NavBar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation — DocsCI",
  description: "Guides, API reference, security docs, and CI templates for DocsCI.",
};

const SECTIONS = [
  {
    icon: "🚀",
    title: "Getting Started",
    desc: "Set up DocsCI in 5 minutes: connect your repo, run your first CI check, review findings.",
    href: "/docs/getting-started",
    badge: "Start here",
    badgeColor: "bg-indigo-900 text-indigo-300",
  },
  {
    icon: "📖",
    title: "Guides",
    desc: "In-depth walkthroughs: snippet execution, API drift detection, accessibility checks, copy linting.",
    href: "/docs/guides",
    badge: null,
    badgeColor: "",
  },
  {
    icon: "🔒",
    title: "Security",
    desc: "Sandbox architecture, network allowlists, secret scanning, ephemeral credentials, and SOC 2 posture.",
    href: "/docs/security",
    badge: "Enterprise",
    badgeColor: "bg-yellow-900 text-yellow-300",
  },
  {
    icon: "📋",
    title: "CI Templates",
    desc: "Ready-to-use GitHub Actions and GitLab CI templates. Copy, configure, deploy.",
    href: "/docs/templates",
    badge: "Download",
    badgeColor: "bg-green-900 text-green-300",
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Nav */}
      <NavBar />

      {/* Hero */}
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-2 text-indigo-400 text-sm font-medium tracking-wide uppercase">Documentation</div>
        <h1 className="text-4xl font-bold text-white mb-4">DocsCI Documentation</h1>
        <p className="text-gray-400 text-lg leading-relaxed mb-10">
          Everything you need to run a docs-specific CI pipeline: verified code examples,
          API drift detection, accessibility audits, copy linting, and AI-generated fixes.
        </p>

        {/* Search hint */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3 mb-12 cursor-text">
          <span className="text-gray-500 text-sm">🔍</span>
          <span className="text-gray-500 text-sm">Search the docs…</span>
          <span className="ml-auto text-gray-600 text-xs bg-gray-800 px-2 py-0.5 rounded">⌘K</span>
        </div>

        {/* Sections grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group bg-gray-900 border border-gray-700 hover:border-indigo-600 rounded-xl p-6 transition-colors"
              data-testid={`docs-section-${s.href.split("/").pop()}`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{s.icon}</span>
                {s.badge && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.badgeColor}`}>
                    {s.badge}
                  </span>
                )}
              </div>
              <h2 className="text-white font-semibold mb-1 group-hover:text-indigo-300 transition-colors">
                {s.title}
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
            </Link>
          ))}
        </div>

        {/* Quick links */}
        <div className="mt-12 border-t border-gray-800 pt-8">
          <h3 className="text-gray-400 text-sm font-medium mb-4 uppercase tracking-wide">Quick links</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { label: "Run your first check", href: "/docs/getting-started#first-run" },
              { label: "GitHub Actions setup", href: "/docs/templates#github-actions" },
              { label: "API drift detection", href: "/docs/guides#drift" },
              { label: "Sandbox security model", href: "/docs/security#sandbox" },
              { label: "Network allowlists", href: "/docs/security#allowlist" },
              { label: "Pricing", href: "/pricing" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
              >
                {link.label} →
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 text-center py-8 text-gray-600 text-sm">
        <p>
          Questions? Email{" "}
          <a href="mailto:hello@snippetci.com" className="text-gray-400 hover:text-white transition-colors">
            hello@snippetci.com
          </a>
        </p>
      </footer>
    </div>
  );
}
