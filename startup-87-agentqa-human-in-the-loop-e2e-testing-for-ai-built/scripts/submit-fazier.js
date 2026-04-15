/**
 * scripts/submit-fazier.js
 * Probes Fazier's submit flow (it's a PH-like platform)
 */
const { chromium } = require('playwright')

const DEPLOYED = 'https://startup-87-agentqa-human-in-the-loop-e2e-testing-nfkznkrzm.vercel.app'
const EMAIL = 'scide-founder@agentmail.to'

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  
  console.log('1. Checking Fazier homepage...')
  await page.goto('https://fazier.com', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(2000)
  
  // Look for submit/add product link
  const links = await page.$$eval('a', els =>
    els.map(e => ({ text: e.textContent?.trim() || '', href: e.href }))
       .filter(l => l.text && (l.href.includes('submit') || l.href.includes('launch') || 
                               l.text.toLowerCase().includes('submit') || l.text.toLowerCase().includes('add') ||
                               l.text.toLowerCase().includes('launch')))
  )
  console.log('Submit links:', JSON.stringify(links.slice(0, 10), null, 2))
  
  // Go to signup
  console.log('\n2. Checking signup...')
  await page.goto('https://fazier.com/sign-up', { waitUntil: 'domcontentloaded', timeout: 20000 })
  await page.waitForTimeout(1500)
  console.log('URL:', page.url(), 'Title:', await page.title())
  
  const fields = await page.$$eval('input:not([type="hidden"])', els =>
    els.map(e => ({ type: e.type, name: e.name, id: e.id, placeholder: e.placeholder }))
  )
  console.log('Fields:', JSON.stringify(fields, null, 2))
  await page.screenshot({ path: '/tmp/fazier-signup.png' })
  
  await browser.close()
}

main().catch(err => { console.error(err.message); process.exit(1) })
