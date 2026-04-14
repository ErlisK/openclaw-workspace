/**
 * security.spec.ts — Secret redaction, sandbox caps, /security page, sandbox-security API
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";

// ── /security page ────────────────────────────────────────────────────────────

test.describe("/security — security overview page", () => {
  test("page loads with heading", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    await expect(page.locator("h1")).toBeVisible();
    const h1 = await page.locator("h1").textContent();
    expect(h1?.toLowerCase()).toContain("safe");
  });

  test("sandbox isolation section", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    await expect(page.locator("[data-testid='security-sandbox']")).toBeVisible();
    const content = await page.content();
    expect(content).toContain("isolated-vm");
    expect(content).toContain("Pyodide");
  });

  test("secret scan note is visible", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    await expect(page.locator("[data-testid='secret-scan-note']")).toBeVisible();
    await expect(page.getByText("Pre-execution secret scan")).toBeVisible();
  });

  test("runtime caps section with values", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    await expect(page.locator("[data-testid='security-caps']")).toBeVisible();
    const content = await page.content();
    expect(content).toContain("64 MB");
    expect(content).toContain("20 s");
    expect(content).toContain("500");
  });

  test("secret redaction section lists patterns", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    await expect(page.locator("[data-testid='security-redaction']")).toBeVisible();
    const content = await page.content();
    expect(content).toContain("REDACTED_STRIPE_KEY");
    expect(content).toContain("REDACTED_JWT");
    expect(content).toContain("[REDACTED]");
  });

  test("network policy section", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    await expect(page.locator("[data-testid='security-network']")).toBeVisible();
    const content = await page.content();
    expect(content).toContain("network_isolated");
    expect(content).toContain("HTTPS-only");
  });

  test("RBAC table present", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    await expect(page.locator("[data-testid='security-rbac']")).toBeVisible();
    const content = await page.content();
    expect(content).toContain("Trigger CI runs");
    expect(content).toContain("Owner");
  });

  test("disclosure section with contact email", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    await expect(page.locator("[data-testid='security-disclosure']")).toBeVisible();
    await expect(page.getByText("hello@snippetci.com")).toBeVisible();
  });

  test("enterprise contact CTA", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    await expect(page.locator("[data-testid='security-contact-cta']")).toBeVisible();
  });

  test("nav links to home and docs", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    await expect(page.locator("a[href='/']")).toBeVisible();
  });
});

// ── /api/sandbox-security — caps endpoint ────────────────────────────────────

test.describe("GET /api/sandbox-security?action=caps", () => {
  test("returns caps object with defaults", async ({ request }) => {
    const res = await request.get(`${BASE}/api/sandbox-security?action=caps`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.caps).toBeTruthy();
    expect(typeof body.caps.memory_limit_mb).toBe("number");
    expect(typeof body.caps.timeout_seconds).toBe("number");
    expect(typeof body.caps.max_snippets_per_run).toBe("number");
  });

  test("default memory cap is 64 MB", async ({ request }) => {
    const res = await request.get(`${BASE}/api/sandbox-security?action=caps`);
    const body = await res.json();
    expect(body.caps.memory_limit_mb).toBe(64);
  });

  test("default timeout is 20 s", async ({ request }) => {
    const res = await request.get(`${BASE}/api/sandbox-security?action=caps`);
    const body = await res.json();
    expect(body.caps.timeout_seconds).toBe(20);
  });

  test("caps respects custom memory_limit_mb param", async ({ request }) => {
    const res = await request.get(`${BASE}/api/sandbox-security?action=caps&memory_limit_mb=128`);
    const body = await res.json();
    expect(body.caps.memory_limit_mb).toBe(128);
  });

  test("caps clamps memory to 256 MB max", async ({ request }) => {
    const res = await request.get(`${BASE}/api/sandbox-security?action=caps&memory_limit_mb=9999`);
    const body = await res.json();
    expect(body.caps.memory_limit_mb).toBeLessThanOrEqual(256);
  });

  test("caps clamps memory to 32 MB min", async ({ request }) => {
    const res = await request.get(`${BASE}/api/sandbox-security?action=caps&memory_limit_mb=1`);
    const body = await res.json();
    expect(body.caps.memory_limit_mb).toBeGreaterThanOrEqual(32);
  });

  test("caps has secret_scan and redaction rule counts", async ({ request }) => {
    const res = await request.get(`${BASE}/api/sandbox-security?action=caps`);
    const body = await res.json();
    expect(body.caps.secret_scan_rules_count).toBeGreaterThan(5);
    expect(body.caps.redaction_rules_count).toBeGreaterThan(10);
  });

  test("caps includes max limits", async ({ request }) => {
    const res = await request.get(`${BASE}/api/sandbox-security?action=caps`);
    const body = await res.json();
    expect(body.caps.max_timeout_seconds).toBe(60);
    expect(body.caps.max_memory_limit_mb).toBe(256);
    expect(body.caps.max_snippets_per_run).toBe(500);
    expect(body.caps.max_docs_per_run).toBe(1000);
  });

  test("network_isolated flag is honored", async ({ request }) => {
    const res = await request.get(`${BASE}/api/sandbox-security?action=caps&network_isolated=true`);
    const body = await res.json();
    expect(body.caps.network_isolated).toBe(true);
  });
});

// ── /api/sandbox-security — redaction endpoint ───────────────────────────────

test.describe("POST /api/sandbox-security — redact_logs", () => {
  test("redacts JWT tokens", async ({ request }) => {
    const res = await request.post(`${BASE}/api/sandbox-security`, {
      data: {
        action: "redact_logs",
        text: "Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U",
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.redacted).toContain("[REDACTED_JWT]");
    expect(body.redacted).not.toContain("eyJhbGciOiJIUzI1Ni");
  });

  test("redacts Stripe secret keys", async ({ request }) => {
    const res = await request.post(`${BASE}/api/sandbox-security`, {
      data: {
        action: "redact_logs",
        text: "stripe_key = sk_live_abcdef123456789012345678901234",
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.redacted).toContain("[REDACTED_STRIPE_KEY]");
    expect(body.redacted).not.toContain("sk_live_");
  });

  test("redacts AWS access keys", async ({ request }) => {
    const res = await request.post(`${BASE}/api/sandbox-security`, {
      data: {
        action: "redact_logs",
        text: "AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE",
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.redacted).toContain("[REDACTED");
  });

  test("redacts GitHub tokens", async ({ request }) => {
    const res = await request.post(`${BASE}/api/sandbox-security`, {
      data: {
        action: "redact_logs",
        text: "token = ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890",
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.redacted).toContain("[REDACTED_GITHUB_TOKEN]");
  });

  test("redacts Bearer tokens", async ({ request }) => {
    const res = await request.post(`${BASE}/api/sandbox-security`, {
      data: {
        action: "redact_logs",
        text: "Authorization: Bearer eysome-very-long-token-value-here-1234567890",
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.redacted).toContain("Bearer [REDACTED]");
  });

  test("redacts postgres connection strings", async ({ request }) => {
    const res = await request.post(`${BASE}/api/sandbox-security`, {
      data: {
        action: "redact_logs",
        text: "db = postgresql://user:S3cr3tPa55word@db.example.com:5432/production",
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.redacted).toContain("[REDACTED]");
    expect(body.redacted).not.toContain("S3cr3tPa55word");
  });

  test("returns redaction count and rules triggered", async ({ request }) => {
    const res = await request.post(`${BASE}/api/sandbox-security`, {
      data: {
        action: "redact_logs",
        text: "sk_live_abcdef123456789012345678901234 and eyJhbGciOiJIUzI1NiJ9.test.signature",
      },
    });
    const body = await res.json();
    expect(typeof body.redacted_count).toBe("number");
    expect(body.redacted_count).toBeGreaterThan(0);
    expect(Array.isArray(body.rules_triggered)).toBe(true);
  });

  test("preserves non-secret text", async ({ request }) => {
    const res = await request.post(`${BASE}/api/sandbox-security`, {
      data: {
        action: "redact_logs",
        text: "Hello world, this is normal output",
      },
    });
    const body = await res.json();
    expect(body.redacted).toBe("Hello world, this is normal output");
    expect(body.redacted_count).toBe(0);
  });
});

// ── /api/sandbox-security — scan_code ────────────────────────────────────────

test.describe("POST /api/sandbox-security — scan_code", () => {
  test("detects Stripe key in code", async ({ request }) => {
    const res = await request.post(`${BASE}/api/sandbox-security`, {
      data: {
        action: "scan_code",
        code: "const stripe = require('stripe')('sk_live_abcdef123456789012345678901234');",
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.has_secrets).toBe(true);
    expect(Array.isArray(body.findings)).toBe(true);
    expect(body.findings.length).toBeGreaterThan(0);
  });

  test("clean code returns no findings", async ({ request }) => {
    const res = await request.post(`${BASE}/api/sandbox-security`, {
      data: {
        action: "scan_code",
        code: "const x = 1 + 1;\nconsole.log(x);",
      },
    });
    const body = await res.json();
    expect(body.has_secrets).toBe(false);
    expect(body.findings).toHaveLength(0);
  });
});

// ── Source code validation ────────────────────────────────────────────────────

test.describe("Security source code validation", () => {
  const fs = require("fs");
  const path = require("path");
  const base = process.cwd();

  test("/security page exists", () => {
    expect(fs.existsSync(path.join(base, "app/security/page.tsx"))).toBe(true);
  });

  test("sandbox-security.ts exports getSandboxCaps", () => {
    const content = fs.readFileSync(path.join(base, "lib/sandbox-security.ts"), "utf8");
    expect(content).toContain("export function getSandboxCaps");
    expect(content).toContain("memory_limit_mb");
    expect(content).toContain("cpu_limit_seconds");
    expect(content).toContain("redaction_rules_count");
  });

  test("sandbox-security.ts has 15+ redaction rules", () => {
    const content = fs.readFileSync(path.join(base, "lib/sandbox-security.ts"), "utf8");
    const ruleCount = (content.match(/name: "/g) || []).length;
    expect(ruleCount).toBeGreaterThanOrEqual(15);
  });

  test("sandbox-security.ts has new redaction patterns", () => {
    const content = fs.readFileSync(path.join(base, "lib/sandbox-security.ts"), "utf8");
    expect(content).toContain("slack_token");
    expect(content).toContain("sendgrid");
    expect(content).toContain("twilio");
    expect(content).toContain("x_api_key_header");
  });

  test("docsci-config.ts has memory_limit_mb in SecuritySection", () => {
    const content = fs.readFileSync(path.join(base, "lib/docsci-config.ts"), "utf8");
    expect(content).toContain("memory_limit_mb");
    expect(content).toContain("cpu_limit_seconds");
  });

  test("sandbox.ts accepts memory_limit_mb", () => {
    const content = fs.readFileSync(path.join(base, "lib/sandbox.ts"), "utf8");
    expect(content).toContain("memory_limit_mb");
    expect(content).toContain("memoryLimitMb");
  });

  test("sandbox-ivm.ts accepts memoryLimitMb parameter", () => {
    const content = fs.readFileSync(path.join(base, "lib/sandbox-ivm.ts"), "utf8");
    expect(content).toContain("memoryLimitMb");
    expect(content).toContain("memoryLimit:");
  });

  test("run-orchestrator passes memory_limit_mb to executeSnippet", () => {
    const content = fs.readFileSync(path.join(base, "lib/run-orchestrator.ts"), "utf8");
    expect(content).toContain("memory_limit_mb");
  });
});

// ── Integration ───────────────────────────────────────────────────────────────

test.describe("Security integration", () => {
  test("GET /security responds 200", async ({ request }) => {
    const res = await request.get(`${BASE}/security`);
    expect(res.ok()).toBeTruthy();
  });

  test("GET /api/sandbox-security responds 200", async ({ request }) => {
    const res = await request.get(`${BASE}/api/sandbox-security`);
    expect(res.ok()).toBeTruthy();
  });

  test("GET /api/sandbox-security?action=caps responds 200", async ({ request }) => {
    const res = await request.get(`${BASE}/api/sandbox-security?action=caps`);
    expect(res.ok()).toBeTruthy();
  });

  test("/docs/security still responds 200", async ({ request }) => {
    const res = await request.get(`${BASE}/docs/security`);
    expect(res.ok()).toBeTruthy();
  });
});
