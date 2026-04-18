import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://startup-90-giganalytics-human-centered-founding-plan-7q488k5oz.vercel.app';

test('homepage loads', async ({ page }) => {
  await page.goto(BASE);
  await expect(page.getByRole('link', { name: 'Get started free' })).toBeVisible();
});

test('pricing CTAs work - free to signup', async ({ page }) => {
  await page.goto(BASE + '/pricing');
  await page.getByRole('button', { name: /get started/i }).first().click();
  await expect(page).toHaveURL(/\/signup/);
});

test('pricing page loads', async ({ page }) => {
  await page.goto(BASE + '/pricing');
  await expect(page).toHaveURL(/\/pricing/);
});

test('protected route streams returns 401', async ({ page }) => {
  const res = await page.request.get(BASE + '/api/streams');
  expect(res.status()).toBe(401);
});

test('protected route user returns 401', async ({ page }) => {
  const res = await page.request.get(BASE + '/api/user');
  expect(res.status()).toBe(401);
});

test('health is minimal', async ({ page }) => {
  const res = await page.request.get(BASE + '/api/health');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toEqual({ status: 'ok' });
});

test('signup page loads', async ({ page }) => {
  await page.goto(BASE + '/signup');
  await expect(page.getByRole('button', { name: /create/i })).toBeVisible();
});

test('login page loads', async ({ page }) => {
  await page.goto(BASE + '/login');
  await expect(page).toHaveURL(/\/login/);
});
