/**
 * scripts/submit-hn-full.js
 * Create HN account and submit Show HN post
 * Also try Uneed via their actual auth flow
 */
const { chromium } = require('playwright')

const DEPLOYED = 'https://startup-87-agentqa-human-in-the-loop-e2e-testing-nfkznkrzm.vercel.app'
const HN_USER = 'agentqa_founder'
const HN_PASS = 'AgentQA2024!Secure#'

const HN_TITLE = 'Show HN: AgentQA – hire human testers for AI-built apps ($5/test)'
const HN_URL = DEPLOYED + '?utm_source=hackernews&utm_medium=community&utm_campaign=hn_launch'
const HN_TEXT = `AI agents can write code. But they can't tell if the UX actually works.

AgentQA is a testing marketplace for the agentic era: post a test job via API or dashboard, a human tester claims it, runs your app end-to-end, and sends back timestamped network logs, console captures, and structured feedback.

Built for: AI coding agents (Cursor, Devin, Claude Code), solo devs shipping AI-built apps, startups that need QA without hiring.

Stack: Next.js 15 + Supabase + Stripe + PostHog. Deployed on Vercel.

Pricing: $5 for a Quick test (10 min), $10 Standard (20 min), $15 Deep (30 min).

Happy to answer questions about the proxy sandbox architecture (we capture network requests and console logs from a sandboxed iframe).`

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  
  // ── Step 1: Create HN account ──────────────────────────────────────────
  console.log('1. Creating HN account...')
  await page.goto('https://news.ycombinator.com/login?creating=t', { waitUntil: 'domcontentloaded', timeout: 20000 })
  await page.waitForTimeout(1000)
  
  // Second form on page is "Create Account"
  const forms = await page.$$('form')
  console.log('Forms found:', forms.length)
  
  // Fill the create account form (second form)
  const allInputs = await page.$$('input[name="acct"], input[name="pw"]')
  console.log('Inputs found:', allInputs.length)
  
  if (forms.length >= 2) {
    // Get inputs from second form (Create Account)
    const createForm = forms[1]
    const userInput = await createForm.$('input[name="acct"]')
    const passInput = await createForm.$('input[name="pw"]')
    
    if (userInput) await userInput.fill(HN_USER)
    if (passInput) await passInput.fill(HN_PASS)
    
    await page.screenshot({ path: '/tmp/hn-create-filled.png' })
    
    const submitBtn = await createForm.$('input[type="submit"]')
    if (submitBtn) {
      await submitBtn.click()
      await page.waitForTimeout(3000)
    }
  }
  
  const afterUrl = page.url()
  const afterTitle = await page.title()
  console.log('After create:', afterUrl)
  console.log('Title:', afterTitle)
  await page.screenshot({ path: '/tmp/hn-after-create.png' })
  
  // ── Step 2: Submit post ────────────────────────────────────────────────
  if (!afterUrl.includes('login') && !afterUrl.includes('error')) {
    console.log('\n2. Navigating to submit...')
    await page.goto('https://news.ycombinator.com/submit', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(1500)
    
    const submitFields = await page.$$eval('input:not([type="hidden"]), textarea', els =>
      els.map(e => ({ type: e.type, name: e.name, id: e.id }))
    )
    console.log('Submit fields:', submitFields)
    await page.screenshot({ path: '/tmp/hn-submit-form.png' })
    
    // Fill submit form
    const titleInput = await page.$('input[name="title"]')
    const urlInput = await page.$('input[name="url"]')
    const textInput = await page.$('textarea[name="text"]')
    
    if (titleInput) await titleInput.fill(HN_TITLE)
    if (urlInput) await urlInput.fill(HN_URL)
    if (textInput) await textInput.fill(HN_TEXT)
    
    await page.screenshot({ path: '/tmp/hn-submit-filled.png' })
    
    const sub = await page.$('input[type="submit"]')
    if (sub) {
      console.log('3. Submitting...')
      await sub.click()
      await page.waitForTimeout(3000)
      console.log('After submit URL:', page.url())
      console.log('After submit title:', await page.title())
      await page.screenshot({ path: '/tmp/hn-after-submit.png' })
    }
  } else {
    console.log('Account creation may have failed or needs verification')
  }
  
  await browser.close()
}

main().catch(err => { console.error(err.message); process.exit(1) })
