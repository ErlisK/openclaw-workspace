/**
 * scripts/linkedin-name-step.js
 * Fill in the LinkedIn name step using proper React input events
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
                               (msg.from || '').toLowerCase().includes('linkedin'))
    if (m) {
      console.log('✓ Found email:', m.subject, 'from:', m.from)
      const full = await apiGet(`https://api.agentmail.to/v0/inboxes/${inbox}/messages/${m.id}`)
      return full
    }
    console.log(`  Waiting for "${contains}" email... ${Math.round((Date.now()-start)/1000)}s`)
  }
  return null
}

async function typeIntoReactInput(page, selector, text) {
  const el = await page.$(selector)
  if (!el) return false
  await el.click()
  await el.type(text, { delay: 50 }) // Use type() for React inputs
  return true
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  
  // Step 1: Email + password
  console.log('1. LinkedIn signup — email + password...')
  await page.goto('https://www.linkedin.com/signup/cold-join', { waitUntil: 'domcontentloaded', timeout: 25000 })
  await page.waitForTimeout(2000)
  
  await page.fill('#email-address', EMAIL)
  await page.fill('#password', PASS)
  await page.click('button[type="submit"]')
  await page.waitForTimeout(4000)
  
  console.log('Step 1 result URL:', page.url())
  await page.screenshot({ path: '/tmp/li3-step1.png' })
  
  // Step 2: Name form
  console.log('2. Filling name form...')
  let nameFields = await page.$$('input[id*="firstName" i], input[id*="first-name" i], input[placeholder*="first" i]')
  console.log('Name fields found:', nameFields.length)
  
  if (nameFields.length === 0) {
    // Try by label text
    nameFields = await page.$$('input[type="text"]')
    console.log('Generic text inputs:', nameFields.length)
  }
  
  // Dump all inputs
  const allInputs = await page.$$eval('input', els => 
    els.map(e => ({ type: e.type, name: e.name, id: e.id, placeholder: e.placeholder, label: '' }))
  )
  console.log('All inputs:', JSON.stringify(allInputs))
  
  // Find first/last name inputs and type into them
  const inputs = await page.$$('input[type="text"]')
  if (inputs.length >= 2) {
    await inputs[0].click()
    await inputs[0].type(FIRST, { delay: 50 })
    await inputs[1].click()
    await inputs[1].type(LAST, { delay: 50 })
    
    await page.screenshot({ path: '/tmp/li3-name-filled.png' })
    
    const continueBtn = await page.$('button:has-text("Continue"), button[type="submit"]')
    if (continueBtn) {
      await continueBtn.click()
      await page.waitForTimeout(4000)
    }
  }
  
  console.log('Step 2 result URL:', page.url())
  await page.screenshot({ path: '/tmp/li3-step2.png' })
  
  // Step 3: Handle birthday / location / verification
  for (let i = 0; i < 8; i++) {
    const url = page.url()
    console.log(`Step ${3+i} URL:`, url)
    
    if (url.includes('feed') || url.includes('mynetwork') || url.includes('dashboard')) {
      console.log('✅ Signed up and logged in!')
      break
    }
    
    if (url.includes('verif') || url.includes('email-pin') || url.includes('pin')) {
      console.log('Email verification required — waiting...')
      const email = await waitForEmail(EMAIL, 'linkedin', 90000)
      if (email) {
        const body = email.body_html || email.body_text || ''
        const pinMatch = body.match(/\b(\d{6})\b/)
        if (pinMatch) {
          console.log('  OTP found:', pinMatch[1])
          const pinInput = await page.$('input[type="text"], input[type="tel"]')
          if (pinInput) {
            await pinInput.type(pinMatch[1], { delay: 50 })
            await page.click('button[type="submit"]')
            await page.waitForTimeout(3000)
          }
        }
      }
      continue
    }
    
    await page.screenshot({ path: `/tmp/li3-onboard-${i}.png` })
    
    const skipBtn = await page.$('button:has-text("Skip"), a:has-text("Skip")')
    const nextBtn = await page.$('button:has-text("Next"), button:has-text("Continue"), button:has-text("Agree"), button[type="submit"]')
    
    if (skipBtn) {
      console.log('  Skipping step...')
      await skipBtn.click()
    } else if (nextBtn) {
      const btnText = await nextBtn.evaluate(el => el.textContent?.trim())
      console.log('  Clicking button:', btnText)
      await nextBtn.click()
    } else {
      console.log('  No buttons found — breaking')
      break
    }
    await page.waitForTimeout(3000)
  }
  
  const finalUrl = page.url()
  console.log('\nFinal URL:', finalUrl)
  await page.screenshot({ path: '/tmp/li3-final.png' })
  
  const isLoggedIn = !finalUrl.includes('login') && !finalUrl.includes('signup') && !finalUrl.includes('join')
  console.log('Logged in:', isLoggedIn)
  
  if (isLoggedIn) {
    console.log('\n5. Creating company page...')
    await page.goto('https://www.linkedin.com/company/setup/new', { waitUntil: 'domcontentloaded', timeout: 25000 })
    await page.waitForTimeout(3000)
    console.log('Company setup URL:', page.url())
    await page.screenshot({ path: '/tmp/li3-company.png' })
    
    const companyFields = await page.$$eval('input, textarea, select', els =>
      els.filter(e => !['hidden','checkbox','radio'].includes(e.type))
         .map(e => ({ type: e.type, name: e.name, id: e.id, placeholder: e.placeholder }))
    )
    console.log('Company fields:', JSON.stringify(companyFields.slice(0, 10)))
  }
  
  await browser.close()
}

main().catch(err => { console.error(err.message); process.exit(1) })
