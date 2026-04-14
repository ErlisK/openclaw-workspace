/**
 * GET  /api/templates         — list all available templates with metadata
 * GET  /api/templates?id=<id> — download a single template file
 *
 * Templates served:
 *   github-actions      — .github/workflows/docsci.yml
 *   gitlab-ci           — .gitlab-ci.yml
 *   curl-fallback       — scripts/run-docsci.sh (curl-based shell script)
 *   docsci-yml          — docsci.yml example config
 *   pre-commit          — .pre-commit-config.yaml hook
 *
 * Schema: each template has id, name, filename, description, content_type, size
 */
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ── Template definitions ──────────────────────────────────────────────────────

const GITHUB_ACTIONS = `# .github/workflows/docsci.yml
# DocsCI — docs-specific CI pipeline
# https://snippetci.com/docs/templates
#
# Required GitHub secrets:
#   DOCSCI_TOKEN      — your DocsCI API token (Settings → API Tokens)
#
# Required GitHub variables:
#   DOCSCI_PROJECT_ID — your DocsCI project ID (Project Settings)
#
# Optional: set DOCSCI_CONFIG to override docsci.yml (inline YAML)

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
      - name: Checkout
        uses: actions/checkout@v4

      - name: Run DocsCI
        id: docsci
        run: |
          set -euo pipefail

          RESULT=$(curl -sf -X POST https://snippetci.com/api/runs/queue \\
            -H "Authorization: Bearer \${{ secrets.DOCSCI_TOKEN }}" \\
            -H "Content-Type: application/json" \\
            --max-time 120 \\
            -d '{
              "mode":       "repo",
              "repo_id":    "\${{ vars.DOCSCI_PROJECT_ID }}",
              "branch":     "\${{ github.ref_name }}",
              "commit_sha": "\${{ github.sha }}"
            }')

          echo "response: \$RESULT"

          STATUS=$(echo "\$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))")
          FINDINGS=$(echo "\$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('finding_count',0))")
          RUN_ID=$(echo "\$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('run_id',''))")
          SANDBOX=$(echo "\$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('sandbox_id',''))")

          echo "status=\$STATUS"     >> "\$GITHUB_OUTPUT"
          echo "findings=\$FINDINGS" >> "\$GITHUB_OUTPUT"
          echo "run_id=\$RUN_ID"     >> "\$GITHUB_OUTPUT"
          echo "sandbox_id=\$SANDBOX" >> "\$GITHUB_OUTPUT"

      - name: Annotate PR with findings count
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const findings = '\${{ steps.docsci.outputs.findings }}';
            const runId    = '\${{ steps.docsci.outputs.run_id }}';
            const status   = '\${{ steps.docsci.outputs.status }}';
            const emoji    = status === 'passed' ? '✅' : '❌';
            const url      = \`https://snippetci.com/runs\`;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: \`## \${emoji} DocsCI — \${status}\\n\\n**\${findings}** finding(s) found.\\n\\n[View run details](\${url})\`,
            });

      - name: Fail if docs have errors
        if: steps.docsci.outputs.status == 'failed'
        run: |
          echo "::error::DocsCI found \${{ steps.docsci.outputs.findings }} issue(s)."
          echo "::error::View details at https://snippetci.com/runs"
          exit 1
`;

const GITLAB_CI = `# .gitlab-ci.yml
# DocsCI — docs-specific CI pipeline for GitLab
# https://snippetci.com/docs/templates
#
# Required CI/CD variables (Settings → CI/CD → Variables):
#   DOCSCI_TOKEN      — your DocsCI API token
#   DOCSCI_PROJECT_ID — your DocsCI project ID

stages:
  - docs-ci

docsci:
  stage: docs-ci
  image: python:3.11-alpine
  before_script:
    - apk add --no-cache curl
  script:
    - |
      set -euo pipefail

      RESULT=$(curl -sf -X POST https://snippetci.com/api/runs/queue \\
        -H "Authorization: Bearer $DOCSCI_TOKEN" \\
        -H "Content-Type: application/json" \\
        --max-time 120 \\
        -d "{
          \\"mode\\":       \\"repo\\",
          \\"repo_id\\":    \\"$DOCSCI_PROJECT_ID\\",
          \\"branch\\":     \\"$CI_COMMIT_BRANCH\\",
          \\"commit_sha\\": \\"$CI_COMMIT_SHA\\"
        }")

      echo "response: $RESULT"

      STATUS=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))")
      FINDINGS=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('finding_count',0))")

      echo "DocsCI status: $STATUS, findings: $FINDINGS"

      if [ "$STATUS" = "failed" ]; then
        echo "ERROR: DocsCI found $FINDINGS issue(s). See https://snippetci.com/runs"
        exit 1
      fi
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
  allow_failure: false
`;

