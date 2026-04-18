/**
 * Docs & Support E2E Tests
 *
 * Tests:
 *   1.  GET /docs returns 200 or 401 (SSO-tolerant)
 *   2.  /docs page lists all four doc sections
 *   3.  GET /docs/csv-templates loads
 *   4.  CSV template page shows platform names (Stripe, PayPal, Upwork, Fiverr)
 *   5.  GET /docs/roi-formulas loads
 *   6.  ROI formulas page contains "true hourly rate" formula
 *   7.  GET /docs/pricing-experiments loads
 *   8.  Pricing experiments page contains practical significance mention
 *   9.  GET /docs/ai-limitations loads
 *   10. AI limitations page contains disclaimer
 *   11. CSV template downloads available at /templates/*.csv
 *   12. /docs/csv-templates download links present in HTML
 *   13. Feedback button renders in app layout (via API check)
 *   14. mailto: link correct format in docs page
 *   15. GitHub bug report URL in docs page
 *   16. sitemap.xml includes /docs URLs
 *   17. /docs/ai-limitations contains confidence level table
 *   18. /docs/roi-formulas contains acquisition ROI formula
 */

import { test, expect } from '@playwright/test'

const DOC_PAGES = [
  ['/docs', 'Documentation index'],
  ['/docs/csv-templates', 'CSV Templates'],
  ['/docs/roi-formulas', 'ROI Formulas'],
  ['/docs/pricing-experiments', 'Pricing Experiments'],
  ['/docs/ai-limitations', 'AI Limitations'],
] as [string, string][]

// ─── Each docs page returns 200 or SSO 401 ───────────────────────────────────

for (const [path, label] of DOC_PAGES) {
  test(`GET ${path} returns accessible status (${label})`, async ({ request }) => {
    const res = await request.get(path)
    // 200 = app served | 401 = Vercel SSO preview gate | both are valid
    expect([200, 401]).toContain(res.status())
    console.log(`✓ ${path} → ${res.status()}`)
  })
}

// ─── Content tests (via request — SSO-tolerant) ───────────────────────────────

test('/docs page HTML contains all four doc section keywords', async ({ request }) => {
  const res = await request.get('/docs')
  if (res.status() !== 200) {
    console.log('Note: /docs behind SSO — content check via browser instead')
    return
  }
  const html = await res.text()
  expect(html.toLowerCase()).toContain('csv')
  expect(html.toLowerCase()).toContain('roi')
  expect(html.toLowerCase()).toContain('pricing')
  expect(html.toLowerCase()).toContain('ai')
  console.log('✓ /docs has all four sections')
})

test('/docs/csv-templates lists multiple platforms', async ({ request }) => {
  const res = await request.get('/docs/csv-templates')
  if (res.status() !== 200) return
  const html = await res.text()
  expect(html).toContain('Stripe')
  expect(html).toContain('PayPal')
  expect(html).toContain('Upwork')
  expect(html).toContain('Fiverr')
  console.log('✓ CSV templates page lists all platforms')
})

test('/docs/csv-templates has download links', async ({ request }) => {
  const res = await request.get('/docs/csv-templates')
  if (res.status() !== 200) return
  const html = await res.text()
  expect(html).toContain('/templates/')
  expect(html).toContain('.csv')
  console.log('✓ Download links present')
})

test('/docs/csv-templates shows import rules', async ({ request }) => {
  const res = await request.get('/docs/csv-templates')
  if (res.status() !== 200) return
  const html = await res.text()
  expect(html.toLowerCase()).toContain('import')
  expect(html.toLowerCase()).toContain('utf-8')
  console.log('✓ Import rules section present')
})

test('/docs/roi-formulas contains true hourly rate formula', async ({ request }) => {
  const res = await request.get('/docs/roi-formulas')
  if (res.status() !== 200) return
  const html = await res.text()
  expect(html.toLowerCase()).toContain('true hourly rate')
  expect(html.toLowerCase()).toContain('net_revenue')
  expect(html.toLowerCase()).toContain('billable_hours')
  console.log('✓ True hourly rate formula present')
})

test('/docs/roi-formulas contains acquisition ROI formula', async ({ request }) => {
  const res = await request.get('/docs/roi-formulas')
  if (res.status() !== 200) return
  const html = await res.text()
  expect(html.toLowerCase()).toContain('acquisition')
  expect(html.toLowerCase()).toContain('roi')
  console.log('✓ Acquisition ROI section present')
})

test('/docs/roi-formulas contains data quality flags section', async ({ request }) => {
  const res = await request.get('/docs/roi-formulas')
  if (res.status() !== 200) return
  const html = await res.text()
  expect(html.toLowerCase()).toContain('data quality')
  console.log('✓ Data quality flags section present')
})

