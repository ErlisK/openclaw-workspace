import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Setting Up Docs CI in GitHub Actions: A Complete Guide — DocsCI Blog",
  description: "A step-by-step guide to running automated documentation tests in GitHub Actions. Covers basic setup, monorepo workflows, PR comments, and nightly drift detection.",
  alternates: { canonical: "https://snippetci.com/blog/github-actions-docs-ci" },
  openGraph: {
    title: "Setting Up Docs CI in GitHub Actions: A Complete Guide",
    description: "Step-by-step GitHub Actions setup for automated documentation testing. Basic, advanced, monorepo, and scheduled workflows.",
    url: "https://snippetci.com/blog/github-actions-docs-ci",
    type: "article",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Setting Up Docs CI in GitHub Actions: A Complete Guide",
  "datePublished": "2025-06-05",
  "dateModified": "2025-06-05",
  "author": { "@type": "Organization", "name": "DocsCI", "url": "https://snippetci.com" },
  "publisher": { "@type": "Organization", "name": "DocsCI", "url": "https://snippetci.com" },
  "url": "https://snippetci.com/blog/github-actions-docs-ci",
};

export default function GitHubActionsDocsCIPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="blog-post-github-actions">
        <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-3 text-sm flex-wrap">
          <Link href="/" className="text-white font-bold">⚡ DocsCI</Link>
          <span className="text-gray-700">/</span>
          <Link href="/blog" className="text-gray-400 hover:text-white">Blog</Link>
          <span className="text-gray-700">/</span>
          <span className="text-gray-300">GitHub Actions Docs CI</span>
        </nav>

        <article className="max-w-2xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
            <time dateTime="2025-06-05">June 5, 2025</time>
            <span>·</span>
            <span>10 min read</span>
            {["GitHub Actions", "CI/CD", "tutorial"].map(t => (
              <span key={t} className="px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-400">{t}</span>
            ))}
          </div>

          <h1 className="text-3xl font-bold text-white mb-4 leading-tight" data-testid="post-h1">
            Setting Up Docs CI in GitHub Actions: A Complete Guide
          </h1>
          <p className="text-gray-400 text-lg mb-8 leading-relaxed">
            A step-by-step guide to running automated documentation tests in GitHub Actions.
            Covers basic setup, advanced monorepo workflows, PR comment integration, and scheduled drift detection.
          </p>

          <div className="prose prose-invert max-w-none text-gray-300 space-y-6 text-sm leading-relaxed">

            <div className="p-4 bg-gray-900 border-l-4 border-indigo-500 rounded-xl">
              <p className="text-gray-400 text-sm">
                <strong className="text-white">Prerequisites:</strong> A DocsCI account (free at{" "}
                <Link href="/signup" className="text-indigo-400">snippetci.com/signup</Link>),
                a GitHub repository with documentation, and 10 minutes.
              </p>
            </div>

            <h2 className="text-xl font-bold text-white">Step 1: Add your API token</h2>
            <p>
              Generate a DocsCI token from <strong className="text-white">Settings → Tokens</strong>.
              Add it to your GitHub repository under Settings → Secrets and variables → Actions as <code className="bg-gray-800 px-1 rounded">DOCSCI_TOKEN</code>.
            </p>

            <h2 className="text-xl font-bold text-white">Step 2: The basic workflow (5 minutes)</h2>
            <p>
              Create <code className="bg-gray-800 px-1 rounded">.github/workflows/docsci.yml</code>:
            </p>
            <pre className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-xs text-green-300 overflow-x-auto">{`name: DocsCI

on:
  push:
    branches: [main, master]
  pull_request:
    paths:
      - 'docs/**'
      - '*.md'
      - '**/*.mdx'