const CURL_FALLBACK = `#!/usr/bin/env bash
# run-docsci.sh — DocsCI curl-based fallback runner
# https://snippetci.com/docs/templates
#
# Usage:
#   export DOCSCI_TOKEN="your-api-token"
#   export DOCSCI_PROJECT_ID="your-project-id"
#   ./scripts/run-docsci.sh
#
# Exit codes:
#   0 — all checks passed
#   1 — findings detected or API error
#
# Environment variables:
#   DOCSCI_TOKEN       (required) — API token from snippetci.com/dashboard
#   DOCSCI_PROJECT_ID  (required) — project UUID from snippetci.com/dashboard
#   DOCSCI_BRANCH      (optional) — branch name (default: current git branch)
#   DOCSCI_COMMIT      (optional) — commit SHA (default: current HEAD)
#   DOCSCI_API_URL     (optional) — override API base URL
#   DOCSCI_TIMEOUT     (optional) — curl timeout in seconds (default: 120)
#   DOCSCI_FAIL_FAST   (optional) — set to "0" to exit 0 even on findings

set -euo pipefail

# ── Validate required env vars ────────────────────────────────────────────────
: "\${DOCSCI_TOKEN:?DOCSCI_TOKEN is required. Get yours at https://snippetci.com/dashboard}"
: "\${DOCSCI_PROJECT_ID:?DOCSCI_PROJECT_ID is required. Find it in Project Settings.}"

# ── Defaults ──────────────────────────────────────────────────────────────────
API_URL="\${DOCSCI_API_URL:-https://snippetci.com}"
BRANCH="\${DOCSCI_BRANCH:-\$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')}"
COMMIT="\${DOCSCI_COMMIT:-\$(git rev-parse HEAD 2>/dev/null || echo 'HEAD')}"
TIMEOUT="\${DOCSCI_TIMEOUT:-120}"
FAIL_FAST="\${DOCSCI_FAIL_FAST:-1}"

# ── Colors (if terminal supports it) ─────────────────────────────────────────
RED=""
GREEN=""
YELLOW=""
RESET=""
if [ -t 1 ] && command -v tput &>/dev/null; then
  RED=\$(tput setaf 1 2>/dev/null || echo "")
  GREEN=\$(tput setaf 2 2>/dev/null || echo "")
  YELLOW=\$(tput setaf 3 2>/dev/null || echo "")
  RESET=\$(tput sgr0 2>/dev/null || echo "")
fi

echo ""
echo "\${YELLOW}▶ DocsCI — running checks\${RESET}"
echo "  Project:  \$DOCSCI_PROJECT_ID"
echo "  Branch:   \$BRANCH"
echo "  Commit:   \${COMMIT:0:12}"
echo ""

# ── Call the API ──────────────────────────────────────────────────────────────
RESULT=\$(curl -sf \\
  -X POST "\${API_URL}/api/runs/queue" \\
  -H "Authorization: Bearer \$DOCSCI_TOKEN" \\
  -H "Content-Type: application/json" \\
  --max-time "\$TIMEOUT" \\
  -d "{
    \\"mode\\":       \\"repo\\",
    \\"repo_id\\":    \\"\$DOCSCI_PROJECT_ID\\",
    \\"branch\\":     \\"\$BRANCH\\",
    \\"commit_sha\\": \\"\$COMMIT\\"
  }" 2>&1) || {
  echo "\${RED}✗ DocsCI API request failed. Check DOCSCI_TOKEN and network access.\${RESET}"
  exit 1
}

# ── Parse result ──────────────────────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
  echo "\${YELLOW}⚠ python3 not found; install it to parse JSON results\${RESET}"
  echo "\$RESULT"
  exit 0
fi

STATUS=\$(echo "\$RESULT"   | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null || echo "unknown")
FINDINGS=\$(echo "\$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('finding_count',0))" 2>/dev/null || echo "0")
RUN_ID=\$(echo "\$RESULT"   | python3 -c "import sys,json; print(json.load(sys.stdin).get('run_id',''))"        2>/dev/null || echo "")
DURATION=\$(echo "\$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('duration_ms',0))"    2>/dev/null || echo "0")

# ── Print summary ─────────────────────────────────────────────────────────────
if [ "\$STATUS" = "passed" ]; then
  echo "\${GREEN}✓ DocsCI passed — \$FINDINGS finding(s) in \${DURATION}ms\${RESET}"
  echo "  Run ID: \$RUN_ID"
  echo "  View:   \${API_URL}/runs"
  echo ""
  exit 0
else
  echo "\${RED}✗ DocsCI \$STATUS — \$FINDINGS finding(s) in \${DURATION}ms\${RESET}"
  echo "  Run ID: \$RUN_ID"
  echo "  View:   \${API_URL}/runs"
  echo ""
  if [ "\$FAIL_FAST" = "1" ]; then
    exit 1
  fi
  exit 0
fi
`;

