import Link from "next/link";
import NavBar from "@/components/NavBar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guides — DocsCI",
  description: "In-depth guides: snippet execution, API drift detection, accessibility, copy linting.",
};

export default function GuidesPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <NavBar />
      {/* Breadcrumb */}
      <div className="border-b border-gray-800 px-6 py-2 flex items-center gap-3 text-sm max-w-7xl mx-auto">
        <Link href="/docs" className="text-gray-500 hover:text-gray-300">Docs</Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-400">Guides</span>
      </div>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-indigo-400 text-xs font-medium uppercase tracking-wide mb-2">Guides</div>
        <h1 className="text-3xl font-bold text-white mb-3">In-depth guides</h1>
        <p className="text-gray-400 mb-10">
          Learn how each DocsCI analyzer works and how to configure it for your codebase.
        </p>

        <div className="space-y-8">
          {[
            {
              id: "snippets",
              icon: "▶️",
              title: "Code snippet execution",
              body: "DocsCI extracts fenced code blocks from Markdown files and runs them in language-specific sandboxes. Python uses Pyodide WASM; JavaScript/TypeScript uses isolated-vm. A snippet passes if it exits cleanly (no exception, no uncaught rejection). Failures produce findings with the error message, line number, and an AI-generated fix.",
              items: [
                "Supported: python, javascript, typescript",
                "Execution timeout: 20s default, configurable up to 60s",
                "Findings include: error message, stdout, stderr (redacted), language, line number",
                "AI fix: generated for all error-severity snippet failures",
              ],
            },
            {
              id: "drift",
              icon: "🔄",
              title: "API drift detection",
              body: "DocsCI parses your OpenAPI spec (YAML or JSON) and cross-references documented endpoints and parameters against mentions in your Markdown docs. Mismatches produce drift findings.",
              items: [
                "Detects: renamed parameters, removed endpoints, changed types",
                "Supports: OpenAPI 3.x YAML and JSON",
                "Configure: provide openapi_path (in repo) or openapi_url (remote)",
                "Coverage bar: shows % of spec endpoints mentioned in docs",
              ],
            },
            {
              id: "a11y",
              icon: "♿",
              title: "Accessibility checks",
              body: "Docs are parsed as HTML via jsdom and checked with axe-core for WCAG 2.1 violations. Structural checks verify heading hierarchy, alt text, link text, and color contrast.",
              items: [
                "Rules: axe-core WCAG 2.1 Level AA + structural checks",
                "Findings: missing alt text, empty links, heading skip, contrast",
                "Severity: error (violations), warning (best practices)",
              ],
            },
            {
              id: "copy",
              icon: "✍️",
              title: "Copy linting",
              body: "DocsCI lints prose for quality signals that correlate with poor developer experience: passive voice, weasel words, hedging, sensitive terms, and Flesch-Kincaid grade level above 12.",
              items: [
                "Passive voice detection (heuristic + common irregular past participles)",
                "FK grade level: warns if > 12 (target: 8–10 for technical docs)",
                "Weasel words: 'very', 'quite', 'somewhat', 'basically', etc.",
                "Hedging: 'might', 'could', 'perhaps', 'maybe'",
                "Sensitive terms: customizable blocklist",
              ],
            },
          ].map((g) => (
            <div key={g.id} id={g.id} className="bg-gray-900 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{g.icon}</span>
                <h2 className="text-white font-bold text-lg">{g.title}</h2>
              </div>
              <p className="text-gray-400 text-sm mb-4">{g.body}</p>
              <ul className="space-y-1.5">
                {g.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-400">
                    <span className="text-indigo-400 mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link href="/docs/security" className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
            Security model →
          </Link>
        </div>
      </div>
    </div>
  );
}
