'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type Template = {
  id: string
  name: string
  description?: string
  platforms?: string[]
  use_cases?: string[]
  tags?: string[]
  times_used: number
  saves_count: number
  upvotes_count: number
  tip_count: number
  total_tips_received: number
  trending_score: number
  is_featured: boolean
  is_system: boolean
  creator_display_name?: string
  thumbnail_url?: string
  rank: number
  medal: string | null
}

const SORT_OPTIONS = [
  { value: 'trending', label: '🔥 Trending' },
  { value: 'uses', label: '📊 Most Used' },
  { value: 'saves', label: '🔖 Most Saved' },
  { value: 'upvotes', label: '⬆️ Top Rated' },
  { value: 'tips', label: '💛 Most Tipped' },
]

function TipModal({
  template,
  onClose,
  onTipped,
}: {
  template: Template
  onClose: () => void
  onTipped: (amount: number) => void
}) {
  const [credits, setCredits] = useState(1)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok?: boolean; error?: string; message?: string; tipper_new_balance?: number } | null>(null)

  async function sendTip() {
    setLoading(true)
    const res = await fetch(`/api/templates/${template.id}/tip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credits, message }),
    })
    const data = await res.json()
    setResult(data)
    setLoading(false)
    if (data.ok) onTipped(credits)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-white">💛 Tip this template</h3>
            <p className="text-xs text-gray-500 mt-0.5">{template.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white text-lg leading-none">×</button>
        </div>

        {result ? (
          <div className={`p-4 rounded-xl text-sm ${result.ok ? 'bg-green-900/30 border border-green-800/40 text-green-300' : 'bg-red-900/30 border border-red-800/40 text-red-300'}`}>
            {result.ok ? result.message : result.error}
            {result.tipper_new_balance !== undefined && (
              <p className="text-xs mt-2 text-gray-400">Your balance: {result.tipper_new_balance} credits</p>
            )}
          </div>
        ) : (
          <>
            <div>
              <p className="text-xs text-gray-400 mb-3">How many credits to tip?</p>
              <div className="flex gap-2 flex-wrap">
                {[1, 3, 5, 10, 25].map(n => (
                  <button
                    key={n}
                    onClick={() => setCredits(n)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      credits === n
                        ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <input
                type="text"
                placeholder="Leave a message (optional)"
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={200}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500/30"
              />
            </div>

            <div className="bg-gray-800/50 rounded-xl p-3 text-xs text-gray-500 space-y-1">
              <p>• New users get <strong className="text-gray-300">20 free credits</strong> to start tipping</p>
              <p>• Credits go directly to template creators</p>
              <p>• 1 tip per template (can increase later)</p>
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl py-2.5 text-sm transition-colors">
                Cancel
              </button>
              <button
                onClick={sendTip}
                disabled={loading}
                className="flex-1 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-medium rounded-xl py-2.5 text-sm transition-colors"
              >
                {loading ? 'Sending…' : `Tip ${credits} credit${credits !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function TemplateCard({
  t,
  onTip,
}: {
  t: Template
  onTip: (template: Template) => void
}) {
  const [upvoted, setUpvoted] = useState(false)
  const [saved, setSaved] = useState(false)
  const [upvotes, setUpvotes] = useState(t.upvotes_count)

  const platformIcons: Record<string, string> = {
    'YouTube Shorts': '▶️', 'TikTok': '🎵', 'LinkedIn': '💼',
    'Instagram Reels': '📸', 'Twitter/X': '𝕏', 'All': '🌐',
  }

  async function handleUpvote() {
    if (upvoted) return
    setUpvoted(true)
    setUpvotes(v => v + 1)
    await fetch(`/api/templates/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upvote' }),
    })
  }

  return (
    <div className={`bg-gray-900 border rounded-xl overflow-hidden hover:border-gray-700 transition-all group ${
      t.is_featured ? 'border-indigo-800/50 shadow-lg shadow-indigo-900/10' : 'border-gray-800'
    }`}>
      {/* Rank badge */}
      <div className="relative">
        <div className="h-24 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
          {t.thumbnail_url ? (
            <img src={t.thumbnail_url} alt={t.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl opacity-30">🎬</span>
          )}
        </div>
        {t.medal && (
          <div className="absolute top-2 left-2 text-xl">{t.medal}</div>
        )}
        {!t.medal && t.rank <= 10 && (
          <div className="absolute top-2 left-2 bg-gray-900/80 text-gray-400 text-xs px-2 py-0.5 rounded-full">#{t.rank}</div>
        )}
        {t.is_featured && (
          <div className="absolute top-2 right-2 bg-indigo-900/80 text-indigo-300 text-xs px-2 py-0.5 rounded-full">⭐ Featured</div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-white text-sm leading-tight">{t.name}</h3>
            {t.trending_score >= 70 && (
              <span className="text-xs text-orange-400 shrink-0">🔥 Hot</span>
            )}
          </div>
          {t.creator_display_name && (
            <p className="text-xs text-gray-600 mt-0.5">by {t.creator_display_name}</p>
          )}
          {t.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.description}</p>
          )}
        </div>

        {/* Platforms */}
        {t.platforms && t.platforms.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {t.platforms.slice(0, 3).map(p => (
              <span key={p} className="text-xs text-gray-500">
                {platformIcons[p] || '📱'} {p.replace(' Shorts', '').replace(' Reels', '')}
              </span>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span title="Times used">📊 {t.times_used.toLocaleString()}</span>
          <span title="Saves">🔖 {t.saves_count}</span>
          <span title="Tips received" className={t.tip_count > 0 ? 'text-yellow-500' : ''}>
            💛 {t.tip_count}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Link
            href={`/editor?template=${t.id}`}
            className="flex-1 text-center bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium py-2 rounded-lg transition-colors"
          >
            Use Template
          </Link>
          <button
            onClick={handleUpvote}
            title="Upvote"
            className={`px-3 py-2 rounded-lg text-xs border transition-colors ${
              upvoted
                ? 'border-green-700 bg-green-900/20 text-green-400'
                : 'border-gray-700 text-gray-500 hover:border-gray-600 hover:text-white'
            }`}
          >
            ⬆️ {upvotes}
          </button>
          <button
            onClick={() => onTip(t)}
            title="Tip creator"
            className="px-3 py-2 rounded-lg text-xs border border-gray-700 text-gray-500 hover:border-yellow-700/50 hover:text-yellow-400 transition-colors"
          >
            💛
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CommunityMarketplace() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [sort, setSort] = useState('trending')
  const [loading, setLoading] = useState(true)
  const [tipTarget, setTipTarget] = useState<Template | null>(null)
  const [stats, setStats] = useState<{ total: number; featured: number; tipped: number } | null>(null)

  const load = useCallback(async (s: string) => {
    setLoading(true)
    const res = await fetch(`/api/templates/leaderboard?sort=${s}&limit=30`)
    if (res.ok) {
      const data = await res.json()
      setTemplates(data.templates || [])
      setStats({
        total: data.total,
        featured: data.templates?.filter((t: Template) => t.is_featured).length || 0,
        tipped: data.templates?.filter((t: Template) => t.tip_count > 0).length || 0,
      })
    }
    setLoading(false)
  }, [])

  useEffect(() => { load(sort) }, [sort, load])

  function handleTipped(amount: number) {
    // Optimistically update tip count
    if (tipTarget) {
      setTemplates(prev => prev.map(t =>
        t.id === tipTarget.id
          ? { ...t, tip_count: t.tip_count + 1, total_tips_received: t.total_tips_received + amount }
          : t
      ))
    }
  }

  const featured = templates.filter(t => t.is_featured)
  const rest = templates.filter(t => !t.is_featured)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-500 hover:text-white text-sm">← Dashboard</Link>
          <span className="text-white font-semibold">🏆 Template Marketplace</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/templates" className="text-xs text-gray-500 hover:text-white">Browse All</Link>
          <Link href="/admin/metrics" className="text-xs text-gray-500 hover:text-white">Metrics</Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">

        {/* Hero + stats */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-indigo-950/50 border border-indigo-800/30 text-indigo-300 text-xs px-4 py-2 rounded-full">
            🌟 Community Templates — earn credits by sharing what works
          </div>
          <h1 className="text-4xl font-bold">Template Leaderboard</h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Templates ranked by real performance data. Use proven formats, upvote your favorites, and tip creators whose templates perform.
          </p>
          {stats && (
            <div className="flex justify-center gap-6 text-sm">
              <span className="text-gray-400"><strong className="text-white">{stats.total}</strong> templates</span>
              <span className="text-gray-400"><strong className="text-indigo-300">{stats.featured}</strong> featured</span>
              <span className="text-gray-400"><strong className="text-yellow-300">{stats.tipped}</strong> tipped by community</span>
            </div>
          )}
        </div>

        {/* Sort tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SORT_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => setSort(o.value)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                sort === o.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl h-64 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Featured row */}
            {featured.length > 0 && sort === 'trending' && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-lg font-semibold">⭐ Featured Templates</h2>
                  <span className="text-xs text-gray-600">Top performers this week</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featured.map(t => (
                    <TemplateCard key={t.id} t={t} onTip={setTipTarget} />
                  ))}
                </div>
              </section>
            )}

            {/* Rest */}
            <section>
              {sort === 'trending' && featured.length > 0 && rest.length > 0 && (
                <h2 className="text-lg font-semibold mb-4">All Templates</h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {(sort === 'trending' ? rest : templates).map(t => (
                  <TemplateCard key={t.id} t={t} onTip={setTipTarget} />
                ))}
              </div>
            </section>

            {templates.length === 0 && (
              <div className="text-center py-20 text-gray-600">
                <p className="text-4xl mb-3">🎬</p>
                <p>No templates yet. Be the first to share one!</p>
                <Link href="/clips" className="mt-4 inline-block text-indigo-400 hover:text-indigo-300 text-sm">
                  Create a clip and share the template →
                </Link>
              </div>
            )}
          </>
        )}

        {/* Credits info */}
        <div className="bg-gray-900/50 border border-dashed border-gray-800 rounded-xl p-6 text-center space-y-3">
          <p className="text-sm text-gray-400">
            💛 <strong className="text-white">Community Credits</strong> — New users get 20 free credits. Earn more by sharing templates that get used.
          </p>
          <div className="flex justify-center gap-4 text-xs text-gray-600">
            <span>📤 Share a template → earn credits when others use it</span>
            <span>💛 Tip templates you love → supports creators</span>
            <span>🔥 Featured templates → hand-picked weekly</span>
          </div>
          <Link
            href="/templates/publish"
            className="inline-block mt-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-6 py-2.5 rounded-xl transition-colors"
          >
            Share Your Template
          </Link>
        </div>

      </main>

      {/* Tip modal */}
      {tipTarget && (
        <TipModal
          template={tipTarget}
          onClose={() => setTipTarget(null)}
          onTipped={(amount) => { handleTipped(amount); setTimeout(() => setTipTarget(null), 2000) }}
        />
      )}
    </div>
  )
}
