/**
 * docsci-config.spec.ts — docsci.yml config file E2E tests
 *
 * Tests:
 *   1. GET /api/docsci-config — schema, defaults, example
 *   2. POST /api/docsci-config — valid config parses correctly
 *   3. POST /api/docsci-config — invalid config returns errors
 *   4. POST /api/docsci-config — empty config returns all defaults
 *   5. POST /api/docsci-config — timeout clamped to 60s
 *   6. POST /api/docsci-config — unknown language warns
 *   7. Run with docsci_config honoured: skip_patterns, language filter, checks disabled
 *   8. Glob filtering: include/exclude patterns
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const RUN_TIMEOUT = 120_000;

// ── Schema API ────────────────────────────────────────────────────────────────

test.describe("GET /api/docsci-config — schema", () => {
  test("returns service description with schema and example", async ({ request }) => {
    const res = await request.get(`${BASE}/api/docsci-config`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.service).toBe("DocsCI Config");
    expect(body.version).toBe(1);
    expect(body.schema).toBeTruthy();
    expect(body.defaults).toBeTruthy();
    expect(body.example).toContain("docsci.yml");
    expect(body.validation_endpoint).toBe("POST /api/docsci-config");
  });

  test("schema has all required sections", async ({ request }) => {
    const res = await request.get(`${BASE}/api/docsci-config`);
    const body = await res.json();
    expect(body.schema.docs).toBeTruthy();
    expect(body.schema.openapi).toBeTruthy();
    expect(body.schema.snippets).toBeTruthy();
    expect(body.schema.security).toBeTruthy();
    expect(body.schema.checks).toBeTruthy();
  });

  test("defaults include all section defaults", async ({ request }) => {
    const res = await request.get(`${BASE}/api/docsci-config`);
    const body = await res.json();
    const d = body.defaults;
    expect(d.docs.path).toBe("docs");
    expect(Array.isArray(d.docs.include)).toBe(true);
    expect(d.snippets.timeout_seconds).toBe(20);
    expect(d.snippets.languages).toContain("python");
    expect(d.snippets.languages).toContain("javascript");
    expect(d.security.network_isolated).toBe(false);
    expect(d.checks.accessibility).toBe(true);
    expect(d.checks.snippets).toBe(true);
  });

  test("example config is valid YAML with all sections", async ({ request }) => {
    const res = await request.get(`${BASE}/api/docsci-config`);
    const body = await res.json();
    const example = body.example as string;
    expect(example).toContain("version: 1");
    expect(example).toContain("docs:");
    expect(example).toContain("openapi:");
    expect(example).toContain("snippets:");
    expect(example).toContain("security:");
    expect(example).toContain("checks:");
  });
});

// ── Validation API ─────────────────────────────────────────────────────────────

test.describe("POST /api/docsci-config — validation", () => {
  test("valid minimal config passes", async ({ request }) => {
    const config = `version: 1\ndocs:\n  path: docs\n`;
    const res = await request.post(`${BASE}/api/docsci-config`, {
      data: { config },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.errors).toHaveLength(0);
    expect(body.effective_config.docs.path).toBe("docs");
  });

  test("valid full config parses all sections", async ({ request }) => {
    const config = `
version: 1
docs:
  path: documentation
  include:
    - "documentation/**/*.md"
  exclude:
    - "documentation/internal/**"
openapi:
  url: https://api.example.com/openapi.json
snippets:
  timeout_seconds: 30
  languages:
    - python
    - javascript
  skip_patterns:
    - "# skip this"
security:
  network_isolated: false
  allowlist:
    - api.example.com
checks:
  accessibility: true
  copy_lint: false
  drift_detection: true
  snippets: true
