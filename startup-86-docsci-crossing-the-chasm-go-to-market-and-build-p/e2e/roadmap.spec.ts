/**
 * e2e/roadmap.spec.ts — roadmap pages tests
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE = process.env.BASE_URL || "http://localhost:3000";

test.describe("/roadmap — index", () => {
  test("returns 200", async ({ request }) => {
    expect((await request.get(`${BASE}/roadmap`)).ok()).toBeTruthy();
  });

  test("renders h1", async ({ page }) => {
    await page.goto(`${BASE}/roadmap`);
    await expect(page.locator("[data-testid='roadmap-h1']")).toBeVisible();
  });

  test("shows roadmap items list", async ({ page }) => {
    await page.goto(`${BASE}/roadmap`);
    await expect(page.locator("[data-testid='roadmap-items']")).toBeVisible();
  });

  test("shows at least 3 roadmap items", async ({ page }) => {
    await page.goto(`${BASE}/roadmap`);
    const items = page.locator("[data-testid^='roadmap-item-']");
    expect(await items.count()).toBeGreaterThanOrEqual(3);
  });

  test("links to gitlab-integration", async ({ page }) => {
    await page.goto(`${BASE}/roadmap`);
    expect(await page.content()).toContain("gitlab-integration");
  });

  test("links to customer-hosted-runner", async ({ page }) => {
    await page.goto(`${BASE}/roadmap`);
    expect(await page.content()).toContain("customer-hosted-runner");
  });

  test("links to graphql-schema-smoke-tests", async ({ page }) => {
    await page.goto(`${BASE}/roadmap`);
    expect(await page.content()).toContain("graphql-schema-smoke-tests");
  });
});

// ── Individual roadmap pages ───────────────────────────────────────────────────

const roadmapPages = [
  {
    slug: "gitlab-integration",
    h1kw: "GitLab",
    keywords: ["MR", "pipeline", "self-managed"],
    sections: ["section-current", "section-planned", "section-timeline"],
    testid: "roadmap-gitlab",
  },
  {
    slug: "customer-hosted-runner",
    h1kw: "Runner",
    keywords: ["Docker", "air-gap", "VPC"],
    sections: ["section-why", "section-github-action", "section-docker", "section-security-model", "section-timeline"],
    testid: "roadmap-runner",
  },
  {
    slug: "graphql-schema-smoke-tests",
    h1kw: "GraphQL",
    keywords: ["GraphQL", "schema", "deprecated"],
    sections: ["section-problem", "section-how", "section-config", "section-pr-comment", "section-timeline"],
    testid: "roadmap-graphql",
  },
];

for (const rp of roadmapPages) {
  test.describe(`/roadmap/${rp.slug}`, () => {
    test("returns 200", async ({ request }) => {
      expect((await request.get(`${BASE}/roadmap/${rp.slug}`)).ok()).toBeTruthy();
    });

    test("renders h1 with keyword", async ({ page }) => {
      await page.goto(`${BASE}/roadmap/${rp.slug}`);
      const h1 = page.locator("[data-testid='roadmap-h1']");
      await expect(h1).toBeVisible();
      expect(await h1.textContent()).toContain(rp.h1kw);
    });

    test("has article wrapper", async ({ page }) => {
      await page.goto(`${BASE}/roadmap/${rp.slug}`);
      await expect(page.locator("[data-testid='roadmap-article']")).toBeVisible();
    });

    test("contains segment keywords", async ({ page }) => {
      await page.goto(`${BASE}/roadmap/${rp.slug}`);
      const content = await page.content();
      for (const kw of rp.keywords) {
        expect(content).toContain(kw);
      }
    });

    test("renders all required sections", async ({ page }) => {
      await page.goto(`${BASE}/roadmap/${rp.slug}`);
      for (const s of rp.sections) {
        await expect(page.locator(`[data-testid='${s}']`)).toBeVisible();
      }
    });

    test("has at least 1 code block", async ({ page }) => {
      await page.goto(`${BASE}/roadmap/${rp.slug}`);
      expect(await page.locator("pre").count()).toBeGreaterThanOrEqual(1);
    });

    test("has a CTA link to /signup or mailto", async ({ page }) => {
      await page.goto(`${BASE}/roadmap/${rp.slug}`);
      const content = await page.content();
      expect(content.includes("/signup") || content.includes("mailto")).toBe(true);
    });

    test("links back to /roadmap", async ({ page }) => {
      await page.goto(`${BASE}/roadmap/${rp.slug}`);
      const content = await page.content();
      expect(content).toContain("/roadmap");
    });
  });
}

// ── Sitemap ────────────────────────────────────────────────────────────────────

test.describe("Sitemap — roadmap pages", () => {
  test("includes /roadmap", async ({ request }) => {
    expect(await (await request.get(`${BASE}/sitemap.xml`)).text()).toContain("/roadmap");
  });

  test("includes /roadmap/gitlab-integration", async ({ request }) => {
    expect(await (await request.get(`${BASE}/sitemap.xml`)).text()).toContain("/roadmap/gitlab-integration");
  });

  test("includes /roadmap/customer-hosted-runner", async ({ request }) => {
    expect(await (await request.get(`${BASE}/sitemap.xml`)).text()).toContain("/roadmap/customer-hosted-runner");
  });

  test("includes /roadmap/graphql-schema-smoke-tests", async ({ request }) => {
    expect(await (await request.get(`${BASE}/sitemap.xml`)).text()).toContain("/roadmap/graphql-schema-smoke-tests");
  });

  test("total ≥ 48 URLs", async ({ request }) => {
    const count = ((await (await request.get(`${BASE}/sitemap.xml`)).text()).match(/<url>/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(48);
  });
});

// ── Source validation ──────────────────────────────────────────────────────────

test.describe("Roadmap source validation", () => {
  const base = process.cwd();

  test("all 4 roadmap page files exist", () => {
    const paths = [
      "app/roadmap/page.tsx",
      "app/roadmap/gitlab-integration/page.tsx",
      "app/roadmap/customer-hosted-runner/page.tsx",
      "app/roadmap/graphql-schema-smoke-tests/page.tsx",
    ];
    for (const p of paths) {
      expect(fs.existsSync(path.join(base, p))).toBe(true);
    }
  });

  test("gitlab-integration page covers inline MR comments and self-managed", () => {
    const content = fs.readFileSync(path.join(base, "app/roadmap/gitlab-integration/page.tsx"), "utf8");
    expect(content).toContain("inline");
    expect(content).toContain("self-managed");
  });

  test("customer-hosted-runner page covers Docker and GitHub Actions composite", () => {
    const content = fs.readFileSync(path.join(base, "app/roadmap/customer-hosted-runner/page.tsx"), "utf8");
    expect(content).toContain("Docker");
    expect(content).toContain("composite");
  });

  test("graphql-schema-smoke-tests page covers deprecated fields and type mismatches", () => {
    const content = fs.readFileSync(path.join(base, "app/roadmap/graphql-schema-smoke-tests/page.tsx"), "utf8");
    expect(content).toContain("deprecated");
    expect(content).toContain("type");
  });

  test("sitemap.ts includes all 4 roadmap URLs", () => {
    const content = fs.readFileSync(path.join(base, "app/sitemap.ts"), "utf8");
    expect(content).toContain("/roadmap");
    expect(content).toContain("/roadmap/gitlab-integration");
    expect(content).toContain("/roadmap/customer-hosted-runner");
    expect(content).toContain("/roadmap/graphql-schema-smoke-tests");
  });
});
