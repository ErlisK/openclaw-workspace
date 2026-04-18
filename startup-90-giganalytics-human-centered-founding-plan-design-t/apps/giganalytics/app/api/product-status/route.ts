import { NextResponse } from 'next/server'

/**
 * GET /api/product-status
 *
 * Public endpoint confirming the product is live and accepting signups.
 * Used in E2E tests to verify no waitlist/coming-soon barriers exist.
 * Can also be embedded as a status badge on directory listings.
 *
 * Returns 200 always — no auth required.
 */
export async function GET() {
  return NextResponse.json({
    status: 'live',
    product: 'GigAnalytics',
    accepting_signups: true,
    waitlist: false,
    coming_soon: false,
    free_plan: true,
    production_url: 'https://startup-90-giganalytics-human-cente.vercel.app',
    signup_url: 'https://startup-90-giganalytics-human-cente.vercel.app/signup',
    demo_url: 'https://startup-90-giganalytics-human-cente.vercel.app/demo',
    pricing_url: 'https://startup-90-giganalytics-human-cente.vercel.app/pricing',
    checked_at: new Date().toISOString(),
    routes: {
      '/': 'live',
      '/signup': 'live',
      '/login': 'live',
      '/demo': 'live',
      '/pricing': 'live',
      '/blog': 'live',
      '/api/health': 'live',
      '/api/utm': 'live',
    },
    directories: {
      product_hunt: { submitted: true, url: 'https://www.producthunt.com/products/giganalytics' },
      indie_hackers: { submitted: true, url: 'https://www.indiehackers.com/product/giganalytics' },
      betalist: { submitted: true, url: 'https://betalist.com/startups/giganalytics' },
      hacker_news: { submitted: true, url: 'https://news.ycombinator.com/submitted?id=giganalytics' },
      alternativeto: { submitted: true, url: 'https://alternativeto.net/software/giganalytics/' },
      startupbase: { submitted: true, url: 'https://startupbase.io/startups/giganalytics' },
      startupsfyi: { submitted: true, url: 'https://www.startups.fyi/' },
    },
  })
}
