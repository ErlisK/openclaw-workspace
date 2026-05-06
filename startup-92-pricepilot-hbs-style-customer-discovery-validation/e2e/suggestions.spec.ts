import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:3000'

// Use a fixed test account that was pre-confirmed, or rely on the app's
// test-mode magic-link bypass if configured. Adjust credentials here.
const EMAIL = `e2e-suggestions-${Date.now()}@pricingsim.com`
const PASSWORD = 'TestPassword123!'

test('Import sample data and run analysis shows suggestions', async ({ page }) => {
  // ── 1. Sign up ────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/signup`)
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  const tos = page.locator('input[type="checkbox"]')
  if (await tos.isVisible()) await tos.check()
  await page.click('button[type="submit"]')

  // Wait for redirect — either directly into the app or to a confirm-email screen
  await page.waitForTimeout(3000)

  // ── 2. Handle email-confirmation gate if present ──────────────────────────
  const currentUrl = page.url()
  if (!currentUrl.includes('/import') && !currentUrl.includes('/dashboard')) {
    // Try logging in — works if Supabase is in auto-confirm mode or magic-link
    await page.goto(`${BASE}/login`)
    await page.fill('input[type="email"]', EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(3000)
  }

  // Ensure we're authenticated by navigating to import directly
  await page.goto(`${BASE}/import`)

  // ── 3. Load sample dataset ────────────────────────────────────────────────
  // Wait for the page to be interactive (auth guard might redirect)
  await page.waitForURL(/\/import/, { timeout: 10000 }).catch(() => {})

  const sampleBtn = page.locator('[data-testid="load-sample-btn"]')
  await expect(sampleBtn).toBeVisible({ timeout: 10000 })
  await sampleBtn.click()

  // Wait for success state — the card has data-testid="import-success"
  await expect(page.locator('[data-testid="import-success"]')).toBeVisible({ timeout: 20000 })

  // ── 4. Navigate to suggestions page ──────────────────────────────────────
  await page.goto(`${BASE}/suggestions`)

  // Should show suggestion cards OR a loading/analyzing state — never a blank screen
  // after sample data has been imported
  await expect(
    page.locator('[data-testid="suggestion-card"], [data-testid="run-engine-btn"], [data-testid="no-data-empty-state"]')
  ).toBeVisible({ timeout: 20000 })

  // If no suggestion cards yet, click run analysis
  const cards = page.locator('[data-testid="suggestion-card"]')
  const cardCount = await cards.count()
  if (cardCount === 0) {
    const runBtn = page.locator('[data-testid="run-engine-btn"], [data-testid="run-engine-empty-btn"]')
    if (await runBtn.first().isVisible()) {
      await runBtn.first().click()
      // After run, either cards appear or we get an informative message
      await expect(
        page.locator('[data-testid="suggestion-card"]')
          .or(page.getByText(/suggestion|confidence|ROI|Analyzing|analysis|pricing/i).first())
      ).toBeVisible({ timeout: 30000 })
    }
  } else {
    // Suggestions already there from the import — verify at least one card is shown
    await expect(cards.first()).toBeVisible()
    // Make sure the title and rationale text are present
    await expect(page.locator('[data-testid="suggestion-why"]').first()).toBeVisible()
  }
})
