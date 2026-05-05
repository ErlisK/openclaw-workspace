import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata: Metadata = {
  title: 'PricingSim for Micro-SaaS Founders — Pricing Experiments at $500–$10K MRR',
  description: 'Price experiments for $500–$10K MRR SaaS founders. Bayesian pricing model, one-click A/B tests, built-in rollback.',
}

export default function ForMicroSaasPage() {
  return (
    <>
      <main style={{ minHeight: '100vh', background: '#fafafa', fontFamily: 'system-ui, sans-serif' }}>
        <nav style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
          <Link href="/" style={{ fontWeight: 800, fontSize: '1.125rem', color: '#6c47ff', textDecoration: 'none' }}>PricingSim</Link>
          <Link href="/signup" style={{ background: '#6c47ff', color: '#fff', padding: '0.5rem 1.25rem', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>Start Your First Experiment →</Link>
        </nav>

        <section style={{ maxWidth: 720, margin: '0 auto', padding: '5rem 2rem 3rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: '#dcfce7', color: '#166534', borderRadius: 999, padding: '0.3rem 1rem', fontSize: '0.8rem', fontWeight: 700, marginBottom: '1.5rem', letterSpacing: '0.05em' }}>
            FOR MICRO-SAAS FOUNDERS
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, color: '#111827', lineHeight: 1.15, marginBottom: '1.25rem' }}>
            Price experiments for<br />$500–$10K MRR SaaS founders
          </h1>
          <p style={{ fontSize: '1.2rem', color: '#4b5563', lineHeight: 1.6, marginBottom: '2.5rem', maxWidth: 560, margin: '0 auto 2.5rem' }}>
            Bayesian pricing model. One-click A/B tests. Built-in rollback. PricingSim turns your noisy transaction data into safe, testable price changes that prove lift in weeks.
          </p>
          <Link href="/signup?utm_source=ad&utm_medium=cpc&utm_campaign=microsaas-lp&utm_content=hero_cta" style={{ background: '#6c47ff', color: '#fff', padding: '0.9rem 2.5rem', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: '1.1rem', display: 'inline-block' }}>
            Start Your First Experiment →
          </Link>
          <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#9ca3af' }}>No credit card required · Rollback any experiment in one click · Your data stays encrypted</p>
        </section>

        <section style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 2rem 4rem' }}>
          <h2 style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.5rem', color: '#111827', marginBottom: '2rem' }}>Built for solo SaaS founders</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            {[
              { icon: '🔬', title: 'Bayesian Engine', desc: 'Works even with low-signal data. No need for thousands of transactions to get meaningful insights.' },
              { icon: '⚡', title: 'One-Click A/B Tests', desc: 'Ship an experiment page in minutes, not days. No engineering required.' },
              { icon: '↩️', title: 'Instant Rollback', desc: 'Change your mind? Roll back to the original price instantly with built-in safeguards.' },
              { icon: '💬', title: 'Comms Templates', desc: 'Customer communication templates included. Tell your users about price changes professionally.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.5rem' }}>
                <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>{icon}</div>
                <h3 style={{ fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>{title}</h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.5 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: '#111827', color: '#fff', padding: '4rem 2rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '1rem' }}>Raise your prices without the fear.</h2>
          <p style={{ fontSize: '1.1rem', opacity: 0.75, marginBottom: '2rem' }}>Join solo founders using data to make confident pricing decisions.</p>
          <Link href="/signup?utm_source=ad&utm_medium=cpc&utm_campaign=microsaas-lp&utm_content=bottom_cta" style={{ background: '#6c47ff', color: '#fff', padding: '0.9rem 2.5rem', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: '1.1rem', display: 'inline-block' }}>
            Start Your First Experiment →
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
