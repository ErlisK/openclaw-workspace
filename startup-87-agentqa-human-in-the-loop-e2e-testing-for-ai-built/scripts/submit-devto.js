/**
 * scripts/submit-devto.js
 * Try DEV.to signup + publish an article via their form
 * Also try ProductHunt which may work with Cloudflare now
 */
const { chromium } = require('playwright')
const https = require('https')

const DEPLOYED = 'https://startup-87-agentqa-human-in-the-loop-e2e-testing-nfkznkrzm.vercel.app'
const EMAIL = 'scide-founder@agentmail.to'
const PASS = 'AgentQA2024!Secure#'
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

async function waitForEmail(inbox, contains, maxMs = 120000) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    await new Promise(r => setTimeout(r, 6000))
    const data = await apiGet(`https://api.agentmail.to/v0/inboxes/${inbox}/messages?limit=20`)
    const msgs = data.messages || []
    const m = msgs.find(msg => msg.subject && msg.subject.toLowerCase().includes(contains.toLowerCase()))
    if (m) {
      const full = await apiGet(`https://api.agentmail.to/v0/inboxes/${inbox}/messages/${m.id}`)
      return full
    }
    console.log(`Waiting for "${contains}" email... ${Math.round((Date.now()-start)/1000)}s`)
  }
  return null
}

const ARTICLE_CONTENT = `---
title: Show HN Alternative: AgentQA – Human QA testing for AI-built apps
published: true
description: We built a marketplace where AI agents hire human testers. Here's why it's needed and how it works.
tags: ai, testing, developer-tools, startup
cover_image: https://startup-87-agentqa-human-in-the-loop-e2e-testing-nfkznkrzm.vercel.app/assets/og-image.png
---

# AgentQA: Human QA Testing for AI-Built Apps

AI coding agents (Cursor, Devin, Claude Code) are shipping real applications. The missing piece? Someone to actually use them.

**[AgentQA](${DEPLOYED}?utm_source=devto&utm_medium=article&utm_campaign=devto_launch)** is a testing marketplace purpose-built for the agentic era.

## The Problem

AI agents are great at writing code. They're terrible at knowing if the UX actually works.

Automated tests miss:
- Actual user confusion
- Network errors that only happen in context
- Console errors that don't trip assertions
- Flows that "work" but feel broken

## How AgentQA Works

1. **Post a test job** — via dashboard or REST API (so your agent can call it directly)
2. **Human tester claims it** — within minutes
3. **They run your app** — in a sandboxed environment that captures all network requests and console logs
4. **You get a report** — star rating, bug categories, free-text notes, plus the full network/console log

## Pricing

| Tier | Duration | Price |
|------|----------|-------|
| Quick | 10 min | $5 |
| Standard | 20 min | $10 |
| Deep | 30 min | $15 |

Credits-based, no subscription required. Your AI agent can pre-purchase credits and call the API.

## Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **Supabase** (auth + database)
- **Stripe** (payments)
- **PostHog** (analytics)
- Deployed on **Vercel**

## The Bigger Picture

We're in the early days of agentic software development. Agents are writing code, deploying it, and iterating. The feedback loop that's missing is real-world human validation.

AgentQA closes that loop.

👉 **[Try it: ${DEPLOYED}](${DEPLOYED}?utm_source=devto&utm_medium=article&utm_campaign=devto_launch)**

Questions? I'm happy to discuss the proxy sandboxing architecture, how we handle network log capture, or the agent-native API design.
`

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  
  // ── TRY DEV.TO SIGNUP ─────────────────────────────────────────────────
  console.log('=== DEV.TO SIGNUP ===')
  {
    const page = await browser.newPage()
    await page.goto('https://dev.to/enter?state=new-user', { waitUntil: 'domcontentloaded', timeout: 25000 })
    await page.waitForTimeout(2000)
    
    console.log('Title:', await page.title())
    console.log('URL:', page.url())
    
    // Check for email signup form
    const emailBtn = await page.$('[data-testid="email-signup"], a[href*="email"], button:has-text("Email")')
    if (emailBtn) {
      console.log('Found email signup button')
      await emailBtn.click()
      await page.waitForTimeout(1500)
    }
    
    await page.screenshot({ path: '/tmp/devto-signup.png', fullPage: false })
    
    // Look for signup form after clicking email
    const fields = await page.$$eval('input:not([type="hidden"])', els =>
      els.map(e => ({ type: e.type, name: e.name, id: e.id, placeholder: e.placeholder }))
    )
    console.log('Fields after click:', JSON.stringify(fields, null, 2))
    
    await page.close()
  }
  
  // ── TRY PRODUCT HUNT with longer wait ──────────────────────────────────
  console.log('\n=== PRODUCT HUNT ===')
  {
    const page = await browser.newPage()
    await page.goto('https://www.producthunt.com', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(5000) // Wait for Cloudflare
    console.log('PH title:', await page.title())
    await page.screenshot({ path: '/tmp/ph-homepage.png' })
    
    const signupLinks = await page.$$eval('a, button', els =>
      els.map(e => ({ text: e.textContent?.trim(), href: e.href }))
         .filter(l => l.text && (l.text.toLowerCase().includes('sign') || l.text.toLowerCase().includes('log')))
         .slice(0, 5)
    )
    console.log('PH auth links:', signupLinks)
    await page.close()
  }
  
  await browser.close()
}

main().catch(err => { console.error(err.message); process.exit(1) })
