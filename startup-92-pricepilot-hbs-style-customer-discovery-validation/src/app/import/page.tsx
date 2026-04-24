'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Step = 'upload' | 'mapping' | 'importing' | 'done'

interface MappingState {
  headers: string[]
  mapping: Record<string, number | null>
  confidence: Record<string, number>
  preview: string[][]
  errors: string[]
  warnings: string[]
  row_count: number
}

const FIELD_LABELS: Record<string, { label: string; required: boolean; desc: string }> = {
  date:     { label: 'Date / Timestamp', required: true,  desc: 'When the sale happened' },
  product:  { label: 'Product Name',     required: true,  desc: 'What was sold' },
  price:    { label: 'Price',            required: true,  desc: 'Sale price per unit ($)' },
  quantity: { label: 'Quantity',         required: false, desc: 'Units sold (default: 1)' },
  revenue:  { label: 'Revenue / Total',  required: false, desc: 'Total sale amount (default: price × qty)' },
  coupon:   { label: 'Coupon / Promo Code', required: false, desc: 'Discount code if used' },
}

export default function ImportPage() {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mappingState, setMappingState] = useState<MappingState | null>(null)
  const [userMapping, setUserMapping] = useState<Record<string, number | null>>({})
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.csv') && !f.type.includes('csv') && !f.type.includes('text')) {
      setError('Please upload a .csv file'); return
    }
    setFile(f); setError('')
  }

  const handlePreview = async () => {
    if (!file) return
    setLoading(true); setError('')
    const fd = new FormData()
    fd.append('file', file)
    const resp = await fetch('/api/import/preview', { method: 'POST', body: fd })
    const data = await resp.json()
    setLoading(false)
    if (!resp.ok) { setError(data.error || 'Preview failed'); return }
    setMappingState(data)
    setUserMapping(data.mapping)
    setStep('mapping')
  }

  const handleImport = async () => {
    if (!file) return
    setStep('importing')
    setLoading(true); setError('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('mapping', JSON.stringify(userMapping))
    const resp = await fetch('/api/import', { method: 'POST', body: fd })
    const data = await resp.json()
    setLoading(false)
    if (!resp.ok) { setError(data.error || 'Import failed'); setStep('mapping'); return }
    setResult(data)
    setStep('done')
  }

  const loadSample = async () => {
    setLoading(true); setError('')
    const resp = await fetch('/api/import/sample', { method: 'POST' })
    const data = await resp.json()
    setLoading(false)
    if (!resp.ok) { setError(data.error || 'Failed to load sample'); return }
    setResult(data)
    setStep('done')
  }

  const confidenceColor = (c: number) =>
    c >= 0.8 ? '#10b981' : c >= 0.5 ? '#f59e0b' : '#ef4444'

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

      <main className="container" style={{ paddingTop: '2rem', maxWidth: 700 }}>
        <Link href="/dashboard" style={{ color: 'var(--muted)', fontSize: '0.875rem', display: 'block', marginBottom: '1.5rem' }}>← Back</Link>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', alignItems: 'center' }}>
          {(['upload', 'mapping', 'done'] as const).map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700,
                background: step === s ? 'var(--brand)' : (
                  (step === 'mapping' && s === 'upload') || (step === 'done') ? '#d1fae5' : 'var(--border)'
                ),
                color: step === s ? '#fff' : (
                  (step === 'mapping' && s === 'upload') || step === 'done' ? '#065f46' : 'var(--muted)'
                ),
              }}>
                {(step === 'mapping' && s === 'upload') || step === 'done' && i < 2 ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: step === s ? 700 : 400, color: step === s ? 'var(--text)' : 'var(--muted)' }}>
                {s === 'upload' ? 'Upload' : s === 'mapping' ? 'Map columns' : 'Done'}
              </span>
              {i < 2 && <span style={{ color: 'var(--border)', margin: '0 0.25rem' }}>→</span>}
            </div>
          ))}
        </div>

        {/* STEP 1: Upload */}
        {step === 'upload' && (
          <div className="card">
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Import sales data</h1>
            <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>Upload any sales CSV. We auto-detect columns for date, product, price, quantity, revenue, and coupon code.</p>

            <div
              data-testid="csv-upload"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              style={{
                border: `2px dashed ${dragging ? 'var(--brand)' : 'var(--border)'}`,
                borderRadius: '0.75rem', padding: '2.5rem', textAlign: 'center', cursor: 'pointer',
                background: dragging ? 'rgba(108,71,255,0.04)' : '#fafafa', transition: 'all 0.2s',
              }}>
              <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{file ? '📄' : '📂'}</p>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                {file ? file.name : 'Drop your CSV here or click to browse'}
              </p>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                Gumroad, Stripe, Shopify, or any sales CSV
              </p>
              <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </div>

            {error && <p className="error-message" style={{ marginTop: '1rem' }}>{error}</p>}

            <button className="btn btn-primary" onClick={handlePreview} disabled={!file || loading}
              data-testid="import-submit"
              style={{ width: '100%', justifyContent: 'center', marginTop: '1.5rem' }}>
              {loading ? <span className="spinner" /> : null}
              {loading ? 'Analyzing…' : 'Next: Map columns →'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.25rem 0' }}>
              <hr style={{ flex: 1, borderColor: 'var(--border)' }} />
              <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>or</span>
              <hr style={{ flex: 1, borderColor: 'var(--border)' }} />
            </div>

            <button className="btn btn-secondary" onClick={loadSample} disabled={loading}
              data-testid="load-sample-btn"
              style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? <span className="spinner" /> : '🎭'}
              {loading ? 'Loading…' : 'Load sample dataset (60 transactions, instant demo)'}
            </button>

            <div className="card" style={{ marginTop: '1.5rem', background: 'var(--surface)' }}>
              <p style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.9rem' }}>📋 Supported column names</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                {Object.entries(FIELD_LABELS).map(([key, { label, required }]) => (
                  <div key={key}>
                    <strong>{label}</strong>{required ? <span style={{ color: 'var(--danger)' }}> *</span> : <span style={{ color: 'var(--muted)' }}> (opt)</span>}
                    <br />
                    <span style={{ color: 'var(--muted)' }}>{COLUMN_PATTERNS_DISPLAY[key]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Column Mapping */}
        {step === 'mapping' && mappingState && (
          <div className="card">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Map columns</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
              Found <strong>{mappingState.row_count}</strong> rows · <strong>{mappingState.headers.length}</strong> columns.
              {mappingState.errors.length === 0 ? ' ✅ All required columns detected.' : ' ⚠️ Review mappings below.'}
            </p>

            {/* Preview table */}
            <div style={{ overflowX: 'auto', marginBottom: '1.5rem', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
              <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface)' }}>
                    {mappingState.headers.map((h, i) => (
                      <th key={i} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mappingState.preview.map((row, ri) => (
                    <tr key={ri} style={{ borderBottom: '1px solid var(--border)' }}>
                      {row.map((cell, ci) => (
                        <td key={ci} style={{ padding: '0.5rem 0.75rem', color: 'var(--muted)' }}>{cell || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Column mapping controls */}
            <div data-testid="column-mapping">
              {Object.entries(FIELD_LABELS).map(([field, { label, required, desc }]) => {
                const mappedIdx = userMapping[field]
                const conf = mappingState.confidence[field] || 0
                return (
                  <div key={field} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem' }}>
                    <div style={{ flex: '0 0 180px' }}>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {label}
                        {required ? <span style={{ color: 'var(--danger)' }}> *</span> : null}
                      </p>
                      <p style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{desc}</p>
                    </div>
                    <select
                      value={mappedIdx !== null && mappedIdx !== undefined ? String(mappedIdx) : ''}
                      onChange={e => setUserMapping(m => ({ ...m, [field]: e.target.value ? parseInt(e.target.value) : null }))}
                      style={{
                        flex: 1, padding: '0.5rem 0.75rem', border: `1px solid ${required && mappedIdx === null ? 'var(--danger)' : 'var(--border)'}`,
                        borderRadius: '0.5rem', fontSize: '0.875rem', background: '#fff',
                      }}>
                      <option value="">{required ? '— select column —' : '— not used —'}</option>
                      {mappingState.headers.map((h, i) => (
                        <option key={i} value={String(i)}>{h}</option>
                      ))}
                    </select>
                    {mappedIdx !== null && mappedIdx !== undefined && conf > 0 && (
                      <span style={{ fontSize: '0.75rem', color: confidenceColor(conf), whiteSpace: 'nowrap', fontWeight: 600 }}>
                        {Math.round(conf * 100)}% match
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {mappingState.warnings.length > 0 && (
              <div style={{ background: '#fef3c7', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {mappingState.warnings.map((w, i) => <p key={i}>⚠️ {w}</p>)}
              </div>
            )}

            {error && <p className="error-message">{error}</p>}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={handleImport}
                disabled={loading || ['date', 'product', 'price'].some(f => userMapping[f] === null || userMapping[f] === undefined)}
                data-testid="import-submit"
                style={{ flex: 1, justifyContent: 'center' }}>
                {loading ? <span className="spinner" /> : null}
                {loading ? 'Importing…' : `Import ${mappingState.row_count} rows →`}
              </button>
              <button className="btn btn-secondary" onClick={() => setStep('upload')} style={{ justifyContent: 'center' }}>
                ← Back
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Importing spinner */}
        {step === 'importing' && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <span className="spinner" style={{ width: '2rem', height: '2rem', borderWidth: 3, margin: '0 auto 1.5rem' }} />
            <h2 style={{ fontWeight: 700 }}>Importing transactions…</h2>
            <p style={{ color: 'var(--muted)', marginTop: '0.5rem' }}>Deduplicating and validating rows</p>
          </div>
        )}

        {/* STEP 4: Done */}
        {step === 'done' && result && (
          <div className="card" data-testid="import-success">
            <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</p>
            <h2 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Import complete!</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>{result.message as string}</p>

            <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
              <div style={{ textAlign: 'center' }}>
                <p className="stat-big">{result.imported as number}</p>
                <p className="stat-label">Imported</p>
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

            {(result.warnings as string[] | undefined)?.length ? (
              <div style={{ background: '#fef3c7', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {(result.warnings as string[]).map((w, i) => <p key={i}>⚠️ {w}</p>)}
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary" onClick={() => router.push('/suggestions')} style={{ flex: 1, justifyContent: 'center' }}>
                Get price suggestions →
              </button>
              <button className="btn btn-secondary" onClick={() => { setStep('upload'); setFile(null); setResult(null) }}>
                Import more
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// Display patterns for the help table
const COLUMN_PATTERNS_DISPLAY: Record<string, string> = {
  date: 'date, timestamp, created_at, purchase_date',
  product: 'product_title, product_name, name, title',
  price: 'price, unit_price, amount, product_price',
  quantity: 'qty, quantity, units, count',
  revenue: 'revenue, total, subtotal, gross',
  coupon: 'coupon, coupon_code, promo_code, referral',
}
