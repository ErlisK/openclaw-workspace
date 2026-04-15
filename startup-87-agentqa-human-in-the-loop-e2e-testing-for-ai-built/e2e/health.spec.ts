import { test, expect } from '@playwright/test';

const BYPASS = process.env.VERCEL_BYPASS_TOKEN || ''
function apiUrl(path: string) {
  return BYPASS ? `${path}?x-vercel-protection-bypass=${BYPASS}` : path
}
function bypassHeaders(): Record<string, string> {
  return BYPASS ? { Cookie: `x-vercel-protection-bypass=${BYPASS}` } : {}
}

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

  test('/api/version returns 200 with build_hash', async ({ request }) => {
    const response = await request.get(apiUrl('/api/version'), { headers: bypassHeaders() });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(typeof body.build_hash).toBe('string');
    expect(body.build_hash.length).toBeGreaterThan(0);
  });
});
