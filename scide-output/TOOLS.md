# Tools & Environment

## Platform Stack

Software projects use **Next.js** (App Router, TypeScript, Tailwind CSS), deployed on **Vercel**, with **Supabase** for database (PostgreSQL + auth + realtime).

## Web Browsing

Two headless browsers are pre-installed. Use the right one for the job.

### Lightpanda (fast scraping — try this first)

- Start CDP server: `lightpanda &` (listens on `ws://127.0.0.1:9222`)
- Connect via Puppeteer:
  ```js
  const puppeteer = require('puppeteer-core');
  const browser = await puppeteer.connect({ browserWSEndpoint: 'ws://127.0.0.1:9222' });
  const page = await browser.newPage();
  await page.goto('https://example.com');
  const text = await page.evaluate(() => document.body.innerText);
  ```
- Best for: scraping pages, extracting text/data, crawling multiple URLs
- 11x faster than Chrome, minimal memory. No visual rendering (no screenshots).

### Playwright + Chromium (full browser)

- Launch:
  ```js
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://example.com');
  await page.screenshot({ path: 'screenshot.png' });
  await browser.close();
  ```
- Best for: filling forms, clicking buttons, directory submissions, screenshots, SPAs
- Heavier on memory — always close browser/pages when done.

**Rule of thumb:** Use Lightpanda for research and data extraction. Use Playwright when you need to interact with a page (click, type, submit) or take screenshots.

## Vercel CLI

- Deploy: `vercel --prod` (from project directory)
- Add env var: `vercel env add SECRET_NAME` (then paste value when prompted)
- Add domain: `vercel domains add example.com`
- Check deployment: `vercel ls`

## Payment Templates

Pre-built Stripe payment routes are at `/opt/scide/templates/payments/`:

| File | Purpose |
|------|---------|
| `lib/stripe.ts` | Server-side Stripe client |
| `app/api/checkout/route.ts` | Checkout session creation |
| `app/api/webhooks/stripe/route.ts` | Webhook handler with signature verification |
| `app/api/customer-portal/route.ts` | Customer portal redirect |
| `components/PricingTable.tsx` | Responsive pricing cards |
| `components/CheckoutButton.tsx` | Standalone checkout button |
| `PAYMENT_SETUP.md` | Full setup instructions |

Copy into your project and adapt. See `PAYMENT_SETUP.md` for detailed steps.

## Other Tools

- **AWS CLI**: `aws s3`, `aws secretsmanager`, etc.
- **curl + jq**: REST API calls and JSON processing
- **Node.js 22**: JavaScript/TypeScript runtime
- **Python 3**: Scripting and automation
- **git**: Version control — push to the startup's GitHub repo
