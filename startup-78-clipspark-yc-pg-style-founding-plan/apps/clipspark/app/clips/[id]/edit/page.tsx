'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ExportPanel } from '@/components/ExportPanel'
import { PerformanceEntryPanel } from '@/components/PerformanceEntryPanel'
import { useAnalytics } from '@/lib/analytics'
import { SmartTrimPanel } from '@/components/SmartTrimPanel'
import { CaptionStylePanel } from '@/components/CaptionStylePanel'
import { PublishTemplateDialog } from '@/components/PublishTemplateDialog'
import { parseWordTimings, parseSegments } from '@/lib/transcript-utils'
import { DEFAULT_BRAND_KIT } from '@/lib/caption-styles'
import type { CaptionStyleId, BrandKit } from '@/lib/caption-styles'
import type { Segment, WordTiming } from '@/lib/transcript-utils'

type Clip = {
  id: string
  job_id: string
  clip_index: number
  platform: string
  source_start_sec: number
  source_end_sec: number
  duration_sec: number
  heuristic_score: number
  heuristic_signals: string | Record<string, number>
  hook_type: string
  title: string
  hashtags: string | string[]
  transcript_excerpt: string
  render_status: string
  export_path: string | null
  export_url: string | null
  preview_url: string | null
  is_approved: boolean
  is_posted: boolean
  posted_url: string | null
}

type Signal = { key: string; label: string; value: number; color: string }

const SIGNAL_META: Record<string, { label: string; color: string }> = {
  hook_words:  { label: 'Hook Words',      color: 'bg-indigo-500' },
  energy:      { label: 'Energy',          color: 'bg-yellow-500' },
  question:    { label: 'Question Hook',   color: 'bg-green-500' },
  story:       { label: 'Story Moment',    color: 'bg-purple-500' },
  contrast:    { label: 'Contrast/Twist',  color: 'bg-orange-500' },
  numbers:     { label: 'Data/Numbers',    color: 'bg-blue-500' },
  pause:       { label: 'Dramatic Pause',  color: 'bg-pink-500' },
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  const ms = Math.round((sec % 1) * 10)
  return `${m}:${String(s).padStart(2, '0')}.${ms}`
}

function parseHashtags(h: string | string[] | null | undefined): string[] {
  if (!h) return []
  if (Array.isArray(h)) return h
  try { return JSON.parse(h) } catch { return [h] }
}

function parseSignals(s: string | Record<string, number> | null | undefined): Signal[] {
  if (!s) return []
  let obj: Record<string, number> = {}
  if (typeof s === 'string') { try { obj = JSON.parse(s) } catch { return [] } }
  else obj = s
  return Object.entries(obj)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([key, value]) => ({
      key, value,
      label: SIGNAL_META[key]?.label || key,
      color: SIGNAL_META[key]?.color || 'bg-gray-500',
    }))
}

