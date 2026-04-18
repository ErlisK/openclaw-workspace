import { test, expect } from '@playwright/test'

test('landing page (v1 — ROI-first) loads with headline', async ({ page }) => {
  await page.goto('/?v=1')
  await expect(page.locator('h1')).toContainText('real hourly rate')
  await expect(page.locator('body')).toContainText('variant 1')
})

test('landing page (v2 — time-saver) loads with headline', async ({ page }) => {
  await page.goto('/?v=2')
  await expect(page.locator('h1')).toContainText('invisible time drains')
  await expect(page.locator('body')).toContainText('variant 2')
})

test('landing page (v3 — pricing-lab) loads with headline', async ({ page }) => {
  await page.goto('/?v=3')
  await expect(page.locator('h1')).toContainText('data')
  await expect(page.locator('body')).toContainText('variant 3')
})

test('landing page defaults to v1 when no param', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toBeVisible()
  await expect(page.locator('body')).toContainText('variant 1')
})

test('landing page has signup CTAs', async ({ page }) => {
  await page.goto('/?v=1')
  const links = page.locator('a[href="/signup"]')
  await expect(links.first()).toBeVisible()
})

test('landing page has login link', async ({ page }) => {
  await page.goto('/?v=2')
  const link = page.locator('a[href="/login"]').first()
  await expect(link).toBeVisible()
})

test('landing page v3 has pricing features', async ({ page }) => {
  await page.goto('/?v=3')
  await expect(page.locator('body')).toContainText('price')
})
