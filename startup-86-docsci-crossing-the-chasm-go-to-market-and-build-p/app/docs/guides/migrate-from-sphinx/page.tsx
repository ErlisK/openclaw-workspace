import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Migrate from Sphinx doctest to DocsCI",
  description: "Step-by-step guide to migrate Python documentation testing from Sphinx doctest to DocsCI. Keep your RST docs, add multi-language support.",
  alternates: { canonical: "https://snippetci.com/docs/guides/migrate-from-sphinx" },
};

const DOCSCI_CONFIG = `# docsci.yml — add to your repo root
docs:
  path: .
  include:
    - "docs/**/*.rst"
    - "docs/**/*.md"
    - "*.rst"
  exclude:
    - "docs/_build/**"
    - "**/_static/**"

snippets:
  languages: [python, javascript, typescript, bash, curl]
  timeout_seconds: 20
  skip_patterns:
    - "# doctest: +SKIP"
    - "# docsci-skip"
    - "EXPECTED OUTPUT"

checks:
  snippets: true
  accessibility: true
  copy_lint: true
  drift: false   # enable when you have an OpenAPI spec`;

const GITHUB_ACTION = `# .github/workflows/docsci.yml
name: DocsCI (replacing Sphinx doctest)

on:
  push:
    branches: [main, master]
  pull_request:
    paths:
      - 'docs/**'
      - '*.rst'
      - '*.md'

jobs:
  docs-ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Keep your existing Sphinx build — DocsCI runs alongside it
      - name: Build Sphinx docs (optional)
        run: |
          pip install sphinx 2>/dev/null || true
          make -C docs html 2>/dev/null || true

      - name: Run DocsCI
        run: |
          tar czf docs.tar.gz docs/ *.rst 2>/dev/null || tar czf docs.tar.gz docs/
          curl -sf -X POST https://snippetci.com/api/runs/queue \\
            -H "Authorization: Bearer \${{ secrets.DOCSCI_TOKEN }}" \\
            -F "docs_archive=@docs.tar.gz" \\
          | jq -e '.status == "passed"'`;

export default function MigrateFromSphinxPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="migrate-sphinx-page">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-3 text-sm flex-wrap">
        <Link href="/docs" className="text-white font-bold">← Docs</Link>
        <span className="text-gray-700">/</span>
        <Link href="/docs/guides" className="text-gray-400 hover:text-white">Guides</Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300">Migrate from Sphinx doctest</span>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-950 border border-yellow-800 rounded-full text-yellow-300 text-xs font-medium mb-4">
          Migration guide
        </div>
        <h1 className="text-3xl font-bold text-white mb-4" data-testid="page-h1">
          Migrate from Sphinx doctest to DocsCI
        </h1>
        <p className="text-gray-400 mb-8">
          Sphinx doctest runs Python <code className="bg-gray-800 px-1 rounded">&gt;&gt;&gt;</code> prompts embedded in RST files.
          DocsCI replaces and extends this: it executes Python snippets in an isolated WASM sandbox,
          adds JavaScript/TypeScript/Go/curl support, detects API drift, and posts PR comments with AI fixes.
          <strong className="text-white"> You keep your RST files exactly as they are.</strong>
        </p>

        <div className="p-4 bg-green-950 border border-green-700 rounded-xl text-xs text-green-300 mb-8">
          <strong>Zero doc changes required.</strong> DocsCI parses your existing RST fenced code blocks.
          You don't need to reformat existing doctests — DocsCI recognizes Python prompts and interactive sessions.
        </div>

        <section className="mb-10" data-testid="section-comparison">
          <h2 className="text-xl font-bold text-white mb-4">What changes</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-900">
                  <th className="text-left text-gray-400 py-3 px-4">Sphinx doctest</th>
                  <th className="text-left text-indigo-400 py-3 px-4">DocsCI</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {[
                  ["Python only", "Python, JS, TS, Go, Ruby, curl, Bash"],
                  ["RST + doctest directive required", "Any RST, Markdown, MDX, AsciiDoc"],
                  ["In-process execution", "Isolated V8 / WASM sandbox"],
                  ["CI via Sphinx build step", "Single curl call or GitHub Action"],
                  ["Build logs only on failure", "Inline PR comments with AI fixes"],
                  ["No secret scanning", "40+ patterns before execution"],
                  ["No API drift detection", "OpenAPI spec vs docs diff"],
                ].map(([sphinx, docsci]) => (
                  <tr key={sphinx} className="border-b border-gray-800">
                    <td className="py-2.5 px-4 text-gray-400">{sphinx}</td>
                    <td className="py-2.5 px-4 text-green-300">{docsci}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10" data-testid="section-steps">
          <h2 className="text-xl font-bold text-white mb-4">Migration steps</h2>
          <div className="space-y-6">
            {[
              {
                n: "1",
                title: "Sign up and get a token",
                body: <>Create an account at <Link href="/signup" className="text-indigo-400">snippetci.com/signup</Link>, create a project, and generate an API token from Settings → Tokens.</>,
              },
              {
                n: "2",
                title: "Add docsci.yml to your repo root",
                body: "Create a docsci.yml to configure DocsCI to scan your RST files:",
                code: DOCSCI_CONFIG,
              },
              {
                n: "3",
                title: "Add the GitHub Action",
                body: "Create the workflow file — it runs DocsCI alongside (or instead of) your existing Sphinx build:",
                code: GITHUB_ACTION,
              },
              {
                n: "4",
                title: "Mark intentionally-failing examples",
                body: <>For doctest examples that are intentionally invalid (showing error states), add a skip comment above the block:
                  <pre className="bg-gray-900 border border-gray-700 rounded p-3 text-xs text-green-300 mt-2">{`# docsci-skip
\`\`\`python
raise ValueError("Expected error")
\`\`\``}</pre>
                  Or configure <code className="bg-gray-800 px-1 rounded">skip_patterns</code> in docsci.yml to match your existing doctest skip markers.
                </>,
              },
              {
                n: "5",
                title: "Remove or disable Sphinx doctest (optional)",
                body: "Once DocsCI is passing in CI, you can remove the Sphinx doctest step from your Makefile and CI. Keep Sphinx for building the HTML docs — DocsCI only replaces the test step.",
              },
            ].map(step => (
              <div key={step.n} className="flex gap-4">
                <div className="shrink-0 w-7 h-7 bg-indigo-950 border border-indigo-700 rounded-full flex items-center justify-center text-indigo-300 text-sm font-bold">
                  {step.n}
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1.5">{step.title}</h3>
                  <div className="text-gray-400 text-sm">{step.body}</div>
                  {step.code && (
                    <pre className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-xs text-green-300 overflow-x-auto mt-3">{step.code}</pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="p-5 bg-indigo-950 border border-indigo-700 rounded-xl text-sm text-indigo-200 mb-8">
          <strong className="text-white">Run both in parallel first.</strong> During the transition sprint, keep Sphinx doctest running alongside DocsCI. Once DocsCI is catching everything Sphinx caught (and more), remove the Sphinx step.
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-wrap gap-3">
          <Link href="/docs/integrations/github-actions" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-700 transition-colors">
            GitHub Actions →
          </Link>
          <Link href="/vs/sphinx-doctest" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-700 transition-colors">
            DocsCI vs Sphinx doctest →
          </Link>
        </div>
      </div>
    </div>
  );
}