const DOCSCI_YML_EXAMPLE = `# docsci.yml — DocsCI configuration file
# https://snippetci.com/docs/getting-started
#
# Place this file in your repository root.
# All fields are optional — defaults shown below.

version: 1

docs:
  path: docs                   # folder with your Markdown files
  include:                     # glob patterns to include
    - "docs/**/*.md"
    - "docs/**/*.mdx"
  exclude:                     # glob patterns to exclude
    - "docs/internal/**"
    - "**/CHANGELOG.md"
    - "**/node_modules/**"

openapi:
  path: openapi.yaml           # path in repo (optional)
  # url: https://api.example.com/openapi.json  # remote URL (takes precedence)

runtimes:
  python: "3.11"
  node: "20"

snippets:
  timeout_seconds: 20          # per-snippet timeout (max: 60s)
  languages:                   # languages to execute
    - python
    - javascript
    - typescript
  skip_patterns:               # skip snippets containing these strings
    - "# docsci: skip"
    - "// docsci: skip"
    - "TODO:"

security:
  network_isolated: false      # true = block ALL outbound from sandbox
  allowlist:                   # allowed domains for sandbox network calls
    - api.example.com
    - "*.stripe.com"

checks:
  accessibility: true          # WCAG 2.1 a11y checks
  copy_lint: true              # passive voice, FK grade, weasel words
  drift_detection: true        # API drift vs OpenAPI spec
  snippets: true               # execute code examples
`;

const PRE_COMMIT_HOOK = `# .pre-commit-config.yaml
# DocsCI pre-commit hook (local check before push)
# https://snippetci.com/docs/templates
#
# Requires: pre-commit (pip install pre-commit)
# Install:  pre-commit install
#
# This hook validates your docsci.yml config syntax before commit.
# For full CI runs, use the GitHub Actions or GitLab CI template.

repos:
  - repo: local
    hooks:
      - id: docsci-config-validate
        name: Validate docsci.yml
        language: script
        entry: bash -c '
          if [ -f docsci.yml ]; then
            RESULT=$(curl -sf -X POST https://snippetci.com/api/docsci-config \\
              -H "Content-Type: application/json" \\
              --max-time 10 \\
              -d "{\\"config\\":\\"$(cat docsci.yml | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")\\"}") || {
              echo "Warning: Could not validate docsci.yml (network unavailable)";
              exit 0;
            };
            VALID=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('"'"'valid'"'"',True))");
            if [ "$VALID" = "False" ]; then
              echo "docsci.yml validation failed:";
              echo "$RESULT" | python3 -c "import sys,json; [print(e) for e in json.load(sys.stdin).get('"'"'errors'"'"',[])]";
              exit 1;
            fi;
            echo "docsci.yml valid ✓";
          fi'
        pass_filenames: false
        files: docsci\\.yml
`;


const GH_ACTIONS_SARIF = `# .github/workflows/docsci-sarif.yml
# DocsCI with GitHub Code Scanning (SARIF upload)
# Findings appear as annotations in the GitHub Security tab + PR diff.
#
# Required secrets:   DOCSCI_TOKEN
# Required variables: DOCSCI_PROJECT_ID
#
# Permissions needed: security-events: write

name: DocsCI + Code Scanning

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]
  schedule:
    - cron: '0 0 * * 1'

permissions:
  security-events: write
  contents: read

jobs:
  docs-ci:
    name: DocsCI with SARIF
    runs-on: ubuntu-latest
    timeout-minutes: 10
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
            -d '{"mode":"repo","repo_id":"\${{ vars.DOCSCI_PROJECT_ID }}","branch":"\${{ github.ref_name }}","commit_sha":"\${{ github.sha }}"}'
          )
          RUN_ID=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('run_id',''))")
          STATUS=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))")
          FINDINGS=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('finding_count',0))")
          echo "run_id=$RUN_ID"    >> "$GITHUB_OUTPUT"
          echo "status=$STATUS"   >> "$GITHUB_OUTPUT"
          echo "findings=$FINDINGS" >> "$GITHUB_OUTPUT"

      - name: Download SARIF report
        if: steps.docsci.outputs.run_id != ''
        run: |
          curl -sf "https://snippetci.com/api/runs/\${{ steps.docsci.outputs.run_id }}/sarif?resolved=false" \\
            -o docsci-results.sarif
          echo "SARIF: $(wc -c < docsci-results.sarif) bytes, $(python3 -c "import json; d=json.load(open('docsci-results.sarif')); print(len(d['runs'][0]['results']))" 2>/dev/null || echo '?') findings"

      - name: Upload SARIF to GitHub Security tab
        uses: github/codeql-action/upload-sarif@v3
        if: always() && steps.docsci.outputs.run_id != ''
        with:
          sarif_file: docsci-results.sarif
          category: docsci

      - name: Fail if docs have errors
        if: steps.docsci.outputs.status == 'failed'
        run: |
          echo "::error::DocsCI found \${{ steps.docsci.outputs.findings }} issue(s). See Security tab for annotations."
          exit 1
`;

