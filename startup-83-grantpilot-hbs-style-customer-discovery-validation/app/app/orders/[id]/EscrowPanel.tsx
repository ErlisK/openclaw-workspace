'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function EscrowPanel({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const router = useRouter()

  async function handleRelease(source: 'manual' | 'qa' | 'export') {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`/api/orders/${orderId}/escrow-release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, note: source === 'manual' ? 'Manual release by user.' : undefined }),
      })
      const data = await res.json()
      if (data.released) {
        setResult('✅ Escrow released! Order marked complete.')
        router.refresh()
      } else {
        setResult(`ℹ️ ${data.message || 'Condition recorded.'}`)
        router.refresh()
      }
    } catch {
      setResult('❌ Request failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-current border-opacity-20">
      <div className="text-xs font-semibold opacity-70 mb-2 uppercase tracking-wide">Test Escrow Controls</div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleRelease('qa')}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg bg-white bg-opacity-60 hover:bg-opacity-100 border border-current border-opacity-30 font-medium disabled:opacity-40"
        >
          {loading ? '…' : '🔍 Simulate QA Pass'}
        </button>
        <button
          onClick={() => handleRelease('export')}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg bg-white bg-opacity-60 hover:bg-opacity-100 border border-current border-opacity-30 font-medium disabled:opacity-40"
        >
          {loading ? '…' : '📦 Simulate Export'}
        </button>
        <button
          onClick={() => handleRelease('manual')}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg bg-white bg-opacity-60 hover:bg-opacity-100 border border-current border-opacity-30 font-medium disabled:opacity-40"
        >
          {loading ? '…' : '⚡ Force Release'}
        </button>
      </div>
      {result && <p className="text-xs mt-2 font-medium">{result}</p>}
    </div>
  )
}
