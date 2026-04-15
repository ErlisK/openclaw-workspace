/**
 * scripts/submit-launchingnext.js
 * Submit to Launching Next - wait for Cloudflare and probe form
 */
const { chromium } = require('playwright')

const DEPLOYED = 'https://startup-87-agentqa-human-in-the-loop-e2e-testing-nfkznkrzm.vercel.app'
const EMAIL = 'scide-founder@agentmail.to'

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  
  console.log('Loading Launching Next submit page...')
  await page.goto('https://launchingnext.com/submit/', { waitUntil: 'domcontentloaded', timeout: 30000 })
  
  // Wait for Cloudflare challenge to resolve
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(2000)
    const title = await page.title()
    const url = page.url()
    console.log(`${i}: ${title} | ${url}`)
    if (!title.includes('moment') && !title.includes('Checking')) break
  }
  
  const title = await page.title()
  console.log('Final title:', title)
  
  const fields = await page.$$eval('input:not([type="hidden"]), textarea', els =>
    els.map(e => ({ type: e.type, name: e.name, id: e.id, placeholder: e.placeholder, label: e.labels?.[0]?.textContent?.trim() }))
  )
  console.log('Fields:', JSON.stringify(fields, null, 2))
  
  await page.screenshot({ path: '/tmp/launchingnext-full.png', fullPage: true })
  console.log('Screenshot at /tmp/launchingnext-full.png')
  
  await browser.close()
}

main().catch(err => { console.error(err.message); process.exit(1) })
