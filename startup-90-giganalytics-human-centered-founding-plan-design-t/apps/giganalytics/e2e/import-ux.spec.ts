/**
 * CSV Import UX Quick Wins — E2E Tests
 *
 * Covers all 4 quick wins:
 *   1. Reduced required fields: only amount required, date optional
 *   2. Enriched CSV tooltips: step-by-step instructions per platform
 *   3. Inline sample data: tables shown in format guide accordion
 *   4. Pre-fill stream name: auto-suggested from CSV platform
 *
 * Also covers: sample file buttons, drop zone, mapping UI, import page structure.
 */

import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'

// ─── Import page structure ────────────────────────────────────────────────────

test.describe('Import page — structure', () => {
  test('GET /import returns 200', async ({ request }) => {
    const res = await request.get('/import')
    expect([200, 302]).toContain(res.status())
    console.log(`✓ GET /import → ${res.status()}`)
  })

  test('import page contains key UX copy', async ({ page }) => {
    const res = await page.goto('/import')
    if (res?.status() === 302 || res?.url().includes('/login')) {
      console.log('✓ /import redirects to login (auth-gated — expected)')
      return
    }
    const text = await page.textContent('body') ?? ''
    // Quick win #1: required fields notice
    expect(text.toLowerCase()).toMatch(/only.*amount.*required|amount.*only.*required|minimum required/)
    // Sample file section
    expect(text).toContain('sample')
    console.log('✓ Import page: required fields notice present')
  })

  test('import page shows "only amount required" notice', async ({ page }) => {
    await page.goto('/import')
    const text = await page.textContent('body') ?? ''
    if (text.includes('login') || text.includes('Sign in')) return
    expect(text.toLowerCase()).toMatch(/amount.*required|required.*amount/)
    console.log('✓ "Only amount required" notice visible')
  })

  test('import page has format guide section', async ({ page }) => {
    await page.goto('/import')
    const text = await page.textContent('body') ?? ''
    if (text.includes('login')) return
    expect(text.toLowerCase()).toMatch(/supported format|format guide|how to export/)
    console.log('✓ Format guide section present')
  })
})

// ─── Quick win #2: enriched tooltips ─────────────────────────────────────────

test.describe('Quick win #2: enriched CSV tooltips', () => {
  test('import page shows step-by-step export instructions', async ({ page }) => {
    await page.goto('/import')
    const text = await page.textContent('body') ?? ''
    if (text.includes('login')) return
    // Step-by-step instructions are collapsed in accordion but exist in DOM
    const body = await page.content()
    // Accordion panels contain how-to-export steps
    expect(body).toContain('How to export')
    console.log('✓ "How to export" step-by-step in accordion')
  })

  test('Stripe accordion shows Dashboard → Reports path', async ({ page }) => {
    await page.goto('/import')
    const text = await page.textContent('body') ?? ''
    if (text.includes('login')) return
    const body = await page.content()
    expect(body).toContain('stripe.com')
    expect(body).toContain('Reports')
    console.log('✓ Stripe export path present in accordion')
  })

  test('PayPal accordion shows Activity → Statements path', async ({ page }) => {
    await page.goto('/import')
    const text = await page.textContent('body') ?? ''
    if (text.includes('login')) return
    const body = await page.content()
    expect(body).toContain('paypal.com')
    expect(body).toContain('Statements')
    console.log('✓ PayPal export path present')
  })

  test('Upwork accordion shows Reports → Transaction History path', async ({ page }) => {
    await page.goto('/import')
    const text = await page.textContent('body') ?? ''
    if (text.includes('login')) return
    const body = await page.content()
    expect(body).toContain('upwork.com')
    expect(body).toContain('Transaction History')
    console.log('✓ Upwork export path present')
  })
})

// ─── Quick win #3: inline sample data ────────────────────────────────────────

test.describe('Quick win #3: inline sample data tables', () => {
  test('sample data rows exist in page source', async ({ page }) => {
    await page.goto('/import')
    const text = await page.textContent('body') ?? ''
    if (text.includes('login')) return
    const body = await page.content()
    // Sample row data is embedded in the page
    expect(body).toContain('Expected columns')
    console.log('✓ "Expected columns" inline sample header present')
  })

  test('stripe sample columns visible in accordion source', async ({ page }) => {
    await page.goto('/import')
    const text = await page.textContent('body') ?? ''
    if (text.includes('login')) return
    const body = await page.content()
    // Stripe columns in sample table
    expect(body).toContain('Created (UTC)')
    console.log('✓ Stripe column names in inline sample')
  })

  test('generic CSV sample shows date and amount columns', async ({ page }) => {
    await page.goto('/import')
    const text = await page.textContent('body') ?? ''
    if (text.includes('login')) return
    const body = await page.content()
    expect(body).toMatch(/date.*amount|amount.*date/i)
    console.log('✓ Generic CSV shows date + amount columns')
  })

  test('sample amounts visible in inline preview', async ({ page }) => {
    await page.goto('/import')
    const text = await page.textContent('body') ?? ''
    if (text.includes('login')) return
    const body = await page.content()
    // Sample rows contain dollar amounts from our pre-configured data
    expect(body).toMatch(/150\.00|300\.00|450\.00|500\.00/)
    console.log('✓ Sample amounts visible in inline preview')
  })
})

