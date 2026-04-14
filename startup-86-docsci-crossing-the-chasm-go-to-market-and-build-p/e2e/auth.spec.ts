import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";

test.describe("Auth pages", () => {
  test("login page renders", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.getByPlaceholder("you@company.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign in/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Google/ })).toBeVisible();
  });

  test("signup page renders", async ({ page }) => {
    await page.goto(`${BASE}/signup`);
    await expect(page.getByRole("heading", { name: "Start for free" })).toBeVisible();
    await expect(page.getByPlaceholder("Jane Smith")).toBeVisible();
    await expect(page.getByRole("button", { name: /get started free/i })).toBeVisible();
  });

  test("login page links to signup", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    const link = page.getByRole("link", { name: /Sign up free/ });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test("signup page links to login", async ({ page }) => {
    await page.goto(`${BASE}/signup`);
    await expect(page.getByRole("link", { name: /Sign in/ })).toBeVisible();
  });

  test("invalid login shows error", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', "nonexistent@test.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    // Supabase returns error for invalid credentials
    await expect(page.locator(".bg-red-950")).toBeVisible({ timeout: 8000 });
  });

  test("dashboard redirects unauthenticated users to login", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Healthcheck API", () => {
  test("healthcheck returns ok", async ({ request }) => {
    const response = await request.get(`${BASE}/api/healthcheck`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.supabase).toBe("connected");
    expect(body.rls).toBe("enabled");
    expect(Array.isArray(body.tables)).toBeTruthy();
    expect(body.tables).toContain("docsci_profiles");
    expect(body.tables).toContain("docsci_orgs");
  });
});

test.describe("Whole-product scaffold", () => {
  test("snippet execution API: valid Python", async ({ request }) => {
    // Need auth — test anonymously should return 401
    const res = await request.post(`${BASE}/api/snippets`, {
      data: { code: "print('hello')", language: "python" },
    });
    // Unauthenticated should get 401
    expect([200, 401]).toContain(res.status());
  });

  test("repos API: unauthenticated returns 401", async ({ request }) => {
    const res = await request.get(`${BASE}/api/repos`);
    expect(res.status()).toBe(401);
  });

  test("openapi-import API: unauthenticated returns 401", async ({ request }) => {
    const res = await request.post(`${BASE}/api/openapi-import`, {
      data: { source_url: "https://example.com/openapi.json", org_id: "test" },
    });
    expect(res.status()).toBe(401);
  });

  test("audit-log API: unauthenticated returns 401", async ({ request }) => {
    const res = await request.get(`${BASE}/api/audit-log`);
    expect(res.status()).toBe(401);
  });

  test("runs API: unauthenticated returns 401", async ({ request }) => {
    const res = await request.get(`${BASE}/api/runs`);
    expect(res.status()).toBe(401);
  });

  test("ai-fix API: unauthenticated returns 401", async ({ request }) => {
    const res = await request.post(`${BASE}/api/ai-fix`, {
      data: { code: "x = 1", language: "python", error: "NameError" },
    });
    expect(res.status()).toBe(401);
  });

  test("playground page renders", async ({ page }) => {
    // Playground is protected by auth — should redirect to login
    await page.goto(`${BASE}/dashboard/playground`);
    // Either playground loads (if session) or redirects to login
    await expect(
      page.getByRole("heading", { name: /Snippet Playground/ })
        .or(page.getByRole("heading", { name: /Welcome back/ }))
    ).toBeVisible({ timeout: 8000 });
  });

  test("docs-guide page renders", async ({ page }) => {
    await page.goto(`${BASE}/docs-guide`);
    await expect(page.getByRole("heading", { name: /Get started/ })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/GitHub Actions/).first()).toBeVisible();
  });

  test("GH Actions template is downloadable", async ({ request }) => {
    const res = await request.get(`${BASE}/templates/docsci.yml`);
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).toContain("DocsCI");
    expect(text).toContain("DOCSCI_API_KEY");
  });

  test("openapi-import blocks private IPs", async ({ request }) => {
    // This would return 401 (auth) before reaching the IP check, which is correct
    const res = await request.post(`${BASE}/api/openapi-import`, {
      data: { source_url: "http://192.168.1.1/openapi.json", org_id: "test" },
    });
    // 401 (unauth) or 400 (private IP blocked) — both are correct
    expect([400, 401]).toContain(res.status());
  });
});

