'use client'
import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'

interface EngineResult {
  action: 'test_higher' | 'stable' | 'insufficient_data'
  price_ref: number
  price_proposed: number | null
  revenue_ref_monthly: number
  revenue_dist: {
    p05: number; p25: number; p50: number; p75: number; p95: number
    mean: number
    prob_above_current: number
  } | null
  elasticity_mean: number | null
  confidence_label: string
  why_text: string
  caveats: string[]
}

interface ProductResult {
  product: string
  n_transactions: number
  current_price: number
  engine: EngineResult
  estimated_monthly_rev: number
}

interface AuditResult {
  ok: boolean
  n_rows: number
  n_products: number
  estimated_mrr: number
  results: ProductResult[]
  note: string | null
  error?: string
}

function ConfidenceBadge({ label }: { label: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    high: { bg: '#dcfce7', color: '#166534' },
    medium: { bg: '#fef9c3', color: '#854d0e' },
    low: { bg: '#fee2e2', color: '#991b1b' },
    'insufficient data': { bg: '#f3f4f6', color: '#6b7280' },
  }
  const key = label.toLowerCase().includes('high') ? 'high'
    : label.toLowerCase().includes('medium') ? 'medium'
    : label.toLowerCase().includes('low') ? 'low'
    : 'insufficient data'
  const c = colors[key]
  return (
    <span style={{ background: c.bg, color: c.color, padding: '0.2rem 0.6rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 }}>
      {label}
    </span>
  )
}

function ProductCard({ r }: { r: ProductResult }) {
  const hasRecommendation = r.engine.action === 'test_higher' && r.engine.price_proposed
  const lift = r.engine.revenue_dist?.mean
    ? Math.round((r.engine.revenue_dist.mean / r.engine.revenue_ref_monthly - 1) * 100)
    : null

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.875rem', padding: '1.5rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>{r.product}</h3>
          <p style={{ color: '#6b7280', fontSize: '0.8rem' }}>{r.n_transactions} transactions · est. ${r.estimated_monthly_rev}/mo revenue</p>
        </div>
        <ConfidenceBadge label={r.engine.confidence_label} />
      </div>

      {hasRecommendation ? (
        <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '0.625rem', padding: '1.25rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <div>
              <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#374151' }}>${r.current_price.toFixed(0)}</p>
            </div>
            <div style={{ fontSize: '1.25rem', color: '#9ca3af' }}>→</div>
            <div>
              <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Suggested test price</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6c47ff' }}>${r.engine.price_proposed!.toFixed(0)}</p>
            </div>
            {lift !== null && lift > 0 && (
              <div>
                <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Projected lift</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a' }}>+{lift}%</p>
              </div>
            )}
          </div>
          {r.engine.revenue_dist && (
            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: '#6b7280', flexWrap: 'wrap' }}>
              <span>80% CI: ${Math.round(r.engine.revenue_dist.p05 ?? 0)}–${Math.round(r.engine.revenue_dist.p95 ?? 0)}/mo</span>
              <span>·</span>
              <span>{Math.round((r.engine.revenue_dist.prob_above_current ?? 0) * 100)}% chance revenue goes up</span>
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: '#f9fafb', borderRadius: '0.625rem', padding: '1rem', marginBottom: '0.75rem' }}>
          <p style={{ color: '#374151', fontSize: '0.875rem' }}>
            {r.engine.action === 'stable'
              ? `Current price of $${r.current_price.toFixed(0)} appears near-optimal for your transaction history. Small test increases are low-risk.`
              : `More data needed for a high-confidence recommendation (have ${r.n_transactions} transactions, 10+ with price variation is ideal).`
            }
          </p>
        </div>
      )}

      <p style={{ color: '#4b5563', fontSize: '0.875rem', lineHeight: 1.6 }}>{r.engine.why_text}</p>

      {r.engine.caveats.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          {r.engine.caveats.slice(0, 2).map((c, i) => (
            <p key={i} style={{ color: '#9ca3af', fontSize: '0.75rem', marginBottom: '0.2rem' }}>⚠ {c}</p>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FreeAuditPage() {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AuditResult | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.csv') && !f.type.includes('csv') && !f.type.includes('text')) {
      setError('Please upload a .csv file')
      return
    }
    setFile(f)
    setError('')
    setResult(null)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  const runAudit = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/free-audit', { method: 'POST', body: fd })
      const data: AuditResult = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Analysis failed. Please try again.')
      } else {
        setResult(data)
      }
    } catch {
      setError('Network error. Please try again.')
    }
    setLoading(false)
  }

  const hasResults = result && result.ok && result.results.length > 0

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f9f8ff 0%, #ede9fe 100%)' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #e5e7eb', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)', padding: '0 1rem', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: '#111827', fontWeight: 700 }}>
            ← PricePilot
          </Link>
          <Link href="/signup" style={{ background: '#6c47ff', color: '#fff', padding: '0.5rem 1.25rem', borderRadius: 8, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>
            Get full access →
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 1rem 5rem' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span style={{ background: '#ede9fe', color: '#6c47ff', padding: '0.3rem 1rem', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, display: 'inline-block', marginBottom: '1rem' }}>
            Free · No signup · Results in 30 seconds
          </span>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 900, color: '#111827', marginBottom: '1rem', lineHeight: 1.15 }}>
            Your Free Pricing Audit
          </h1>
          <p style={{ color: '#6b7280', fontSize: '1.1rem', maxWidth: 540, margin: '0 auto', lineHeight: 1.6 }}>
            Upload your Stripe, Gumroad, or Shopify CSV export. Our Bayesian engine analyzes your transaction history and tells you the safest price increase your data supports — with confidence scores and projected revenue lift.
          </p>
        </div>

        {/* CSV Tips */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.875rem', padding: '1.25rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {[
            { icon: '📊', label: 'Stripe', tip: 'Dashboard → Payments → Export CSV' },
            { icon: '🍋', label: 'Gumroad', tip: 'Dashboard → Analytics → Export' },
            { icon: '🛒', label: 'Shopify', tip: 'Orders → Export to CSV' },
            { icon: '📄', label: 'Any CSV', tip: 'Needs date, product, price columns' },
          ].map(({ icon, label, tip }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{icon}</div>
              <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111827', marginBottom: '0.15rem' }}>{label}</p>
              <p style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{tip}</p>
            </div>
          ))}
        </div>

        {/* Upload area */}
        {!hasResults && (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? '#6c47ff' : file ? '#16a34a' : '#d1d5db'}`,
              borderRadius: '0.875rem',
              padding: '3rem 2rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragging ? '#f5f3ff' : file ? '#f0fdf4' : '#fafafa',
              transition: 'all 0.15s',
              marginBottom: '1.5rem',
            }}
          >
            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            {file ? (
              <>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                <p style={{ fontWeight: 700, color: '#166534', marginBottom: '0.25rem' }}>{file.name}</p>
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Click to change file</p>
              </>
            ) : (
              <>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📂</div>
                <p style={{ fontWeight: 700, color: '#111827', marginBottom: '0.25rem', fontSize: '1.1rem' }}>Drop your CSV here</p>
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>or click to browse</p>
                <p style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.5rem' }}>Up to 2,000 rows · .csv files only</p>
                <a
                  href="/sample-transactions.csv"
                  download
                  onClick={e => e.stopPropagation()}
                  style={{ color: '#6c47ff', fontSize: '0.75rem', fontWeight: 600, marginTop: '0.75rem', display: 'inline-block', textDecoration: 'underline' }}
                >
                  📥 Download sample CSV to try it out
                </a>
              </>
            )}
          </div>
        )}

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '0.625rem', padding: '0.875rem 1.25rem', marginBottom: '1.5rem', color: '#991b1b', fontSize: '0.9rem' }}>
            ❌ {error}
          </div>
        )}

        {file && !hasResults && (
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <button
              onClick={runAudit}
              disabled={loading}
              style={{
                background: loading ? '#9ca3af' : '#6c47ff',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '1rem 3rem',
                fontSize: '1.1rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {loading ? '🔬 Analyzing your data...' : '🚀 Run Free Pricing Audit'}
            </button>
            <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '0.75rem' }}>No signup required. Data is not stored.</p>
          </div>
        )}

        {/* Results */}
        {hasResults && result && (
          <div>
            {/* Summary banner */}
            <div style={{ background: 'linear-gradient(135deg, #6c47ff 0%, #9333ea 100%)', borderRadius: '0.875rem', padding: '1.5rem', marginBottom: '1.5rem', color: '#fff' }}>
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.25rem' }}>Transactions analyzed</p>
                  <p style={{ fontSize: '1.75rem', fontWeight: 900 }}>{result.n_rows.toLocaleString()}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.25rem' }}>Products found</p>
                  <p style={{ fontSize: '1.75rem', fontWeight: 900 }}>{result.n_products}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.25rem' }}>Est. monthly revenue</p>
                  <p style={{ fontSize: '1.75rem', fontWeight: 900 }}>${result.estimated_mrr.toLocaleString()}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.25rem' }}>Pricing opportunities</p>
                  <p style={{ fontSize: '1.75rem', fontWeight: 900 }}>
                    {result.results.filter(r => r.engine.action === 'test_higher').length}
                  </p>
                </div>
              </div>
            </div>

            {result.note && (
              <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#854d0e', fontSize: '0.875rem' }}>
                ℹ️ {result.note}
              </div>
            )}

            {result.results.map((r, i) => <ProductCard key={i} r={r} />)}

            {/* CTA to sign up */}
            <div style={{ background: '#fff', border: '2px solid #6c47ff', borderRadius: '0.875rem', padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: '#111827' }}>
                Ready to run a live A/B test?
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem', maxWidth: 480, margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
                PricePilot turns this simulation into a real experiment page — with live conversion tracking, one-click rollback, and AI-generated email templates to announce your price change.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/signup" style={{ background: '#6c47ff', color: '#fff', padding: '0.875rem 2rem', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: '1rem' }}>
                  Start free — no credit card
                </Link>
                <button
                  onClick={() => { setResult(null); setFile(null) }}
                  style={{ background: '#f3f4f6', color: '#374151', padding: '0.875rem 2rem', borderRadius: 10, border: 'none', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
                >
                  Try another CSV
                </button>
              </div>
            </div>

            {/* Share prompt */}
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                Found this useful? Share it with a founder friend →{' '}
                <a href={`https://twitter.com/intent/tweet?text=Just+ran+a+free+pricing+audit+on+my+sales+data+with+@PricePilotHQ+—+found+${result.results.filter(r => r.engine.action === 'test_higher').length}+pricing+opportunity(ies)+in+30+seconds&url=https://startup-92-pricepilot-hbs-style-cus.vercel.app/free-audit`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ color: '#6c47ff', fontWeight: 600 }}>
                  Tweet your results
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Trust signals */}
        {!hasResults && (
          <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
            <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '1rem' }}>No account needed · Your data is never stored · Takes 30 seconds</p>
            <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { icon: '🔒', label: 'Zero data retention' },
                { icon: '🎯', label: 'Bayesian engine, not guesswork' },
                { icon: '🔁', label: 'One-click rollback on live tests' },
              ].map(({ icon, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#6b7280', fontSize: '0.875rem' }}>
                  <span>{icon}</span><span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(255,255,255,0.5)', borderRadius: '0.75rem' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '1rem' }}>How we export your CSV</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.85rem', color: '#6b7280' }}>
            <div><strong style={{ color: '#111827' }}>Stripe:</strong> Dashboard → Payments → All → Export → CSV</div>
            <div><strong style={{ color: '#111827' }}>Gumroad:</strong> Analytics → Sales → Export (date range)</div>
            <div><strong style={{ color: '#111827' }}>Shopify:</strong> Orders → Export → All time → CSV</div>
            <div><strong style={{ color: '#111827' }}>Lemon Squeezy:</strong> Orders → Export to CSV</div>
          </div>
        </div>
      </main>
    </div>
  )
}
