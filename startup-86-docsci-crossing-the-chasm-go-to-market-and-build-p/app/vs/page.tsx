import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "DocsCI vs alternatives — How DocsCI compares",
  description:
    "Compare DocsCI against Sphinx doctest, ad-hoc CI scripts, Postman Collections, Mintlify, and ReadMe. See which docs CI approach fits your team.",
  alternates: { canonical: "https://snippetci.com/vs" },
};

const comparisons = [
  {
    slug: "sphinx-doctest",
    name: "Sphinx doctest",
    category: "Python doc testing",
    summary: "Sphinx doctest only runs Python doctests in RST files. DocsCI runs multi-language snippets from any doc format.",
    docsciWins: ["Multi-language", "Any format", "API drift detection", "PR comments"],
    competitorWins: ["RST-native ecosystem"],
  },
  {
    slug: "ad-hoc-ci-scripts",
    name: "Ad-hoc CI scripts",
    category: "DIY testing",
    summary: "Hand-rolled scripts require constant maintenance and have no drift detection. DocsCI is the purpose-built alternative.",
    docsciWins: ["Zero maintenance", "Sandbox isolation", "Secret scanning", "AI fixes"],
    competitorWins: ["Full customizability"],
  },
  {
    slug: "postman-collections",
    name: "Postman Collections",
    category: "API testing",
    summary: "Postman tests your API. DocsCI tests your documentation. They're complementary — use both.",
    docsciWins: ["Doc snippet execution", "Multi-language", "Accessibility", "Copy checks"],
    competitorWins: ["Performance testing", "Mock servers"],
  },
  {
    slug: "mintlify",
    name: "Mintlify",
    category: "Docs platform",
    summary: "Mintlify hosts beautiful docs. DocsCI verifies they work. Use DocsCI in CI, Mintlify for hosting.",
    docsciWins: ["Snippet execution", "Drift detection", "Accessibility", "Works anywhere"],
    competitorWins: ["Hosting", "Custom components", "Search"],
  },
  {
    slug: "readme-checks",
    name: "README.io checks",
    category: "Developer portal",
    summary: "ReadMe builds beautiful developer portals. DocsCI verifies the code inside them actually works.",
    docsciWins: ["Snippet execution", "Drift detection", "Secret scanning", "AI fixes"],
    competitorWins: ["Developer portal", "Changelog", "User analytics"],
  },
];

export default function VsIndexPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="vs-index">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-950 border border-indigo-700 rounded-full text-indigo-300 text-xs font-medium mb-4">
            Comparisons
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">DocsCI vs alternatives</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            How does DocsCI compare to the tools teams use today for docs testing?
            We think the answer is clear — but judge for yourself.
          </p>
        </div>

        <div className="grid gap-6">
          {comparisons.map(c => (
            <Link
              key={c.slug}
              href={`/vs/${c.slug}`}
              className="block p-6 bg-gray-900 border border-gray-700 hover:border-indigo-600 rounded-xl transition-colors group"
              data-testid={`vs-card-${c.slug}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-gray-800 text-gray-500 text-xs rounded">
                      {c.category}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-indigo-300 transition-colors">
                    DocsCI vs {c.name}
                  </h2>
                  <p className="text-gray-400 text-sm mb-4">{c.summary}</p>
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide mb-1.5">DocsCI wins on</p>
                      <div className="flex flex-wrap gap-1.5">
                        {c.docsciWins.map(w => (
                          <span key={w} className="px-2 py-0.5 bg-indigo-950 text-indigo-300 text-xs rounded-full border border-indigo-800">
                            {w}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide mb-1.5">{c.name} wins on</p>
                      <div className="flex flex-wrap gap-1.5">
                        {c.competitorWins.map(w => (
                          <span key={w} className="px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded-full border border-gray-700">
                            {w}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <span className="text-gray-600 group-hover:text-indigo-400 transition-colors shrink-0">→</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 p-6 bg-gray-900 border border-gray-700 rounded-xl text-center">
          <p className="text-gray-400 text-sm mb-4">
            Not sure which comparison applies to your team?
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/playground" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
              Try DocsCI free
            </Link>
            <Link href="/docs" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg border border-gray-700 transition-colors">
              Read the docs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
