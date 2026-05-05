'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

interface Product {
  id: string
  name: string
  current_price_cents: number
}

interface Suggestion {
  id: string
  product_id: string
  suggested_price_cents: number
  title: string
  confidence_score: number
  suggestion_type: string
  products: { name: string; current_price_cents: number } | null
}

function NewExperimentForm() {
  const router = useRouter()
  const sp = useSearchParams()
  const prefillSuggestionId = sp.get('suggestion_id')

  const [products, setProducts] = useState<Product[]>([])
  const [productId, setProductId] = useState('')
  const [priceA, setPriceA] = useState('')
  const [priceB, setPriceB] = useState('')
  const [splitPct, setSplitPct] = useState('50')
  const [headline, setHeadline] = useState('')
  const [description, setDescription] = useState('')
  const [ctaText, setCtaText] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [labelA, setLabelA] = useState('Current price')
  const [labelB, setLabelB] = useState('New price')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<{
    slug: string
    id: string
    preview_url_a: string
    preview_url_b: string
  } | null>(null)

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(d => {
        if (d.products) {
          setProducts(d.products)
          if (d.products.length === 1) {
            setProductId(d.products[0].id)
            setPriceA((d.products[0].current_price_cents / 100).toFixed(2))
          }
        }
      })
      .catch(() => {})

    // Pre-fill from suggestion
    if (prefillSuggestionId) {
      fetch('/api/elasticity')
        .then(r => r.json())
        .then(d => {
          const suggestions: Suggestion[] = d.suggestions || []
          const s = suggestions.find((x: Suggestion) => x.id === prefillSuggestionId)
          if (s) {
            setProductId(s.product_id)
            if (s.products) {
              setPriceA((s.products.current_price_cents / 100).toFixed(2))
              setHeadline(s.products.name)
              setCtaText(`Get ${s.products.name}`)
            }
            setPriceB((s.suggested_price_cents / 100).toFixed(2))
          }
        })
        .catch(() => {})
    }
  }, [prefillSuggestionId])

  const selectedProduct = products.find(p => p.id === productId)

  const handleCreate = async () => {
    setLoading(true); setError('')
    const pA = Math.round(parseFloat(priceA) * 100)
    const pB = Math.round(parseFloat(priceB) * 100)
    if (!productId) { setError('Select a product'); setLoading(false); return }
    if (isNaN(pA) || pA <= 0) { setError('Enter a valid price A'); setLoading(false); return }
    if (isNaN(pB) || pB <= 0) { setError('Enter a valid price B'); setLoading(false); return }

    const resp = await fetch('/api/experiments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        variant_a_price_cents: pA,
        variant_b_price_cents: pB,
        split_pct_b: parseFloat(splitPct) / 100,
        headline: headline || selectedProduct?.name,
        description,
        cta_text: ctaText,
        cta_url: ctaUrl,
        variant_a_label: labelA,
        variant_b_label: labelB,
        suggestion_id: prefillSuggestionId,
      }),
    })
    const data = await resp.json()
    setLoading(false)
    if (!resp.ok) { setError(data.error || 'Failed to create'); return }
    setCreated({ slug: data.experiment.slug, id: data.experiment.id, preview_url_a: data.preview_url_a, preview_url_b: data.preview_url_b })
  }

  const handleActivate = async () => {
    if (!created) return
    setLoading(true)
    const resp = await fetch(`/api/experiments/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    })
    setLoading(false)
    if (resp.ok) router.push('/experiments')
  }

  if (created) {
    return (
      <div className="card" data-testid="experiment-created">
        <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎉</p>
        <h2 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Experiment created!</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
          Preview both variants, then go live when ready.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <a href={created.preview_url_a} target="_blank" rel="noreferrer"
            data-testid="preview-a-link"
            className="btn btn-secondary" style={{ justifyContent: 'center' }}>
            👁 Preview Variant A ({labelA}) →
          </a>
          <a href={created.preview_url_b} target="_blank" rel="noreferrer"
            data-testid="preview-b-link"
            className="btn btn-secondary" style={{ justifyContent: 'center' }}>
            👁 Preview Variant B ({labelB}) →
          </a>
        </div>

        <div style={{ background: 'var(--surface)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Live URL (once active):</p>
          <code style={{ color: 'var(--brand)' }}>/x/{created.slug}</code>
        </div>

        <button className="btn btn-primary" onClick={handleActivate} disabled={loading}
          data-testid="activate-btn"
          style={{ width: '100%', justifyContent: 'center' }}>
          {loading ? <span className="spinner" /> : '🚀'}
          {loading ? 'Activating…' : 'Go live — activate experiment'}
        </button>
        <button className="btn btn-secondary" onClick={() => router.push('/experiments')}
          style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
          Save as draft
        </button>
      </div>
    )
  }

  return (
    <div className="card">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>New A/B price experiment</h1>

      {/* Product */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label className="form-label">Product <span style={{ color: 'var(--danger)' }}>*</span></label>
        <select value={productId} onChange={e => {
          setProductId(e.target.value)
          const p = products.find(x => x.id === e.target.value)
          if (p) { setPriceA((p.current_price_cents / 100).toFixed(2)); setHeadline(p.name); setCtaText(`Get ${p.name}`) }
        }} style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
          <option value="">— select product —</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.name} (${(p.current_price_cents / 100).toFixed(2)})</option>
          ))}
        </select>
      </div>

      {/* Prices */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <label className="form-label">Variant A — Control price ($)</label>
          <input type="number" step="0.01" min="0" value={priceA} onChange={e => setPriceA(e.target.value)}
            placeholder="12.00" style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem' }} />
          <input value={labelA} onChange={e => setLabelA(e.target.value)} placeholder="Label (e.g. Current price)"
            style={{ width: '100%', padding: '0.4rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem', marginTop: '0.5rem', fontSize: '0.8rem' }} />
        </div>
        <div>
          <label className="form-label">Variant B — Test price ($) <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input type="number" step="0.01" min="0" value={priceB} onChange={e => setPriceB(e.target.value)}
            placeholder="15.00" style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem' }} />
          <input value={labelB} onChange={e => setLabelB(e.target.value)} placeholder="Label (e.g. New price)"
            style={{ width: '100%', padding: '0.4rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem', marginTop: '0.5rem', fontSize: '0.8rem' }} />
        </div>
      </div>

      {/* Split */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label className="form-label">Traffic split — % sent to Variant B: <strong>{splitPct}%</strong></label>
        <input type="range" min="10" max="90" step="5" value={splitPct}
          onChange={e => setSplitPct(e.target.value)}
          style={{ width: '100%' }} />
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
          {100 - parseInt(splitPct)}% → Variant A · {splitPct}% → Variant B
        </p>
      </div>

      {/* Page content */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginBottom: '1.25rem' }}>
        <p style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.9rem' }}>Experiment page content</p>
        <div style={{ marginBottom: '0.75rem' }}>
          <label className="form-label">Headline</label>
          <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Your product headline"
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem' }} />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label className="form-label">Description (optional)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Short description shown below the headline"
            rows={2} style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem', resize: 'vertical' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label className="form-label">CTA button text</label>
            <input value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="Get it now"
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem' }} />
          </div>
          <div>
            <label className="form-label">CTA URL (Gumroad, Stripe, etc.)</label>
            <input value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} placeholder="https://gumroad.com/l/..."
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem' }} />
          </div>
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}

      {/* Rollback safety callout */}
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '0.875rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: '#166534' }}>
        <strong>🔒 Safe to launch — here&apos;s why:</strong>
        <ul style={{ margin: '0.5rem 0 0 1.25rem', paddingLeft: 0 }}>
          <li>Your current price stays active for <strong>all existing visitors</strong>.</li>
          <li>This experiment only affects <strong>new visitors</strong> — 50/50 split by default.</li>
          <li>You can <strong>revert to your original price in one click</strong> at any time from the Experiments dashboard.</li>
        </ul>
      </div>

      <button className="btn btn-primary" onClick={handleCreate} disabled={loading || !productId || !priceB}
        data-testid="create-experiment-btn"
        style={{ width: '100%', justifyContent: 'center' }}>
        {loading ? <span className="spinner" /> : '🧪'}
        {loading ? 'Creating…' : 'Create experiment → preview'}
      </button>
    </div>
  )
}

export default function NewExperimentPage() {
  return (
    <div className="page">
      <nav className="nav">
        <div className="container nav-inner">
          <Link href="/dashboard" className="nav-logo">🚀 PricingSim</Link>
          <div className="nav-links">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/experiments">Experiments</Link>
          </div>
        </div>
      </nav>
      <main className="container" style={{ paddingTop: '2rem', maxWidth: 680 }}>
        <Link href="/experiments" style={{ color: 'var(--muted)', fontSize: '0.875rem', display: 'block', marginBottom: '1.5rem' }}>← Back to experiments</Link>
        <Suspense fallback={<div>Loading…</div>}>
          <NewExperimentForm />
        </Suspense>
      </main>
    </div>
  )
}
