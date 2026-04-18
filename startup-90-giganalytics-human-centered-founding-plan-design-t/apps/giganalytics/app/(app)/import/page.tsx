'use client'

import { useState, useCallback } from 'react'
import Papa from 'papaparse'
import { detectCsvPlatform, mapCsvRows, type ColumnMapping, type TransactionRow } from '@/lib/csv-mappers'

type ParsedRow = Record<string, string>
type Platform = ReturnType<typeof detectCsvPlatform>

// ─── Platform metadata with enriched tooltips ──────────────────────────────

const PLATFORM_META: Record<Platform, {
  label: string
  icon: string
  color: string
  hint: string
  steps: string[]
  columns: string[]
  sampleRows: string[][]
}> = {
  stripe_balance: {
    label: 'Stripe Balance History',
    icon: '💳',
    color: 'bg-purple-50 border-purple-200',
    hint: 'Dashboard → Reports → Balance transaction history → Export',
    steps: [
      'Go to stripe.com/dashboard → Reports',
      'Click "Balance transaction history"',
      'Set date range → click "Export" → CSV',
    ],
    columns: ['id', 'Created (UTC)', 'Amount', 'Fee', 'Net', 'Description', 'Currency'],
    sampleRows: [
      ['txn_abc123', '2024-01-15 12:00', '150.00', '4.65', '145.35', 'Payment from client', 'usd'],
      ['txn_def456', '2024-01-18 09:30', '200.00', '6.10', '193.90', 'Monthly retainer', 'usd'],
    ],
  },
  stripe_charges: {
    label: 'Stripe Charges Export',
    icon: '💳',
    color: 'bg-purple-50 border-purple-200',
    hint: 'Dashboard → Payments → Export → Charges',
    steps: [
      'Go to stripe.com/dashboard → Payments',
      'Click the export icon (↓) → "Export charges"',
      'Choose date range → Download CSV',
    ],
    columns: ['id', 'Amount', 'Amount Refunded', 'Fee', 'Created (UTC)', 'Description'],
    sampleRows: [
      ['ch_abc123', '5000', '0', '175', '2024-01-15 14:00', 'Logo design project'],
      ['ch_def456', '2500', '0', '103', '2024-01-22 09:00', 'Web consulting'],
    ],
  },
  stripe_payouts: {
    label: 'Stripe Payouts',
    icon: '💳',
    color: 'bg-purple-50 border-purple-200',
    hint: 'Dashboard → Payouts → Export',
    steps: [
      'Go to stripe.com/dashboard → Payouts',
      'Click "Export" → select CSV format',
      'Set date range and download',
    ],
    columns: ['id', 'Amount', 'Created', 'Arrival Date', 'Description'],
    sampleRows: [
      ['po_abc123', '1250.00', '2024-01-14', '2024-01-16', 'STRIPE PAYOUT'],
      ['po_def456', '875.00', '2024-01-28', '2024-01-30', 'STRIPE PAYOUT'],
    ],
  },
  paypal: {
    label: 'PayPal Activity',
    icon: '🅿️',
    color: 'bg-blue-50 border-blue-200',
    hint: 'Activity → Statements → Download CSV',
    steps: [
      'Go to paypal.com → Activity',
      'Click "Statements" → "Custom" date range',
      'Select "All Transactions" → "Download" → CSV',
    ],
    columns: ['Date', 'Time', 'Name', 'Type', 'Currency', 'Gross', 'Fee', 'Net'],
    sampleRows: [
      ['01/15/2024', '12:00:00', 'Acme Corp', 'Payment Received', 'USD', '300.00', '-12.00', '288.00'],
      ['01/22/2024', '09:15:00', 'Design Client', 'Payment Received', 'USD', '150.00', '-6.45', '143.55'],
    ],
  },
  upwork: {
    label: 'Upwork Transactions',
    icon: '🔧',
    color: 'bg-green-50 border-green-200',
    hint: 'Reports → Transaction History → Export',
    steps: [
      'Go to upwork.com → Reports → Transaction History',
      'Set date range at the top',
      'Click "Export" → Download CSV',
    ],
    columns: ['Date', 'Ref ID', 'Type', 'Description', 'Agency', 'Team', 'Freelancer', 'Amount'],
    sampleRows: [
      ['Jan 15, 2024', 'REF123', 'Fixed Price', 'WordPress site build', '', '', 'You', '450.00'],
      ['Jan 20, 2024', 'REF456', 'Hourly', 'React development 10hrs', '', '', 'You', '350.00'],
    ],
  },
  generic: {
    label: 'Custom CSV',
    icon: '📄',
    color: 'bg-gray-50 border-gray-200',
    hint: 'Any CSV with at least a date and amount column',
    steps: [
      'Export from any app (spreadsheet, invoicing tool, bank, etc.)',
      'Only two columns are truly required: date and amount',
      'Optional: fee, net amount, description, currency',
    ],
    columns: ['date', 'amount', 'description', 'fee', 'currency'],
    sampleRows: [
      ['2024-01-15', '500.00', 'Web design project', '0', 'usd'],
      ['2024-01-28', '250.00', 'Consulting 5hrs', '0', 'usd'],
    ],
  },
}

