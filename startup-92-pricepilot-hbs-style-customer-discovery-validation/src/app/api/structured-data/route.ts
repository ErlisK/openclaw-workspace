/**
 * GET /api/structured-data
 * Returns JSON-LD structured data for SEO (SoftwareApplication schema).
 */
import { NextResponse } from 'next/server'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://pricingsim.com'

export async function GET() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'PricingSim',
    applicationCategory: 'BusinessApplication',
    description: 'Safe pricing experiments for solo founders and micro-SaaS creators. Bayesian A/B pricing experiments for Stripe, Gumroad, and Shopify sellers.',
    url: BASE_URL,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free tier available',
    },
    featureList: [
      'Bayesian price elasticity calculator',
      'A/B pricing experiments',
      'Stripe, Gumroad, Shopify integration',
      'Revenue impact projections',
      'One-click experiment pages',
      'Rollback and communication templates',
    ],
    operatingSystem: 'Web',
    author: {
      '@type': 'Organization',
      name: 'PricingSim',
      url: BASE_URL,
    },
  }

  return NextResponse.json(jsonLd, {
    headers: { 'Content-Type': 'application/ld+json' },
  })
}
