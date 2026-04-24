import type { Metadata } from 'next'
import './globals.css'

const BASE_URL = 'https://startup-92-pricepilot-hbs-style-cus.vercel.app'

export const metadata: Metadata = {
  title: { default: 'PricePilot — Safe pricing experiments for solo founders', template: '%s — PricePilot' },
  description: 'Test higher prices safely. Bayesian A/B pricing experiments for creators and micro-SaaS founders doing $500–$10k MRR.',
  metadataBase: new URL(BASE_URL),
  openGraph: {
    type: 'website',
    siteName: 'PricePilot',
    title: 'PricePilot — Safe pricing experiments for solo founders',
    description: 'Test higher prices safely. Bayesian A/B pricing experiments for Stripe, Gumroad, and Shopify sellers.',
    url: BASE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PricePilot — Safe pricing experiments for solo founders',
    description: 'Bayesian A/B pricing experiments for creators and micro-SaaS founders.',
  },
  keywords: ['pricing experiments', 'A/B testing', 'pricing strategy', 'Stripe', 'Gumroad', 'Shopify', 'micro-SaaS', 'solo founder'],
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
