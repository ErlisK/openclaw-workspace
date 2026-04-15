/**
 * scripts/submit-hn.js
 * Submit to Hacker News Show HN using Playwright
 */
const { chromium } = require('playwright')
const https = require('https')

const DEPLOYED = 'https://startup-87-agentqa-human-in-the-loop-e2e-testing-nfkznkrzm.vercel.app'
const EMAIL = 'scide-founder@agentmail.to'
const PASS = 'AgentQA2024!Secure#'
const HN_USER = 'agentqa_founder'
const AGENTMAIL_KEY = process.env.AGENTMAIL_API_KEY

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Authorization': `Bearer ${AGENTMAIL_KEY}`, ...headers } }, res => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => { try { resolve(JSON.parse(d)) } catch { resolve(d) } })
    }).on('error', reject)
  })
}

async function waitForEmail(inbox, contains, max = 120000) {
  const start = Date.now()
  while (Date.now() - start < max) {
    await new Promise(r => setTimeout(r, 6000))
    const data = await get(`https://api.agentmail.to/v0/inboxes/${inbox}/messages?limit=20`)
    const msgs = data.messages || []
    const m = msgs.find(msg => msg.subject && msg.subject.toLowerCase().includes(contains.toLowerCase()))
    if (m) {
      console.log('✓ Found email:', m.subject)
      const full = await get(`https://api.agentmail.to/v0/inboxes/${inbox}/messages/${m.id}`)
      return full
    }
    console.log(`Still waiting for "${contains}" email... ${Math.round((Date.now()-start)/1000)}s`)
  }
  return null
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  
  // ── TRY HN ────────────────────────────────────────────────────────────────
  console.log('\n=== HACKER NEWS ===')
  {
    const page = await browser.newPage()
    await page.goto('https://news.ycombinator.com/login', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(1500)
    
    const fields = await page.$$eval('input', els => els.map(e => ({ type: e.type, name: e.name })))
    console.log('HN login fields:', fields)
    
    // Try creating account
    await page.goto('https://news.ycombinator.com/login?creating=t', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(1500)
    
    const createFields = await page.$$eval('input', els => els.map(e => ({ type: e.type, name: e.name })))
    console.log('HN create account fields:', createFields)
    await page.screenshot({ path: '/tmp/hn-create.png' })
    
    if (createFields.find(f => f.name === 'user')) {
      await page.fill('input[name="user"]', HN_USER)
      await page.fill('input[name="pw"]', PASS)
      
      const submitBtn = await page.$('input[type="submit"]')
      if (submitBtn) {
        await submitBtn.click()
        await page.waitForTimeout(2000)
        console.log('HN after create:', page.url(), await page.title())
        await page.screenshot({ path: '/tmp/hn-after-create.png' })
      }
    }
    await page.close()
  }
  
  // ── TRY UNEED ────────────────────────────────────────────────────────────
  console.log('\n=== UNEED ===')
  {
    const page = await browser.newPage()
    await page.goto('https://www.uneed.best/create-account', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(2000)
    console.log('Uneed signup URL:', page.url(), await page.title())
    await page.screenshot({ path: '/tmp/uneed-signup.png' })
    await page.close()
  }
  
  // ── TRY TOPAI ────────────────────────────────────────────────────────────
  console.log('\n=== TOPAI.TOOLS ===')
  {
    const page = await browser.newPage()
    await page.goto('https://topai.tools/submit', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(3000)
    console.log('TopAI URL:', page.url(), await page.title())
    const fields = await page.$$eval('input:not([type="hidden"]), textarea', els =>
      els.map(e => ({ type: e.type, name: e.name, placeholder: e.placeholder }))
    )
    console.log('TopAI fields:', fields)
    await page.screenshot({ path: '/tmp/topai-submit.png' })
    await page.close()
  }
  
  // ── TRY FUTUREPEDIA ──────────────────────────────────────────────────────
  console.log('\n=== FUTUREPEDIA ===')
  {
    const page = await browser.newPage()
    await page.goto('https://www.futurepedia.io/submit-tool', { waitUntil: 'domcontentloaded', timeout: 25000 })
    await page.waitForTimeout(3000)
    console.log('Futurepedia URL:', page.url(), await page.title())
    const fields = await page.$$eval('input:not([type="hidden"]), textarea', els =>
      els.map(e => ({ type: e.type, name: e.name, placeholder: e.placeholder }))
    )
    console.log('Futurepedia fields:', JSON.stringify(fields, null, 2))
    await page.screenshot({ path: '/tmp/futurepedia-submit.png' })
    await page.close()
  }
  
  await browser.close()
}

main().catch(err => { console.error(err.message); process.exit(1) })
