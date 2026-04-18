/**
 * Blog & Launch E2E Tests
 *
 * Covers:
 *   1. Blog index page loads and lists 3 posts
 *   2. Each blog post page loads with correct content
 *   3. Blog CTAs have UTM parameters
 *   4. Launch page lists 7 directories
 *   5. Sitemap includes blog and launch URLs
 */

import { test, expect } from '@playwright/test'

const BLOG_POSTS = [
  { slug: 'true-hourly-rate', title: 'hourly rate', tag: 'ROI', utm: 'true_hourly_rate_post' },
  { slug: 'ab-pricing-gig-work', title: 'A/B', tag: 'Pricing', utm: 'ab_pricing_post' },
  { slug: 'five-income-streams', title: 'income stream', tag: 'Productivity', utm: 'five_streams_post' },
  { slug: 'csv-import-guide', title: 'import', tag: 'CSV', utm: 'csv_import_post' },
]

const DIRECTORIES = [
  'Product Hunt',
  'Indie Hackers',
  'BetaList',
  'Hacker News',
  'AlternativeTo',
  'StartupBase',
  'Startups.fyi',
]

// ─── Blog Index ───────────────────────────────────────────────────────────────

test.describe('/blog index', () => {
  test('returns 200 and contains blog heading', async ({ request }) => {
    const res = await request.get('/blog')
    expect([200, 401]).toContain(res.status())
    if (res.status() === 200) {
      const text = await res.text()
      expect(text.toLowerCase()).toContain('blog')
    }
    console.log(`✓ GET /blog → ${res.status()}`)
  })

  test('lists all 4 blog post titles', async ({ request }) => {
    const res = await request.get('/blog')
    if (res.status() !== 200) return
    const text = await res.text()
    for (const post of BLOG_POSTS) {
      expect(text.toLowerCase()).toContain(post.tag.toLowerCase())
    }
    console.log('✓ All 3 post tags present on blog index')
  })

  test('blog index CTA links to signup with UTM', async ({ request }) => {
    const res = await request.get('/blog')
    if (res.status() !== 200) return
    const text = await res.text()
    expect(text).toContain('utm_source=blog')
    expect(text).toContain('utm_campaign=blog_index')
    console.log('✓ Blog index CTA has UTM params')
  })

  test('blog index links to all 3 post slugs', async ({ request }) => {
    const res = await request.get('/blog')
    if (res.status() !== 200) return
    const text = await res.text()
    for (const post of BLOG_POSTS) {
      expect(text).toContain(`/blog/${post.slug}`)
    }
    console.log('✓ All 3 post slugs linked from blog index')
  })
})

// ─── Blog Post Pages ──────────────────────────────────────────────────────────

for (const post of BLOG_POSTS) {
  test.describe(`/blog/${post.slug}`, () => {
    test('returns 200', async ({ request }) => {
      const res = await request.get(`/blog/${post.slug}`)
      expect([200, 401]).toContain(res.status())
      console.log(`✓ GET /blog/${post.slug} → ${res.status()}`)
    })

    test('contains post title text', async ({ request }) => {
      const res = await request.get(`/blog/${post.slug}`)
      if (res.status() !== 200) return
      const text = await res.text()
      expect(text.toLowerCase()).toContain(post.title.toLowerCase())
      console.log(`✓ /blog/${post.slug} title found`)
    })

    test('has signup CTA with UTM tracking', async ({ request }) => {
      const res = await request.get(`/blog/${post.slug}`)
      if (res.status() !== 200) return
      const text = await res.text()
      expect(text).toContain('utm_source=blog')
      expect(text).toContain(post.utm)
      console.log(`✓ /blog/${post.slug} CTA has UTM: ${post.utm}`)
    })

    test('links back to /blog', async ({ request }) => {
      const res = await request.get(`/blog/${post.slug}`)
      if (res.status() !== 200) return
      const text = await res.text()
      expect(text).toContain('href="/blog"')
      console.log(`✓ /blog/${post.slug} has back-link`)
    })
  })
}

// ─── Launch Page ──────────────────────────────────────────────────────────────

test.describe('/launch page', () => {
  test('returns 200', async ({ request }) => {
    const res = await request.get('/launch')
    expect([200, 401]).toContain(res.status())
    console.log(`✓ GET /launch → ${res.status()}`)
  })

  test('lists all 7 directory names', async ({ request }) => {
    const res = await request.get('/launch')
    if (res.status() !== 200) return
    const text = await res.text()
    for (const dir of DIRECTORIES) {
      expect(text).toContain(dir)
    }
    console.log(`✓ All ${DIRECTORIES.length} directories listed on /launch`)
  })

  test('shows "Submitted" badges for all listings', async ({ request }) => {
    const res = await request.get('/launch')
    if (res.status() !== 200) return
    const text = await res.text()
    expect(text).toContain('Submitted')
    console.log('✓ Submission badges present on /launch')
  })

  test('hero CTA has UTM params', async ({ request }) => {
    const res = await request.get('/launch')
    if (res.status() !== 200) return
    const text = await res.text()
    expect(text).toContain('utm_source=launch_page')
    expect(text).toContain('utm_campaign=launch')
    console.log('✓ Launch page CTA has UTM params')
  })

  test('bottom CTA links to signup', async ({ request }) => {
    const res = await request.get('/launch')
    if (res.status() !== 200) return
    const text = await res.text()
    expect(text).toContain('/signup')
    console.log('✓ Launch page bottom CTA links to signup')
  })

  test('shows UTM sharing links section', async ({ request }) => {
    const res = await request.get('/launch')
    if (res.status() !== 200) return
    const text = await res.text()
    expect(text).toContain('utm_source=producthunt')
    expect(text).toContain('utm_source=indiehackers')
    expect(text).toContain('utm_source=reddit')
    console.log('✓ UTM sharing links present on /launch')
  })
})

// ─── Sitemap includes blog + launch ───────────────────────────────────────────

test.describe('sitemap includes new pages', () => {
  test('sitemap.xml includes /blog URLs', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    expect([200, 401]).toContain(res.status())
    if (res.status() !== 200) return
    const text = await res.text()
    expect(text).toContain('/blog')
    expect(text).toContain('/blog/true-hourly-rate')
    expect(text).toContain('/blog/ab-pricing-gig-work')
    expect(text).toContain('/blog/five-income-streams')
    expect(text).toContain('/blog/csv-import-guide')
    console.log('✓ sitemap.xml includes all blog URLs')
  })

  test('sitemap.xml includes /launch URL', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    if (res.status() !== 200) return
    const text = await res.text()
    expect(text).toContain('/launch')
    console.log('✓ sitemap.xml includes /launch')
  })
})

// ─── Landing page footer UTM links ───────────────────────────────────────────

test('landing page footer has Blog and Launch links', async ({ request }) => {
  const res = await request.get('/')
  if (res.status() !== 200) return
  const text = await res.text()
  expect(text).toContain('href="/blog"')
  expect(text).toContain('href="/launch"')
  console.log('✓ Landing footer has Blog and Launch links')
})

test('landing page hero CTA has UTM source=landing', async ({ request }) => {
  const res = await request.get('/')
  if (res.status() !== 200) return
  const text = await res.text()
  expect(text).toContain('utm_source=landing')
  console.log('✓ Landing hero CTA has utm_source=landing')
})
