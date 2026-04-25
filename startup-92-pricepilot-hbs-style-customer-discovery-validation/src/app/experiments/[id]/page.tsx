'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { track } from '@/lib/analytics'
import { useRouter } from 'next/navigation'

interface Experiment {
  id: string; slug: string; status: string
  variant_a_price_cents: number; variant_b_price_cents: number
  variant_a_label: string | null; variant_b_label: string | null
  views_a: number; views_b: number; conversions_a: number; conversions_b: number
  revenue_a_cents: number; revenue_b_cents: number; confidence: number | null
  products: { name: string; current_price_cents: number } | null
  started_at: string; concluded_at?: string; decision?: string
  error?: string
}

interface AuditEntry {
  id: string
  action: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  occurred_at: string
}

interface RollbackEmail {
  subject: string
  body: string
  tone: string
  sent: boolean
  send_error: string | null
}

type EmailTone = 'casual' | 'professional' | 'apologetic'

const ACTION_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  rollback:                  { label: 'Rolled back',          icon: '🔁', color: '#991b1b' },
  rollback_email_generated:  { label: 'Email generated',      icon: '✉️', color: '#1e40af' },
  rollback_email_sent:       { label: 'Email sent',           icon: '📤', color: '#166534' },
  data_generated:            { label: 'Data generated',       icon: '🧪', color: '#4f46e5' },
  price_restored:            { label: 'Price restored',       icon: '💰', color: '#065f46' },
}

