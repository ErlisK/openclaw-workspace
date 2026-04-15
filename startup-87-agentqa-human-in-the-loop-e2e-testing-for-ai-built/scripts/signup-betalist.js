/**
 * scripts/signup-betalist.js
 * Complete BetaList signup + submit AgentQA
 */
const { chromium } = require('playwright')
const https = require('https')

const DEPLOYED = 'https://startup-87-agentqa-human-in-the-loop-e2e-testing-nfkznkrzm.vercel.app'
const EMAIL = 'scide-founder@agentmail.to'
const PASS = 'AgentQA2024!Secure#'
const USERNAME = 'agentqa_founder'
const AGENTMAIL_KEY = process.env.AGENTMAIL_API_KEY

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'Authorization': `Bearer ${AGENTMAIL_KEY}`, ...headers } }, res => {
      let data = ''
      res.on('data', d => data += d)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch(e) { resolve(data) }
      })
    })
    req.on('error', reject)
  })
}

async function waitForEmail(inbox, subject_contains, maxWait = 60000) {
  const start = Date.now()
  while (Date.now() - start < maxWait) {
    await new Promise(r => setTimeout(r, 5000))
    const data = await httpsGet(`https://api.agentmail.to/v0/inboxes/${inbox}/messages?limit=10`)
    const msgs = data.messages || []
    const match = msgs.find(m => m.subject && m.subject.toLowerCase().includes(subject_contains.toLowerCase()))
    if (match) return match
    console.log(`Waiting for email (${Math.round((Date.now()-start)/1000)}s)...`)
  }
  return null
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  
  console.log('1. Signing up for BetaList...')
  await page.goto('https://betalist.com/sign_up', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(2000)
  
  // Fill signup form
  await page.fill('input[name="user[username]"]', USERNAME)
  await page.fill('input[name="user[email]"]', EMAIL)
  await page.fill('input[name="user[password]"]', PASS)
  await page.fill('input[name="user[password_confirmation]"]', PASS)
  
  console.log('2. Submitting signup...')
  await page.click('input[type="submit"]')
  await page.waitForTimeout(3000)
  
  const url = page.url()
  const title = await page.title()
  console.log('After signup URL:', url)
  console.log('After signup title:', title)
  await page.screenshot({ path: '/tmp/betalist-after-signup.png' })
  
  // Check if we need email verification
  if (url.includes('confirmation') || title.toLowerCase().includes('confirm') || title.toLowerCase().includes('check')) {
    console.log('3. Email confirmation required. Waiting for verification email...')
    const email = await waitForEmail(EMAIL, 'betalist', 90000)
    if (email) {
      console.log('Got email:', email.subject)
      // Get email body for verification link
      const msgData = await httpsGet(`https://api.agentmail.to/v0/inboxes/${EMAIL}/messages/${email.id}`)
      const body = msgData.body_html || msgData.body_text || ''
      const linkMatch = body.match(/href="(https:\/\/betalist\.com\/[^"]+confirm[^"]*)"/)
      if (linkMatch) {
        console.log('4. Clicking verification link:', linkMatch[1])
        await page.goto(linkMatch[1], { waitUntil: 'domcontentloaded', timeout: 30000 })
        await page.waitForTimeout(2000)
        console.log('After verify URL:', page.url())
      }
    } else {
      console.log('No confirmation email received')
    }
  }
  
  // Try to navigate to submit product
  console.log('5. Navigating to product submission...')
  await page.goto('https://betalist.com/startups/new', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(2000)
  console.log('Submit URL:', page.url(), 'Title:', await page.title())
  
  const fields = await page.$$eval('input:not([type="hidden"]), textarea', els =>
    els.map(e => ({ type: e.type, name: e.name, id: e.id, placeholder: e.placeholder }))
  )
  console.log('Submit fields:', JSON.stringify(fields, null, 2))
  await page.screenshot({ path: '/tmp/betalist-submit-form.png', fullPage: true })
  
  await browser.close()
}

main().catch(err => { console.error(err.message); process.exit(1) })
