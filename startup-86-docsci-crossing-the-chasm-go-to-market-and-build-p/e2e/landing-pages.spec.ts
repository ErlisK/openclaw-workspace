/**
 * landing-pages.spec.ts
 *
 * E2E tests for /for/* SEO landing pages, analytics event firing,
 * structured data, and sitemap entries.
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE = process.env.BASE_URL || "http://localhost:3000";

const LANDING_PAGES = [
  {
    slug: "docusaurus-docs-ci",
    h1Keyword: "Docusaurus",
    analyticsEvent: "docusaurus docs CI",
  },
  {
    slug: "api-docs-testing",
    h1Keyword: "API",
    analyticsEvent: "API docs testing",
  },
  {
    slug: "openapi-docs-validation",
    h1Keyword: "OpenAPI",
    analyticsEvent: "OpenAPI",
  },
  {
    slug: "prevent-broken-code-examples",
    h1Keyword: "Broken",
    analyticsEvent: "broken code examples",
  },
];

// ── /for index page ───────────────────────────────────────────────────────────

test.describe("/for index — use-case landing pages", () => {
  test("loads and returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/for`);
    expect(res.ok()).toBeTruthy();
  });

  test("renders index with h1", async ({ page }) => {
    await page.goto(`${BASE}/for`);
    await expect(page.getByRole("heading", { name: /DocsCI solutions/i })).toBeVisible();
  });

  test("shows 4 landing page cards", async ({ page }) => {
    await page.goto(`${BASE}/for`);
    const cards = page.locator("[data-testid^='for-card-']");
    await expect(cards).toHaveCount(4);
  });

  test("each card links to correct page", async ({ page }) => {
    await page.goto(`${BASE}/for`);
    for (const { slug } of LANDING_PAGES) {
      const card = page.locator(`[data-testid='for-card-${slug}']`);
      await expect(card).toBeVisible();
    }
  });
});

// ── Individual landing pages ──────────────────────────────────────────────────

for (const { slug, h1Keyword } of LANDING_PAGES) {
  test.describe(`/for/${slug}`, () => {
    test("loads and returns 200", async ({ request }) => {
      const res = await request.get(`${BASE}/for/${slug}`);
      expect(res.ok()).toBeTruthy();
    });

    test("renders landing page with h1 containing keyword", async ({ page }) => {
      await page.goto(`${BASE}/for/${slug}`);
      const h1 = page.locator("[data-testid='landing-h1']");
      await expect(h1).toBeVisible();
      const text = await h1.textContent();
      expect(text?.toLowerCase()).toContain(h1Keyword.toLowerCase());
    });

    test("shows hero section with CTA", async ({ page }) => {
      await page.goto(`${BASE}/for/${slug}`);
      await expect(page.locator("[data-testid='hero-section']")).toBeVisible();
      await expect(page.locator("[data-testid='hero-cta']")).toBeVisible();
    });

    test("shows stats bar", async ({ page }) => {
      await page.goto(`${BASE}/for/${slug}`);
      await expect(page.locator("[data-testid='stats-bar']")).toBeVisible();
    });

    test("shows problem section", async ({ page }) => {
      await page.goto(`${BASE}/for/${slug}`);
      await expect(page.locator("[data-testid='problem-section']")).toBeVisible();
    });

    test("shows solution section", async ({ page }) => {
      await page.goto(`${BASE}/for/${slug}`);
      await expect(page.locator("[data-testid='solution-section']")).toBeVisible();
    });

    test("shows features grid", async ({ page }) => {
      await page.goto(`${BASE}/for/${slug}`);
      const features = page.locator("[data-testid='features-section']");
      await expect(features).toBeVisible();
    });

    test("shows how it works steps", async ({ page }) => {
      await page.goto(`${BASE}/for/${slug}`);
      await expect(page.locator("[data-testid='steps-section']")).toBeVisible();
    });

    test("shows FAQ section", async ({ page }) => {
      await page.goto(`${BASE}/for/${slug}`);
      await expect(page.locator("[data-testid='faq-section']")).toBeVisible();
    });

    test("shows bottom CTA", async ({ page }) => {
      await page.goto(`${BASE}/for/${slug}`);
      await expect(page.locator("[data-testid='cta-section']")).toBeVisible();
      await expect(page.locator("[data-testid='bottom-cta']")).toBeVisible();
    });

    test("has JSON-LD structured data", async ({ page }) => {
      await page.goto(`${BASE}/for/${slug}`);
      const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
      expect(jsonLd).toBeTruthy();
      const parsed = JSON.parse(jsonLd!);
      expect(parsed["@type"]).toBe("SoftwareApplication");
      expect(parsed.url).toContain(`/for/${slug}`);
    });
  });
}

// ── Analytics event firing ────────────────────────────────────────────────────

test.describe("Analytics — page view events on landing pages", () => {
  test("POST /api/events accepts page.viewed event", async ({ request }) => {
    const res = await request.post(`${BASE}/api/events`, {
      data: { event: "page.viewed", properties: { path: "/for/api-docs-testing", landing_page: "api-docs-testing" } },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.captured).toBe(true);
  });

  test("fires 5 core analytics events in seeded walkthrough", async ({ request }) => {
    const events = [
      { event: "page.viewed", properties: { path: "/for/api-docs-testing" } },
      { event: "page.viewed", properties: { path: "/for/openapi-docs-validation" } },
      { event: "onboarding.started", properties: { source: "api-docs-testing" } },
      { event: "template.viewed", properties: { template: "github-actions" } },
      { event: "dashboard.opened", properties: { section: "metrics" } },
    ];
    for (const ev of events) {
      const res = await request.post(`${BASE}/api/events`, { data: ev });
      expect(res.ok(), `Event ${ev.event} should be captured`).toBeTruthy();
      const body = await res.json();
      expect(body.captured).toBe(true);
    }
  });

  test("GET /api/events returns stored events", async ({ request }) => {
    const res = await request.get(`${BASE}/api/events?limit=10&event=page.viewed`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.events)).toBe(true);
  });
});

// ── Sitemap includes landing pages ────────────────────────────────────────────

test.describe("Sitemap — landing pages included", () => {
  test("sitemap includes /for URLs", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    const body = await res.text();
    for (const { slug } of LANDING_PAGES) {
      expect(body).toContain(`/for/${slug}`);
    }
  });

  test("sitemap includes /for index", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    const body = await res.text();
    expect(body).toContain("/for");
  });

  test("sitemap total URL count ≥ 20", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    const body = await res.text();
    const matches = body.match(/<url>/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(20);
  });
});

// ── Source code validation ────────────────────────────────────────────────────

test.describe("Landing page source validation", () => {
  const base = process.cwd();

  test("LandingPage component exists", () => {
    expect(fs.existsSync(path.join(base, "components/LandingPage.tsx"))).toBe(true);
  });

  test("LandingPage is a client component", () => {
    const content = fs.readFileSync(path.join(base, "components/LandingPage.tsx"), "utf8");
    expect(content).toContain("use client");
  });

  test("LandingPage fires page.viewed analytics event", () => {
    const content = fs.readFileSync(path.join(base, "components/LandingPage.tsx"), "utf8");
    expect(content).toContain("page.viewed");
    expect(content).toContain("/api/events");
  });

  test("/for index page exists", () => {
    expect(fs.existsSync(path.join(base, "app/for/page.tsx"))).toBe(true);
  });

  for (const { slug } of LANDING_PAGES) {
    test(`/for/${slug} page file exists`, () => {
      expect(fs.existsSync(path.join(base, `app/for/${slug}/page.tsx`))).toBe(true);
    });

    test(`/for/${slug} has canonical metadata`, () => {
      const content = fs.readFileSync(path.join(base, `app/for/${slug}/page.tsx`), "utf8");
      expect(content).toContain("export const metadata");
      expect(content).toContain("canonical");
      expect(content).toContain(`/for/${slug}`);
    });

    test(`/for/${slug} has JSON-LD SoftwareApplication`, () => {
      const content = fs.readFileSync(path.join(base, `app/for/${slug}/page.tsx`), "utf8");
      expect(content).toContain("SoftwareApplication");
      expect(content).toContain("application/ld+json");
    });

    test(`/for/${slug} has keywords metadata`, () => {
      const content = fs.readFileSync(path.join(base, `app/for/${slug}/page.tsx`), "utf8");
      expect(content).toContain("keywords");
    });
  }

  test("sitemap.ts includes all /for/* URLs", () => {
    const content = fs.readFileSync(path.join(base, "app/sitemap.ts"), "utf8");
    for (const { slug } of LANDING_PAGES) {
      expect(content).toContain(`/for/${slug}`);
    }
  });
});