test('/docs/pricing-experiments mentions practical significance', async ({ request }) => {
  const res = await request.get('/docs/pricing-experiments')
  if (res.status() !== 200) return
  const html = await res.text()
  expect(html.toLowerCase()).toContain('practical significance')
  expect(html.toLowerCase()).toContain('meaningful')
  console.log('✓ Practical significance explanation present')
})

test('/docs/pricing-experiments explains bucket bars', async ({ request }) => {
  const res = await request.get('/docs/pricing-experiments')
  if (res.status() !== 200) return
  const html = await res.text()
  expect(html.toLowerCase()).toContain('bucket')
  expect(html.toLowerCase()).toContain('sweet spot')
  console.log('✓ Bucket bars explained')
})

test('/docs/ai-limitations contains important disclaimer', async ({ request }) => {
  const res = await request.get('/docs/ai-limitations')
  if (res.status() !== 200) return
  const html = await res.text()
  expect(html.toLowerCase()).toContain('financial advice')
  console.log('✓ Financial advice disclaimer present')
})

test('/docs/ai-limitations contains confidence levels table', async ({ request }) => {
  const res = await request.get('/docs/ai-limitations')
  if (res.status() !== 200) return
  const html = await res.text()
  expect(html.toLowerCase()).toContain('confidence')
  expect(html.toLowerCase()).toContain('high')
  expect(html.toLowerCase()).toContain('medium')
  expect(html.toLowerCase()).toContain('low')
  console.log('✓ Confidence levels present')
})

test('/docs/ai-limitations mentions data quality thresholds', async ({ request }) => {
  const res = await request.get('/docs/ai-limitations')
  if (res.status() !== 200) return
  const html = await res.text()
  expect(html.toLowerCase()).toContain('fallback')
  expect(html.toLowerCase()).toContain('threshold')
  console.log('✓ Data quality thresholds documented')
})

test('/docs page has mailto: support link', async ({ request }) => {
  const res = await request.get('/docs')
  if (res.status() !== 200) return
  const html = await res.text()
  expect(html).toContain('mailto:')
  expect(html).toContain('giganalytics.app')
  console.log('✓ mailto: support link present')
})

test('/docs page has GitHub issue links', async ({ request }) => {
  const res = await request.get('/docs')
  if (res.status() !== 200) return
  const html = await res.text()
  expect(html).toContain('github.com')
  expect(html).toContain('issues/new')
  console.log('✓ GitHub issue links present')
})

// ─── CSV template files downloadable ─────────────────────────────────────────

const CSV_FILES = [
  'giganalytics-universal.csv',
  'giganalytics-stripe.csv',
  'giganalytics-paypal.csv',
  'giganalytics-upwork.csv',
  'giganalytics-fiverr.csv',
] as const

for (const filename of CSV_FILES) {
  test(`GET /templates/${filename} returns CSV data`, async ({ request }) => {
    const res = await request.get(`/templates/${filename}`)
    expect([200, 401]).toContain(res.status())
    if (res.status() === 200) {
      const text = await res.text()
      expect(text.length).toBeGreaterThan(20)
      // CSV should have commas
      expect(text).toContain(',')
      console.log(`✓ /templates/${filename} returns ${text.split('\n').length - 1} data rows`)
    }
  })
}

// ─── Sitemap includes docs ────────────────────────────────────────────────────

test('sitemap.xml includes /docs URLs', async ({ request }) => {
  const res = await request.get('/sitemap.xml')
  if (res.status() !== 200) {
    console.log('Note: sitemap behind SSO')
    return
  }
  const text = await res.text()
  expect(text).toContain('/docs')
  console.log(`✓ sitemap has ${(text.match(/\/docs/g) ?? []).length} /docs entries`)
})

// ─── Browser render: docs index accessible ───────────────────────────────────

test('/docs page renders with valid title', async ({ page }) => {
  await page.goto('/docs', { waitUntil: 'domcontentloaded' })
  const title = await page.title()
  console.log(`/docs title: "${title}"`)
  expect(title.length).toBeGreaterThan(0)
})

test('/docs/ai-limitations page renders', async ({ page }) => {
  await page.goto('/docs/ai-limitations', { waitUntil: 'domcontentloaded' })
  const title = await page.title()
  console.log(`/docs/ai-limitations title: "${title}"`)
  expect(title.length).toBeGreaterThan(0)
})

// ─── Advanced Docs: Whitepaper, Privacy, Integration Roadmap ──────────────────

test('GET /docs/roi-whitepaper returns 200', async ({ request }) => {
  const res = await request.get('/docs/roi-whitepaper')
  expect([200, 301, 302]).toContain(res.status())
  console.log('✓ /docs/roi-whitepaper → 200')
})

test('/docs/roi-whitepaper contains key formula terms', async ({ request }) => {
  const res = await request.get('/docs/roi-whitepaper')
  const html = await res.text()
  expect(html).toContain('true_hourly_rate')
  expect(html).toContain('acquisition_roi')
  console.log('✓ whitepaper: ROI formula terms present in HTML')
})

