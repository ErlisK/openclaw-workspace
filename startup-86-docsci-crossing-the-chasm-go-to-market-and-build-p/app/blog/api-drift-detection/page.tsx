import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How to Detect API Drift Before Your Customers Do — DocsCI Blog",
  description: "API drift is silent until a developer hits a parameter mismatch. This post explains the architecture behind DocsCI's drift detection engine and how to catch it in CI.",
  alternates: { canonical: "https://snippetci.com/blog/api-drift-detection" },
  openGraph: {
    title: "How to Detect API Drift Before Your Customers Do",
    description: "API drift is silent until a developer hits a parameter mismatch. Here's how to catch it in CI.",
    url: "https://snippetci.com/blog/api-drift-detection",
    type: "article",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "How to Detect API Drift Before Your Customers Do",
  "datePublished": "2025-06-10",
  "dateModified": "2025-06-10",
  "author": { "@type": "Organization", "name": "DocsCI", "url": "https://snippetci.com" },
  "publisher": { "@type": "Organization", "name": "DocsCI", "url": "https://snippetci.com" },
  "url": "https://snippetci.com/blog/api-drift-detection",
};

export default function ApiDriftDetectionPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="blog-post-api-drift">
        <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-3 text-sm flex-wrap">
          <Link href="/" className="text-white font-bold">⚡ DocsCI</Link>
          <span className="text-gray-700">/</span>
          <Link href="/blog" className="text-gray-400 hover:text-white">Blog</Link>
          <span className="text-gray-700">/</span>
          <span className="text-gray-300">API Drift Detection</span>
        </nav>

        <article className="max-w-2xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
            <time dateTime="2025-06-10">June 10, 2025</time>
            <span>·</span>
            <span>12 min read</span>
            {["API", "CI", "OpenAPI"].map(t => (
              <span key={t} className="px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-400">{t}</span>
            ))}
          </div>

          <h1 className="text-3xl font-bold text-white mb-4 leading-tight" data-testid="post-h1">
            How to Detect API Drift Before Your Customers Do
          </h1>

          <p className="text-gray-400 text-lg mb-8 leading-relaxed">
            API drift — when your documentation diverges from your actual API — is silent until a developer hits a 404
            or a parameter mismatch. This post explains the architecture behind DocsCI's drift detection engine
            and how to catch it in CI.
          </p>

          <div className="prose prose-invert max-w-none text-gray-300 space-y-6 text-sm leading-relaxed">
            <h2 className="text-xl font-bold text-white">What is API drift?</h2>
            <p>
              API drift happens when the behavior your API actually exhibits diverges from what your documentation
              says it does. This manifests in several ways:
            </p>
            <ul className="space-y-2 list-disc list-inside text-gray-300">
              <li>A parameter is renamed in code but not in docs (<code className="bg-gray-800 px-1 rounded">user_id</code> → <code className="bg-gray-800 px-1 rounded">userId</code>)</li>
              <li>A field becomes required but docs show it as optional</li>
              <li>A response shape changes (new field added, old field removed)</li>
              <li>An endpoint is deprecated but docs show it as current</li>
              <li>Auth requirements change (e.g., new scope required)</li>
            </ul>
            <p>
              The dangerous thing about drift is that it's asymmetric: it's easy to create and hard to notice.
              A single engineer makes a one-line change to the API contract. No alarm fires. The documentation
              stays wrong for weeks or months until a developer stumbles into the mismatch.
            </p>

            <h2 className="text-xl font-bold text-white">The three layers of API drift detection</h2>
            <p>
              DocsCI's drift detection works at three layers, which together cover the vast majority of real-world drift patterns:
            </p>

            <div className="space-y-4">
              {[
                {
                  n: "1",
                  title: "Schema diffing (OpenAPI spec vs docs)",
                  desc: "We parse your OpenAPI spec and extract the contract for each endpoint: path, method, required parameters, response schema. Then we parse your documentation and extract what it claims about those endpoints. Any mismatch is flagged.",
                  example: `# OpenAPI spec says:
POST /users
  required: [email, plan]  ← plan is required

# Docs say:
POST /users
  required: [email]        ← drift: plan not documented as required`,
                },
                {
                  n: "2",
                  title: "Live probe execution",
                  desc: "We extract curl and HTTP examples from your docs and execute them against your staging environment. If the request fails, the response shape doesn't match, or the status code is wrong, it's flagged as drift.",
                  example: `# Docs example:
curl -X POST https://api.example.com/users \\
  -d '{"email":"user@example.com"}'
# Expected: 201
# Actual: 422 (missing required field 'plan')
# → DRIFT: plan is now required`,
                },
                {
                  n: "3",
                  title: "SDK execution diff",
                  desc: "For companies with typed SDKs, we run SDK snippets from docs and compare method signatures against the installed SDK version. A TypeScript error means the docs show an API that the SDK no longer supports.",
                  example: `// Docs show:
const user = await client.users.create({
  email: "user@example.com"
});
// SDK error: Property 'plan' is missing in type
// → DRIFT: plan is now required by the SDK type`,
                },
              ].map(layer => (
                <div key={layer.n} className="p-4 bg-gray-900 border border-gray-700 rounded-xl">
                  <div className="flex gap-3 mb-2">
                    <span className="w-6 h-6 bg-indigo-950 border border-indigo-700 rounded-full flex items-center justify-center text-indigo-300 text-xs font-bold shrink-0">{layer.n}</span>
                    <h3 className="text-white font-semibold text-sm">{layer.title}</h3>
                  </div>
                  <p className="text-gray-400 text-xs mb-3">{layer.desc}</p>
                  <pre className="text-xs text-green-300 overflow-x-auto">{layer.example}</pre>
                </div>
              ))}
            </div>

            <h2 className="text-xl font-bold text-white">Setting up drift detection in CI</h2>
            <p>
              The minimal setup requires two things: your docs archive and your OpenAPI spec URL. The workflow runs
              on every release tag (or every PR if you want tighter feedback loops):
            </p>
            <pre className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-xs text-green-300 overflow-x-auto">{`# .github/workflows/drift-detect.yml
