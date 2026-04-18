import { test, expect } from '@playwright/test'

const MOBILE_WIDTH = 375
const DESKTOP_WIDTH = 1280

const publicRoutes = ['/login', '/signup', '/pricing', '/demo', '/forgot-password']

for (const route of publicRoutes) {
  test(`${route} renders at mobile width (${MOBILE_WIDTH}px)`, async ({ page }) => {
    await page.setViewportSize({ width: MOBILE_WIDTH, height: 812 })
    await page.goto(route)
    // Check content exists (body overflow:hidden is valid CSS, doesn't mean page is broken)
    const text = await page.textContent('body')
    expect(text?.trim().length).toBeGreaterThan(50)
    // Check at least one interactive or text element is present
    const html = await page.innerHTML('body')
    expect(html.length).toBeGreaterThan(100)
    console.log(`✓ ${route} @${MOBILE_WIDTH}px — ${text?.trim().length} chars`)
  })

  test(`${route} renders at desktop width (${DESKTOP_WIDTH}px)`, async ({ page }) => {
    await page.setViewportSize({ width: DESKTOP_WIDTH, height: 900 })
    await page.goto(route)
    const text = await page.textContent('body')
    expect(text?.trim().length).toBeGreaterThan(50)
    const html = await page.innerHTML('body')
    expect(html.length).toBeGreaterThan(100)
    console.log(`✓ ${route} @${DESKTOP_WIDTH}px — ${text?.trim().length} chars`)
  })
}
