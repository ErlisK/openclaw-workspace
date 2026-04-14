import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  const testEmail = `test-${Date.now()}@${process.env.AGENTMAIL_DOMAIN || 'test.com'}`;
  const testPassword = 'TestPassword123!';

  test('signup creates account and redirects to app', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('[name="email"], input[type="email"]', testEmail);
    await page.fill('[name="password"], input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    // Should redirect away from signup page
    await expect(page).not.toHaveURL(/signup/);
    // Should show authenticated content (dashboard, app, etc.)
    await expect(page.locator('body')).not.toContainText('Sign Up');
  });

  test('login with existing account works', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"], input[type="email"]', testEmail);
    await page.fill('[name="password"], input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await expect(page).not.toHaveURL(/login/);
  });

  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login|signin|signup/);
  });
});
