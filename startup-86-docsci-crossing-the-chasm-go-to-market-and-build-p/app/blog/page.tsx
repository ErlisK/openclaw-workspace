import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog — DocsCI",
  description: "Technical writing on docs-specific CI, API drift detection, and developer documentation quality.",
  alternates: { canonical: "https://snippetci.com/blog" },
};

const posts = [
  {
    slug: "automating-accessibility-checks-docs",
    title: "Automating Accessibility Checks for Documentation",
    date: "2025-06-28",
    readTime: "11 min",
    tags: ["accessibility", "WCAG", "CI"],
    excerpt: "How DocsCI integrates axe-core and structural validation rules to catch accessibility issues in API documentation — missing alt text, heading hierarchy, color contrast, and ARIA violations — in CI.",
  },
  {
    slug: "detecting-api-drift-openapi",
    title: "Detecting API Drift from OpenAPI + Docs",
    date: "2025-06-25",
    readTime: "13 min",
    tags: ["OpenAPI", "drift detection", "architecture"],
    excerpt: "A technical deep-dive into how DocsCI diffs your OpenAPI spec against your documentation to detect parameter drift, schema mismatches, and deprecated endpoints before they reach your users.",
  },
  {
    slug: "hermetic-snippet-execution",
    title: "Hermetic Snippet Execution for Documentation",
    date: "2025-06-20",
    readTime: "14 min",
    tags: ["sandbox", "security", "architecture"],
    excerpt: "How DocsCI runs documentation code examples safely at scale — V8 isolates for JavaScript/TypeScript, Pyodide WebAssembly for Python, and ephemeral network allowlists for curl examples.",
  },
  {
    slug: "broken-docs-cost",
    title: "The Hidden Cost of Broken Documentation: $47K per Quarter per Broken Example",
    date: "2025-06-15",
    readTime: "8 min",
    tags: ["docs", "ROI", "engineering"],
    excerpt: "We analyzed support ticket data from 12 API-first companies and found that a single broken code example costs $47K per quarter in developer time, support overhead, and churn. Here's how we calculated it and what you can do about it.",
  },
  {
    slug: "api-drift-detection",
    title: "How to Detect API Drift Before Your Customers Do",
    date: "2025-06-10",
    readTime: "12 min",
    tags: ["API", "CI", "OpenAPI"],
    excerpt: "API drift — when your documentation diverges from your actual API — is silent until a developer hits a 404 or a parameter mismatch. This post explains the architecture behind DocsCI's drift detection engine and how to catch it in CI.",
  },
  {
    slug: "github-actions-docs-ci",
    title: "Setting Up Docs CI in GitHub Actions: A Complete Guide",
    date: "2025-06-05",
    readTime: "10 min",
    tags: ["GitHub Actions", "CI/CD", "tutorial"],
    excerpt: "A step-by-step guide to running automated documentation tests in GitHub Actions. Covers basic setup, advanced monorepo workflows, PR comment integration, and scheduled drift detection.",
  },
];

export default function BlogIndexPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="blog-index">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-white font-bold text-lg">⚡ DocsCI</Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300">Blog</span>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold text-white mb-3" data-testid="page-h1">Blog</h1>
        <p className="text-gray-400 mb-10">
          Technical writing on docs-specific CI, API drift detection, and developer documentation quality.
        </p>

        <div className="space-y-8" data-testid="posts-list">
          {posts.map(post => (
            <article key={post.slug} className="border-b border-gray-800 pb-8 last:border-0" data-testid={`post-${post.slug}`}>
              <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                <time>{new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</time>
                <span>·</span>
                <span>{post.readTime} read</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-2 leading-tight">
                <Link href={`/blog/${post.slug}`} className="hover:text-indigo-300 transition-colors">
                  {post.title}
                </Link>
              </h2>
              <p className="text-gray-400 text-sm mb-3 leading-relaxed">{post.excerpt}</p>
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  {post.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-400">
                      {tag}
                    </span>
                  ))}
                </div>
                <Link href={`/blog/${post.slug}`} className="text-indigo-400 hover:text-indigo-300 text-sm ml-auto transition-colors">
                  Read →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