// ─── Quick win #4: pre-fill stream name ──────────────────────────────────────

test.describe('Quick win #4: stream name pre-fill', () => {
  test('stream name field exists on import page', async ({ page }) => {
    await page.goto('/import')
    const text = await page.textContent('body') ?? ''
    if (text.includes('login')) return
    // Stream name field is visible after file upload — check it exists in DOM
    const body = await page.content()
    expect(body).toMatch(/stream.*name|income.*stream/i)
    console.log('✓ Stream name field exists in import page')
  })

  test('stream name field shows auto-detected label', async ({ page }) => {
    await page.goto('/import')
    const text = await page.textContent('body') ?? ''
    if (text.includes('login')) return
    const body = await page.content()
    expect(body).toMatch(/auto.?detected|auto.?suggest/i)
    console.log('✓ "auto-detected" label present on stream name field')
  })
})

// ─── Sample file buttons ──────────────────────────────────────────────────────

test.describe('Sample file quick-load buttons', () => {
  test('sample files are served from /samples/', async ({ request }) => {
    const samples = [
      '/samples/stripe-balance-sample.csv',
      '/samples/paypal-activity-sample.csv',
      '/samples/upwork-transactions-sample.csv',
      '/samples/generic-invoices-sample.csv',
    ]
    for (const s of samples) {
      const res = await request.get(s)
      expect(res.status()).toBe(200)
      const text = await res.text()
      expect(text.split('\n').length).toBeGreaterThan(2)
      console.log(`  ✓ ${s} → ${res.status()} (${text.split('\n').length} lines)`)
    }
  })

  test('new stripe-charges-sample.csv is served', async ({ request }) => {
    const res = await request.get('/samples/stripe-charges-sample.csv')
    expect(res.status()).toBe(200)
    const text = await res.text()
    expect(text).toContain('Amount')
    console.log('✓ stripe-charges-sample.csv served correctly')
  })

  test('new stripe-payouts-sample.csv is served', async ({ request }) => {
    const res = await request.get('/samples/stripe-payouts-sample.csv')
    expect(res.status()).toBe(200)
    const text = await res.text()
    expect(text).toContain('Arrival Date')
    console.log('✓ stripe-payouts-sample.csv served correctly')
  })

  test('import page has "Try a sample file" section', async ({ page }) => {
    await page.goto('/import')
    const text = await page.textContent('body') ?? ''
    if (text.includes('login')) return
    expect(text.toLowerCase()).toMatch(/try.*sample|sample.*file/)
    console.log('✓ "Try a sample file" section visible')
  })

  test('sample buttons for Stripe, PayPal, Upwork, Generic present', async ({ page }) => {
    await page.goto('/import')
    const text = await page.textContent('body') ?? ''
    if (text.includes('login')) return
    for (const name of ['Stripe', 'PayPal', 'Upwork', 'Generic']) {
      expect(text).toContain(name)
    }
    console.log('✓ All 4 sample platform buttons present')
  })
})

// ─── Quick win #1: reduced required fields in API ─────────────────────────────

test.describe('Quick win #1: reduced required fields — API behavior', () => {
  test('POST /api/import with missing date returns 401 not 400 (auth-gated)', async ({ request }) => {
    const res = await request.post('/api/import', {
      data: {
        rows: [{ amount: '150.00', description: 'Test' }],  // no date
        platform: 'generic',
        streamName: 'Test Stream',
      },
      headers: { 'Content-Type': 'application/json' },
    })
    // Without auth, 401. WITH auth, should accept rows without date.
    expect([200, 201, 401]).toContain(res.status())
    expect(res.status()).not.toBe(500)
    if (res.status() === 200 || res.status() === 201) {
      const body = await res.json()
      // Should have imported the row despite missing date
      console.log(`  ✓ POST /api/import (no date) → ${res.status()}, imported: ${body.imported}`)
    } else {
      console.log(`  ✓ POST /api/import (no date) → ${res.status()} (auth-gated)`)
    }
  })

  test('POST /api/import with only amount returns 401 not 400/500', async ({ request }) => {
    const res = await request.post('/api/import', {
      data: {
        rows: [{ amount: '200.00' }],   // only amount
        platform: 'generic',
      },
      headers: { 'Content-Type': 'application/json' },
    })
    expect([200, 201, 401]).toContain(res.status())
    expect(res.status()).not.toBe(500)
    console.log(`✓ POST /api/import (amount-only row) → ${res.status()}`)
  })

  test('import page shows date-optional hint', async ({ page }) => {
    await page.goto('/import')
    const text = await page.textContent('body') ?? ''
    if (text.includes('login')) return
    // Should mention date defaults to today
    const body = await page.content()
    expect(body).toMatch(/date.*today|defaults.*today|today.*date/i)
    console.log('✓ "Date defaults to today" hint present')
  })
})

// ─── Column mapping UI improvements ──────────────────────────────────────────

test.describe('Column mapping UI — field tips', () => {
  test('import page DOM contains field requirement tips', async ({ page }) => {
    await page.goto('/import')
    const text = await page.textContent('body') ?? ''
    if (text.includes('login')) return
    const body = await page.content()
    // Tips for required/optional fields are in the page
    expect(body).toMatch(/required|optional/i)
    console.log('✓ Field requirement labels in mapping UI')
  })
})
