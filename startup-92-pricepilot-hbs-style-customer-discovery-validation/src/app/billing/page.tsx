'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface BillingStatus {
  plan: string
  stripe_customer_id?: string
}

export default function BillingPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetch('/api/billing/status')
      .then(r => r.json())
      .then(d => { setStatus(d); setLoading(false) })
      .catch(() => { setLoading(false) })
  }, [])

  const openPortal = async () => {
    setPortalLoading(true)
    setError('')
    const r = await fetch('/api/billing/portal', { method: 'POST' })
    const data = await r.json()
    setPortalLoading(false)
    if (!r.ok) { setError(data.error || 'Failed to open billing portal'); return }
    window.location.href = data.url
  }

  return (
    <div className="page">
      <nav className="nav">
        <div className="container nav-inner">
          <Link href="/dashboard" className="nav-logo">🚀 PricePilot</Link>
          <div className="nav-links">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/import">Import</Link>
            <Link href="/suggestions">Suggestions</Link>
            <Link href="/experiments">Experiments</Link>
            <Link href="/settings/connections">Connections</Link>
          </div>
        </div>
      </nav>

      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem', maxWidth: 600 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Billing</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>Manage your subscription and payment details.</p>

        {loading && <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></div>}

        {!loading && status && (
          <div className="card" style={{ marginBottom: '1.5rem' }} data-testid="billing-plan-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                  {status.plan === 'pro' ? '⚡ Pro Plan' : '🌱 Free Plan'}
                </p>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                  {status.plan === 'pro'
                    ? 'Full access to all features including unlimited experiments and AI suggestions.'
                    : 'Limited to 3 experiments. Upgrade to Pro for unlimited access.'}
                </p>
              </div>
              <span className={`badge ${status.plan === 'pro' ? 'badge-purple' : ''}`}
                style={status.plan !== 'pro' ? { background: '#f3f4f6', color: '#6b7280' } : {}}>
                {status.plan?.toUpperCase()}
              </span>
            </div>

            {status.plan !== 'pro' && (
              <div style={{ marginTop: '1.25rem' }}>
                <button className="btn btn-primary" onClick={() => router.push('/pricing')} data-testid="upgrade-btn">
                  Upgrade to Pro →
                </button>
              </div>
            )}

            {status.plan === 'pro' && status.stripe_customer_id && (
              <div style={{ marginTop: '1.25rem' }}>
                {error && <p style={{ color: 'var(--error)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>{error}</p>}
                <button className="btn btn-secondary" onClick={openPortal} disabled={portalLoading} data-testid="manage-billing-btn">
                  {portalLoading ? <span className="spinner" /> : null}
                  {portalLoading ? 'Loading…' : 'Manage billing →'}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="card" style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
          <p>Questions about billing? Email us at <a href="mailto:support@pricepilot.app" style={{ color: 'var(--brand)' }}>support@pricepilot.app</a></p>
          <p style={{ marginTop: '0.5rem' }}>
            See our <Link href="/refund-policy" style={{ color: 'var(--brand)' }}>Refund Policy</Link> for cancellation and refund information.
          </p>
        </div>
      </main>
    </div>
  )
}
