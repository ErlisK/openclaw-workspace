/**
 * scripts/signup-linkedin.js
 * Attempt LinkedIn personal account creation to then create company page
 */
const { chromium } = require('playwright')
const https = require('https')

const EMAIL = 'scide-founder@agentmail.to'
const PASS = 'AgentQA2024!LinkedIn#'
const FIRST = 'AgentQA'
const LAST = 'Founder'
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
      console.log('✓ Found email:', m.subject)
      const full = await apiGet(`https://api.agentmail.to/v0/inboxes/${inbox}/messages/${m.id}`)
      return full
    }
    console.log(`  Waiting for "${contains}"... ${Math.round((Date.now()-start)/1000)}s`)
  }
  return null
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  
  console.log('1. Loading LinkedIn signup...')
  await page.goto('https://www.linkedin.com/signup/cold-join', { waitUntil: 'domcontentloaded', timeout: 25000 })
  await page.waitForTimeout(2000)
  
  console.log('2. Filling email + password...')
  await page.fill('#email-address', EMAIL)
  await page.fill('#password', PASS)
  await page.screenshot({ path: '/tmp/li-step1.png' })
  
  console.log('3. Clicking Join...')
  await page.click('button[type="submit"], [data-tracking-control-name="cold_join_email_password"]')
  await page.waitForTimeout(4000)
  
  console.log('After email/pass step - URL:', page.url())
  await page.screenshot({ path: '/tmp/li-step2.png' })
  
  // Check for name step
  const nameFields = await page.$$('input[name="firstName"], #firstName, #first-name')
  console.log('Name fields:', nameFields.length)
  
  if (nameFields.length > 0) {
    console.log('4. Filling name...')
    const firstInput = await page.$('#firstName, input[name="firstName"], #first-name')
    const lastInput = await page.$('#lastName, input[name="lastName"], #last-name')
    if (firstInput) await firstInput.fill(FIRST)
    if (lastInput) await lastInput.fill(LAST)
    
    const continueBtn = await page.$('button[type="submit"]')
    if (continueBtn) {
      await continueBtn.click()
      await page.waitForTimeout(3000)
    }
  }
  
  console.log('After name step - URL:', page.url())
  await page.screenshot({ path: '/tmp/li-step3.png' })
  
  // Look for verification email
  if (page.url().includes('verify') || page.url().includes('email')) {
    console.log('5. Waiting for LinkedIn verification email...')
    const email = await waitForEmail(EMAIL, 'linkedin', 90000)
    if (email) {
      const body = email.body_html || email.body_text || ''
      console.log('Email body snippet:', body.substring(0, 300))
      // Look for PIN/OTP
      const pinMatch = body.match(/\b(\d{6})\b/)
      if (pinMatch) {
        console.log('Found PIN:', pinMatch[1])
        const pinInput = await page.$('input[name="pin"], input[placeholder*="code" i], input[type="tel"]')
        if (pinInput) {
          await pinInput.fill(pinMatch[1])
          await page.click('button[type="submit"]')
          await page.waitForTimeout(3000)
        }
      }
    }
  }
  
  console.log('Final URL:', page.url())
  await page.screenshot({ path: '/tmp/li-final.png' })
  
  await browser.close()
}

main().catch(err => { console.error(err.message); process.exit(1) })
