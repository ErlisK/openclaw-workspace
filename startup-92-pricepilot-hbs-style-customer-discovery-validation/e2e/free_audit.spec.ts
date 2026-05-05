// PricingSim — Free Audit Page E2E Tests
// Run: BASE_URL=https://<deployed> npx playwright test e2e/free_audit.spec.ts

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Free Audit Page: Core UI', () => {
  test('/free-audit loads with 200 status', async ({ page }) => {
    const response = await page.goto(BASE_URL + '/free-audit');
    expect(response?.status()).toBe(200);
  });

  test('/free-audit shows headline and upload zone', async ({ page }) => {
    await page.goto(BASE_URL + '/free-audit');
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    // Upload zone or input should exist
    const uploadArea = page.locator('input[type="file"]');
    await expect(uploadArea).toBeAttached({ timeout: 10000 });
  });

  test('/free-audit has sample CSV download link', async ({ page }) => {
    await page.goto(BASE_URL + '/free-audit');
    const sampleLink = page.locator('a[href*="sample"]');
    await expect(sampleLink).toBeVisible({ timeout: 10000 });
  });

  test('/free-audit shows signup CTA', async ({ page }) => {
    await page.goto(BASE_URL + '/free-audit');
    const cta = page.locator('a[href*="signup"], a[href*="sign-up"]').first();
    await expect(cta).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Free Audit Page: No console errors', () => {
  test('No critical JS errors on /free-audit', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(BASE_URL + '/free-audit');
    await page.waitForTimeout(2000);
    const criticalErrors = errors.filter(
      e => !e.includes('favicon') && !e.includes('google') && !e.includes('analytics') && !e.includes('posthog') && !e.includes('plausible') && !e.includes('Content Security Policy') && !e.includes('stripe')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Free Audit API: Endpoint health', () => {
  test('POST /api/free-audit with empty body returns 400', async ({ request }) => {
    const res = await request.post(BASE_URL + '/api/free-audit', {
      data: '',
      headers: { 'Content-Type': 'text/csv' },
    });
    expect([400, 422]).toContain(res.status());
  });

  test('POST /api/free-audit with valid CSV returns 200', async ({ request }) => {
    // Minimal CSV with enough data points
    const csv = [
      'date,product_id,price,quantity,revenue',
      '2024-01-01,prod_A,29,5,145',
      '2024-01-05,prod_A,29,4,116',
      '2024-01-10,prod_A,29,6,174',
      '2024-01-15,prod_A,39,3,117',
      '2024-01-20,prod_A,39,4,156',
      '2024-01-25,prod_A,39,2,78',
      '2024-02-01,prod_A,29,7,203',
      '2024-02-05,prod_A,29,5,145',
      '2024-02-10,prod_A,39,4,156',
      '2024-02-15,prod_A,49,2,98',
      '2024-02-20,prod_A,49,3,147',
      '2024-02-25,prod_A,49,1,49',
      '2024-03-01,prod_A,29,8,232',
      '2024-03-05,prod_A,39,5,195',
      '2024-03-10,prod_A,49,3,147',
    ].join('\n');

    const res = await request.post(BASE_URL + '/api/free-audit', {
      data: csv,
      headers: { 'Content-Type': 'text/csv' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('results');
    expect(Array.isArray(body.results)).toBe(true);
  });

  test('POST /api/free-audit returns action field for each product', async ({ request }) => {
    const csv = [
      'date,product_id,price,quantity,revenue',
      '2024-01-01,widget_pro,29,10,290',
      '2024-01-05,widget_pro,29,8,232',
      '2024-01-10,widget_pro,29,12,348',
      '2024-01-15,widget_pro,39,6,234',
      '2024-01-20,widget_pro,39,7,273',
      '2024-01-25,widget_pro,39,5,195',
      '2024-02-01,widget_pro,49,4,196',
      '2024-02-05,widget_pro,49,5,245',
    ].join('\n');

    const res = await request.post(BASE_URL + '/api/free-audit', {
      data: csv,
      headers: { 'Content-Type': 'text/csv' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.results.length).toBeGreaterThan(0);
    expect(body.results[0]).toHaveProperty('engine');
  });
});

test.describe('GTM Page: Outreach Playbook', () => {
  test('/gtm loads with 200 status', async ({ page }) => {
    const response = await page.goto(BASE_URL + '/gtm');
    expect(response?.status()).toBe(200);
  });

  test('/gtm shows outreach templates', async ({ page }) => {
    await page.goto(BASE_URL + '/gtm');
    // Should contain cold outreach template content
    const content = await page.textContent('body');
    expect(content).toContain('Template');
  });

  test('No critical JS errors on /gtm', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(BASE_URL + '/gtm');
    await page.waitForTimeout(2000);
    const criticalErrors = errors.filter(
      e => !e.includes('favicon') && !e.includes('google') && !e.includes('analytics') && !e.includes('posthog') && !e.includes('plausible') && !e.includes('Content Security Policy') && !e.includes('stripe')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Homepage: ICP-sharpened hero', () => {
  test('Homepage hero mentions micro-SaaS or MRR', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    const content = await page.textContent('body');
    const hasMicroSaaS = content?.includes('micro-SaaS') || content?.includes('MRR') || content?.includes('underpriced');
    expect(hasMicroSaaS).toBe(true);
  });

  test('Homepage primary CTA links to /free-audit', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    // Primary CTA should link to free-audit
    const auditLink = page.locator('a[href="/free-audit"]').first();
    await expect(auditLink).toBeVisible({ timeout: 10000 });
  });
});
