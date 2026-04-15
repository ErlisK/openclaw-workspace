/**
 * submit-betalist.js
 * Submits AgentQA to BetaList.com
 */
const { chromium } = require('playwright')
const DEPLOYED = 'https://startup-87-agentqa-human-in-the-loop-e2e-testing-nfkznkrzm.vercel.app'

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  
  try {
    console.log('🔍 Checking BetaList submission form...')
    await page.goto('https://betalist.com/startups/new', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)
    
    const title = await page.title()
    const url = page.url()
    console.log('Title:', title)
    console.log('URL:', url)
    
    // Take a screenshot to see what we're working with
    await page.screenshot({ path: '/tmp/betalist-form.png' })
    
    // Check for form fields
    const inputs = await page.$$eval('input, textarea, select', els => 
      els.map(e => ({ type: e.type, name: e.name, id: e.id, placeholder: e.placeholder || '' }))
    )
    console.log('Form inputs:', JSON.stringify(inputs, null, 2))
    
  } catch (e) {
    console.log('Error:', e.message)
  }
  
  await browser.close()
}

main().catch(console.error)
