/**
 * seo.spec.ts — SEO, sitemap, robots.txt, structured data, meta tags, security headers
 *
 * Tests:
 * 1.  GET /robots.txt → 200 with Sitemap directive
 * 2.  GET /sitemap.xml → 200 valid XML with homepage URL
 * 3.  Sitemap URL is referenced in robots.txt
 * 4.  Homepage has correct <title>
 * 5.  Homepage has meta description
 * 6.  Homepage has og:title
 * 7.  Homepage has og:description
 * 8.  Homepage has og:image
 * 9.  Homepage has twitter:card
 * 10. Homepage has application/ld+json structured data (SoftwareApplication)
 * 11. Structured data contains pricing offers
 * 12. /pricing page → 200
 * 13. /pricing has structured data with PriceSpecification
 * 14. /pricing has tier cards (quick, standard, deep)
 * 15. Security: X-Content-Type-Options: nosniff
 * 16. Security: X-Frame-Options present
 * 17. Security: Content-Security-Policy header present
 * 18. Security: Referrer-Policy header present
 * 19. /og route → 200 (OG image)
 * 20. Canonical tag on homepage
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const BYPASS = process.env.VERCEL_BYPASS_TOKEN || ''

function url(path: string) {
  const u = `${BASE_URL}${path}`
  return BYPASS ? `${u}${u.includes('?') ? '&' : '?'}x-vercel-protection-bypass=${BYPASS}` : u
}
function bypassHeaders(): Record<string, string> {
  return BYPASS ? { Cookie: `x-vercel-protection-bypass=${BYPASS}` } : {}
}

// ── robots.txt + sitemap ───────────────────────────────────────────────────

test.describe('SEO — robots.txt and sitemap', () => {
  test('GET /robots.txt → 200', async ({ request }) => {
    const res = await request.get(url('/robots.txt'), { headers: bypassHeaders() })
    expect(res.status()).toBe(200)
  })

  test('robots.txt contains Sitemap directive', async ({ request }) => {
    const res = await request.get(url('/robots.txt'), { headers: bypassHeaders() })
    const body = await res.text()
    expect(body.toLowerCase()).toContain('sitemap:')
  })

  test('robots.txt allows / for all bots', async ({ request }) => {
    const res = await request.get(url('/robots.txt'), { headers: bypassHeaders() })
    const body = await res.text()
    expect(body).toContain('User-agent: *')
    expect(body).toContain('Allow: /')
  })

  test('robots.txt disallows /api/', async ({ request }) => {
    const res = await request.get(url('/robots.txt'), { headers: bypassHeaders() })
    const body = await res.text()
    expect(body).toContain('Disallow: /api/')
  })

  test('GET /sitemap.xml → 200', async ({ request }) => {
    const res = await request.get(url('/sitemap.xml'), { headers: bypassHeaders() })
    expect(res.status()).toBe(200)
  })

  test('sitemap.xml is valid XML with urlset', async ({ request }) => {
    const res = await request.get(url('/sitemap.xml'), { headers: bypassHeaders() })
    const body = await res.text()
    expect(body).toContain('<urlset')
    expect(body).toContain('<url>')
    expect(body).toContain('<loc>')
  })

  test('sitemap.xml contains homepage URL', async ({ request }) => {
    const res = await request.get(url('/sitemap.xml'), { headers: bypassHeaders() })
    const body = await res.text()
    // The canonical domain should appear in sitemap
    expect(body).toMatch(/agentqa|localhost|vercel/)
  })

  test('sitemap.xml contains /pricing URL', async ({ request }) => {
    const res = await request.get(url('/sitemap.xml'), { headers: bypassHeaders() })
    const body = await res.text()
    expect(body).toContain('/pricing')
  })

  test('sitemap.xml contains /marketplace URL', async ({ request }) => {
    const res = await request.get(url('/sitemap.xml'), { headers: bypassHeaders() })
    const body = await res.text()
    expect(body).toContain('/marketplace')
  })
})

// ── Meta tags on homepage ──────────────────────────────────────────────────

test.describe('SEO — homepage meta tags', () => {
  test('homepage <title> contains AgentQA', async ({ page }) => {
    if (BYPASS) await page.context().addCookies([{ name: 'x-vercel-protection-bypass', value: BYPASS, url: BASE_URL }])
    await page.goto(url('/'))
    const title = await page.title()
    expect(title).toContain('AgentQA')
  })

  test('homepage has meta description', async ({ page }) => {
    if (BYPASS) await page.context().addCookies([{ name: 'x-vercel-protection-bypass', value: BYPASS, url: BASE_URL }])
    await page.goto(url('/'))
    const desc = await page.locator('meta[name="description"]').getAttribute('content')
    expect(desc).toBeTruthy()
    expect(desc!.length).toBeGreaterThan(50)
  })

  test('homepage has og:title', async ({ page }) => {
    if (BYPASS) await page.context().addCookies([{ name: 'x-vercel-protection-bypass', value: BYPASS, url: BASE_URL }])
    await page.goto(url('/'))
    const og = await page.locator('meta[property="og:title"]').getAttribute('content')
    expect(og).toBeTruthy()
    expect(og).toContain('AgentQA')
  })

  test('homepage has og:description', async ({ page }) => {
    if (BYPASS) await page.context().addCookies([{ name: 'x-vercel-protection-bypass', value: BYPASS, url: BASE_URL }])
    await page.goto(url('/'))
    const og = await page.locator('meta[property="og:description"]').getAttribute('content')
    expect(og).toBeTruthy()
    expect(og!.length).toBeGreaterThan(30)
  })

  test('homepage has og:image', async ({ page }) => {
    if (BYPASS) await page.context().addCookies([{ name: 'x-vercel-protection-bypass', value: BYPASS, url: BASE_URL }])
    await page.goto(url('/'))
    const img = await page.locator('meta[property="og:image"]').getAttribute('content')
    expect(img).toBeTruthy()
  })

  test('homepage has twitter:card', async ({ page }) => {
    if (BYPASS) await page.context().addCookies([{ name: 'x-vercel-protection-bypass', value: BYPASS, url: BASE_URL }])
    await page.goto(url('/'))
    const card = await page.locator('meta[name="twitter:card"]').getAttribute('content')
    expect(card).toBe('summary_large_image')
  })

  test('homepage has canonical link', async ({ page }) => {
    if (BYPASS) await page.context().addCookies([{ name: 'x-vercel-protection-bypass', value: BYPASS, url: BASE_URL }])
    await page.goto(url('/'))
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBeTruthy()
  })
})

// ── Structured data ────────────────────────────────────────────────────────

test.describe('SEO — structured data', () => {
  test('homepage has application/ld+json script', async ({ page }) => {
    if (BYPASS) await page.context().addCookies([{ name: 'x-vercel-protection-bypass', value: BYPASS, url: BASE_URL }])
    await page.goto(url('/'))
    const scripts = await page.locator('script[type="application/ld+json"]').all()
    expect(scripts.length).toBeGreaterThan(0)
  })

  test('homepage structured data contains SoftwareApplication type', async ({ page }) => {
    if (BYPASS) await page.context().addCookies([{ name: 'x-vercel-protection-bypass', value: BYPASS, url: BASE_URL }])
    await page.goto(url('/'))
    const scripts = await page.locator('script[type="application/ld+json"]').all()
    let found = false
    for (const s of scripts) {
      const text = await s.textContent()
      if (text && text.includes('SoftwareApplication')) found = true
    }
    expect(found).toBe(true)
  })

  test('homepage structured data has offers (pricing)', async ({ page }) => {
    if (BYPASS) await page.context().addCookies([{ name: 'x-vercel-protection-bypass', value: BYPASS, url: BASE_URL }])
    await page.goto(url('/'))
    const scripts = await page.locator('script[type="application/ld+json"]').all()
    let hasOffers = false
    for (const s of scripts) {
      const text = await s.textContent()
      if (text) {
        try {
          const data = JSON.parse(text)
          if (data.offers) hasOffers = true
        } catch { /* skip invalid */ }
      }
    }
    expect(hasOffers).toBe(true)
  })
})

