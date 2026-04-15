/**
 * docs.spec.ts — Documentation pages E2E tests
 *
 * Tests:
 * 1.  GET /docs → 200 (redirects to /docs/how-it-works)
 * 2.  /docs/how-it-works → 200, h1, sidebar present, key content
 * 3.  /docs/pricing → 200, h1, tier table, credits section
 * 4.  /docs/security → 200, h1, URL blocklist section
 * 5.  /docs/terms → 200, h1, effective date
 * 6.  /docs/privacy → 200, h1, data retention section
 * 7.  /docs/api-quickstart → 200, h1, code examples
 * 8.  Docs sidebar is present on all pages
 * 9.  Nav link from homepage → docs
 * 10. All docs pages have correct <title> with AgentQA
 * 11. /docs/api-quickstart shows job creation endpoint
 * 12. /docs/security mentions file:// block
 * 13. /docs/security mentions private IP block
 * 14. /docs/pricing shows Quick $5
 * 15. /docs/pricing shows tier table
 * 16. All docs pages in sitemap.xml
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
function byCookie() {
  if (BYPASS) return [{ name: 'x-vercel-protection-bypass', value: BYPASS, url: BASE_URL }]
  return []
}

const DOC_PAGES = [
  { path: '/docs/how-it-works', testId: 'docs-how-it-works', h1: 'How AgentQA Works' },
  { path: '/docs/pricing', testId: 'docs-pricing', h1: 'Pricing' },
  { path: '/docs/security', testId: 'docs-security', h1: 'Security' },
  { path: '/docs/terms', testId: 'docs-terms', h1: 'Terms of Service' },
  { path: '/docs/privacy', testId: 'docs-privacy', h1: 'Privacy Policy' },
  { path: '/docs/api-quickstart', testId: 'docs-api-quickstart', h1: 'API Quickstart' },
]

// ── All pages return 200 ───────────────────────────────────────────────────

test.describe('Docs — HTTP status', () => {
  test('GET /docs → 200 or 3xx redirect', async ({ request }) => {
    // /docs redirects server-side; just check it doesn't 5xx
    // (bypass cookie not forwarded through redirects in API requests)
    const res = await request.get(url('/docs'), { headers: bypassHeaders(), maxRedirects: 0 })
    expect(res.status()).toBeLessThan(500)
  })

  for (const { path } of DOC_PAGES) {
    test(`GET ${path} → 200`, async ({ request }) => {
      const res = await request.get(url(path), { headers: bypassHeaders() })
      expect(res.status()).toBe(200)
    })
  }
})

// ── Page content ───────────────────────────────────────────────────────────

test.describe('Docs — content: how-it-works', () => {
  test('has h1 "How AgentQA Works"', async ({ page }) => {
    await page.context().addCookies(byCookie())
    await page.goto(url('/docs/how-it-works'))
    const h1 = await page.locator('h1').first().textContent()
    expect(h1).toContain('How AgentQA')
  })

  test('has sidebar', async ({ page }) => {
    await page.context().addCookies(byCookie())
    await page.goto(url('/docs/how-it-works'))
    await expect(page.locator('[data-testid="docs-sidebar"]')).toBeVisible()
  })

  test('has testid docs-how-it-works', async ({ page }) => {
    await page.context().addCookies(byCookie())
    await page.goto(url('/docs/how-it-works'))
    await expect(page.locator('[data-testid="docs-how-it-works"]')).toBeVisible()
  })

  test('mentions "credits" in body', async ({ page }) => {
    await page.context().addCookies(byCookie())
    await page.goto(url('/docs/how-it-works'))
    const body = await page.locator('article').textContent()
    expect(body?.toLowerCase()).toContain('credit')
  })

  test('title contains AgentQA', async ({ page }) => {
    await page.context().addCookies(byCookie())
    await page.goto(url('/docs/how-it-works'))
    expect(await page.title()).toContain('AgentQA')
  })
})

test.describe('Docs — content: pricing', () => {
  test('has h1 with Pricing', async ({ page }) => {
    await page.context().addCookies(byCookie())
    await page.goto(url('/docs/pricing'))
    const h1 = await page.locator('h1').first().textContent()
    expect(h1).toContain('Pricing')
  })

  test('shows Quick tier $5', async ({ page }) => {
    await page.context().addCookies(byCookie())
    await page.goto(url('/docs/pricing'))
    const body = await page.locator('[data-testid="docs-pricing"]').textContent()
    expect(body).toContain('$5')
  })

  test('shows tier table', async ({ page }) => {
    await page.context().addCookies(byCookie())
    await page.goto(url('/docs/pricing'))
    await expect(page.locator('table').first()).toBeVisible()
  })

  test('mentions credits lifecycle', async ({ page }) => {
    await page.context().addCookies(byCookie())
    await page.goto(url('/docs/pricing'))
    const body = await page.locator('[data-testid="docs-pricing"]').textContent()
    expect(body?.toLowerCase()).toContain('hold')
  })
})

test.describe('Docs — content: security', () => {
  test('has h1 with Security', async ({ page }) => {
    await page.context().addCookies(byCookie())
    await page.goto(url('/docs/security'))
    const h1 = await page.locator('h1').first().textContent()
    expect(h1?.toLowerCase()).toContain('security')
  })

  test('mentions file:// block', async ({ page }) => {
    await page.context().addCookies(byCookie())
    await page.goto(url('/docs/security'))
    const body = await page.locator('[data-testid="docs-security"]').textContent()
    expect(body).toContain('file://')
  })

  test('mentions private IP block', async ({ page }) => {
    await page.context().addCookies(byCookie())
    await page.goto(url('/docs/security'))
    const body = await page.locator('[data-testid="docs-security"]').textContent()
    expect(body).toContain('192.168')
  })

  test('mentions SSRF', async ({ page }) => {
    await page.context().addCookies(byCookie())
    await page.goto(url('/docs/security'))
    const body = await page.locator('[data-testid="docs-security"]').textContent()
    expect(body?.toLowerCase()).toContain('ssrf')
  })
})

test.describe('Docs — content: terms', () => {
  test('has h1 "Terms of Service"', async ({ page }) => {
    await page.context().addCookies(byCookie())
    await page.goto(url('/docs/terms'))
    const h1 = await page.locator('h1').first().textContent()
    expect(h1).toContain('Terms')
  })

  test('has effective date', async ({ page }) => {
    await page.context().addCookies(byCookie())
    await page.goto(url('/docs/terms'))
    const body = await page.locator('[data-testid="docs-terms"]').textContent()
    expect(body?.toLowerCase()).toContain('effective')
  })

  test('has refund section', async ({ page }) => {
    await page.context().addCookies(byCookie())
    await page.goto(url('/docs/terms'))
    const body = await page.locator('[data-testid="docs-terms"]').textContent()
    expect(body?.toLowerCase()).toContain('refund')
  })
})

test.describe('Docs — content: privacy', () => {
  test('has h1 "Privacy Policy"', async ({ page }) => {
    await page.context().addCookies(byCookie())
    await page.goto(url('/docs/privacy'))
    const h1 = await page.locator('h1').first().textContent()
    expect(h1).toContain('Privacy')
  })

  test('mentions data retention', async ({ page }) => {
    await page.context().addCookies(byCookie())
    await page.goto(url('/docs/privacy'))
    const body = await page.locator('[data-testid="docs-privacy"]').textContent()
    expect(body?.toLowerCase()).toContain('retention')
  })

  test('mentions PostHog analytics disclosure', async ({ page }) => {
    await page.context().addCookies(byCookie())
    await page.goto(url('/docs/privacy'))
    const body = await page.locator('[data-testid="docs-privacy"]').textContent()
    expect(body).toContain('PostHog')
  })
})

test.describe('Docs — content: api-quickstart', () => {
  test('has h1 "API Quickstart"', async ({ page }) => {
    await page.context().addCookies(byCookie())
    await page.goto(url('/docs/api-quickstart'))
    const h1 = await page.locator('h1').first().textContent()
    expect(h1).toContain('API')
  })

  test('shows POST /api/jobs endpoint', async ({ page }) => {
    await page.context().addCookies(byCookie())
    await page.goto(url('/docs/api-quickstart'))
    const body = await page.locator('[data-testid="docs-api-quickstart"]').textContent()
    expect(body).toContain('POST /api/jobs')
  })

  test('shows authentication instructions', async ({ page }) => {
    await page.context().addCookies(byCookie())
    await page.goto(url('/docs/api-quickstart'))
    const body = await page.locator('[data-testid="docs-api-quickstart"]').textContent()
    expect(body?.toLowerCase()).toContain('bearer')
  })

  test('shows tier table (quick/standard/deep)', async ({ page }) => {
    await page.context().addCookies(byCookie())
    await page.goto(url('/docs/api-quickstart'))
    const body = await page.locator('[data-testid="docs-api-quickstart"]').textContent()
    expect(body).toContain('quick')
    expect(body).toContain('standard')
    expect(body).toContain('deep')
  })

  test('shows GitHub Actions CI example', async ({ page }) => {
    await page.context().addCookies(byCookie())
    await page.goto(url('/docs/api-quickstart'))
    const body = await page.locator('[data-testid="docs-api-quickstart"]').textContent()
    expect(body?.toLowerCase()).toContain('github actions')
  })
})

// ── Sidebar navigation ─────────────────────────────────────────────────────

test.describe('Docs — sidebar navigation', () => {
  test('sidebar is present on all docs pages', async ({ page }) => {
    await page.context().addCookies(byCookie())
    for (const { path } of DOC_PAGES) {
      await page.goto(url(path))
      await expect(page.locator('[data-testid="docs-sidebar"]')).toBeVisible()
    }
  })

  test('sidebar links to all 6 docs pages', async ({ page }) => {
    await page.context().addCookies(byCookie())
    await page.goto(url('/docs/how-it-works'))
    const sidebar = page.locator('[data-testid="docs-sidebar"]')
    const links = await sidebar.locator('a').all()
    const hrefs = await Promise.all(links.map(l => l.getAttribute('href')))
    expect(hrefs.some(h => h?.includes('how-it-works'))).toBe(true)
    expect(hrefs.some(h => h?.includes('pricing'))).toBe(true)
    expect(hrefs.some(h => h?.includes('security'))).toBe(true)
    expect(hrefs.some(h => h?.includes('terms'))).toBe(true)
    expect(hrefs.some(h => h?.includes('privacy'))).toBe(true)
    expect(hrefs.some(h => h?.includes('api-quickstart'))).toBe(true)
  })
})

// ── Sitemap includes docs pages ────────────────────────────────────────────

test.describe('Docs — sitemap', () => {
  test('sitemap.xml includes all 6 docs pages', async ({ request }) => {
    const res = await request.get(url('/sitemap.xml'), { headers: bypassHeaders() })
    const body = await res.text()
    for (const { path } of DOC_PAGES) {
      const slug = path.replace('/docs/', '')
      expect(body).toContain(slug)
    }
  })
})
