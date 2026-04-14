/**
 * components/ComparisonPage.tsx
 *
 * Reusable comparison page template for DocsCI vs [competitor] pages.
 * Includes JSON-LD structured data, SEO meta (via metadata export), and
 * a structured comparison table.
 */

import Link from "next/link";
import type { Metadata } from "next";

export type CompRow = {
  feature: string;
  docsci: string | React.ReactNode;
  competitor: string | React.ReactNode;
  winner?: "docsci" | "competitor" | "tie";
};

export type ComparisonPageProps = {
  slug: string;             // URL slug, e.g. "sphinx-doctest"
  competitor: string;       // e.g. "Sphinx doctest"
  competitorUrl?: string;
  tagline: string;          // one-liner under h1
  summary: React.ReactNode; // 2-3 sentence summary
  rows: CompRow[];
  docsciSummary: string;    // brief strengths bullet items
  competitorSummary: string;
  verdict: React.ReactNode;
  faqs?: Array<{ q: string; a: string }>;
};

function Check() {
  return <span className="text-green-400 font-bold">✓</span>;
}
function Cross() {
  return <span className="text-red-400">✗</span>;
}
function Partial({ label }: { label: string }) {
  return <span className="text-yellow-400">⚠ {label}</span>;
}

export { Check, Cross, Partial };

