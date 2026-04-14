import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "GitHub Actions for DocsCI — Copy-paste-ready YAML workflows",
  description:
    "Copy-paste GitHub Actions YAML to run DocsCI on every pull request. Includes basic, advanced, monorepo, and PR-comment workflows.",
  alternates: { canonical: "https://snippetci.com/docs/integrations/github-actions" },
  keywords: ["DocsCI GitHub Actions", "docs CI github actions", "documentation testing github actions", "docsci.yml"],
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "GitHub Actions for DocsCI",
  description: "Copy-paste GitHub Actions YAML to run DocsCI on every pull request.",
  url: "https://snippetci.com/docs/integrations/github-actions",
  publisher: { "@type": "Organization", name: "DocsCI", url: "https://snippetci.com" },
};

const BASIC_WORKFLOW = `# .github/workflows/docsci.yml
name: DocsCI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]
    paths:
      - 'docs/**'
      - '*.md'
      - '**/*.mdx'

jobs:
  docs-ci:
    name: Verify documentation
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - uses: actions/checkout@v4

      - name: Archive docs
        run: tar czf docs.tar.gz docs/ *.md 2>/dev/null || tar czf docs.tar.gz docs/

      - name: Run DocsCI
        id: docsci
        run: |
          set -euo pipefail
          RESULT=$(curl -sf -X POST https://snippetci.com/api/runs/queue \\
            -H "Authorization: Bearer \${{ secrets.DOCSCI_TOKEN }}" \\
            -F "docs_archive=@docs.tar.gz" \\
            -w "\\n%{http_code}" 2>/dev/null)
          HTTP_CODE=\$(echo "\$RESULT" | tail -1)
          BODY=\$(echo "\$RESULT" | head -n -1)
          echo "body=\$BODY" >> \$GITHUB_OUTPUT
          [ "\$HTTP_CODE" -eq 200 ] || exit 1

      - name: Check result
        run: |
          STATUS=\$(echo '\${{ steps.docsci.outputs.body }}' | jq -r '.status')
          echo "DocsCI status: \$STATUS"
          [ "\$STATUS" = "passed" ] || exit 1`;

const ADVANCED_WORKFLOW = `# .github/workflows/docsci-advanced.yml
name: DocsCI (Advanced)

on:
  pull_request:
    branches: [main, master]

jobs:
  docs-ci:
    name: Verify documentation
    runs-on: ubuntu-latest
    timeout-minutes: 15
    permissions:
      pull-requests: write

    steps:
      - uses: actions/checkout@v4

      - name: Archive docs with OpenAPI spec
        run: |
          tar czf docs.tar.gz docs/ *.md **/*.mdx 2>/dev/null || \\
          tar czf docs.tar.gz docs/

      - name: Run DocsCI
        id: docsci
        env:
          DOCSCI_TOKEN: \${{ secrets.DOCSCI_TOKEN }}
        run: |
          set -euo pipefail
          RESULT=$(curl -sf -X POST https://snippetci.com/api/runs/queue \\
            -H "Authorization: Bearer \$DOCSCI_TOKEN" \\
            -F "docs_archive=@docs.tar.gz" \\
            -F "openapi_url=https://api.example.com/openapi.json" \\
            -F "branch=\${{ github.head_ref }}" \\
            -F "commit_sha=\${{ github.sha }}" \\
            -F "pr_number=\${{ github.event.number }}" \\
            -F "repo=\${{ github.repository }}")
          echo "result=\$RESULT" >> \$GITHUB_OUTPUT
          echo "\$RESULT" | jq -r '.status' | grep -q "passed" || exit 1

      - name: Post PR summary
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const result = JSON.parse('\${{ steps.docsci.outputs.result }}' || '{}');
            const status = result.status || 'unknown';
            const findings = result.finding_count || 0;
            const duration = ((result.duration_ms || 0) / 1000).toFixed(1);
            const icon = status === 'passed' ? '✅' : '❌';
            const body = [
              \`## \${icon} DocsCI: \${status}\`,
              \`- **Findings:** \${findings}\`,
              \`- **Duration:** \${duration}s\`,
              \`- [View full report](https://snippetci.com/runs/\${result.run_id})\`,
            ].join('\\n');
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body,
            });`;

