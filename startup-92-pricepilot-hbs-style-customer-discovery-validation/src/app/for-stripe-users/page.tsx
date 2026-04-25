import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata: Metadata = {
  title: 'PricePilot for Stripe Users — Safe Pricing Experiments',
  description: 'Your Stripe data is worth more than you think. PricePilot reads your transaction history and finds the safest price to test next.',
}

export default function ForStripeUsersPage() {
  return (
    <>
      <main style={{ minHeight: '100vh', background: '#fafafa', fontFamily: 'system-ui, sans-serif' }}>
        <nav style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
          <Link href="/" style={{ fontWeight: 800, fontSize: '1.125rem', color: '#6c47ff', textDecoration: 'none' }}>PricePilot</Link>
          <Link href="/signup" style={{ background: '#6c47ff', color: '#fff', padding: '0.5rem 1.25rem', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>Connect Stripe Free →</Link>
        </nav>

        <section style={{ maxWidth: 720, margin: '0 auto', padding: '5rem 2rem 3rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: '#ede9fe', color: '#6c47ff', borderRadius: 999, padding: '0.3rem 1rem', fontSize: '0.8rem', fontWeight: 700, marginBottom: '1.5rem', letterSpacing: '0.05em' }}>
            FOR STRIPE USERS
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, color: '#111827', lineHeight: 1.15, marginBottom: '1.25rem' }}>
            Your Stripe data is worth<br />more than you think
          </h1>
          <p style={{ fontSize: '1.2rem', color: '#4b5563', lineHeight: 1.6, marginBottom: '2.5rem', maxWidth: 560, margin: '0 auto 2.5rem' }}>
            PricePilot reads your Stripe transaction history and finds the safest, highest-revenue price to test next — with one-click rollback if conversion drops.
          </p>
          <Link href="/signup?utm_source=ad&utm_medium=cpc&utm_campaign=stripe-lp&utm_content=hero_cta" style={{ background: '#6c47ff', color: '#fff', padding: '0.9rem 2.5rem', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: '1.1rem', display: 'inline-block' }}>
            Connect Stripe Free →
          </Link>
          <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#9ca3af' }}>No credit card required · Rollback any experiment in one click</p>
        </section>

        <section style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 2rem 4rem' }}>
          <h2 style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.5rem', color: '#111827', marginBottom: '2rem' }}>How it works with Stripe</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            {[
              { step: '1', title: 'Connect Stripe', desc: 'Authorize read-only access in 30 seconds. We pull your transaction history automatically.' },
              { step: '2', title: 'Get Recommendations', desc: 'Bayesian engine models your price elasticity and surfaces 2–3 safe price changes to test.' },
              { step: '3', title: 'Ship with Confidence', desc: 'One-click A/B experiment page. Built-in rollback. Customer communication templates included.' },
            ].map(({ step, title, desc }) => (
              <div key={step} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.5rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 999, background: '#ede9fe', color: '#6c47ff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem', fontSize: '1rem' }}>{step}</div>
                <h3 style={{ fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>{title}</h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.5 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: '#6c47ff', color: '#fff', padding: '4rem 2rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '1rem' }}>Ready to find your optimal price?</h2>
          <p style={{ fontSize: '1.1rem', opacity: 0.85, marginBottom: '2rem' }}>Connect your Stripe account in 30 seconds. Free to start.</p>
          <Link href="/signup?utm_source=ad&utm_medium=cpc&utm_campaign=stripe-lp&utm_content=bottom_cta" style={{ background: '#fff', color: '#6c47ff', padding: '0.9rem 2.5rem', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: '1.1rem', display: 'inline-block' }}>
            Connect Stripe Free →
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
