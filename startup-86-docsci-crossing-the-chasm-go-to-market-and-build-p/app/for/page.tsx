import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "DocsCI — Use cases and solutions for documentation teams",
  description: "DocsCI solutions for Docusaurus docs CI, API docs testing, OpenAPI validation, and preventing broken code examples.",
  alternates: { canonical: "https://snippetci.com/for" },
};

const pages = [
  {
    slug: "docusaurus-docs-ci",
    title: "Docusaurus Docs CI",
    description: "Add a CI pipeline to your Docusaurus site. Execute MDX snippets, detect API drift, and get PR comments — without touching your Docusaurus config.",
    icon: "⚡",
    tags: ["Docusaurus", "MDX", "CI pipeline"],
  },
  {
    slug: "api-docs-testing",
    title: "API Docs Testing",
    description: "Execute curl examples, SDK snippets, and HTTP requests from your API docs against your staging API. Catch broken examples before developers do.",
    icon: "🌐",
    tags: ["API docs", "curl testing", "SDK testing"],
  },
  {
    slug: "openapi-docs-validation",
    title: "OpenAPI Docs Validation",
    description: "Validate your API documentation against your OpenAPI spec on every PR. Catch renamed parameters, removed endpoints, and schema mismatches at the field level.",
    icon: "📄",
    tags: ["OpenAPI", "spec drift", "schema validation"],
  },
  {
    slug: "prevent-broken-code-examples",
    title: "Prevent Broken Code Examples",
    description: "Execute every code example in CI. JavaScript, Python, Go, Ruby, Bash, cURL — all run in isolated sandboxes. Broken snippets block the PR.",
    icon: "🔬",
    tags: ["code examples", "snippet testing", "multi-language"],
  },
  {
    slug: "openapi-enterprise",
    title: "OpenAPI-First Enterprise Platforms",
    description: "Documentation CI for enterprise API teams. Diff your OpenAPI spec against docs on every PR. Critical drift fails the check. AI-generated fixes close the gap in 8 minutes.",
    icon: "🏢",
    tags: ["OpenAPI", "enterprise", "API drift"],
  },
  {
    slug: "nextjs-mdx-docs",
    title: "Next.js / MDX Documentation",
    description: "Execute fenced code blocks in .mdx files, validate component props, and catch accessibility issues. Works with Nextra, Mintlify, and custom Next.js doc sites.",
    icon: "▲",
    tags: ["Next.js", "MDX", "Nextra", "Mintlify"],
  },
  {
    slug: "gitlab-ci-docs",
    title: "GitLab CI Users",
    description: "Drop DocsCI into your .gitlab-ci.yml as a docs:verify job. MR comments, OpenAPI drift detection, customer-hosted runner for air-gapped GitLab instances.",
    icon: "🦊",
    tags: ["GitLab CI", "self-managed", "MR comments"],
  },
];

export default function ForIndexPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="for-index">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">DocsCI solutions</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            DocsCI works for every kind of documentation team. Find the solution that fits your workflow.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {pages.map(p => (
            <Link
              key={p.slug}
              href={`/for/${p.slug}`}
              className="block p-6 bg-gray-900 border border-gray-700 hover:border-indigo-600 rounded-xl transition-colors group"
              data-testid={`for-card-${p.slug}`}
            >
              <div className="text-3xl mb-3">{p.icon}</div>
              <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-indigo-300 transition-colors">{p.title}</h2>
              <p className="text-gray-400 text-sm mb-3">{p.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {p.tags.map(t => (
                  <span key={t} className="px-2 py-0.5 bg-gray-800 text-gray-500 text-xs rounded">{t}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