const FIELD_OPTIONS = ['date', 'amount', 'net_amount', 'fee_amount', 'description', 'source_id', 'currency']

const FIELD_META: Record<string, { required: boolean; label: string; tip: string }> = {
  date:        { required: false, label: 'Date',         tip: 'Transaction date (YYYY-MM-DD, MM/DD/YYYY, etc.). Optional — defaults to today.' },
  amount:      { required: true,  label: 'Amount ★',     tip: 'Gross payment amount. Required.' },
  net_amount:  { required: false, label: 'Net Amount',   tip: 'Amount after fees. Optional — calculated from amount − fee if missing.' },
  fee_amount:  { required: false, label: 'Fee',          tip: 'Platform fee. Optional.' },
  description: { required: false, label: 'Description',  tip: 'Memo / job name. Optional.' },
  source_id:   { required: false, label: 'Source ID',    tip: 'Unique transaction ID for deduplication. Optional.' },
  currency:    { required: false, label: 'Currency',     tip: 'e.g. usd, eur, gbp. Optional — defaults to USD.' },
}

// ─── Stream name inference ─────────────────────────────────────────────────

function inferStreamName(headers: string[], platform: Platform, filename: string): string {
  if (platform === 'stripe_balance' || platform === 'stripe_charges' || platform === 'stripe_payouts') return 'Stripe'
  if (platform === 'paypal') return 'PayPal'
  if (platform === 'upwork') return 'Upwork'

  // Try to pick a meaningful name from the filename
  const base = filename.replace(/\.csv$/i, '').replace(/[-_]/g, ' ').trim()
  // Check for platform hints in headers
  const headerStr = headers.join(' ').toLowerCase()
  if (headerStr.includes('fiverr')) return 'Fiverr'
  if (headerStr.includes('toptal')) return 'Toptal'
  if (headerStr.includes('freelancer')) return 'Freelancer'
  if (headerStr.includes('amazon')) return 'Amazon'
  if (headerStr.includes('etsy')) return 'Etsy'
  if (headerStr.includes('shopify')) return 'Shopify'
  if (headerStr.includes('gumroad')) return 'Gumroad'
  if (headerStr.includes('substack')) return 'Substack'
  if (headerStr.includes('patreon')) return 'Patreon'
  // Try to use a client/description column header as a hint
  const clientColCandidates = headers.filter(h =>
    /^(client|customer|company|employer|payer|source|from|name)/i.test(h)
  )
  if (clientColCandidates.length > 0) return 'Custom Income'

  return base.length > 0 && base.length < 40 ? base : 'Custom Income'
}

// ─── Sample data component ─────────────────────────────────────────────────

