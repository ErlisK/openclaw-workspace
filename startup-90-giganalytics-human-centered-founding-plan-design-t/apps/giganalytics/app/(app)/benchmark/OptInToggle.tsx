'use client'

import { useState } from 'react'

interface OptIn { opted_in: boolean; service_category?: string }

const CATEGORIES = ['design', 'development', 'coaching', 'writing', 'marketing', 'general']

export default function OptInToggle({
  initial,
  userHourlyRate,
}: {
  initial: OptIn
  userHourlyRate: number
}) {
  const [optedIn, setOptedIn] = useState(initial.opted_in)
  const [category, setCategory] = useState(initial.service_category ?? 'general')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function toggle(newValue: boolean) {
    setSaving(true)
    setSaved(false)
    const res = await fetch('/api/benchmark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optedIn: newValue, serviceCategory: category }),
    })
    if (res.ok) {
      setOptedIn(newValue)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  async function saveCategory() {
    if (!optedIn) return
    await toggle(true)
  }

  return (
    <div className={`rounded-xl border-2 p-5 transition-all ${optedIn ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-semibold text-gray-800 mb-0.5">
            {optedIn ? '✅ You\'re contributing to benchmarks' : '🔒 Benchmarks: opted out'}
          </div>
          <div className="text-xs text-gray-500">
            {optedIn
              ? 'Your anonymized rate is included when ≥10 users share the same category/platform.'
              : 'Your data is completely private. Opt in to help build the community dataset.'}
          </div>
        </div>
        <button
          onClick={() => toggle(!optedIn)}
          disabled={saving}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
            optedIn ? 'bg-blue-600' : 'bg-gray-300'
          } ${saving ? 'opacity-50' : ''}`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            optedIn ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>

      {optedIn && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-blue-200">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-600 block mb-1">Your service category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full border rounded-lg px-3 py-1.5 text-sm"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={saveCategory} disabled={saving}
              className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? '…' : saved ? '✓ Saved' : 'Save'}
            </button>
          </div>
          {userHourlyRate > 0 && (
            <div className="text-xs text-gray-500 self-end pb-1">
              Your rate: <span className="font-medium text-blue-700">${userHourlyRate.toFixed(0)}/hr</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 text-xs text-gray-400">
        🛡️ <strong>Privacy guarantee:</strong> Individual data is never shared. Only aggregated percentiles
        with ≥10 contributors are published. You can opt out at any time.
      </div>
    </div>
  )
}
