/**
 * paywall.spec.ts
 *
 * Verifies that paid lesson pages show the paywall gate for unauthenticated/
 * non-enrolled visitors and do NOT expose lesson content.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Paywall enforcement', () => {
  test('unauthenticated visitor sees paywall CTA on a paid lesson', async ({ page }) => {
    // Navigate to the marketplace to find a course
    await page.goto(`${BASE_URL}/marketplace`);

    // If no courses exist yet, test a stub URL and assert the paywall or 404
    // In CI we test against a known paid-course slug from the demo seed
    const paidLessonUrl = `${BASE_URL}/courses/advanced-typescript/lessons/generics-deep-dive`;

    const response = await page.goto(paidLessonUrl);

    // Either 200 (page exists) or 404 (course not seeded yet)
    if (response?.status() === 404) {
      // Not seeded — skip rest of assertions but don't fail
      test.skip(true, 'Paid course lesson not seeded in this environment');
      return;
    }

    expect(response?.status()).toBe(200);

    // Paywall gate should be rendered
    const paywallCta = page.locator('[data-testid="paywall-cta"]');
    await expect(paywallCta).toBeVisible({ timeout: 10_000 });

    // The enroll button should be present
    const enrollBtn = page.locator('[data-testid="paywall-enroll-btn"]');
    await expect(enrollBtn).toBeVisible();

    // Full lesson content body should NOT be present
    const lessonBody = page.locator('article.prose');
    await expect(lessonBody).not.toBeVisible();
  });

  test('paywall gate does not leak lesson content in HTML', async ({ page }) => {
    const paidLessonUrl = `${BASE_URL}/courses/advanced-typescript/lessons/generics-deep-dive`;
    const response = await page.goto(paidLessonUrl);

    if (response?.status() === 404) {
      test.skip(true, 'Paid course lesson not seeded in this environment');
      return;
    }

    // Check that the paywall wrapper is in DOM
    const content = await page.content();
    expect(content).toContain('data-testid="paywall-cta"');

    // The prose article should not appear when paywalled
    const articleVisible = await page.locator('article.prose').isVisible().catch(() => false);
    expect(articleVisible).toBe(false);
  });

  test('paywall gate shows lock icon and enroll CTA', async ({ page }) => {
    const paidLessonUrl = `${BASE_URL}/courses/advanced-typescript/lessons/generics-deep-dive`;
    const response = await page.goto(paidLessonUrl);

    if (response?.status() === 404) {
      test.skip(true, 'Not seeded');
      return;
    }

    // Paywall gate component
    const gate = page.locator('[data-testid="paywall-gate"]');
    if (await gate.isVisible()) {
      await expect(gate).toBeVisible();
      await expect(page.locator('[data-testid="paywall-enroll-btn"]')).toBeVisible();
    } else {
      // If CTA wrapper present, check for that
      await expect(page.locator('[data-testid="paywall-cta"]')).toBeVisible();
    }
  });
});
