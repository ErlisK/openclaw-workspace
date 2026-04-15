/**
 * scripts/signup-devto.js
 * Complete DEV.to signup, verify email, and publish article
 */
const { chromium } = require('playwright')
const https = require('https')

const DEPLOYED = 'https://startup-87-agentqa-human-in-the-loop-e2e-testing-nfkznkrzm.vercel.app'
const EMAIL = 'scide-founder@agentmail.to'
const PASS = 'AgentQA2024!SecureDev#'
const USERNAME = 'agentqa_io'
const NAME = 'AgentQA'
const AGENTMAIL_KEY = process.env.AGENTMAIL_API_KEY

function apiGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Authorization': `Bearer ${AGENTMAIL_KEY}` } }, res => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => { try { resolve(JSON.parse(d)) } catch { resolve(d) } })
    }).on('error', reject)
  })
}

async function waitForEmail(inbox, contains, maxMs = 180000) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    await new Promise(r => setTimeout(r, 8000))
    const data = await apiGet(`https://api.agentmail.to/v0/inboxes/${inbox}/messages?limit=20`)
    const msgs = data.messages || []
    const m = msgs.find(msg => msg.subject && msg.subject.toLowerCase().includes(contains.toLowerCase()))
    if (m) {
      console.log('✓ Found email:', m.subject)
      const full = await apiGet(`https://api.agentmail.to/v0/inboxes/${inbox}/messages/${m.id}`)
      return full
    }
    console.log(`  Waiting for "${contains}" email... ${Math.round((Date.now()-start)/1000)}s`)
  }
  return null
}

const ARTICLE_BODY = `AI coding agents (Cursor, Devin, Claude Code) are shipping real applications every day. The missing piece? Someone to actually use them and verify they work.

**[AgentQA](${DEPLOYED}?utm_source=devto&utm_medium=article&utm_campaign=devto_launch)** is a testing marketplace purpose-built for the agentic era.

## The Problem

AI agents are great at writing code. They're terrible at knowing if the UX actually works.

Automated tests miss:
- Actual user confusion ("why does this button do nothing?")
- Network errors that only appear in real browser context
- Console errors that don't trip assertions
- Flows that "technically work" but feel completely broken

## How AgentQA Works

1. **Post a test job** — via dashboard or REST API (your agent can call it directly)
2. **A human tester claims it** — within minutes
3. **They run your app** — in a sandboxed environment capturing all network requests and console logs
4. **You get a structured report** — star rating, bug categories, free-text notes + full network/console log

## Pricing

| Tier | Duration | Price |
|------|----------|-------|
| Quick | 10 min | $5 |
| Standard | 20 min | $10 |
| Deep | 30 min | $15 |

Credits-based, no subscription. Your agent can pre-purchase credits and call the API autonomously.

## Tech Stack

- Next.js 15 + Supabase + Stripe + PostHog on Vercel
- Sandboxed proxy iframe for network request capture
- SSRF protection to prevent testers from accessing internal resources

## Why Now

We're in the early days of agentic software development. Agents are writing code, deploying it, iterating — but the human validation feedback loop is missing. AgentQA closes that loop.

👉 **[Try it at agentqa.vercel.app](${DEPLOYED}?utm_source=devto&utm_medium=article&utm_campaign=devto_launch)**

Happy to discuss the proxy sandboxing architecture or agent-native API design in the comments!`

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  
  console.log('1. Loading DEV.to signup...')
  await page.goto('https://dev.to/enter?state=new-user', { waitUntil: 'domcontentloaded', timeout: 25000 })
  await page.waitForTimeout(1500)
  
  // Click email signup
  const emailBtn = await page.$('[data-testid="email-signup"], a[href*="email"], button:has-text("Email")')
  if (emailBtn) {
    await emailBtn.click()
    await page.waitForTimeout(1000)
  }
  
  console.log('2. Filling signup form...')
  await page.fill('input[name="user[name]"]', NAME)
  await page.fill('input[name="user[username]"]', USERNAME)
  await page.fill('input[name="user[email]"]', EMAIL)
  await page.fill('input[name="user[password]"]', PASS)
  await page.fill('input[name="user[password_confirmation]"]', PASS)
  
  await page.screenshot({ path: '/tmp/devto-signup-filled.png' })
  
  console.log('3. Submitting signup...')
  await page.click('input[type="submit"][name="commit"]')
  await page.waitForTimeout(4000)
  
  const afterUrl = page.url()
  const afterTitle = await page.title()
  console.log('After signup URL:', afterUrl)
  console.log('After signup title:', afterTitle)
  await page.screenshot({ path: '/tmp/devto-after-signup.png' })
  
  // Check for email verification needed
  const needsVerify = afterUrl.includes('confirm') || afterTitle.toLowerCase().includes('confirm') ||
    afterTitle.toLowerCase().includes('check') || afterTitle.toLowerCase().includes('email')
  
  if (needsVerify || afterUrl === 'https://dev.to/enter') {
    console.log('4. Checking for confirmation email...')
    const email = await waitForEmail(EMAIL, 'dev.to', 180000)
    if (email) {
      const body = email.body_html || email.body_text || ''
      // Extract confirmation link
      const linkMatch = body.match(/href="(https:\/\/dev\.to\/[^"]*confirm[^"]*)"/i) ||
                        body.match(/(https:\/\/dev\.to\/confirm[^\s"<]+)/i)
      if (linkMatch) {
        console.log('5. Clicking confirmation link...')
        await page.goto(linkMatch[1], { waitUntil: 'domcontentloaded', timeout: 30000 })
        await page.waitForTimeout(2000)
        console.log('After confirm URL:', page.url())
        await page.screenshot({ path: '/tmp/devto-after-confirm.png' })
      }
    } else {
      console.log('No confirmation email received within timeout')
    }
  }
  
  // Try to navigate to new post
  console.log('\n6. Creating new article...')
  await page.goto('https://dev.to/new', { waitUntil: 'domcontentloaded', timeout: 25000 })
  await page.waitForTimeout(2000)
  console.log('New post URL:', page.url())
  console.log('New post title:', await page.title())
  
  const postFields = await page.$$eval('input:not([type="hidden"]), textarea[id]', els =>
    els.map(e => ({ type: e.type, name: e.name, id: e.id }))
  )
  console.log('Post fields:', postFields)
  await page.screenshot({ path: '/tmp/devto-new-post.png' })
  
  await browser.close()
}

main().catch(err => { console.error(err.message); process.exit(1) })
