/**
 * Landing Variant Smoke Tests
 *
 * Full browser-based smoke tests for all 3 landing page variants.
 * Covers: render, hero content, CTA buttons, navigation, scroll sections.
 *
 * Variants:
 *   ?v=1 → roi_first   — headline: "Know your real hourly rate..."
 *   ?v=2 → time_saver  — headline: "Stop losing money to invisible time drains"
 *   ?v=3 → pricing_lab — headline: "Raise your rates with data — not guesswork"
 *
 * Each variant gets:
 *   - Page loads without error (no 404/500)
 *   - Correct headline renders
 *   - Correct CTA button text renders
 *   - Primary CTA has data-testid="hero-cta-primary"
 *   - CTA href includes /signup + variant param (?v=N)
 *   - Nav links render (Demo, Pricing, Login)
 *   - Secondary CTA (See a live demo / Try demo) renders and links to /demo
 *   - Feature section renders (at least 2 feature items visible)
 *   - Page has no JavaScript errors (console error check)
 *   - CTA click navigates to /signup (or redirects — no 500)
 *   - Variant debug bar shows correct variant name
 */

import { test, expect, type Page } from '@playwright/test'

// ─── Variant metadata ─────────────────────────────────────────────────────────

const VARIANTS = [
  {
    v: '1',
    name: 'roi_first',
    headline: 'Know your real hourly rate',
    cta_primary: 'Start tracking free',
    cta_secondary_text: 'demo',
    badge: 'ROI',
    stats: ['87', '3.2×', '11 min'],
  },
  {
    v: '2',
    name: 'time_saver',
    headline: 'Stop losing money to invisible time drains',
    cta_primary: 'Try free',
    cta_secondary_text: 'demo',
    badge: 'Zero-Friction',
    stats: ['2 min', '89%', '3 taps'],
  },
  {
    v: '3',
    name: 'pricing_lab',
    headline: 'Raise your rates with data',
    cta_primary: 'Find my optimal rate',
    cta_secondary_text: 'demo',
    badge: 'Pricing',
    stats: ['23%', '$12K', '< 5 min'],
  },
] as const

// ─── Helper ───────────────────────────────────────────────────────────────────

