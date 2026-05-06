import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Demo: Notion Dashboard Bundle Price Experiment — PricingSim',
  description: 'See what a completed PricingSim A/B price experiment looks like. Notion Dashboard Bundle: $27 vs $37 — 30-day run, 91% Bayesian confidence, +$424/mo lift.',
}

export default function DemoExperimentPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', fontFamily: 'system-ui, sans-serif', color: '#111827' }}>
      {/* Demo banner */}
      <div style={{ background: '#ede9fe', borderBottom: '1px solid #c4b5fd', padding: '0.6rem 1.5rem', textAlign: 'center', fontSize: '0.85rem', color: '#5b21b6' }}>
        🔬 <strong>Demo experiment page</strong> — This is an example of what your experiment page looks like.{' '}
        <Link href="/signup" style={{ color: '#6c47ff', fontWeight: 700, textDecoration: 'underline' }}>Run your own free →</Link>
      </div>

      <nav style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
        <Link href="/" style={{ fontWeight: 800, fontSize: '1.125rem', color: '#6c47ff', textDecoration: 'none' }}>🚀 PricingSim</Link>
        <Link href="/signup" style={{ background: '#6c47ff', color: '#fff', padding: '0.5rem 1.25rem', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>Start free →</Link>
      </nav>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ background: '#dcfce7', color: '#166534', borderRadius: 999, padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 700 }}>✓ COMPLETED</span>
            <span style={{ background: '#f3f4f6', color: '#6b7280', borderRadius: 999, padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>April 1–30, 2025 · 30-day run</span>
            <span style={{ background: '#ede9fe', color: '#6c47ff', borderRadius: 999, padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 700 }}>Winner: $37 ✓</span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', fontWeight: 900, lineHeight: 1.2, marginBottom: '0.5rem' }}>
            Notion Dashboard Bundle
          </h1>
          <p style={{ color: '#6b7280', fontSize: '1rem' }}>Price experiment: $27 (control) vs $37 (test)</p>
        </div>

        {/* Key result callout */}
        <div style={{ background: 'linear-gradient(135deg, #6c47ff 0%, #8b5cf6 100%)', borderRadius: '0.75rem', padding: '1.5rem 2rem', color: '#fff', marginBottom: '2rem', display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue lift</p>
            <p style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1 }}>+$424<span style={{ fontSize: '1rem', fontWeight: 600 }}>/mo</span></p>
            <p style={{ fontSize: '0.9rem', opacity: 0.85 }}>+44.9% over previous pricing</p>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.2)', alignSelf: 'stretch' }} />
          <div>
            <p style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bayesian confidence</p>
            <p style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1 }}>91%</p>
            <p style={{ fontSize: '0.9rem', opacity: 0.85 }}>$37 outperforms $27</p>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.2)', alignSelf: 'stretch' }} />
          <div>
            <p style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Annualized impact</p>
            <p style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1 }}>+$5k</p>
            <p style={{ fontSize: '0.9rem', opacity: 0.85 }}>projected annual lift</p>
          </div>
        </div>

        {/* Variant comparison */}
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem' }}>Variant comparison</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          {/* Variant A */}
          <div style={{ background: '#fff', border: '2px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontWeight: 800, fontSize: '1rem' }}>Variant A</span>
              <span style={{ background: '#f3f4f6', color: '#6b7280', borderRadius: 999, padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}>Control</span>
            </div>
            <p style={{ fontSize: '2rem', fontWeight: 900, color: '#111827', marginBottom: '1rem' }}>$27</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Visitors</span>
                <span style={{ fontWeight: 600 }}>847</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Purchases</span>
                <span style={{ fontWeight: 600 }}>35</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Conversion</span>
                <span style={{ fontWeight: 600 }}>4.1%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid #f3f4f6' }}>
                <span style={{ color: '#6b7280' }}>Monthly revenue</span>
                <span style={{ fontWeight: 700 }}>$945</span>
              </div>
            </div>
          </div>

          {/* Variant B */}
          <div style={{ background: '#fff', border: '2px solid #6c47ff', borderRadius: '0.75rem', padding: '1.5rem', position: 'relative' }}>
            <div style={{ position: 'absolute', top: -12, right: 16, background: '#6c47ff', color: '#fff', borderRadius: 999, padding: '0.15rem 0.75rem', fontSize: '0.7rem', fontWeight: 700 }}>🏆 WINNER</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontWeight: 800, fontSize: '1rem' }}>Variant B</span>
              <span style={{ background: '#ede9fe', color: '#6c47ff', borderRadius: 999, padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}>Test</span>
            </div>
            <p style={{ fontSize: '2rem', fontWeight: 900, color: '#6c47ff', marginBottom: '1rem' }}>$37</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Visitors</span>
                <span style={{ fontWeight: 600 }}>851</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Purchases</span>
                <span style={{ fontWeight: 600 }}>37</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Conversion</span>
                <span style={{ fontWeight: 600 }}>4.3%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid #ede9fe' }}>
                <span style={{ color: '#6b7280' }}>Monthly revenue</span>
                <span style={{ fontWeight: 700, color: '#6c47ff' }}>$1,369</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bayesian confidence bar */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.95rem' }}>🔬 Bayesian confidence</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
            <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 999, height: 12, overflow: 'hidden' }}>
              <div style={{ width: '91%', background: 'linear-gradient(90deg, #6c47ff, #8b5cf6)', height: '100%', borderRadius: 999 }} />
            </div>
            <span style={{ fontWeight: 800, color: '#6c47ff', minWidth: 40 }}>91%</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
            There is a <strong>91% probability</strong> that $37 generates more revenue than $27, based on 1,698 total visitors and Bayesian beta-binomial modeling of your conversion rates.
          </p>
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', fontSize: '0.8rem', color: '#166534' }}>
            ✓ <strong>Recommended action:</strong> Apply $37 as permanent price. Rollback available any time.
          </div>
        </div>

        {/* Elasticity insight */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.95rem' }}>📊 Price elasticity insight</h3>
          <p style={{ fontSize: '0.875rem', color: '#374151', lineHeight: 1.6 }}>
            Estimated price elasticity: <strong>−0.54</strong> (inelastic demand). A 37% price increase caused only a 0.5% drop in conversion rate, indicating buyers in this segment compare the product to alternatives priced at $100+, not $27. The Bayesian 80% credible interval for revenue lift is <strong>[+28%, +62%]</strong>.
          </p>
        </div>

        {/* CTA */}
        <div style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)', border: '1px solid #c4b5fd', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: '#6c47ff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Want results like these?</p>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.75rem' }}>Run your own pricing experiment</h2>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: 420, margin: '0 auto 1.5rem' }}>
            Import your Gumroad or Stripe CSV, get a Bayesian price suggestion in minutes, and launch your own experiment page — free.
          </p>
          <Link href="/signup" style={{ display: 'inline-block', background: '#6c47ff', color: '#fff', padding: '0.875rem 2.5rem', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: '1rem' }}>
            Start free — no credit card →
          </Link>
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.75rem' }}>Works with as few as 30 transactions · Rollback anytime</p>
        </div>
      </main>
    </div>
  )
}
