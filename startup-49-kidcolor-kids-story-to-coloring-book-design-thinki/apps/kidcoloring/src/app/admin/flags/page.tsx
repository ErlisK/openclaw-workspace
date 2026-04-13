'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface FlagRow {
  key: string
  value: string
  type: 'bool' | 'int' | 'float' | 'string' | 'enum'
  description: string
  category: string
  options: string[] | null
  updated_at: string
  updated_by: string | null
  envValue: string | null
  defaultValue: string | null
  resolvedValue: string
  source: 'db' | 'env' | 'default'
}

const CATEGORY_META: Record<string, { icon: string; label: string; color: string }> = {
  feature:    { icon: '🎛️',  label: 'Feature Toggles', color: 'blue' },
  experiment: { icon: '🧪', label: 'Experiments / A/B', color: 'violet' },
  generation: { icon: '🎨', label: 'Generation Config', color: 'orange' },
  ops:        { icon: '⚙️',  label: 'Operations',       color: 'gray' },
}

const SOURCE_BADGE: Record<string, string> = {
  db:      'bg-green-100 text-green-800 border-green-200',
  env:     'bg-blue-100 text-blue-800 border-blue-200',
  default: 'bg-gray-100 text-gray-600 border-gray-200',
}

export default function FlagsAdminPage() {
  const [flags,   setFlags]   = useState<FlagRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [saving,  setSaving]  = useState<Record<string, boolean>>({})
  const [saved,   setSaved]   = useState<Record<string, boolean>>({})
  const [error,   setError]   = useState('')
  const [filter,  setFilter]  = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/flags')
    const data = await res.json() as { ok: boolean; flags: FlagRow[] }
    if (data.ok) setFlags(data.flags)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleEdit = (key: string, value: string) => {
    setEditing(e => ({ ...e, [key]: value }))
  }

  const handleSave = async (flag: FlagRow) => {
    const newVal = editing[flag.key] ?? flag.value
    setSaving(s => ({ ...s, [flag.key]: true }))
    setError('')
    try {
      const res = await fetch('/api/admin/flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: flag.key, value: newVal, updatedBy: 'admin-ui' }),
      })
      const data = await res.json() as { ok: boolean; error?: string }
      if (!data.ok) throw new Error(data.error)
      setSaved(s => ({ ...s, [flag.key]: true }))
      setTimeout(() => setSaved(s => ({ ...s, [flag.key]: false })), 2000)
      setEditing(e => { const n = { ...e }; delete n[flag.key]; return n })
      await load()
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(s => ({ ...s, [flag.key]: false }))
    }
  }

  const handleReset = (flag: FlagRow) => {
    setEditing(e => ({ ...e, [flag.key]: flag.defaultValue ?? '' }))
  }

  // Group by category
  const grouped = flags
    .filter(f => !filter || f.key.toLowerCase().includes(filter.toLowerCase()) || f.description.toLowerCase().includes(filter.toLowerCase()))
    .reduce<Record<string, FlagRow[]>>((acc, f) => {
      acc[f.category] = [...(acc[f.category] || []), f]
      return acc
    }, {})

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-violet-700 text-white px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link href="/admin" className="text-violet-300 hover:text-white text-sm">← Admin</Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              🎛️ Feature Flags
              <span className="text-sm font-normal text-violet-300 ml-2">
                {flags.length} flags · live edit · ≤60s propagation
              </span>
            </h1>
            <p className="text-violet-200 text-xs mt-0.5">
              Changes write to Supabase and take effect within 60 seconds — no redeploy needed
            </p>
          </div>
          <button onClick={load}
            className="text-sm border border-violet-500 px-3 py-1.5 rounded-lg hover:bg-violet-600">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* How it works strip */}
      <div className="bg-violet-50 border-b border-violet-100 px-6 py-3">
        <div className="max-w-5xl mx-auto flex flex-wrap gap-6 text-xs text-violet-700">
          <span><strong>Green DB</strong> = overridden in Supabase (instant change)</span>
          <span><strong>Blue ENV</strong> = set via Vercel env var (needs redeploy)</span>
          <span><strong>Gray Default</strong> = hardcoded fallback</span>
          <span>Resolution order: DB &gt; ENV &gt; Default</span>
          <span>Cache TTL: 60s per server instance</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Search */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            placeholder="Filter flags…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm flex-1 max-w-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
          {filter && (
            <button onClick={() => setFilter('')}
              className="text-sm text-gray-500 hover:text-gray-700 px-2">
              ✕ Clear
            </button>
          )}
          <span className="self-center text-sm text-gray-500">
            {flags.filter(f => !filter || f.key.toLowerCase().includes(filter.toLowerCase())).length} / {flags.length} flags
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-violet-500 rounded-full animate-spin mx-auto mb-3"/>
            Loading flags…
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([category, rows]) => {
              const meta = CATEGORY_META[category] || { icon: '⚙️', label: category, color: 'gray' }
              return (
                <div key={category}>
                  <h2 className="flex items-center gap-2 text-base font-bold text-gray-800 mb-3">
                    <span>{meta.icon}</span> {meta.label}
                    <span className="text-xs font-normal text-gray-400 ml-1">({rows.length})</span>
                  </h2>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {rows.map((flag, idx) => {
                      const editVal = editing[flag.key]
                      const isDirty = editVal !== undefined
                      const isSaving = saving[flag.key]
                      const isSaved  = saved[flag.key]

                      return (
                        <div key={flag.key}
                          className={`px-5 py-4 ${idx < rows.length - 1 ? 'border-b border-gray-50' : ''} ${isDirty ? 'bg-amber-50/40' : ''}`}
                        >
                          <div className="flex items-start gap-4">
                            {/* Key + description */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <code className="text-sm font-bold text-violet-800 bg-violet-50 px-2 py-0.5 rounded">
                                  {flag.key}
                                </code>
                                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${SOURCE_BADGE[flag.source]}`}>
                                  {flag.source}
                                </span>
                                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                                  {flag.type}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{flag.description}</p>
                              {flag.options && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                  Options: {flag.options.join(' | ')}
                                </p>
                              )}
                              {flag.updated_by && (
                                <p className="text-xs text-gray-300 mt-0.5">
                                  Last changed by {flag.updated_by} · {new Date(flag.updated_at).toLocaleString()}
                                </p>
                              )}
                            </div>

                            {/* Value editor */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {/* Current DB value badge */}
                              {!isDirty && (
                                <span className={`text-sm font-mono font-bold px-3 py-1.5 rounded-lg border
                                  ${flag.resolvedValue === 'true' ? 'bg-green-50 text-green-700 border-green-200' :
                                    flag.resolvedValue === 'false' ? 'bg-red-50 text-red-600 border-red-200' :
                                    'bg-gray-50 text-gray-700 border-gray-200'}`}>
                                  {flag.resolvedValue.length > 20 ? flag.resolvedValue.slice(0, 20) + '…' : flag.resolvedValue}
                                </span>
                              )}

                              {/* Editor */}
                              {flag.type === 'bool' ? (
                                <button
                                  onClick={() => {
                                    const current = isDirty ? editVal : flag.resolvedValue
                                    handleEdit(flag.key, current === 'true' ? 'false' : 'true')
                                  }}
                                  className={`text-sm font-semibold px-4 py-2 rounded-xl border-2 transition-all min-w-[70px]
                                    ${(isDirty ? editVal : flag.resolvedValue) === 'true'
                                      ? 'bg-green-500 border-green-600 text-white'
                                      : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                                    }`}
                                >
                                  {(isDirty ? editVal : flag.resolvedValue) === 'true' ? 'ON' : 'OFF'}
                                </button>
                              ) : flag.type === 'enum' && flag.options ? (
                                <select
                                  value={isDirty ? editVal : flag.resolvedValue}
                                  onChange={e => handleEdit(flag.key, e.target.value)}
                                  className="text-sm border-2 border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-violet-400 font-mono"
                                >
                                  {flag.options.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type={flag.type === 'int' || flag.type === 'float' ? 'number' : 'text'}
                                  value={isDirty ? editVal : flag.resolvedValue}
                                  onChange={e => handleEdit(flag.key, e.target.value)}
                                  className="text-sm border-2 border-gray-200 rounded-xl px-3 py-2 font-mono w-32
                                             focus:outline-none focus:border-violet-400"
                                  step={flag.type === 'float' ? '0.01' : '1'}
                                />
                              )}

                              {/* Save / Reset buttons (when dirty) */}
                              {isDirty && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleSave(flag)}
                                    disabled={isSaving}
                                    className="text-xs bg-violet-600 text-white px-3 py-2 rounded-lg font-semibold
                                               hover:bg-violet-700 disabled:opacity-50 transition-colors min-w-[52px]"
                                  >
                                    {isSaving ? '…' : 'Save'}
                                  </button>
                                  <button
                                    onClick={() => handleReset(flag)}
                                    className="text-xs border border-gray-200 text-gray-500 px-2 py-2 rounded-lg hover:bg-gray-50"
                                    title="Reset to default"
                                  >
                                    ↺
                                  </button>
                                  <button
                                    onClick={() => setEditing(e => { const n={...e}; delete n[flag.key]; return n })}
                                    className="text-xs border border-gray-200 text-gray-500 px-2 py-2 rounded-lg hover:bg-gray-50"
                                    title="Cancel"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}

                              {isSaved && (
                                <span className="text-xs text-green-600 font-semibold">✓ Saved</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Documentation */}
        <div className="mt-10 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-800 mb-4">📖 How to change flags</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <p className="font-bold text-green-800 mb-1">🟢 Option A — Admin UI (this page)</p>
              <p className="text-green-700 text-xs">Edit above → Save. Propagates in ≤60s. No redeploy.</p>
              <p className="text-green-600 text-xs mt-1">Best for: feature toggles, experiment adjustments</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="font-bold text-blue-800 mb-1">🔵 Option B — Supabase Dashboard</p>
              <p className="text-blue-700 text-xs">Table Editor → feature_flags → edit value → Save row.</p>
              <code className="text-xs bg-blue-100 px-2 py-1 rounded block mt-1 break-all">
                supabase.com/dashboard/project/lpxhxmpzqjygsaawkrva
              </code>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="font-bold text-gray-800 mb-1">⚙️ Option C — Vercel env var</p>
              <p className="text-gray-600 text-xs">For flags that should be in version control or override DB.</p>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded block mt-1 break-all">
                vercel env add FLAG_TRIAL_PAGES production<br/>
                vercel redeploy --prebuilt --prod
              </code>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 font-medium mb-2">Propagation timeline</p>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded">DB change</span>
              <span>→</span>
              <span>Server cache expires (~60s)</span>
              <span>→</span>
              <span>Next client fetch (~55s)</span>
              <span>→</span>
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded">Flag active</span>
              <span className="ml-2 font-medium">Total: ≤ 115s worst case</span>
            </div>
          </div>
        </div>

        {/* Live test */}
        <div className="mt-4 bg-violet-50 rounded-xl p-4 text-xs text-violet-700 border border-violet-100">
          <strong>Live endpoint:</strong>{' '}
          <a href="/api/v1/config" target="_blank" rel="noopener noreferrer"
            className="underline font-mono">
            /api/v1/config
          </a>
          {' '}— returns public flags as JSON. Clients (useFlags hook) poll this endpoint every 55s.
        </div>
      </div>
    </div>
  )
}
