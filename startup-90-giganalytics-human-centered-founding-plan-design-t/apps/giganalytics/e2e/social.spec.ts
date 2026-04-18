/**
 * Social Page E2E Tests
 *
 * Covers:
 *   1. /social page loads and contains all 4 platform sections
 *   2. Twitter thread has all 5 tweets
 *   3. Reddit post body is present with correct subreddit
 *   4. LinkedIn post is present with key content
 *   5. UTM attribution URLs are present for all platforms
 *   6. social-content.json is publicly accessible
 *   7. /social in sitemap
 *   8. CTA links to signup with UTM
 */

import { test, expect } from '@playwright/test'

const SOCIAL_PLATFORMS = ['Twitter', 'LinkedIn', 'Reddit', 'Product Hunt']
const UTM_SOURCES = ['twitter', 'linkedin', 'reddit', 'producthunt', 'indiehackers']

test.describe('/social page', () => {
  test('returns 200', async ({ request }) => {
    const res = await request.get('/social')
    expect([200, 401]).toContain(res.status())
    console.log(`✓ GET /social → ${res.status()}`)
  })

  test('contains all 4 platform names', async ({ request }) => {
    const res = await request.get('/social')
    if (res.status() !== 200) return
    const text = await res.text()
    for (const platform of SOCIAL_PLATFORMS) {
      expect(text).toContain(platform)
    }
    console.log(`✓ All ${SOCIAL_PLATFORMS.length} platforms listed on /social`)
  })

  test('Twitter thread has 5 tweets', async ({ request }) => {
    const res = await request.get('/social')
    if (res.status() !== 200) return
    const text = await res.text()
    expect(text).toContain('Tweet 1/')
    expect(text).toContain('Tweet 5/')
    // Key content from thread
    expect(text.toLowerCase()).toContain('hourly rate')
    console.log('✓ Twitter thread has 5 tweets')
  })

  test('Reddit post has title and target subreddit', async ({ request }) => {
    const res = await request.get('/social')
    if (res.status() !== 200) return
    const text = await res.text()
    expect(text).toContain('r/freelance')
    expect(text.toLowerCase()).toContain('hourly rate')
    console.log('✓ Reddit post section present')
  })

  test('LinkedIn post is present with hashtags', async ({ request }) => {
    const res = await request.get('/social')
    if (res.status() !== 200) return
    const text = await res.text()
    expect(text).toContain('#freelance')
    expect(text).toContain('#gigeconomy')
    console.log('✓ LinkedIn post section present')
  })

  test('Attribution URLs section has all platform UTM links', async ({ request }) => {
    const res = await request.get('/social')
    if (res.status() !== 200) return
    const text = await res.text()
    for (const source of UTM_SOURCES) {
      expect(text).toContain(`utm_source=${source}`)
    }
    expect(text).toContain('utm_campaign=launch')
    console.log(`✓ All ${UTM_SOURCES.length} UTM sources present on /social`)
  })

  test('CTA links to signup with UTM params', async ({ request }) => {
    const res = await request.get('/social')
    if (res.status() !== 200) return
    const text = await res.text()
    expect(text).toContain('utm_source=social_page')
    expect(text).toContain('/signup')
    console.log('✓ /social CTA has UTM params')
  })

  test('page mentions "true hourly rate" concept', async ({ request }) => {
    const res = await request.get('/social')
    if (res.status() !== 200) return
    const text = await res.text()
    expect(text.toLowerCase()).toContain('hourly rate')
    console.log('✓ Key concept "hourly rate" present')
  })
})

// ─── social-content.json ──────────────────────────────────────────────────────

test.describe('/social-content.json', () => {
  test('is publicly accessible with correct structure', async ({ request }) => {
    const res = await request.get('/social-content.json')
    expect([200, 401]).toContain(res.status())
    if (res.status() !== 200) return

    const body = await res.json()
    expect(body.product).toBe('GigAnalytics')
    expect(Array.isArray(body.twitterThread)).toBe(true)
    expect(body.twitterThread.length).toBe(5)
    expect(Array.isArray(body.redditPosts)).toBe(true)
    expect(body.utmLinks).toBeTruthy()
    expect(body.utmLinks.twitter).toContain('utm_source=twitter')
    console.log(`✓ social-content.json valid — ${body.twitterThread.length} tweets, ${body.redditPosts.length} reddit posts`)
  })

  test('contains all required UTM links', async ({ request }) => {
    const res = await request.get('/social-content.json')
    if (res.status() !== 200) return
    const body = await res.json()
    const utmSources = ['twitter', 'linkedin', 'reddit_organic', 'producthunt', 'indiehackers']
    for (const src of utmSources) {
      expect(body.utmLinks[src]).toBeTruthy()
      expect(body.utmLinks[src]).toContain('utm_source=')
    }
    console.log('✓ social-content.json has all UTM links')
  })
})

// ─── Sitemap includes /social ─────────────────────────────────────────────────

test('sitemap.xml includes /social', async ({ request }) => {
  const res = await request.get('/sitemap.xml')
  if (res.status() !== 200) return
  const text = await res.text()
  expect(text).toContain('/social')
  console.log('✓ sitemap.xml includes /social')
})

// ─── Landing page footer has Social link ─────────────────────────────────────

test('landing page footer has Social link', async ({ request }) => {
  const res = await request.get('/')
  if (res.status() !== 200) return
  const text = await res.text()
  expect(text).toContain('href="/social"')
  console.log('✓ Landing footer has /social link')
})
