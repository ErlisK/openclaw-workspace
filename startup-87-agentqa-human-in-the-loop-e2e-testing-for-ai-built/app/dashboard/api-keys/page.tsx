'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newKeyRaw, setNewKeyRaw] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadKeys() {
    setLoading(true)
    const res = await fetch('/api/agent-keys')
    if (res.ok) {
      const json = await res.json()
      setKeys(json.keys)
    }
    setLoading(false)
  }

  useEffect(() => { loadKeys() }, [])

  async function createKey() {
    if (!newKeyName.trim()) return
    setCreating(true)
    setError(null)
    const res = await fetch('/api/agent-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newKeyName.trim() }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error)
    } else {
      setNewKeyRaw(json.key.raw_key)
      setNewKeyName('')
      await loadKeys()
    }
    setCreating(false)
  }

  async function revokeKey(id: string) {
    if (!confirm('Revoke this API key? This cannot be undone.')) return
    const res = await fetch(`/api/agent-keys?id=${id}`, { method: 'DELETE' })
    if (res.ok) await loadKeys()
  }

  async function copyKey() {
    if (!newKeyRaw) return
    await navigator.clipboard.writeText(newKeyRaw)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">← Dashboard</Link>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-gray-600 mt-1">
            Use these keys to let AI agents submit test jobs via the{' '}
            <Link href="/docs/api-reference" className="text-indigo-600 hover:underline">Agent API</Link>.
          </p>
        </div>

        {/* New key revealed */}
        {newKeyRaw && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm font-semibold text-green-800 mb-2">
              ✅ API key created — copy it now. It won&apos;t be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white border border-green-200 rounded px-3 py-2 text-sm font-mono text-gray-800 break-all">
                {newKeyRaw}
              </code>
              <button
                onClick={copyKey}
                className="shrink-0 px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button
              onClick={() => setNewKeyRaw(null)}
              className="mt-2 text-xs text-green-700 hover:underline"
            >
              I&apos;ve saved it — dismiss
            </button>
          </div>
        )}

        {/* Create form */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Create new key</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Key name (e.g. Cursor agent)"
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createKey()}
              maxLength={100}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={createKey}
              disabled={creating || !newKeyName.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        {/* Key list */}
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {loading ? (
            <div className="p-6 text-center text-sm text-gray-500">Loading…</div>
          ) : keys.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              No API keys yet. Create one above to get started.
            </div>
          ) : (
            keys.map(key => (
              <div key={key.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900">{key.name}</span>
                    {key.revoked_at && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Revoked</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    <code className="bg-gray-100 px-1 rounded">{key.key_prefix}…</code>
                    {' · '}Created {new Date(key.created_at).toLocaleDateString()}
                    {key.last_used_at && ` · Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
                  </div>
                </div>
                {!key.revoked_at && (
                  <button
                    onClick={() => revokeKey(key.id)}
                    className="text-xs text-red-600 hover:text-red-800 font-medium"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Docs link */}
        <div className="mt-8 text-sm text-gray-500">
          Need help?{' '}
          <Link href="/docs/api-reference" className="text-indigo-600 hover:underline">
            Read the Agent API reference →
          </Link>
        </div>
      </div>
    </div>
  )
}