export default function ExperimentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [exp, setExp] = useState<Experiment | null>(null)
  const [loading, setLoading] = useState(true)
  const [rolling, setRolling] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [rolled, setRolled] = useState(false)
  const [expId, setExpId] = useState<string>('')
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(false)

  // Email state
  const [showEmailPanel, setShowEmailPanel] = useState(false)
  const [emailTone, setEmailTone] = useState<EmailTone>('casual')
  const [includeOffer, setIncludeOffer] = useState(false)
  const [offerDetail, setOfferDetail] = useState('10% off your next purchase with code THANKYOU')
  const [emailLoading, setEmailLoading] = useState(false)
  const [email, setEmail] = useState<RollbackEmail | null>(null)
  const [emailCopied, setEmailCopied] = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const router = useRouter()

  const loadAudit = useCallback(async (id: string) => {
    setAuditLoading(true)
    try {
      const r = await fetch(`/api/experiments/${id}/audit-log`)
      if (r.ok) {
        const d = await r.json()
        setAuditEntries(d.entries ?? [])
      }
    } finally {
      setAuditLoading(false)
    }
  }, [])

  useEffect(() => {
    params.then(p => {
      setExpId(p.id)
      fetch(`/api/experiments/${p.id}`)
        .then(r => r.json())
        .then(d => {
          setExp(d)
          setLoading(false)
          loadAudit(p.id)
        })
        .catch(() => setLoading(false))
    })
  }, [params, loadAudit])

  const doRollback = async () => {
    setRolling(true)
    track('rollback_clicked', { experiment_id: expId })
    const resp = await fetch(`/api/experiments/${expId}/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Manual one-click rollback from experiment detail page' }),
    })
    setRolling(false)
    if (resp.ok) {
      setRolled(true)
      setShowConfirm(false)
      if (exp) setExp({ ...exp, status: 'paused' })
      setShowEmailPanel(true)
      loadAudit(expId)
    }
  }

  const generateEmail = async () => {
    setEmailLoading(true)
    setEmail(null)
    try {
      const resp = await fetch(`/api/experiments/${expId}/rollback-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tone: emailTone,
          include_offer: includeOffer,
          offer_detail: offerDetail,
          product_url: typeof window !== 'undefined' ? `${window.location.origin}/x/${exp?.slug}` : '',
        }),
      })
      if (resp.ok) {
        const d = await resp.json()
        setEmail(d)
        loadAudit(expId)
      }
    } finally {
      setEmailLoading(false)
    }
  }

  const copyEmail = () => {
    if (!email) return
    const text = `Subject: ${email.subject}\n\n${email.body}`
    navigator.clipboard.writeText(text).then(() => {
      setEmailCopied(true)
      setTimeout(() => setEmailCopied(false), 2000)
    })
  }

  const sendToInbox = async () => {
    if (!email) return
    setEmailSending(true)
    try {
      const resp = await fetch(`/api/experiments/${expId}/rollback-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tone: emailTone,
          include_offer: includeOffer,
          offer_detail: offerDetail,
          send: true,
        }),
      })
      if (resp.ok) {
        const d = await resp.json()
        if (d.sent) {
          setEmailSent(true)
          loadAudit(expId)
        }
      }
    } finally {
      setEmailSending(false)
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

  const isLive = exp.status === 'active'
  const isRolledBack = exp.status === 'paused' || exp.status === 'rolled_back'

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

      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem', maxWidth: 820 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{exp.products?.name || 'Experiment'}</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
              <span className={`badge ${isLive ? 'badge-green' : isRolledBack ? 'badge-red' : 'badge-purple'}`}>
                {exp.status}
              </span>
              {' '}Started {new Date(exp.started_at).toLocaleDateString()}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {isLive && (
              <button className="btn btn-danger btn-sm" onClick={() => setShowConfirm(true)} data-testid="rollback-btn">
                🔁 Rollback
              </button>
            )}
            {isRolledBack && (
              <button
                className="btn btn-secondary btn-sm"
                data-testid="btn-open-email-panel"
                onClick={() => setShowEmailPanel(v => !v)}
              >
                ✉️ Customer email
              </button>
            )}
            {exp.status === 'draft' && (
              <button className="btn btn-primary btn-sm" data-testid="activate-btn"
                onClick={async () => {
                  const r = await fetch(`/api/experiments/${expId}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({status:'active'}) })
                  if (r.ok) window.location.reload()
                }}>
                🚀 Activate
              </button>
            )}
          </div>
        </div>

        {/* Rollback success banner */}
        {rolled && (
          <div className="card" style={{ background: '#d1fae5', border: '1px solid #a7f3d0', marginBottom: '1.5rem' }} data-testid="rollback-success-banner">
            <p style={{ color: '#065f46', fontWeight: 600, marginBottom: '0.25rem' }}>
              ✅ Rolled back to ${(exp.variant_a_price_cents / 100).toFixed(0)}. Price restored.
            </p>
            <p style={{ color: '#065f46', fontSize: '0.85rem' }}>
              Want to let your customers know? Generate a personalized email below.
            </p>
          </div>
        )}

        {/* Variant cards */}
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

        {/* Confidence bar */}
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

        {/* Share link card */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>📎 Share your experiment link</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
            Share this link. Traffic is split automatically.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <code style={{ flex: 1, background: 'var(--surface)', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} data-testid="exp-live-url">
              {appUrl}/x/{exp.slug}
            </code>
            <button className="btn btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(`${appUrl}/x/${exp.slug}`)}>Copy</button>
            <a href={`/x/${exp.slug}?preview=A`} className="btn btn-secondary btn-sm" target="_blank" data-testid="preview-a-link">Preview A</a>
            <a href={`/x/${exp.slug}?preview=B`} className="btn btn-secondary btn-sm" target="_blank" data-testid="preview-b-link">Preview B</a>
          </div>
        </div>

        {/* ── AI Customer Email Panel ─────────────────────────────────── */}
        {(showEmailPanel || isRolledBack) && (
          <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid #c7d2fe' }} data-testid="email-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontWeight: 700, margin: 0 }}>✉️ Customer Notification Email</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                  AI-generated email you can copy and send to customers who saw the higher price.
                </p>
              </div>
              <button
                data-testid="btn-collapse-email"
                onClick={() => setShowEmailPanel(v => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.2rem', padding: '0.25rem' }}
              >
                {showEmailPanel ? '▲' : '▼'}
              </button>
            </div>

            {showEmailPanel && (
              <>
                {/* Tone selector */}
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.4rem' }}>Email tone</p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {(['casual', 'professional', 'apologetic'] as EmailTone[]).map(t => (
                      <button
                        key={t}
                        data-testid={`tone-${t}`}
                        onClick={() => setEmailTone(t)}
                        style={{
                          padding: '0.35rem 0.75rem', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600,
                          border: `1px solid ${emailTone === t ? '#4f46e5' : '#d1d5db'}`,
                          background: emailTone === t ? '#ede9fe' : '#f9fafb',
                          color: emailTone === t ? '#4f46e5' : '#374151', cursor: 'pointer',
                        }}
                      >
                        {t === 'casual' ? '👋 Casual' : t === 'professional' ? '💼 Professional' : '🙏 Apologetic'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Goodwill offer toggle */}
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f9fafb', borderRadius: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      data-testid="toggle-include-offer"
                      checked={includeOffer}
                      onChange={e => setIncludeOffer(e.target.checked)}
                    />
                    Include a goodwill offer
                  </label>
                  {includeOffer && (
                    <input
                      data-testid="input-offer-detail"
                      type="text"
                      value={offerDetail}
                      onChange={e => setOfferDetail(e.target.value)}
                      style={{ marginTop: '0.5rem', width: '100%', padding: '0.5rem 0.65rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem', boxSizing: 'border-box' }}
                      placeholder="e.g. 10% off next purchase with code THANKYOU"
                    />
                  )}
                </div>

                <button
                  data-testid="btn-generate-email"
                  onClick={generateEmail}
                  disabled={emailLoading}
                  style={{
                    padding: '0.6rem 1.25rem', background: '#4f46e5', color: '#fff', border: 'none',
                    borderRadius: 8, fontWeight: 700, fontSize: '0.875rem',
                    cursor: emailLoading ? 'not-allowed' : 'pointer', opacity: emailLoading ? 0.7 : 1,
                    marginBottom: email ? '1rem' : 0,
                  }}
                >
                  {emailLoading ? '✨ Generating…' : '✨ Generate email'}
                </button>

                {/* Email preview */}
                {email && (
                  <div data-testid="email-preview" style={{ marginTop: '1rem' }}>
                    <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: '0.75rem' }}>
                      <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.35rem', fontWeight: 600, textTransform: 'uppercase' }}>Subject</p>
                      <p data-testid="email-subject" style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '1rem' }}>{email.subject}</p>
                      <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.35rem', fontWeight: 600, textTransform: 'uppercase' }}>Body</p>
                      <pre data-testid="email-body" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.875rem', color: '#374151', lineHeight: 1.6, margin: 0 }}>
                        {email.body}
                      </pre>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <button
                        data-testid="btn-copy-email"
                        onClick={copyEmail}
                        style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: 6, background: '#f9fafb', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}
                      >
                        {emailCopied ? '✅ Copied!' : '📋 Copy subject + body'}
                      </button>

                      <button
                        data-testid="btn-send-to-inbox"
                        onClick={sendToInbox}
                        disabled={emailSending || emailSent}
                        style={{
                          padding: '0.5rem 1rem', border: 'none', borderRadius: 6,
                          background: emailSent ? '#dcfce7' : '#4f46e5', color: emailSent ? '#166534' : '#fff',
                          cursor: emailSending || emailSent ? 'not-allowed' : 'pointer',
                          fontSize: '0.8rem', fontWeight: 600, opacity: emailSending ? 0.7 : 1,
                        }}
                      >
                        {emailSent ? '✅ Sent to your inbox' : emailSending ? 'Sending…' : '📤 Send to my inbox (preview)'}
                      </button>

                      <button
                        onClick={generateEmail}
                        disabled={emailLoading}
                        style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: 6, background: '#f9fafb', cursor: 'pointer', fontSize: '0.8rem', color: '#374151', fontWeight: 600 }}
                      >
                        🔄 Regenerate
                      </button>
                    </div>

                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.75rem', lineHeight: 1.5 }}>
                      💡 Copy this email and send it to customers who saw the ${(exp.variant_b_price_cents / 100).toFixed(0)} test price. 
                      Transparency builds trust — especially with early adopters.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Audit Trail ─────────────────────────────────────────────── */}
        <div className="card" style={{ marginBottom: '1.5rem' }} data-testid="audit-trail-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 700, margin: 0 }}>📋 Audit Trail</h3>
            <button
              onClick={() => loadAudit(expId)}
              disabled={auditLoading}
              style={{ background: 'none', border: '1px solid #e5e7eb', padding: '0.3rem 0.6rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem', color: '#6b7280' }}
            >
              {auditLoading ? '…' : '↻ Refresh'}
            </button>
          </div>

          {auditEntries.length === 0 && !auditLoading && (
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No audit events yet for this experiment.</p>
          )}

          <div data-testid="audit-entries" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {auditEntries.map((entry, i) => {
              const info = ACTION_LABELS[entry.action] ?? { label: entry.action, icon: '📝', color: '#6b7280' }
              return (
                <div key={entry.id ?? i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                  padding: '0.6rem 0.75rem', background: i % 2 === 0 ? '#f9fafb' : '#fff',
                  borderRadius: 8, fontSize: '0.8rem', border: '1px solid #f3f4f6',
                }}>
                  <span style={{ fontSize: '1rem', flexShrink: 0 }}>{info.icon}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 700, color: info.color }}>{info.label}</span>
                    {entry.new_value && typeof entry.new_value === 'object' && (
                      <span style={{ color: '#6b7280', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                        {Object.entries(entry.new_value)
                          .filter(([k]) => !['subject', 'body'].includes(k))
                          .slice(0, 3)
                          .map(([k, v]) => `${k}: ${String(v).slice(0, 30)}`)
                          .join(' · ')}
                      </span>
                    )}
                  </div>
                  <span style={{ color: '#9ca3af', whiteSpace: 'nowrap', fontSize: '0.72rem' }}>
                    {new Date(entry.occurred_at).toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Rollback confirm modal */}
        {showConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} role="dialog">
            <div className="card" style={{ maxWidth: 440, width: '90%' }} data-testid="confirm-modal">
              <h2 style={{ fontWeight: 800, marginBottom: '0.75rem' }}>🔁 Rollback experiment?</h2>
              <p style={{ color: 'var(--muted)', marginBottom: '0.75rem' }}>
                This will stop the experiment and revert your product price back to <strong>${(exp.variant_a_price_cents / 100).toFixed(0)}</strong>.
              </p>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                After rolling back, you&apos;ll get an AI-generated email to notify customers who saw the ${(exp.variant_b_price_cents / 100).toFixed(0)} test price.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className="btn btn-danger"
                  onClick={doRollback}
                  disabled={rolling}
                  data-testid="confirm-rollback-btn"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
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
