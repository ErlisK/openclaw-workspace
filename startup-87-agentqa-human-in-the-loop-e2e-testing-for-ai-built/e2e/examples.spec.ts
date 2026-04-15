/**
 * e2e/examples.spec.ts
 * Tests the developer examples docs pages and sample report
 */
import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:3000'

test.describe('Developer Examples — /docs/examples', () => {
  test('index page loads with all 3 examples', async ({ page }) => {
    await page.goto(`${BASE}/docs/examples`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('h1')).toContainText('Developer Examples')
    await expect(page.locator('text=Node.js Quickstart')).toBeVisible()
    await expect(page.locator('text=TypeScript Pipeline')).toBeVisible()
    await expect(page.locator('text=Webhook Receiver')).toBeVisible()
  })

  test('node-quickstart page loads with code', async ({ page }) => {
    await page.goto(`${BASE}/docs/examples/node-quickstart`)
    await expect(page.locator('h1')).toContainText('Node.js Quickstart')
    await expect(page.locator('pre').first()).toBeVisible()
    // GitHub link present
    await expect(page.locator('a[href*="github.com"]')).toBeVisible()
  })

  test('typescript-pipeline page loads', async ({ page }) => {
    await page.goto(`${BASE}/docs/examples/typescript-pipeline`)
    await expect(page.locator('h1')).toContainText('TypeScript Pipeline')
    await expect(page.locator('text=AgentQAClient')).toBeVisible()
    await expect(page.locator('text=assertJobQuality')).toBeVisible()
  })

  test('webhook-receiver page loads', async ({ page }) => {
    await page.goto(`${BASE}/docs/examples/webhook-receiver`)
    await expect(page.locator('h1')).toContainText('Webhook Receiver')
    await expect(page.locator('text=job.completed')).toBeVisible()
    await expect(page.locator('text=X-AgentQA-Signature')).toBeVisible()
  })
})

test.describe('Sample Report — /examples/sample-report', () => {
  test('page loads with all sections', async ({ page }) => {
    await page.goto(`${BASE}/examples/sample-report`)
    await expect(page.locator('h1')).toContainText('Sample Test Report')

    // Rating section
    await expect(page.locator('text=4 / 5')).toBeVisible()

    // Bugs section
    await expect(page.locator('text=Bugs Found')).toBeVisible()
    await expect(page.locator('text=high').first()).toBeVisible()

    // Network log
    await expect(page.locator('text=Network Log')).toBeVisible()

    // Console log
    await expect(page.locator('text=Console Log')).toBeVisible()

    // Raw JSON
    await expect(page.locator('text=Raw JSON')).toBeVisible()
  })

  test('sample report has CTA link to signup', async ({ page }) => {
    await page.goto(`${BASE}/examples/sample-report`)
    const cta = page.locator('a[href*="/signup"]').first()
    await expect(cta).toBeVisible()
  })

  test('JSON section contains bug data', async ({ page }) => {
    await page.goto(`${BASE}/examples/sample-report`)
    const pre = page.locator('pre').last()
    const text = await pre.textContent()
    expect(text).toContain('job_demo_abc123')
    expect(text).toContain('complete')
    expect(text).toContain('network_log_url')
  })
})

test.describe('Sitemap includes examples', () => {
  test('sitemap.xml contains examples routes', async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`)
    expect(res.status()).toBe(200)
    const xml = await res.text()
    expect(xml).toContain('/docs/examples')
    expect(xml).toContain('/examples/sample-report')
  })
})

test.describe('API Quickstart links to examples', () => {
  test('api-quickstart page has examples links', async ({ page }) => {
    await page.goto(`${BASE}/docs/api-quickstart`)
    await expect(page.locator('a[href="/docs/examples/node-quickstart"]')).toBeVisible()
    await expect(page.locator('a[href="/examples/sample-report"]')).toBeVisible()
  })
})
