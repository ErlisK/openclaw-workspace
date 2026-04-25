import Link from 'next/link'
import { SiteFooter } from '@/components/SiteFooter'

const BASE_URL = 'https://startup-92-pricepilot-hbs-style-cus.vercel.app'

const homepageJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'PricePilot',
    url: BASE_URL,
    logo: `${BASE_URL}/assets/logo.svg`,
    description: 'Safe Bayesian pricing experiments for solo founders and micro-SaaS sellers doing $500–$10k MRR.',
    sameAs: [],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'PricePilot',
    url: BASE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${BASE_URL}/blog?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'PricePilot',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: BASE_URL,
    description: 'Bayesian A/B pricing experiments for solo founders. Connect Stripe, Gumroad, or Shopify and safely test higher prices with one-click rollback.',
    featureList: [
      'Bayesian elasticity engine',
      'A/B experiment pages',
      'One-click rollback',
      'Stripe/Gumroad/Shopify import',
      'AI communication templates',
      'Cohort-aware simulations',
    ],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free tier with 3 experiments. Pro at $29/month.',
    },
    publisher: { '@type': 'Organization', name: 'PricePilot', url: BASE_URL },
  },
]

// ── Inline mockup components ──────────────────────────────────────────────────

function ImportMockup() {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.25rem', textAlign: 'left', fontSize: '0.8rem' }}>
      <p style={{ fontWeight: 700, color: '#111827', marginBottom: '0.75rem', fontSize: '0.875rem' }}>📥 Import sales data</p>
      <div style={{ background: '#f9fafb', border: '2px dashed #d1d5db', borderRadius: '0.5rem', padding: '1rem', textAlign: 'center', marginBottom: '0.75rem', color: '#9ca3af' }}>
        <p style={{ marginBottom: '0.25rem' }}>🗂 Drop your CSV here</p>
        <p style={{ fontSize: '0.7rem' }}>or click to browse</p>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        {['Stripe', 'Gumroad', 'Shopify'].map(p => (
          <span key={p} style={{ background: '#ede9fe', color: '#6c47ff', borderRadius: 999, padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 600 }}>{p}</span>
        ))}
      </div>
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.4rem', padding: '0.5rem 0.75rem', color: '#166534', fontSize: '0.75rem' }}>
        ✓ 312 transactions detected · 4 products found
      </div>
    </div>
  )
}

function SuggestionMockup() {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.25rem', textAlign: 'left', fontSize: '0.8rem' }}>
      <p style={{ fontWeight: 700, color: '#111827', marginBottom: '0.75rem', fontSize: '0.875rem' }}>🎯 Price suggestion</p>
      <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '0.5rem', padding: '0.875rem', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <span style={{ fontWeight: 700, color: '#111827' }}>Notion Template Bundle</span>
          <span style={{ background: '#6c47ff', color: '#fff', borderRadius: 999, padding: '0.15rem 0.6rem', fontSize: '0.65rem', fontWeight: 700 }}>High confidence</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
          <div>
            <p style={{ color: '#9ca3af', fontSize: '0.7rem' }}>Current price</p>
            <p style={{ fontWeight: 700, fontSize: '1rem', color: '#374151' }}>$19</p>
          </div>
          <div style={{ color: '#9ca3af', alignSelf: 'flex-end', marginBottom: '0.1rem' }}>→</div>
          <div>
            <p style={{ color: '#9ca3af', fontSize: '0.7rem' }}>Suggested price</p>
            <p style={{ fontWeight: 700, fontSize: '1rem', color: '#6c47ff' }}>$27</p>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <p style={{ color: '#9ca3af', fontSize: '0.7rem' }}>Projected lift</p>
            <p style={{ fontWeight: 700, color: '#16a34a', fontSize: '0.95rem' }}>+24% MRR</p>
          </div>
        </div>
        <p style={{ fontSize: '0.7rem', color: '#6b7280' }}>Bayesian elasticity: 0.62 · CI 80%: [+14%, +36%]</p>
      </div>
      <button style={{ width: '100%', background: '#6c47ff', color: '#fff', border: 'none', borderRadius: '0.4rem', padding: '0.5rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
        Run A/B experiment →
      </button>
    </div>
  )
}

function ExperimentMockup() {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.25rem', textAlign: 'left', fontSize: '0.8rem' }}>
      <p style={{ fontWeight: 700, color: '#111827', marginBottom: '0.75rem', fontSize: '0.875rem' }}>📈 Experiment results</p>
      <div style={{ marginBottom: '0.75rem' }}>
        {[
          { label: 'Variant A — $19', pct: 45, visitors: 124, conv: '3.2%', color: '#e5e7eb' },
          { label: 'Variant B — $27', pct: 73, visitors: 118, conv: '5.1%', color: '#6c47ff' },
        ].map(v => (
          <div key={v.label} style={{ marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
              <span style={{ color: '#374151' }}>{v.label}</span>
              <span style={{ fontWeight: 600, color: v.color === '#6c47ff' ? '#6c47ff' : '#9ca3af' }}>{v.conv}</span>
            </div>
            <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${v.pct}%`, background: v.color, borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.4rem', padding: '0.4rem 0.6rem', color: '#166534', fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
        <span>🏆 Variant B winning (+59% lift)</span>
        <span style={{ color: '#6c47ff', fontWeight: 600, cursor: 'pointer' }}>Rollback ↩</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      {homepageJsonLd.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
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
            <Link href="/docs">Docs</Link>
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
            <Link href="/x/demo" className="btn btn-secondary" style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
              See demo experiment →
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

          {/* ── See it in action ── */}
          <div style={{ marginTop: '4rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: '#111827' }}>See it in action</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '2rem', maxWidth: 480, margin: '0 auto 2rem' }}>
              Three steps from raw transaction data to a live A/B price test.
            </p>
            <div className="grid-3" style={{ textAlign: 'left', gap: '1.25rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6c47ff', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Step 1 — Import</p>
                <ImportMockup />
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6c47ff', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Step 2 — Suggestion</p>
                <SuggestionMockup />
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6c47ff', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Step 3 — Results</p>
                <ExperimentMockup />
              </div>
            </div>
            <div style={{ marginTop: '2rem' }}>
              <Link href="/signup" className="btn btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
                Try it free — no credit card
              </Link>
            </div>
          </div>
          {/* ── /See it in action ── */}

          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '3rem', maxWidth: 520, margin: '3rem auto 0', textAlign: 'center' }}>
            Results vary. Estimates are model-based, not guarantees. PricePilot&apos;s recommendations are for informational purposes only and do not constitute financial or business advice.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
    </>
  )
}
