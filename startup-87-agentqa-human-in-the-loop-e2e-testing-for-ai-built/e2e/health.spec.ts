import { test, expect } from '@playwright/test';

test.describe('Deployment Health', () => {
  test('homepage loads without errors', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('no console errors on homepage', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForTimeout(2000);
    // Ignore favicon errors — they're cosmetic
    expect(errors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
  });

  test('API routes respond', async ({ request }) => {
    // Adjust paths based on your actual API routes
    const response = await request.get('/api/health');
    expect(response.status()).toBeLessThan(500);
  });
});