jobs:
  docs-ci:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - uses: actions/checkout@v4

      - name: Archive docs
        run: tar czf docs.tar.gz docs/ *.md 2>/dev/null || tar czf docs.tar.gz docs/

      - name: Run DocsCI
        id: docsci
        run: |
          RESULT=$(curl -sf -X POST https://snippetci.com/api/runs/queue \\
            -H "Authorization: Bearer \${{ secrets.DOCSCI_TOKEN }}" \\
            -F "docs_archive=@docs.tar.gz")
          echo "$RESULT" | jq .
          echo "$RESULT" | jq -e '.status == "passed"'`}</pre>
            <p>
              That's it. On every pull request that touches docs, DocsCI runs all code examples and reports back.
              The step fails if any example is broken, blocking the merge.
            </p>

            <h2 className="text-xl font-bold text-white">Step 3: Add PR comments with inline findings</h2>
            <p>
              The basic workflow only fails CI. This version posts an inline comment on the PR with exact
              file, line number, error, and suggested fix:
            </p>
            <pre className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-xs text-green-300 overflow-x-auto">{`      - name: Run DocsCI
        id: docsci
        run: |
          RESULT=$(curl -sf -X POST https://snippetci.com/api/runs/queue \\
            -H "Authorization: Bearer \${{ secrets.DOCSCI_TOKEN }}" \\
            -F "docs_archive=@docs.tar.gz" \\
            -F "pr_number=\${{ github.event.number }}" \\
            -F "repo=\${{ github.repository }}" \\
            -F "commit_sha=\${{ github.sha }}")
          echo "result=$RESULT" >> \$GITHUB_OUTPUT
          echo "$RESULT" | jq -e '.status == "passed"'

      - name: Post PR summary
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const result = JSON.parse('\${{ steps.docsci.outputs.result }}' || '{}');
            const status = result.status || 'unknown';
            const icon = status === 'passed' ? '✅' : '❌';
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: \`\${icon} DocsCI: **\${status}** — \${result.finding_count ?? 0} finding(s). [View report](https://snippetci.com/runs/\${result.run_id})\`,
            });`}</pre>

            <h2 className="text-xl font-bold text-white">Step 4: Monorepo support</h2>
            <p>
              For monorepos, detect changed packages and run DocsCI only for those packages in parallel:
            </p>
            <pre className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-xs text-green-300 overflow-x-auto">{`jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      packages: \${{ steps.detect.outputs.packages }}
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 2 }
      - id: detect
        run: |
          PKGS=$(git diff --name-only HEAD~1..HEAD \\
            | grep -E '^packages/[^/]+/' \\
            | awk -F/ '{print $2}' | sort -u | jq -Rcn '[inputs]')
          echo "packages=$PKGS" >> $GITHUB_OUTPUT

  docs-ci:
    needs: detect-changes
    if: \${{ needs.detect-changes.outputs.packages != '[]' }}
    strategy:
      matrix:
        package: \${{ fromJson(needs.detect-changes.outputs.packages) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run DocsCI for \${{ matrix.package }}
        run: |
          tar czf /tmp/docs.tar.gz packages/\${{ matrix.package }}/docs/
          curl -sf -X POST https://snippetci.com/api/runs/queue \\
            -H "Authorization: Bearer \${{ secrets.DOCSCI_TOKEN }}" \\
            -F "docs_archive=@/tmp/docs.tar.gz" \\
            -F "project=\${{ matrix.package }}" \\
          | jq -e '.status == "passed"'`}</pre>

            <h2 className="text-xl font-bold text-white">Step 5: Nightly drift detection</h2>
            <p>
              Your API can drift even when nobody touches the docs. Schedule a nightly check that runs against
              your staging environment:
            </p>
            <pre className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-xs text-green-300 overflow-x-auto">{`name: Nightly Drift Check

on:
  schedule:
    - cron: '0 2 * * *'   # 2 AM UTC
  workflow_dispatch:

jobs:
  nightly:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          find . -name '*.md' -o -name '*.mdx' | tar czf docs.tar.gz -T -
          curl -sf -X POST https://snippetci.com/api/runs/queue \\
            -H "Authorization: Bearer \${{ secrets.DOCSCI_TOKEN }}" \\
            -F "docs_archive=@docs.tar.gz" \\
            -F "openapi_url=https://staging-api.example.com/openapi.json" \\
            -F "full_suite=true" \\
          | jq -e '.status == "passed"'`}</pre>

            <h2 className="text-xl font-bold text-white">What to expect</h2>
            <p>
              On a typical API docs repo with 50-200 Markdown files, DocsCI takes 30-90 seconds to run.
              The first run will usually find 5-20 broken examples that have been silently wrong for months.
              That's normal — the goal is to get to zero broken examples and keep them there.
            </p>

            <div className="p-5 bg-indigo-950 border border-indigo-700 rounded-xl mt-8">
              <h3 className="text-white font-semibold mb-1">Full YAML templates available</h3>
              <p className="text-indigo-200 text-sm mb-3">Copy-paste ready templates in the DocsCI docs.</p>
              <div className="flex flex-wrap gap-3">
                <Link href="/docs/integrations/github-actions" className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-sm transition-colors">
                  GitHub Actions templates →
                </Link>
                <Link href="/docs/integrations/gitlab-ci" className="inline-block px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-lg text-sm transition-colors border border-gray-600">
                  GitLab CI →
                </Link>
              </div>
            </div>
          </div>
        </article>
      </div>
    </>
  );
}
