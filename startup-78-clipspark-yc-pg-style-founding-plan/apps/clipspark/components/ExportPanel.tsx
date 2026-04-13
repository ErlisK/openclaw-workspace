'use client'

import { useState } from 'react'
import { useAnalytics, EVENTS } from '@/lib/analytics'
import { tiktokShareUrl, instagramShareUrl, PLATFORM_SPECS } from '@/lib/export'

interface Clip {
  id: string
  title: string | null
  export_url: string | null
  preview_url: string | null
  platform: string
  is_posted: boolean
  posted_url: string | null
  hashtags: unknown
  duration_sec: number | null
}

interface OAuthStatus {
  youtube: { connected: boolean; username: string | null }
  linkedin: { connected: boolean; username: string | null }
}

interface Props {
  clip: Clip
  oauthStatus: OAuthStatus
  onPublished?: (platform: string, url: string) => void
}

export function ExportPanel({ clip, oauthStatus, onPublished }: Props) {
  const [publishing, setPublishing] = useState<string | null>(null)
  const [published, setPublished] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { track } = useAnalytics()

  const exportUrl = clip.export_url || clip.preview_url
  const isWatermarked = !clip.export_url && !!clip.preview_url
  const platform = clip.platform || 'YouTube Shorts'
  const specs = PLATFORM_SPECS[platform] || PLATFORM_SPECS['YouTube Shorts']

  async function publishTo(provider: 'youtube' | 'linkedin') {
    setPublishing(provider)
    setErrors(prev => ({ ...prev, [provider]: '' }))
    track(EVENTS.EXPORT_STARTED, { platform: provider, clip_id: clip.id })

    try {
      const res = await fetch(`/api/clips/${clip.id}/publish/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.connect_url) {
          // Need to connect account
          window.location.href = `${data.connect_url}?return_to=${encodeURIComponent(`/clips/${clip.id}/edit`)}`
          return
        }
        setErrors(prev => ({ ...prev, [provider]: data.error || 'Upload failed' }))
      } else {
        setPublished(prev => ({ ...prev, [provider]: data.posted_url }))
        onPublished?.(provider, data.posted_url)
      }
    } catch (e) {
      setErrors(prev => ({ ...prev, [provider]: String(e) }))
    }
    setPublishing(null)
  }

  function handleTikTokShare() {
    track(EVENTS.EXPORT_STARTED, { platform: 'tiktok', clip_id: clip.id, method: 'deep_link' })
    const title = clip.title || 'ClipSpark clip'
    window.open(tiktokShareUrl(exportUrl || '', title), '_blank')
  }

  function handleInstagramShare() {
    track(EVENTS.EXPORT_STARTED, { platform: 'instagram', clip_id: clip.id, method: 'deep_link' })
    window.open(instagramShareUrl(), '_blank')
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-800">
        <h3 className="font-semibold text-white">Export &amp; Publish</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {isWatermarked
            ? 'Preview quality (240p, watermarked). Upgrade to Pro for HD export.'
            : 'Full quality export ready'}
        </p>
      </div>

      <div className="p-5 space-y-3">
        {/* File download */}
        {exportUrl && (
          <div className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📥</span>
              <div>
                <p className="text-sm font-medium text-white">Download file</p>
                <p className="text-xs text-gray-500">
                  {isWatermarked ? 'MP4 · 240p · watermarked' : `MP4 · ${platform}`}
                </p>
              </div>
            </div>
            <a
              href={exportUrl}
              download
              onClick={() => track(EVENTS.EXPORT_DOWNLOAD, { clip_id: clip.id, watermarked: isWatermarked })}
              className="text-sm text-indigo-400 hover:text-indigo-300 font-medium px-3 py-1.5 rounded-lg border border-indigo-800 hover:border-indigo-600 transition-colors"
            >
              Download
            </a>
          </div>
        )}

        {/* YouTube Shorts */}
        <PlatformRow
          icon="▶️"
          name="YouTube Shorts"
          description={
            oauthStatus.youtube.connected
              ? `Connected as ${oauthStatus.youtube.username || 'YouTube Channel'}`
              : 'Connect your channel to publish'
          }
          connected={oauthStatus.youtube.connected}
          connectUrl={`/api/connect/youtube/auth?return_to=${encodeURIComponent(`/clips/${clip.id}/edit`)}`}
          postedUrl={published.youtube || (clip.is_posted && clip.platform === 'YouTube Shorts' ? clip.posted_url : null)}
          loading={publishing === 'youtube'}
          error={errors.youtube}
          onPublish={() => publishTo('youtube')}
          disabled={!exportUrl}
          specs={specs}
        />

        {/* LinkedIn */}
        <PlatformRow
          icon="💼"
          name="LinkedIn"
          description={
            oauthStatus.linkedin.connected
              ? `Connected as ${oauthStatus.linkedin.username || 'LinkedIn Profile'}`
              : 'Connect your LinkedIn profile'
          }
          connected={oauthStatus.linkedin.connected}
          connectUrl={`/api/connect/linkedin/auth?return_to=${encodeURIComponent(`/clips/${clip.id}/edit`)}`}
          postedUrl={published.linkedin || (clip.is_posted && clip.platform === 'LinkedIn' ? clip.posted_url : null)}
          loading={publishing === 'linkedin'}
          error={errors.linkedin}
          onPublish={() => publishTo('linkedin')}
          disabled={!exportUrl}
          specs={PLATFORM_SPECS['LinkedIn']}
        />

        {/* TikTok deep link */}
        <div className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎵</span>
            <div>
              <p className="text-sm font-medium text-white">TikTok</p>
              <p className="text-xs text-gray-500">Opens TikTok upload page</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 bg-gray-700 px-2 py-0.5 rounded">manual</span>
            <button
              onClick={handleTikTokShare}
              disabled={!exportUrl}
              className="text-sm text-gray-300 hover:text-white font-medium px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors disabled:opacity-40"
            >
              Open ↗
            </button>
          </div>
        </div>

        {/* Instagram Reels deep link */}
        <div className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📸</span>
            <div>
              <p className="text-sm font-medium text-white">Instagram Reels</p>
              <p className="text-xs text-gray-500">Download, then upload in the Instagram app</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 bg-gray-700 px-2 py-0.5 rounded">manual</span>
            <button
              onClick={handleInstagramShare}
              disabled={!exportUrl}
              className="text-sm text-gray-300 hover:text-white font-medium px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors disabled:opacity-40"
            >
              Open ↗
            </button>
          </div>
        </div>

        {/* Upgrade CTA for watermarked */}
        {isWatermarked && (
          <div className="bg-indigo-950/50 border border-indigo-800/30 rounded-xl p-4 text-center">
            <p className="text-sm text-indigo-300 font-medium">Want HD, watermark-free exports?</p>
            <p className="text-xs text-indigo-400/70 mt-1">Upgrade to Pro for full-resolution files</p>
            <a
              href="/pricing"
              className="inline-block mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Upgrade to Pro →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Platform row component ────────────────────────────────────────────────────
function PlatformRow({
  icon, name, description, connected, connectUrl,
  postedUrl, loading, error, onPublish, disabled, specs,
}: {
  icon: string
  name: string
  description: string
  connected: boolean
  connectUrl: string
  postedUrl: string | null | undefined
  loading: boolean
  error: string
  onPublish: () => void
  disabled: boolean
  specs: { maxSec: number; aspectRatio: string; maxMb: number }
}) {
  if (postedUrl) {
    return (
      <div className="flex items-center justify-between bg-emerald-950/30 border border-emerald-800/30 rounded-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <p className="text-sm font-medium text-emerald-400">Published to {name}</p>
            <a href={postedUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-emerald-500 hover:underline truncate block max-w-[200px]">
              View post ↗
            </a>
          </div>
        </div>
        <span className="text-emerald-500 text-lg">✓</span>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-xl px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <p className="text-sm font-medium text-white">{name}</p>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
        </div>
        {connected ? (
          <button
            onClick={onPublish}
            disabled={loading || disabled}
            className="text-sm text-white font-medium px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-50 min-w-[80px] text-center"
          >
            {loading ? (
              <span className="animate-pulse">Uploading…</span>
            ) : 'Publish'}
          </button>
        ) : (
          <a
            href={connectUrl}
            className="text-sm text-indigo-400 hover:text-indigo-300 font-medium px-3 py-1.5 rounded-lg border border-indigo-800 hover:border-indigo-600 transition-colors"
          >
            Connect
          </a>
        )}
      </div>
      {error && <p className="text-red-400 text-xs mt-2 pl-11">{error}</p>}
    </div>
  )
}
