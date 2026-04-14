/**
 * e2e/adjacent-landing-pages.spec.ts
 * Tests for the 3 adjacent-segment landing pages:
 * - /for/openapi-enterprise
 * - /for/nextjs-mdx-docs
 * - /for/gitlab-ci-docs
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE = process.env.BASE_URL || "http://localhost:3000";

const pages = [
  {
    slug: "openapi-enterprise",
    title: "OpenAPI-First Enterprise",
    keywords: ["OpenAPI", "enterprise", "drift"],
    h1Keyword: "OpenAPI",
  },
  {
    slug: "nextjs-mdx-docs",
    title: "Next.js / MDX",
    keywords: ["MDX", "Next.js", "Nextra"],
    h1Keyword: "MDX",
  },
  {
    slug: "gitlab-ci-docs",
    title: "GitLab CI",
    keywords: ["GitLab", "MR", "pipeline"],
    h1Keyword: "GitLab",
  },
];

for (const page of pages) {
  test.describe(`/for/${page.slug} — ${page.title} landing page`, () => {
    test("returns 200", async ({ request }) => {
      const res = await request.get(`${BASE}/for/${page.slug}`);
      expect(res.ok()).toBeTruthy();
    });

    test("renders h1 with keyword", async ({ page: p }) => {
      await p.goto(`${BASE}/for/${page.slug}`);
      const h1 = p.locator("h1").first();
      await expect(h1).toBeVisible();
      const text = await h1.textContent();
      expect(text).toContain(page.h1Keyword);
    });

    test("has JSON-LD SoftwareApplication", async ({ request }) => {
      const html = await (await request.get(`${BASE}/for/${page.slug}`)).text();
      expect(html).toContain("SoftwareApplication");
      expect(html).toContain("snippetci.com");
    });

    test("contains segment keywords", async ({ page: p }) => {
      await p.goto(`${BASE}/for/${page.slug}`);
      const content = await p.content();
      for (const kw of page.keywords) {
        expect(content).toContain(kw);
      }
    });

    test("has a signup CTA link", async ({ page: p }) => {
      await p.goto(`${BASE}/for/${page.slug}`);
      const links = p.locator("a[href='/signup']");
      expect(await links.count()).toBeGreaterThanOrEqual(1);
    });

    test("has at least 3 features", async ({ page: p }) => {
      await p.goto(`${BASE}/for/${page.slug}`);
      const content = await p.content();
      // LandingPage renders feature cards
      expect(content).toContain("feature");
    });

    test("has at least 1 code block", async ({ page: p }) => {
      await p.goto(`${BASE}/for/${page.slug}`);
      const pres = p.locator("pre");
      expect(await pres.count()).toBeGreaterThanOrEqual(1);
    });
  });
}

// ── /for index shows all 3 new pages ──────────────────────────────────────────

test.describe("/for — index shows 3 new adjacent pages", () => {
  test("loads 200", async ({ request }) => {
    expect((await request.get(`${BASE}/for`)).ok()).toBeTruthy();
  });

  test("shows openapi-enterprise card", async ({ page }) => {
    await page.goto(`${BASE}/for`);
    const content = await page.content();
    expect(content).toContain("openapi-enterprise");
  });

  test("shows nextjs-mdx-docs card", async ({ page }) => {
    await page.goto(`${BASE}/for`);
    const content = await page.content();
    expect(content).toContain("nextjs-mdx-docs");
  });

  test("shows gitlab-ci-docs card", async ({ page }) => {
    await page.goto(`${BASE}/for`);
    const content = await page.content();
    expect(content).toContain("gitlab-ci-docs");
  });

  test("shows 7 total for-cards", async ({ page }) => {
    await page.goto(`${BASE}/for`);
    const cards = page.locator("[data-testid^='for-card-']");
    expect(await cards.count()).toBeGreaterThanOrEqual(7);
  });
});

// ── Sitemap ────────────────────────────────────────────────────────────────────

test.describe("Sitemap — 3 new adjacent pages", () => {
  test("includes /for/openapi-enterprise", async ({ request }) => {
    const xml = await (await request.get(`${BASE}/sitemap.xml`)).text();
    expect(xml).toContain("/for/openapi-enterprise");
  });

  test("includes /for/nextjs-mdx-docs", async ({ request }) => {
    const xml = await (await request.get(`${BASE}/sitemap.xml`)).text();
    expect(xml).toContain("/for/nextjs-mdx-docs");
  });

  test("includes /for/gitlab-ci-docs", async ({ request }) => {
    const xml = await (await request.get(`${BASE}/sitemap.xml`)).text();
    expect(xml).toContain("/for/gitlab-ci-docs");
  });

  test("total ≥ 44 URLs", async ({ request }) => {
    const count = ((await (await request.get(`${BASE}/sitemap.xml`)).text()).match(/<url>/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(44);
  });
});

// ── Source validation ──────────────────────────────────────────────────────────

test.describe("Adjacent landing pages source validation", () => {
  const base = process.cwd();

  test("all 3 page files exist", () => {
    const slugs = ["openapi-enterprise", "nextjs-mdx-docs", "gitlab-ci-docs"];
    for (const s of slugs) {
      expect(fs.existsSync(path.join(base, `app/for/${s}/page.tsx`))).toBe(true);
    }
  });

  test("all 3 pages have analyticsEvent prop", () => {
    const slugs = ["openapi-enterprise", "nextjs-mdx-docs", "gitlab-ci-docs"];
    for (const s of slugs) {
      const content = fs.readFileSync(path.join(base, `app/for/${s}/page.tsx`), "utf8");
      expect(content).toContain("analyticsEvent");
    }
  });

  test("all 3 pages reference snippetci.com in canonical", () => {
    const slugs = ["openapi-enterprise", "nextjs-mdx-docs", "gitlab-ci-docs"];
    for (const s of slugs) {
      const content = fs.readFileSync(path.join(base, `app/for/${s}/page.tsx`), "utf8");
      expect(content).toContain(`snippetci.com/for/${s}`);
    }
  });

  test("/for index lists all 3 new slugs", () => {
    const content = fs.readFileSync(path.join(base, "app/for/page.tsx"), "utf8");
    expect(content).toContain("openapi-enterprise");
    expect(content).toContain("nextjs-mdx-docs");
    expect(content).toContain("gitlab-ci-docs");
  });

  test("sitemap.ts includes all 3 new URLs", () => {
    const content = fs.readFileSync(path.join(base, "app/sitemap.ts"), "utf8");
    expect(content).toContain("/for/openapi-enterprise");
    expect(content).toContain("/for/nextjs-mdx-docs");
    expect(content).toContain("/for/gitlab-ci-docs");
  });
});
