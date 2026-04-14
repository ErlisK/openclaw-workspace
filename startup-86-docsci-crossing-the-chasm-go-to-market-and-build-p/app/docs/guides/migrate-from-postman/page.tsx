import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Migrate from Postman Collections in CI to DocsCI",
  description: "Add DocsCI alongside Postman/Newman to verify documentation code examples — the gap Postman doesn't cover. Step-by-step migration guide.",
  alternates: { canonical: "https://snippetci.com/docs/guides/migrate-from-postman" },
};

const NEWMAN_STEP = `# Your current CI (Newman)
- name: API tests (Newman)
  run: |
    npx newman run postman-collection.json \\
      --environment postman-env.json \\
      --reporters cli,junit \\
      --reporter-junit-export results.xml`;

const COMBINED_CI = `# Combined CI: Newman + DocsCI
- name: API tests (Newman)
  run: |
    npx newman run postman-collection.json \\
      --environment postman-env.json

# DocsCI runs in parallel — tests DOCUMENTATION, not API
- name: Docs tests (DocsCI)
  run: |
    tar czf docs.tar.gz docs/ *.md 2>/dev/null || tar czf docs.tar.gz docs/
    curl -sf -X POST https://snippetci.com/api/runs/queue \\
      -H "Authorization: Bearer \${{ secrets.DOCSCI_TOKEN }}" \\
      -F "docs_archive=@docs.tar.gz" \\
      -F "openapi_url=\${{ vars.OPENAPI_URL }}" \\
    | jq -e '.status == "passed"'`;

export default function MigrateFromPostmanPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="migrate-postman-page">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-3 text-sm flex-wrap">
        <Link href="/docs" className="text-white font-bold">← Docs</Link>
        <span className="text-gray-700">/</span>
        <Link href="/docs/guides" className="text-gray-400 hover:text-white">Guides</Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300">Migrate from Postman</span>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-950 border border-yellow-800 rounded-full text-yellow-300 text-xs font-medium mb-4">
          Integration guide
        </div>
        <h1 className="text-3xl font-bold text-white mb-4" data-testid="page-h1">
          Add DocsCI alongside Postman Collections
        </h1>
        <p className="text-gray-400 mb-4">
          <strong className="text-white">DocsCI doesn't replace Postman.</strong> Postman/Newman tests your API endpoints.
          DocsCI tests your documentation — the code examples your developers copy-paste.
          These are different problems, and you should run both.
        </p>
        <div className="p-4 bg-blue-950 border border-blue-700 rounded-xl text-blue-200 text-sm mb-8">
          <strong>The gap Postman leaves:</strong> Newman verifies that <code className="bg-gray-900 px-1 rounded">POST /users</code> returns 201.
          DocsCI verifies that the <code className="bg-gray-900 px-1 rounded">curl -X POST https://api.example.com/users</code> example
          in your quickstart guide actually works, and that documented parameters match the OpenAPI spec.
        </div>

        <section className="mb-10" data-testid="section-before-after">
          <h2 className="text-xl font-bold text-white mb-4">Your current CI + DocsCI</h2>
          <p className="text-gray-400 text-sm mb-3">Current CI (Newman only):</p>
          <pre className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-xs text-green-300 overflow-x-auto mb-4">{NEWMAN_STEP}</pre>
          <p className="text-gray-400 text-sm mb-3">Add DocsCI in parallel:</p>
          <pre className="bg-gray-900 border border-green-900 rounded-xl p-4 text-xs text-green-300 overflow-x-auto">{COMBINED_CI}</pre>
        </section>

        <section className="mb-10" data-testid="section-what-docsci-adds">
          <h2 className="text-xl font-bold text-white mb-4">What DocsCI adds to your stack</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-900">
                  <th className="text-left text-gray-400 py-3 px-4">Coverage area</th>
                  <th className="text-center text-gray-400 py-3 px-4">Postman/Newman</th>
                  <th className="text-center text-indigo-400 py-3 px-4">DocsCI</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {[
                  ["API endpoint contract testing", "✓", "Partial"],
                  ["Code examples in Markdown docs", "✗", "✓"],
                  ["Multi-language SDK snippets (JS, Python, Go)", "✗", "✓"],
                  ["OpenAPI spec vs docs drift", "✗", "✓"],
                  ["Accessibility checks on doc pages", "✗", "✓"],
                  ["Copy quality (passive voice, sensitive terms)", "✗", "✓"],
                  ["Pre-execution secret scanning", "✗", "✓"],
                  ["PR inline comments with AI fixes", "✗", "✓"],
                  ["Mock servers", "✓", "✗"],
                  ["Performance/load testing", "✓", "✗"],
                ].map(([area, postman, docsci]) => (
                  <tr key={area} className="border-b border-gray-800">
                    <td className="py-2.5 px-4">{area}</td>
                    <td className="py-2.5 px-4 text-center">{postman === "✓" ? <span className="text-green-400">✓</span> : postman === "✗" ? <span className="text-red-400">✗</span> : <span className="text-yellow-400">{postman}</span>}</td>
                    <td className="py-2.5 px-4 text-center">{docsci === "✓" ? <span className="text-green-400">✓</span> : docsci === "✗" ? <span className="text-red-400">✗</span> : <span className="text-yellow-400">{docsci}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10" data-testid="section-steps">
          <h2 className="text-xl font-bold text-white mb-4">Setup steps</h2>
          <div className="space-y-4">
            {[
              { n: "1", title: "Create a DocsCI account", body: <><Link href="/signup" className="text-indigo-400">snippetci.com/signup</Link> — free tier, no credit card.</> },
              { n: "2", title: "Add DOCSCI_TOKEN secret", body: "GitHub Settings → Secrets → Actions → New secret. Name it DOCSCI_TOKEN." },
              { n: "3", title: "Copy the DocsCI step", body: "Add the DocsCI step from the snippet above to your existing GitHub Actions workflow. It runs in parallel with Newman." },
              { n: "4", title: "Configure OpenAPI drift (optional)", body: <>Add your OpenAPI spec URL as a variable: <code className="bg-gray-800 px-1 rounded text-green-300">vars.OPENAPI_URL</code>. DocsCI will diff documented params against the spec.</> },
            ].map(s => (
              <div key={s.n} className="flex gap-4">
                <div className="shrink-0 w-7 h-7 bg-indigo-950 border border-indigo-700 rounded-full flex items-center justify-center text-indigo-300 text-sm font-bold">{s.n}</div>
                <div>
                  <h3 className="text-white font-semibold text-sm mb-1">{s.title}</h3>
                  <div className="text-gray-400 text-sm">{s.body}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="border-t border-gray-800 pt-6 flex flex-wrap gap-3">
          <Link href="/docs/integrations/github-actions" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-700 transition-colors">GitHub Actions →</Link>
          <Link href="/vs/postman-collections" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-700 transition-colors">DocsCI vs Postman →</Link>
        </div>
      </div>
    </div>
  );
}