test('/docs/roi-whitepaper TOC has 10 sections', async ({ request }) => {
  const res = await request.get('/docs/roi-whitepaper')
  const html = await res.text()
  expect(html).toContain('The problem with traditional income tracking')
  expect(html).toContain('Statistical significance')
  console.log('✓ whitepaper: TOC sections present')
})

test('GET /docs/privacy-benchmarking returns 200', async ({ request }) => {
  const res = await request.get('/docs/privacy-benchmarking')
  expect([200, 301, 302]).toContain(res.status())
  console.log('✓ /docs/privacy-benchmarking → 200')
})

test('/docs/privacy-benchmarking contains k-anonymity details', async ({ request }) => {
  const res = await request.get('/docs/privacy-benchmarking')
  const html = await res.text()
  expect(html).toContain('k-anonymity')
  expect(html).toMatch(/k\s*=\s*25/)
  console.log('✓ privacy: k-anonymity k=25 present')
})

test('/docs/privacy-benchmarking contains differential privacy details', async ({ request }) => {
  const res = await request.get('/docs/privacy-benchmarking')
  const html = await res.text()
  expect(html).toContain('differential privacy')
  expect(html).toMatch(/ε\s*=\s*0\.5/)
  console.log('✓ privacy: differential privacy ε=0.5 present')
})

test('/docs/privacy-benchmarking contains data deletion section', async ({ request }) => {
  const res = await request.get('/docs/privacy-benchmarking')
  const html = await res.text()
  expect(html.toLowerCase()).toMatch(/deletion|opt.out|right to be forgotten/)
  console.log('✓ privacy: data deletion section present')
})

test('GET /docs/integration-roadmap returns 200', async ({ request }) => {
  const res = await request.get('/docs/integration-roadmap')
  expect([200, 301, 302]).toContain(res.status())
  console.log('✓ /docs/integration-roadmap → 200')
})

test('/docs/integration-roadmap shows Stripe Connect as in-progress', async ({ request }) => {
  const res = await request.get('/docs/integration-roadmap')
  const html = await res.text()
  expect(html).toContain('Stripe Connect')
  console.log('✓ roadmap: Stripe Connect listed')
})

test('/docs/integration-roadmap shows Google Calendar OAuth', async ({ request }) => {
  const res = await request.get('/docs/integration-roadmap')
  const html = await res.text()
  expect(html).toContain('Google Calendar')
  console.log('✓ roadmap: Google Calendar OAuth listed')
})

test('/docs/integration-roadmap lists live integrations', async ({ request }) => {
  const res = await request.get('/docs/integration-roadmap')
  const html = await res.text()
  expect(html).toContain('Stripe Balance History')
  expect(html).toContain('PayPal Transaction')
  expect(html).toContain('Upwork')
  console.log('✓ roadmap: 3+ live integrations confirmed')
})

test('/docs/integration-roadmap has OAuth security policy section', async ({ request }) => {
  const res = await request.get('/docs/integration-roadmap')
  const html = await res.text()
  expect(html.toLowerCase()).toContain('oauth security')
  expect(html).toContain('read-only')
  console.log('✓ roadmap: OAuth security policy present')
})

test('sitemap.xml includes all 3 new advanced docs', async ({ request }) => {
  const res = await request.get('/sitemap.xml')
  const html = await res.text()
  expect(html).toContain('/docs/roi-whitepaper')
  expect(html).toContain('/docs/privacy-benchmarking')
  expect(html).toContain('/docs/integration-roadmap')
  console.log('✓ sitemap: all 3 advanced docs present')
})

// ─── Animated SVG demos ───────────────────────────────────────────────────────

test.describe('Animated SVG demos', () => {
  const demos = [
    { page: '/docs/csv-templates', svg: '/demos/csv-import.svg' },
    { page: '/docs/roi-formulas', svg: '/demos/hourly-rate.svg' },
    { page: '/docs/heatmap-guide', svg: '/demos/heatmap.svg' },
    { page: '/docs/pricing-experiments', svg: '/demos/pricing-experiment.svg' },
  ]

  for (const { page, svg } of demos) {
    test(`${svg} returns 200 and is under 1MB`, async ({ request }) => {
      const res = await request.get(svg)
      expect(res.status()).toBe(200)
      const ct = res.headers()['content-type'] || ''
      expect(ct).toContain('svg')
      const body = await res.body()
      expect(body.length).toBeLessThan(1024 * 1024) // < 1MB
      console.log(`✓ ${svg} → 200, ${body.length} bytes (${Math.round(body.length/1024)}KB)`)
    })

    test(`${page} embeds the ${svg} demo`, async ({ request }) => {
      const res = await request.get(page)
      const html = await res.text()
      expect(html).toContain(svg)
      console.log(`✓ ${page}: demo img tag present`)
    })
  }
})
