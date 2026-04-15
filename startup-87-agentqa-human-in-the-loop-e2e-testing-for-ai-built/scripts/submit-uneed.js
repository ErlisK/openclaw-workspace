/**
 * scripts/submit-uneed.js
 * Submits AgentQA to Uneed.best — which has a public submission form
 */
const { chromium } = require('playwright')

const DEPLOYED = 'https://startup-87-agentqa-human-in-the-loop-e2e-testing-nfkznkrzm.vercel.app'
const EMAIL = 'scide-founder@agentmail.to'

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  
  console.log('🔍 Loading Uneed submission form...')
  await page.goto('https://www.uneed.best/submit-a-tool', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(2000)
  
  const title = await page.title()
  console.log('Title:', title)
  
  // Dump all form fields
  const fields = await page.$$eval('input, textarea, select', els => 
    els.map(e => ({ 
      tag: e.tagName, type: e.type || '', name: e.name || '', 
      id: e.id || '', placeholder: e.placeholder || '', 
      visible: !!(e.offsetWidth || e.offsetHeight)
    }))
  )
  console.log('Fields:', JSON.stringify(fields, null, 2))
  
  // Dump all buttons
  const buttons = await page.$$eval('button, input[type="submit"]', els =>
    els.map(e => ({ text: e.textContent?.trim() || '', type: e.type || '' }))
  )
  console.log('Buttons:', JSON.stringify(buttons, null, 2))
  
  await page.screenshot({ path: '/tmp/uneed-full.png', fullPage: true })
  console.log('Screenshot saved to /tmp/uneed-full.png')
  
  await browser.close()
}

main().catch(err => { console.error(err); process.exit(1) })
