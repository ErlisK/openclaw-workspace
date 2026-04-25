import Link from 'next/link'
import { Suspense } from 'react'
import { Metadata } from 'next'
import CalculatorClient from './CalculatorClient'

const BASE_URL = 'https://startup-92-pricepilot-hbs-style-cus.vercel.app'

export const metadata: Metadata = {
  title: 'Price Elasticity Calculator — PricePilot',
  description: 'Free interactive calculator: estimate how a price change will affect your revenue based on price elasticity of demand. Instant results, no signup required.',
  keywords: ['price elasticity calculator', 'pricing calculator', 'revenue calculator', 'price change impact'],
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Price Elasticity Calculator',
  description: 'Estimate how a price change will affect your revenue based on price elasticity of demand.',
  url: `${BASE_URL}/calculator`,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  publisher: { '@type': 'Organization', name: 'PricePilot', url: BASE_URL },
}

export default function CalculatorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 1rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <Link href="/" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.9rem' }}>← PricePilot</Link>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Price Elasticity Calculator</h1>
          <p style={{ color: '#6b7280', lineHeight: 1.6, maxWidth: 600 }}>
            Enter your current price, sales volume, and estimated elasticity to see how a price change would affect your revenue. Adjust the elasticity slider to model different price-sensitivity scenarios.
          </p>
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '2rem', background: '#fff', marginBottom: '2rem' }}>
          <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Loading calculator…</div>}>
            <CalculatorClient />
          </Suspense>
        </div>

        {/* Explanation */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>How to Use This Calculator</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {[
              {
                title: 'What is price elasticity?',
                body: 'Price elasticity (ε) measures how demand responds to price changes. ε = -1.0 means a 10% price increase causes a 10% demand decrease. ε = -0.5 means demand barely changes with price (inelastic). Most digital products fall between -0.5 and -1.5.',
              },
              {
                title: 'Where does my elasticity estimate come from?',
                body: "If you don't know your elasticity, start with -1.0 (the standard assumption). To get a data-driven estimate, connect your Stripe or Gumroad account to PricePilot — the Bayesian engine estimates elasticity from your actual transaction history.",
              },
              {
                title: 'What does break-even demand mean?',
                body: "The break-even demand is the minimum number of sales you need at the new price to match your current revenue. If projected demand stays above this number, the price increase helps you. If it falls below, it hurts.",
              },
              {
                title: 'Why is this different from a real experiment?',
                body: 'This calculator gives a point estimate — one number based on a single elasticity value. Real buyer behavior has uncertainty. PricePilot\'s Bayesian engine produces a full probability distribution: p05, p50, p95 outcomes, so you understand the range of possible results.',
              },
            ].map(item => (
              <div key={item.title} style={{ padding: '1.25rem', border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb' }}>
                <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.5rem' }}>{item.title}</h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Elasticity reference */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Elasticity Reference by Product Type</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: '0.625rem 1rem', textAlign: 'left', fontWeight: 600 }}>Product Type</th>
                <th style={{ padding: '0.625rem 1rem', textAlign: 'left', fontWeight: 600 }}>Typical ε Range</th>
                <th style={{ padding: '0.625rem 1rem', textAlign: 'left', fontWeight: 600 }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Digital templates (Notion, Figma)', '-0.5 to -0.9', 'High intent buyers, inelastic'],
                ['Online courses', '-0.7 to -1.2', 'Varies with perceived instructor authority'],
                ['Micro-SaaS tools', '-0.6 to -1.0', 'B2B buyers less price-sensitive'],
                ['E-books / PDF guides', '-1.0 to -1.8', 'More elastic; perceived as commodity'],
                ['Code templates / components', '-0.5 to -0.8', 'Developer tools tend to be inelastic'],
                ['Coaching / consulting', '-0.3 to -0.7', 'Very inelastic; price signals quality'],
              ].map(([type, range, notes], i) => (
                <tr key={type} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                  <td style={{ padding: '0.625rem 1rem', color: '#374151' }}>{type}</td>
                  <td style={{ padding: '0.625rem 1rem', fontWeight: 600, color: '#4f46e5' }}>{range}</td>
                  <td style={{ padding: '0.625rem 1rem', color: '#6b7280' }}>{notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.75rem' }}>
            These are general ranges. Your actual elasticity depends on your specific audience, positioning, and competition. Use PricePilot to estimate it from your own data.
          </p>
        </section>

        {/* CTA */}
        <div style={{ padding: '1.5rem', background: '#f5f3ff', borderRadius: 12, textAlign: 'center', borderLeft: '4px solid #4f46e5' }}>
          <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            Want Bayesian estimates from your real data?
          </p>
          <p style={{ color: '#6b7280', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            This calculator uses a single elasticity estimate. PricePilot computes a full probability distribution from your Stripe, Gumroad, or Shopify transaction history — with a 5th-percentile downside floor so you know the worst-case scenario.
          </p>
          <Link
            href="/signup?utm_source=calculator&utm_medium=tool&utm_campaign=elasticity_calc"
            style={{
              background: '#4f46e5', color: '#fff',
              padding: '0.75rem 2rem', borderRadius: 8, fontWeight: 600,
              textDecoration: 'none', display: 'inline-block',
            }}
          >
            Try PricePilot Free →
          </Link>
        </div>
      </main>
    </>
  )
}
