'use client'
import { useState } from 'react'

export default function DeleteAccountButton() {
  const [phase, setPhase] = useState<'idle' | 'confirm1' | 'confirm2' | 'deleting' | 'done' | 'error'>('idle')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  async function handleDelete() {
    setPhase('deleting')
    setError('')
    try {
      const res = await fetch('/api/privacy/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true, reason }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Deletion failed')
        setPhase('error')
        return
      }
      setPhase('done')
      // Redirect to home after 3 seconds
      setTimeout(() => { window.location.href = '/' }, 3000)
    } catch {
      setError('Network error — please try again.')
      setPhase('error')
    }
  }

  if (phase === 'done') {
    return (
      <div className="text-center py-4">
        <div className="text-3xl mb-2">✅</div>
        <div className="text-sm text-green-400 font-medium">Account deleted.</div>
        <div className="text-xs text-gray-500 mt-1">Redirecting to homepage…</div>
      </div>
    )
  }

  if (phase === 'idle') {
    return (
      <button
        onClick={() => setPhase('confirm1')}
        className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
      >
        🗑️ Delete My Account
      </button>
    )
  }

  if (phase === 'confirm1') {
    return (
      <div className="space-y-3">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-300">
          <strong>This is irreversible.</strong> Your account, profile, and all personal data will be permanently deleted.
          Anonymous session records may be retained for designer analytics integrity.
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Reason for leaving (optional)</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={2}
            placeholder="Help us improve (optional)…"
            className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none resize-none"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPhase('idle')}
            className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 py-2.5 rounded-xl text-sm font-medium transition-colors">
            Cancel
          </button>
          <button onClick={() => setPhase('confirm2')}
            className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 py-2.5 rounded-xl text-sm font-bold transition-colors">
            Yes, Delete
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'confirm2') {
    return (
      <div className="space-y-3">
        <div className="text-sm text-center text-gray-400">
          Type <strong className="text-red-400">DELETE</strong> to confirm:
        </div>
        <ConfirmTypingDelete onConfirm={handleDelete} onCancel={() => setPhase('idle')} />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }

  if (phase === 'deleting') {
    return <div className="text-sm text-gray-400 text-center py-3">⏳ Deleting your account…</div>
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-red-400">Failed: {error}</div>
      <button onClick={() => setPhase('idle')} className="text-xs text-gray-500 underline">Try again</button>
    </div>
  )
}

function ConfirmTypingDelete({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const [value, setValue] = useState('')
  return (
    <div className="space-y-2">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Type DELETE"
        className="w-full bg-white/5 border border-red-500/30 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500"
      />
      <div className="flex gap-2">
        <button onClick={onCancel}
          className="flex-1 bg-white/5 border border-white/10 text-gray-400 py-2 rounded-xl text-sm transition-colors hover:bg-white/10">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={value !== 'DELETE'}
          className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white py-2 rounded-xl text-sm font-bold transition-colors"
        >
          Permanently Delete
        </button>
      </div>
    </div>
  )
}
