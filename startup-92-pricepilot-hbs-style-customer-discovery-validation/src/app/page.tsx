import Link from 'next/link'
import { SiteFooter } from '@/components/SiteFooter'

export default function HomePage() {
  return (
    <div className="page" style={{ background: 'linear-gradient(135deg, #f9f8ff 0%, #ede9fe 100%)' }}>
      <nav className="nav">
        <div className="container nav-inner">
          <span className="nav-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/assets/logo-icon.svg" alt="PricePilot" width={32} height={32} style={{ borderRadius: 8 }} />
            PricePilot
          </span>
          <div className="nav-links">
            <Link href="/calculator">Calculator</Link>
            <Link href="/guides">Guides</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/login">Sign in</Link>
            <Link href="/signup" className="btn btn-primary btn-sm" data-testid="hero-signup-btn">Start free</Link>
          </div>
        </div>
      </nav>

      <main className="container" style={{ paddingTop: '5rem', paddingBottom: '5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <span className="badge badge-purple" style={{ marginBottom: '1.5rem' }}>Built for solo founders · No stats degree required</span>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: '1.25rem' }}>
            Test a higher price.<br />
            <span style={{ color: 'var(--brand)' }}>Safely. In weeks.</span>
          </h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--muted)', marginBottom: '2.5rem', maxWidth: 520, margin: '0 auto 2.5rem' }}>
            PricePilot connects to Gumroad, Stripe, or a CSV and uses a Bayesian engine to recommend a safe price test — with rollback in one click.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" className="btn btn-primary" data-testid="cta-signup-btn" style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
              Start free — no credit card
            </Link>
            <Link href="/login" className="btn btn-secondary" style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
              Sign in
            </Link>
          </div>

          <div className="card" style={{ marginTop: '4rem', textAlign: 'left' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Illustrative example — not a real user testimonial</p>
            <p style={{ fontSize: '1.1rem', fontStyle: 'italic', color: 'var(--text)', marginBottom: '0.75rem' }}>
              &ldquo;I tested two price points on my digital template. The data made the decision obvious — no guesswork needed.&rdquo;
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted)', fontWeight: 600 }}>— Hypothetical scenario for illustration purposes only. Individual results will vary.</p>
          </div>

          <div className="grid-3" style={{ marginTop: '3rem', textAlign: 'left' }}>
            {[
              { icon: '📊', title: 'Import in 60s', desc: 'Upload a Gumroad CSV or connect Stripe. No code, no webhooks.' },
              { icon: '🎯', title: 'Safe suggestions', desc: 'Bayesian engine recommends 1–3 prices. Never >2.5× current price.' },
              { icon: '🔁', title: 'One-click rollback', desc: 'Rollback to your original price instantly if anything feels off.' },
            ].map(f => (
              <div key={f.title} className="card">
                <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>{f.icon}</div>
                <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{f.title}</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{f.desc}</p>
              </div>
            ))}
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '2rem', maxWidth: 520, margin: '2rem auto 0', textAlign: 'center' }}>
            Results vary. Estimates are model-based, not guarantees. PricePilot&apos;s recommendations are for informational purposes only and do not constitute financial or business advice.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
