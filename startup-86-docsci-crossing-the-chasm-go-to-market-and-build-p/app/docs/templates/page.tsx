import Link from "next/link";
import NavBar from "@/components/NavBar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CI Templates — DocsCI",
  description: "GitHub Actions, GitLab CI, curl fallback, docsci.yml config, and pre-commit templates.",
};

// ── Template contents (server-rendered) ─────────────────────────────────────

const GH_TEMPLATE = `# .github/workflows/docsci.yml
name: DocsCI
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]
jobs:
  docs-ci:
    name: Verify docs with DocsCI
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - name: Run DocsCI
        id: docsci
        run: |
          set -euo pipefail
          RESULT=$(curl -sf -X POST https://snippetci.com/api/runs/queue \\
            -H "Authorization: Bearer \${{ secrets.DOCSCI_TOKEN }}" \\
            -H "Content-Type: application/json" \\
            --max-time 120 \\
            -d '{"mode":"repo","repo_id":"\${{ vars.DOCSCI_PROJECT_ID }}","branch":"\${{ github.ref_name }}","commit_sha":"\${{ github.sha }}"}')
          STATUS=$(echo "\$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))")
          FINDINGS=$(echo "\$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('finding_count',0))")
          echo "status=\$STATUS"     >> "\$GITHUB_OUTPUT"
          echo "findings=\$FINDINGS" >> "\$GITHUB_OUTPUT"
      - name: Fail if docs have errors
        if: steps.docsci.outputs.status == 'failed'
        run: |
          echo "::error::DocsCI found \${{ steps.docsci.outputs.findings }} issue(s)."
          exit 1`;

const CURL_TEMPLATE = `#!/usr/bin/env bash
# run-docsci.sh — works in any CI or locally
# Export: DOCSCI_TOKEN, DOCSCI_PROJECT_ID
set -euo pipefail

BRANCH="\${DOCSCI_BRANCH:-\$(git rev-parse --abbrev-ref HEAD)}"
COMMIT="\${DOCSCI_COMMIT:-\$(git rev-parse HEAD)}"

RESULT=$(curl -sf -X POST https://snippetci.com/api/runs/queue \\
  -H "Authorization: Bearer \$DOCSCI_TOKEN" \\
  -H "Content-Type: application/json" \\
  --max-time 120 \\
  -d "{\\
    \\"mode\\":\\"repo\\",\\
    \\"repo_id\\":\\"\$DOCSCI_PROJECT_ID\\",\\
    \\"branch\\":\\"\$BRANCH\\",\\
    \\"commit_sha\\":\\"\$COMMIT\\"\\
  }")

STATUS=\$(echo "\$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))")
FINDINGS=\$(echo "\$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('finding_count',0))")

echo "DocsCI \$STATUS — \$FINDINGS finding(s)"
[ "\$STATUS" = "passed" ] && exit 0 || exit 1`;

const GL_TEMPLATE = `# .gitlab-ci.yml
stages: [docs-ci]
docsci:
  stage: docs-ci
  image: python:3.11-alpine
  before_script: [apk add --no-cache curl]
  script:
    - |
      RESULT=$(curl -sf -X POST https://snippetci.com/api/runs/queue \\
        -H "Authorization: Bearer $DOCSCI_TOKEN" \\
        -H "Content-Type: application/json" \\
        --max-time 120 \\
        -d "{\\"mode\\":\\"repo\\",\\"repo_id\\":\\"$DOCSCI_PROJECT_ID\\",\\"branch\\":\\"$CI_COMMIT_BRANCH\\",\\"commit_sha\\":\\"$CI_COMMIT_SHA\\"}")
      STATUS=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))")
      FINDINGS=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('finding_count',0))")
      echo "DocsCI $STATUS — $FINDINGS finding(s)"
      [ "$STATUS" = "failed" ] && exit 1 || exit 0
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'`;

const DOCSCI_YML = `# docsci.yml — place in your repo root
version: 1
docs:
  path: docs
  include: ["docs/**/*.md"]
  exclude: ["docs/internal/**"]
openapi:
  path: openapi.yaml
snippets:
  timeout_seconds: 20
  languages: [python, javascript, typescript]
  skip_patterns: ["# docsci: skip"]
security:
  network_isolated: false
  allowlist: ["api.example.com"]
checks:
  accessibility: true
  copy_lint: true
  drift_detection: true
  snippets: true`;

