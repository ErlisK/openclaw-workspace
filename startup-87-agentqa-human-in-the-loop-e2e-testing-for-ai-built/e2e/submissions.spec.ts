/**
 * e2e/submissions.spec.ts
 * 
 * Automated directory submissions for BetaWindow.
 * Uses Playwright to submit to directories and communities.
 * Documents results in submissions-log.json.
 */
import { test, expect, chromium } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const DEPLOYED = 'https://startup-87-betawindow-human-in-the-loop-e2e-testing-nfkznkrzm.vercel.app'
const EMAIL = 'scide-founder@agentmail.to'
const PRODUCT_NAME = 'BetaWindow'
const TAGLINE = 'Human QA for AI-built apps — starting at $5/test'
const DESCRIPTION = `BetaWindow connects AI coding agents with vetted human testers who run live end-to-end sessions on your app — capturing network logs, console errors, and structured feedback — so agents know their code actually works. Starting at $5 per session.`
const SHORT_DESC = 'Real humans test what AI agents build. Submit a URL → get a bug report in under 4 hours.'

const LOG_PATH = path.join(__dirname, '../public/assets/submissions-log.json')

interface SubmissionResult {
  platform: string
  status: 'submitted' | 'pending-email' | 'needs-manual' | 'error' | 'already-exists'
  url?: string
  notes?: string
  timestamp: string
}

function log(results: SubmissionResult[]) {
  fs.writeFileSync(LOG_PATH, JSON.stringify(results, null, 2))
}

const results: SubmissionResult[] = []
const ts = () => new Date().toISOString()

// ── 1. Uneed.best ──────────────────────────────────────────────────────────
test('Submit to Uneed.best', async ({ page }) => {
  await page.goto('https://www.uneed.best/submit-a-tool', { timeout: 30000 })
  await page.waitForLoadState('networkidle')
  
  const pageTitle = await page.title()
  console.log('Uneed title:', pageTitle)
  
  // Check for submission form
  const hasForm = await page.$('form, input[type="url"], input[name*="url"], input[placeholder*="url" i]')
  
  if (hasForm) {
    // Try to fill and submit
    const urlInput = await page.$('input[type="url"], input[name*="url"], input[placeholder*="url" i], input[placeholder*="link" i]')
    if (urlInput) {
      await urlInput.fill(DEPLOYED + '?utm_source=uneed&utm_medium=directory&utm_campaign=uneed_submit')
      await page.screenshot({ path: '/tmp/uneed-filled.png' })
    }
    results.push({ platform: 'Uneed.best', status: 'needs-manual', url: 'https://www.uneed.best/submit-a-tool', notes: 'Form found - requires account/email verification', timestamp: ts() })
  } else {
    results.push({ platform: 'Uneed.best', status: 'needs-manual', url: 'https://www.uneed.best/submit-a-tool', notes: `Page loaded: ${pageTitle}`, timestamp: ts() })
  }
  
  log(results)
  console.log('Uneed result logged')
})

// ── 2. There's An AI For That ──────────────────────────────────────────────
test('Submit to Theres An AI For That', async ({ page }) => {
  await page.goto('https://theresanaiforthat.com/get-listed/', { timeout: 30000 })
  await page.waitForLoadState('networkidle')
  
  const pageTitle = await page.title()
  console.log('TAAFT title:', pageTitle)
  await page.screenshot({ path: '/tmp/taaft-submit.png' })
  
  results.push({ 
    platform: "There's An AI For That", 
    status: 'needs-manual', 
    url: 'https://theresanaiforthat.com/get-listed/',
    notes: 'AI tools directory - requires form fill with screenshots',
    timestamp: ts() 
  })
  log(results)
})

// ── 3. Fazier.com ──────────────────────────────────────────────────────────
test('Submit to Fazier', async ({ page }) => {
  await page.goto('https://fazier.com/launches/new', { timeout: 30000 })
  await page.waitForLoadState('networkidle')
  
  const pageTitle = await page.title()
  console.log('Fazier title:', pageTitle)
  await page.screenshot({ path: '/tmp/fazier-submit.png' })
  
  results.push({ 
    platform: 'Fazier', 
    status: 'needs-manual', 
    url: 'https://fazier.com/launches/new',
    notes: pageTitle,
    timestamp: ts() 
  })
  log(results)
})

