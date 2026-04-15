/**
 * scripts/complete-linkedin.js
 * Complete LinkedIn signup from name step onward
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
    await new Promise(r => setTimeout(r, 5000))
    const data = await apiGet(`https://api.agentmail.to/v0/inboxes/${inbox}/messages?limit=20`)
    const msgs = data.messages || []
    const m = msgs.find(msg => (msg.subject || '').toLowerCase().includes(contains.toLowerCase()) ||
                               (msg.from || '').toLowerCase().includes(contains.toLowerCase()))
    if (m) {
      console.log('✓ Found email:', m.subject, 'from:', m.from)
      const full = await apiGet(`https://api.agentmail.to/v0/inboxes/${inbox}/messages/${m.id}`)
      return full
    }
    console.log(`  Waiting for "${contains}" email... ${Math.round((Date.now()-start)/1000)}s`)
  }
  return null
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  
  console.log('1. Going to LinkedIn signup...')
  await page.goto('https://www.linkedin.com/signup/cold-join', { waitUntil: 'domcontentloaded', timeout: 25000 })
  await page.waitForTimeout(2000)
  
  // Fill email + password
  await page.fill('#email-address', EMAIL)
  await page.fill('#password', PASS)
  
  // Submit first form
  const joinBtn = await page.$('button[data-tracking-control-name="cold_join_email_password"]') ||
                  await page.$('button[type="submit"]')
  if (joinBtn) {
    await joinBtn.click()
    await page.waitForTimeout(3000)
  }
  
  console.log('After step 1 URL:', page.url())
  await page.screenshot({ path: '/tmp/li2-step1.png' })
  
  // Fill name fields
  const firstInput = await page.$('#firstName, input[name="firstName"]')
  const lastInput = await page.$('#lastName, input[name="lastName"]')
  
  if (firstInput) {
    console.log('2. Filling name fields...')
    await firstInput.fill(FIRST)
    if (lastInput) await lastInput.fill(LAST)
    
    const continueBtn = await page.$('button[type="submit"], button:has-text("Continue"), button:has-text("Agree")')
    if (continueBtn) {
      await continueBtn.click()
      await page.waitForTimeout(3000)
    }
  }
  
  console.log('After name step URL:', page.url())
  await page.screenshot({ path: '/tmp/li2-step2.png' })
  
  // Check for email verification OTP
  if (page.url().includes('verif') || page.url().includes('check-email') || page.url().includes('pin')) {
    console.log('3. Waiting for verification email...')
    const email = await waitForEmail(EMAIL, 'linkedin', 120000)
    if (email) {
      const body = email.body_html || email.body_text || ''
      const pinMatch = body.match(/\b(\d{6})\b/)
      if (pinMatch) {
        console.log('  Found OTP:', pinMatch[1])
        const pinInput = await page.$('input[name="pin"], input[type="text"], input[type="tel"]')
        if (pinInput) {
          await pinInput.fill(pinMatch[1])
          await page.click('button[type="submit"]')
          await page.waitForTimeout(3000)
          console.log('After OTP URL:', page.url())
          await page.screenshot({ path: '/tmp/li2-after-otp.png' })
        }
      }
    }
  }
  
  // Handle any additional onboarding steps
  for (let i = 0; i < 5; i++) {
    const url = page.url()
    console.log(`Step ${i+3} URL:`, url)
    
    if (url.includes('feed') || url.includes('dashboard') || url.includes('mynetwork')) {
      console.log('✅ Logged in to LinkedIn!')
      break
    }
    
    // Skip onboarding steps
    const skipBtn = await page.$('button:has-text("Skip"), a:has-text("Skip"), [data-tracking-control-name*="skip"]')
    const nextBtn = await page.$('button:has-text("Next"), button:has-text("Continue"), button[type="submit"]')
    
    if (skipBtn) {
      console.log('  Clicking Skip...')
      await skipBtn.click()
      await page.waitForTimeout(2000)
    } else if (nextBtn) {
      await page.screenshot({ path: `/tmp/li2-onboard-${i}.png` })
      console.log('  Need to handle:', await page.title())
      // For location/job title steps, just continue
      await nextBtn.click()
      await page.waitForTimeout(2000)
    } else {
      break
    }
  }
  
  const finalUrl = page.url()
  console.log('Final URL:', finalUrl)
  await page.screenshot({ path: '/tmp/li2-final.png' })
  
  // If logged in, navigate to create company page
  if (!finalUrl.includes('login') && !finalUrl.includes('signup') && !finalUrl.includes('join')) {
    console.log('\n4. Creating company page...')
    await page.goto('https://www.linkedin.com/company/setup/new', { waitUntil: 'domcontentloaded', timeout: 25000 })
    await page.waitForTimeout(3000)
    console.log('Company setup URL:', page.url())
    await page.screenshot({ path: '/tmp/li2-company-setup.png' })
    
    const companyFields = await page.$$eval('input:not([type="hidden"]), textarea', els =>
      els.map(e => ({ type: e.type, name: e.name, id: e.id, placeholder: e.placeholder }))
    )
    console.log('Company fields:', JSON.stringify(companyFields.slice(0, 8)))
  }
  
  await browser.close()
}

main().catch(err => { console.error(err.message); process.exit(1) })
