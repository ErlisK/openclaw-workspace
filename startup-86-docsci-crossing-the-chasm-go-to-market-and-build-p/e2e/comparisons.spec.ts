/**
 * comparisons.spec.ts
 *
 * E2E tests for comparison pages, sitemap, robots.txt, and structured data.
 *
 * Tests:
 *   1. /vs index page loads and shows all 5 comparison cards
 *   2. Each comparison page: loads, h1 correct, comparison table, verdict, CTA
 *   3. /sitemap.xml includes comparison URLs
 *   4. /robots.txt is valid
 *   5. JSON-LD structured data present and valid on each comparison page
 *   6. Source code validation: 5 comparison page files exist, component exported
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE = process.env.BASE_URL || "http://localhost:3000";

const COMPARISON_PAGES = [
  {
    slug: "sphinx-doctest",
    competitor: "Sphinx doctest",
    h1Text: "DocsCI vs Sphinx doctest",
    topicKeyword: "Python",
  },
  {
    slug: "ad-hoc-ci-scripts",
    competitor: "ad-hoc CI scripts",
    h1Text: "DocsCI vs ad-hoc CI scripts",
    topicKeyword: "maintenance",
  },
  {
    slug: "postman-collections",
    competitor: "Postman Collections",
    h1Text: "DocsCI vs Postman Collections",
    topicKeyword: "API",
  },
  {
    slug: "mintlify",
    competitor: "Mintlify",
    h1Text: "DocsCI vs Mintlify",
    topicKeyword: "hosting",
  },
  {
    slug: "readme-checks",
    competitor: "README.io checks",
    h1Text: "DocsCI vs README.io checks",
    topicKeyword: "portal",
  },
];

// ── /vs index page ─────────────────────────────────────────────────────────────

test.describe("/vs index — comparison overview", () => {
  test("loads and returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/vs`);
    expect(res.ok()).toBeTruthy();
  });

  test("renders comparison index page", async ({ page }) => {
    await page.goto(`${BASE}/vs`);
    await expect(page.getByRole("heading", { name: /DocsCI vs alternatives/i })).toBeVisible();
    expect(page.url()).toContain("/vs");
  });

  test("shows 5 comparison cards", async ({ page }) => {
    await page.goto(`${BASE}/vs`);
    const cards = page.locator("[data-testid^='vs-card-']");
    await expect(cards).toHaveCount(5);
  });

  test("each card links to comparison page", async ({ page }) => {
    await page.goto(`${BASE}/vs`);
    for (const { slug } of COMPARISON_PAGES) {
      const card = page.locator(`[data-testid='vs-card-${slug}']`);
      await expect(card).toBeVisible();
      const href = await card.getAttribute("href");
      expect(href).toContain(`/vs/${slug}`);
    }
  });
});

// ── Individual comparison pages ───────────────────────────────────────────────

for (const { slug, competitor, h1Text, topicKeyword } of COMPARISON_PAGES) {
  test.describe(`/vs/${slug} — ${competitor}`, () => {
    test("loads and returns 200", async ({ request }) => {
      const res = await request.get(`${BASE}/vs/${slug}`);
      expect(res.ok()).toBeTruthy();
    });

    test("renders comparison page with correct h1", async ({ page }) => {
      await page.goto(`${BASE}/vs/${slug}`);
      const h1 = page.locator("[data-testid='comparison-h1']");
      await expect(h1).toBeVisible();
      const text = await h1.textContent();
      expect(text).toContain("DocsCI");
      expect(text).toContain(competitor.split(" ")[0]); // first word
    });

    test("shows comparison table", async ({ page }) => {
      await page.goto(`${BASE}/vs/${slug}`);
      await expect(page.locator("[data-testid='comparison-table']")).toBeVisible();
      // Table should have at least 5 rows
      const rows = page.locator("[data-testid='comparison-table'] tbody tr");
      const count = await rows.count();
      expect(count).toBeGreaterThanOrEqual(5);
    });

    test("shows score card", async ({ page }) => {
      await page.goto(`${BASE}/vs/${slug}`);
      await expect(page.locator("[data-testid='score-card']")).toBeVisible();
    });

    test("shows verdict section", async ({ page }) => {
      await page.goto(`${BASE}/vs/${slug}`);
      await expect(page.locator("[data-testid='verdict']")).toBeVisible();
    });

    test("shows CTA section with signup link", async ({ page }) => {
      await page.goto(`${BASE}/vs/${slug}`);
      await expect(page.locator("[data-testid='cta-section']")).toBeVisible();
      const signupLink = page.locator("[data-testid='cta-signup']");
      await expect(signupLink).toBeVisible();
    });

    test("has JSON-LD structured data", async ({ page }) => {
      await page.goto(`${BASE}/vs/${slug}`);
      const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
      expect(jsonLd).toBeTruthy();
      const parsed = JSON.parse(jsonLd!);
      expect(parsed["@type"]).toBe("WebPage");
      expect(parsed.url).toContain(`/vs/${slug}`);
    });

    test("has FAQ section", async ({ page }) => {
      await page.goto(`${BASE}/vs/${slug}`);
      await expect(page.locator("[data-testid='faq-section']")).toBeVisible();
    });

    test("has links to other comparison pages", async ({ page }) => {
      await page.goto(`${BASE}/vs/${slug}`);
      const links = page.locator(`a[href^='/vs/']`);
      const count = await links.count();
      expect(count).toBeGreaterThanOrEqual(3); // at least 3 other pages linked
    });
  });
}

// ── Sitemap ────────────────────────────────────────────────────────────────────

test.describe("sitemap.xml", () => {
  test("GET /sitemap.xml returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    expect(res.ok()).toBeTruthy();
  });

  test("sitemap.xml is valid XML", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    const body = await res.text();
    expect(body).toContain('<?xml');
    expect(body).toContain('<urlset');
    expect(body).toContain('<url>');
  });

  test("sitemap.xml includes homepage", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    const body = await res.text();
    expect(body).toContain('snippetci.com');
  });

  test("sitemap.xml includes comparison pages", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    const body = await res.text();
    for (const { slug } of COMPARISON_PAGES) {
      expect(body).toContain(`/vs/${slug}`);
    }
  });

  test("sitemap.xml includes /vs index", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    const body = await res.text();
    expect(body).toContain('/vs');
  });

  test("sitemap.xml includes docs pages", async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    const body = await res.text();
    expect(body).toContain('/docs');
  });
});

// ── robots.txt ────────────────────────────────────────────────────────────────

test.describe("robots.txt", () => {
  test("GET /robots.txt returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/robots.txt`);
    expect(res.ok()).toBeTruthy();
  });

  test("robots.txt has User-agent rule", async ({ request }) => {
    const res = await request.get(`${BASE}/robots.txt`);
    const body = await res.text();
    expect(body.toLowerCase()).toContain('user-agent');
  });

  test("robots.txt references sitemap", async ({ request }) => {
    const res = await request.get(`${BASE}/robots.txt`);
    const body = await res.text();
    expect(body).toContain('Sitemap');
    expect(body).toContain('sitemap.xml');
  });

  test("robots.txt blocks /api/ and /dashboard/", async ({ request }) => {
    const res = await request.get(`${BASE}/robots.txt`);
    const body = await res.text();
    expect(body).toContain('/api/');
    expect(body).toContain('/dashboard/');
  });
});

// ── Source code validation ─────────────────────────────────────────────────────

test.describe("Comparison pages source validation", () => {
  const base = process.cwd();

  test("ComparisonPage component exists", () => {
    expect(fs.existsSync(path.join(base, "components/ComparisonPage.tsx"))).toBe(true);
  });

  test("ComparisonPage exports Check, Cross, Partial helpers", () => {
    const content = fs.readFileSync(path.join(base, "components/ComparisonPage.tsx"), "utf8");
    expect(content).toContain("export { Check, Cross, Partial }");
  });

  test("ComparisonPage has JSON-LD structured data", () => {
    const content = fs.readFileSync(path.join(base, "components/ComparisonPage.tsx"), "utf8");
    expect(content).toContain("application/ld+json");
    expect(content).toContain("WebPage");
    expect(content).toContain("BreadcrumbList");
  });

  test("/vs index page exists", () => {
    expect(fs.existsSync(path.join(base, "app/vs/page.tsx"))).toBe(true);
  });

  for (const { slug } of COMPARISON_PAGES) {
    test(`/vs/${slug} page file exists`, () => {
      expect(fs.existsSync(path.join(base, `app/vs/${slug}/page.tsx`))).toBe(true);
    });

    test(`/vs/${slug} has metadata export`, () => {
      const content = fs.readFileSync(path.join(base, `app/vs/${slug}/page.tsx`), "utf8");
      expect(content).toContain("export const metadata");
      expect(content).toContain("alternates");
      expect(content).toContain("canonical");
    });
  }

  test("sitemap.ts includes all comparison URLs", () => {
    const content = fs.readFileSync(path.join(base, "app/sitemap.ts"), "utf8");
    for (const { slug } of COMPARISON_PAGES) {
      expect(content).toContain(`/vs/${slug}`);
    }
  });

  test("robots.ts has host and sitemap", () => {
    const content = fs.readFileSync(path.join(base, "app/robots.ts"), "utf8");
    expect(content).toContain("sitemap");
    expect(content).toContain("snippetci.com");
  });
});
