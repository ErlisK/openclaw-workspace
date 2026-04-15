/**
 * scripts/probe-forms.js
 * Probes submission forms for Launching Next, Fazier, Microlaunch, BetaList
 */
const { chromium } = require('playwright')

const DEPLOYED = 'https://startup-87-agentqa-human-in-the-loop-e2e-testing-nfkznkrzm.vercel.app'

async function probeUrl(browser, url, label) {
  const page = await browser.newPage()
  console.log(`\n=== ${label} ===`)
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(2000)
    
    const title = await page.title()
    const pageUrl = page.url()
    console.log('Title:', title)
    console.log('Final URL:', pageUrl)
    
    const fields = await page.$$eval('input:not([type="hidden"]), textarea, select', els => 
      els.map(e => ({ 
        tag: e.tagName, type: e.type || '', name: e.name || '', 
        id: e.id || '', placeholder: e.placeholder || '',
        label: e.labels?.[0]?.textContent?.trim() || ''
      })).filter(f => f.type !== 'hidden')
    )
    console.log('Fields:', JSON.stringify(fields, null, 2))
    
    await page.screenshot({ path: `/tmp/probe-${label.toLowerCase().replace(/\s+/g,'-')}.png`, fullPage: false })
  } catch(e) {
    console.log('Error:', e.message.split('\n')[0])
  }
  await page.close()
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  
  await probeUrl(browser, 'https://launchingnext.com/submit/', 'LaunchingNext')
  await probeUrl(browser, 'https://fazier.com/launches/new', 'Fazier')
  await probeUrl(browser, 'https://microlaunch.net/submit', 'Microlaunch')
  await probeUrl(browser, 'https://betalist.com/submit', 'BetaList')
  await probeUrl(browser, 'https://startupbase.io/submit', 'StartupBase')
  await probeUrl(browser, 'https://www.startupranking.com/add', 'StartupRanking')
  await probeUrl(browser, 'https://aitoolsdirectory.com/submit', 'AIToolsDirectory')
  await probeUrl(browser, 'https://topai.tools/submit', 'TopAI')
  
  await browser.close()
}

main().catch(err => { console.error(err); process.exit(1) })
