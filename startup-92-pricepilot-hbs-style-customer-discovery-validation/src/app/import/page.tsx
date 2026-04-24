'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.csv')) { setError('Please upload a CSV file'); return }
    setFile(f); setError(''); setResult(null)
  }

  const handleSubmit = async () => {
    if (!file) return
    setLoading(true); setError('')
    const fd = new FormData()
    fd.append('file', file)
    const resp = await fetch('/api/import', { method: 'POST', body: fd })
    const data = await resp.json()
    setLoading(false)
    if (!resp.ok) { setError(data.error || 'Import failed'); return }
    setResult(data)
  }

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

      <main className="container" style={{ paddingTop: '2rem', maxWidth: 640 }}>
        <Link href="/dashboard" style={{ color: 'var(--muted)', fontSize: '0.875rem', display: 'block', marginBottom: '1.5rem' }}>← Back to dashboard</Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Import sales data</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>Upload a Gumroad, Stripe, or any sales CSV. We&apos;ll map the columns and import your transactions.</p>

        {!result ? (
          <div className="card">
            <div
              data-testid="csv-upload"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              style={{
                border: `2px dashed ${dragging ? 'var(--brand)' : 'var(--border)'}`,
                borderRadius: '0.75rem', padding: '3rem', textAlign: 'center', cursor: 'pointer',
                background: dragging ? 'rgba(108,71,255,0.04)' : '#fafafa',
                transition: 'all 0.2s',
              }}>
              <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📂</p>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{file ? file.name : 'Drop your CSV here or click to browse'}</p>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Gumroad, Stripe export, or any sales CSV</p>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </div>

            {file && (
              <div style={{ marginTop: '1.5rem' }} data-testid="column-mapping">
                <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Map columns</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  We&apos;ll auto-detect <strong>date</strong>, <strong>price</strong>, and <strong>product</strong> columns from your CSV.
                  Standard Gumroad and Stripe exports are detected automatically.
                </p>
                <div style={{ background: 'var(--surface)', borderRadius: '0.5rem', padding: '1rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
                  <p>✅ date → <code>date</code>, <code>created_at</code>, <code>timestamp</code></p>
                  <p>✅ price → <code>product_price</code>, <code>amount</code>, <code>price</code></p>
                  <p>✅ product → <code>product_title</code>, <code>name</code>, <code>description</code></p>
                </div>
              </div>
            )}

            {error && <p className="error-message" style={{ marginTop: '1rem' }}>{error}</p>}

            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!file || loading}
              data-testid="import-submit"
              style={{ width: '100%', justifyContent: 'center', marginTop: '1.5rem' }}>
              {loading ? <span className="spinner" /> : null}
              {loading ? 'Importing…' : 'Import transactions'}
            </button>
          </div>
        ) : (
          <div className="card" data-testid="import-success">
            <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>✅</p>
            <h2 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Import complete</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>{result.message as string}</p>
            <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
              <div style={{ textAlign: 'center' }}>
                <p className="stat-big">{result.imported as number}</p>
                <p className="stat-label">Transactions</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p className="stat-big">{result.products as number}</p>
                <p className="stat-label">Products</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p className="stat-big">{result.skipped as number}</p>
                <p className="stat-label">Skipped</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary" onClick={() => router.push('/suggestions')} style={{ flex: 1, justifyContent: 'center' }}>
                Get price suggestions →
              </button>
              <button className="btn btn-secondary" onClick={() => { setResult(null); setFile(null) }}>
                Import more
              </button>
            </div>
          </div>
        )}

        <div className="card" style={{ marginTop: '1.5rem', background: 'var(--surface)' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.95rem' }}>📋 Example Gumroad CSV format</h3>
          <pre style={{ fontSize: '0.75rem', overflowX: 'auto', color: 'var(--muted)' }}>{`date,product_title,product_permalink,product_price,purchase_email,purchase_refunded
2024-08-15,Notion Dashboard,notion-db,$12.00,buyer@example.com,no
2024-09-01,Notion Dashboard,notion-db,$12.00,buyer2@example.com,yes`}</pre>
        </div>
      </main>
    </div>
  )
}
