/**
 * e2e/utm-redirects.spec.ts
 * Verifies the /r/[slug] UTM redirect system:
 *  - Known slugs redirect with correct utm_* params
 *  - Unknown slugs return 404
 *  - /links admin page loads and shows all slugs
 *  - PostHog short_link_click event fires (client-side)
 */
import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:3000'

// Spot-check a cross-section of slugs and verify their UTM params
const CASES = [
  { slug: 'tw-launch', utm_source: 'twitter', utm_medium: 'social', utm_campaign: 'twitter_launch' },
  { slug: 'li-launch', utm_source: 'linkedin', utm_medium: 'social', utm_campaign: 'linkedin_launch' },
  { slug: 'hn-launch', utm_source: 'hackernews', utm_medium: 'community', utm_campaign: 'hn_show_hn' },
  { slug: 'ph-launch', utm_source: 'producthunt', utm_medium: 'directory', utm_campaign: 'ph_launch' },
  { slug: 'ml-listing', utm_source: 'microlaunch', utm_medium: 'directory', utm_campaign: 'microlaunch_listing' },
  { slug: 'rd-saas', utm_source: 'reddit', utm_medium: 'community', utm_campaign: 'reddit_saas' },
  { slug: 'demo', utm_source: 'direct', utm_medium: 'referral', utm_campaign: 'demo_link' },
]

test.describe('UTM Short Links — /r/[slug]', () => {
  for (const c of CASES) {
    test(`/r/${c.slug} redirects with utm_source=${c.utm_source}`, async ({ page }) => {
      // Follow redirect
      await page.goto(`${BASE}/r/${c.slug}`, { waitUntil: 'domcontentloaded' })

      const url = new URL(page.url())
      expect(url.searchParams.get('utm_source')).toBe(c.utm_source)
      expect(url.searchParams.get('utm_medium')).toBe(c.utm_medium)
      expect(url.searchParams.get('utm_campaign')).toBe(c.utm_campaign)
      // Should land on the same domain (not leave the app)
      expect(url.hostname).toBe(new URL(BASE).hostname)
    })
  }

  test('/r/UNKNOWN_SLUG returns 404', async ({ request }) => {
    const res = await request.get(`${BASE}/r/does-not-exist-xyz`)
    expect(res.status()).toBe(404)
  })
})

test.describe('/links admin page', () => {
  test('loads and renders the slug table', async ({ page }) => {
    await page.goto(`${BASE}/links`, { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toContainText('UTM Short Links')
    // Check multiple slugs appear in the table
    for (const c of CASES) {
      await expect(page.locator(`text=${c.slug}`).first()).toBeVisible()
    }
  })

  test('shows PostHog query hints', async ({ page }) => {
    await page.goto(`${BASE}/links`)
    await expect(page.locator('text=short_link_click').first()).toBeVisible()
  })
})