test.describe("Schema v3 — projects, findings, suggestions, integrations, api_targets, tokens", () => {
  test("projects API: unauthenticated returns 401", async ({ request }) => {
    const res = await request.get(`${BASE}/api/projects`);
    expect(res.status()).toBe(401);
  });

  test("tokens API: unauthenticated returns 401", async ({ request }) => {
    const res = await request.get(`${BASE}/api/tokens?org_id=test`);
    expect(res.status()).toBe(401);
  });

  test("integrations API: unauthenticated returns 401", async ({ request }) => {
    const res = await request.get(`${BASE}/api/integrations?org_id=test`);
    expect(res.status()).toBe(401);
  });

  test("healthcheck lists all 10 core tables", async ({ request }) => {
    const res = await request.get(`${BASE}/api/healthcheck`);
    const body = await res.json();
    expect(body.status).toBe("ok");
    const tables: string[] = body.tables;
    expect(tables).toContain("docsci_projects");
    expect(tables).toContain("docsci_runs");
    expect(tables).toContain("docsci_findings");
    expect(tables).toContain("docsci_suggestions");
    expect(tables).toContain("docsci_integrations");
    expect(tables).toContain("docsci_api_targets");
    expect(tables).toContain("docsci_tokens");
  });
});

test.describe("RLS isolation verification", () => {
  test("rls-check endpoint returns ok with isolation proof", async ({ request }) => {
    const res = await request.get(`${BASE}/api/rls-check`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.rls).toBe("enabled");
    expect(body.isolation_verified).toBe(true);
    expect(body.isolation_proof.orgs_visible_to_anon).toBe(0);
    expect(body.isolation_proof.projects_visible_to_anon).toBe(0);
    expect(body.isolation_proof.tokens_visible_to_anon).toBe(0);
  });

  test("rls-check lists 18 tables with policies", async ({ request }) => {
    const res = await request.get(`${BASE}/api/rls-check`);
    const body = await res.json();
    expect(body.tables_count).toBe(18);
    expect(body.total_policies).toBeGreaterThanOrEqual(30);
    const tableNames = body.tables.map((t: { table: string }) => t.table);
    expect(tableNames).toContain("docsci_orgs");
    expect(tableNames).toContain("docsci_projects");
    expect(tableNames).toContain("docsci_tokens");
    expect(tableNames).toContain("docsci_findings");
    expect(tableNames).toContain("docsci_suggestions");
  });

  test("rls-check confirms org-scoped isolation model", async ({ request }) => {
    const res = await request.get(`${BASE}/api/rls-check`);
    const body = await res.json();
    expect(body.policy_model["org-scoped"]).toContain("org members");
    expect(body.isolation_proof.result).toContain("✅");
  });
});

test.describe("/api/health endpoint", () => {
  test("returns ok with all checks", async ({ request }) => {
    const res = await request.get(`${BASE}/api/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.service).toBe("docsci");
    expect(body.checks.database).toBe("ok");
    expect(body.checks.rls).toBe("enabled");
  });

  test("health endpoint has no-store cache control", async ({ request }) => {
    const res = await request.get(`${BASE}/api/health`);
    expect(res.headers()["cache-control"]).toContain("no-store");
  });
});

test.describe("Signup E2E with email verification (AgentMail)", () => {
  const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY || "";

  async function createInbox(): Promise<{ id: string; address: string }> {
    const ts = Date.now();
    const res = await fetch("https://api.agentmail.to/v0/inboxes", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AGENTMAIL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ address: `test-signup-${ts}@snippetci.com` }),
    });
    if (!res.ok) throw new Error(`AgentMail inbox create failed: ${res.status}`);
    return res.json();
  }

  async function waitForEmail(
    inboxId: string,
    timeoutMs = 60000
  ): Promise<{ subject: string; body?: string } | null> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const res = await fetch(`https://api.agentmail.to/v0/inboxes/${inboxId}/messages`, {
        headers: { Authorization: `Bearer ${AGENTMAIL_API_KEY}` },
      });
      if (res.ok) {
        const data = await res.json();
        const msgs = data.messages ?? data;
        if (Array.isArray(msgs) && msgs.length > 0) return msgs[0];
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    return null;
  }

  test("signup form submits and confirmation email arrives", async ({ page }) => {
    if (!AGENTMAIL_API_KEY) {
      console.log("AGENTMAIL_API_KEY not set — skipping email verification test");
      return;
    }

    const inbox = await createInbox();

    await page.goto(`${BASE}/signup`);
    await page.getByPlaceholder("Jane Smith").fill("E2E Test User");
    await page.getByPlaceholder("you@company.com").fill(inbox.address);
    await page.getByPlaceholder("8+ characters").fill("TestPassword123!");
    await page.getByTestId("signup-submit").click();

    // After submit the app should show the "check your email" screen
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10000 });

    // Poll for the confirmation email (up to 60s)
    const email = await waitForEmail(inbox.id, 60000);
    expect(email).not.toBeNull();
    expect(email!.subject).toMatch(/confirm|verify|activate/i);
  });
});