const MONOREPO_WORKFLOW = `# .github/workflows/docsci-monorepo.yml
name: DocsCI (Monorepo)

on:
  pull_request:
    paths:
      - 'packages/*/docs/**'
      - 'packages/*/README.md'
      - 'docs/**'

jobs:
  detect-changed-packages:
    runs-on: ubuntu-latest
    outputs:
      packages: \${{ steps.changed.outputs.packages }}
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 2 }
      - id: changed
        run: |
          PKGS=\$(git diff --name-only HEAD~1..HEAD \\
            | grep -E '^packages/[^/]+/' \\
            | awk -F/ '{print \$2}' | sort -u | jq -Rcn '[inputs]')
          echo "packages=\$PKGS" >> \$GITHUB_OUTPUT

  docs-ci:
    needs: detect-changed-packages
    if: \${{ needs.detect-changed-packages.outputs.packages != '[]' }}
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package: \${{ fromJson(needs.detect-changed-packages.outputs.packages) }}
    name: DocsCI — \${{ matrix.package }}

    steps:
      - uses: actions/checkout@v4
      - name: Run DocsCI for \${{ matrix.package }}
        run: |
          cd packages/\${{ matrix.package }}
          tar czf /tmp/docs.tar.gz docs/ *.md 2>/dev/null || \\
          tar czf /tmp/docs.tar.gz docs/
          curl -sf -X POST https://snippetci.com/api/runs/queue \\
            -H "Authorization: Bearer \${{ secrets.DOCSCI_TOKEN }}" \\
            -F "docs_archive=@/tmp/docs.tar.gz" \\
            -F "project=\${{ matrix.package }}" \\
          | jq -e '.status == "passed"'`;

const SCHEDULE_WORKFLOW = `# .github/workflows/docsci-nightly.yml
name: DocsCI Nightly

on:
  schedule:
    - cron: '0 2 * * *'   # 2 AM UTC daily
  workflow_dispatch:        # allow manual trigger

jobs:
  nightly-docs-check:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - name: Archive all docs
        run: find . -name '*.md' -o -name '*.mdx' | \\
          tar czf docs.tar.gz --files-from=-

      - name: Run full DocsCI suite
        run: |
          RESULT=\$(curl -sf -X POST https://snippetci.com/api/runs/queue \\
            -H "Authorization: Bearer \${{ secrets.DOCSCI_TOKEN }}" \\
            -F "docs_archive=@docs.tar.gz" \\
            -F "full_suite=true")
          echo "\$RESULT" | jq .
          echo "\$RESULT" | jq -e '.status == "passed"' || \\
            (echo "::error::DocsCI found \$(echo \$RESULT | jq .finding_count) issues" && exit 1)`;

function CodeBlock({ code, filename }: { code: string; filename: string }) {
  return (
    <div className="rounded-xl border border-gray-700 overflow-hidden mb-6" data-testid={`codeblock-${filename.replace(/\W+/g, "-")}`}>
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-xs font-mono text-gray-400">{filename}</span>
        <span className="text-xs text-gray-600">YAML</span>
      </div>
      <pre className="p-4 text-xs text-green-300 overflow-x-auto bg-gray-900 leading-relaxed">{code}</pre>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-14" data-testid={`section-${id}`}>
      <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
      <div className="w-8 h-0.5 bg-indigo-500 mb-6" />
      {children}
    </section>
  );
}

