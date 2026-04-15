/**
 * scripts/probe-social.js
 * Probe X/Twitter and LinkedIn signup flows to understand what's automatable
 */
const { chromium } = require('playwright')

async function probe(browser, url, label, waitMs = 3000) {
  const page = await browser.newPage()
  console.log(`\n=== ${label} ===`)
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 })
    await page.waitForTimeout(waitMs)
    console.log('Title:', await page.title())
    console.log('URL:', page.url())
    const fields = await page.$$eval('input:not([type="hidden"]), textarea', els =>
      els.map(e => ({ type: e.type, name: e.name, id: e.id, placeholder: e.placeholder }))
    )
    if (fields.length) console.log('Fields:', JSON.stringify(fields.slice(0, 8)))
    await page.screenshot({ path: `/tmp/social-${label.replace(/[^a-z0-9]/gi,'-').toLowerCase()}.png` })
  } catch(e) { console.log('Error:', e.message.split('\n')[0]) }
  await page.close()
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  await probe(browser, 'https://twitter.com/i/flow/signup', 'Twitter-signup', 4000)
  await probe(browser, 'https://x.com/i/flow/signup', 'X-signup', 4000)
  await probe(browser, 'https://www.linkedin.com/signup/cold-join', 'LinkedIn-signup', 3000)
  await probe(browser, 'https://www.linkedin.com/company/setup/new', 'LinkedIn-company', 3000)
  await browser.close()
}
main().catch(err => { console.error(err.message); process.exit(1) })
