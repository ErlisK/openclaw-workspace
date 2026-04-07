'use client'
import { useState } from 'react'

export default function DataExportButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleExport() {
    setStatus('loading')
    setError('')
    try {
      const res = await fetch('/api/privacy/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regulation: 'gdpr' }),
      })
      if (res.status === 429) {
        const data = await res.json()
        setError(`Export limit reached. Next available: ${new Date(data.nextAvailable).toLocaleString()}`)
        setStatus('error')
        return
      }
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Export failed')
        setStatus('error')
        return
      }
      // Trigger file download
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `playtestflow-data-export-${new Date().toISOString().slice(0,10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setStatus('done')
    } catch {
      setError('Network error — please try again.')
      setStatus('error')
    }
  }

  return (
    <div>
      <button
        onClick={handleExport}
        disabled={status === 'loading'}
        className="w-full bg-white/8 hover:bg-white/12 border border-white/15 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {status === 'loading' ? '⏳ Generating export…' :
         status === 'done'    ? '✓ Downloaded!' :
         '⬇️ Download My Data'}
      </button>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      {status === 'done' && (
        <p className="text-xs text-green-400 mt-2">
          Your data export has been downloaded. Contains all personal data in JSON format.
        </p>
      )}
    </div>
  )
}
