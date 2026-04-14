/**
 * e2e/security-packet.spec.ts — security review packet page tests
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE = process.env.BASE_URL || "http://localhost:3000";

test.describe("/security — Security Review Packet", () => {
  test("returns 200", async ({ request }) => {
    expect((await request.get(`${BASE}/security`)).ok()).toBeTruthy();
  });

  test("renders security-page wrapper", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    await expect(page.locator("[data-testid='security-page']")).toBeVisible();
  });

  test("h1 contains 'Security Review Packet'", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    const h1 = page.locator("[data-testid='security-h1']");
    await expect(h1).toBeVisible();
    expect(await h1.textContent()).toContain("Security Review Packet");
  });

  test("header pills — trust badges visible", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    await expect(page.locator("[data-testid='security-header']")).toBeVisible();
    const content = await page.content();
    expect(content).toContain("SOC 2");
    expect(content).toContain("TLS 1.3");
    expect(content).toContain("RLS");
  });

  test("table of contents visible", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    await expect(page.locator("[data-testid='security-toc']")).toBeVisible();
  });
});

test.describe("/security — Data flow diagram", () => {
  test("data-flow section renders", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    await expect(page.locator("[data-testid='section-data-flow']")).toBeVisible();
  });

  test("data-flow-diagram component visible", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    await expect(page.locator("[data-testid='data-flow-diagram']")).toBeVisible();
  });

  test("data-flow-table shows flow rows", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    const rows = page.locator("[data-testid='data-flow-table'] tbody tr");
    expect(await rows.count()).toBeGreaterThanOrEqual(6);
  });

  test("flow table includes External trust boundary row", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    expect(await page.content()).toContain("External");
  });

  test("all 8 node labels (A–H) rendered", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    const content = await page.content();
    for (const node of ["A", "B", "C", "D", "E", "F", "G", "H"]) {
      expect(content).toContain(`>${node}<`);
    }
  });

  test("mentions zero source-code egress", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    expect(await page.content()).toContain("source code");
  });
});

test.describe("/security — Runner isolation model", () => {
  test("runner-isolation section renders", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    await expect(page.locator("[data-testid='section-runner-isolation']")).toBeVisible();
  });

  test("runner-isolation-model component visible", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    await expect(page.locator("[data-testid='runner-isolation-model']")).toBeVisible();
  });

  test("shows 5 isolation layers (L1–L5)", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    const content = await page.content();
    for (const l of ["L1", "L2", "L3", "L4", "L5"]) {
      expect(content).toContain(l);
    }
  });

  test("covers V8, Pyodide, network allowlist, Docker, and secret redaction", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    const content = await page.content();
    expect(content).toContain("V8");
    expect(content).toContain("Pyodide");
    expect(content).toContain("allowlist");
    expect(content).toContain("Docker");
    expect(content).toContain("redact");
  });

  test("mentions private IP blocking", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    expect(await page.content()).toContain("10.0.0.0");
  });
});

test.describe("/security — RLS policy summary", () => {
  test("rls section renders", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    await expect(page.locator("[data-testid='section-rls']")).toBeVisible();
  });

  test("rls-policy-summary component visible", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    await expect(page.locator("[data-testid='rls-policy-summary']")).toBeVisible();
  });

  test("shows all 6 core tables", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    const content = await page.content();
    for (const tbl of ["organizations", "projects", "runs", "findings", "memberships", "api_tokens"]) {
      expect(content).toContain(tbl);
    }
  });

  test("mentions org_id isolation guarantee", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    expect(await page.content()).toContain("org_id");
  });

  test("mentions FORCE ROW LEVEL SECURITY", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    expect(await page.content()).toContain("FORCE ROW LEVEL SECURITY");
  });
});

test.describe("/security — SOC 2 section", () => {
  test("soc2 section renders", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    await expect(page.locator("[data-testid='section-soc2']")).toBeVisible();
  });

  test("soc2-section component visible", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    await expect(page.locator("[data-testid='soc2-section']")).toBeVisible();
  });

  test("states SOC 2 Type II in progress", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    const content = await page.content();
    expect(content).toContain("SOC 2 Type II");
    expect(content).toContain("progress");
  });

  test("shows 4 trust service criteria", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    const content = await page.content();
    for (const c of ["Security", "Availability", "Confidentiality", "Processing Integrity"]) {
      expect(content).toContain(c);
    }
  });

  test("mentions Q1 2026 estimated delivery", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    expect(await page.content()).toContain("Q1 2026");
  });

  test("has link to contact security team", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    expect(await page.content()).toContain("security@snippetci.com");
  });
});

test.describe("/security — other sections", () => {
  test("pentest-section renders", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    await expect(page.locator("[data-testid='pentest-section']")).toBeVisible();
  });

  test("disclosure-section renders", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    await expect(page.locator("[data-testid='disclosure-section']")).toBeVisible();
  });

  test("page links to customer-hosted runner roadmap", async ({ page }) => {
    await page.goto(`${BASE}/security`);
    expect(await page.content()).toContain("customer-hosted-runner");
  });
});

// ── Source validation ──────────────────────────────────────────────────────────
test.describe("Security packet source validation", () => {
  const base = process.cwd();

  test("security page file exists", () => {
    expect(fs.existsSync(path.join(base, "app/security/page.tsx"))).toBe(true);
  });

  test("page file has data flow diagram component", () => {
    const content = fs.readFileSync(path.join(base, "app/security/page.tsx"), "utf8");
    expect(content).toContain("DataFlowDiagram");
    expect(content).toContain("data-flow-diagram");
  });

  test("page file has runner isolation model component", () => {
    const content = fs.readFileSync(path.join(base, "app/security/page.tsx"), "utf8");
    expect(content).toContain("RunnerIsolationModel");
    expect(content).toContain("runner-isolation-model");
  });

  test("page file has RLS policy summary component", () => {
    const content = fs.readFileSync(path.join(base, "app/security/page.tsx"), "utf8");
    expect(content).toContain("RLSPolicySummary");
    expect(content).toContain("rls-policy-summary");
  });

  test("page file has SOC 2 in-progress note", () => {
    const content = fs.readFileSync(path.join(base, "app/security/page.tsx"), "utf8");
    expect(content).toContain("SOC 2");
    expect(content).toContain("in progress");
  });

  test("page has canonical URL snippetci.com/security", () => {
    const content = fs.readFileSync(path.join(base, "app/security/page.tsx"), "utf8");
    expect(content).toContain("snippetci.com/security");
  });
});
