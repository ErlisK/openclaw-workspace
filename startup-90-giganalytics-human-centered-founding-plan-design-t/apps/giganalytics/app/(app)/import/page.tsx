'use client'

import { useState, useCallback } from 'react'
import Papa from 'papaparse'

interface ParsedRow {
  [key: string]: string
}

const STRIPE_MAP: Record<string, string> = {
  'created (utc)': 'date', 'created': 'date', 'date': 'date',
  'amount': 'amount', 'gross': 'amount',
  'net': 'net_amount',
  'fee': 'fee_amount', 'stripe fee': 'fee_amount',
  'description': 'description',
  'id': 'source_id', 'transaction id': 'source_id', 'charge id': 'source_id',
}

function detectPlatform(headers: string[]): string {
  const h = headers.map(x => x.toLowerCase())
  if (h.some(x => x.includes('stripe') || x.includes('transfer_id'))) return 'stripe'
  if (h.some(x => x.includes('paypal') || x.includes('transaction id'))) return 'paypal'
  if (h.some(x => x.includes('upwork') || x.includes('agency'))) return 'upwork'
  if (h.some(x => x.includes('toggl') || x.includes('project'))) return 'toggl'
  return 'custom'
}

function mapHeaders(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  headers.forEach(h => {
    const mapped = STRIPE_MAP[h.toLowerCase().trim()]
    if (mapped) mapping[h] = mapped
  })
  return mapping
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [platform, setPlatform] = useState('')
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; total: number } | null>(null)
  const [error, setError] = useState('')

  const handleFile = useCallback((f: File) => {
    setFile(f)
    setResult(null)
    setError('')
    Papa.parse<ParsedRow>(f, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const hs = results.meta.fields ?? []
        setHeaders(hs)
        setRows(results.data.slice(0, 200))
        setPlatform(detectPlatform(hs))
        setMapping(mapHeaders(hs))
      },
    })
  }, [])

  async function handleImport() {
    if (!rows.length) return
    setImporting(true)
    setError('')

    // Map rows using column mapping
    const mapped = rows.map((row, i) => {
      const out: Record<string, string> = {}
      Object.entries(mapping).forEach(([header, field]) => {
        out[field] = row[header] ?? ''
      })
      out.source_id = out.source_id || `${platform}-${i}-${Date.now()}`
      return out
    })

    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: mapped, platform }),
    })
    const data = await res.json()
    setImporting(false)
    if (res.ok) {
      setResult(data)
    } else {
      setError(data.error ?? 'Import failed')
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Import data</h1>
      <p className="text-gray-500 text-sm mb-6">Upload a CSV from Stripe, PayPal, Upwork, or any custom format.</p>

      {/* Drop zone */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center mb-6 cursor-pointer hover:border-blue-400 transition-colors"
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onDragOver={e => e.preventDefault()}
        onClick={() => document.getElementById('csv-input')?.click()}
      >
        <div className="text-3xl mb-2">📥</div>
        {file ? (
          <div>
            <div className="font-medium text-gray-800">{file.name}</div>
            <div className="text-sm text-gray-400">{rows.length} rows detected · {platform}</div>
          </div>
        ) : (
          <div>
            <div className="font-medium text-gray-700 mb-1">Drop CSV here or click to browse</div>
            <div className="text-sm text-gray-400">Stripe · PayPal · Upwork · Toggl · Custom</div>
          </div>
        )}
        <input
          id="csv-input"
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>

      {/* Preview + mapping */}
      {headers.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-800">Column mapping</h3>
            <span className="text-xs text-gray-400">Platform: {platform}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {headers.map(h => (
              <div key={h} className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 w-28 truncate">{h}</span>
                <span className="text-gray-300">→</span>
                <select
                  value={mapping[h] ?? ''}
                  onChange={e => setMapping(prev => ({ ...prev, [h]: e.target.value }))}
                  className="border rounded px-2 py-1 text-xs flex-1"
                >
                  <option value="">skip</option>
                  <option value="date">date</option>
                  <option value="amount">amount (gross)</option>
                  <option value="net_amount">net amount</option>
                  <option value="fee_amount">fee</option>
                  <option value="description">description</option>
                  <option value="source_id">id (dedup)</option>
                </select>
              </div>
            ))}
          </div>

          {/* Preview table */}
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {headers.slice(0, 6).map(h => (
                    <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 3).map((row, i) => (
                  <tr key={i} className="border-t">
                    {headers.slice(0, 6).map(h => (
                      <td key={h} className="px-3 py-2 text-gray-700 truncate max-w-24">{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="text-green-800 font-medium">✅ Import complete</div>
          <div className="text-green-700 text-sm mt-1">
            {result.imported} transactions imported (of {result.total} in file)
          </div>
          <a href="/dashboard" className="text-blue-600 hover:underline text-sm mt-2 block">View dashboard →</a>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700 text-sm">{error}</div>
      )}

      {rows.length > 0 && !result && (
        <button
          onClick={handleImport}
          disabled={importing}
          className="bg-blue-600 text-white rounded-lg px-6 py-2.5 font-medium text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {importing ? 'Importing…' : `Import ${rows.length} transactions`}
        </button>
      )}
    </div>
  )
}
