import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata: Metadata = {
  title: 'PricingSim for Gumroad Sellers — Find Your Optimal Price',
  description: 'Gumroad creator? Find out if your pricing is leaving money on the table. Upload your CSV and model price elasticity in minutes.',
}

export default function ForGumroadSellersPage() {
  return (
    <>
      <main style={{ minHeight: '100vh', background: '#fafafa', fontFamily: 'system-ui, sans-serif' }}>
        <nav style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
          <Link href="/" style={{ fontWeight: 800, fontSize: '1.125rem', color: '#6c47ff', textDecoration: 'none' }}>PricingSim</Link>
          <Link href="/signup" style={{ background: '#6c47ff', color: '#fff', padding: '0.5rem 1.25rem', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>Upload Your Data →</Link>
        </nav>

        <section style={{ maxWidth: 720, margin: '0 auto', padding: '5rem 2rem 3rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: '#fef3c7', color: '#d97706', borderRadius: 999, padding: '0.3rem 1rem', fontSize: '0.8rem', fontWeight: 700, marginBottom: '1.5rem', letterSpacing: '0.05em' }}>
            FOR GUMROAD CREATORS
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, color: '#111827', lineHeight: 1.15, marginBottom: '1.25rem' }}>
            Is your pricing leaving<br />money on the table?
          </h1>
          <p style={{ fontSize: '1.2rem', color: '#4b5563', lineHeight: 1.6, marginBottom: '2.5rem', maxWidth: 560, margin: '0 auto 2.5rem' }}>
            Upload your Gumroad transaction CSV — PricingSim will model your price elasticity, simulate revenue at different price points, and recommend the safest change to test first.
          </p>
          <Link href="/signup?utm_source=ad&utm_medium=cpc&utm_campaign=gumroad-lp&utm_content=hero_cta" style={{ background: '#6c47ff', color: '#fff', padding: '0.9rem 2.5rem', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: '1.1rem', display: 'inline-block' }}>
            Upload Your Data →
          </Link>
          <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#9ca3af' }}>No credit card required · Rollback any experiment in one click</p>
        </section>

        <section style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 2rem 4rem' }}>
          <h2 style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.5rem', color: '#111827', marginBottom: '2rem' }}>What you get</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            {[
              { icon: '📊', title: 'Elasticity Model', desc: 'See exactly how your buyers respond to price changes based on your real transaction data.' },
              { icon: '🎯', title: 'Price Recommendations', desc: '2–3 data-backed price suggestions with confidence scores and projected revenue delta.' },
              { icon: '↩️', title: 'Built-in Rollback', desc: 'Not happy with results? Roll back to your original price in one click. Zero risk.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.5rem' }}>
                <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>{icon}</div>
                <h3 style={{ fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>{title}</h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.5 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: '#6c47ff', color: '#fff', padding: '4rem 2rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '1rem' }}>Stop guessing. Start experimenting.</h2>
          <p style={{ fontSize: '1.1rem', opacity: 0.85, marginBottom: '2rem' }}>Upload your Gumroad CSV and get your first price recommendation in minutes.</p>
          <Link href="/signup?utm_source=ad&utm_medium=cpc&utm_campaign=gumroad-lp&utm_content=bottom_cta" style={{ background: '#fff', color: '#6c47ff', padding: '0.9rem 2.5rem', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: '1.1rem', display: 'inline-block' }}>
            Upload Your Data →
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