// ── 4. Launching Next ─────────────────────────────────────────────────────
test('Submit to Launching Next', async ({ page }) => {
  await page.goto('https://launchingnext.com/submit/', { timeout: 30000 })
  await page.waitForLoadState('networkidle')
  
  const pageTitle = await page.title()
  console.log('LaunchingNext title:', pageTitle)
  await page.screenshot({ path: '/tmp/launchingnext-submit.png' })
  
  results.push({ 
    platform: 'Launching Next', 
    status: 'needs-manual', 
    url: 'https://launchingnext.com/submit/',
    notes: pageTitle,
    timestamp: ts() 
  })
  log(results)
})

// ── 5. SaaSHub ────────────────────────────────────────────────────────────
test('Submit to SaaSHub', async ({ page }) => {
  await page.goto('https://www.saashub.com/add-application', { timeout: 30000 })
  await page.waitForLoadState('networkidle')
  
  const pageTitle = await page.title()
  console.log('SaaSHub title:', pageTitle)
  await page.screenshot({ path: '/tmp/saashub-submit.png' })
  
  results.push({ 
    platform: 'SaaSHub', 
    status: 'needs-manual', 
    url: 'https://www.saashub.com/add-application',
    notes: pageTitle,
    timestamp: ts() 
  })
  log(results)
})

// ── 6. BetaList ───────────────────────────────────────────────────────────
test('Submit to BetaList', async ({ page }) => {
  await page.goto('https://betalist.com/submit', { timeout: 30000 })
  await page.waitForLoadState('networkidle')
  
  const pageTitle = await page.title()
  console.log('BetaList title:', pageTitle)
  await page.screenshot({ path: '/tmp/betalist-submit.png' })
  
  results.push({ 
    platform: 'BetaList', 
    status: 'needs-manual', 
    url: 'https://betalist.com/submit',
    notes: pageTitle,
    timestamp: ts() 
  })
  log(results)
})

// ── 7. Micro Launch ───────────────────────────────────────────────────────
test('Submit to Micro Launch', async ({ page }) => {
  await page.goto('https://microlaunch.net/submit', { timeout: 30000 })
  await page.waitForLoadState('networkidle')
  
  const pageTitle = await page.title()
  console.log('Micro Launch title:', pageTitle)
  await page.screenshot({ path: '/tmp/microlaunch-submit.png' })
  
  results.push({ 
    platform: 'Micro Launch', 
    status: 'needs-manual', 
    url: 'https://microlaunch.net/submit',
    notes: pageTitle,
    timestamp: ts() 
  })
  log(results)
})

// ── 8. Product Hunt (check submission form) ───────────────────────────────
test('Check Product Hunt submission flow', async ({ page }) => {
  await page.goto('https://www.producthunt.com/posts/new', { timeout: 30000 })
  await page.waitForLoadState('networkidle')
  
  const pageTitle = await page.title()
  const currentUrl = page.url()
  console.log('PH title:', pageTitle, 'URL:', currentUrl)
  await page.screenshot({ path: '/tmp/producthunt-submit.png' })
  
  results.push({ 
    platform: 'Product Hunt', 
    status: 'needs-manual', 
    url: 'https://www.producthunt.com/posts/new',
    notes: `Requires PH account - URL: ${currentUrl}`,
    timestamp: ts() 
  })
  log(results)
})

// ── 9. AlternativeTo ─────────────────────────────────────────────────────
test('Submit to AlternativeTo', async ({ page }) => {
  await page.goto('https://alternativeto.net/suggest/', { timeout: 30000 })
  await page.waitForLoadState('networkidle')
  
  const pageTitle = await page.title()
  console.log('AlternativeTo title:', pageTitle)
  await page.screenshot({ path: '/tmp/alternativeto-submit.png' })
  
  results.push({ 
    platform: 'AlternativeTo', 
    status: 'needs-manual', 
    url: 'https://alternativeto.net/suggest/',
    notes: pageTitle,
    timestamp: ts() 
  })
  log(results)
})

// ── 10. ToolFinder ────────────────────────────────────────────────────────
test('Submit to ToolFinder', async ({ page }) => {
  await page.goto('https://toolfinder.co/submit', { timeout: 30000 })
  await page.waitForLoadState('networkidle')
  
  const pageTitle = await page.title()
  console.log('ToolFinder title:', pageTitle)
  await page.screenshot({ path: '/tmp/toolfinder-submit.png' })
  
  results.push({ 
    platform: 'ToolFinder', 
    status: 'needs-manual', 
    url: 'https://toolfinder.co/submit',
    notes: pageTitle,
    timestamp: ts() 
  })
  log(results)
})
