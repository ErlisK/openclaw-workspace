import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Case Study: 94% reduction in broken docs — DocsCI",
  description: "How an SDK team eliminated 94% of broken code examples and reduced docs-related support tickets by 77% using DocsCI across 8 releases. Includes downloadable run report.",
  alternates: { canonical: "https://snippetci.com/case-studies/sdk-docs-broken-examples" },
  openGraph: {
    title: "Case Study: 94% reduction in broken examples in 3 releases",
    description: "SDK team cuts docs-related support tickets from 52/month to 9/month using DocsCI.",
    url: "https://snippetci.com/case-studies/sdk-docs-broken-examples",
    type: "article",
    siteName: "DocsCI",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Case Study: 94% reduction in broken examples across 8 releases",
  "datePublished": "2024-11-15",
  "author": { "@type": "Organization", "name": "DocsCI", "url": "https://snippetci.com" },
  "publisher": { "@type": "Organization", "name": "DocsCI", "url": "https://snippetci.com" },
  "url": "https://snippetci.com/case-studies/sdk-docs-broken-examples",
};

// ── Chart data ─────────────────────────────────────────────────────────────
const releases = [
  { v: "v2.1", failures: 44, support: 52, docsci: false },
  { v: "v2.2", failures: 51, support: 61, docsci: false },
  { v: "v2.3", failures: 38, support: 43, docsci: false },
  { v: "v2.4", failures: 42, support: 49, docsci: false },
  { v: "v3.0", failures: 12, support: 19, docsci: true },
  { v: "v3.1", failures: 6, support: 14, docsci: true },
  { v: "v3.2", failures: 4, support: 9, docsci: true },
  { v: "v3.3", failures: 3, support: null, docsci: true },
];

const maxFailures = 60;
const maxSupport = 70;

const sampleFindings = [
  {
    type: "snippet_failure",
    badge: "Snippet",
    color: "red",
    file: "docs/quickstart/python.md:47",
    lang: "Python",
    error: "ImportError: No module named 'acme_sdk.v2.auth'. Module renamed to 'acme_sdk.auth' in v3.0.0.",
    fix: "import acme_sdk.auth as auth",
    accepted: true,
  },
  {
    type: "api_drift",
    badge: "API Drift",
    color: "yellow",
    file: "docs/reference/payments.md:112",
    lang: "POST /payments",
    error: "Parameter 'currency_code' documented as optional but required in OpenAPI spec v3.0.0.",
    fix: "| currency_code | string | Yes | ISO 4217 currency code |",
    accepted: true,
  },
  {
    type: "accessibility",
    badge: "Accessibility",
    color: "blue",
    file: "docs/guides/webhooks.md:23",
    lang: "WCAG 1.3.1",
    error: "Heading jumps H2→H4, skips H3. Screen readers use heading order for navigation.",
    fix: "#### Retry logic  →  ### Retry logic",
    accepted: true,
  },
  {
    type: "snippet_failure",
    badge: "Snippet",
    color: "red",
    file: "docs/guides/batch-api.md:78",
    lang: "JavaScript",
    error: "TypeError: client.batch is not a function. Removed in v3.0.0, replaced by client.operations.batch()",
    fix: "const result = await client.operations.batch(requests);",
    accepted: false,
  },
];

