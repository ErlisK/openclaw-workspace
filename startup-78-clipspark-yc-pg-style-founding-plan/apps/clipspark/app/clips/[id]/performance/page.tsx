'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface PerfEntry {
  views: number
  likes: number
  completion_rate: number | null
  impressions: number
  data_source: string
  measured_at: string
  hours_after_publish: number | null
}

interface ABVariant {
  id: string
  variant_type: string
  variant_label: string
  value: string
  views: number
  likes: number
  completion_rate: number | null
  impressions: number
  posted_url: string | null
  platform: string | null
  data_source: string
  created_at: string
}

interface ClipVariantData {
  original: {
    id: string
    title: string
    hashtags: string | string[]
    caption_style: string
    platform: string
    heuristic_score: number
    views: number
    completion_rate: number | null
    performance_entries: PerfEntry[]
  }
  variants: ABVariant[]
  winner: { type: string; id: string; label: string } | null
  total_variants: number
}

interface AllPerf {
  id: string
  views: number
  likes: number
  completion_rate: number | null
  impressions: number
  data_source: string
  measured_at: string
  hours_after_publish: number | null
}

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return Math.round(n).toString()
}
function fmtPct(n: number | null | undefined) {
  if (n == null) return '—'
  // stored as 0-1 or 0-100
  const pct = n > 1 ? n : n * 100
  return `${Math.round(pct)}%`
}

const CAPTION_STYLES = [
  { id: 'bold_white', label: 'Bold White' },
  { id: 'karaoke', label: 'Karaoke' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'kinetic', label: 'Kinetic' },
  { id: 'branded', label: 'Branded' },
]