name: API Drift Detection

on:
  push:
    tags: ['v*']         # on every release
  pull_request:          # or on every PR

jobs:
  drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Detect API drift
        run: |
          tar czf docs.tar.gz docs/ *.md
          RESULT=$(curl -sf -X POST https://snippetci.com/api/runs/queue \\
            -H "Authorization: Bearer \${{ secrets.DOCSCI_TOKEN }}" \\
            -F "docs_archive=@docs.tar.gz" \\
            -F "openapi_url=https://api.example.com/openapi.json")
          
          DRIFT=$(echo "$RESULT" | jq -r '.finding_breakdown.by_kind.drift_detected // 0')
          echo "Drift findings: $DRIFT"
          echo "$RESULT" | jq -e '.status == "passed"'`}</pre>

            <h2 className="text-xl font-bold text-white">Interpreting drift findings</h2>
            <p>
              DocsCI returns drift findings with three severity levels:
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-700">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-700 bg-gray-900">
                    <th className="text-left text-gray-400 py-2 px-3">Severity</th>
                    <th className="text-left text-gray-400 py-2 px-3">Meaning</th>
                    <th className="text-left text-gray-400 py-2 px-3">CI behavior</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  {[
                    ["critical", "Breaking change — docs show API behavior that will cause errors", "Fails CI"],
                    ["warning", "Mismatch detected but old behavior may still work", "Warns, doesn't fail"],
                    ["info", "New fields in API not yet documented", "Informational"],
                  ].map(([sev, meaning, ci]) => (
                    <tr key={sev} className="border-b border-gray-800">
                      <td className={`py-2 px-3 font-medium ${sev === "critical" ? "text-red-400" : sev === "warning" ? "text-yellow-400" : "text-blue-400"}`}>{sev}</td>
                      <td className="py-2 px-3">{meaning}</td>
                      <td className="py-2 px-3 text-gray-400">{ci}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 className="text-xl font-bold text-white">The compound effect: drift + broken examples</h2>
            <p>
              The most damaging scenario combines drift with broken code examples: your API changes, which causes
              the curl example in your docs to return an error, which causes the SDK example to fail, which causes
              the test in your CI to break, which you fix by updating only the test — not the docs.
              DocsCI breaks this cycle by making the docs the first thing to fail when an API contract changes.
            </p>

            <div className="p-5 bg-indigo-950 border border-indigo-700 rounded-xl mt-8">
              <h3 className="text-white font-semibold mb-2">Try drift detection free</h3>
              <p className="text-indigo-200 text-sm mb-4">
                Connect your OpenAPI spec and get a full drift report in under 5 minutes.
              </p>
              <div className="flex gap-3">
                <Link href="/signup" className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-sm transition-colors">
                  Get started free →
                </Link>
                <Link href="/docs/integrations/github-actions" className="inline-block px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-lg text-sm transition-colors border border-gray-600">
                  GitHub Actions guide
                </Link>
              </div>
            </div>
          </div>
        </article>
      </div>
    </>
  );
}