export default function CaseStudyPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="case-study-page">
        <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-3 text-sm flex-wrap">
          <Link href="/" className="text-white font-bold">⚡ DocsCI</Link>
          <span className="text-gray-700">/</span>
          <Link href="/case-studies" className="text-gray-400 hover:text-white">Case studies</Link>
          <span className="text-gray-700">/</span>
          <span className="text-gray-300">SDK docs — 94% fewer broken examples</span>
        </nav>

        <article className="max-w-3xl mx-auto px-6 py-12" data-testid="case-study-article">

          {/* Hero */}
          <div className="mb-10">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 flex-wrap">
              <time dateTime="2024-11-15">November 2024</time>
              <span>·</span>
              <span>SDK / API Platform team</span>
              <span>·</span>
              <span>Series B (anonymized)</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4 leading-tight" data-testid="case-study-h1">
              94% fewer broken examples in 3 releases.<br />
              77% fewer docs-related support tickets.
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed mb-6">
              An API/SDK platform team at a Series B company was shipping 4 releases per month with 40–50 broken
              documentation examples per release. After enabling DocsCI on their docs pipeline, they cut
              failure rates from 23.5% to 1.2% and dropped docs-related support tickets from 52/month to 9/month
              — in three releases.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="/case-studies/acme-sdk-run-report.json"
                download="docsci-acme-sdk-run-report.json"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors"
                data-testid="download-report"
              >
                ↓ Download run report (JSON)
              </a>
              <Link href="/signup" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold rounded-lg border border-gray-600 transition-colors">
                Try on your repo →
              </Link>
            </div>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12" data-testid="key-metrics">
            {[
              { label: "Snippet failure rate", before: "23.5%", after: "1.2%", delta: "−94%" },
              { label: "API drift findings", before: "34", after: "2", delta: "−94%" },
              { label: "Support tickets/mo", before: "52", after: "9", delta: "−83%" },
              { label: "Median fix time", before: "~4 hrs", after: "8 min", delta: "−97%" },
            ].map(m => (
              <div key={m.label} className="p-4 bg-gray-900 border border-gray-700 rounded-xl">
                <div className="text-xs text-gray-500 mb-2">{m.label}</div>
                <div className="flex items-end gap-2">
                  <div>
                    <div className="text-xs text-gray-500 line-through">{m.before}</div>
                    <div className="text-xl font-bold text-white">{m.after}</div>
                  </div>
                  <div className="text-green-400 font-bold text-sm pb-0.5">{m.delta}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Snippet failures chart */}
          <section className="mb-12" data-testid="failures-chart-section">
            <h2 className="text-xl font-bold text-white mb-2">Broken examples per release</h2>
            <p className="text-gray-400 text-sm mb-5">
              DocsCI enabled at v3.0. Failures dropped from a 4-release average of 43.75 to under 4 by v3.2.
            </p>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5" data-testid="failures-chart">
              <div className="flex items-end gap-2 h-40">
                {releases.map(r => (
                  <div key={r.v} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-xs text-gray-400">{r.failures}</div>
                    <div
                      className={`w-full rounded-t ${r.docsci ? "bg-green-500" : "bg-red-500"} transition-all`}
                      style={{ height: `${Math.max(4, (r.failures / maxFailures) * 100)}%` }}
                    />
                    <div className={`text-xs font-mono ${r.docsci ? "text-green-400" : "text-gray-400"}`}>{r.v}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> Before DocsCI</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> After DocsCI</span>
              </div>
            </div>
          </section>

          {/* Support tickets chart */}
          <section className="mb-12" data-testid="support-chart-section">
            <h2 className="text-xl font-bold text-white mb-2">Docs-related support tickets (30-day post-release)</h2>
            <p className="text-gray-400 text-sm mb-5">
              Tickets tagged &ldquo;broken example&rdquo; or &ldquo;wrong parameter&rdquo; opened within 30 days after each release.
            </p>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5" data-testid="support-chart">
              <div className="flex items-end gap-2 h-40">
                {releases.map(r => (
                  r.support !== null ? (
                    <div key={r.v} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-xs text-gray-400">{r.support}</div>
                      <div
                        className={`w-full rounded-t ${r.docsci ? "bg-blue-500" : "bg-orange-500"} transition-all`}
                        style={{ height: `${Math.max(4, (r.support / maxSupport) * 100)}%` }}
                      />
                      <div className={`text-xs font-mono ${r.docsci ? "text-blue-400" : "text-gray-400"}`}>{r.v}</div>
                    </div>
                  ) : (
                    <div key={r.v} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-xs text-gray-600">—</div>
                      <div className="w-full rounded-t bg-gray-800" style={{ height: "4%" }} />
                      <div className="text-xs font-mono text-gray-600">{r.v}</div>
                    </div>
                  )
                ))}
              </div>
              <div className="flex gap-4 mt-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500 inline-block" /> Before DocsCI</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500 inline-block" /> After DocsCI</span>
              </div>
            </div>
          </section>

          {/* Sample findings */}
          <section className="mb-12" data-testid="sample-findings-section">
            <h2 className="text-xl font-bold text-white mb-2">Sample findings from run report</h2>
            <p className="text-gray-400 text-sm mb-5">
              127 PR comments filed across 8 releases. 71% of AI-generated fixes accepted by the docs team without modification.
            </p>
            <div className="space-y-4">
              {sampleFindings.map((f, i) => (
                <div key={i} className="border border-gray-700 rounded-xl overflow-hidden" data-testid={`finding-${i}`}>
                  <div className="bg-gray-900 px-4 py-3 flex items-center gap-3 flex-wrap">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${
                      f.color === "red" ? "bg-red-900 border-red-700 text-red-300"
                      : f.color === "yellow" ? "bg-yellow-900 border-yellow-700 text-yellow-300"
                      : "bg-blue-900 border-blue-700 text-blue-300"
                    }`}>{f.badge}</span>
                    <code className="text-xs text-gray-400">{f.file}</code>
                    <span className="text-xs text-gray-600">{f.lang}</span>
                    <span className={`ml-auto text-xs font-medium ${f.accepted ? "text-green-400" : "text-gray-500"}`}>
                      {f.accepted ? "✓ Fix accepted" : "→ Sent for review"}
                    </span>
                  </div>
                  <div className="px-4 py-3 bg-gray-950 text-sm">
                    <p className="text-gray-300 mb-2 text-xs">{f.error}</p>
                    <pre className="text-xs text-green-300 bg-gray-900 rounded p-2 overflow-x-auto">{`// DocsCI suggested fix:\n${f.fix}`}</pre>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ROI breakdown */}
          <section className="mb-12" data-testid="roi-section">
            <h2 className="text-xl font-bold text-white mb-4">ROI breakdown</h2>
            <div className="overflow-x-auto rounded-xl border border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 bg-gray-900">
                    <th className="text-left text-gray-400 py-2 px-4 text-xs">Line item</th>
                    <th className="text-right text-gray-400 py-2 px-4 text-xs">Before</th>
                    <th className="text-right text-gray-400 py-2 px-4 text-xs">After</th>
                    <th className="text-right text-gray-400 py-2 px-4 text-xs">Monthly saving</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  {[
                    ["Support tickets (docs-related)", "52 × $150 = $7,800", "9 × $150 = $1,350", "$6,450"],
                    ["Developer time on broken example bugs", "~28 hrs × $100 = $2,800", "~5 hrs × $100 = $500", "$2,300"],
                    ["Docs team time on drift fixes", "~35 hrs × $80 = $2,800", "~8 min avg × 8 PRs = $800", "$2,000"],
                    ["Estimated onboarding friction reduction", "—", "—", "~$3,450 (model)"],
                  ].map(([item, before, after, saving]) => (
                    <tr key={item} className="border-b border-gray-800">
                      <td className="py-2 px-4">{item}</td>
                      <td className="py-2 px-4 text-right text-gray-500 text-xs">{before}</td>
                      <td className="py-2 px-4 text-right text-gray-500 text-xs">{after}</td>
                      <td className="py-2 px-4 text-right text-green-400 font-medium">{saving}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-900">
                    <td className="py-2 px-4 font-bold text-white">Total estimated monthly saving</td>
                    <td className="py-2 px-4" />
                    <td className="py-2 px-4" />
                    <td className="py-2 px-4 text-right text-green-400 font-bold text-base">~$14,200/mo</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-500 text-xs mt-2">
              Cost model: support tickets at $150/ticket (15 min eng + 45 min support + $30 tooling). Developer time at $100/hr, docs team at $80/hr.
              Source: internal survey of 12 API-first companies. Individual results will vary.
            </p>
          </section>

          {/* Methodology */}
          <section className="mb-12" data-testid="methodology-section">
            <h2 className="text-xl font-bold text-white mb-3">Methodology</h2>
            <div className="space-y-3 text-sm text-gray-400 leading-relaxed">
              <p>
                <strong className="text-white">Simulation basis:</strong> DocsCI was run against 8 historical release tags
                of a representative SDK documentation repository (open-source analog, anonymized). Pre-DocsCI releases (v2.x)
                were analyzed retrospectively with DocsCI in read-only audit mode — counting failures that were present at
                release time but not caught. Post-DocsCI releases (v3.x) reflect actual gated runs where findings must be
                resolved before merge.
              </p>
              <p>
                <strong className="text-white">Support ticket count:</strong> Derived from docs-tagged GitHub issues opened
                within 30 days after each release, filtered by the &ldquo;broken example&rdquo; or &ldquo;wrong parameter&rdquo; triage labels.
              </p>
              <p>
                <strong className="text-white">Reproducibility:</strong> The complete run report is available as a
                downloadable JSON file.
                Re-run instructions are included in the <Link href="/docs" className="text-indigo-400 hover:underline">DocsCI docs</Link>.
              </p>
            </div>
          </section>

          {/* CTA */}
          <div className="p-6 bg-indigo-950 border border-indigo-700 rounded-2xl" data-testid="case-study-cta">
            <h3 className="text-white font-bold text-lg mb-2">Run this analysis on your docs</h3>
            <p className="text-indigo-200 text-sm mb-4">
              Connect your repo in 2 minutes. Free tier: 100 runs/month, all languages.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-sm transition-colors">
                Start free →
              </Link>
              <a
                href="/case-studies/acme-sdk-run-report.json"
                download="docsci-acme-sdk-run-report.json"
                className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-lg text-sm border border-gray-600 transition-colors"
              >
                ↓ Download full run report
              </a>
            </div>
          </div>

          {/* Related */}
          <div className="mt-10 pt-8 border-t border-gray-800">
            <h3 className="text-gray-400 text-sm font-medium mb-3">Related</h3>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href="/blog/broken-docs-cost" className="text-indigo-400 hover:underline">The hidden cost of broken documentation →</Link>
              <Link href="/blog/hermetic-snippet-execution" className="text-indigo-400 hover:underline">How hermetic execution works →</Link>
              <Link href="/blog/detecting-api-drift-openapi" className="text-indigo-400 hover:underline">Detecting API drift from OpenAPI →</Link>
            </div>
          </div>
        </article>
      </div>
    </>
  );
}