export default function ClipPerformancePage() {
  const params = useParams()
  const clipId = params.id as string

  const [data, setData] = useState<ClipVariantData | null>(null)
  const [allPerf, setAllPerf] = useState<AllPerf[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddVariant, setShowAddVariant] = useState(false)
  const [variantType, setVariantType] = useState<'title' | 'caption_style'>('title')
  const [variantValue, setVariantValue] = useState('')
  const [variantPostedUrl, setVariantPostedUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingVariant, setEditingVariant] = useState<string | null>(null)
  const [variantPerfForm, setVariantPerfForm] = useState({ views: '', likes: '', completion_rate: '', impressions: '' })

  const load = useCallback(async () => {
    const [v, p] = await Promise.all([
      fetch(`/api/clips/${clipId}/variants`).then(r => r.ok ? r.json() : null),
      fetch(`/api/performance/manual?clip_id=${clipId}`).then(r => r.ok ? r.json() : []),
    ])
    if (v) setData(v)
    if (Array.isArray(p)) setAllPerf(p)
    setLoading(false)
  }, [clipId])

  useEffect(() => { load() }, [load])

  async function addVariant() {
    if (!variantValue.trim()) return
    setSaving(true)
    const res = await fetch(`/api/clips/${clipId}/variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variant_type: variantType,
        value: variantValue.trim(),
        posted_url: variantPostedUrl.trim() || null,
      }),
    })
    if (res.ok) {
      setVariantValue('')
      setVariantPostedUrl('')
      setShowAddVariant(false)
      await load()
    }
    setSaving(false)
  }

  async function saveVariantPerf(variantId: string) {
    setSaving(true)
    await fetch(`/api/clips/${clipId}/variants`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variant_id: variantId,
        views: variantPerfForm.views,
        likes: variantPerfForm.likes,
        completion_rate: variantPerfForm.completion_rate
          ? (parseFloat(variantPerfForm.completion_rate) / 100).toString()
          : undefined,
        impressions: variantPerfForm.impressions,
        data_source: 'manual',
      }),
    })
    setEditingVariant(null)
    setVariantPerfForm({ views: '', likes: '', completion_rate: '', impressions: '' })
    await load()
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-600">Loading…</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-600">Clip not found or no access.</div>
      </div>
    )
  }

  const orig = data.original
  const latestPerf = allPerf[0]
  const bestViews = Math.max(orig.views || 0, ...data.variants.map(v => v.views || 0))

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/performance" className="text-gray-500 hover:text-white text-sm">← Performance</Link>
        <span className="text-gray-700">/</span>
        <span className="text-sm text-gray-300 truncate max-w-xs">{orig.title}</span>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold mb-1">{orig.title}</h1>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{orig.platform}</span>
              <span>·</span>
              <span>{orig.caption_style}</span>
              <span>·</span>
              <span>Heuristic score: <strong className="text-white">{orig.heuristic_score?.toFixed(2) ?? '—'}</strong></span>
            </div>
          </div>
          <Link
            href={`/clips/${clipId}/edit`}
            className="text-xs border border-gray-700 text-gray-400 px-3 py-1.5 rounded-lg hover:border-gray-500 hover:text-white transition-colors shrink-0"
          >
            Edit clip →
          </Link>
        </div>

        {/* Top-line metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Views', value: fmt(latestPerf?.views ?? orig.views), color: 'text-white' },
            { label: 'Likes', value: fmt(latestPerf?.likes), color: 'text-white' },
            { label: 'Completion', value: fmtPct(latestPerf?.completion_rate ?? orig.completion_rate), color: (latestPerf?.completion_rate ?? orig.completion_rate ?? 0) > 0.4 ? 'text-green-400' : 'text-white' },
            { label: 'Impressions', value: fmt(latestPerf?.impressions), color: 'text-white' },
          ].map(m => (
            <div key={m.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className={`text-2xl font-bold ${m.color} mb-1`}>{m.value}</div>
              <div className="text-xs text-gray-500">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Performance history */}
        {allPerf.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold mb-3 text-gray-300">Performance over time</h2>
            <div className="border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/50">
                    <th className="text-left px-4 py-2.5 text-gray-400">Measured</th>
                    <th className="text-right px-4 py-2.5 text-gray-400">Views</th>
                    <th className="text-right px-4 py-2.5 text-gray-400">Likes</th>
                    <th className="text-right px-4 py-2.5 text-gray-400">Completion</th>
                    <th className="text-right px-4 py-2.5 text-gray-400">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {allPerf.map(p => (
                    <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-900/20">
                      <td className="px-4 py-2.5 text-gray-400">
                        {new Date(p.measured_at).toLocaleDateString()}
                        {p.hours_after_publish && <span className="ml-1 text-gray-700">({Math.round(p.hours_after_publish)}h)</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-white">{fmt(p.views)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-400">{fmt(p.likes)}</td>
                      <td className={`px-4 py-2.5 text-right ${p.completion_rate && p.completion_rate > 0.4 ? 'text-green-400' : 'text-gray-400'}`}>
                        {fmtPct(p.completion_rate)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {p.data_source === 'api' ? '🔗 auto' : '✏️ manual'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* A/B Variants */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-300">A/B Variants</h2>
              <p className="text-xs text-gray-600 mt-0.5">Test different titles or caption styles and compare performance.</p>
            </div>
            <button
              onClick={() => setShowAddVariant(v => !v)}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              + Add variant
            </button>
          </div>

          {/* Winner badge */}
          {data.winner && (
            <div className="bg-green-900/20 border border-green-800/30 rounded-xl p-3 mb-4 text-xs text-green-400">
              🏆 Current winner: <strong>{data.winner.label}</strong> with {fmt(bestViews)} views
            </div>
          )}

          {/* Add variant form */}
          {showAddVariant && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-4 space-y-3">
              <div className="flex gap-2">
                {(['title', 'caption_style'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setVariantType(t)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      variantType === t ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {t === 'title' ? 'Title' : 'Caption style'}
                  </button>
                ))}
              </div>
              {variantType === 'title' ? (
                <input
                  value={variantValue}
                  onChange={e => setVariantValue(e.target.value)}
                  placeholder="Try a different title, e.g. 'The lesson that changed everything'"
                  className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none placeholder-gray-600"
                />
              ) : (
                <select
                  value={variantValue}
                  onChange={e => setVariantValue(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Select caption style…</option>
                  {CAPTION_STYLES.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              )}
              <input
                value={variantPostedUrl}
                onChange={e => setVariantPostedUrl(e.target.value)}
                placeholder="Posted URL (optional — for tracking this variant)"
                className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none placeholder-gray-600"
              />
              <div className="flex gap-2">
                <button
                  onClick={addVariant}
                  disabled={saving || !variantValue}
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {saving ? 'Saving…' : 'Add variant'}
                </button>
                <button onClick={() => setShowAddVariant(false)} className="text-xs text-gray-600 px-3">Cancel</button>
              </div>
            </div>
          )}

          {/* Variant comparison table */}
          <div className="space-y-2">
            {/* Original row */}
            <div className={`border rounded-xl p-4 flex items-start justify-between gap-4 ${data.winner?.type === 'original' ? 'border-green-700/50 bg-green-950/20' : 'border-gray-800'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-gray-800 border border-gray-700 text-gray-400 px-2 py-0.5 rounded-full">A — original</span>
                  <span className="text-xs text-gray-500">{orig.caption_style} · title</span>
                  {data.winner?.type === 'original' && <span className="text-xs text-green-400">🏆 winner</span>}
                </div>
                <p className="text-sm text-white truncate">{orig.title}</p>
              </div>
              <div className="flex gap-4 text-xs text-right shrink-0">
                <div><div className="font-mono text-white">{fmt(orig.views)}</div><div className="text-gray-600">views</div></div>
                <div><div className="font-mono text-white">{fmtPct(orig.completion_rate)}</div><div className="text-gray-600">retention</div></div>
              </div>
            </div>

            {/* Variant rows */}
            {data.variants.map(v => (
              <div key={v.id} className={`border rounded-xl p-4 ${data.winner?.id === v.id ? 'border-green-700/50 bg-green-950/20' : 'border-gray-800'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-indigo-900/30 border border-indigo-800/40 text-indigo-300 px-2 py-0.5 rounded-full">
                        {v.variant_label} — {v.variant_type}
                      </span>
                      {data.winner?.id === v.id && <span className="text-xs text-green-400">🏆 winner</span>}
                    </div>
                    <p className="text-sm text-white">{v.value}</p>
                    {v.posted_url && (
                      <a href={v.posted_url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 mt-0.5 block truncate">
                        {v.posted_url}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-4 text-xs text-right shrink-0">
                      <div>
                        <div className={`font-mono ${v.views > (orig.views || 0) ? 'text-green-400' : 'text-white'}`}>{fmt(v.views)}</div>
                        <div className="text-gray-600">views</div>
                      </div>
                      <div>
                        <div className="font-mono text-white">{fmtPct(v.completion_rate)}</div>
                        <div className="text-gray-600">retention</div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setEditingVariant(editingVariant === v.id ? null : v.id)
                        setVariantPerfForm({ views: String(v.views || ''), likes: String(v.likes || ''), completion_rate: v.completion_rate ? String(Math.round(v.completion_rate * 100)) : '', impressions: String(v.impressions || '') })
                      }}
                      className="text-xs text-gray-600 hover:text-gray-400 px-2 py-1 rounded transition-colors"
                    >
                      {editingVariant === v.id ? '✕' : '✏️'}
                    </button>
                  </div>
                </div>

                {editingVariant === v.id && (
                  <div className="mt-3 pt-3 border-t border-gray-800 grid grid-cols-4 gap-2">
                    {[
                      { key: 'views', label: 'Views', ph: '1200' },
                      { key: 'likes', label: 'Likes', ph: '48' },
                      { key: 'completion_rate', label: '% Complete', ph: '42' },
                      { key: 'impressions', label: 'Impressions', ph: '3500' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-xs text-gray-600 block mb-0.5">{f.label}</label>
                        <input
                          type="number"
                          value={variantPerfForm[f.key as keyof typeof variantPerfForm]}
                          onChange={e => setVariantPerfForm(p => ({ ...p, [f.key]: e.target.value }))}
                          placeholder={f.ph}
                          className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    ))}
                    <div className="col-span-4 flex gap-2 mt-1">
                      <button
                        onClick={() => saveVariantPerf(v.id)}
                        disabled={saving}
                        className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {saving ? '…' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {data.variants.length === 0 && !showAddVariant && (
              <div className="border border-dashed border-gray-800 rounded-xl p-6 text-center text-xs text-gray-600">
                No A/B variants yet. Try a different title or caption style and compare the numbers.
              </div>
            )}
          </div>
        </section>

        {/* CTA to enter performance data */}
        {allPerf.length === 0 && (
          <div className="bg-indigo-950/20 border border-indigo-800/30 rounded-xl p-5 text-center">
            <p className="text-sm text-indigo-300 mb-3">No performance data for this clip yet.</p>
            <p className="text-xs text-gray-500 mb-4">
              Enter your view counts from TikTok, YouTube Shorts, or LinkedIn — or connect your account to auto-import.
            </p>
            <Link
              href={`/clips/${clipId}/edit`}
              className="inline-block text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition-colors"
            >
              Enter performance data →
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
