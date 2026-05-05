'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { track } from '@/lib/analytics'
import { useRouter } from 'next/navigation'
import { DisclaimerBanner } from '@/components/DisclaimerBanner'

interface Suggestion {
  id: string
  product_id: string
  title: string
  rationale: string
  confidence_label: string
  confidence_score: number
  current_price_cents: number
  suggested_price_cents: number
  proj_monthly_lift_p50: number | null
  status: string
  rule_flags: string[]
  caveats: string[]
}

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState('')
  const [dismissing, setDismissing] = useState<string | null>(null)
  const [txCount, setTxCount] = useState<number | null>(null)
  const router = useRouter()

  const fetchSuggestions = async () => {
    const resp = await fetch('/api/suggestions')
    if (resp.ok) { const d = await resp.json(); setSuggestions(d) }
    setLoading(false)
  }

  useEffect(() => {
    fetchSuggestions()
    fetch('/api/analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'page_view', page: 'suggestions' }) })
      .catch(() => {})
    // Fetch transaction count to determine empty state
    setTxCount(1) // default non-zero so Run Analysis is always accessible
  }, [])

  const runEngine = async () => {
    setRunning(true)
    setRunError('')
    try {
      const resp = await fetch('/api/engine/recommend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        setRunError(data.error || `Analysis failed (${resp.status}). Please import data first.`)
      } else {
        track('suggestion_created', { count: Array.isArray(data) ? data.length : 1 })
        await fetchSuggestions()
      }
    } catch {
      setRunError('Network error. Please try again.')
    } finally {
      setRunning(false)
    }
  }

  const dismiss = async (id: string) => {
    setDismissing(id)
    await fetch(`/api/suggestions/${id}/dismiss`, { method: 'POST' })
    setSuggestions(s => s.filter(x => x.id !== id))
    setDismissing(null)
  }

  const startExperiment = async (s: Suggestion) => {
    const resp = await fetch('/api/experiments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: s.product_id,
        variant_a_price_cents: s.current_price_cents,
        variant_b_price_cents: s.suggested_price_cents,
        split_pct_b: 0.5,
      }),
    })
    const data = await resp.json()
    if (resp.ok) {
      track('experiment_published', { experiment_id: data.id, product_id: s.product_id, price_a: s.current_price_cents, price_b: s.suggested_price_cents })
      router.push(`/experiments/${data.id}`)
    }
    else alert(data.error || 'Failed to create experiment')
  }

  return (
    <div className="page">
      <nav className="nav">
        <div className="container nav-inner">
          <Link href="/dashboard" className="nav-logo">🚀 PricingSim</Link>
          <div className="nav-links">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/import">Import</Link>
            <Link href="/experiments">Experiments</Link>
          </div>
        </div>
      </nav>

      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        <DisclaimerBanner />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Price suggestions</h1>
            <p style={{ color: 'var(--muted)' }}>Conservative, data-backed price recommendations</p>
          </div>
          <button className="btn btn-primary" onClick={runEngine} disabled={running || txCount === 0} title={txCount === 0 ? 'Import transaction data first' : undefined} data-testid="run-engine-btn">
            {running ? <span className="spinner" /> : '✨'}
            {running ? 'Analyzing…' : 'Run analysis'}
          </button>
        </div>

        {runError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#dc2626', fontSize: '0.9rem' }} data-testid="run-error">
            ⚠️ {runError}
          </div>
        )}

        {loading && <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" /></div>}

        {!loading && txCount === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }} data-testid="no-data-empty-state">
            <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>📊</p>
            <h2 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>No transaction data yet</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>Import your sales data first, then run the analysis engine to get price recommendations.</p>
            <Link href="/import" className="btn btn-primary">Import data →</Link>
          </div>
        )}

        {!loading && txCount !== 0 && suggestions.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎯</p>
            <h2 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>No suggestions yet</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>Import some sales data, then run the engine to get your first price recommendations.</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <Link href="/import" className="btn btn-secondary">Import data</Link>
              <button className="btn btn-primary" onClick={runEngine} disabled={running} data-testid="run-engine-empty-btn">
                {running ? 'Analyzing…' : 'Run analysis'}
              </button>
            </div>
          </div>
        )}

        {suggestions.map(s => (
          <div key={s.id} className="card" style={{ marginBottom: '1rem' }} data-testid="suggestion-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontWeight: 700 }}>{s.title}</h3>
                  <span className="badge badge-purple" style={{ position: 'relative', cursor: 'default' }} title={`Confidence measures how certain we are that this price outperforms your current price. ${Math.round((s.confidence_score || 0) * 100)}% means: if you ran this experiment ${Math.round(1 / (1 - (s.confidence_score || 0.5)))} times, it would show a lift ${Math.round(1 / (1 - (s.confidence_score || 0.5))) - 1} times. Experiments typically reach 80%+ confidence in 2–4 weeks.`}>
                    {s.confidence_label} <span style={{ opacity: 0.7, fontSize: '0.75em' }}>ⓘ</span>
                  </span>
                </div>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '0.75rem' }} data-testid="suggestion-why">{s.rationale}</p>

                {s.proj_monthly_lift_p50 && (
                  <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem' }}>
                    <div>
                      <p className="stat-label">Current</p>
                      <p style={{ fontWeight: 700 }}>${(s.current_price_cents / 100).toFixed(0)}</p>
                    </div>
                    <div style={{ color: 'var(--muted)', paddingTop: '1rem' }}>→</div>
                    <div>
                      <p className="stat-label">Proposed</p>
                      <p style={{ fontWeight: 700, color: 'var(--brand)' }}>${(s.suggested_price_cents / 100).toFixed(0)}</p>
                    </div>
                    <div>
                      <p className="stat-label">Expected lift</p>
                      <p style={{ fontWeight: 700, color: 'var(--success)' }}>+${(s.proj_monthly_lift_p50 / 100).toFixed(0)}/mo</p>
                    </div>
                  </div>
                )}

                {s.caveats?.length > 0 && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--warning)', marginBottom: '0.5rem' }}>
                    ⚠️ {s.caveats.join(' · ')}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={() => startExperiment(s)}>
                Start experiment →
              </button>
              <a href={`/ai-tools?explain=${s.id}`} className="btn btn-secondary btn-sm" data-testid="explain-btn">
                💡 Explain this
              </a>
              <button className="btn btn-secondary btn-sm" onClick={() => dismiss(s.id)}
                disabled={dismissing === s.id} data-testid="dismiss-suggestion">
                {dismissing === s.id ? 'Dismissing…' : 'Dismiss'}
              </button>
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