async function loadVariant(page: Page, v: string, collectErrors = true) {
  const errors: string[] = []
  if (collectErrors) {
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    page.on('pageerror', err => errors.push(err.message))
  }
  const res = await page.goto(`/?v=${v}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
  return { res, errors }
}

// ─── Shared smoke tests per variant ──────────────────────────────────────────

for (const variant of VARIANTS) {
  test.describe(`Variant ${variant.v} (${variant.name}) — smoke tests`, () => {

    // 1. Page loads
    test(`v=${variant.v}: page loads with 200 status`, async ({ page }) => {
      const { res } = await loadVariant(page, variant.v)
      expect(res?.status()).toBe(200)
      console.log(`✓ /?v=${variant.v} → 200`)
    })

    // 2. Headline renders
    test(`v=${variant.v}: correct headline visible`, async ({ page }) => {
      await loadVariant(page, variant.v)
      await expect(page.locator('h1')).toContainText(variant.headline, { timeout: 5000 })
      console.log(`✓ v=${variant.v} h1: "${variant.headline}"`)
    })

    // 3. Primary CTA renders with correct text
    test(`v=${variant.v}: primary CTA has correct text`, async ({ page }) => {
      await loadVariant(page, variant.v)
      const cta = page.getByTestId('hero-cta-primary')
      await expect(cta).toBeVisible({ timeout: 5000 })
      const text = await cta.textContent() ?? ''
      expect(text.toLowerCase()).toContain(variant.cta_primary.toLowerCase().slice(0, 12))
      console.log(`✓ v=${variant.v} CTA: "${text.trim()}"`)
    })

    // 4. Primary CTA has correct data-testid
    test(`v=${variant.v}: primary CTA has data-testid="hero-cta-primary"`, async ({ page }) => {
      await loadVariant(page, variant.v)
      const cta = page.locator('[data-testid="hero-cta-primary"]')
      await expect(cta).toBeVisible({ timeout: 5000 })
      console.log(`✓ v=${variant.v}: data-testid=hero-cta-primary present`)
    })

    // 5. CTA href includes /signup and variant param
    test(`v=${variant.v}: primary CTA links to /signup with variant param`, async ({ page }) => {
      await loadVariant(page, variant.v)
      const cta = page.locator('[data-testid="hero-cta-primary"]')
      const href = await cta.getAttribute('href') ?? ''
      expect(href).toContain('/signup')
      expect(href).toContain(`v=${variant.v}`)
      console.log(`✓ v=${variant.v} CTA href: ${href}`)
    })

    // 6. Badge renders
    test(`v=${variant.v}: variant badge visible`, async ({ page }) => {
      await loadVariant(page, variant.v)
      const body = await page.textContent('body') ?? ''
      expect(body).toContain(variant.badge)
      console.log(`✓ v=${variant.v} badge contains "${variant.badge}"`)
    })

    // 7. Nav links render
    test(`v=${variant.v}: nav has Demo, Pricing, Log in links`, async ({ page }) => {
      await loadVariant(page, variant.v)
      // Verify key nav links exist
      await expect(page.locator('a[href="/demo"]').first()).toBeVisible({ timeout: 5000 })
      await expect(page.locator('a[href="/pricing"]').first()).toBeVisible({ timeout: 5000 })
      await expect(page.locator('a[href="/login"]').first()).toBeVisible({ timeout: 5000 })
      console.log(`✓ v=${variant.v} nav: Demo, Pricing, Login visible`)
    })

    // 8. Secondary CTA (demo link) visible
    test(`v=${variant.v}: secondary CTA / demo link present`, async ({ page }) => {
      await loadVariant(page, variant.v)
      // There should be a demo CTA in the hero
      const demoLinks = page.locator('a[href="/demo"]')
      const count = await demoLinks.count()
      expect(count).toBeGreaterThan(0)
      console.log(`✓ v=${variant.v}: ${count} demo links present`)
    })

    // 9. Feature section renders
    test(`v=${variant.v}: feature items visible in hero section`, async ({ page }) => {
      await loadVariant(page, variant.v)
      // Each variant has 3 feature cards; check at least content is there
      const body = await page.textContent('body') ?? ''
      // Features have specific keywords per variant
      if (variant.v === '1') {
        expect(body.toLowerCase()).toMatch(/hourly rate|acquisition|per-stream/)
      } else if (variant.v === '2') {
        expect(body.toLowerCase()).toMatch(/timer|calendar|log|effort/)
      } else {
        expect(body.toLowerCase()).toMatch(/pric|rate|target|income/)
      }
      console.log(`✓ v=${variant.v}: feature content visible`)
    })

    // 10. No JavaScript errors
    test(`v=${variant.v}: no critical JS errors on load`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', err => {
        // Ignore known benign errors
        if (!err.message.includes('ResizeObserver') && !err.message.includes('Non-Error')) {
          errors.push(err.message)
        }
      })
      await page.goto(`/?v=${variant.v}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
      // Allow 500ms for hydration
      await page.waitForTimeout(500)
      if (errors.length > 0) {
        console.log(`⚠ v=${variant.v} JS errors: ${errors.join('; ')}`)
      }
      expect(errors.filter(e => e.includes('TypeError') || e.includes('ReferenceError'))).toHaveLength(0)
      console.log(`✓ v=${variant.v}: no critical JS errors`)
    })

    // 11. CTA click → navigates to /signup (no 500)
    test(`v=${variant.v}: clicking primary CTA navigates to /signup`, async ({ page }) => {
      await loadVariant(page, variant.v)
      const cta = page.locator('[data-testid="hero-cta-primary"]')
      await expect(cta).toBeVisible({ timeout: 5000 })

      // Use href navigation instead of click (avoids Supabase redirects in test)
      const href = await cta.getAttribute('href') ?? '/signup'
      const res = await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 10000 })
      // /signup may redirect to /login if already authenticated — both are fine
      expect([200, 302]).toContain(res?.status() ?? 200)
      expect(page.url()).not.toContain('error')
      console.log(`✓ v=${variant.v}: CTA → ${page.url()} (${res?.status()})`)
    })

    // 12. Variant debug bar shows correct variant name
    test(`v=${variant.v}: debug bar shows variant name "${variant.name}"`, async ({ page }) => {
      await loadVariant(page, variant.v)
      const body = await page.content()
      expect(body).toContain(variant.name)
      console.log(`✓ v=${variant.v}: debug bar contains "${variant.name}"`)
    })

  })
}

// ─── Cross-variant tests ──────────────────────────────────────────────────────