// ── Template registry ─────────────────────────────────────────────────────────

const TEMPLATES: Record<string, {
  id: string;
  name: string;
  filename: string;
  download_name: string;
  description: string;
  content_type: string;
  content: string;
  category: "ci" | "config" | "hook";
}> = {
  "github-actions-sarif": {
    id: "github-actions-sarif",
    name: "GitHub Actions + SARIF (Code Scanning)",
    filename: "docsci-sarif.yml",
    download_name: "docsci-sarif.yml",
    description: "GitHub Actions with SARIF upload — findings appear in GitHub Security tab + PR annotations",
    content_type: "text/yaml",
    content: GH_ACTIONS_SARIF,
    category: "ci",
  },

  "github-actions": {
    id: "github-actions",
    name: "GitHub Actions",
    filename: "docsci.yml",
    download_name: "docsci.yml",
    description: "Full GitHub Actions workflow with PR annotation, status outputs, and error comment",
    content_type: "text/yaml",
    content: GITHUB_ACTIONS,
    category: "ci",
  },
  "gitlab-ci": {
    id: "gitlab-ci",
    name: "GitLab CI",
    filename: ".gitlab-ci.yml",
    download_name: ".gitlab-ci.yml",
    description: "GitLab CI job with merge request support and fail-fast behavior",
    content_type: "text/yaml",
    content: GITLAB_CI,
    category: "ci",
  },
  "curl-fallback": {
    id: "curl-fallback",
    name: "curl fallback script",
    filename: "run-docsci.sh",
    download_name: "run-docsci.sh",
    description: "Shell script using curl — works in any CI system or local machine",
    content_type: "text/x-shellscript",
    content: CURL_FALLBACK,
    category: "ci",
  },
  "docsci-yml": {
    id: "docsci-yml",
    name: "docsci.yml config",
    filename: "docsci.yml",
    download_name: "docsci.yml",
    description: "Example docsci.yml with all options documented",
    content_type: "text/yaml",
    content: DOCSCI_YML_EXAMPLE,
    category: "config",
  },
  "pre-commit": {
    id: "pre-commit",
    name: "pre-commit hook",
    filename: ".pre-commit-config.yaml",
    download_name: ".pre-commit-config.yaml",
    description: "Validates docsci.yml before commit using pre-commit framework",
    content_type: "text/yaml",
    content: PRE_COMMIT_HOOK,
    category: "hook",
  },
};

// ── Route handlers ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const download = req.nextUrl.searchParams.get("download") === "1";

  // Single template download
  if (id) {
    const tpl = TEMPLATES[id];
    if (!tpl) {
      return NextResponse.json({ error: `Unknown template id: ${id}` }, { status: 404 });
    }
    const headers: Record<string, string> = {
      "Content-Type": tpl.content_type + "; charset=utf-8",
    };
    if (download) {
      headers["Content-Disposition"] = `attachment; filename="${tpl.download_name}"`;
    }
    return new NextResponse(tpl.content, { headers });
  }

  // List all templates
  const list = Object.values(TEMPLATES).map(({ id, name, filename, download_name, description, content_type, category, content }) => ({
    id,
    name,
    filename,
    download_name,
    description,
    content_type,
    category,
    size_bytes: Buffer.byteLength(content, "utf8"),
    download_url: `/api/templates?id=${id}&download=1`,
    preview_url: `/api/templates?id=${id}`,
  }));

  return NextResponse.json({
    templates: list,
    total: list.length,
    categories: {
      ci: list.filter(t => t.category === "ci").map(t => t.id),
      config: list.filter(t => t.category === "config").map(t => t.id),
      hook: list.filter(t => t.category === "hook").map(t => t.id),
    },
  });
}
