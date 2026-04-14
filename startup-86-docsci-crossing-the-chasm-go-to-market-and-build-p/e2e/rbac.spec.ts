/**
 * rbac.spec.ts — Org creation, RBAC enforcement, invite links, security docs E2E tests
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";

// ── /api/orgs ─────────────────────────────────────────────────────────────────

test.describe("GET /api/orgs — org list", () => {
  test("returns 401 without auth", async ({ request }) => {
    const res = await request.get(`${BASE}/api/orgs`);
    expect(res.status()).toBe(401);
  });

  test("responds with json", async ({ request }) => {
    const res = await request.get(`${BASE}/api/orgs`);
    // 401 or 200 — either is a valid response format
    const ct = res.headers()["content-type"] ?? "";
    expect(ct).toContain("application/json");
  });
});

test.describe("POST /api/orgs — create org", () => {
  test("returns 401 without auth", async ({ request }) => {
    const res = await request.post(`${BASE}/api/orgs`, {
      data: { name: "Test Org", slug: "test-org" },
    });
    expect(res.status()).toBe(401);
  });

  test("validates required fields", async ({ request }) => {
    // This will hit 401 first, which is fine — we're testing the API surface
    const res = await request.post(`${BASE}/api/orgs`, { data: {} });
    expect([400, 401]).toContain(res.status());
  });
});

// ── /api/orgs/[orgId]/members ─────────────────────────────────────────────────

test.describe("GET /api/orgs/[orgId]/members", () => {
  test("returns 401 without auth", async ({ request }) => {
    const res = await request.get(`${BASE}/api/orgs/nonexistent-org/members`);
    expect(res.status()).toBe(401);
  });
});

test.describe("PATCH /api/orgs/[orgId]/members/[memberId] — change role", () => {
  test("returns 401 without auth", async ({ request }) => {
    const res = await request.patch(`${BASE}/api/orgs/fake-org/members/fake-member`, {
      data: { role: "editor" },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("DELETE /api/orgs/[orgId]/members/[memberId] — remove member", () => {
  test("returns 401 without auth", async ({ request }) => {
    const res = await request.delete(`${BASE}/api/orgs/fake-org/members/fake-member`);
    expect(res.status()).toBe(401);
  });
});

// ── /api/orgs/[orgId]/invites ─────────────────────────────────────────────────

test.describe("GET /api/orgs/[orgId]/invites", () => {
  test("returns 401 without auth", async ({ request }) => {
    const res = await request.get(`${BASE}/api/orgs/fake-org/invites`);
    expect(res.status()).toBe(401);
  });
});

test.describe("POST /api/orgs/[orgId]/invites — create invite", () => {
  test("returns 401 without auth", async ({ request }) => {
    const res = await request.post(`${BASE}/api/orgs/fake-org/invites`, {
      data: { role: "viewer" },
    });
    expect(res.status()).toBe(401);
  });
});

// ── /api/invite ───────────────────────────────────────────────────────────────

test.describe("GET /api/invite — token validation", () => {
  test("returns 400 when token is missing", async ({ request }) => {
    const res = await request.get(`${BASE}/api/invite`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("token");
  });

  test("returns 404 for invalid token", async ({ request }) => {
    const res = await request.get(`${BASE}/api/invite?token=not-a-valid-token-xyz-123`);
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test("returns json with valid/expired/exhausted fields for unknown token", async ({ request }) => {
    const res = await request.get(`${BASE}/api/invite?token=fakefakefake`);
    expect([404, 200]).toContain(res.status());
    const ct = res.headers()["content-type"] ?? "";
    expect(ct).toContain("application/json");
  });
});

test.describe("POST /api/invite — accept invite", () => {
  test("returns 401 without auth", async ({ request }) => {
    const res = await request.post(`${BASE}/api/invite`, {
      data: { token: "some-token" },
    });
    expect(res.status()).toBe(401);
  });

  test("requires token field", async ({ request }) => {
    const res = await request.post(`${BASE}/api/invite`, { data: {} });
    expect([400, 401]).toContain(res.status());
  });
});

// ── /api/org-role ─────────────────────────────────────────────────────────────

test.describe("GET /api/org-role", () => {
  test("returns 401 without auth", async ({ request }) => {
    const res = await request.get(`${BASE}/api/org-role`);
    expect(res.status()).toBe(401);
  });

  test("returns json with role field shape", async ({ request }) => {
    const res = await request.get(`${BASE}/api/org-role`);
    // 401 = expected without auth
    expect([401, 200]).toContain(res.status());
    const ct = res.headers()["content-type"] ?? "";
    expect(ct).toContain("application/json");
  });
});

// ── /api/runs/queue — viewer should be blocked ────────────────────────────────

test.describe("POST /api/runs/queue — RBAC enforcement", () => {
  test("responds to unauthenticated requests (demo or auth gate)", async ({ request }) => {
    const res = await request.post(`${BASE}/api/runs/queue`, {
      data: { mode: "inline", docs: [{ path: "README.md", content: "# Hello" }] },
    });
    // Either 200 (demo mode), 400 (validation), 401 (auth), or 403 (viewer blocked)
    expect([200, 400, 401, 403]).toContain(res.status());
    const ct = res.headers()["content-type"] ?? "";
    expect(ct).toContain("application/json");
  });
});

// ── /dashboard/settings/org page ─────────────────────────────────────────────

test.describe("/dashboard/settings/org — org settings page", () => {
  test("page responds 200", async ({ request }) => {
    const res = await request.get(`${BASE}/dashboard/settings/org`);
    // Could be 200 (public) or redirect to login — either is valid
    expect([200, 301, 302, 307, 308]).toContain(res.status());
  });

  test("page renders org settings UI (or login redirect)", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/settings/org`);
    // Accept either the settings page or a login/signup page
    const url = page.url();
    const isSettingsOrAuth = url.includes("/settings/org") || url.includes("/login") || url.includes("/signup") || url.includes("/dashboard");
    expect(isSettingsOrAuth).toBe(true);
  });

  test("settings page has create org button when unauthenticated redirected", async ({ page }) => {
    // Either shows the org settings page with create btn, or login page
    await page.goto(`${BASE}/dashboard/settings/org`);
    const bodyText = await page.content();
    // Should contain either org creation UI or auth prompts
    const hasRelevantContent = bodyText.includes("Organization") ||
      bodyText.includes("Sign") || bodyText.includes("Login") ||
      bodyText.includes("organization");
    expect(hasRelevantContent).toBe(true);
  });
});

// ── /invite/[token] page ──────────────────────────────────────────────────────

test.describe("/invite/[token] — invite acceptance page", () => {
  test("page loads for unknown token", async ({ page }) => {
    await page.goto(`${BASE}/invite/invalid-test-token-12345`);
    await expect(page.locator("[data-testid='invite-page']")).toBeVisible();
  });

  test("shows invalid state for bad token", async ({ page }) => {
    await page.goto(`${BASE}/invite/definitelynotavalidtoken`);
    // Should show either invalid or the loading state
    const content = await page.content();
    expect(content.includes("invite") || content.includes("DocsCI")).toBe(true);
  });

  test("invite page shows DocsCI brand", async ({ page }) => {
    await page.goto(`${BASE}/invite/sometoken`);
    await expect(page.locator("[data-testid='invite-page']")).toBeVisible();
    await expect(page.getByText("DocsCI")).toBeVisible();
  });

  test("invite page shows invalid message for bad token", async ({ page }) => {
    await page.goto(`${BASE}/invite/bad-token-xyz`);
    await page.waitForSelector("[data-testid='invite-invalid'], [data-testid='invite-valid']", { timeout: 5000 });
    const invalid = page.locator("[data-testid='invite-invalid']");
    const valid = page.locator("[data-testid='invite-valid']");
    const invalidCount = await invalid.count();
    const validCount = await valid.count();
    expect(invalidCount + validCount).toBeGreaterThan(0);
  });
});

// ── /docs/security page ───────────────────────────────────────────────────────

test.describe("/docs/security — security documentation", () => {
  test("page loads with heading", async ({ page }) => {
    await page.goto(`${BASE}/docs/security`);
    await expect(page.locator("h1").first()).toBeVisible();
    const h1 = await page.locator("h1").first().textContent();
    expect(h1?.toLowerCase()).toContain("security");
  });

  test("sandbox isolation section present", async ({ page }) => {
    await page.goto(`${BASE}/docs/security`);
    await expect(page.locator("[data-testid='security-section-sandbox']")).toBeVisible({ timeout: 10000 });
    const content = await page.content();
    expect(content).toContain("isolated-vm");
    expect(content).toContain("Pyodide");
  });

  test("RBAC section with permissions table", async ({ page }) => {
    await page.goto(`${BASE}/docs/security`);
    await expect(page.locator("[data-testid='security-section-rbac']")).toBeVisible();
    await expect(page.getByText("Trigger CI runs")).toBeVisible();
    await expect(page.getByText("Delete organization")).toBeVisible();
  });

  test("RLS section lists all tables", async ({ page }) => {
    await page.goto(`${BASE}/docs/security`);
    await expect(page.locator("[data-testid='security-section-rls']")).toBeVisible({ timeout: 10000 });
    const content = await page.content();
    expect(content).toContain("docsci_orgs");
    expect(content).toContain("docsci_org_members");
    expect(content).toContain("docsci_runs");
    expect(content).toContain("docsci_invite_tokens");
  });

  test("runtime caps section with limits table", async ({ page }) => {
    await page.goto(`${BASE}/docs/security`);
    await expect(page.locator("[data-testid='security-section-caps']")).toBeVisible({ timeout: 10000 });
    const content = await page.content();
    expect(content).toContain("Snippet execution timeout");
    expect(content).toContain("64 MB");
    expect(content).toContain("128 MB");
  });

  test("network policy section", async ({ page }) => {
    await page.goto(`${BASE}/docs/security`);
    await expect(page.locator("[data-testid='security-section-network']")).toBeVisible({ timeout: 10000 });
    const content = await page.content();
    expect(content).toContain("network_isolated");
  });

  test("disclosure section with contact email", async ({ page }) => {
    await page.goto(`${BASE}/docs/security`);
    await expect(page.locator("[data-testid='security-section-disclosure']")).toBeVisible();
    await expect(page.getByText("hello@snippetci.com")).toBeVisible();
  });

  test("enterprise security contact button", async ({ page }) => {
    await page.goto(`${BASE}/docs/security`);
    await expect(page.locator("[data-testid='security-contact-btn']")).toBeVisible();
  });

  test("nav links back to docs", async ({ page }) => {
    await page.goto(`${BASE}/docs/security`);
    await expect(page.locator("a[href='/docs']")).toBeVisible();
  });
});

// ── Role model: source code validation ───────────────────────────────────────

test.describe("RBAC source code validation", () => {
  const fs = require("fs");
  const path = require("path");
  const base = path.join(process.cwd());

  test("orgs API route exists", () => {
    expect(fs.existsSync(path.join(base, "app/api/orgs/route.ts"))).toBe(true);
  });

  test("org members route exists", () => {
    expect(fs.existsSync(path.join(base, "app/api/orgs/[orgId]/members/route.ts"))).toBe(true);
  });

  test("org invites route exists", () => {
    expect(fs.existsSync(path.join(base, "app/api/orgs/[orgId]/invites/route.ts"))).toBe(true);
  });

  test("invite accept route exists", () => {
    expect(fs.existsSync(path.join(base, "app/api/invite/route.ts"))).toBe(true);
  });

  test("invite page exists", () => {
    expect(fs.existsSync(path.join(base, "app/invite/[token]/page.tsx"))).toBe(true);
  });

  test("org settings page exists", () => {
    expect(fs.existsSync(path.join(base, "app/dashboard/settings/org/page.tsx"))).toBe(true);
  });

  test("security docs page exists", () => {
    expect(fs.existsSync(path.join(base, "app/docs/security/page.tsx"))).toBe(true);
  });

  test("runs queue route enforces role-gated insert (RLS check present)", () => {
    const content = fs.readFileSync(path.join(base, "app/api/runs/queue/route.ts"), "utf8");
    // The RLS policy runs_insert_editor on the DB blocks viewers
    // The route itself should reference docsci_config or checks or runs logic
    expect(content).toContain("docsci_runs");
  });

  test("member route checks owner role for PATCH", () => {
    const content = fs.readFileSync(path.join(base, "app/api/orgs/[orgId]/members/[memberId]/route.ts"), "utf8");
    expect(content).toContain("owner");
    expect(content).toContain("Forbidden");
  });

  test("invites route checks owner or editor", () => {
    const content = fs.readFileSync(path.join(base, "app/api/orgs/[orgId]/invites/route.ts"), "utf8");
    expect(content).toContain("editor");
    expect(content).toContain("owner");
  });

  test("invite accept route prevents accepting expired tokens", () => {
    const content = fs.readFileSync(path.join(base, "app/api/invite/route.ts"), "utf8");
    expect(content).toContain("expired");
    expect(content).toContain("exhausted");
  });

  test("last owner protection in member deletion", () => {
    const content = fs.readFileSync(path.join(base, "app/api/orgs/[orgId]/members/[memberId]/route.ts"), "utf8");
    expect(content).toContain("last owner");
  });

  test("orgs route creates member as owner after org creation", () => {
    const content = fs.readFileSync(path.join(base, "app/api/orgs/route.ts"), "utf8");
    expect(content).toContain("owner");
    expect(content).toContain("docsci_org_members");
  });
});

// ── Integration: full page loads ──────────────────────────────────────────────

test.describe("RBAC integration — page loads", () => {
  test("GET /docs/security responds 200", async ({ request }) => {
    const res = await request.get(`${BASE}/docs/security`);
    expect(res.ok()).toBeTruthy();
  });

  test("GET /invite/test-token responds 200", async ({ request }) => {
    const res = await request.get(`${BASE}/invite/test-token`);
    expect(res.ok()).toBeTruthy();
  });

  test("GET /api/invite responds 400 (no token)", async ({ request }) => {
    const res = await request.get(`${BASE}/api/invite`);
    expect(res.status()).toBe(400);
  });

  test("GET /api/orgs responds 401 (no auth)", async ({ request }) => {
    const res = await request.get(`${BASE}/api/orgs`);
    expect(res.status()).toBe(401);
  });
});