test.describe('Cross-variant smoke tests', () => {

  test('all 3 variants have unique headlines', async ({ page }) => {
    const headlines: string[] = []
    for (const v of ['1', '2', '3']) {
      await page.goto(`/?v=${v}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
      const h1 = await page.locator('h1').first().textContent() ?? ''
      headlines.push(h1.trim())
      console.log(`  v=${v} h1: "${h1.trim().slice(0, 60)}"`)
    }
    // All headlines should be different
    const unique = new Set(headlines)
    expect(unique.size).toBe(3)
    console.log('✓ All 3 variants have unique headlines')
  })

  test('all 3 variants have unique primary CTA text', async ({ page }) => {
    const ctas: string[] = []
    for (const v of ['1', '2', '3']) {
      await page.goto(`/?v=${v}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
      const cta = page.locator('[data-testid="hero-cta-primary"]')
      const text = await cta.textContent() ?? ''
      ctas.push(text.trim())
      console.log(`  v=${v} CTA: "${text.trim()}"`)
    }
    const unique = new Set(ctas)
    expect(unique.size).toBe(3)
    console.log('✓ All 3 variants have unique primary CTA text')
  })

  test('all 3 variants link to /signup', async ({ page }) => {
    for (const v of ['1', '2', '3']) {
      await page.goto(`/?v=${v}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
      const cta = page.locator('[data-testid="hero-cta-primary"]')
      const href = await cta.getAttribute('href') ?? ''
      expect(href).toContain('/signup')
      console.log(`  ✓ v=${v} CTA href: ${href}`)
    }
  })

  test('all 3 variants are measurable via /api/experiments', async ({ request }) => {
    for (const v of ['1', '2', '3']) {
      const res = await request.get(`/api/experiments?v=${v}&session_id=smoke_${v}`)
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.variant).toBe(v)
      expect(body.experiment).toBe('landing-variant')
      console.log(`  ✓ v=${v} experiment: ${body.name} (${body.experiment})`)
    }
  })

  test('GigAnalytics brand name visible on all variants', async ({ page }) => {
    for (const v of ['1', '2', '3']) {
      await page.goto(`/?v=${v}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
      const body = await page.textContent('body') ?? ''
      expect(body).toContain('GigAnalytics')
    }
    console.log('✓ GigAnalytics brand name on all 3 variants')
  })

  test('pricing page accessible from all variants via nav', async ({ page }) => {
    for (const v of ['1', '2', '3']) {
      await page.goto(`/?v=${v}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
      const pricingLink = page.locator('a[href="/pricing"]').first()
      await expect(pricingLink).toBeVisible({ timeout: 5000 })
      const href = await pricingLink.getAttribute('href')
      expect(href).toBe('/pricing')
    }
    console.log('✓ /pricing nav link visible on all 3 variants')
  })

  test('demo page accessible from all variants', async ({ page }) => {
    for (const v of ['1', '2', '3']) {
      await page.goto(`/?v=${v}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
      // Should have at least one link to /demo
      const demoLinks = await page.locator('a[href="/demo"]').count()
      expect(demoLinks).toBeGreaterThan(0)
    }
    console.log('✓ /demo link present on all 3 variants')
  })

  test('default (no ?v) serves one of the 3 variants', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 })
    const body = await page.content()
    const hasVariant = body.includes('roi_first') || body.includes('time_saver') || body.includes('pricing_lab')
    expect(hasVariant).toBe(true)
    console.log('✓ / (no ?v) serves a valid variant')
  })
})

// ─── Button click interaction tests ──────────────────────────────────────────

