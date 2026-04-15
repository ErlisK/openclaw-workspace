/**
 * scripts/probe-free.js
 * Try platforms known for free AI tool submissions
 */
const { chromium } = require('playwright')

async function probe(browser, url, label) {
  const page = await browser.newPage()
  console.log(`\n=== ${label} ===`)
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(2500)
    const title = await page.title()
    const finalUrl = page.url()
    console.log('Title:', title)
    console.log('URL:', finalUrl)
    const fields = await page.$$eval('input:not([type="hidden"]), textarea', els =>
      els.filter(e => e.type !== 'hidden' && e.type !== 'checkbox' && e.type !== 'radio')
         .map(e => ({ type: e.type, name: e.name, placeholder: e.placeholder }))
    )
    if (fields.length) console.log('Fields:', JSON.stringify(fields.slice(0, 6)))
    await page.screenshot({ path: `/tmp/probefree-${label.replace(/[^a-z0-9]/gi,'-')}.png` })
  } catch(e) { console.log('Error:', e.message.split('\n')[0]) }
  await page.close()
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  
  // Free submission directories
  await probe(browser, 'https://www.producthunt.com/posts/new', 'ProductHunt')
  await probe(browser, 'https://startup-stash.com/add-resource/', 'StartupStash')
  await probe(browser, 'https://www.startupbuffer.com/submit', 'StartupBuffer')
  await probe(browser, 'https://www.murdernewsapp.com/submit', 'MurderNewsApp')
  await probe(browser, 'https://startupsinnovate.com/submit', 'StartupsInnovate')
  await probe(browser, 'https://ailaunchpad.co/submit', 'AILaunchpad')
  await probe(browser, 'https://www.startupranking.com/signup', 'StartupRanking')
  await probe(browser, 'https://landingpage.fyi/submit-startup', 'LandingPageFYI')
  
  await browser.close()
}

main().catch(err => { console.error(err.message); process.exit(1) })
