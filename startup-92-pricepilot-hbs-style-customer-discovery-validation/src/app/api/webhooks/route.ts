import { NextResponse } from 'next/server'

/**
 * /api/webhooks — index route
 * The active webhook endpoints are:
 *   POST /api/webhooks/stripe  — Stripe events (requires Stripe-Signature header)
 *   POST /api/webhooks/gumroad — Gumroad ping events
 *
 * This index returns a helpful error so misconfigured payment dashboards
 * get a clear message instead of a silent 404.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Wrong webhook URL',
      message: 'Use /api/webhooks/stripe for Stripe events or /api/webhooks/gumroad for Gumroad events.',
      endpoints: {
        stripe: '/api/webhooks/stripe',
        gumroad: '/api/webhooks/gumroad',
      },
    },
    { status: 404 }
  )
}

export async function GET() {
  return NextResponse.json({
    endpoints: {
      stripe: '/api/webhooks/stripe',
      gumroad: '/api/webhooks/gumroad',
    },
  })
}
