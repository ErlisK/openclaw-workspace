/**
 * scripts/screenshot-social.js
 */
const { chromium } = require('playwright')
const BYPASS = '6QxulLdZOqxuUMLF9vZ7pW2MevpMdn1W'
const DEPLOYED = 'https://startup-87-agentqa-human-in-the-loop-e2e-testing-6syc6xcmh.vercel.app'

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  
  // Social page
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(`${DEPLOYED}/social?x-vercel-protection-bypass=${BYPASS}`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.screenshot({ path: '/tmp/social-page.png', fullPage: false })
  
  // Twitter header
  await page.setViewportSize({ width: 1500, height: 500 })
  await page.goto(`${DEPLOYED}/assets/twitter-header.svg?x-vercel-protection-bypass=${BYPASS}`, { waitUntil: 'networkidle', timeout: 15000 })
  await page.screenshot({ path: '/tmp/twitter-header.png' })
  
  await browser.close()
  console.log('Done')
}
main().catch(console.error)
