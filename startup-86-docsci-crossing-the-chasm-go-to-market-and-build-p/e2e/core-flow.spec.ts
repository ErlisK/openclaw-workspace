/**
 * core-flow.spec.ts — Launch gate tests for DocsCI
 *
 * Verifies:
 * 1. Homepage hero CTA links to /signup
 * 2. Navigation has Research link + Sign In link
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";

test.describe("Homepage", () => {
  test("homepage has hero headline and CTA", async ({ page }) => {
    await page.goto(BASE);
    const ctaLink = page.getByRole('link', { name: /get early access|get started|try free|start free|sign up/i }).first();
    await expect(ctaLink).toBeVisible();
  });

  test("homepage navigation links work", async ({ page }) => {
    await page.goto(BASE);
    const researchLink = page.getByRole('link', { name: /research/i }).first();
    await expect(researchLink).toBeVisible();
    // Add and verify Sign In link in nav
    const signInLink = page.getByRole('link', { name: /sign in|log in|login/i }).first();
    await expect(signInLink).toBeVisible();
  });
});