function SampleDataTable({ platform }: { platform: Platform }) {
  const meta = PLATFORM_META[platform]
  if (!meta.sampleRows.length) return null
  return (
    <div className="mt-3 overflow-x-auto">
      <div className="text-xs text-gray-500 mb-1 font-medium">Expected columns:</div>
      <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            {meta.columns.map(col => (
              <th key={col} className="px-2 py-1 text-left text-gray-600 font-medium whitespace-nowrap">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {meta.sampleRows.map((row, i) => (
            <tr key={i} className="border-t border-gray-100 even:bg-gray-50">
              {row.map((cell, j) => (
                <td key={j} className="px-2 py-1 text-gray-700 whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-xs text-gray-400 mt-1">↑ Sample data — your file should look like this</div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<ParsedRow[]>([])
  const [platform, setPlatform] = useState<Platform>('generic')
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<TransactionRow[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; total: number; skipped: number; streamName?: string } | null>(null)
  const [error, setError] = useState('')
  const [showManualMapping, setShowManualMapping] = useState(false)
  const [streamName, setStreamName] = useState('')
  const [showGuide, setShowGuide] = useState(false)
  const [guidePlatform, setGuidePlatform] = useState<Platform>('generic')

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
        // Quick win #4: pre-fill stream name from CSV headers/filename
        const suggested = inferStreamName(hs, detected, f.name)
        setStreamName(suggested)
      },
      error: (err) => setError(`Parse error: ${err.message}`),
    })
  }

  const handleFile = useCallback((f: File) => processFile(f), [])

  async function handleLoadSample(filename: string) {
    const res = await fetch(`/samples/${filename}`)
    const text = await res.text()
    const blob = new Blob([text], { type: 'text/csv' })
    const f = new File([blob], filename, { type: 'text/csv' })
    processFile(f)
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

    let cm: ColumnMapping | undefined
    if (showManualMapping && mapping['amount']) {
      cm = {
        date: mapping['date'],      // optional — API defaults to today
        amount: mapping['amount'],
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
      body: JSON.stringify({
        rows,
        platform: mapResult.platform,
        streamName: streamName || inferStreamName(headers, platform, file?.name ?? ''),
      }),
    })

    const data = await res.json()
    setImporting(false)

    if (!res.ok) {
      setError(data.message ?? data.error ?? 'Import failed')
    } else {
      setResult({ ...data, streamName: streamName || data.streamName })
    }
  }

  const meta = PLATFORM_META[platform]

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Import income data</h1>
        <p className="text-gray-500 text-sm mt-1">
          Upload a CSV from Stripe, PayPal, Upwork, or any spreadsheet.{' '}
          <span className="text-green-700 font-medium">Only amount is required</span> — all other fields are optional.
        </p>
      </div>

      {/* Quick-start sample files */}
      <div className="mb-5 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="text-sm font-medium text-blue-800 mb-2">📥 Try a sample file first</div>
        <div className="flex flex-wrap gap-2">
          {[
            { name: 'Stripe', file: 'stripe-balance-sample.csv', platform: 'stripe_balance' as Platform },
            { name: 'PayPal', file: 'paypal-activity-sample.csv', platform: 'paypal' as Platform },
            { name: 'Upwork', file: 'upwork-transactions-sample.csv', platform: 'upwork' as Platform },
            { name: 'Generic CSV', file: 'generic-invoices-sample.csv', platform: 'generic' as Platform },
          ].map(s => (
            <button
              key={s.file}
              onClick={() => handleLoadSample(s.file)}
              className="text-xs bg-white border border-blue-300 text-blue-700 hover:bg-blue-100 rounded-lg px-3 py-1.5 font-medium"
            >
              {PLATFORM_META[s.platform].icon} {s.name}
            </button>
          ))}
        </div>
        <div className="text-xs text-blue-600 mt-2">
          Clicking a sample instantly loads it — no file picker needed.
        </div>
      </div>

      {/* Drop zone */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors mb-5"
        onClick={() => document.getElementById('csv-input')?.click()}
        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-blue-400') }}
        onDragLeave={e => e.currentTarget.classList.remove('border-blue-400')}
        onDrop={e => {
          e.preventDefault()
          e.currentTarget.classList.remove('border-blue-400')
          const f = e.dataTransfer.files[0]
          if (f) handleFile(f)
        }}
      >
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
            <div className="text-3xl mb-2">📁</div>
            <div className="font-medium text-gray-700 mb-1">Drop your CSV here or click to browse</div>
            <div className="text-sm text-gray-400">Stripe · PayPal · Upwork · Any CSV with amounts</div>
          </div>
        )}
        <input id="csv-input" type="file" accept=".csv,.tsv" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      </div>

      {/* Stream name (quick win #4: pre-filled) */}
      {rawRows.length > 0 && (
        <div className="mb-5 bg-white border border-gray-200 rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Income stream name
            <span className="ml-1 text-xs font-normal text-gray-400">(auto-detected from your file)</span>
          </label>
          <input
            type="text"
            value={streamName}
            onChange={e => setStreamName(e.target.value)}
            placeholder="e.g. Stripe, Fiverr, Direct Clients"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="text-xs text-gray-400 mt-1">
            Transactions will be grouped under this stream. Rename any time in Settings.
          </div>
        </div>
      )}

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

          {/* Manual mapping UI — quick win #1: only amount is required */}
          {showManualMapping && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
              <div className="text-sm font-medium text-gray-700 mb-1">Map columns to fields:</div>
              <div className="text-xs text-gray-500 mb-3 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                ★ <strong>Amount</strong> is the only required field. Everything else is optional.
                Date defaults to today if missing.
              </div>
              <div className="grid grid-cols-1 gap-2">
                {FIELD_OPTIONS.map(field => {
                  const fm = FIELD_META[field]
                  return (
                    <div key={field} className="flex items-center gap-2 text-sm">
                      <div className="w-28 flex-shrink-0 text-right">
                        <span className={`text-xs font-medium ${fm.required ? 'text-blue-700' : 'text-gray-500'}`}>
                          {fm.label}
                        </span>
                      </div>
                      <span className="text-gray-300">←</span>
                      <select
                        value={mapping[field] ?? ''}
                        onChange={e => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                        className="border rounded px-2 py-1 text-xs flex-1"
                      >
                        <option value="">-- {fm.required ? 'select column' : 'auto / skip'} --</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <span className="text-gray-400 text-xs max-w-40 hidden lg:block" title={fm.tip}>
                        {fm.tip}
                      </span>
                    </div>
                  )
                })}
              </div>
              <button onClick={applyManualMapping} className="mt-3 text-xs bg-gray-200 hover:bg-gray-300 rounded px-3 py-1">
                Preview mapping
              </button>
            </div>
          )}

          {/* Preview table */}
          {preview.length > 0 && (
            <>
              <div className="text-sm font-medium text-gray-700 mb-2">Preview (first 5 rows):</div>
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
                        <td className="px-3 py-2 text-gray-700">{row.date || <span className="text-gray-400 italic">today</span>}</td>
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
                {rawRows.length} rows parsed · will be imported to <strong>{streamName}</strong>
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
            {result.imported} transactions imported into <strong>{result.streamName || streamName}</strong>
            {result.skipped > 0 && ` · ${result.skipped} skipped (payouts/refunds/empty)`}
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
          data-testid="import-submit-btn"
          className="bg-blue-600 text-white rounded-xl px-6 py-3 font-medium text-sm hover:bg-blue-700 disabled:opacity-50 w-full"
        >
          {importing ? 'Importing…' : `Import ${rawRows.length} rows → ${streamName}`}
        </button>
      )}

      {/* Format guide — quick win #2: enriched tooltips + quick win #3: inline sample data */}
      <div className="mt-8 bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 text-sm">Supported formats & how to export</h3>
          <span className="text-xs text-gray-400">Click any format to expand</span>
        </div>
        <div className="space-y-2">
          {(Object.entries(PLATFORM_META) as [Platform, typeof PLATFORM_META[Platform]][]).map(([key, meta]) => (
            <div key={key} className="border border-gray-100 rounded-lg overflow-hidden">
              <button
                onClick={() => { setGuidePlatform(key); setShowGuide(guidePlatform !== key || !showGuide) }}
                className={`w-full flex items-start gap-3 p-3 text-left hover:bg-gray-50 transition-colors ${guidePlatform === key && showGuide ? 'bg-gray-50' : ''}`}
              >
                <span className="text-lg flex-shrink-0">{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-700">{meta.label}</div>
                  <div className="text-xs text-gray-400">{meta.hint}</div>
                </div>
                <span className="text-gray-400 text-sm">{guidePlatform === key && showGuide ? '▲' : '▼'}</span>
              </button>

              {guidePlatform === key && showGuide && (
                <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                  {/* Step-by-step export instructions */}
                  <div className="mt-3">
                    <div className="text-xs font-medium text-gray-600 mb-1">How to export:</div>
                    <ol className="space-y-1">
                      {meta.steps.map((step, i) => (
                        <li key={i} className="text-xs text-gray-600 flex gap-2">
                          <span className="text-blue-500 font-medium flex-shrink-0">{i + 1}.</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                  {/* Inline sample data table */}
                  <SampleDataTable platform={key} />
                  {/* Download sample */}
                  <div className="mt-3 flex items-center gap-3">
                    {key !== 'generic' && (
                      <a
                        href={`/samples/${key === 'stripe_balance' ? 'stripe-balance' : key === 'stripe_charges' ? 'stripe-charges' : key === 'stripe_payouts' ? 'stripe-payouts' : key}-sample.csv`}
                        download
                        className="text-xs text-blue-600 hover:underline"
                      >
                        ↓ Download sample CSV
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const sampleFile = key === 'stripe_balance' ? 'stripe-balance-sample.csv'
                          : key === 'stripe_charges' ? 'stripe-charges-sample.csv'
                          : key === 'stripe_payouts' ? 'stripe-payouts-sample.csv'
                          : key === 'paypal' ? 'paypal-activity-sample.csv'
                          : key === 'upwork' ? 'upwork-transactions-sample.csv'
                          : 'generic-invoices-sample.csv'
                        handleLoadSample(sampleFile)
                      }}
                      className="text-xs bg-blue-600 text-white rounded px-3 py-1 hover:bg-blue-700"
                    >
                      Try sample →
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick win #1: Required fields notice */}
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
          <strong>Minimum required:</strong> Only the <strong>amount</strong> column is required.
          Date defaults to today if missing. All other fields (fee, description, currency) are auto-detected or optional.
        </div>
      </div>
    </div>
  )
}
