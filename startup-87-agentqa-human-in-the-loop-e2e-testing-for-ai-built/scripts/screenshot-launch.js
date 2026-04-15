/**
 * scripts/screenshot-launch.js
 * Screenshot the /launch press kit page
 */
const { chromium } = require('playwright')
const BYPASS = '6QxulLdZOqxuUMLF9vZ7pW2MevpMdn1W'
const DEPLOYED = 'https://startup-87-agentqa-human-in-the-loop-e2e-testing-ouwi0qsjw.vercel.app'

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(`${DEPLOYED}/launch?x-vercel-protection-bypass=${BYPASS}`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.screenshot({ path: '/tmp/launch-page.png', fullPage: false })
  console.log('Saved to /tmp/launch-page.png')
  await browser.close()
}
main().catch(console.error)
