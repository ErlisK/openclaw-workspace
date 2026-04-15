/**
 * scripts/probe-more.js
 * Try DEV.to signup and simpler submission forms
 */
const { chromium } = require('playwright')

const DEPLOYED = 'https://startup-87-agentqa-human-in-the-loop-e2e-testing-nfkznkrzm.vercel.app'
const EMAIL = 'scide-founder@agentmail.to'

async function probe(browser, url, label, waitExtra = 0) {
  const page = await browser.newPage()
  console.log(`\n=== ${label} ===`)
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 })
    if (waitExtra > 0) await page.waitForTimeout(waitExtra)
    const title = await page.title()
    const finalUrl = page.url()
    console.log('Title:', title)
    console.log('URL:', finalUrl)
    const fields = await page.$$eval('input:not([type="hidden"]), textarea, select', els =>
      els.map(e => ({ type: e.type || e.tagName, name: e.name, id: e.id, placeholder: e.placeholder }))
    )
    if (fields.length) console.log('Fields:', JSON.stringify(fields.slice(0, 8), null, 2))
    await page.screenshot({ path: `/tmp/probe2-${label.replace(/[^a-z0-9]/gi,'-')}.png` })
  } catch(e) { console.log('Error:', e.message.split('\n')[0]) }
  await page.close()
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  
  await probe(browser, 'https://dev.to/enter?state=new-user', 'DEV.to-signup', 2000)
  await probe(browser, 'https://www.indiehackers.com/start', 'IndieHackers-signup', 2000)
  await probe(browser, 'https://toolpilot.ai/submit', 'ToolPilot', 2000)
  await probe(browser, 'https://aitools.fyi/submit', 'AIToolsFyi', 2000)
  await probe(browser, 'https://www.toolify.ai/submit-ai-tool', 'Toolify', 2000)
  await probe(browser, 'https://aivalley.ai/submit-a-tool/', 'AIValley', 2000)
  await probe(browser, 'https://www.aitoolhunt.com/submit', 'AIToolHunt', 2000)
  await probe(browser, 'https://findmyaitool.com/submit', 'FindMyAI', 2000)
  
  await browser.close()
}

main().catch(err => { console.error(err.message); process.exit(1) })
