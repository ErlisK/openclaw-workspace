import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { SiteFooter } from '@/components/SiteFooter'

export const dynamic = 'force-dynamic'

const BASE_URL = 'https://startup-92-pricepilot-hbs-style-cus.vercel.app'

const pricingJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'PricePilot',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: `${BASE_URL}/pricing`,
  description: 'Bayesian pricing experiments for solo founders. Free tier includes 3 experiments, CSV import, and A/B pages.',
  offers: [
    {
      '@type': 'Offer',
      name: 'Free',
      price: '0',
      priceCurrency: 'USD',
      description: 'Up to 3 active experiments, CSV import, Bayesian engine recommendations.',
    },
    {
      '@type': 'Offer',
      name: 'Pro',
      price: '29',
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '29',
        priceCurrency: 'USD',
        billingDuration: 'P1M',
      },
      description: 'Unlimited experiments, AI templates, CSV export, priority support.',
    },
  ],
  publisher: { '@type': 'Organization', name: 'PricePilot', url: BASE_URL },
}

const FREE_FEATURES = [
  'Up to 3 active experiments',
  'CSV import (up to 500 rows)',
  'Bayesian engine recommendations',
  'Public experiment pages (/x/slug)',
  'Basic AI explanations',
]

const PRO_FEATURES = [
  'Unlimited experiments',
  'Unlimited CSV import',
  'Full Bayesian engine + confidence scores',
  'AI roll-out templates (email, tweet, blog)',
  'AI experiment copy generator',
  'Priority support',
  'CSV import available now · Stripe/Gumroad connectors coming soon',
  'Export audit log',
]

export default async function PricingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAuthed = !!user

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }} />
      <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#fafafa', minHeight: '100vh' }}>
      <nav style={{ borderBottom: '1px solid #e5e7eb', background: '#fff', padding: '0 1.5rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827', textDecoration: 'none' }}>🚀 PricePilot</Link>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Link href="/dashboard" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.9rem' }}>Dashboard</Link>
            <Link href="/signup" style={{ background: '#6c47ff', color: '#fff', padding: '0.4rem 1rem', borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>Get started free</Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '4rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, marginBottom: '1rem', color: '#111827' }}>
            Simple, honest pricing
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#6b7280', maxWidth: 480, margin: '0 auto' }}>
            Start free and upgrade when you&apos;re ready to run unlimited experiments.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', maxWidth: 780, margin: '0 auto' }}>
          {/* Free tier */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '1rem', padding: '2rem' }} data-testid="free-tier">
            <p style={{ fontWeight: 700, color: '#6b7280', marginBottom: '0.5rem', fontSize: '0.875rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Free</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '3rem', fontWeight: 900, color: '#111827' }}>$0</span>
            </div>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Forever free, no card required</p>
            {isAuthed ? (
              <Link href="/dashboard" style={{
                display: 'block', textAlign: 'center', padding: '0.75rem',
                border: '1px solid #e5e7eb', borderRadius: '0.75rem',
                color: '#374151', textDecoration: 'none', fontWeight: 600, marginBottom: '1.5rem',
              }}>
                You&#39;re on Free ✓
              </Link>
            ) : (
              <Link href="/signup" style={{
                display: 'block', textAlign: 'center', padding: '0.75rem',
                border: '1px solid #e5e7eb', borderRadius: '0.75rem',
                color: '#374151', textDecoration: 'none', fontWeight: 600, marginBottom: '1.5rem',
              }}>
                Get started free
              </Link>
            )}
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {FREE_FEATURES.map(f => (
                <li key={f} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>
                  <span style={{ color: '#10b981', flexShrink: 0 }}>✓</span> {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro tier */}
          <div style={{
            background: '#fff', border: '2px solid #6c47ff', borderRadius: '1rem', padding: '2rem',
            position: 'relative', boxShadow: '0 8px 30px rgba(108,71,255,0.12)',
          }} data-testid="pro-tier">
            <div style={{
              position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
              background: '#6c47ff', color: '#fff', borderRadius: 999, padding: '0.2rem 0.75rem',
              fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap',
            }}>
              Most popular
            </div>
            <p style={{ fontWeight: 700, color: '#6c47ff', marginBottom: '0.5rem', fontSize: '0.875rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Pro</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '3rem', fontWeight: 900, color: '#111827' }}>$29</span>
              <span style={{ color: '#9ca3af' }}>/month</span>
            </div>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Cancel anytime</p>

            {isAuthed ? (
              <form method="post" action="/api/billing/checkout" style={{ marginBottom: '1.5rem' }}>
                <button type="submit"
                  data-testid="upgrade-btn"
                  style={{
                    display: 'block', width: '100%', padding: '0.75rem',
                    background: '#6c47ff', color: '#fff', border: 'none',
                    borderRadius: '0.75rem', fontWeight: 700, fontSize: '1rem',
                    cursor: 'pointer',
                  }}>
                  Upgrade to Pro →
                </button>
              </form>
            ) : (
              <a href="/signup?intent=upgrade" rel="nofollow"
                data-testid="upgrade-btn"
                style={{
                  display: 'block', textAlign: 'center', padding: '0.75rem',
                  background: '#6c47ff', color: '#fff', borderRadius: '0.75rem',
                  fontWeight: 700, fontSize: '1rem', textDecoration: 'none',
                  marginBottom: '1.5rem',
                }}>
                Upgrade to Pro →
              </a>
            )}

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {PRO_FEATURES.map(f => (
                <li key={f} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>
                  <span style={{ color: '#6c47ff', flexShrink: 0 }}>✓</span> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
            💡 CSV import is available now. Stripe &amp; Gumroad direct connectors are coming soon.
          </p>
        </div>

        {/* FAQ */}
        <div style={{ maxWidth: 600, margin: '3rem auto 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            ['Can I cancel anytime?', 'Yes — cancel from your billing portal and you keep Pro access until the end of the billing period.'],
            ['What counts as an experiment?', 'One A/B pricing page (/x/slug). Free tier: 3 active at a time. Pro: unlimited.'],
            ['Is CSV import available now?', 'Yes! CSV import is live now. Stripe and Gumroad direct connectors are coming soon.'],
          ].map(([q, a]) => (
            <div key={q} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1rem 1.25rem' }}>
              <p style={{ fontWeight: 700, marginBottom: '0.35rem' }}>{q}</p>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>{a}</p>
            </div>
          ))}
        </div>
      </div>
      <SiteFooter />
    </div>
    </>
  )
}
