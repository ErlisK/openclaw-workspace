'use client'

import { useState } from 'react'

export default function BenchmarkOptIn({ initialOptIn }: { initialOptIn: boolean }) {
  const [optIn, setOptIn] = useState(initialOptIn)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function toggle(value: boolean) {
    setSaving(true)
    setSaved(false)
    const res = await fetch('/api/settings/benchmark-opt-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optIn: value }),
    })
    if (res.ok) {
      setOptIn(value)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  return (
    <div className="flex items-start justify-between">
      <div className="flex-1 mr-4">
        <div className="text-sm font-medium text-gray-800 mb-0.5">Anonymous Benchmarking</div>
        <div className="text-xs text-gray-500">
          {optIn
            ? 'Your anonymized hourly rate contributes to community benchmarks.'
            : 'Off by default. Enable to help build anonymized industry rate benchmarks.'}
          {saved && <span className="text-green-600 ml-2">✓ Saved</span>}
        </div>
      </div>
      <button
        onClick={() => toggle(!optIn)}
        disabled={saving}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none shrink-0 ${
          optIn ? 'bg-blue-600' : 'bg-gray-300'
        } ${saving ? 'opacity-50' : ''}`}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          optIn ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  )
}
