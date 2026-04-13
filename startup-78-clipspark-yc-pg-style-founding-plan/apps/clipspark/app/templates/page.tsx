'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { TemplateCard } from '@/components/TemplateCard'

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
  thumbnail_url?: string
  fork_of?: string | null
  category?: string
  creator_name?: string | null
  is_saved: boolean
  is_upvoted: boolean
}

const PLATFORMS = ['YouTube Shorts', 'TikTok', 'Instagram Reels', 'LinkedIn']
const CATEGORIES = [
  { id: '', label: 'All' },
  { id: 'podcast', label: '🎙️ Podcast' },
  { id: 'professional', label: '💼 Professional' },
  { id: 'short-form', label: '📱 Short-form' },
  { id: 'entertainment', label: '😂 Entertainment' },
  { id: 'education', label: '📚 Education' },
]
const SORTS = [
  { id: 'popular', label: 'Popular' },
  { id: 'trending', label: '🔥 Trending' },
  { id: 'newest', label: 'Newest' },
]

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [platform, setPlatform] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('popular')
  const [q, setQ] = useState('')
  const [mine, setMine] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (platform) params.set('platform', platform)
    if (category) params.set('category', category)
    if (sort) params.set('sort', sort)
    if (q) params.set('q', q)
    if (mine) params.set('mine', '1')
    const res = await fetch(`/api/templates?${params}`)
    const data = await res.json()
    if (Array.isArray(data)) setTemplates(data)
    setLoading(false)
  }, [platform, category, sort, q, mine])

  useEffect(() => { load() }, [load])

  const systemTemplates = templates.filter(t => t.is_system)
  const communityTemplates = templates.filter(t => !t.is_system)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-bold text-lg">
            <span className="text-indigo-400">⚡</span> ClipSpark
          </Link>
          <Link href="/upload" className="text-gray-400 hover:text-white text-sm transition-colors">New Job</Link>
          <Link href="/templates" className="text-white text-sm font-medium">Templates</Link>
          <Link href="/pricing" className="text-gray-400 hover:text-white text-sm transition-colors">Pricing</Link>
        </div>
        <Link href="/settings" className="text-gray-500 hover:text-white text-sm">Settings</Link>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Template Library</h1>
            <p className="text-gray-400 text-sm">
              Browse, upvote, and save community clip templates. Fork to make them yours.
            </p>
          </div>
          <Link
            href="/upload"
            className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-xl transition-colors"
          >
            Use a template →
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-4 mb-8 space-y-3">
          {/* Search */}
          <div className="relative">
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search templates…"
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-4 py-2.5 pl-9 placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
            />
            <span className="absolute left-3 top-2.5 text-gray-600">🔍</span>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Platform filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Platform:</span>
              <button
                onClick={() => setPlatform('')}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  !platform ? 'border-indigo-600 bg-indigo-900/30 text-indigo-300' : 'border-gray-700 text-gray-500 hover:border-gray-600'
                }`}
              >
                All
              </button>
              {PLATFORMS.map(p => (
                <button
                  key={p}
                  onClick={() => setPlatform(platform === p ? '' : p)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                    platform === p ? 'border-indigo-600 bg-indigo-900/30 text-indigo-300' : 'border-gray-700 text-gray-500 hover:border-gray-600'
                  }`}
                >
                  {p.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Category:</span>
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                    category === c.id ? 'border-indigo-600 bg-indigo-900/30 text-indigo-300' : 'border-gray-700 text-gray-500 hover:border-gray-600'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-xs text-gray-500">Sort:</span>
              {SORTS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSort(s.id)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                    sort === s.id ? 'border-indigo-600 bg-indigo-900/30 text-indigo-300' : 'border-gray-700 text-gray-500 hover:border-gray-600'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Mine toggle */}
            <button
              onClick={() => setMine(v => !v)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                mine ? 'border-green-700 bg-green-900/30 text-green-300' : 'border-gray-700 text-gray-500 hover:border-gray-600'
              }`}
            >
              My templates
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-600">Loading templates…</div>
        ) : (
          <>
            {/* Official templates (only show when no filters) */}
            {!platform && !category && !q && !mine && systemTemplates.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center gap-3 mb-5">
                  <h2 className="text-lg font-semibold">🏆 Official Templates</h2>
                  <span className="text-xs bg-indigo-900/40 text-indigo-300 px-2 py-0.5 rounded-full">Built-in · always free</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {systemTemplates.map(t => (
                    <TemplateCard key={t.id} template={t} />
                  ))}
                </div>
              </section>
            )}

            {/* Leaderboard — top 5 by uses */}
            {!mine && !q && templates.filter(t => (t.times_used || 0) >= 1).length > 0 && (
              <section className="mb-10 bg-gray-900/40 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-sm font-semibold">🔥 Leaderboard</h2>
                  <span className="text-xs text-gray-600">most-used community templates</span>
                </div>
                <div className="space-y-2">
                  {[...templates]
                    .filter(t => (t.times_used || 0) > 0)
                    .sort((a, b) => (b.times_used || 0) - (a.times_used || 0))
                    .slice(0, 5)
                    .map((t, i) => {
                      const maxUses = templates.reduce((m, x) => Math.max(m, x.times_used || 0), 1)
                      const pct = Math.min(100, Math.round(((t.times_used || 0) / maxUses) * 100))
                      return (
                        <div key={t.id} className="flex items-center gap-3">
                          <span className="text-xs text-gray-600 w-4 shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs text-white font-medium truncate">{t.name}</span>
                              {(t.times_used || 0) >= 100 && (
                                <span className="text-xs bg-green-900/30 border border-green-800/40 text-green-400 px-1.5 py-0 rounded-full">★ 100+</span>
                              )}
                            </div>
                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                          <span className="text-xs text-gray-400 shrink-0 w-12 text-right">{t.times_used || 0} uses</span>
                          <span className="text-xs text-gray-600 shrink-0 w-14 text-right">{t.avg_views_48h ? `${Math.round(t.avg_views_48h)} avg` : '—'}</span>
                        </div>
                      )
                    })}
                </div>
                <p className="text-xs text-gray-700 mt-3">Target: ≥10 templates with ≥100 uses each</p>
              </section>
            )}

            {/* Community templates */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold">
                    {mine ? '📁 My Templates' : '🌱 Community Templates'}
                  </h2>
                  <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full">
                    {communityTemplates.length} {platform || category || q ? 'matching' : 'total'}
                  </span>
                </div>
              </div>

              {communityTemplates.length === 0 ? (
                <div className="border border-dashed border-gray-700 rounded-xl p-12 text-center">
                  {mine ? (
                    <>
                      <p className="text-gray-500 text-sm mb-3">You haven&rsquo;t published any templates yet.</p>
                      <p className="text-gray-600 text-xs">After exporting a clip, click &ldquo;Share template&rdquo; in the clip editor.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-500 text-sm mb-3">
                        {q || platform || category ? 'No templates match your filters.' : 'No community templates yet.'}
                      </p>
                      <p className="text-gray-600 text-xs">Be the first to share a winning style from the clip editor!</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {communityTemplates.map(t => (
                    <TemplateCard key={t.id} template={t} />
                  ))}
                </div>
              )}
            </section>

            {/* How it works — only on empty/default state */}
            {!platform && !category && !q && !mine && (
              <section className="mt-16 bg-gray-900/50 border border-gray-800 rounded-2xl p-8">
                <h3 className="font-semibold text-base mb-5">How community templates work</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm text-gray-400">
                  {[
                    { icon: '💾', title: 'Save', desc: "Save any template to your library. It'll appear as an option when you submit a new job." },
                    { icon: '🍴', title: 'Fork', desc: "Like a template but want different captions? Fork it, tweak, and save as your own." },
                    { icon: '▲', title: 'Upvote', desc: "Great templates surface higher when the community upvotes them. Vote for the ones that work." },
                    { icon: '📤', title: 'Share', desc: "After exporting a clip, click 'Share template' to publish your style. Your name goes on it." },
                  ].map(step => (
                    <div key={step.icon}>
                      <div className="text-2xl mb-2">{step.icon}</div>
                      <div className="font-medium text-gray-300 mb-1">{step.title}</div>
                      <p>{step.desc}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
