import { test, expect } from '@playwright/test';
const BASE = process.env.BASE_URL || 'https://startup-85-licensecomposer-yc-pg-style-founding-plan-ibjxw5jcq.vercel.app';

test('signup form fields visible', async ({ page }) => {
  await page.goto(BASE + '/signup');
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /create free account/i })).toBeVisible();
});

test('signup submit button stable after fill', async ({ page }) => {
  await page.goto(BASE + '/signup');
  await page.locator('input[type="email"]').fill('test@example.com');
  await page.locator('input[type="password"]').fill('TestPassword123!');
  await page.getByRole('button', { name: /create free account/i }).click({ timeout: 8000 });
  const body = await page.content();
  expect(body).not.toContain('Application error');
});

test('login form fields visible', async ({ page }) => {
  await page.goto(BASE + '/login');
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
});

test('health endpoint returns ok', async ({ page }) => {
  const resp = await page.goto(BASE + '/api/health');
  expect(resp?.status()).toBe(200);
  const body = await page.content();
  expect(body).toContain('"ok"');
});
