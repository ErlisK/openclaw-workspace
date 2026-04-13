'use client'
import { useState } from 'react'
import { useAnalytics } from '@/lib/analytics'

interface Props {
  clipId: string
  clipTitle?: string
  platform?: string
  captionStyle?: string
  templateId?: string      // existing template being used (to offer fork/share of it)
  onClose: () => void
  onPublished?: (templateId: string) => void
}

const CATEGORIES = [
  { id: 'podcast', label: '🎙️ Podcast' },
  { id: 'professional', label: '💼 Professional' },
  { id: 'short-form', label: '📱 Short-form' },
  { id: 'entertainment', label: '😂 Entertainment' },
  { id: 'education', label: '📚 Education' },
  { id: 'general', label: '✨ General' },
]

const PLATFORM_OPTIONS = ['YouTube Shorts', 'TikTok', 'Instagram Reels', 'LinkedIn']

export function PublishTemplateDialog({ clipId, clipTitle, platform, templateId, onClose, onPublished }: Props) {
  const { track } = useAnalytics()
  const [step, setStep] = useState<'confirm' | 'form' | 'done'>('confirm')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: clipTitle ? `${clipTitle.slice(0, 40)} Style` : '',
    description: '',
    category: 'podcast',
    platforms: platform ? [platform] : ['YouTube Shorts'],
    tags: '',
    is_fork: false,
  })

  async function handlePublish() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setLoading(true)
    setError('')

    try {
      const tagsArr = form.tags.split(/[,\s]+/).map(t => t.trim().replace('#', '')).filter(Boolean)

      // Build the template config from the clip's caption settings (fetched from clip API)
      const clipRes = await fetch(`/api/clips/${clipId}`)
      const clip = await clipRes.json()

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        platforms: form.platforms,
        tags: tagsArr,
        fork_of: form.is_fork ? templateId : null,
        // Capture the config from this clip's settings
        config: {
          caption_style: clip.caption_style || 'default',
          caption_language: clip.caption_language || 'en',
          platform: clip.platform,
          source_template: templateId || null,
        },
        example_clip_url: clip.export_url || clip.preview_url || null,
        preview_clip_url: clip.preview_url || null,
      }

      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) { setError(data.error || 'Failed to publish'); return }

      track('template_published', {
        template_id: data.id,
        clip_id: clipId,
        category: form.category,
        platforms: form.platforms,
      })

      setStep('done')
      onPublished?.(data.id)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  if (step === 'done') {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <div className="text-4xl">🎉</div>
          <h3 className="text-lg font-bold">Template published!</h3>
          <p className="text-gray-400 text-sm">
            Your template is now live in the community library. Other creators can find, save, and upvote it.
          </p>
          <div className="flex gap-3 justify-center">
            <a
              href="/templates"
              className="text-sm text-indigo-400 hover:text-indigo-300 border border-indigo-700 px-4 py-2 rounded-xl transition-colors"
            >
              View in library →
            </a>
            <button
              onClick={onClose}
              className="text-sm text-gray-400 hover:text-white px-4 py-2 rounded-xl border border-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'confirm') {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Share this clip&rsquo;s template?</h3>
            <button onClick={onClose} className="text-gray-600 hover:text-white">✕</button>
          </div>
          <p className="text-gray-400 text-sm">
            Publishing a template lets other creators use your exact caption style, font, and layout.
            Your clip won&rsquo;t be shared — just the style settings.
          </p>
          <div className="bg-gray-800/60 rounded-xl p-3 text-xs text-gray-400 space-y-1">
            <div>✓ Caption style &amp; positioning</div>
            <div>✓ Font family &amp; weight</div>
            <div>✓ Platform tags</div>
            <div className="text-gray-600">✕ Your video or audio (stays private)</div>
          </div>
          {templateId && (
            <label className="flex items-start gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_fork}
                onChange={e => setForm(f => ({ ...f, is_fork: e.target.checked }))}
                className="mt-0.5 accent-indigo-500"
              />
              <span>Mark as fork of original template (credits the original creator)</span>
            </label>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => setStep('form')}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
            >
              Continue →
            </button>
            <button onClick={onClose} className="text-sm text-gray-500 px-4">Cancel</button>
          </div>
        </div>
      </div>
    )
  }

  // step === 'form'
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full space-y-4 max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Publish template</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-white">✕</button>
        </div>

        {error && (
          <div className="text-red-400 text-xs bg-red-900/20 rounded-xl p-3">{error}</div>
        )}

        {/* Name */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Template name *</label>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Founder Story Bold"
            maxLength={60}
            className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="What makes this template great? Which niche is it for?"
            rows={3}
            maxLength={200}
            className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 placeholder-gray-600 focus:border-indigo-500 focus:outline-none resize-none"
          />
        </div>

        {/* Category */}
        <div>
          <label className="text-xs text-gray-400 block mb-2">Category</label>
          <div className="grid grid-cols-3 gap-1.5">
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setForm(f => ({ ...f, category: c.id }))}
                className={`text-xs py-1.5 px-2 rounded-lg border transition-colors text-left ${
                  form.category === c.id
                    ? 'border-indigo-600 bg-indigo-900/30 text-indigo-300'
                    : 'border-gray-700 text-gray-500 hover:border-gray-600'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Platforms */}
        <div>
          <label className="text-xs text-gray-400 block mb-2">Platforms</label>
          <div className="flex flex-wrap gap-1.5">
            {PLATFORM_OPTIONS.map(p => (
              <button
                key={p}
                onClick={() => setForm(f => ({
                  ...f,
                  platforms: f.platforms.includes(p)
                    ? f.platforms.filter(x => x !== p)
                    : [...f.platforms, p]
                }))}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  form.platforms.includes(p)
                    ? 'border-indigo-600 bg-indigo-900/30 text-indigo-300'
                    : 'border-gray-700 text-gray-500 hover:border-gray-600'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Tags (comma-separated)</label>
          <input
            value={form.tags}
            onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
            placeholder="podcast, founder, bold, captions"
            className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handlePublish}
            disabled={loading || !form.name.trim()}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
          >
            {loading ? 'Publishing…' : '🌐 Publish to community'}
          </button>
          <button onClick={() => setStep('confirm')} className="text-sm text-gray-500 px-3">Back</button>
        </div>
      </div>
    </div>
  )
}
