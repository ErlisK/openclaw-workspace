import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Directory Listings & Community Submissions — DocsCI",
  description: "DocsCI directory submissions: awesome-lists, Hacker News Show HN, Product Hunt, Indie Hackers, and more. All with links to the live product.",
  robots: { index: false, follow: false },
};

const submissions = [
  // ── Awesome-list PRs ──────────────────────────────────────────────────────
  {
    category: "Awesome Lists",
    items: [
      {
        id: "awesome-docs",
        name: "testthedocs/awesome-docs",
        type: "GitHub PR",
        status: "submitted",
        url: "https://github.com/testthedocs/awesome-docs/compare/master...ErlisK:awesome-docs:add-docsci",
        forkUrl: "https://github.com/ErlisK/awesome-docs/tree/add-docsci",
        section: "Quality Assurance + GitHub Actions",
        stars: 856,
        description: "Added DocsCI to 'Quality Assurance' (alphabetically) and 'GitHub Actions' sections.",
        prBody: `## What is DocsCI?

[DocsCI](https://snippetci.com) is a GitHub/GitLab-integrated CI service specifically for documentation quality:

- **Snippet execution**: runs code examples in hermetic sandboxes (V8 isolates for JS/TS, Pyodide WASM for Python, allowlisted curl for HTTP examples)
- **API drift detection**: diffs OpenAPI specs against documentation to catch parameter mismatches, schema changes, and deprecated endpoints
- **Accessibility checks**: axe-core + structural validation (heading hierarchy, image alt text, WCAG 2.1 AA)
- **PR comments**: posts precise file/line findings with AI-generated suggested fixes

## Changes

- Added to **Quality Assurance** section (alphabetically between Doc Detective and EkLine)
- Added to **GitHub Actions** section

**GitHub Actions template:** https://snippetci.com/templates/docsci-github-actions.yml  
**Docs:** https://snippetci.com/docs`,
      },
      {
        id: "awesome-technical-writing",
        name: "BolajiAyodeji/awesome-technical-writing",
        type: "GitHub PR",
        status: "submitted",
        url: "https://github.com/BolajiAyodeji/awesome-technical-writing/compare/master...ErlisK:awesome-technical-writing:add-docsci",
        forkUrl: "https://github.com/ErlisK/awesome-technical-writing/tree/add-docsci",
        section: "Useful Tools",
        stars: 2187,
        description: "Added DocsCI to 'Useful Tools' section after Diátaxis Documentation System.",
        prBody: `## What is DocsCI?

[DocsCI](https://snippetci.com) is a docs-specific CI pipeline for technical writers and API documentation teams:

- Executes code examples in hermetic sandboxes — catches broken snippets before users hit them
- Detects API drift by diffing OpenAPI specs against documentation
- Runs accessibility checks (axe-core, heading hierarchy, WCAG 2.1 AA)
- Posts precise PR comments with suggested fixes — no manual review needed

**Website:** https://snippetci.com  
**GitHub Actions template:** https://snippetci.com/gists`,
      },
      {
        id: "awesome-api-devtools",
        name: "yosriady/awesome-api-devtools",
        type: "GitHub PR",
        status: "submitted",
        url: "https://github.com/yosriady/awesome-api-devtools/compare/master...ErlisK:awesome-api-devtools:add-docsci",
        forkUrl: "https://github.com/ErlisK/awesome-api-devtools/tree/add-docsci",
        section: "API Documentation",
        stars: 4008,
        description: "Added DocsCI to 'API Documentation' section alongside ReDoc, Swagger UI, Readme.io.",
        prBody: `## DocsCI — CI pipeline for API documentation

[DocsCI](https://snippetci.com) is a CI pipeline specifically for API documentation quality:

- Executes code examples against your staging API in hermetic sandboxes
- Detects drift between OpenAPI specs and documentation (parameter mismatches, schema changes, deprecated endpoints)
- Runs accessibility checks on every PR
- Posts GitHub/GitLab PR comments with precise findings and suggested fixes

Fits well in the API Documentation section alongside Readme.io, Swagger UI, etc. as a QA/CI layer for docs.

**Website:** https://snippetci.com`,
      },
    ],
  },
  // ── Community / Hacker News ────────────────────────────────────────────────
  {
    category: "Community Posts",
    items: [
      {
        id: "hacker-news",
        name: "Hacker News — Show HN",
        type: "Manual submission",
        status: "ready",
        url: "https://news.ycombinator.com/submit",
        forkUrl: null,
        section: "n/a",
        stars: null,
        description: "Show HN: DocsCI — CI for Documentation. Full post copy available at /social.",
        prBody: `Show HN: DocsCI – CI for Documentation (snippet execution, API drift, accessibility)

https://snippetci.com`,
      },
      {
        id: "product-hunt",
        name: "Product Hunt",
        type: "Manual submission",
        status: "ready",
        url: "https://www.producthunt.com/posts/new",
        forkUrl: null,
        section: "Developer Tools",
        stars: null,
        description: "Full Product Hunt launch copy at /launch. Schedule for Tuesday 12:01 AM PT.",
        prBody: null,
      },
      {
        id: "indie-hackers",
        name: "Indie Hackers — Product Launches",
        type: "Manual submission",
        status: "ready",
        url: "https://www.indiehackers.com/post/new",
        forkUrl: null,
        section: "Product Launches",
        stars: null,
        description: "Full Indie Hackers post copy at /social.",
        prBody: null,
      },
      {
        id: "betalist",
        name: "BetaList",
        type: "Manual submission",
        status: "ready",
        url: "https://betalist.com/submit",
        forkUrl: null,
        section: "Developer Tools",
        stars: null,
        description: "Submit at betalist.com/submit. Product name: DocsCI. Tagline: 'CI for your documentation — no more broken examples.'",
        prBody: null,
      },
    ],
  },
];

