import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CI Templates — DocsCI",
  description: "GitHub Actions and GitLab CI templates for DocsCI.",
};

const GH_TEMPLATE = `# .github/workflows/docsci.yml
name: DocsCI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  docs-ci:
    name: Run DocsCI
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Trigger DocsCI run
        id: run
        run: |
          RESULT=$(curl -s -X POST https://snippetci.com/api/runs/queue \\
            -H "Authorization: Bearer \${{ secrets.DOCSCI_TOKEN }}" \\
            -H "Content-Type: application/json" \\
            -d '{"mode":"repo","repo_id":"\${{ vars.DOCSCI_PROJECT_ID }}","branch":"\${{ github.ref_name }}","commit_sha":"\${{ github.sha }}"}')
          echo "\$RESULT"
          STATUS=$(echo "\$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))")
          echo "status=\$STATUS" >> \$GITHUB_OUTPUT
          FINDINGS=$(echo "\$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('finding_count',0))")
          echo "findings=\$FINDINGS" >> \$GITHUB_OUTPUT

      - name: Fail on errors
        if: steps.run.outputs.status == 'failed'
        run: |
          echo "DocsCI found \${{ steps.run.outputs.findings }} issue(s)."
          echo "View findings at: https://snippetci.com/dashboard/projects/\${{ vars.DOCSCI_PROJECT_ID }}"
          exit 1`;

const GL_TEMPLATE = `# .gitlab-ci.yml
stages:
  - docs-ci

docsci:
  stage: docs-ci
  image: alpine:3.19
  before_script:
    - apk add --no-cache curl python3
  script:
    - |
      RESULT=$(curl -s -X POST https://snippetci.com/api/runs/queue \\
        -H "Authorization: Bearer $DOCSCI_TOKEN" \\
        -H "Content-Type: application/json" \\
        -d "{\\"mode\\":\\"repo\\",\\"repo_id\\":\\"$DOCSCI_PROJECT_ID\\",\\"branch\\":\\"$CI_COMMIT_BRANCH\\",\\"commit_sha\\":\\"$CI_COMMIT_SHA\\"}")
      echo "$RESULT"
      STATUS=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))")
      if [ "$STATUS" = "failed" ]; then exit 1; fi
  only:
    - main
    - merge_requests`;

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-6 text-sm">
        <Link href="/docs" className="text-white font-bold">← Docs</Link>
        <span className="text-gray-600">/</span>
        <span className="text-gray-400">CI Templates</span>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-green-400 text-xs font-medium uppercase tracking-wide mb-2">Templates</div>
        <h1 className="text-3xl font-bold text-white mb-3">CI Templates</h1>
        <p className="text-gray-400 mb-10">
          Copy these templates into your repository to run DocsCI on every push.
          Set up your API token and project ID in your CI secrets, then commit.
        </p>

        {/* Setup */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-8">
          <h2 className="text-white font-bold text-lg mb-3">Prerequisites</h2>
          <ol className="space-y-2 text-sm text-gray-400 list-decimal list-inside">
            <li>Create a project at <Link href="/dashboard/projects" className="text-indigo-400 underline">Dashboard → Projects</Link></li>
            <li>Copy your project ID from the project detail page</li>
            <li>Generate a DocsCI API token (Settings → API Tokens) — <span className="text-yellow-400">coming soon</span></li>
            <li>Add <code className="bg-gray-800 px-1 rounded text-green-300">DOCSCI_TOKEN</code> as a secret and <code className="bg-gray-800 px-1 rounded text-green-300">DOCSCI_PROJECT_ID</code> as a variable</li>
          </ol>
        </div>

        {/* GitHub Actions */}
        <section id="github-actions" className="mb-10" data-testid="template-github-actions">
          <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <span>🐙</span> GitHub Actions
          </h2>
          <p className="text-gray-400 text-sm mb-3">
            Add to <code className="bg-gray-800 px-1 rounded">.github/workflows/docsci.yml</code> in your repo:
          </p>
          <pre className="bg-gray-900 border border-gray-700 rounded-xl p-5 text-xs text-green-300 overflow-x-auto leading-relaxed">
            {GH_TEMPLATE}
          </pre>
          <a
            href={`data:text/yaml;charset=utf-8,${encodeURIComponent(GH_TEMPLATE)}`}
            download="docsci.yml"
            className="inline-block mt-3 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm rounded-lg transition-colors border border-gray-600"
            data-testid="download-github-template"
          >
            ⬇ Download docsci.yml
          </a>
        </section>

        {/* GitLab CI */}
        <section id="gitlab-ci" className="mb-10" data-testid="template-gitlab-ci">
          <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <span>🦊</span> GitLab CI
          </h2>
          <p className="text-gray-400 text-sm mb-3">
            Add to <code className="bg-gray-800 px-1 rounded">.gitlab-ci.yml</code> in your repo:
          </p>
          <pre className="bg-gray-900 border border-gray-700 rounded-xl p-5 text-xs text-green-300 overflow-x-auto leading-relaxed">
            {GL_TEMPLATE}
          </pre>
          <a
            href={`data:text/yaml;charset=utf-8,${encodeURIComponent(GL_TEMPLATE)}`}
            download=".gitlab-ci.yml"
            className="inline-block mt-3 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm rounded-lg transition-colors border border-gray-600"
            data-testid="download-gitlab-template"
          >
            ⬇ Download .gitlab-ci.yml
          </a>
        </section>

        {/* Schema validation note */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 text-sm text-gray-400">
          <p className="font-medium text-white mb-1">Template validation</p>
          <p>
            Templates are validated against the DocsCI run schema. The API accepts:
            <code className="bg-gray-800 px-1 rounded text-green-300 mx-1">mode</code>,
            <code className="bg-gray-800 px-1 rounded text-green-300 mx-1">repo_id</code>,
            <code className="bg-gray-800 px-1 rounded text-green-300 mx-1">branch</code>,
            <code className="bg-gray-800 px-1 rounded text-green-300 mx-1">commit_sha</code>.
            Response includes <code className="bg-gray-800 px-1 rounded text-green-300 mx-1">status</code> (<code>passed</code> | <code>failed</code>) and <code className="bg-gray-800 px-1 rounded text-green-300 mx-1">finding_count</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
