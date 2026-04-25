/**
 * GET /api/connectors — list available payment provider connectors.
 * Public endpoint — no auth required.
 */
import { NextResponse } from 'next/server'

const CONNECTORS = [
  { id: 'stripe',  name: 'Stripe',  status: 'available', doc_url: '/docs/connect/stripe' },
  { id: 'gumroad', name: 'Gumroad', status: 'available', doc_url: '/docs/connect/gumroad' },
  { id: 'shopify', name: 'Shopify', status: 'available', doc_url: '/docs/connect/shopify' },
  { id: 'csv',     name: 'CSV Import', status: 'available', doc_url: '/import' },
]

export async function GET() {
  return NextResponse.json({ connectors: CONNECTORS })
}