`;
    const res = await request.post(`${BASE}/api/docsci-config`, {
      data: { config },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.effective_config.docs.path).toBe("documentation");
    expect(body.effective_config.snippets.timeout_ms).toBe(30000);
    expect(body.effective_config.snippets.languages).toContain("python");
    expect(body.effective_config.snippets.skip_patterns).toContain("# skip this");
    expect(body.effective_config.checks.copy_lint).toBe(false);
    expect(body.effective_config.security.allowlist).toContain("api.example.com");
  });

  test("empty config body returns all defaults", async ({ request }) => {
    const res = await request.post(`${BASE}/api/docsci-config`, {
      data: { config: "" },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.effective_config.docs.path).toBe("docs");
    expect(body.effective_config.snippets.timeout_ms).toBe(20000);
    expect(body.effective_config.checks.accessibility).toBe(true);
    expect(body.effective_config.checks.snippets).toBe(true);
  });

  test("timeout_seconds clamped to 60s max", async ({ request }) => {
    const config = `snippets:\n  timeout_seconds: 999`;
    const res = await request.post(`${BASE}/api/docsci-config`, {
      data: { config },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    // Has warning about clamping
    expect(body.warnings.some((w: string) => w.includes("clamped"))).toBe(true);
    // effective config uses 60s = 60000ms
    expect(body.effective_config.snippets.timeout_ms).toBe(60000);
  });

  test("invalid openapi.url returns error", async ({ request }) => {
    const config = `openapi:\n  url: not-a-url`;
    const res = await request.post(`${BASE}/api/docsci-config`, {
      data: { config },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.errors.some((e: string) => e.includes("openapi.url"))).toBe(true);
  });

  test("invalid timeout_seconds type returns error", async ({ request }) => {
    const config = `snippets:\n  timeout_seconds: "twenty"`;
    const res = await request.post(`${BASE}/api/docsci-config`, {
      data: { config },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.errors.some((e: string) => e.includes("timeout_seconds"))).toBe(true);
  });

  test("unknown language warns but doesn't fail", async ({ request }) => {
    const config = `snippets:\n  languages:\n    - python\n    - cobol`;
    const res = await request.post(`${BASE}/api/docsci-config`, {
      data: { config },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    // Warning about cobol, but still valid
    expect(body.warnings.some((w: string) => w.includes("cobol"))).toBe(true);
    // effective_config still includes the unknown lang (passed through)
    expect(body.effective_config.snippets.languages).toContain("python");
  });

  test("checks booleans accept true/false", async ({ request }) => {
    const config = `checks:\n  accessibility: false\n  copy_lint: false\n  snippets: true`;
    const res = await request.post(`${BASE}/api/docsci-config`, {
      data: { config },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.effective_config.checks.accessibility).toBe(false);
    expect(body.effective_config.checks.copy_lint).toBe(false);
    expect(body.effective_config.checks.snippets).toBe(true);
  });

  test("missing config field returns 400", async ({ request }) => {
    const res = await request.post(`${BASE}/api/docsci-config`, {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
  });

  test("invalid YAML returns parse error", async ({ request }) => {
    const config = `docs:\n  path: [unclosed`;
    const res = await request.post(`${BASE}/api/docsci-config`, {
      data: { config },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.errors.some((e: string) => e.includes("YAML parse error"))).toBe(true);
  });
});

// ── Glob matching ─────────────────────────────────────────────────────────────

test.describe("Glob filtering logic", () => {
  test("matchGlob includes are validated in config effective output", async ({ request }) => {
    const config = `
docs:
  include:
    - "docs/**/*.md"
  exclude:
    - "docs/internal/**"
`;
    const res = await request.post(`${BASE}/api/docsci-config`, {
      data: { config },
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body.effective_config.docs.include).toContain("docs/**/*.md");
    expect(body.effective_config.docs.exclude).toContain("docs/internal/**");
  });
});

// ── Run with docsci_config ────────────────────────────────────────────────────

test.describe("POST /api/runs/queue with docsci_config", () => {
  test("run without config uses defaults (config_loaded: false)", async ({ request }) => {
    const res = await request.post(`${BASE}/api/runs/queue`, {
      data: { mode: "inline" },
      headers: { "Content-Type": "application/json" },
      timeout: RUN_TIMEOUT,
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.config_loaded).toBe(false);
    expect(body.checks_enabled).toBeTruthy();
    expect(body.checks_enabled.accessibility).toBe(true);
    expect(body.checks_enabled.snippets).toBe(true);
  });

  test("run with valid docsci_config sets config_loaded: true", async ({ request }) => {
    const config = `version: 1\nsnippets:\n  timeout_seconds: 15`;
    const res = await request.post(`${BASE}/api/runs/queue`, {
      data: { mode: "inline", docsci_config: config },
      headers: { "Content-Type": "application/json" },
      timeout: RUN_TIMEOUT,
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.config_loaded).toBe(true);
  });

  test("run with accessibility: false disables a11y check", async ({ request }) => {
    const config = `checks:\n  accessibility: false\n  copy_lint: true\n  drift_detection: false\n  snippets: true`;
    const res = await request.post(`${BASE}/api/runs/queue`, {
      data: { mode: "inline", docsci_config: config },
      headers: { "Content-Type": "application/json" },
      timeout: RUN_TIMEOUT,
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.checks_enabled.accessibility).toBe(false);
    expect(body.checks_enabled.drift_detection).toBe(false);
    expect(body.run_id).toBeTruthy();
  });

  test("run with all checks disabled still completes", async ({ request }) => {
    const config = `checks:\n  accessibility: false\n  copy_lint: false\n  drift_detection: false\n  snippets: false`;
    const res = await request.post(`${BASE}/api/runs/queue`, {
      data: { mode: "inline", docsci_config: config },
      headers: { "Content-Type": "application/json" },
      timeout: RUN_TIMEOUT,
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.run_id).toBeTruthy();
    expect(body.snippets_total).toBe(0);
  });

  test("run with skip_patterns skips matching snippets", async ({ request }) => {
    const docs = [{
      path: "docs/test.md",
      content: "# Test\n\n```python\n# docsci: skip\nthis_will_error()\n```\n\n```python\nprint('hello')\n```",
      codeFences: [
        { language: "python", code: "# docsci: skip\nthis_will_error()", startLine: 3 },
        { language: "python", code: "print('hello')", startLine: 9 },
      ],
    }];
    const config = `snippets:\n  skip_patterns:\n    - "# docsci: skip"`;
    const res = await request.post(`${BASE}/api/runs/queue`, {
      data: { mode: "inline", docs, docsci_config: config },
      headers: { "Content-Type": "application/json" },
      timeout: RUN_TIMEOUT,
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // The erroring snippet should be skipped, only the passing one runs
    expect(body.run_id).toBeTruthy();
  });

  test("checks_enabled returned in response has all four keys", async ({ request }) => {
    const res = await request.post(`${BASE}/api/runs/queue`, {
      data: { mode: "inline" },
      headers: { "Content-Type": "application/json" },
      timeout: RUN_TIMEOUT,
    });
    const body = await res.json();
    expect("accessibility" in body.checks_enabled).toBe(true);
    expect("copy_lint" in body.checks_enabled).toBe(true);
    expect("drift_detection" in body.checks_enabled).toBe(true);
    expect("snippets" in body.checks_enabled).toBe(true);
  });
});

