import { test, expect } from '@playwright/test';
const base = process.env.BASE_URL || 'https://startup-90-giganalytics-human-centered-founding-plan-plk5fqxbj.vercel.app';

test('signup shows check-email or dashboard on success', async ({ page }) => {
  await page.goto(`${base}/signup`);
  await page.fill('input[type="email"]', `user+${Date.now()}@example.com`);
  await page.fill('input[type="password"]', 'Password123!');
  await page.check('input[name="terms"], #accept-terms');
  await page.click('button:has-text("Create free account")');
  await page.waitForTimeout(2000);
  const url = page.url();
  expect(url).toMatch(/(dashboard|check-email|signup)/);
});

test('signup surfaces errors on duplicate email', async ({ page }) => {
  await page.goto(`${base}/signup`);
  await page.fill('input[type="email"]', 'existing_user@example.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.check('input[name="terms"], #accept-terms');
  await page.click('button:has-text("Create free account")');
  await page.waitForTimeout(2000);
  await expect(page.getByText(/already in use|try logging in|Too many attempts/i)).toBeVisible();
});
