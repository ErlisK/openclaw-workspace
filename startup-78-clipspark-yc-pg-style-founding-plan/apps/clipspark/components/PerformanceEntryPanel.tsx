'use client'
import { useState } from 'react'
import { useAnalytics } from '@/lib/analytics'

interface Props {
  clipId: string
  publishLogId?: string
  platform: string
  provider?: string
  postedUrl?: string
  isConnected?: boolean
  onSaved?: (perf: Record<string, unknown>) => void
}

const TIKTOK_INSTAGRAM_HELP = `Open your TikTok/Instagram analytics,
find this clip, and enter the numbers below.`

export function PerformanceEntryPanel({
  clipId, publishLogId, platform, provider,
  postedUrl, isConnected = false, onSaved,
}: Props) {
  const { track } = useAnalytics()
  const [mode, setMode] = useState<'prompt' | 'auto-fetching' | 'manual' | 'saved'>('prompt')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fetchError, setFetchError] = useState('')

  const [form, setForm] = useState({
    views: '',
    likes: '',
    comments: '',
    shares: '',
    impressions: '',
    completion_rate: '',
  })

  const canAutoFetch = isConnected && (provider === 'youtube' || provider === 'linkedin') && postedUrl

  async function handleAutoFetch() {
    setMode('auto-fetching')
    setFetchError('')
    try {
      const res = await fetch('/api/performance/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clip_id: clipId,
          publish_log_id: publishLogId,
          posted_url: postedUrl,
          platform,
          provider,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        track('performance_fetched', { clip_id: clipId, platform, source: 'auto' })
        onSaved?.(data)
        setMode('saved')
      } else {
        setFetchError(data.error || 'Could not fetch automatically')
        setMode('manual')
      }
    } catch (e) {
      setFetchError(String(e))
      setMode('manual')
    }
  }

  async function handleManualSave() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/performance/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clip_id: clipId,
          publish_log_id: publishLogId,
          platform,
          views: form.views,
          likes: form.likes,
          comments: form.comments,
          shares: form.shares,
          impressions: form.impressions,
          completion_rate: form.completion_rate
            ? (parseFloat(form.completion_rate) / 100).toString()
            : null,
          hours_after_publish: 48,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        track('performance_manual_entry', { clip_id: clipId, platform })
        onSaved?.(data)
        setMode('saved')
      } else {
        setError(data.error || 'Failed to save')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  if (mode === 'saved') {
    return (
      <div className="bg-green-900/20 border border-green-800/30 rounded-xl p-4 text-center">
        <div className="text-green-400 text-sm font-medium mb-1">✓ Performance data saved</div>
        <p className="text-xs text-gray-500">
          This data helps improve clip scoring for you and the community.
        </p>
      </div>
    )
  }

  if (mode === 'auto-fetching') {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
        <div className="text-gray-400 text-sm">Fetching {platform} analytics…</div>
      </div>
    )
  }

  if (mode === 'prompt') {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <div>
          <p className="text-xs font-medium text-gray-300 mb-1">📊 How did this clip perform?</p>
          <p className="text-xs text-gray-500">
            Opt-in: sharing performance data improves clip scoring and helps the whole community.
          </p>
        </div>
        <div className="flex gap-2">
          {canAutoFetch && (
            <button
              onClick={handleAutoFetch}
              className="flex-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-3 rounded-xl transition-colors font-medium"
            >
              📥 Fetch from {provider === 'youtube' ? 'YouTube' : 'LinkedIn'}
            </button>
          )}
          <button
            onClick={() => setMode('manual')}
            className="flex-1 text-xs border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white py-2 px-3 rounded-xl transition-colors"
          >
            ✏️ Enter manually
          </button>
        </div>
      </div>
    )
  }

  // manual form
  const isTikTokOrIG = platform === 'TikTok' || platform === 'Instagram Reels'

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-300">📊 Enter {platform} performance</p>
        <button onClick={() => setMode('prompt')} className="text-xs text-gray-600 hover:text-gray-400">✕</button>
      </div>

      {fetchError && (
        <div className="text-xs text-yellow-400 bg-yellow-900/20 rounded-xl p-2">{fetchError}</div>
      )}

      {isTikTokOrIG && (
        <p className="text-xs text-gray-600 whitespace-pre-line">{TIKTOK_INSTAGRAM_HELP}</p>
      )}

      {error && <div className="text-xs text-red-400">{error}</div>}

      <div className="grid grid-cols-2 gap-2">
        {[
          { key: 'views', label: 'Views', placeholder: '1200' },
          { key: 'likes', label: 'Likes', placeholder: '48' },
          { key: 'comments', label: 'Comments', placeholder: '5' },
          { key: 'shares', label: 'Shares', placeholder: '12' },
          { key: 'impressions', label: 'Impressions', placeholder: '3500' },
          { key: 'completion_rate', label: '% Completion', placeholder: '42' },
        ].map(f => (
          <div key={f.key}>
            <label className="text-xs text-gray-500 block mb-0.5">{f.label}</label>
            <input
              type="number"
              value={form[f.key as keyof typeof form]}
              onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              min={0}
              className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2.5 py-1.5 placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleManualSave}
          disabled={saving || !form.views}
          className="flex-1 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2 rounded-xl transition-colors font-medium"
        >
          {saving ? 'Saving…' : 'Save performance data'}
        </button>
        <button onClick={() => setMode('prompt')} className="text-xs text-gray-600 px-3">Skip</button>
      </div>

      <p className="text-xs text-gray-700">
        Your video never leaves your account. Only metrics are stored and used to improve scoring.
      </p>
    </div>
  )
}
