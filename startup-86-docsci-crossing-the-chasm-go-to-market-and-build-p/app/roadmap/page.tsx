import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Roadmap — DocsCI",
  description: "Upcoming features: native GitLab integration, customer-hosted runner, GraphQL schema smoke tests, and more. Vote on what to build next.",
  alternates: { canonical: "https://snippetci.com/roadmap" },
  openGraph: {
    title: "DocsCI Roadmap",
    description: "GitLab integration, customer-hosted runner, GraphQL schema smoke tests — and more. Vote on what ships next.",
    url: "https://snippetci.com/roadmap",
    type: "website",
    siteName: "DocsCI",
  },
};

const items = [
  {
    slug: "gitlab-integration",
    status: "in-progress",
    eta: "Q3 2025",
    title: "GitLab Native Integration",
    desc: "Full GitLab CI/CD integration with native MR comments, status checks, pipeline artifacts, and self-managed instance support. No curl workaround — a first-class GitLab app.",
    tags: ["GitLab", "MR comments", "self-managed"],
    votes: 147,
  },
  {
    slug: "customer-hosted-runner",
    status: "in-progress",
    eta: "Q3 2025",
    title: "Customer-Hosted Runner",
    desc: "Run the DocsCI execution engine inside your own VPC. Available as a GitHub Actions composite action and a curl-deployable Docker image. Required for air-gapped environments and enterprise security reviews.",
    tags: ["self-hosted", "GitHub Action", "enterprise", "air-gap"],
    votes: 134,
  },
  {
    slug: "graphql-schema-smoke-tests",
    status: "planned",
    eta: "Q4 2025",
    title: "GraphQL Schema Smoke Tests",
    desc: "Validate GraphQL query examples in documentation against your live schema. Detects deprecated field usage, type mismatches, and missing required arguments — filed as PR comments with suggested fixes.",
    tags: ["GraphQL", "schema", "smoke tests"],
    votes: 89,
  },
  {
    slug: null,
    status: "planned",
    eta: "Q4 2025",
    title: "AsyncAPI Support",
    desc: "Drift detection between AsyncAPI event schema specs and documentation. Validates message payload examples and channel definitions.",
    tags: ["AsyncAPI", "event-driven"],
    votes: 62,
  },
  {
    slug: null,
    status: "planned",
    eta: "Q1 2026",
    title: "Predictive drift alerts",
    desc: "Uses the DocsCI corpus of historical drift signatures to alert on likely drift before a release — based on the pattern of code changes in the PR.",
    tags: ["AI", "predictive", "corpus"],
    votes: 58,
  },
];

const statusConfig = {
  "in-progress": { label: "In progress", color: "bg-yellow-900 border-yellow-700 text-yellow-300" },
  "planned": { label: "Planned", color: "bg-blue-900 border-blue-700 text-blue-300" },
  "shipped": { label: "Shipped ✓", color: "bg-green-900 border-green-700 text-green-300" },
};

export default function RoadmapIndex() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="roadmap-index">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-3 text-sm">
        <Link href="/" className="text-white font-bold">⚡ DocsCI</Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300">Roadmap</span>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-3" data-testid="roadmap-h1">Product Roadmap</h1>
          <p className="text-gray-400 leading-relaxed">
            What we&apos;re building next at DocsCI. Vote on items to help us prioritize.
            Want to shape the roadmap? <a href="mailto:hello@snippetci.com" className="text-indigo-400 hover:underline">Email us</a> or{" "}
            <Link href="/signup" className="text-indigo-400 hover:underline">join the beta</Link>.
          </p>
        </div>

        <div className="space-y-5" data-testid="roadmap-items">
          {items.map((item, i) => {
            const cfg = statusConfig[item.status as keyof typeof statusConfig];
            const inner = (
              <div
                key={i}
                className={`border border-gray-700 rounded-2xl p-5 ${item.slug ? "hover:border-indigo-500 transition-colors cursor-pointer" : ""}`}
                data-testid={item.slug ? `roadmap-item-${item.slug}` : `roadmap-item-${i}`}
              >
                <div className="flex items-start gap-3 justify-between flex-wrap mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded border ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-xs text-gray-500">{item.eta}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span className="text-lg">▲</span>
                    <span className="font-mono">{item.votes}</span>
                  </div>
                </div>
                <h2 className={`text-white font-bold mb-2 ${item.slug ? "group-hover:text-indigo-300" : ""}`}>{item.title}</h2>
                <p className="text-gray-400 text-sm mb-3">{item.desc}</p>
                <div className="flex gap-2 flex-wrap">
                  {item.tags.map(t => (
                    <span key={t} className="px-2 py-0.5 text-xs bg-gray-800 border border-gray-700 rounded text-gray-400">{t}</span>
                  ))}
                </div>
                {item.slug && (
                  <div className="mt-3 text-indigo-400 text-xs font-medium">Full spec → /roadmap/{item.slug}</div>
                )}
              </div>
            );
            return item.slug ? (
              <Link href={`/roadmap/${item.slug}`} key={i} className="block group">
                {inner}
              </Link>
            ) : inner;
          })}
        </div>

        <div className="mt-10 p-5 bg-gray-900 border border-gray-700 rounded-2xl">
          <h3 className="text-white font-semibold mb-2">Request a feature</h3>
          <p className="text-gray-400 text-sm mb-4">Don&apos;t see what you need? Tell us what your docs pipeline is missing.</p>
          <a
            href="mailto:hello@snippetci.com?subject=DocsCI%20Feature%20Request"
            className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Request a feature →
          </a>
        </div>
      </main>
    </div>
  );
}
