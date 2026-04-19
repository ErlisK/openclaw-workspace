import { test, expect } from '@playwright/test';

test.describe('Responsive layout', () => {
  test('homepage renders at mobile viewport (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
    // Use specific role+name selector to avoid strict-mode violation
    await expect(page.getByRole('link', { name: '📚 TeachRepo' }).first()).toBeVisible();
  });
});