export default function GitHubActionsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="github-actions-page">
        {/* Nav */}
        <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-3 text-sm flex-wrap">
          <Link href="/docs" className="text-white font-bold">← Docs</Link>
          <span className="text-gray-700">/</span>
          <span className="text-gray-400">Integrations</span>
          <span className="text-gray-700">/</span>
          <span className="text-gray-300">GitHub Actions</span>
        </nav>

        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* ToC */}
          <div className="p-4 bg-gray-900 border border-gray-700 rounded-xl mb-10 text-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">On this page</p>
            <div className="space-y-1.5">
              {[
                { href: "#prerequisites", label: "Prerequisites" },
                { href: "#basic", label: "Basic workflow" },
                { href: "#advanced", label: "Advanced: PR comments + OpenAPI" },
                { href: "#monorepo", label: "Monorepo: per-package runs" },
                { href: "#nightly", label: "Nightly scheduled run" },
                { href: "#secrets", label: "Secrets & environment variables" },
                { href: "#tips", label: "Tips & troubleshooting" },
              ].map(({ href, label }) => (
                <a key={href} href={href} className="block text-gray-400 hover:text-indigo-300 transition-colors">
                  → {label}
                </a>
              ))}
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white mb-4" data-testid="page-h1">
            GitHub Actions for DocsCI
          </h1>
          <p className="text-gray-400 text-lg mb-10">
            Copy-paste-ready YAML workflows to run DocsCI on every pull request.
            Pick the template that fits your project structure.
          </p>

          <Section id="prerequisites" title="Prerequisites">
            <ol className="space-y-3 text-sm text-gray-300">
              <li className="flex gap-3">
                <span className="text-indigo-400 font-bold shrink-0">1.</span>
                <span>Create a DocsCI account at <Link href="/signup" className="text-indigo-400 hover:text-indigo-300">snippetci.com/signup</Link> and create a project.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-400 font-bold shrink-0">2.</span>
                <span>Generate a DocsCI API token from <strong className="text-white">Settings → Tokens</strong>.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-400 font-bold shrink-0">3.</span>
                <span>Add the token to your GitHub repository as a secret named <code className="bg-gray-800 px-1 rounded text-green-300">DOCSCI_TOKEN</code>: Settings → Secrets and variables → Actions → New repository secret.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-400 font-bold shrink-0">4.</span>
                <span>Create <code className="bg-gray-800 px-1 rounded text-green-300">.github/workflows/</code> in your repository if it doesn't already exist.</span>
              </li>
            </ol>
          </Section>

          <Section id="basic" title="Basic workflow">
            <p className="text-gray-400 text-sm mb-4">
              The simplest workflow — runs DocsCI on every push to <code className="bg-gray-800 px-1 rounded">main</code> and every pull request. Fails the CI check if any snippet is broken or any finding exceeds threshold.
            </p>
            <CodeBlock code={BASIC_WORKFLOW} filename=".github/workflows/docsci.yml" />
            <div className="p-4 bg-yellow-950 border border-yellow-800 rounded-xl text-xs text-yellow-200">
              <strong>Tip:</strong> Add <code className="bg-gray-900 px-1 rounded">paths: ['docs/**', '*.md']</code> to the PR trigger to skip the check when only non-docs files change. This reduces unnecessary CI minutes.
            </div>
          </Section>

          <Section id="advanced" title="Advanced: PR comments + OpenAPI">
            <p className="text-gray-400 text-sm mb-4">
              This workflow adds OpenAPI drift detection and posts a summary comment on every pull request. Requires <code className="bg-gray-800 px-1 rounded text-green-300">pull-requests: write</code> permission and the <code className="bg-gray-800 px-1 rounded text-green-300">GITHUB_TOKEN</code> (available automatically).
            </p>
            <CodeBlock code={ADVANCED_WORKFLOW} filename=".github/workflows/docsci-advanced.yml" />
            <p className="text-gray-500 text-xs mt-2">Replace <code>api.example.com/openapi.json</code> with your actual OpenAPI spec URL. Remove the <code>openapi_url</code> line if you don't have an OpenAPI spec.</p>
          </Section>

          <Section id="monorepo" title="Monorepo: per-package runs">
            <p className="text-gray-400 text-sm mb-4">
              For monorepos, detect which packages changed and run DocsCI only for those packages in parallel. Uses a matrix strategy for concurrent per-package execution.
            </p>
            <CodeBlock code={MONOREPO_WORKFLOW} filename=".github/workflows/docsci-monorepo.yml" />
            <p className="text-gray-500 text-xs mt-2">Adjust the <code>packages/*/docs/**</code> glob to match your monorepo structure.</p>
          </Section>

          <Section id="nightly" title="Nightly scheduled run">
            <p className="text-gray-400 text-sm mb-4">
              Run a full DocsCI pass nightly to catch drift that wasn't introduced by a PR (e.g., your API changed externally, or a runtime version updated).
            </p>
            <CodeBlock code={SCHEDULE_WORKFLOW} filename=".github/workflows/docsci-nightly.yml" />
          </Section>

          <Section id="secrets" title="Secrets & environment variables">
            <div className="overflow-x-auto rounded-xl border border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 bg-gray-900">
                    <th className="text-left text-gray-400 py-3 px-4 font-medium">Secret / Variable</th>
                    <th className="text-left text-gray-400 py-3 px-4 font-medium">Required</th>
                    <th className="text-left text-gray-400 py-3 px-4 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  {[
                    ["DOCSCI_TOKEN", "Required", "DocsCI API token. Generate from Settings → Tokens."],
                    ["GITHUB_TOKEN", "Auto-injected", "GitHub's built-in token — used for posting PR comments. No setup needed."],
                    ["DOCSCI_PROJECT_ID", "Optional", "Pin runs to a specific project. Otherwise uses the default project for the token."],
                  ].map(([name, req, desc]) => (
                    <tr key={name} className="border-b border-gray-800">
                      <td className="py-3 px-4 font-mono text-green-300 text-xs">{name}</td>
                      <td className="py-3 px-4 text-xs">{req}</td>
                      <td className="py-3 px-4 text-xs text-gray-400">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="tips" title="Tips & troubleshooting">
            <div className="space-y-4">
              {[
                {
                  q: "The workflow fails with 401 Unauthorized",
                  a: "Check that the DOCSCI_TOKEN secret is set in Settings → Secrets. The token must match the project you're sending docs to. Tokens expire after 1 year by default.",
                },
                {
                  q: "The tar command fails — no docs directory found",
                  a: "Update the tar command to match your docs directory structure. Use `find . -name '*.md'` to list files before archiving. The docs archive must contain at least one .md or .mdx file.",
                },
                {
                  q: "Runs time out on large doc sets",
                  a: "Increase timeout-minutes to 20-30. For very large repos, use the paths filter to only trigger on documentation changes. Consider the monorepo workflow to parallelize across packages.",
                },
                {
                  q: "I want to block merges on findings",
                  a: "DocsCI exits with code 1 when status is 'failed'. The `jq -e '.status == \"passed\"'` check already blocks the CI step. GitHub will block the PR merge if you configure DocsCI as a required status check in branch protection rules.",
                },
              ].map(({ q, a }) => (
                <div key={q} className="p-4 bg-gray-900 border border-gray-700 rounded-xl">
                  <p className="text-white font-medium text-sm mb-1.5">{q}</p>
                  <p className="text-gray-400 text-sm">{a}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Cross-links */}
          <div className="border-t border-gray-800 pt-8 mt-8 flex flex-wrap gap-3">
            <Link href="/docs/integrations/gitlab-ci" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-700 transition-colors">
              GitLab CI →
            </Link>
            <Link href="/docs/guides/migration" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-700 transition-colors">
              Migration guide →
            </Link>
            <Link href="/docs/templates" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-700 transition-colors">
              More templates →
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
