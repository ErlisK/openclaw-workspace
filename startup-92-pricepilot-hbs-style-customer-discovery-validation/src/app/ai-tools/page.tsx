'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import ProGate from '@/components/ProGate'

type Tab = 'explain' | 'comms' | 'copy'

// ── Types ──────────────────────────────────────────────────────────────────

interface ExplainResult {
  explanation: string
  key_points: string[]
  action: string
}

interface CommsResult {
  email: { subject: string; body: string }
  tweet: string
  blog_intro: string
}

interface CopyResult {
  headline: string
  subheadline: string
  description: string
  cta_text: string
  variant_a_label: string
  variant_b_label: string
  trust_line: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', background: copied ? '#d1fae5' : 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.375rem', cursor: 'pointer', color: copied ? '#065f46' : 'var(--muted)' }}>
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

function OutputBox({ label, content }: { label: string; content: string }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
        <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{label}</p>
        <CopyBtn text={content} />
      </div>
      <pre style={{ background: 'var(--surface)', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.85rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6, margin: 0 }}>
        {content}
      </pre>
    </div>
  )
}

// ── Tab: Explain ───────────────────────────────────────────────────────────

function ExplainTab() {
  const [currentPrice, setCurrentPrice] = useState('')
  const [suggestedPrice, setSuggestedPrice] = useState('')
  const [productName, setProductName] = useState('')
  const [confidence, setConfidence] = useState('')
  const [lift, setLift] = useState('')
  const [rationale, setRationale] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ExplainResult | null>(null)
  const [error, setError] = useState('')

  const generate = async () => {
    setLoading(true); setError(''); setResult(null)
    const resp = await fetch('/api/ai/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suggestion: {
          products: { name: productName || 'Product' },
          current_price_cents: Math.round(parseFloat(currentPrice || '10') * 100),
          suggested_price_cents: Math.round(parseFloat(suggestedPrice || '12') * 100),
          confidence_score: confidence ? parseFloat(confidence) / 100 : null,
          proj_monthly_lift_p50: lift ? Math.round(parseFloat(lift) * 100) : null,
          rationale: rationale || null,
          caveats: [],
        },
      }),
    })
    const data = await resp.json()
    setLoading(false)
    if (!resp.ok) { setError(data.error || 'Failed'); return }
    setResult(data)
  }

  return (
    <div>
      <p style={{ color: 'var(--muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Paste your recommendation details and get a plain-English explanation you can share with your audience or use to explain the decision to yourself.
      </p>

      <div className="grid-2" style={{ marginBottom: '1rem' }}>
        <div>
          <label className="form-label">Product name</label>
          <input value={productName} onChange={e => setProductName(e.target.value)} placeholder="Ultimate Notion Dashboard"
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem' }} />
        </div>
        <div>
          <label className="form-label">Confidence (%)</label>
          <input type="number" value={confidence} onChange={e => setConfidence(e.target.value)} placeholder="72"
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem' }} />
        </div>
        <div>
          <label className="form-label">Current price ($)</label>
          <input type="number" step="0.01" value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} placeholder="12.00"
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem' }} />
        </div>
        <div>
          <label className="form-label">Suggested price ($)</label>
          <input type="number" step="0.01" value={suggestedPrice} onChange={e => setSuggestedPrice(e.target.value)} placeholder="15.00"
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem' }} />
        </div>
        <div>
          <label className="form-label">Projected lift ($/mo, optional)</label>
          <input type="number" value={lift} onChange={e => setLift(e.target.value)} placeholder="42"
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem' }} />
        </div>
        <div>
          <label className="form-label">Engine rationale (optional)</label>
          <input value={rationale} onChange={e => setRationale(e.target.value)} placeholder="Demand is inelastic at this price range"
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem' }} />
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}
      <button className="btn btn-primary" onClick={generate} disabled={loading} data-testid="explain-generate-btn"
        style={{ marginBottom: '1.5rem' }}>
        {loading ? <span className="spinner" /> : '🤖'}
        {loading ? 'Generating explanation…' : 'Explain this recommendation'}
      </button>

      {result && (
        <div data-testid="explain-output">
          <div className="card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: '1rem' }}>
            <p style={{ lineHeight: 1.7, marginBottom: '1rem' }}>{result.explanation}</p>
            <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {result.key_points.map((pt, i) => <li key={i} style={{ lineHeight: 1.5 }}>{pt}</li>)}
            </ul>
          </div>
          <div className="card" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>→ Next step</p>
            <p>{result.action}</p>
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
            <CopyBtn text={`${result.explanation}\n\nKey points:\n${result.key_points.map(p => `• ${p}`).join('\n')}\n\nNext step: ${result.action}`} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab: Comms ─────────────────────────────────────────────────────────────

function CommsTab() {
  const [productName, setProductName] = useState('')
  const [oldPrice, setOldPrice] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [sellerName, setSellerName] = useState('')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CommsResult | null>(null)
  const [error, setError] = useState('')

  const generate = async () => {
    setLoading(true); setError(''); setResult(null)
    const resp = await fetch('/api/ai/comms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_name: productName, old_price: oldPrice, new_price: newPrice, seller_name: sellerName, context }),
    })
    const data = await resp.json()
    setLoading(false)
    if (!resp.ok) { setError(data.error || 'Failed'); return }
    setResult(data)
  }

  return (
    <div>
      <p style={{ color: 'var(--muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Generate honest, non-salesy communication templates for your price change — ready-to-send email, tweet, and blog intro.
      </p>

      <div className="grid-2" style={{ marginBottom: '1rem' }}>
        <div>
          <label className="form-label">Product name *</label>
          <input value={productName} onChange={e => setProductName(e.target.value)} placeholder="Ultimate Notion Dashboard"
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem' }} />
        </div>
        <div>
          <label className="form-label">Your name / brand</label>
          <input value={sellerName} onChange={e => setSellerName(e.target.value)} placeholder="Alex"
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem' }} />
        </div>
        <div>
          <label className="form-label">Old price ($)</label>
          <input type="number" step="0.01" value={oldPrice} onChange={e => setOldPrice(e.target.value)} placeholder="12.00"
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem' }} />
        </div>
        <div>
          <label className="form-label">New price ($) *</label>
          <input type="number" step="0.01" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="15.00"
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem' }} />
        </div>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label className="form-label">Context (optional — describe why you&apos;re changing the price)</label>
        <textarea value={context} onChange={e => setContext(e.target.value)} rows={2}
          placeholder="I've added 3 new templates and the community has grown to 500+ buyers"
          style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem', resize: 'vertical' }} />
      </div>

      {error && <p className="error-message">{error}</p>}
      <button className="btn btn-primary" onClick={generate} disabled={loading || !productName || !newPrice}
        data-testid="comms-generate-btn" style={{ marginBottom: '1.5rem' }}>
        {loading ? <span className="spinner" /> : '✉️'}
        {loading ? 'Writing templates…' : 'Generate roll-out templates'}
      </button>

      {result && (
        <div data-testid="comms-output">
          <OutputBox label="📧 Email — Subject" content={result.email.subject} />
          <OutputBox label="📧 Email — Body" content={result.email.body} />
          <OutputBox label="🐦 Tweet / X post" content={result.tweet} />
          <OutputBox label="📝 Blog post intro" content={result.blog_intro} />
        </div>
      )}
    </div>
  )
}

// ── Tab: Copy ──────────────────────────────────────────────────────────────

function CopyTab() {
  const [productName, setProductName] = useState('')
  const [priceA, setPriceA] = useState('')
  const [priceB, setPriceB] = useState('')
  const [description, setDescription] = useState('')
  const [audience, setAudience] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CopyResult | null>(null)
  const [error, setError] = useState('')
  const [applyExpId, setApplyExpId] = useState('')

  const generate = async () => {
    setLoading(true); setError(''); setResult(null)
    const resp = await fetch('/api/ai/copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_name: productName, price_a: priceA, price_b: priceB, description, audience }),
    })
    const data = await resp.json()
    setLoading(false)
    if (!resp.ok) { setError(data.error || 'Failed'); return }
    setResult(data)
  }

  const applyToExperiment = async () => {
    if (!applyExpId || !result) return
    const resp = await fetch('/api/ai/copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ experiment_id: applyExpId, product_name: productName, price_a: priceA, price_b: priceB, description, audience, apply: true }),
    })
    if (resp.ok) alert('✅ Applied to experiment!')
    else alert('Failed to apply')
  }

  return (
    <div>
      <p style={{ color: 'var(--muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Generate high-converting landing page copy for your A/B pricing experiment. Copy-paste directly into the experiment builder.
      </p>

      <div className="grid-2" style={{ marginBottom: '1rem' }}>
        <div>
          <label className="form-label">Product name *</label>
          <input value={productName} onChange={e => setProductName(e.target.value)} placeholder="Ultimate Notion Dashboard"
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem' }} />
        </div>
        <div>
          <label className="form-label">Target audience</label>
          <input value={audience} onChange={e => setAudience(e.target.value)} placeholder="Notion power users, solo founders"
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem' }} />
        </div>
        <div>
          <label className="form-label">Variant A price ($)</label>
          <input type="number" step="0.01" value={priceA} onChange={e => setPriceA(e.target.value)} placeholder="12.00"
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem' }} />
        </div>
        <div>
          <label className="form-label">Variant B price ($)</label>
          <input type="number" step="0.01" value={priceB} onChange={e => setPriceB(e.target.value)} placeholder="15.00"
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem' }} />
        </div>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label className="form-label">What does your product do? (optional)</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
          placeholder="A Notion template system for productivity and project management"
          style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem', resize: 'vertical' }} />
      </div>

      {error && <p className="error-message">{error}</p>}
      <button className="btn btn-primary" onClick={generate} disabled={loading || !productName}
        data-testid="copy-generate-btn" style={{ marginBottom: '1.5rem' }}>
        {loading ? <span className="spinner" /> : '✍️'}
        {loading ? 'Writing copy…' : 'Generate page copy'}
      </button>

      {result && (
        <div data-testid="copy-output">
          <OutputBox label="Headline" content={result.headline} />
          <OutputBox label="Subheadline" content={result.subheadline} />
          <OutputBox label="Description" content={result.description} />
          <div className="grid-2" style={{ marginBottom: '1rem' }}>
            <OutputBox label="CTA button text" content={result.cta_text} />
            <OutputBox label="Trust line" content={result.trust_line} />
          </div>
          <div className="grid-2" style={{ marginBottom: '1rem' }}>
            <OutputBox label="Variant A label" content={result.variant_a_label} />
            <OutputBox label="Variant B label" content={result.variant_b_label} />
          </div>

          <div className="card" style={{ background: 'var(--surface)', marginTop: '1rem' }}>
            <p style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.875rem' }}>Apply to an experiment</p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input value={applyExpId} onChange={e => setApplyExpId(e.target.value)} placeholder="Experiment ID (from URL)"
                style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem', fontSize: '0.875rem' }} />
              <button className="btn btn-secondary" onClick={applyToExperiment} disabled={!applyExpId}>
                Apply →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function AIToolsPage() {
  const [tab, setTab] = useState<Tab>('explain')
  const [isPro, setIsPro] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/billing/status')
      .then(r => r.json())
      .then(d => setIsPro(d.is_pro ?? false))
      .catch(() => setIsPro(false))
  }, [])

  const tabs: { id: Tab; label: string; icon: string; pro?: boolean }[] = [
    { id: 'explain', label: 'Explain recommendation', icon: '💡' },
    { id: 'comms', label: 'Roll-out templates', icon: '✉️', pro: true },
    { id: 'copy', label: 'Experiment page copy', icon: '✍️', pro: true },
  ]

  return (
    <div className="page">
      <nav className="nav">
        <div className="container nav-inner">
          <Link href="/dashboard" className="nav-logo">🚀 PricePilot</Link>
          <div className="nav-links">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/suggestions">Suggestions</Link>
            <Link href="/experiments">Experiments</Link>
          </div>
        </div>
      </nav>

      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem', maxWidth: 780 }}>
        <Link href="/dashboard" style={{ color: 'var(--muted)', fontSize: '0.875rem', display: 'block', marginBottom: '1.5rem' }}>← Back</Link>

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>🤖 AI Writing Tools</h1>
          <p style={{ color: 'var(--muted)' }}>Powered by Claude — explain recommendations, draft comms, and write experiment copy.</p>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              data-testid={`tab-${t.id}`}
              style={{
                padding: '0.6rem 1rem', borderRadius: '0.625rem', fontWeight: 600, fontSize: '0.875rem',
                border: tab === t.id ? '2px solid var(--brand)' : '1px solid var(--border)',
                background: tab === t.id ? 'rgba(108,71,255,0.06)' : '#fff',
                color: tab === t.id ? 'var(--brand)' : 'var(--text)',
                cursor: 'pointer',
              }}>
              {t.icon} {t.label}{t.pro && isPro === false && <span style={{ marginLeft: '0.35rem', fontSize: '0.65rem', background: '#6c47ff', color: '#fff', borderRadius: 4, padding: '0.1rem 0.3rem', verticalAlign: 'middle' }}>Pro</span>}
            </button>
          ))}
        </div>

        <div className="card">
          {tab === 'explain' && <ExplainTab />}
          {tab === 'comms' && (
            isPro === false
              ? <ProGate feature="Roll-out Communications" description="AI-generated email, tweet, and blog templates for announcing your price change." />
              : <CommsTab />
          )}
          {tab === 'copy' && (
            isPro === false
              ? <ProGate feature="Experiment Copy Generator" description="AI-generated headlines, CTAs, and landing page copy for your A/B experiment pages." />
              : <CopyTab />
          )}
        </div>
      </main>
    </div>
  )
}
