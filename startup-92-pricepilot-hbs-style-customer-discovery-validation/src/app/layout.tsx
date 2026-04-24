import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PricePilot — Safe pricing experiments for solo founders',
  description: 'Test higher prices safely. Bayesian A/B pricing experiments for creators and micro-SaaS founders.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
