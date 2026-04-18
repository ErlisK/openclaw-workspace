import { test, expect } from '@playwright/test'

const MOBILE_WIDTH = 375
const DESKTOP_WIDTH = 1280

const publicRoutes = ['/login', '/signup', '/pricing', '/demo', '/forgot-password']

for (const route of publicRoutes) {
  test(`${route} renders at mobile width (${MOBILE_WIDTH}px)`, async ({ page }) => {
    await page.setViewportSize({ width: MOBILE_WIDTH, height: 812 })
    await page.goto(route)
    const body = await page.locator('body')
    await expect(body).toBeVisible()
    const text = await page.textContent('body')
    expect(text?.trim().length).toBeGreaterThan(50)
  })

  test(`${route} renders at desktop width (${DESKTOP_WIDTH}px)`, async ({ page }) => {
    await page.setViewportSize({ width: DESKTOP_WIDTH, height: 900 })
    await page.goto(route)
    const body = await page.locator('body')
    await expect(body).toBeVisible()
    const text = await page.textContent('body')
    expect(text?.trim().length).toBeGreaterThan(50)
  })
}