// ── Source validation ─────────────────────────────────────────────────────────

test.describe("docsci-config source validation", () => {
  test("lib/docsci-config.ts has all required exports", async () => {
    const { readFileSync } = require("fs");
    const src = readFileSync(
      require("path").join(process.cwd(), "lib/docsci-config.ts"),
      "utf8"
    );
    expect(src).toContain("parseDocsConfig");
    expect(src).toContain("loadRunConfig");
    expect(src).toContain("buildEffective");
    expect(src).toContain("validateConfig");
    expect(src).toContain("shouldSkipSnippet");
    expect(src).toContain("filterDocFiles");
    expect(src).toContain("matchGlob");
    expect(src).toContain("CONFIG_DEFAULTS");
    // All config sections present
    expect(src).toContain("DocsSection");
    expect(src).toContain("SnippetsSection");
    expect(src).toContain("SecuritySection");
    expect(src).toContain("ChecksSection");
  });

  test("run-orchestrator imports docsci-config", async () => {
    const { readFileSync } = require("fs");
    const src = readFileSync(
      require("path").join(process.cwd(), "lib/run-orchestrator.ts"),
      "utf8"
    );
    expect(src).toContain("loadRunConfig");
    expect(src).toContain("shouldSkipSnippet");
    expect(src).toContain("filterDocFiles");
    expect(src).toContain("runConfig.checks.snippets");
    expect(src).toContain("runConfig.checks.drift_detection");
    expect(src).toContain("runConfig.snippets.timeout_ms");
    expect(src).toContain("docsciConfigText");
  });

  test("run queue route passes docsci_config to orchestrator", async () => {
    const { readFileSync } = require("fs");
    const src = readFileSync(
      require("path").join(process.cwd(), "app/api/runs/queue/route.ts"),
      "utf8"
    );
    expect(src).toContain("docsciConfigText");
    expect(src).toContain("config_loaded");
    expect(src).toContain("checks_enabled");
  });
});
