/**
 * GET  /api/docsci-config        — return schema, defaults, and example docsci.yml
 * POST /api/docsci-config        — validate a docsci.yml payload
 *
 * POST body:
 *   { "config": "<yaml string>" }
 *
 * POST response:
 *   { valid, errors, warnings, effective_config }
 */
import { NextRequest, NextResponse } from "next/server";
import { parseDocsConfig, CONFIG_DEFAULTS } from "@/lib/docsci-config";

export const dynamic = "force-dynamic";

const EXAMPLE_CONFIG = `# docsci.yml — place in your repository root
version: 1

docs:
  path: docs
  include:
    - "docs/**/*.md"
    - "guides/**/*.md"
  exclude:
    - "docs/internal/**"
    - "**\/CHANGELOG.md"

openapi:
  path: openapi.yaml
  # url: https://api.example.com/openapi.json  # takes precedence over path

runtimes:
  python: "3.11"
  node: "20"

snippets:
  timeout_seconds: 20
  languages:
    - python
    - javascript
    - typescript
  skip_patterns:
    - "# docsci: skip"
    - "// docsci: skip"

security:
  network_isolated: false
  allowlist:
    - api.example.com
    - "*.stripe.com"

checks:
  accessibility: true
  copy_lint: true
  drift_detection: true
  snippets: true
`;

export async function GET() {
  return NextResponse.json({
    service: "DocsCI Config",
    version: 1,
    description: "Place docsci.yml in your repository root to configure the CI pipeline",
    schema: {
      version: "integer (optional, default: 1)",
      docs: {
        path: "string — folder containing Markdown docs (default: 'docs')",
        include: "string[] — glob patterns to include (default: ['**/*.md', '**/*.mdx'])",
        exclude: "string[] — glob patterns to exclude (default: [])",
      },
      openapi: {
        path: "string — path to OpenAPI spec in repo (e.g. 'openapi.yaml')",
        url: "string — URL of remote OpenAPI spec (takes precedence over path)",
      },
      runtimes: {
        python: "string — Python version hint (default: '3.11')",
        node: "string — Node.js version hint (default: '20')",
      },
      snippets: {
        timeout_seconds: `number — per-snippet execution timeout in seconds (default: 20, max: 60)`,
        languages: "string[] — languages to execute (default: ['python', 'javascript', 'typescript'])",
        skip_patterns: "string[] — skip snippets containing these strings (default: ['# docsci: skip', '// docsci: skip'])",
      },
      security: {
        network_isolated: "boolean — block all outbound network from sandbox (default: false)",
        allowlist: "string[] — allowed domains for sandbox outbound requests (default: [])",
      },
      checks: {
        accessibility: "boolean — run accessibility checks (default: true)",
        copy_lint: "boolean — run copy linting (default: true)",
        drift_detection: "boolean — run API drift detection (default: true)",
        snippets: "boolean — run snippet execution (default: true)",
      },
    },
    defaults: CONFIG_DEFAULTS,
    example: EXAMPLE_CONFIG,
    validation_endpoint: "POST /api/docsci-config",
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const configText = body.config as string | undefined;

  if (configText === null || configText === undefined || typeof configText !== "string") {
    return NextResponse.json(
      { error: "Body must contain a 'config' field with the YAML string content" },
      { status: 400 }
    );
  }

  const result = parseDocsConfig(configText);

  return NextResponse.json({
    valid: result.valid,
    errors: result.errors,
    warnings: result.warnings,
    effective_config: result.config,
  });
}