// ── /pricing page ──────────────────────────────────────────────────────────

test.describe('SEO — /pricing page', () => {
  test('GET /pricing → 200', async ({ request }) => {
    const res = await request.get(url('/pricing'), { headers: bypassHeaders() })
    expect(res.status()).toBe(200)
  })

  test('/pricing has H1 "Simple, transparent pricing"', async ({ page }) => {
    if (BYPASS) await page.context().addCookies([{ name: 'x-vercel-protection-bypass', value: BYPASS, url: BASE_URL }])
    await page.goto(url('/pricing'))
    const h1 = await page.locator('h1').textContent()
    expect(h1).toContain('pricing')
  })

  test('/pricing shows all 3 tier cards', async ({ page }) => {
    if (BYPASS) await page.context().addCookies([{ name: 'x-vercel-protection-bypass', value: BYPASS, url: BASE_URL }])
    await page.goto(url('/pricing'))
    for (const tier of ['quick', 'standard', 'deep']) {
      await expect(page.locator(`[data-testid="pricing-tier-${tier}"]`)).toBeVisible()
    }
  })

  test('/pricing Quick tier shows $5', async ({ page }) => {
    if (BYPASS) await page.context().addCookies([{ name: 'x-vercel-protection-bypass', value: BYPASS, url: BASE_URL }])
    await page.goto(url('/pricing'))
    const quickCard = page.locator('[data-testid="pricing-tier-quick"]')
    await expect(quickCard).toContainText('$5')
  })

  test('/pricing Standard tier shows $10', async ({ page }) => {
    if (BYPASS) await page.context().addCookies([{ name: 'x-vercel-protection-bypass', value: BYPASS, url: BASE_URL }])
    await page.goto(url('/pricing'))
    const standardCard = page.locator('[data-testid="pricing-tier-standard"]')
    await expect(standardCard).toContainText('$10')
  })

  test('/pricing Deep tier shows $15', async ({ page }) => {
    if (BYPASS) await page.context().addCookies([{ name: 'x-vercel-protection-bypass', value: BYPASS, url: BASE_URL }])
    await page.goto(url('/pricing'))
    const deepCard = page.locator('[data-testid="pricing-tier-deep"]')
    await expect(deepCard).toContainText('$15')
  })

  test('/pricing has structured data with offers', async ({ page }) => {
    if (BYPASS) await page.context().addCookies([{ name: 'x-vercel-protection-bypass', value: BYPASS, url: BASE_URL }])
    await page.goto(url('/pricing'))
    const scripts = await page.locator('script[type="application/ld+json"]').all()
    let hasOffers = false
    for (const s of scripts) {
      const text = await s.textContent()
      if (text && text.includes('"Offer"')) hasOffers = true
    }
    expect(hasOffers).toBe(true)
  })

  test('/pricing title tag contains AgentQA', async ({ page }) => {
    if (BYPASS) await page.context().addCookies([{ name: 'x-vercel-protection-bypass', value: BYPASS, url: BASE_URL }])
    await page.goto(url('/pricing'))
    const title = await page.title()
    expect(title).toContain('AgentQA')
  })
})

