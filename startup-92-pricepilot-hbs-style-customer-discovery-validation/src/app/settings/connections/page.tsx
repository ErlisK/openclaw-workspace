'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface StripeConn {
  connected: boolean
  label?: string
  key_hint?: string
  account_id?: string
  account_name?: string
  is_test_mode?: boolean
  last_imported_at?: string
  import_count?: number
}

export default function ConnectionsPage() {
  const [stripeConn, setStripeConn] = useState<StripeConn | null>(null)
  const [stripeKey, setStripeKey] = useState('')
  const [keyLabel, setKeyLabel] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [importResult, setImportResult] = useState<{ imported?: number; message?: string } | null>(null)

  useEffect(() => {
    fetch('/api/connections/list')
      .then(r => r.json())
      .then(d => setStripeConn(d.stripe))
      .catch(() => setStripeConn({ connected: false }))
  }, [])

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripeKey.startsWith('sk_')) {
      setError('Key must start with sk_test_ or sk_live_')
      return
    }
    setConnecting(true); setError(''); setSuccess('')
    const r = await fetch('/api/connections/stripe/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stripe_key: stripeKey, label: keyLabel }),
    })
    const data = await r.json()
    setConnecting(false)
    if (!r.ok) { setError(data.error || 'Connection failed'); return }
    setSuccess(`Connected to ${data.account_name}!`)
    setStripeConn({ connected: true, ...data })
    setStripeKey('')
  }

  const handleImport = async () => {
    setImporting(true); setError(''); setImportResult(null)
    const r = await fetch('/api/connections/stripe/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 200 }),
    })
    const data = await r.json()
    setImporting(false)
    if (!r.ok) { setError(data.error || 'Import failed'); return }
    setImportResult(data)
    setStripeConn(prev => prev ? { ...prev, import_count: data.imported, last_imported_at: new Date().toISOString() } : prev)
  }

  const handleDisconnect = async () => {
    if (!confirm('Disconnect your Stripe account? Imported transactions are kept.')) return
    setDisconnecting(true)
    await fetch('/api/connections/stripe/disconnect', { method: 'DELETE' })
    setDisconnecting(false)
    setStripeConn({ connected: false })
    setSuccess('Disconnected.')
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#fafafa', minHeight: '100vh' }}>
      <nav style={{ borderBottom: '1px solid #e5e7eb', background: '#fff', padding: '0 1.5rem' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/dashboard" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem' }}>← Dashboard</Link>
          <span style={{ color: '#d1d5db' }}>|</span>
          <span style={{ fontWeight: 700 }}>Connections</span>
        </div>
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Data Connections</h1>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Connect your payment platform to import transaction history.</p>

        {/* Stripe connection card */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>⚡</span>
            <div>
              <h2 style={{ fontWeight: 700, marginBottom: '0.1rem' }}>Stripe</h2>
              <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Import charges, payment intents, and payment link sales</p>
            </div>
          </div>

          {stripeConn === null && <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Loading…</p>}

          {stripeConn?.connected ? (
            <div>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <p style={{ fontWeight: 700, color: '#065f46' }}>✓ Connected: {stripeConn.account_name}</p>
                    <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      Key: <code>{stripeConn.key_hint}</code> ·{' '}
                      {stripeConn.is_test_mode ? '🧪 Test mode' : '🔴 Live mode'}
                    </p>
                  </div>
                  {stripeConn.import_count !== undefined && stripeConn.import_count > 0 && (
                    <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                      {stripeConn.import_count} charges imported
                    </p>
                  )}
                </div>
              </div>

              {error && <p style={{ color: '#ef4444', marginBottom: '0.75rem', fontSize: '0.875rem' }}>{error}</p>}
              {importResult && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  ✅ {importResult.message || `Imported ${importResult.imported} transactions`}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  onClick={handleImport} disabled={importing}
                  data-testid="stripe-import-btn"
                  style={{ background: '#6c47ff', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.25rem', fontWeight: 700, cursor: importing ? 'not-allowed' : 'pointer' }}>
                  {importing ? 'Importing…' : '↓ Import charges'}
                </button>
                <button
                  onClick={handleDisconnect} disabled={disconnecting}
                  data-testid="stripe-disconnect-btn"
                  style={{ background: '#fff', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '0.5rem', padding: '0.6rem 1.25rem', fontWeight: 600, cursor: disconnecting ? 'not-allowed' : 'pointer' }}>
                  {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                </button>
              </div>
            </div>
          ) : stripeConn?.connected === false ? (
            <form onSubmit={handleConnect}>
              <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '1rem' }}>
                Paste your Stripe <strong>Secret key</strong> (starts with <code>sk_test_</code> or <code>sk_live_</code>).
                Find it at <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" style={{ color: '#6c47ff' }}>dashboard.stripe.com/apikeys</a>.
              </p>

              {error && <p style={{ color: '#ef4444', marginBottom: '0.75rem', fontSize: '0.875rem' }}>{error}</p>}
              {success && <p style={{ color: '#10b981', marginBottom: '0.75rem', fontSize: '0.875rem' }}>{success}</p>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                <input
                  type="password"
                  placeholder="sk_test_51..."
                  value={stripeKey}
                  onChange={e => setStripeKey(e.target.value)}
                  required
                  data-testid="stripe-key-input"
                  style={{ padding: '0.6rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontFamily: 'monospace', fontSize: '0.875rem' }}
                />
                <input
                  type="text"
                  placeholder="Label (optional, e.g. My Course Store)"
                  value={keyLabel}
                  onChange={e => setKeyLabel(e.target.value)}
                  data-testid="stripe-label-input"
                  style={{ padding: '0.6rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                />
              </div>

              <button
                type="submit" disabled={connecting || !stripeKey}
                data-testid="stripe-connect-btn"
                style={{ background: connecting ? '#a78bfa' : '#6c47ff', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.5rem', fontWeight: 700, cursor: connecting ? 'not-allowed' : 'pointer' }}>
                {connecting ? 'Connecting…' : 'Connect Stripe →'}
              </button>

              <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                Your key is stored encrypted. We never use it for anything except importing your transaction history.
              </p>
            </form>
          ) : null}
        </div>

        {/* CSV templates section */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '1rem', padding: '1.5rem' }}>
          <h2 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>📄 CSV Import Templates</h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Don&apos;t have a direct connection? Download a CSV template, fill it with your data, and upload it on the{' '}
            <Link href="/import" style={{ color: '#6c47ff' }}>Import page</Link>.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {[
              { name: 'Stripe charges', file: 'stripe-charges-template.csv' },
              { name: 'Gumroad sales', file: 'gumroad-sales-template.csv' },
              { name: 'Shopify orders', file: 'shopify-orders-template.csv' },
            ].map(t => (
              <a
                key={t.file}
                href={`/templates/${t.file}`}
                download
                data-testid={`download-${t.file}`}
                style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '0.5rem 0.875rem', textDecoration: 'none', color: '#374151', fontSize: '0.875rem', fontWeight: 600 }}>
                ↓ {t.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
