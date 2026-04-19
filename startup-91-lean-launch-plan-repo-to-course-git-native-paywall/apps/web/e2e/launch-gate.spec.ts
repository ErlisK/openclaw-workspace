import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'https://teachrepo.com';

test.describe('Launch Gate Checks', () => {
  test('og-image.png returns 200', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/og-image.png`);
    expect(res.status()).toBe(200);
  });

  test('favicon.ico returns 200', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/favicon.ico`);
    expect(res.status()).toBe(200);
  });

  test('apple-touch-icon.png returns 200', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/apple-touch-icon.png`);
    expect(res.status()).toBe(200);
  });

  test('/api/enroll/simulate returns 403 in production', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/enroll/simulate`, {
      data: { courseId: '00000000-0000-0000-0000-000000000000' },
    });
    // Should be 403 in production (no auth) or 403 due to production gate
    expect([403, 401]).toContain(res.status());
  });

  test('/legal/terms returns 200 with Terms heading', async ({ page }) => {
    await page.goto(`${BASE_URL}/legal/terms`);
    await expect(page.locator('h1')).toContainText('Terms of Service');
  });

  test('/legal/privacy returns 200 with Privacy heading', async ({ page }) => {
    await page.goto(`${BASE_URL}/legal/privacy`);
    await expect(page.locator('h1')).toContainText('Privacy Policy');
  });

  test('Security headers present', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/`);
    const headers = res.headers();
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
  });
});
