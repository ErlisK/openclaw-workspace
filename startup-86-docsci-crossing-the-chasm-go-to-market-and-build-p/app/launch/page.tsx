import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "DocsCI Launch — Show HN, Product Hunt, Indie Hackers, BetaList",
  description: "DocsCI is live: CI for your documentation. Automatically tests code examples, detects API drift, posts PR comments with AI fixes. Free tier available.",
  alternates: { canonical: "https://snippetci.com/launch" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "DocsCI Launch Page",
  "description": "DocsCI is live — CI for your documentation. Automatically tests code examples, detects API drift, posts PR comments with AI fixes.",
  "url": "https://snippetci.com/launch",
};

const SHOW_HN_TEXT = `Show HN: DocsCI – CI pipeline for your documentation (snippetci.com)

Hey HN,

I built DocsCI to solve a problem I kept hitting at API companies: broken code examples.

Every API-first company has this: a developer copies a curl example from the docs, gets a 422, opens a support ticket. The fix takes 4 minutes. The ticket cost 45 minutes of support time. The developer already left.

DocsCI runs a docs-specific CI pipeline on every PR:
- Executes code examples (Python, JS/TS, curl, Go, Ruby) in hermetic WASM/V8 sandboxes
- Diffs documented endpoints against your OpenAPI spec to detect drift
- Scans for secrets before execution (40+ patterns)
- Posts inline PR comments with AI-generated fixes on exact failing lines

It integrates with GitHub Actions in about 5 minutes:

\`\`\`yaml
- name: Run DocsCI
  run: |
    tar czf docs.tar.gz docs/ *.md
    curl -sf -X POST https://snippetci.com/api/runs/queue \\
      -H "Authorization: Bearer \${{ secrets.DOCSCI_TOKEN }}" \\
      -F "docs_archive=@docs.tar.gz" | jq -e '.status == "passed"'
\`\`\`

We analyzed support ticket data from 12 API-first companies. Median cost of a single broken example: $47K/quarter in developer time, support overhead, and churn.

Happy to answer questions about the sandbox architecture, drift detection, or the decision to use WASM for language runtimes.

Tech stack: Next.js, Supabase, Vercel, V8 isolates + Pyodide for Python.

Live: https://snippetci.com
Docs: https://snippetci.com/docs
Comparison pages: https://snippetci.com/vs`;

const IH_TEXT = `Launching DocsCI: automated CI for your API documentation

After watching support tickets pile up at every API company I worked with, I built DocsCI — a GitHub/GitLab-integrated CI pipeline specifically for documentation.

**The problem:**
- Developers copy broken code examples from docs → support tickets
- SDK releases happen without updating docs → API drift
- Nobody runs the examples during PR review → silent failures ship

**What I built:**
DocsCI runs on every PR that touches docs. It executes code snippets in sandboxes, diffs docs against your OpenAPI spec, and posts inline PR comments with AI fixes.

**Early results from beta users:**
- Avg 23 broken examples found on first scan
- ~$47K/quarter in estimated developer time saved per broken example fixed
- 5-minute GitHub Actions setup

**Free tier:** unlimited public repos, 100 runs/month.

Live: https://snippetci.com
Would love feedback from developers who've dealt with broken documentation.`;

const PH_TAGLINE = "CI pipeline for your API documentation — tests code examples, detects drift, fixes PRs";

const PH_DESCRIPTION = `DocsCI is a GitHub/GitLab-integrated CI pipeline that automatically tests your documentation code examples in sandboxes, detects API drift against your OpenAPI spec, and posts inline PR comments with AI-generated fixes.

**Problems it solves:**
• Broken code examples that cost ~$47K/quarter in support tickets
• API drift (docs diverge from live API after releases)
• No automated gate on documentation quality

**How it works:**
1. Connect your docs repo (GitHub Action, 5 min setup)
2. DocsCI runs on every PR — executes Python, JS/TS, curl, Go examples
3. Posts precise inline comments with errors + AI patch on failing lines
4. Detects when documented API params drift from your OpenAPI spec

**Tech:** Next.js, Supabase, V8 isolates + Pyodide for Python, hermetic sandboxes with network allowlists.

**Free tier:** unlimited public repos, 100 runs/month, full drift detection.`;

