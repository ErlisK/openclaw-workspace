import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "GitLab CI for DocsCI — Copy-paste-ready .gitlab-ci.yml templates",
  description:
    "Copy-paste GitLab CI YAML to run DocsCI on every merge request. Includes basic, advanced with MR comments, and scheduled pipeline templates.",
  alternates: { canonical: "https://snippetci.com/docs/integrations/gitlab-ci" },
};

const BASIC_GITLAB = `# .gitlab-ci.yml
stages:
  - test

docsci:
  stage: test
  image: alpine:latest
  before_script:
    - apk add --no-cache curl jq tar
  script:
    - tar czf docs.tar.gz docs/ *.md 2>/dev/null || tar czf docs.tar.gz docs/
    - |
      RESULT=$(curl -sf -X POST https://snippetci.com/api/runs/queue \\
        -H "Authorization: Bearer $DOCSCI_TOKEN" \\
        -F "docs_archive=@docs.tar.gz" \\
        -F "branch=$CI_COMMIT_REF_NAME" \\
        -F "commit_sha=$CI_COMMIT_SHA")
      echo "$RESULT" | jq .
      echo "$RESULT" | jq -e '.status == "passed"'
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == "main"'`;

const ADVANCED_GITLAB = `# .gitlab-ci.yml (advanced with MR notes)
stages:
  - test

docsci:
  stage: test
  image: alpine:latest
  before_script:
    - apk add --no-cache curl jq tar
  script:
    - |
      tar czf docs.tar.gz docs/ 2>/dev/null || \\
      find . -name "*.md" -o -name "*.mdx" | tar czf docs.tar.gz -T -
    - |
      RESULT=$(curl -sf -X POST https://snippetci.com/api/runs/queue \\
        -H "Authorization: Bearer $DOCSCI_TOKEN" \\
        -F "docs_archive=@docs.tar.gz" \\
        -F "openapi_url=$OPENAPI_URL" \\
        -F "branch=$CI_COMMIT_REF_NAME" \\
        -F "commit_sha=$CI_COMMIT_SHA")
      echo "result=$RESULT" > docsci-result.env
      STATUS=$(echo "$RESULT" | jq -r '.status')
      FINDINGS=$(echo "$RESULT" | jq -r '.finding_count')
      RUN_ID=$(echo "$RESULT" | jq -r '.run_id')
      # Post MR note
      if [ -n "$CI_MERGE_REQUEST_IID" ]; then
        ICON=$([ "$STATUS" = "passed" ] && echo "✅" || echo "❌")
        NOTE="$ICON DocsCI: **$STATUS** — $FINDINGS finding(s). [View report](https://snippetci.com/runs/$RUN_ID)"
        curl -sf -X POST \\
          "https://gitlab.com/api/v4/projects/$CI_PROJECT_ID/merge_requests/$CI_MERGE_REQUEST_IID/notes" \\
          -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \\
          -d "body=$NOTE"
      fi
      echo "$RESULT" | jq -e '.status == "passed"'
  artifacts:
    reports:
      dotenv: docsci-result.env
    when: always
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'`;

const SCHEDULED_GITLAB = `# .gitlab-ci.yml (with scheduled nightly)
docsci-pr:
  stage: test
  image: alpine:latest
  before_script:
    - apk add --no-cache curl jq tar
  script:
    - tar czf docs.tar.gz docs/ *.md 2>/dev/null || tar czf docs.tar.gz docs/
    - |
      curl -sf -X POST https://snippetci.com/api/runs/queue \\
        -H "Authorization: Bearer $DOCSCI_TOKEN" \\
        -F "docs_archive=@docs.tar.gz" \\
      | jq -e '.status == "passed"'
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'

docsci-nightly:
  stage: test
  image: alpine:latest
  before_script:
    - apk add --no-cache curl jq tar
  script:
    - find . \\( -name "*.md" -o -name "*.mdx" \\) | tar czf docs.tar.gz -T -
    - |
      RESULT=$(curl -sf -X POST https://snippetci.com/api/runs/queue \\
        -H "Authorization: Bearer $DOCSCI_TOKEN" \\
        -F "docs_archive=@docs.tar.gz" \\
        -F "full_suite=true")
      echo "$RESULT" | jq .
      echo "$RESULT" | jq -e '.status == "passed"'
  rules:
    - if: '$CI_PIPELINE_SOURCE == "schedule"'`;

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

export default function GitLabCIPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100" data-testid="gitlab-ci-page">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-3 text-sm flex-wrap">
        <Link href="/docs" className="text-white font-bold">← Docs</Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-400">Integrations</span>
        <span className="text-gray-700">/</span>
        <span className="text-gray-300">GitLab CI</span>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold text-white mb-4" data-testid="page-h1">GitLab CI for DocsCI</h1>
        <p className="text-gray-400 text-lg mb-10">
          Copy-paste <code className="bg-gray-800 px-1 rounded">.gitlab-ci.yml</code> templates to run DocsCI
          on every merge request.
        </p>

        <section id="prerequisites" className="mb-10" data-testid="section-prerequisites">
          <h2 className="text-xl font-bold text-white mb-4">Prerequisites</h2>
          <ol className="space-y-2 text-sm text-gray-300">
            {[
              "Create a DocsCI account and project at snippetci.com/signup",
              "Generate a token from Settings → Tokens",
              "Add it as a CI/CD variable named DOCSCI_TOKEN (Settings → CI/CD → Variables, masked)",
              "Optional: add GITLAB_TOKEN if you want MR comment posting",
            ].map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-indigo-400 font-bold shrink-0">{i + 1}.</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-12" data-testid="section-basic">
          <h2 className="text-xl font-bold text-white mb-3">Basic workflow</h2>
          <p className="text-gray-400 text-sm mb-4">Runs on merge requests and main branch pushes.</p>
          <CodeBlock code={BASIC_GITLAB} filename=".gitlab-ci.yml" />
        </section>

        <section className="mb-12" data-testid="section-advanced">
          <h2 className="text-xl font-bold text-white mb-3">Advanced: MR comments + OpenAPI</h2>
          <p className="text-gray-400 text-sm mb-4">Posts a note on the merge request with the DocsCI result. Requires a GitLab personal access token with <code className="bg-gray-800 px-1 rounded">api</code> scope.</p>
          <CodeBlock code={ADVANCED_GITLAB} filename=".gitlab-ci.yml (advanced)" />
        </section>

        <section className="mb-12" data-testid="section-scheduled">
          <h2 className="text-xl font-bold text-white mb-3">Scheduled nightly run</h2>
          <p className="text-gray-400 text-sm mb-4">Add a pipeline schedule in GitLab (CI/CD → Schedules) to run nightly drift detection.</p>
          <CodeBlock code={SCHEDULED_GITLAB} filename=".gitlab-ci.yml (with schedule)" />
        </section>

        <div className="border-t border-gray-800 pt-8 mt-8 flex flex-wrap gap-3">
          <Link href="/docs/integrations/github-actions" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-700 transition-colors">
            GitHub Actions →
          </Link>
          <Link href="/docs/guides/migration" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-700 transition-colors">
            Migration guide →
          </Link>
        </div>
      </div>
    </div>
  );
}
