'use client'

import { useState } from 'react'

const CSV_TYPES = [
  { value: 'sessions',        label: 'Sessions summary' },
  { value: 'task_performance', label: 'Task performance' },
  { value: 'tester_pipeline', label: 'Tester pipeline' },
  { value: 'events',          label: 'All events' },
  { value: 'feedback',        label: 'Feedback responses' },
  { value: 'confusion',       label: 'Confusion areas' },
]

export default function MetricsExportBar() {
  const [downloading, setDownloading] = useState<string | null>(null)
  const [showMenu, setShowMenu] = useState(false)

  async function downloadCSV(csvType: string) {
    setDownloading(csvType)
    setShowMenu(false)
    try {
      const res = await fetch(`/api/metrics?format=csv&csv_type=${csvType}`)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `playtestflow-${csvType}-${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    } finally {
      setDownloading(null)
    }
  }

  async function downloadJSON() {
    setDownloading('json')
    try {
      const res = await fetch('/api/metrics?format=json')
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `playtestflow-metrics-${new Date().toISOString().slice(0,10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="flex items-center gap-2 relative">
      <button
        onClick={downloadJSON}
        disabled={downloading === 'json'}
        className="text-sm bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        {downloading === 'json' ? '⏳ Downloading…' : '⬇ JSON'}
      </button>

      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="text-sm bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/25 text-orange-300 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
        >
          ⬇ CSV export {showMenu ? '▲' : '▼'}
        </button>

        {showMenu && (
          <div className="absolute right-0 top-full mt-1 w-52 bg-[#1c2128] border border-white/10 rounded-xl shadow-xl z-10 overflow-hidden">
            {CSV_TYPES.map(ct => (
              <button
                key={ct.value}
                onClick={() => downloadCSV(ct.value)}
                disabled={downloading === ct.value}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors disabled:opacity-50 flex items-center justify-between"
              >
                {ct.label}
                {downloading === ct.value && <span className="text-xs text-orange-400">⏳</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {showMenu && (
        <div className="fixed inset-0 z-0" onClick={() => setShowMenu(false)} />
      )}
    </div>
  )
}