// ── Security headers ───────────────────────────────────────────────────────

test.describe('SEO — security headers', () => {
  test('X-Content-Type-Options: nosniff', async ({ request }) => {
    const res = await request.get(url('/'), { headers: bypassHeaders() })
    const h = res.headers()['x-content-type-options']
    expect(h).toBe('nosniff')
  })

  test('X-Frame-Options is set', async ({ request }) => {
    const res = await request.get(url('/'), { headers: bypassHeaders() })
    const h = res.headers()['x-frame-options']
    expect(h).toBeTruthy()
  })

  test('Content-Security-Policy header is present', async ({ request }) => {
    const res = await request.get(url('/'), { headers: bypassHeaders() })
    const h = res.headers()['content-security-policy']
    expect(h).toBeTruthy()
    expect(h).toContain("default-src")
  })

  test('Referrer-Policy header is present', async ({ request }) => {
    const res = await request.get(url('/'), { headers: bypassHeaders() })
    const h = res.headers()['referrer-policy']
    expect(h).toBeTruthy()
  })

  test('Strict-Transport-Security present (HSTS)', async ({ request }) => {
    const res = await request.get(url('/'), { headers: bypassHeaders() })
    const h = res.headers()['strict-transport-security']
    // HSTS is typically stripped on non-HTTPS, may not be present in all environments
    if (h) {
      expect(h).toContain('max-age')
    } else {
      // Accept absence in HTTP test environments
      test.skip()
    }
  })
})

// ── OG image route ─────────────────────────────────────────────────────────

test.describe('SEO — OpenGraph image', () => {
  test('GET /og → 200 PNG image', async ({ request }) => {
    const res = await request.get(url('/og'), { headers: bypassHeaders() })
    expect(res.status()).toBe(200)
    const ct = res.headers()['content-type']
    expect(ct).toContain('image/')
  })
})