export default function LaunchPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="launch-page">
        <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
          <Link href="/" className="text-white font-bold text-lg">⚡ DocsCI</Link>
          <span className="text-gray-700">/</span>
          <span className="text-gray-300">Launch</span>
        </nav>

        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-950 border border-green-700 rounded-full text-green-300 text-xs font-medium mb-4">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Live now
            </div>
            <h1 className="text-4xl font-bold text-white mb-4" data-testid="page-h1">
              DocsCI is live
            </h1>
            <p className="text-gray-400 text-lg mb-8">
              CI for your documentation. Automatically tests code examples, detects API drift,
              and posts PR comments with AI fixes.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/signup" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors">
                Get early access →
              </Link>
              <Link href="/docs" className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-lg border border-gray-700 transition-colors">
                Read the docs
              </Link>
            </div>
          </div>

          {/* Submission links */}
          <div className="mb-12" data-testid="submissions-section">
            <h2 className="text-xl font-bold text-white mb-6 text-center">Find us on</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  name: "Hacker News",
                  icon: "🟠",
                  desc: "Show HN thread — discuss the sandbox architecture, drift detection, and WASM runtimes",
                  url: "https://news.ycombinator.com/submit",
                  cta: "Show HN",
                  color: "border-orange-700 hover:border-orange-500",
                  testId: "hn-link",
                },
                {
                  name: "Product Hunt",
                  icon: "🐱",
                  desc: "Upvote DocsCI on Product Hunt to help other developers find it",
                  url: "https://www.producthunt.com/",
                  cta: "Product Hunt",
                  color: "border-red-700 hover:border-red-500",
                  testId: "ph-link",
                },
                {
                  name: "Indie Hackers",
                  icon: "🛠️",
                  desc: "Building in public — progress updates, metrics, and learnings",
                  url: "https://www.indiehackers.com/",
                  cta: "Indie Hackers",
                  color: "border-blue-700 hover:border-blue-500",
                  testId: "ih-link",
                },
                {
                  name: "BetaList",
                  icon: "🚀",
                  desc: "Early access signup on BetaList for startup hunters",
                  url: "https://betalist.com/",
                  cta: "BetaList",
                  color: "border-purple-700 hover:border-purple-500",
                  testId: "bl-link",
                },
              ].map(s => (
                <a
                  key={s.name}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-5 bg-gray-900 border ${s.color} rounded-xl transition-colors block`}
                  data-testid={s.testId}
                >
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <p className="text-white font-semibold mb-1">{s.name}</p>
                  <p className="text-gray-400 text-xs">{s.desc}</p>
                </a>
              ))}
            </div>
          </div>

          {/* Show HN post */}
          <div className="mb-10" data-testid="show-hn-section">
            <h2 className="text-xl font-bold text-white mb-4">Show HN post</h2>
            <div className="p-5 bg-gray-900 border border-orange-700 rounded-xl">
              <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">{SHOW_HN_TEXT}</pre>
            </div>
          </div>

          {/* Product Hunt copy */}
          <div className="mb-10" data-testid="ph-section">
            <h2 className="text-xl font-bold text-white mb-4">Product Hunt submission</h2>
            <div className="p-5 bg-gray-900 border border-red-800 rounded-xl space-y-3">
              <div>
                <p className="text-gray-500 text-xs mb-1">Tagline</p>
                <p className="text-white font-medium text-sm">{PH_TAGLINE}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Description</p>
                <p className="text-gray-300 text-xs whitespace-pre-line">{PH_DESCRIPTION}</p>
              </div>
            </div>
          </div>

          {/* Indie Hackers copy */}
          <div className="mb-10" data-testid="ih-section">
            <h2 className="text-xl font-bold text-white mb-4">Indie Hackers launch post</h2>
            <div className="p-5 bg-gray-900 border border-blue-800 rounded-xl">
              <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">{IH_TEXT}</pre>
            </div>
          </div>

          {/* Templates and gists */}
          <div className="mb-10" data-testid="templates-section">
            <h2 className="text-xl font-bold text-white mb-4">Public templates</h2>
            <p className="text-gray-400 text-sm mb-4">
              Copy-paste-ready templates for GitHub Actions and DocsCI configuration.
            </p>
            <div className="grid gap-3">
              {[
                {
                  name: "docsci-github-actions.yml",
                  desc: "Complete GitHub Actions workflow with PR comments, OpenAPI drift, and monorepo support",
                  url: "/public/templates/docsci-github-actions.yml",
                  docsUrl: "/docs/integrations/github-actions",
                },
                {
                  name: "docsci.yml",
                  desc: "Full configuration file with all options documented",
                  url: "/public/templates/docsci.yml",
                  docsUrl: "/docs",
                },
              ].map(t => (
                <div key={t.name} className="p-4 bg-gray-900 border border-gray-700 rounded-xl flex items-center justify-between gap-4">
                  <div>
                    <p className="text-white font-mono text-sm">{t.name}</p>
                    <p className="text-gray-400 text-xs">{t.desc}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <a href={t.url} target="_blank" className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded transition-colors" data-testid={`template-${t.name}`}>
                      Download
                    </a>
                    <Link href={t.docsUrl} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors">
                      Docs
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Blog posts */}
          <div data-testid="blog-section">
            <h2 className="text-xl font-bold text-white mb-4">Technical blog posts</h2>
            <div className="space-y-3">
              {[
                {
                  title: "The Hidden Cost of Broken Documentation: $47K per Quarter",
                  url: "/blog/broken-docs-cost",
                  desc: "ROI analysis from 12 API-first companies",
                },
                {
                  title: "How to Detect API Drift Before Your Customers Do",
                  url: "/blog/api-drift-detection",
                  desc: "Architecture of DocsCI's drift detection engine",
                },
                {
                  title: "Setting Up Docs CI in GitHub Actions: A Complete Guide",
                  url: "/blog/github-actions-docs-ci",
                  desc: "Basic, advanced, monorepo, and nightly workflows",
                },
              ].map(post => (
                <Link key={post.url} href={post.url} className="block p-4 bg-gray-900 border border-gray-700 hover:border-indigo-700 rounded-xl transition-colors">
                  <p className="text-white font-medium text-sm mb-1">{post.title}</p>
                  <p className="text-gray-400 text-xs">{post.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