// ── Component ─────────────────────────────────────────────────────────────────

function CodeBlock({ code, lang = "yaml", testId }: { code: string; lang?: string; testId?: string }) {
  return (
    <pre
      className="bg-gray-950 border border-gray-700 rounded-xl p-5 text-xs text-green-300 overflow-x-auto leading-relaxed"
      data-lang={lang}
      data-testid={testId}
    >
      {code}
    </pre>
  );
}

function DownloadLink({ id, label, testId }: { id: string; label: string; testId?: string }) {
  return (
    <a
      href={`/api/templates?id=${id}&download=1`}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs rounded-lg transition-colors border border-gray-600"
      data-testid={testId}
    >
      ⬇ {label}
    </a>
  );
}

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Nav */}
      <NavBar />
      {/* Breadcrumb */}
      <div className="border-b border-gray-800 px-6 py-2 flex items-center gap-3 text-sm max-w-7xl mx-auto">
        <Link href="/docs" className="text-gray-500 hover:text-gray-300">Docs</Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-400">CI Templates</span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-green-400 text-xs font-medium uppercase tracking-wide mb-2">Templates</div>
        <h1 className="text-3xl font-bold text-white mb-3">CI Templates</h1>
        <p className="text-gray-400 mb-8">
          Drop these files into your repository to run DocsCI on every push.
          All templates call the same public API — pick the one that fits your stack.
        </p>

        {/* Quick setup */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-10">
          <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
            <span>⚡</span> Quick setup (2 steps)
          </h2>
          <ol className="space-y-2 text-sm text-gray-400 list-decimal list-inside">
            <li>
              <Link href="/dashboard/projects" className="text-indigo-400 underline">Create a project</Link>{" "}
              — copy your Project ID from the project settings page
            </li>
            <li>
              Add <code className="bg-gray-800 px-1 rounded text-green-300">DOCSCI_TOKEN</code> as a secret
              and <code className="bg-gray-800 px-1 rounded text-green-300">DOCSCI_PROJECT_ID</code> as a variable in your CI settings
            </li>
          </ol>
          <p className="text-gray-500 text-xs mt-3">
            API tokens: <span className="text-yellow-400">coming soon</span> — use your Supabase session cookie for now (see curl script below)
          </p>
        </div>

        {/* Template listing strip */}
        <div className="flex gap-2 flex-wrap mb-8 text-xs">
          {[
            { label: "GitHub Actions", href: "#github-actions" },
            { label: "GitLab CI", href: "#gitlab-ci" },
            { label: "curl script", href: "#curl-fallback" },
            { label: "docsci.yml", href: "#docsci-yml" },
          ].map((t) => (
            <a
              key={t.href}
              href={t.href}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full border border-gray-600 transition-colors"
            >
              {t.label}
            </a>
          ))}
          <Link
            href="/docs/guides/migration"
            className="px-3 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 rounded-full border border-indigo-700 transition-colors"
          >
            📖 Migration guide →
          </Link>
        </div>

        {/* GitHub Actions */}
        <section id="github-actions" className="mb-12" data-testid="template-github-actions">
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <span>🐙</span> GitHub Actions
          </h2>
          <p className="text-gray-400 text-sm mb-3">
            Add to <code className="bg-gray-800 px-1 rounded">.github/workflows/docsci.yml</code>
          </p>
          <CodeBlock code={GH_TEMPLATE} testId="code-github-actions" />
          <div className="mt-3 flex gap-2">
            <DownloadLink id="github-actions" label="Download docsci.yml" testId="download-github-actions" />
            <a
              href="/api/templates?id=github-actions"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-gray-400 text-xs rounded-lg transition-colors border border-gray-700"
            >
              Raw ↗
            </a>
          </div>
        </section>

        {/* curl fallback */}
        <section id="curl-fallback" className="mb-12" data-testid="template-curl-fallback">
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <span>🌀</span> curl fallback script
          </h2>
          <p className="text-gray-400 text-sm mb-3">
            Works in <strong className="text-white">any CI system</strong> (CircleCI, Bitbucket Pipelines, Jenkins, Buildkite)
            or locally. Save as <code className="bg-gray-800 px-1 rounded">scripts/run-docsci.sh</code>.
          </p>
          <CodeBlock code={CURL_TEMPLATE} lang="bash" testId="code-curl-fallback" />
          <div className="mt-3 flex gap-2 flex-wrap">
            <DownloadLink id="curl-fallback" label="Download run-docsci.sh" testId="download-curl-fallback" />
            <span className="text-gray-500 text-xs self-center">chmod +x scripts/run-docsci.sh</span>
          </div>
          <div className="mt-4 bg-gray-900 border border-gray-700 rounded-lg p-4 text-xs">
            <p className="text-gray-400 font-medium mb-2">Environment variables</p>
            <div className="space-y-1 text-gray-500">
              <p><code className="text-green-300">DOCSCI_TOKEN</code> — required, your API token</p>
              <p><code className="text-green-300">DOCSCI_PROJECT_ID</code> — required, project UUID</p>
              <p><code className="text-green-300">DOCSCI_BRANCH</code> — optional, defaults to current git branch</p>
              <p><code className="text-green-300">DOCSCI_COMMIT</code> — optional, defaults to HEAD SHA</p>
              <p><code className="text-green-300">DOCSCI_FAIL_FAST</code> — set to &quot;0&quot; to exit 0 on findings</p>
              <p><code className="text-green-300">DOCSCI_TIMEOUT</code> — curl timeout seconds (default: 120)</p>
            </div>
          </div>
        </section>

        {/* GitLab CI */}
        <section id="gitlab-ci" className="mb-12" data-testid="template-gitlab-ci">
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <span>🦊</span> GitLab CI
          </h2>
          <p className="text-gray-400 text-sm mb-3">
            Add to <code className="bg-gray-800 px-1 rounded">.gitlab-ci.yml</code>
          </p>
          <CodeBlock code={GL_TEMPLATE} testId="code-gitlab-ci" />
          <div className="mt-3">
            <DownloadLink id="gitlab-ci" label="Download .gitlab-ci.yml" testId="download-gitlab-ci" />
          </div>
        </section>

        {/* docsci.yml */}
        <section id="docsci-yml" className="mb-12" data-testid="template-docsci-yml">
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <span>⚙️</span> docsci.yml config
          </h2>
          <p className="text-gray-400 text-sm mb-3">
            Drop in your repo root to control timeouts, languages, file globs, and security.
            See the{" "}
            <Link href="/docs/getting-started#docsci-yml" className="text-indigo-400 underline">
              getting started guide
            </Link>{" "}
            for all options.
          </p>
          <CodeBlock code={DOCSCI_YML} testId="code-docsci-yml" />
          <div className="mt-3 flex gap-2">
            <DownloadLink id="docsci-yml" label="Download docsci.yml" testId="download-docsci-yml" />
            <a
              href="/api/docsci-config"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-gray-400 text-xs rounded-lg transition-colors border border-gray-700"
            >
              Validate schema ↗
            </a>
          </div>
        </section>

        {/* API templates endpoint */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-10">
          <h3 className="text-white font-semibold mb-2">Programmatic access</h3>
          <p className="text-gray-400 text-sm mb-3">
            All templates are available via the API — useful for automation:
          </p>
          <pre className="text-xs text-green-300 overflow-x-auto">{`# List all templates
curl https://snippetci.com/api/templates

# Download a specific template
curl https://snippetci.com/api/templates?id=github-actions&download=1 > .github/workflows/docsci.yml
curl https://snippetci.com/api/templates?id=curl-fallback&download=1 > scripts/run-docsci.sh
curl https://snippetci.com/api/templates?id=docsci-yml&download=1 > docsci.yml`}</pre>
        </div>

        {/* Migration guide CTA */}
        <div className="bg-indigo-950 border border-indigo-800 rounded-xl p-6" data-testid="migration-cta">
          <div className="flex items-start gap-4">
            <span className="text-3xl">📖</span>
            <div>
              <h3 className="text-indigo-200 font-semibold mb-1">Migrating from ad-hoc doctests?</h3>
              <p className="text-indigo-300 text-sm mb-3">
                If you&apos;re using pytest doctest, Jupyter notebooks, or custom test scripts to verify code examples,
                our migration guide shows you how to replace them with DocsCI in under an hour.
              </p>
              <Link
                href="/docs/guides/migration"
                className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors font-medium"
                data-testid="migration-guide-link"
              >
                Read the migration guide →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
