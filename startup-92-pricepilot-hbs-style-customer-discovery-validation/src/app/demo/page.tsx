import Link from 'next/link'

const DEMO_SUGGESTIONS = [
  {
    id: 'demo-1',
    title: 'Raise "Notion Dashboard Bundle" from $27 → $37',
    rationale: 'Your elasticity curve shows demand holds steady up to ~$40. Buyers at this price point are comparing to consultant time (≥$200/hr), not to free alternatives. A 37% price increase is projected to increase monthly revenue by $340.',
    confidence_label: '84% confident',
    confidence_score: 0.84,
    current_price: 2700,
    suggested_price: 3700,
    proj_monthly_lift: 34000,
  },
  {
    id: 'demo-2',
    title: 'Add a $97 "Pro + Support" bundle tier',
    rationale: '11% of buyers asked about support or customization in your checkout notes. A higher tier captures this willingness-to-pay without cannibalizing your $27 base. Projected to add $210/mo with minimal downside.',
    confidence_label: '71% confident',
    confidence_score: 0.71,
    current_price: 2700,
    suggested_price: 9700,
    proj_monthly_lift: 21000,
  },
  {
    id: 'demo-3',
    title: 'Seasonal anchor: show $47 crossed out → $27',
    rationale: 'Your conversion rate historically spikes 22% in Jan and Sep. A temporary anchor price experiment during these windows can boost perceived value without a permanent price change.',
    confidence_label: '62% confident',
    confidence_score: 0.62,
    current_price: 2700,
    suggested_price: 2700,
    proj_monthly_lift: 12000,
  },
]

export default function DemoPage() {
  return (
    <div className="page">
      <nav className="nav">
        <Link href="/" className="nav-logo">PricingSim</Link>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link href="/signup" className="btn btn-primary" style={{ fontSize: '0.875rem', padding: '0.4rem 1rem' }}>
            Try with your data →
          </Link>
        </div>
      </nav>

      <main className="main" style={{ maxWidth: '760px' }}>
        {/* Demo banner */}
        <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#92400e', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span>🎭</span>
          <div>
            <strong>Demo mode</strong> — this is a read-only preview using a fictional &quot;Notion template seller&quot; with 3 months of synthetic data. No signup required.
            <Link href="/signup" style={{ marginLeft: '0.75rem', color: '#92400e', fontWeight: 700 }}>Connect your real data →</Link>
          </div>
        </div>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>Your pricing suggestions</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>Based on 3 months · 147 transactions · $2,340 avg MRR</p>

        {DEMO_SUGGESTIONS.map((s) => (
          <div key={s.id} className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <h3 style={{ fontWeight: 700 }}>{s.title}</h3>
                  <span
                    className="badge badge-purple"
                    style={{ cursor: 'default' }}
                    title={`Confidence measures how certain we are this price outperforms your current price. ${Math.round(s.confidence_score * 100)}% means: if you ran this experiment 20 times, it would show a lift ~${Math.round(s.confidence_score * 20)} times. Experiments typically reach 80%+ confidence in 2–4 weeks.`}
                  >
                    {s.confidence_label} <span style={{ opacity: 0.7, fontSize: '0.75em' }}>ℹ</span>
                  </span>
                </div>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>{s.rationale}</p>

                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem' }}>
                  <div>
                    <p className="stat-label">Current</p>
                    <p style={{ fontWeight: 700 }}>${(s.current_price / 100).toFixed(0)}</p>
                  </div>
                  {s.suggested_price !== s.current_price && (
                    <>
                      <div style={{ color: 'var(--muted)', paddingTop: '1rem' }}>→</div>
                      <div>
                        <p className="stat-label">Proposed</p>
                        <p style={{ fontWeight: 700, color: 'var(--brand)' }}>${(s.suggested_price / 100).toFixed(0)}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="stat-label">Expected lift</p>
                    <p style={{ fontWeight: 700, color: 'var(--success)' }}>+${(s.proj_monthly_lift / 100).toFixed(0)}/mo</p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link href="/signup" className="btn btn-primary" style={{ fontSize: '0.875rem' }}>
                🚀 Run this experiment with your data
              </Link>
              <span className="btn btn-secondary" style={{ fontSize: '0.875rem', opacity: 0.6, cursor: 'default' }}>
                📊 Demo only — connect data to unlock
              </span>
            </div>
          </div>
        ))}

        {/* Rollback safety callout */}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '0.875rem 1rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#166534' }}>
          <strong>🔒 Safe to launch — here&apos;s how rollback works:</strong>
          <ul style={{ margin: '0.5rem 0 0 1.25rem', paddingLeft: 0 }}>
            <li>Your current price stays active for <strong>all existing visitors</strong>.</li>
            <li>Experiments only affect <strong>new visitors</strong> — 50/50 split by default.</li>
            <li>Revert to your original price in <strong>one click</strong> at any time.</li>
          </ul>
        </div>

        <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--surface)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Ready to test with your own data?</p>
          <p style={{ color: 'var(--muted)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            Connect Stripe, Gumroad, or Shopify — or drop in a CSV. Takes 2 minutes. Free to start.
          </p>
          <Link href="/signup" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}>
            Start free — no credit card required →
          </Link>
        </div>
      </main>
    </div>
  )
}
