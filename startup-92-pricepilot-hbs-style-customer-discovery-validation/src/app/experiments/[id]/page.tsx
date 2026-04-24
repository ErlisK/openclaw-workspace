'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { track } from '@/lib/analytics'
import { useRouter } from 'next/navigation'

interface Experiment {
  id: string; slug: string; status: string
  variant_a_price_cents: number; variant_b_price_cents: number
  variant_a_label: string | null; variant_b_label: string | null
  views_a: number; views_b: number; conversions_a: number; conversions_b: number
  revenue_a_cents: number; revenue_b_cents: number; confidence: number | null
  products: { name: string } | null; started_at: string
  error?: string
}

export default function ExperimentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [exp, setExp] = useState<Experiment | null>(null)
  const [loading, setLoading] = useState(true)
  const [rolling, setRolling] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [rolled, setRolled] = useState(false)
  const [expId, setExpId] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    params.then(p => {
      setExpId(p.id)
      fetch(`/api/experiments/${p.id}`)
        .then(r => r.json())
        .then(d => { setExp(d); setLoading(false) })
        .catch(() => setLoading(false))
    })
  }, [params])

  const doRollback = async () => {
    setRolling(true)
    track('rollback_clicked', { experiment_id: expId })
    const resp = await fetch(`/api/experiments/${expId}/rollback`, { method: 'POST' })
    setRolling(false)
    if (resp.ok) {
      setRolled(true)
      setShowConfirm(false)
      if (exp) setExp({ ...exp, status: 'rolled_back' })
    }
  }

  const confPct = exp?.confidence ? Math.round(exp.confidence * 100) : null
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <span className="spinner" />
    </div>
  )

  if (!exp || exp.error) return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p>Experiment not found</p>
      <Link href="/experiments" className="btn btn-secondary" style={{ marginTop: '1rem' }}>Back to experiments</Link>
    </div>
  )

  return (
    <div className="page">
      <nav className="nav">
        <div className="container nav-inner">
          <Link href="/dashboard" className="nav-logo">🚀 PricePilot</Link>
          <div className="nav-links">
            <Link href="/experiments">← Experiments</Link>
          </div>
        </div>
      </nav>

      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem', maxWidth: 800 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{exp.products?.name || 'Experiment'}</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
              <span className={`badge ${exp.status === 'active' ? 'badge-green' : exp.status === 'rolled_back' ? 'badge-red' : 'badge-purple'}`}>
                {exp.status}
              </span>
              {' '} Started {new Date(exp.started_at).toLocaleDateString()}
            </p>
          </div>
          {exp.status === 'active' && (
            <button className="btn btn-danger btn-sm" onClick={() => setShowConfirm(true)} data-testid="rollback-btn">
              🔁 Rollback
            </button>
          )}
          {exp.status === 'draft' && (
            <button className="btn btn-primary btn-sm" data-testid="activate-btn"
              onClick={async () => {
                const r = await fetch(`/api/experiments/${expId}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({status:'active'}) })
                if (r.ok) { window.location.reload() }
              }}>
              🚀 Activate
            </button>
          )}
        </div>

        {rolled && (
          <div className="card" style={{ background: '#d1fae5', border: '1px solid #a7f3d0', marginBottom: '1.5rem' }}>
            <p style={{ color: '#065f46', fontWeight: 600 }}>✅ Rolled back to ${(exp.variant_a_price_cents / 100).toFixed(0)}. No customers affected.</p>
          </div>
        )}

        <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
          <div className="card">
            <p className="stat-label" style={{ marginBottom: '0.5rem' }}>Variant A — Control</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 800 }}>${(exp.variant_a_price_cents / 100).toFixed(0)}</p>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '1.5rem' }}>
              <div><p className="stat-label">Conversions</p><p style={{ fontWeight: 700 }}>{exp.conversions_a}</p></div>
              <div><p className="stat-label">Revenue</p><p style={{ fontWeight: 700 }}>${(exp.revenue_a_cents / 100).toFixed(0)}</p></div>
              <div><p className="stat-label">Conv. rate</p><p style={{ fontWeight: 700 }}>{exp.views_a > 0 ? ((exp.conversions_a / exp.views_a) * 100).toFixed(1) : '—'}%</p></div>
            </div>
          </div>
          <div className="card" style={{ border: confPct && confPct >= 80 ? '2px solid var(--brand)' : undefined }}>
            <p className="stat-label" style={{ marginBottom: '0.5rem' }}>Variant B — Challenger {confPct && confPct >= 80 ? '🏆' : ''}</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--brand)' }}>${(exp.variant_b_price_cents / 100).toFixed(0)}</p>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '1.5rem' }}>
              <div><p className="stat-label">Conversions</p><p style={{ fontWeight: 700 }}>{exp.conversions_b}</p></div>
              <div><p className="stat-label">Revenue</p><p style={{ fontWeight: 700 }}>${(exp.revenue_b_cents / 100).toFixed(0)}</p></div>
              <div><p className="stat-label">Conv. rate</p><p style={{ fontWeight: 700 }}>{exp.views_b > 0 ? ((exp.conversions_b / exp.views_b) * 100).toFixed(1) : '—'}%</p></div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 600 }}>Confidence</span>
            <span style={{ fontWeight: 700 }}>{confPct !== null ? `${confPct}% likely to increase revenue` : 'Collecting data…'}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${confPct || 0}%` }} />
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
            Target: 90% confidence · {(exp.conversions_a + exp.conversions_b)} total conversions
          </p>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>📎 Share your experiment link</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
            Share this link on your next tweet, email, or product post. Traffic is split automatically.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
            <code style={{ flex: 1, background: 'var(--surface)', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem' }} data-testid="exp-live-url">
              {appUrl}/x/{exp.slug}
            </code>
            <button className="btn btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(`${appUrl}/x/${exp.slug}`)}>
              Copy
            </button>
            <a href={`/x/${exp.slug}?preview=A`} className="btn btn-secondary btn-sm" target="_blank" data-testid="preview-a-link">Preview A</a>
            <a href={`/x/${exp.slug}?preview=B`} className="btn btn-secondary btn-sm" target="_blank" data-testid="preview-b-link">Preview B</a>
          </div>
        </div>

        {showConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} role="dialog">
            <div className="card" style={{ maxWidth: 420, width: '90%' }} data-testid="confirm-modal">
              <h2 style={{ fontWeight: 800, marginBottom: '0.75rem' }}>Rollback experiment?</h2>
              <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
                This will stop the experiment and revert your product price to ${(exp.variant_a_price_cents / 100).toFixed(0)}.
                No customers will be affected.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-danger" onClick={doRollback} disabled={rolling} data-testid="confirm-rollback-btn" style={{ flex: 1, justifyContent: 'center' }}>
                  {rolling ? <span className="spinner" /> : null}
                  {rolling ? 'Rolling back…' : 'Yes, rollback'}
                </button>
                <button className="btn btn-secondary" onClick={() => setShowConfirm(false)} style={{ flex: 1, justifyContent: 'center' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
