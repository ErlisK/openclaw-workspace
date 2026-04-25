import { test, expect } from '@playwright/test'

test('Public experiment page renders for a known slug', async ({ page }) => {
  // sample-experiment is seeded via migration 20250425000001
  const resp = await page.goto('/x/sample-experiment')
  expect(resp?.status()).toBe(200)
  await expect(page.locator('body')).toContainText(/Variant|Buy|Add to cart|Template Pack|Get Pro/i)
})

test('Demo experiment page renders', async ({ page }) => {
  const resp = await page.goto('/x/demo')
  expect(resp?.status()).toBe(200)
  await expect(page.locator('[data-testid="exp-headline"]')).toBeVisible({ timeout: 10000 })
  await expect(page.locator('[data-testid="exp-cta"]')).toBeVisible()
})

test('Unknown slug returns 404', async ({ page }) => {
  const resp = await page.goto('/x/nonexistent-slug-xyz-123')
  expect(resp?.status()).toBe(404)
})
