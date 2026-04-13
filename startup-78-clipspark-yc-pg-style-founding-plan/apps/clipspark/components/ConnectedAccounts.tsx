'use client'
import { useState, useEffect } from 'react'

export function ConnectedAccounts() {
  const [status, setStatus] = useState<Record<string, {connected: boolean; username: string|null}> | null>(null)

  useEffect(() => {
    fetch('/api/connect/status').then(r => r.json()).then(d => {
      if (!d.error) setStatus(d)
    }).catch(() => {})
  }, [])

  async function disconnect(provider: string) {
    await fetch(`/api/connect/status?provider=${provider}`, { method: 'DELETE' })
    setStatus(prev => prev ? { ...prev, [provider]: { connected: false, username: null } } : prev)
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
      <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wide">Connected Accounts</h2>
      <p className="text-xs text-gray-600">Connect once to publish clips directly from the editor.</p>
      {([
        { provider: 'youtube', label: 'YouTube Shorts', icon: '▶️', connectPath: '/api/connect/youtube/auth?return_to=/settings' },
        { provider: 'linkedin', label: 'LinkedIn', icon: '💼', connectPath: '/api/connect/linkedin/auth?return_to=/settings' },
      ] as const).map(({ provider, label, icon, connectPath }) => {
        const s = status?.[provider]
        return (
          <div key={provider} className="flex items-center justify-between py-2 border-t border-gray-800 first:border-0 first:pt-0">
            <div className="flex items-center gap-2">
              <span>{icon}</span>
              <div>
                <p className="text-sm text-white">{label}</p>
                {s?.connected && s.username && (
                  <p className="text-xs text-gray-500">{s.username}</p>
                )}
              </div>
            </div>
            {!status ? (
              <span className="text-xs text-gray-600">Loading…</span>
            ) : s?.connected ? (
              <button onClick={() => disconnect(provider)} className="text-xs text-red-500 hover:text-red-400">
                Disconnect
              </button>
            ) : (
              <a href={connectPath} className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-800 px-3 py-1 rounded-lg">
                Connect
              </a>
            )}
          </div>
        )
      })}
      {['🎵 TikTok', '📸 Instagram Reels'].map(p => (
        <div key={p} className="flex items-center justify-between py-2 border-t border-gray-800">
          <p className="text-sm text-white">{p}</p>
          <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded">Deep-link (manual)</span>
        </div>
      ))}
    </div>
  )
}
