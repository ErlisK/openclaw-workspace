'use client'
import { useState } from 'react'
import Link from 'next/link'

type Template = {
  id: string
  name: string
  description?: string
  version?: string
  is_system?: boolean
  platforms?: string[]
  use_cases?: string[]
  tags?: string[]
  times_used?: number
  saves_count?: number
  upvotes_count?: number
  avg_views_48h?: number
  avg_completion?: number
  thumbnail_url?: string
  preview_clip_url?: string
  example_clip_url?: string
  fork_of?: string | null
  category?: string
  creator_name?: string | null
  is_saved: boolean
  is_upvoted: boolean
}

interface Props {
  template: Template
  showActions?: boolean
}

const PLATFORM_COLORS: Record<string, string> = {
  'YouTube Shorts': 'bg-red-900/30 text-red-400',
  'TikTok': 'bg-pink-900/30 text-pink-400',
  'Instagram Reels': 'bg-purple-900/30 text-purple-400',
  'LinkedIn': 'bg-blue-900/30 text-blue-400',
}

const CATEGORY_COLORS: Record<string, string> = {
  podcast: 'bg-indigo-900/30 text-indigo-300',
  professional: 'bg-blue-900/30 text-blue-300',
  'short-form': 'bg-pink-900/30 text-pink-300',
  entertainment: 'bg-yellow-900/30 text-yellow-300',
  general: 'bg-gray-800 text-gray-400',
}

export function TemplateCard({ template: t, showActions = true }: Props) {
  const [saved, setSaved] = useState(t.is_saved)
  const [upvoted, setUpvoted] = useState(t.is_upvoted)
  const [upvoteCount, setUpvoteCount] = useState(t.upvotes_count || 0)
  const [saving, setSaving] = useState(false)
  const [upvoting, setUpvoting] = useState(false)

  async function toggleSave(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setSaving(true)
    try {
      const res = await fetch(`/api/templates/${t.id}/save`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) setSaved(data.saved)
    } finally {
      setSaving(false)
    }
  }

  async function toggleUpvote(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (upvoting) return
    setUpvoting(true)
    try {
      const res = await fetch(`/api/templates/${t.id}/upvote`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setUpvoted(data.upvoted)
        setUpvoteCount(data.upvotes_count)
      }
    } finally {
      setUpvoting(false)
    }
  }

  return (
    <div className="group border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all bg-gray-900/30 hover:bg-gray-900/50 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h3 className="font-semibold text-sm truncate">{t.name}</h3>
            {t.is_system && (
              <span className="text-xs bg-indigo-900/40 text-indigo-300 px-1.5 py-0.5 rounded-full flex-shrink-0">official</span>
            )}
            {t.fork_of && (
              <span className="text-xs text-gray-600 flex-shrink-0">🍴 forked</span>
            )}
          </div>
          {t.creator_name && !t.is_system && (
            <p className="text-xs text-gray-600">by {t.creator_name}</p>
          )}
        </div>

        {/* Category badge */}
        {t.category && (
          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${CATEGORY_COLORS[t.category] || CATEGORY_COLORS.general}`}>
            {t.category}
          </span>
        )}
      </div>

      {/* Description */}
      {t.description && (
        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{t.description}</p>
      )}

      {/* Platforms */}
      {t.platforms && t.platforms.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {t.platforms.map(p => (
            <span key={p} className={`text-xs px-2 py-0.5 rounded-full ${PLATFORM_COLORS[p] || 'bg-gray-800 text-gray-400'}`}>
              {p}
            </span>
          ))}
        </div>
      )}

      {/* Tags */}
      {t.tags && t.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {t.tags.slice(0, 5).map(tag => (
            <span key={tag} className="text-xs text-gray-600 bg-gray-800/50 px-1.5 py-0.5 rounded">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Metrics row */}
      <div className="flex items-center gap-3 text-xs text-gray-600 border-t border-gray-800/60 pt-2.5 mt-auto">
        {(t.times_used || 0) > 0 && (
          <span>{(t.times_used || 0).toLocaleString()} uses</span>
        )}
        {(t.saves_count || 0) > 0 && (
          <span>💾 {t.saves_count}</span>
        )}
        {t.avg_views_48h && t.avg_views_48h > 0 && (
          <span>
            👁 {t.avg_views_48h >= 1000
              ? `${(t.avg_views_48h / 1000).toFixed(1)}k`
              : t.avg_views_48h} avg views
          </span>
        )}
      </div>

      {showActions && (
        /* Action row */
        <div className="flex items-center gap-2">
          {/* Upvote */}
          <button
            onClick={toggleUpvote}
            disabled={upvoting}
            title="Upvote this template"
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
              upvoted
                ? 'border-orange-700 bg-orange-900/30 text-orange-300'
                : 'border-gray-700 text-gray-500 hover:border-orange-700/60 hover:text-orange-400'
            }`}
          >
            <span>{upvoted ? '▲' : '△'}</span>
            <span>{upvoteCount > 0 ? upvoteCount : 'Upvote'}</span>
          </button>

          {/* Save */}
          <button
            onClick={toggleSave}
            disabled={saving}
            title={saved ? 'Remove from library' : 'Save to library'}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
              saved
                ? 'border-indigo-700 bg-indigo-900/30 text-indigo-300'
                : 'border-gray-700 text-gray-500 hover:border-indigo-700/60 hover:text-indigo-400'
            }`}
          >
            {saving ? '…' : saved ? '✓ Saved' : '+ Save'}
          </button>

          {/* Use in job */}
          <Link
            href={`/upload?template_id=${t.id}`}
            className="ml-auto text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            onClick={e => e.stopPropagation()}
          >
            Use →
          </Link>
        </div>
      )}
    </div>
  )
}
