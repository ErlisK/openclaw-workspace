'use client'

import { useState, useCallback } from 'react'
import Papa from 'papaparse'
import { detectCsvPlatform, mapCsvRows, type ColumnMapping, type TransactionRow } from '@/lib/csv-mappers'

type ParsedRow = Record<string, string>
type Platform = ReturnType<typeof detectCsvPlatform>

const PLATFORM_META: Record<Platform, { label: string; icon: string; color: string; hint: string }> = {
  stripe_balance: { label: 'Stripe Balance History', icon: '💳', color: 'bg-purple-50 border-purple-200', hint: 'Dashboard → Reports → Balance transaction history' },
  stripe_charges: { label: 'Stripe Charges Export', icon: '💳', color: 'bg-purple-50 border-purple-200', hint: 'Dashboard → Payments → Export charges' },
  stripe_payouts: { label: 'Stripe Payouts', icon: '💳', color: 'bg-purple-50 border-purple-200', hint: 'Dashboard → Payouts → Export' },
  paypal: { label: 'PayPal Activity', icon: '🅿️', color: 'bg-blue-50 border-blue-200', hint: 'Activity → Statements → Download CSV' },
  upwork: { label: 'Upwork Transactions', icon: '🔧', color: 'bg-green-50 border-green-200', hint: 'Reports → Transaction History → Export' },
  generic: { label: 'Custom CSV', icon: '📄', color: 'bg-gray-50 border-gray-200', hint: 'Map columns manually' },
}

const FIELD_OPTIONS = ['', 'date', 'amount', 'net_amount', 'fee_amount', 'description', 'source_id', 'currency']

