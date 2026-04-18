import { test, expect } from '@playwright/test';
const base = process.env.BASE_URL || 'https://startup-90-giganalytics-human-centered-founding-plan-plk5fqxbj.vercel.app';

test('customer portal returns 401 when unauthenticated', async ({ request }) => {
  const res = await request.post(`${base}/api/customer-portal`, { data: {} });
  expect(res.status()).toBe(401);
});

test('insights API returns 401 when unauthenticated', async ({ request }) => {
  const res = await request.get(`${base}/api/insights`);
  expect(res.status()).toBe(401);
  const body = await res.json();
  expect(body.error).toBe('Unauthorized');
});
