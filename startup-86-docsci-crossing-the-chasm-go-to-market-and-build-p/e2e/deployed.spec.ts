/**
 * deployed.spec.ts — run against the live Vercel production URL
 *
 * Usage:
 *   BASE_URL=https://startup-86-docsci-crossing-the-chasm-go-to-market-6bzbynko4.vercel.app \
 *   VERCEL_BYPASS_TOKEN=<bypass-secret> \
 *   npx playwright test e2e/deployed.spec.ts
 *
 * Or against the custom domain (SSO-exempt, no bypass needed):
 *   BASE_URL=https://snippetci.com npx playwright test e2e/deployed.spec.ts
 *
 * The tests skip gracefully if BASE_URL is localhost (deferred to CI).
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const BYPASS = process.env.VERCEL_BYPASS_TOKEN || "";
const IS_DEPLOYED = BASE.includes("vercel.app") || BASE.includes("snippetci.com");

// Add bypass token as cookie header when hitting .vercel.app
function bypassHeaders() {
  return BYPASS ? { "x-vercel-protection-bypass": BYPASS } : {};
}

test.describe("Deployed production smoke tests", () => {
  test.skip(!IS_DEPLOYED, "Skipped — set BASE_URL to a deployed Vercel/custom domain to run");

  test("GET /api/health returns 200 with status ok", async ({ request }) => {
    const res = await request.get(`${BASE}/api/health`, {
      headers: bypassHeaders(),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.service).toBe("docsci");
    expect(body.checks.database).toBe("ok");
    expect(body.checks.rls).toBe("enabled");
  });

  test("GET /api/healthcheck returns 200 with supabase connected", async ({ request }) => {
    const res = await request.get(`${BASE}/api/healthcheck`, {
      headers: bypassHeaders(),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.supabase).toBe("connected");
  });

  test("GET /api/rls-check returns isolation_verified true", async ({ request }) => {
    const res = await request.get(`${BASE}/api/rls-check`, {
      headers: bypassHeaders(),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.rls).toBe("enabled");
    expect(body.isolation_verified).toBe(true);
    expect(body.isolation_proof.orgs_visible_to_anon).toBe(0);
  });

  test("Login page loads", async ({ page }) => {
    if (BYPASS) {
      await page.setExtraHTTPHeaders(bypassHeaders());
    }
    await page.goto(`${BASE}/login`);
    await expect(page.locator("h1, h2")).toContainText(/sign in|log in|welcome/i);
    await expect(page.locator("input[type=email]")).toBeVisible();
    await expect(page.locator("input[type=password]")).toBeVisible();
  });

  test("Signup page loads", async ({ page }) => {
    if (BYPASS) {
      await page.setExtraHTTPHeaders(bypassHeaders());
    }
    await page.goto(`${BASE}/signup`);
    await expect(page.locator("h1, h2")).toContainText(/sign up|create account|get started/i);
    await expect(page.locator("input[type=email]")).toBeVisible();
  });

  test("Dashboard redirects unauthenticated to /login", async ({ request }) => {
    const res = await request.get(`${BASE}/dashboard`, {
      headers: bypassHeaders(),
      maxRedirects: 0,
    });
    // Either 307/302 redirect or 200 (if login page is rendered inline)
    expect([200, 302, 307, 308]).toContain(res.status());
    if ([302, 307, 308].includes(res.status())) {
      expect(res.headers()["location"]).toMatch(/login/);
    }
  });

  test("Protected API routes return 401 without auth", async ({ request }) => {
    const routes = ["/api/repos", "/api/runs", "/api/projects", "/api/tokens", "/api/integrations"];
    for (const route of routes) {
      const res = await request.get(`${BASE}${route}`, {
        headers: bypassHeaders(),
      });
      expect(res.status()).toBe(401);
    }
  });

  test("GET /docs-guide returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/docs-guide`, {
      headers: bypassHeaders(),
    });
    expect(res.status()).toBe(200);
  });
});
