import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'https://teachrepo.com';

test('Free lesson page renders content (intro-to-git)', async ({ page }) => {
  const response = await page.goto(`${BASE_URL}/courses/git-for-engineers/lessons/intro-to-git`);
  expect(response?.status()).toBe(200);
  // Page has two h1 elements (header + article) - check the first one
  await expect(page.locator('h1').first()).toBeVisible();
  await expect(page.locator('h1').first()).toContainText('Introduction to Git');
});
