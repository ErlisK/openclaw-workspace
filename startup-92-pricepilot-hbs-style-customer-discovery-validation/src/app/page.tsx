import Link from 'next/link'
import { SiteFooter } from '@/components/SiteFooter'

const BASE_URL = 'https://pricingsim.com'

const homepageJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'PricingSim',
    url: BASE_URL,
    logo: `${BASE_URL}/assets/logo.svg`,
    description: 'Safe Bayesian pricing experiments for solo founders and micro-SaaS sellers doing $500–$10k MRR.',
    sameAs: [],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'PricingSim',
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
    name: 'PricingSim',
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
    publisher: { '@type': 'Organization', name: 'PricingSim', url: BASE_URL },
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
        <span style={{ background: '#dcfce7', color: '#166534', borderRadius: 999, padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 700 }}>CSV ✓ Best</span>
        {['Stripe', 'Gumroad'].map(p => (
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
            <img src="/assets/logo-icon.svg" alt="PricingSim" width={32} height={32} style={{ borderRadius: 8 }} />
            PricingSim
          </span>
          <div className="nav-links">
            <Link href="/free-audit">Free Audit</Link>
            <Link href="/calculator">Calculator</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/login">Sign in</Link>
            <Link href="/signup" className="btn btn-primary btn-sm" data-testid="hero-signup-btn">Start free</Link>
          </div>
        </div>
      </nav>

      <main className="container" style={{ paddingTop: '5rem', paddingBottom: '5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <span className="badge badge-purple" style={{ marginBottom: '1.5rem' }}>For Gumroad creators · template sellers · micro-SaaS founders · $500–$10k MRR</span>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: '1.25rem' }}>
            You&rsquo;re probably underpriced.<br />
            <span style={{ color: 'var(--brand)' }}>Here&rsquo;s how to prove it.</span>
          </h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--muted)', marginBottom: '2.5rem', maxWidth: 540, margin: '0 auto 2.5rem' }}>
            Upload your Gumroad CSV or connect Stripe — PricingSim runs a Bayesian simulation on your actual transaction data to find the safest price increase your data supports, with a rollback in one click if it doesn&rsquo;t work.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/free-audit" className="btn btn-primary" data-testid="cta-audit-btn" style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
              🎯 Free pricing audit — no signup
            </Link>
            <Link href="/signup" className="btn btn-secondary" data-testid="cta-signup-btn" style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
              Start free →
            </Link>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: '0.75rem' }}>No credit card required · Rollback any experiment in one click · Your data never leaves our encrypted database</p>

          {/* ── Early access social proof ── */}
          <div style={{ marginTop: '4rem', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: '#6c47ff', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '0.75rem' }}>🚀 Now in early access</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>Be one of the first 50 founders</p>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.25rem', maxWidth: 420, margin: '0 auto 1.25rem' }}>
              We&rsquo;re onboarding solo founders personally. Free access in exchange for honest feedback. No pitch, just data.
            </p>
            <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              {[['🗂', 'CSV import', 'Works today — Gumroad, Stripe, any CSV'], ['🔬', 'Bayesian engine', 'Confidence scores on your actual data'], ['🔁', 'One-click rollback', 'Revert any experiment instantly']].map(([icon, title, desc]) => (
                <div key={title} style={{ textAlign: 'center', maxWidth: 140 }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{icon}</div>
                  <p style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827', marginBottom: '0.2rem' }}>{title}</p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{desc}</p>
                </div>
              ))}
            </div>
            <Link href="/signup" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem' }}>Get early access — free</Link>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.75rem' }}>No credit card · Cancel anytime · Your data stays encrypted</p>
          </div>

          <div className="grid-3" style={{ marginTop: '3rem', textAlign: 'left' }}>
            {[
              { icon: '🗂', title: 'CSV import in 60s', desc: 'Drop in a Gumroad, Lemon Squeezy, or Stripe CSV. No code, no API keys required.' },
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

          {/* ── Who it's for ── */}
          <div style={{ marginTop: '4rem', textAlign: 'left' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, textAlign: 'center', marginBottom: '0.5rem', color: '#111827' }}>Built for three types of sellers</h2>
            <p style={{ color: 'var(--muted)', textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem' }}>If you sell digital products and haven’t touched your price since launch, this is for you.</p>
            <div className="grid-3" style={{ gap: '1rem' }}>
              {[
                { emoji: '📝', label: 'Template Sellers', platforms: 'Gumroad · Lemon Squeezy · Payhip', mrr: '$500–$5k MRR', pain: 'Set a launch price and never changed it. Suspects they’re underpriced but fears a backlash.', cta: '/for-gumroad-sellers', ctaLabel: 'See how it works →' },
                { emoji: '🚀', label: 'Micro-SaaS Founders', platforms: 'Stripe · Paddle', mrr: '$2k–$10k MRR', pain: 'Afraid to raise subscription prices. No time to build an A/B framework, no data on elasticity.', cta: '/for-micro-saas', ctaLabel: 'See how it works →' },
                { emoji: '🎬', label: 'Course Creators', platforms: 'Teachable · Podia · Gumroad', mrr: '$1k–$8k MRR', pain: 'One fixed price point. No idea if tiered or bundle pricing would convert better.', cta: '/for-stripe-users', ctaLabel: 'See how it works →' },
              ].map(p => (
                <div key={p.label} className="card" style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{p.emoji}</div>
                  <p style={{ fontWeight: 800, color: '#111827', marginBottom: '0.2rem' }}>{p.label}</p>
                  <p style={{ fontSize: '0.75rem', color: '#6c47ff', fontWeight: 600, marginBottom: '0.5rem' }}>{p.platforms}</p>
                  <p style={{ fontSize: '0.75rem', background: '#f3f4f6', borderRadius: 6, padding: '0.2rem 0.5rem', display: 'inline-block', color: '#374151', marginBottom: '0.75rem' }}>{p.mrr}</p>
                  <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>{p.pain}</p>
                  <Link href={p.cta} style={{ color: '#6c47ff', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>{p.ctaLabel}</Link>
                </div>
              ))}
            </div>
          </div>
          {/* ── /Who it's for ── */}

          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '3rem', maxWidth: 520, margin: '3rem auto 0', textAlign: 'center' }}>
            Results vary. Estimates are model-based, not guarantees. PricingSim&apos;s recommendations are for informational purposes only and do not constitute financial or business advice.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
    </>
  )
}
