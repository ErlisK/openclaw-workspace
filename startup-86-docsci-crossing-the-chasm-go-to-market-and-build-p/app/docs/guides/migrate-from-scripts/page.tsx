import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Migrate from ad-hoc CI scripts to DocsCI",
  description: "Replace your hand-rolled doc testing bash scripts with DocsCI. Zero maintenance, sandboxed execution, AI fixes, and built-in drift detection.",
  alternates: { canonical: "https://snippetci.com/docs/guides/migrate-from-scripts" },
};

const TYPICAL_SCRIPT = `# What most teams have today (test-docs.sh)
#!/bin/bash
set -euo pipefail

# Extract code blocks (fragile grep)
grep -A 20 '\`\`\`python' docs/quickstart.md | \\
  sed '/\`\`\`/d' > /tmp/test_quickstart.py

# Run (no isolation, no secret scanning)
python3 /tmp/test_quickstart.py

# Check JS examples (node version may not match)
grep -A 10 '\`\`\`javascript' docs/api.md | \\
  sed '/\`\`\`/d' > /tmp/test_api.js
node /tmp/test_api.js

echo "All docs tests passed"`;

const DOCSCI_ACTION = `# .github/workflows/docsci.yml
# Replace test-docs.sh with this
name: DocsCI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  docs-ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run DocsCI
        run: |
          tar czf docs.tar.gz docs/ *.md 2>/dev/null || tar czf docs.tar.gz docs/
          curl -sf -X POST https://snippetci.com/api/runs/queue \\
            -H "Authorization: Bearer \${{ secrets.DOCSCI_TOKEN }}" \\
            -F "docs_archive=@docs.tar.gz" \\
          | jq -e '.status == "passed"'`;

export default function MigrateFromScriptsPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="migrate-scripts-page">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-3 text-sm flex-wrap">
        <Link href="/docs" className="text-white font-bold">← Docs</Link>
        <span className="text-gray-700">/</span>
        <Link href="/docs/guides" className="text-gray-400 hover:text-white">Guides</Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300">Migrate from scripts</span>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-950 border border-yellow-800 rounded-full text-yellow-300 text-xs font-medium mb-4">
          Migration guide
        </div>
        <h1 className="text-3xl font-bold text-white mb-4" data-testid="page-h1">
          Migrate from ad-hoc CI scripts to DocsCI
        </h1>
        <p className="text-gray-400 mb-8">
          Many teams have a bash script that extracts code blocks and runs them. It works until the runtime
          changes, a new language is added, or someone needs to know which exact snippet broke.
          DocsCI replaces these scripts with a maintained, sandboxed, observable pipeline.
        </p>

        <section className="mb-10" data-testid="section-before-after">
          <h2 className="text-xl font-bold text-white mb-4">Before and after</h2>
          <p className="text-gray-400 text-sm mb-3">This is what most teams are running today:</p>
          <pre className="bg-gray-900 border border-red-900 rounded-xl p-4 text-xs text-red-300 overflow-x-auto mb-6">{TYPICAL_SCRIPT}</pre>
          <p className="text-gray-400 text-sm mb-3">Replace it with this GitHub Action:</p>
          <pre className="bg-gray-900 border border-green-900 rounded-xl p-4 text-xs text-green-300 overflow-x-auto">{DOCSCI_ACTION}</pre>
        </section>

        <section className="mb-10" data-testid="section-what-you-get">
          <h2 className="text-xl font-bold text-white mb-4">What you gain</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { icon: "🔬", title: "Sandboxed execution", body: "Each snippet runs in an isolated V8 or WASM sandbox — no shared state, no host contamination." },
              { icon: "🔑", title: "Secret scanning", body: "40+ regex patterns scan snippets for credentials before execution. Your script has none of this." },
              { icon: "📌", title: "Inline PR comments", body: "Exact file, line number, error, and an AI-generated fix — not just 'test failed'." },
              { icon: "🔄", title: "API drift detection", body: "Add your OpenAPI spec and DocsCI diffs it against documented parameters on every PR." },
              { icon: "🛠️", title: "Zero maintenance", body: "DocsCI maintains language runtimes. You stop caring when Node 22 breaks your script." },
              { icon: "📊", title: "Run history & metrics", body: "Track pass rates and finding trends over time — your script has no memory." },
            ].map(f => (
              <div key={f.title} className="p-4 bg-gray-900 border border-gray-700 rounded-xl">
                <div className="text-xl mb-2">{f.icon}</div>
                <h3 className="text-white font-medium text-sm mb-1">{f.title}</h3>
                <p className="text-gray-400 text-xs">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10" data-testid="section-migration-steps">
          <h2 className="text-xl font-bold text-white mb-4">Migration steps</h2>
          <div className="space-y-5">
            {[
              { n: "1", title: "Sign up", body: <>Create an account at <Link href="/signup" className="text-indigo-400">snippetci.com/signup</Link> and generate a token.</> },
              { n: "2", title: "Add the GitHub Action", body: "Copy the docsci.yml above into .github/workflows/. Keep your existing test-docs.sh workflow running in parallel for one sprint." },
              { n: "3", title: "Map your skip markers", body: <><pre className="bg-gray-900 border border-gray-700 rounded p-3 text-xs text-green-300 mt-2">{`# docsci.yml
snippets:
  skip_patterns:
    - "# SKIP"
    - "# noqa"
    - "# example only"
    - "/* expected error */"`}</pre></> },
              { n: "4", title: "Validate parity", body: "Confirm DocsCI catches at least everything your scripts caught. Review the findings report in the DocsCI dashboard." },
              { n: "5", title: "Delete test-docs.sh", body: "Remove the old script and its CI step. You're done." },
            ].map(s => (
              <div key={s.n} className="flex gap-4">
                <div className="shrink-0 w-7 h-7 bg-indigo-950 border border-indigo-700 rounded-full flex items-center justify-center text-indigo-300 text-sm font-bold">{s.n}</div>
                <div>
                  <h3 className="text-white font-semibold mb-1 text-sm">{s.title}</h3>
                  <div className="text-gray-400 text-sm">{s.body}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="border-t border-gray-800 pt-6 flex flex-wrap gap-3">
          <Link href="/docs/integrations/github-actions" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-700 transition-colors">GitHub Actions →</Link>
          <Link href="/vs/ad-hoc-ci-scripts" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-700 transition-colors">DocsCI vs ad-hoc scripts →</Link>
        </div>
      </div>
    </div>
  );
}
