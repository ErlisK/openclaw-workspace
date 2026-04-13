'use client'
export const dynamic = 'force-dynamic'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PLATFORMS } from '@/lib/utils'
import { useAnalytics, EVENTS } from '@/lib/analytics'

type InputMode = 'url' | 'upload'
type UrlMeta = { title?: string; author?: string; thumbnail_url?: string; platform?: string; duration_sec?: number | null; valid: boolean; error?: string }

export default function UploadPage() {
  const router = useRouter()
  const { track } = useAnalytics()
  const fileRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<InputMode>('url')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [urlMeta, setUrlMeta] = useState<UrlMeta | null>(null)
  const [urlCheckTimer, setUrlCheckTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [form, setForm] = useState({
    url: '',
    title: '',
    clips_requested: 3,
    target_platforms: ['YouTube Shorts', 'LinkedIn'] as string[],
    template_id: 'podcast-pro-v02',
  })

  // Load segment defaults from localStorage (set during onboarding)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('cs_segment_defaults')
      if (stored) {
        const defaults = JSON.parse(stored)
        setForm(f => ({
          ...f,
          template_id: defaults.template_id || f.template_id,
          target_platforms: defaults.target_platforms || f.target_platforms,
        }))
      }
    } catch { /* ignore */ }
  }, [])

  function togglePlatform(p: string) {
    setForm(f => ({
      ...f,
      target_platforms: f.target_platforms.includes(p)
        ? f.target_platforms.filter(x => x !== p)
        : [...f.target_platforms, p],
    }))
  }

  // Debounced URL validation
  useEffect(() => {
    if (mode !== 'url' || !form.url || form.url.length < 10) {
      setUrlMeta(null)
      return
    }
    if (urlCheckTimer) clearTimeout(urlCheckTimer)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/ingest/url/validate?url=${encodeURIComponent(form.url)}`)
        const meta = await res.json()
        setUrlMeta(meta)
        if (meta.title && !form.title) {
          setForm(f => ({ ...f, title: meta.title }))
        }
      } catch {
        setUrlMeta({ valid: false, error: 'Could not validate URL' })
      }
    }, 600)
    setUrlCheckTimer(t)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.url, mode])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'upload' && !file) { setError('Please select a file'); return }
    if (mode === 'url' && !form.url) { setError('Please enter a URL'); return }
    if (!form.target_platforms.length) { setError('Select at least one platform'); return }

    setLoading(true)
    setError('')

    // Track upload started
    track(mode === 'url' ? EVENTS.URL_IMPORT_STARTED : EVENTS.UPLOAD_STARTED, {
      mode,
      platform: form.target_platforms[0],
      clips_requested: form.clips_requested,
      file_size_bytes: file?.size,
      file_type: file?.type,
    })

    try {
      // Step 1: Ingest (creates asset + job atomically, returns signed upload URL if upload)
      setProgress('Creating job...')
      const ingestPayload: Record<string, unknown> = {
        source_type: mode === 'url' ? 'url_import' : 'upload',
        title: form.title || undefined,
        clips_requested: form.clips_requested,
        target_platforms: form.target_platforms,
        template_id: form.template_id,
      }
      if (mode === 'url') {
        ingestPayload.source_url = form.url
      } else if (file) {
        ingestPayload.file_name = file.name
        ingestPayload.file_size_bytes = file.size
        ingestPayload.mime_type = file.type
      }

      const ingestRes = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ingestPayload),
      })
      const ingest = await ingestRes.json()
      if (!ingestRes.ok) {
        if (ingestRes.status === 402) {
          setError('Clip quota exceeded. Upgrade your plan to continue.')
        } else {
          setError(ingest.error || 'Failed to create job')
        }
        setLoading(false)
        return
      }

      const { asset_id, job_id, upload_url } = ingest

      // Step 2: If file upload, PUT to signed URL then mark complete
      if (mode === 'upload' && file && upload_url) {
        setProgress(`Uploading ${(file.size / 1_048_576).toFixed(1)} MB...`)
        const uploadRes = await fetch(upload_url, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        })
        if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`)

        // Mark upload complete so proxy worker picks it up
        setProgress('Finalising...')
        await fetch(`/api/ingest/${asset_id}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storage_path: ingest.upload_path,
            file_size_bytes: file.size,
            mime_type: file.type,
          }),
        })
      }

      // For URL imports the job starts as 'queued' — proxy worker picks it up
      setProgress('Job queued!')
      track(mode === 'url' ? EVENTS.URL_IMPORT_COMPLETED : EVENTS.UPLOAD_COMPLETED, {
        job_id,
        asset_id,
        mode,
        platform: form.target_platforms[0],
      })
      router.push(`/jobs/${job_id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
      setLoading(false)
    }
  }

  const TEMPLATES = [
    { id: 'podcast-pro-v02', label: 'Podcast Pro', desc: 'Waveform + subtitles' },
    { id: 'tiktok-native-v02', label: 'TikTok Native', desc: 'Bold captions, trending' },
    { id: 'linkedin-pro-v02', label: 'LinkedIn Pro', desc: 'Clean B2B look' },
    { id: 'comedy-kinetic-v02', label: 'Comedy Kinetic', desc: 'Punchy + fast cuts' },
    { id: 'audio-only-v02', label: 'Audio Waveform', desc: 'No video required' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <a href="/dashboard" className="text-gray-500 hover:text-white text-sm">← Dashboard</a>
        <span className="text-sm font-medium">New clip job</span>
        <span />
      </nav>

      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Add your episode</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Source picker */}
          <div className="flex gap-2 p-1 bg-gray-900 rounded-xl w-fit">
            {(['url', 'upload'] as const).map(m => (
              <button key={m} type="button"
                onClick={() => { setMode(m); setUrlMeta(null) }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === m ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {m === 'url' ? '🔗 YouTube / URL' : '📁 Upload file'}
              </button>
            ))}
          </div>

          {mode === 'url' ? (
            <div className="space-y-2">
              <label className="text-sm text-gray-400">YouTube or media URL</label>
              <input
                type="url"
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500"
              />
              {/* URL preview */}
              {urlMeta && (
                <div className={`flex items-start gap-3 mt-2 p-3 rounded-xl border text-sm ${urlMeta.valid ? 'bg-green-900/20 border-green-800/30' : 'bg-red-900/20 border-red-800/30'}`}>
                  {urlMeta.thumbnail_url && urlMeta.valid && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={urlMeta.thumbnail_url} alt="" className="w-16 h-10 object-cover rounded" />
                  )}
                  <div>
                    {urlMeta.valid ? (
                      <>
                        <p className="font-medium text-green-300">{urlMeta.title || 'Valid media URL'}</p>
                        {urlMeta.author && <p className="text-gray-400 text-xs mt-0.5">{urlMeta.author}</p>}
                      </>
                    ) : (
                      <p className="text-red-300">{urlMeta.error || 'Invalid URL'}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                const f = e.dataTransfer.files[0]
                if (f) setFile(f)
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept="audio/*,video/*,.mp3,.mp4,.m4a,.wav,.mov,.webm"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
              {file ? (
                <div className="space-y-1">
                  <p className="font-medium text-white">{file.name}</p>
                  <p className="text-gray-400 text-sm">{(file.size / 1_048_576).toFixed(1)} MB</p>
                  <button type="button" onClick={e => { e.stopPropagation(); setFile(null) }} className="text-xs text-gray-600 hover:text-red-400">Remove</button>
                </div>
              ) : (
                <div className="space-y-1 text-gray-500">
                  <p className="text-2xl">📤</p>
                  <p className="text-sm">Drop your file or click to browse</p>
                  <p className="text-xs">MP3, MP4, M4A, WAV, MOV · up to 500 MB</p>
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1">
            <label className="text-sm text-gray-400">Episode title</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Optional — auto-filled from URL"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Platforms */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Target platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button key={p} type="button"
                  onClick={() => togglePlatform(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    form.target_platforms.includes(p)
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Template */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Visual template</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TEMPLATES.map(t => (
                <button key={t.id} type="button"
                  onClick={() => setForm(f => ({ ...f, template_id: t.id }))}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    form.template_id === t.id
                      ? 'bg-indigo-900/30 border-indigo-600 text-white'
                      : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <p className="text-xs font-semibold">{t.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Clips requested */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Clips to generate: <span className="text-white font-semibold">{form.clips_requested}</span></label>
            <input type="range" min={1} max={10} value={form.clips_requested}
              onChange={e => setForm(f => ({ ...f, clips_requested: parseInt(e.target.value) }))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-xs text-gray-600">
              <span>1</span><span>5</span><span>10</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/30 border border-red-800/50 text-red-300 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? progress || 'Working...' : `Generate ${form.clips_requested} clip${form.clips_requested > 1 ? 's' : ''} →`}
          </button>
        </form>
      </main>
    </div>
  )
}