export default function ClipEditorPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { track } = useAnalytics()
  const [clip, setClip] = useState<Clip | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showPublishTemplate, setShowPublishTemplate] = useState(false)
  const [error, setError] = useState('')

  // Title variants
  const [titleVariants, setTitleVariants] = useState<Array<{style: string; title: string; score: number}>>([])
  const [loadingTitles, setLoadingTitles] = useState(false)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)

  // OAuth status for export
  const [oauthStatus, setOauthStatus] = useState({
    youtube: { connected: false, username: null as string | null },
    linkedin: { connected: false, username: null as string | null },
  })

  // Editable state
  const [startSec, setStartSec] = useState(0)
  const [endSec, setEndSec] = useState(60)
  const [title, setTitle] = useState('')

  // New: caption + brand state
  const [captionStyle, setCaptionStyle] = useState<CaptionStyleId>('default')
  const [captionLanguage, setCaptionLanguage] = useState('en')
  const [brandKit, setBrandKit] = useState<BrandKit>(DEFAULT_BRAND_KIT)

  // Transcript data for smart trim
  const [transcriptSegments, setTranscriptSegments] = useState<Segment[]>([])
  const [transcriptWords, setTranscriptWords] = useState<WordTiming[]>([])
  const [totalDurationSec, setTotalDurationSec] = useState(0)
  const [hashtagText, setHashtagText] = useState('')

  const dirty = useRef(false)

  useEffect(() => {
    fetch(`/api/clips/${params.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setClip(d)
        setStartSec(d.source_start_sec ?? 0)
        setEndSec(d.source_end_sec ?? 60)
        setTitle(d.title || '')
        setHashtagText(parseHashtags(d.hashtags).join(' '))
        setLoading(false)
        // Load title variants and thumbnail in parallel
        loadTitleVariants(d.id)
        loadThumbnail(d.id)
        // Load transcript for smart trim
        if (d.job_id) {
          fetch(`/api/jobs/${d.job_id}`)
            .then(r => r.json())
            .then(job => {
              if (job.media_asset_id) {
                fetch(`/api/transcript/${job.media_asset_id}`)
                  .then(r => r.json())
                  .then(t => {
                    if (!t.error) {
                      setTranscriptSegments(parseSegments(t.segments))
                      setTranscriptWords(parseWordTimings(t.word_timings))
                      setTotalDurationSec(t.duration_sec || 0)
                    }
                  }).catch(() => {})
              }
            }).catch(() => {})
        }
        // Load OAuth status
        fetch('/api/connect/status').then(r => r.json()).then(s => {
          if (!s.error) setOauthStatus(s)
        }).catch(() => {})
      })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, [params.id])

  async function loadTitleVariants(clipId: string) {
    setLoadingTitles(true)
    try {
      const res = await fetch(`/api/clips/${clipId}/titles`)
      const data = await res.json()
      if (!data.error) setTitleVariants(data.variants || [])
    } catch {}
    setLoadingTitles(false)
  }

  async function loadThumbnail(clipId: string) {
    try {
      const res = await fetch(`/api/clips/${clipId}/thumbnail`)
      const data = await res.json()
      if (data.url) setThumbnailUrl(data.url)
    } catch {}
  }

  async function refreshTitles() {
    if (clip) loadTitleVariants(clip.id)
  }

  const duration = endSec - startSec
  const signals = parseSignals(clip?.heuristic_signals)
  const hashtags = hashtagText.split(/\s+/).filter(t => t.startsWith('#'))

  async function handleSave() {
    setSaving(true)
    setError('')
    const res = await fetch(`/api/clips/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_start_sec: startSec,
        source_end_sec: endSec,
        title,
        hashtags,
        caption_style: captionStyle,
        caption_language: captionLanguage,
        brand_kit: brandKit,
      }),
    })
    const updated = await res.json()
    if (!res.ok) { setError(updated.error || 'Save failed'); setSaving(false); return }
    setClip(updated)
    setSaving(false)
    setSaved(true)
    dirty.current = false
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleApprove() {
    const res = await fetch(`/api/clips/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_approved: true }),
    })
    const updated = await res.json()
    if (!res.ok) { setError(updated.error || 'Approval failed'); return }
    setClip(updated)
    track('clip_approved', {
      clip_id: params.id,
      score: clip?.heuristic_score,
      platform: clip?.platform,
      duration_sec: clip ? (clip.source_end_sec - clip.source_start_sec) : null,
    })
  }

  function onChangeStart(val: number) {
    setStartSec(Math.max(0, Math.min(val, endSec - 5)))
    dirty.current = true
  }
  function onChangeEnd(val: number) {
    setEndSec(Math.max(startSec + 5, val))
    dirty.current = true
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  )

  if (error && !clip) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-red-400">{error}</div>
  )

  if (!clip) return null

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <Link href={`/jobs/${clip.job_id}`} className="text-gray-500 hover:text-white text-sm">← Job</Link>
        <span className="text-sm font-medium text-gray-400">
          Clip {clip.clip_index} · {clip.platform}
        </span>
        <div className="flex items-center gap-2">
          {clip.is_approved && (
            <span className="text-xs bg-green-900/40 text-green-400 border border-green-800/40 px-2 py-1 rounded-full">
              ✓ Approved
            </span>
          )}
          <span className={`text-xs px-2 py-1 rounded-full border ${
            clip.render_status === 'preview_ready' ? 'bg-green-900/30 text-green-300 border-green-800/30' :
            clip.render_status === 'pending' ? 'bg-gray-800 text-gray-400 border-gray-700' :
            clip.render_status === 'rendering' ? 'bg-yellow-900/30 text-yellow-300 border-yellow-800/30' :
            'bg-gray-800 text-gray-400 border-gray-700'
          }`}>
            {clip.render_status}
          </span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Score badge */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Clip Editor</h1>
            <p className="text-gray-500 text-sm mt-0.5">Fine-tune your clip window, title, and hashtags</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-indigo-400">{Math.round((clip.heuristic_score || 0) * 100)}</div>
            <div className="text-xs text-gray-500">AI Score</div>
          </div>
        </div>

        {/* Heuristic signals */}
        {signals.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              Why this was selected - <span className="text-gray-400 normal-case font-normal">{clip.hook_type?.replace(/_/g, ' ')}</span>
            </p>
            {signals.map(sig => (
              <div key={sig.key} className="space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">{sig.label}</span>
                  <span className="text-gray-500">{Math.round(sig.value * 100)}%</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${sig.color}`} style={{ width: `${sig.value * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Preview player */}
        {clip.preview_url && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <video
              src={clip.preview_url}
              controls
              className="w-full max-h-64 object-contain bg-black"
              playsInline
            />
          </div>
        )}

        {/* Trim controls — Smart Trim Panel */}
        <SmartTrimPanel
          startSec={startSec}
          endSec={endSec}
          totalDurationSec={totalDurationSec || (clip.source_end_sec || 90) + 60}
          segments={transcriptSegments}
          words={transcriptWords}
          onChangeStart={onChangeStart}
          onChangeEnd={onChangeEnd}
        />

        {/* Caption Style + Language + Brand Kit */}
        <CaptionStylePanel
          captionStyle={captionStyle}
          captionLanguage={captionLanguage}
          brandKit={brandKit}
          onChangeCaptionStyle={id => { setCaptionStyle(id); dirty.current = true }}
          onChangeLanguage={lang => { setCaptionLanguage(lang); dirty.current = true }}
          onChangeBrandKit={kit => { setBrandKit(kit); dirty.current = true }}
          platform={clip.platform}
        />

        {/* Transcript excerpt */}
        {clip.transcript_excerpt && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Transcript excerpt</p>
            <p className="text-gray-300 text-sm leading-relaxed italic">
              &ldquo;{clip.transcript_excerpt.slice(0, 300)}{clip.transcript_excerpt.length > 300 ? '...' : ''}&rdquo;
            </p>
          </div>
        )}

        {/* Thumbnail preview */}
        {thumbnailUrl && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Thumbnail preview</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbnailUrl} alt="Thumbnail" className="w-full max-h-48 object-contain rounded-lg" />
            <p className="text-xs text-gray-600">Auto-generated · updates with title changes</p>
          </div>
        )}

        {/* Title variants */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">AI Title Suggestions</p>
            <button onClick={refreshTitles} disabled={loadingTitles}
              className="text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50">
              {loadingTitles ? 'Loading...' : '↻ Refresh'}
            </button>
          </div>
          {titleVariants.length > 0 ? (
            <div className="space-y-2">
              {titleVariants.map((v, i) => (
                <button key={i} onClick={() => { setTitle(v.title); dirty.current = true }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                    title === v.title
                      ? 'bg-indigo-900/40 border-indigo-600 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                  }`}>
                  <span className="text-xs text-gray-500 uppercase tracking-wide mr-2">{v.style}</span>
                  {v.title}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-600 italic">{loadingTitles ? 'Generating suggestions...' : 'No suggestions yet'}</p>
          )}
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-sm text-gray-400 font-medium">Title / Caption</label>
          <input
            type="text"
            value={title}
            onChange={e => { setTitle(e.target.value); dirty.current = true }}
            maxLength={150}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
          />
          <p className="text-xs text-gray-600 text-right">{title.length}/150</p>
        </div>

        {/* Hashtags */}
        <div className="space-y-1.5">
          <label className="text-sm text-gray-400 font-medium">Hashtags</label>
          <textarea
            value={hashtagText}
            onChange={e => { setHashtagText(e.target.value); dirty.current = true }}
            rows={2}
            placeholder="#Podcast #ContentCreator #Shorts"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-indigo-500 resize-none"
          />
          <div className="flex flex-wrap gap-1.5 mt-1">
            {hashtags.slice(0, 10).map(t => (
              <span key={t} className="text-xs bg-indigo-900/40 text-indigo-300 border border-indigo-800/30 px-2 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-800/40 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save changes'}
          </button>

          {!clip.is_approved && (
            <button
              onClick={handleApprove}
              className="px-5 py-3 bg-green-700 hover:bg-green-600 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              Approve clip
            </button>
          )}

          {clip.export_url && (
            <a
              href={clip.export_url}
              download
              className="px-5 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              ↓ Export
            </a>
          )}
        </div>

        {/* Export & Publish panel */}
        <ExportPanel
          clip={{
            id: clip.id,
            title: title || clip.title,
            export_url: clip.export_url,
            preview_url: clip.preview_url,
            platform: clip.platform,
            is_posted: clip.is_posted,
            posted_url: clip.posted_url,
            hashtags: clip.hashtags,
            duration_sec: clip.source_end_sec - clip.source_start_sec,
          }}
          oauthStatus={oauthStatus}
          onPublished={(platform, url) => {
            console.log('Published to', platform, url)
          }}
        />

        {/* Performance entry — shown when clip is posted */}
        {clip.is_posted && (
          <PerformanceEntryPanel
            clipId={clip.id}
            platform={clip.platform}
            provider={clip.platform === 'YouTube Shorts' ? 'youtube' : clip.platform === 'LinkedIn' ? 'linkedin' : undefined}
            postedUrl={clip.posted_url || undefined}
            isConnected={
              clip.platform === 'YouTube Shorts' ? oauthStatus.youtube?.connected :
              clip.platform === 'LinkedIn' ? oauthStatus.linkedin?.connected : false
            }
          />
        )}

        {/* Re-render hint */}
        {dirty.current && (
          <p className="text-xs text-gray-600 text-center">
            Saving new trim points will queue a re-render.
          </p>
        )}

        {/* Share template CTA */}
        {(clip.export_url || clip.preview_url) && (
          <div className="bg-gray-900/50 border border-dashed border-gray-700 rounded-xl p-4 text-center space-y-2">
            <p className="text-xs text-gray-500">
              Happy with how this clip looks? Share your caption style with the community.
            </p>
            <button
              onClick={() => setShowPublishTemplate(true)}
              className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-800/40 px-4 py-2 rounded-xl transition-colors"
            >
              📤 Share template with community
            </button>
          </div>
        )}
      </main>

      {/* Publish template dialog */}
      {showPublishTemplate && clip && (
        <PublishTemplateDialog
          clipId={clip.id}
          clipTitle={title || clip.title}
          platform={clip.platform}
          captionStyle={captionStyle}
          onClose={() => setShowPublishTemplate(false)}
          onPublished={() => setShowPublishTemplate(false)}
        />
      )}
    </div>
  )
}
