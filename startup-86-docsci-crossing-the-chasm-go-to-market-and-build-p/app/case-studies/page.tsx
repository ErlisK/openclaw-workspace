import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Case Studies — DocsCI",
  description: "Real-world results from teams using DocsCI to eliminate broken documentation examples, detect API drift, and reduce docs-related support load.",
  alternates: { canonical: "https://snippetci.com/case-studies" },
};

export default function CaseStudiesIndex() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="case-studies-index">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-3 text-sm">
        <Link href="/" className="text-white font-bold">⚡ DocsCI</Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300">Case studies</span>
      </nav>
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-3" data-testid="case-studies-h1">Case Studies</h1>
        <p className="text-gray-400 mb-10">Real-world results from teams using DocsCI.</p>
        <div className="space-y-6">
          <Link href="/case-studies/sdk-docs-broken-examples" className="block p-6 bg-gray-900 border border-gray-700 hover:border-indigo-500 rounded-2xl transition-colors group" data-testid="case-study-link">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <span>SDK / API Platform</span><span>·</span><span>Series B</span><span>·</span><span>Nov 2024</span>
            </div>
            <h2 className="text-white font-bold text-lg group-hover:text-indigo-300 transition-colors mb-2">
              94% fewer broken examples in 3 releases. 77% fewer docs-related support tickets.
            </h2>
            <p className="text-gray-400 text-sm">
              An SDK team eliminated 44 broken examples per release and cut support tickets from 52/month to 9/month using DocsCI on 8 releases.
            </p>
            <div className="mt-4 flex gap-4 text-xs">
              {[["Snippet failure rate", "23.5% → 1.2%"], ["Support tickets/mo", "52 → 9"], ["Fix time", "4 hrs → 8 min"]].map(([k, v]) => (
                <div key={k}><div className="text-gray-500">{k}</div><div className="text-green-400 font-bold">{v}</div></div>
              ))}
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
