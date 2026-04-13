'use client'
import { useState } from 'react'

export function InviteCodeSection() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok?: boolean; message?: string; error?: string } | null>(null)

  async function redeem() {
    if (!code.trim()) return
    setLoading(true)
    setResult(null)
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim() }),
    })
    const data = await res.json()
    setResult(data)
    setLoading(false)
    if (data.ok) setCode('')
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
      <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wide">Invite Code</h2>
      <p className="text-xs text-gray-600">Have an invite code from Product Hunt, Hacker News, or a launch promo? Redeem it here for free Pro months.</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. HN2025"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 font-mono"
          onKeyDown={e => e.key === 'Enter' && redeem()}
        />
        <button
          onClick={redeem}
          disabled={loading || !code.trim()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? '…' : 'Redeem'}
        </button>
      </div>
      {result && (
        <p className={`text-sm ${result.ok ? 'text-emerald-400' : 'text-red-400'}`}>
          {result.message || result.error}
        </p>
      )}
    </div>
  )
}
