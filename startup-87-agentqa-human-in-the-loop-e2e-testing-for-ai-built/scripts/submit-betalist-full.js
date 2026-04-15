/**
 * scripts/submit-betalist-full.js
 * Creates account on BetaList and submits AgentQA
 */
const { chromium } = require('playwright')

const DEPLOYED = 'https://startup-87-agentqa-human-in-the-loop-e2e-testing-nfkznkrzm.vercel.app'
const EMAIL = 'scide-founder@agentmail.to'
const PASS = 'AgentQA2024!Secure'
const NAME = 'AgentQA'

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  
  console.log('1. Trying BetaList signup...')
  await page.goto('https://betalist.com/sign_up', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(2000)
  
  console.log('Title:', await page.title())
  console.log('URL:', page.url())
  
  const fields = await page.$$eval('input:not([type="hidden"])', els =>
    els.map(e => ({ type: e.type, name: e.name, id: e.id, placeholder: e.placeholder }))
  )
  console.log('Signup fields:', JSON.stringify(fields, null, 2))
  
  await page.screenshot({ path: '/tmp/betalist-signup.png' })
  
  // Try to fill signup form if it exists
  const emailField = await page.$('input[type="email"], input[name*="email"]')
  const passField = await page.$('input[type="password"], input[name*="password"]')
  
  if (emailField && passField) {
    console.log('2. Filling signup form...')
    await emailField.fill(EMAIL)
    await passField.fill(PASS)
    
    const nameField = await page.$('input[type="text"], input[name*="name"]')
    if (nameField) await nameField.fill(NAME)
    
    await page.screenshot({ path: '/tmp/betalist-signup-filled.png' })
    
    // Submit
    const submitBtn = await page.$('input[type="submit"], button[type="submit"]')
    if (submitBtn) {
      await submitBtn.click()
      await page.waitForTimeout(3000)
      console.log('After submit URL:', page.url())
      console.log('After submit title:', await page.title())
      await page.screenshot({ path: '/tmp/betalist-after-signup.png' })
    }
  } else {
    console.log('No signup form found - may need different approach')
  }
  
  await browser.close()
}

main().catch(err => { console.error(err.message); process.exit(1) })