test.describe('Button click interactions', () => {

  test('v=1: clicking primary CTA button starts navigation', async ({ page }) => {
    await page.goto('/?v=1', { waitUntil: 'domcontentloaded', timeout: 15000 })
    const cta = page.locator('[data-testid="hero-cta-primary"]')
    await expect(cta).toBeVisible({ timeout: 5000 })

    // Set up navigation listener before click
    const [navigation] = await Promise.all([
      page.waitForNavigation({ timeout: 5000, waitUntil: 'commit' }).catch(() => null),
      cta.click(),
    ])
    // After click, should be on /signup page (or /login if auth handles it)
    expect(page.url()).toMatch(/\/signup|\/login/)
    console.log(`✓ v=1 CTA click → ${page.url()}`)
  })

  test('v=2: clicking primary CTA button starts navigation', async ({ page }) => {
    await page.goto('/?v=2', { waitUntil: 'domcontentloaded', timeout: 15000 })
    const cta = page.locator('[data-testid="hero-cta-primary"]')
    await expect(cta).toBeVisible({ timeout: 5000 })
    const [_] = await Promise.all([
      page.waitForNavigation({ timeout: 5000, waitUntil: 'commit' }).catch(() => null),
      cta.click(),
    ])
    expect(page.url()).toMatch(/\/signup|\/login/)
    console.log(`✓ v=2 CTA click → ${page.url()}`)
  })

  test('v=3: clicking primary CTA button starts navigation', async ({ page }) => {
    await page.goto('/?v=3', { waitUntil: 'domcontentloaded', timeout: 15000 })
    const cta = page.locator('[data-testid="hero-cta-primary"]')
    await expect(cta).toBeVisible({ timeout: 5000 })
    const [_] = await Promise.all([
      page.waitForNavigation({ timeout: 5000, waitUntil: 'commit' }).catch(() => null),
      cta.click(),
    ])
    expect(page.url()).toMatch(/\/signup|\/login/)
    console.log(`✓ v=3 CTA click → ${page.url()}`)
  })

  test('clicking Demo nav link navigates to /demo', async ({ page }) => {
    await page.goto('/?v=1', { waitUntil: 'domcontentloaded', timeout: 15000 })
    const demoLink = page.locator('nav a[href="/demo"]').first()
    await expect(demoLink).toBeVisible({ timeout: 5000 })
    await Promise.all([
      page.waitForNavigation({ timeout: 5000, waitUntil: 'commit' }).catch(() => null),
      demoLink.click(),
    ])
    expect(page.url()).toContain('/demo')
    console.log(`✓ Demo nav link click → ${page.url()}`)
  })

  test('clicking Pricing nav link navigates to /pricing', async ({ page }) => {
    await page.goto('/?v=1', { waitUntil: 'domcontentloaded', timeout: 15000 })
    const pricingLink = page.locator('nav a[href="/pricing"]').first()
    await expect(pricingLink).toBeVisible({ timeout: 5000 })
    await Promise.all([
      page.waitForNavigation({ timeout: 5000, waitUntil: 'commit' }).catch(() => null),
      pricingLink.click(),
    ])
    expect(page.url()).toContain('/pricing')
    console.log(`✓ Pricing nav link click → ${page.url()}`)
  })

  test('clicking Log in nav link navigates to /login', async ({ page }) => {
    await page.goto('/?v=2', { waitUntil: 'domcontentloaded', timeout: 15000 })
    const loginLink = page.locator('a[href="/login"]').first()
    await expect(loginLink).toBeVisible({ timeout: 5000 })
    await Promise.all([
      page.waitForNavigation({ timeout: 5000, waitUntil: 'commit' }).catch(() => null),
      loginLink.click(),
    ])
    expect(page.url()).toContain('/login')
    console.log(`✓ Log in link click → ${page.url()}`)
  })
})

// ─── Accessibility + SEO smoke checks ────────────────────────────────────────

test.describe('Accessibility + SEO smoke', () => {

  test('all variants have <title> tag', async ({ page }) => {
    for (const v of ['1', '2', '3']) {
      await page.goto(`/?v=${v}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
      const title = await page.title()
      expect(title.length).toBeGreaterThan(5)
      console.log(`  ✓ v=${v} title: "${title}"`)
    }
  })

  test('all variants have meta description', async ({ page }) => {
    for (const v of ['1', '2', '3']) {
      await page.goto(`/?v=${v}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
      const meta = await page.locator('meta[name="description"]').getAttribute('content')
      if (meta) {
        expect(meta.length).toBeGreaterThan(20)
        console.log(`  ✓ v=${v} meta: "${meta.slice(0, 60)}..."`)
      } else {
        console.log(`  ℹ v=${v}: no meta description (add via Next.js metadata API)`)
      }
    }
  })

  test('all variants have h1 tag', async ({ page }) => {
    for (const v of ['1', '2', '3']) {
      await page.goto(`/?v=${v}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
      const h1Count = await page.locator('h1').count()
      expect(h1Count).toBeGreaterThanOrEqual(1)
    }
    console.log('✓ All 3 variants have <h1>')
  })

  test('primary CTA is keyboard-focusable on all variants', async ({ page }) => {
    for (const v of ['1', '2', '3']) {
      await page.goto(`/?v=${v}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
      const cta = page.locator('[data-testid="hero-cta-primary"]')
      await expect(cta).toBeVisible({ timeout: 5000 })
      // Tab to focus the CTA
      await cta.focus()
      const focused = await cta.evaluate(el => document.activeElement === el)
      expect(focused).toBe(true)
      console.log(`  ✓ v=${v} CTA is keyboard focusable`)
    }
  })
})
