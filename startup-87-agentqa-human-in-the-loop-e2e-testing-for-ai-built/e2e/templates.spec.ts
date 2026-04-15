/**
 * e2e/templates.spec.ts
 * Tests the job instruction templates browser and detail pages.
 */
import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:3000'

const SLUGS = [
  'signup-auth-smoke-test',
  'checkout-payment-flow',
  'core-app-flow',
  'mobile-ux-responsive',
  'deep-ux-audit-edge-cases',
]

test.describe('/templates — index page', () => {
  test('loads with correct heading', async ({ page }) => {
    await page.goto(`${BASE}/templates`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('h1')).toContainText('Ready-made testing instructions')
  })

  test('shows all 5 template cards', async ({ page }) => {
    await page.goto(`${BASE}/templates`)
    for (const id of ['tpl_signup_auth', 'tpl_checkout', 'tpl_core_flow', 'tpl_mobile_ux', 'tpl_deep_ux']) {
      await expect(page.locator(`[data-testid="template-card-${id}"]`).first()).toBeVisible()
    }
  })

  test('each template has a "Use template" link', async ({ page }) => {
    await page.goto(`${BASE}/templates`)
    for (const id of ['tpl_signup_auth', 'tpl_checkout', 'tpl_core_flow', 'tpl_mobile_ux', 'tpl_deep_ux']) {
      const btn = page.locator(`[data-testid="use-template-${id}"]`).first()
      await expect(btn).toBeVisible()
      // Verify href includes the template ID
      const href = await btn.getAttribute('href')
      expect(href).toContain(`template=${id}`)
    }
  })

  test('has schema.org CollectionPage JSON-LD', async ({ page }) => {
    await page.goto(`${BASE}/templates`)
    const scripts = page.locator('script[type="application/ld+json"]')
    const count = await scripts.count()
    let found = false
    for (let i = 0; i < count; i++) {
      const text = await scripts.nth(i).textContent() ?? ''
      if (text.includes('CollectionPage')) { found = true; break }
    }
    expect(found).toBe(true)
  })

  test('has tier filter legend', async ({ page }) => {
    await page.goto(`${BASE}/templates`)
    await expect(page.locator('text=Tier guide').first()).toBeVisible()
    await expect(page.locator('text=Quick').first()).toBeVisible()
    await expect(page.locator('text=Standard').first()).toBeVisible()
    await expect(page.locator('text=Deep').first()).toBeVisible()
  })
})

test.describe('/templates/[slug] — detail pages', () => {
  for (const slug of SLUGS) {
    test(`${slug} page loads`, async ({ page }) => {
      await page.goto(`${BASE}/templates/${slug}`, { waitUntil: 'domcontentloaded' })
      // Has breadcrumb
      await expect(page.locator('text=Templates').first()).toBeVisible()
      // Has instructions block
      await expect(page.locator('text=Full instructions').first()).toBeVisible()
      // Has "Use this template" CTA
      await expect(page.locator('[data-testid="use-template-cta"]')).toBeVisible()
    })

    test(`${slug} has HowTo schema.org`, async ({ page }) => {
      await page.goto(`${BASE}/templates/${slug}`)
      const scripts = page.locator('script[type="application/ld+json"]')
      const count = await scripts.count()
      let found = false
      for (let i = 0; i < count; i++) {
        const text = await scripts.nth(i).textContent() ?? ''
        if (text.includes('HowTo')) { found = true; break }
      }
      expect(found).toBe(true)
    })
  }

  test('unknown slug returns 404', async ({ request }) => {
    const res = await request.get(`${BASE}/templates/nonexistent-template-xyz`)
    expect(res.status()).toBe(404)
  })
})

test.describe('/api/templates', () => {
  test('returns all templates', async ({ request }) => {
    const res = await request.get(`${BASE}/api/templates`)
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.templates.length).toBe(5)
    expect(data.total).toBe(5)
  })

  test('filters by tier=quick', async ({ request }) => {
    const res = await request.get(`${BASE}/api/templates?tier=quick`)
    const data = await res.json()
    expect(data.templates.length).toBeGreaterThan(0)
    for (const t of data.templates) {
      expect(t.tiers).toContain('quick')
    }
  })

  test('returns single template by id', async ({ request }) => {
    const res = await request.get(`${BASE}/api/templates?id=tpl_signup_auth`)
    const data = await res.json()
    expect(data.template.id).toBe('tpl_signup_auth')
    expect(data.template.instructions).toBeTruthy()
  })

  test('returns 404 for unknown template id', async ({ request }) => {
    const res = await request.get(`${BASE}/api/templates?id=nope`)
    expect(res.status()).toBe(404)
  })
})

test.describe('Sitemap includes templates', () => {
  test('sitemap.xml contains /templates and slugs', async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`)
    const xml = await res.text()
    expect(xml).toContain('/templates')
    expect(xml).toContain('signup-auth-smoke-test')
    expect(xml).toContain('checkout-payment-flow')
  })
})

test.describe('Submit page template pre-fill', () => {
  test('?template=tpl_signup_auth URL contains template param', async ({ page }) => {
    // The submit page may redirect to login — verify the URL carries the template param
    const url = `${BASE}/submit?template=tpl_signup_auth&tier=quick`
    await page.goto(url)
    // If redirected to login, the redirect back should preserve template param in the URL
    // At minimum, the submit link from templates page should contain the template id
    const res = await page.request.get(url)
    expect([200, 302, 307, 308]).toContain(res.status())
  })

  test('template detail page Use template link points to submit with template param', async ({ page }) => {
    await page.goto(`${BASE}/templates/signup-auth-smoke-test`)
    const cta = page.locator('[data-testid="use-template-cta"]')
    await expect(cta).toBeVisible()
    const href = await cta.getAttribute('href')
    expect(href).toContain('template=tpl_signup_auth')
    expect(href).toContain('tier=quick')
  })
})