export function ComparisonPage({
  slug,
  competitor,
  competitorUrl,
  tagline,
  summary,
  rows,
  docsciSummary,
  competitorSummary,
  verdict,
  faqs = [],
}: ComparisonPageProps) {
  const canonicalUrl = `https://snippetci.com/vs/${slug}`;
  const title = `DocsCI vs ${competitor}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    url: canonicalUrl,
    description: tagline,
    publisher: {
      "@type": "Organization",
      name: "DocsCI",
      url: "https://snippetci.com",
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "DocsCI", item: "https://snippetci.com" },
        { "@type": "ListItem", position: 2, name: "Compare", item: "https://snippetci.com/vs" },
        { "@type": "ListItem", position: 3, name: title, item: canonicalUrl },
      ],
    },
    ...(faqs.length > 0 && {
      mainEntity: faqs.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    }),
  };

  const docsciWins = rows.filter(r => r.winner === "docsci").length;
  const competitorWins = rows.filter(r => r.winner === "competitor").length;
  const ties = rows.filter(r => r.winner === "tie").length;

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="comparison-page">
        {/* Breadcrumb */}
        <div className="max-w-5xl mx-auto px-6 pt-6">
          <nav className="text-sm text-gray-500 flex gap-2 items-center" aria-label="breadcrumb">
            <Link href="/" className="hover:text-gray-300">DocsCI</Link>
            <span>/</span>
            <Link href="/vs" className="hover:text-gray-300">Compare</Link>
            <span>/</span>
            <span className="text-gray-300">{competitor}</span>
          </nav>
        </div>

        {/* Hero */}
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-950 border border-indigo-700 rounded-full text-indigo-300 text-xs font-medium mb-4">
              Side-by-side comparison
            </div>
            <h1 className="text-4xl font-bold text-white mb-3" data-testid="comparison-h1">
              DocsCI vs {competitor}
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">{tagline}</p>
          </div>

          {/* Score card */}
          <div className="grid grid-cols-3 gap-4 mb-10 max-w-lg mx-auto" data-testid="score-card">
            <div className="p-4 bg-indigo-950 border border-indigo-700 rounded-xl text-center">
              <p className="text-2xl font-bold text-indigo-300">{docsciWins}</p>
              <p className="text-xs text-gray-500 mt-1">DocsCI wins</p>
            </div>
            <div className="p-4 bg-gray-900 border border-gray-700 rounded-xl text-center">
              <p className="text-2xl font-bold text-gray-400">{ties}</p>
              <p className="text-xs text-gray-500 mt-1">Ties</p>
            </div>
            <div className="p-4 bg-gray-900 border border-gray-700 rounded-xl text-center">
              <p className="text-2xl font-bold text-gray-400">{competitorWins}</p>
              <p className="text-xs text-gray-500 mt-1">{competitor} wins</p>
            </div>
          </div>

          {/* Summary */}
          <div className="p-5 bg-gray-900 border border-gray-700 rounded-xl mb-10 text-gray-400 text-sm leading-relaxed">
            {summary}
          </div>

          {/* Comparison table */}
          <div className="mb-10" data-testid="comparison-table">
            <h2 className="text-xl font-semibold text-white mb-4">Feature comparison</h2>
            <div className="overflow-x-auto rounded-xl border border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 bg-gray-900">
                    <th className="text-left text-gray-400 py-3 px-4 font-medium w-1/3">Feature</th>
                    <th className="text-center text-indigo-400 py-3 px-4 font-medium">
                      🚀 DocsCI
                    </th>
                    <th className="text-center text-gray-400 py-3 px-4 font-medium">
                      {competitorUrl ? (
                        <a href={competitorUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                          {competitor} ↗
                        </a>
                      ) : competitor}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className={`border-b border-gray-800 ${row.winner === "docsci" ? "bg-indigo-950/20" : ""}`}>
                      <td className="py-3 px-4 text-gray-300">{row.feature}</td>
                      <td className="py-3 px-4 text-center">{row.docsci}</td>
                      <td className="py-3 px-4 text-center">{row.competitor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Strengths */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div className="p-5 bg-indigo-950/40 border border-indigo-700/50 rounded-xl">
              <h3 className="text-white font-semibold mb-3">✅ DocsCI strengths</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                {docsciSummary.split("\n").filter(Boolean).map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-indigo-400 shrink-0">→</span>
                    <span>{s.replace(/^[-•]\s*/, "")}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-5 bg-gray-900 border border-gray-700 rounded-xl">
              <h3 className="text-white font-semibold mb-3">⚠ {competitor} limitations</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                {competitorSummary.split("\n").filter(Boolean).map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-yellow-500 shrink-0">•</span>
                    <span>{s.replace(/^[-•]\s*/, "")}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Verdict */}
          <div className="p-6 bg-gray-900 border-l-4 border-indigo-500 rounded-xl mb-10" data-testid="verdict">
            <h3 className="text-white font-semibold mb-2">Our verdict</h3>
            <div className="text-gray-400 text-sm leading-relaxed">{verdict}</div>
          </div>

          {/* FAQs */}
          {faqs.length > 0 && (
            <div className="mb-10" data-testid="faq-section">
              <h2 className="text-xl font-semibold text-white mb-4">Frequently asked questions</h2>
              <div className="space-y-4">
                {faqs.map(({ q, a }, i) => (
                  <div key={i} className="p-4 bg-gray-900 border border-gray-700 rounded-xl">
                    <p className="text-white font-medium mb-2">{q}</p>
                    <p className="text-gray-400 text-sm">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="p-8 bg-gradient-to-r from-indigo-950 to-gray-900 border border-indigo-700 rounded-2xl text-center" data-testid="cta-section">
            <h3 className="text-2xl font-bold text-white mb-2">Ready to switch to DocsCI?</h3>
            <p className="text-gray-400 mb-6 text-sm">Integrate in 5 minutes. No credit card required.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/signup"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors"
                data-testid="cta-signup"
              >
                Start free trial
              </Link>
              <Link
                href="/playground"
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-lg transition-colors"
              >
                Try the playground
              </Link>
            </div>
          </div>

          {/* Other comparisons */}
          <div className="mt-10 pt-8 border-t border-gray-800">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">Also compare</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "vs Sphinx doctest", href: "/vs/sphinx-doctest" },
                { label: "vs ad-hoc CI scripts", href: "/vs/ad-hoc-ci-scripts" },
                { label: "vs Postman Collections", href: "/vs/postman-collections" },
                { label: "vs Mintlify", href: "/vs/mintlify" },
                { label: "vs README.io checks", href: "/vs/readme-checks" },
              ]
                .filter(l => !l.href.includes(slug))
                .map(l => (
                  <Link key={l.href} href={l.href} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-700 transition-colors">
                    {l.label}
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