const statusColors: Record<string, string> = {
  submitted: "bg-green-900 border-green-700 text-green-300",
  ready: "bg-blue-900 border-blue-700 text-blue-300",
  pending: "bg-yellow-900 border-yellow-700 text-yellow-300",
};

const statusLabels: Record<string, string> = {
  submitted: "✓ Branch submitted",
  ready: "→ Ready to post",
  pending: "⏳ Pending",
};

export default function ListingsPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="listings-page">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 text-sm">
          <Link href="/" className="text-white font-bold">⚡ DocsCI</Link>
          <span className="text-gray-700">/</span>
          <span className="text-gray-300">Directory listings</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/launch" className="text-sm text-gray-400 hover:text-white transition-colors">← Launch hub</Link>
          <Link href="/social" className="text-sm text-gray-400 hover:text-white transition-colors">Social →</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-12">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2" data-testid="listings-h1">Directory Submissions</h1>
          <p className="text-gray-400">
            Awesome-list PR submissions and community directory posts for DocsCI.
            Forks with the changes are live on GitHub — PRs ready to open.
          </p>
        </div>

        {/* Summary counts */}
        <div className="grid grid-cols-3 gap-4" data-testid="submission-counts">
          <div className="p-4 bg-gray-900 border border-gray-700 rounded-xl text-center">
            <div className="text-2xl font-bold text-green-400">3</div>
            <div className="text-xs text-gray-400 mt-1">Awesome-list forks submitted</div>
          </div>
          <div className="p-4 bg-gray-900 border border-gray-700 rounded-xl text-center">
            <div className="text-2xl font-bold text-blue-400">4</div>
            <div className="text-xs text-gray-400 mt-1">Community posts ready</div>
          </div>
          <div className="p-4 bg-gray-900 border border-gray-700 rounded-xl text-center">
            <div className="text-2xl font-bold text-white">6.9k+</div>
            <div className="text-xs text-gray-400 mt-1">Stars across targeted lists</div>
          </div>
        </div>

        {submissions.map(group => (
          <section key={group.category} data-testid={`section-${group.category.toLowerCase().replace(/\s+/g, "-")}`}>
            <h2 className="text-xl font-bold text-white mb-5">{group.category}</h2>
            <div className="space-y-5">
              {group.items.map(item => (
                <div
                  key={item.id}
                  className="border border-gray-700 rounded-2xl overflow-hidden"
                  data-testid={`listing-${item.id}`}
                >
                  <div className="bg-gray-900 px-5 py-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-white font-semibold">{item.name}</h3>
                          {item.stars && (
                            <span className="text-xs text-gray-500">⭐ {item.stars.toLocaleString()}</span>
                          )}
                          {item.section !== "n/a" && (
                            <span className="text-xs px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-400">
                              {item.section}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm">{item.description}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-lg border ${statusColors[item.status]}`}>
                        {statusLabels[item.status]}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-950 border-t border-gray-700 px-5 py-3 flex items-center gap-3 flex-wrap">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      {item.type === "GitHub PR" ? "Open PR ↗" : "Submit ↗"}
                    </a>
                    {item.forkUrl && (
                      <a
                        href={item.forkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-lg border border-gray-600 transition-colors"
                      >
                        View diff ↗
                      </a>
                    )}
                  </div>

                  {item.prBody && (
                    <details className="border-t border-gray-800">
                      <summary className="px-5 py-2 text-xs text-gray-500 cursor-pointer hover:text-gray-400 bg-gray-950">
                        PR body (copy-paste)
                      </summary>
                      <pre className="px-5 py-4 text-xs text-gray-300 whitespace-pre-wrap font-sans bg-gray-950 leading-relaxed border-t border-gray-800">
                        {item.prBody}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/launch" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg font-medium transition-colors">
            ← Launch hub
          </Link>
          <Link href="/social" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-700 transition-colors">
            Social content →
          </Link>
          <Link href="/gists" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-700 transition-colors">
            Public templates →
          </Link>
        </div>
      </main>
    </div>
  );
}