const SAMPLE_FILES = [
  { name: 'Stripe Balance History', file: 'stripe-balance-sample.csv', icon: '💳', platform: 'Stripe' },
  { name: 'PayPal Activity', file: 'paypal-activity-sample.csv', icon: '🅿️', platform: 'PayPal' },
  { name: 'Upwork Transactions', file: 'upwork-transactions-sample.csv', icon: '🔧', platform: 'Upwork' },
  { name: 'Generic Invoices', file: 'generic-invoices-sample.csv', icon: '📄', platform: 'Custom' },
]

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<ParsedRow[]>([])
  const [platform, setPlatform] = useState<Platform>('generic')
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<TransactionRow[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; total: number; skipped: number } | null>(null)
  const [error, setError] = useState('')
  const [showManualMapping, setShowManualMapping] = useState(false)

  function processFile(f: File) {
    setFile(f)
    setResult(null)
    setError('')
    Papa.parse<ParsedRow>(f, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const hs = results.meta.fields ?? []
        const rows = results.data.slice(0, 500)
        setHeaders(hs)
        setRawRows(rows)
        const detected = detectCsvPlatform(hs)
        setPlatform(detected)
        // Auto-preview
        const mapped = mapCsvRows(rows, hs)
        setPreview(mapped.rows.slice(0, 5))
        setShowManualMapping(detected === 'generic')
      },
      error: (err) => setError(`Parse error: ${err.message}`),
    })
  }

  const handleFile = useCallback((f: File) => processFile(f), [])

  async function handleLoadSample(filename: string) {
    const res = await fetch(`/samples/${filename}`)
    const text = await res.text()
    const blob = new Blob([text], { type: 'text/csv' })
    const file = new File([blob], filename, { type: 'text/csv' })
    processFile(file)
  }

  function applyManualMapping() {
    const cm: ColumnMapping = {
      date: mapping['date'] || headers[0],
      amount: mapping['amount'] || headers[1],
      net_amount: mapping['net_amount'],
      fee_amount: mapping['fee_amount'],
      description: mapping['description'],
      source_id: mapping['source_id'],
      currency: mapping['currency'],
    }
    const mapped = mapCsvRows(rawRows, headers, cm)
    setPreview(mapped.rows.slice(0, 5))
  }

  async function handleImport() {
    if (!rawRows.length) return
    setImporting(true)
    setError('')

    // Apply mapping
    let cm: ColumnMapping | undefined
    if (showManualMapping && mapping['date']) {
      cm = {
        date: mapping['date'],
        amount: mapping['amount'] || headers[1],
        net_amount: mapping['net_amount'],
        fee_amount: mapping['fee_amount'],
        description: mapping['description'],
        source_id: mapping['source_id'],
        currency: mapping['currency'],
      }
    }

    const mapResult = mapCsvRows(rawRows, headers, cm)
    const rows = mapResult.rows.map(r => ({
      date: r.date,
      amount: r.amount.toString(),
      net_amount: r.net_amount.toString(),
      fee_amount: r.fee_amount.toString(),
      description: r.description,
      source_id: r.source_id,
      currency: r.currency,
    }))

    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, platform: mapResult.platform }),
    })
    const data = await res.json()
    setImporting(false)
    if (res.ok) {
      setResult({ imported: data.imported, total: mapResult.rows.length, skipped: mapResult.skipped })
    } else {
      setError(data.error ?? 'Import failed')
    }
  }

  const meta = PLATFORM_META[platform]

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Import income data</h1>
      <p className="text-gray-500 text-sm mb-6">
        Automatically detects Stripe, PayPal, and Upwork CSV formats.
      </p>

      {/* Sample files */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
        <div className="text-sm font-medium text-blue-800 mb-2">
          🎲 Try with sample data (no account needed)
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_FILES.map(s => (
            <button
              key={s.file}
              onClick={() => handleLoadSample(s.file)}
              className="flex items-center gap-1.5 bg-white border border-blue-300 rounded-lg px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <span>{s.icon}</span>
              <span>{s.platform}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center mb-5 cursor-pointer hover:border-blue-400 transition-colors"
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onDragOver={e => e.preventDefault()}
        onClick={() => document.getElementById('csv-input')?.click()}
      >
        <div className="text-3xl mb-2">📥</div>
        {file ? (
          <div>
            <div className="font-medium text-gray-800">{file.name}</div>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded border font-medium ${meta.color}`}>
                {meta.icon} {meta.label}
              </span>
              <span className="text-sm text-gray-400">{rawRows.length} rows</span>
            </div>
          </div>
        ) : (
          <div>
            <div className="font-medium text-gray-700 mb-1">Drop CSV here or click to browse</div>
            <div className="text-sm text-gray-400">Stripe · PayPal · Upwork · Generic</div>
          </div>
        )}
        <input id="csv-input" type="file" accept=".csv,.tsv" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      </div>

      {/* Detection result + preview */}
      {headers.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded border font-medium ${meta.color}`}>
                {meta.icon} {meta.label}
              </span>
              <span className="text-sm text-gray-500">{platform !== 'generic' ? 'Auto-detected ✓' : 'Generic format'}</span>
            </div>
            <button
              onClick={() => setShowManualMapping(!showManualMapping)}
              className="text-xs text-blue-600 hover:underline"
            >
              {showManualMapping ? 'Hide' : 'Customize'} column mapping ↕
            </button>
          </div>

          {/* Manual mapping UI */}
          {showManualMapping && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
              <div className="text-sm font-medium text-gray-700 mb-3">Map columns to fields:</div>
              <div className="grid grid-cols-2 gap-2">
                {FIELD_OPTIONS.filter(f => f).map(field => (
                  <div key={field} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 w-24 text-right text-xs">{field}</span>
                    <span className="text-gray-300">←</span>
                    <select
                      value={mapping[field] ?? ''}
                      onChange={e => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                      className="border rounded px-2 py-1 text-xs flex-1"
                    >
                      <option value="">-- auto --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <button onClick={applyManualMapping} className="mt-3 text-xs bg-gray-200 hover:bg-gray-300 rounded px-3 py-1">
                Preview mapping
              </button>
            </div>
          )}

          {/* Preview table */}
          {preview.length > 0 && (
            <>
              <div className="text-sm font-medium text-gray-700 mb-2">Preview (first 5 transactions):</div>
              <div className="overflow-x-auto border rounded-lg mb-2">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">Date</th>
                      <th className="px-3 py-2 text-right text-gray-500 font-medium">Gross</th>
                      <th className="px-3 py-2 text-right text-gray-500 font-medium">Fee</th>
                      <th className="px-3 py-2 text-right text-gray-500 font-medium">Net</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2 text-gray-700">{row.date}</td>
                        <td className="px-3 py-2 text-right">${row.amount.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-red-500">${row.fee_amount.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-medium text-green-700">${row.net_amount.toFixed(2)}</td>
                        <td className="px-3 py-2 text-gray-600 truncate max-w-32">{row.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-xs text-gray-400">
                {rawRows.length} rows parsed · {rawRows.length - preview.length > 0 ? `${rawRows.length - preview.length + preview.length} more` : ''} will be imported
              </div>
            </>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5">
          <div className="text-green-800 font-medium text-sm">✅ Import complete</div>
          <div className="text-green-700 text-sm mt-1">
            {result.imported} transactions imported · {result.skipped} skipped (payouts/refunds/empty)
          </div>
          <a href="/dashboard" className="text-blue-600 hover:underline text-sm mt-2 block">View dashboard →</a>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 text-red-700 text-sm">{error}</div>
      )}

      {rawRows.length > 0 && !result && (
        <button
          onClick={handleImport}
          disabled={importing}
          className="bg-blue-600 text-white rounded-xl px-6 py-3 font-medium text-sm hover:bg-blue-700 disabled:opacity-50 w-full"
        >
          {importing ? 'Importing…' : `Import ${rawRows.length} rows from ${file?.name}`}
        </button>
      )}

      {/* Format guide */}
      <div className="mt-8 bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-3 text-sm">Supported formats</h3>
        <div className="space-y-3">
          {Object.entries(PLATFORM_META).map(([key, meta]) => (
            <div key={key} className="flex items-start gap-3">
              <span className="text-lg">{meta.icon}</span>
              <div>
                <div className="text-sm font-medium text-gray-700">{meta.label}</div>
                <div className="text-xs text-gray-400">{meta.hint}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-gray-400">
          Download sample files to see the expected format:{' '}
          {SAMPLE_FILES.map((s, i) => (
            <span key={s.file}>
              <a href={`/samples/${s.file}`} className="text-blue-500 hover:underline" download>{s.platform}</a>
              {i < SAMPLE_FILES.length - 1 ? ' · ' : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
