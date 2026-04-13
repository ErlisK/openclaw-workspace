'use client'
import { useState, useEffect, useCallback } from 'react'

interface Snippet {
  id: string
  source: string
  product: string | null
  snippet: string
  theme_tags: string[]
  sentiment: string | null
  url: string | null
  created_at: string
}

interface Stats {
  counts: Record<string, number>
  topThemes: Array<{ tag: string; count: number }>
  sentimentFreq: Record<string, number>
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: 'bg-green-100 text-green-800',
  negative: 'bg-red-100 text-red-800',
  neutral: 'bg-gray-100 text-gray-700',
  mixed: 'bg-yellow-100 text-yellow-800',
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [filterTheme, setFilterTheme] = useState('')
  const [filterSentiment, setFilterSentiment] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'snippets' | 'add'>('overview')
  const [newSnippet, setNewSnippet] = useState({
    source: '', product: '', snippet: '', theme_tags: '', sentiment: 'neutral', url: ''
  })
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const PAGE_SIZE = 20

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/research/stats')
    const data = await res.json()
    setStats(data)
  }, [])

  const fetchSnippets = useCallback(async () => {
    const params = new URLSearchParams({
      table: 'research_snippets',
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    })
    if (filterTheme) params.set('theme', filterTheme)
    if (filterSentiment) params.set('sentiment', filterSentiment)
    const res = await fetch(`/api/research?${params}`)
    const data = await res.json()
    setSnippets(data.data || [])
    setTotal(data.total || 0)
  }, [page, filterTheme, filterSentiment])

  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => { if (activeTab === 'snippets') fetchSnippets() }, [activeTab, fetchSnippets])

  const handleAdd = async () => {
    setSaving(true)
    const record = {
      ...newSnippet,
      theme_tags: newSnippet.theme_tags.split(',').map(t => t.trim()).filter(Boolean),
      product: newSnippet.product || null,
      url: newSnippet.url || null,
    }
    const res = await fetch('/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'research_snippets', record }),
    })
    if (res.ok) {
      setSaveMsg('✅ Snippet saved!')
      setNewSnippet({ source: '', product: '', snippet: '', theme_tags: '', sentiment: 'neutral', url: '' })
      fetchStats()
    } else {
      setSaveMsg('❌ Error saving')
    }
    setSaving(false)
    setTimeout(() => setSaveMsg(''), 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-purple-700 text-white px-6 py-4 flex items-center gap-4">
        <span className="text-2xl">🎨</span>
        <div>
          <h1 className="text-xl font-bold">KidColoring Research Admin</h1>
          <p className="text-purple-200 text-sm">Phase 1 — Empathy Research Dashboard</p>
        </div>
        <div className="ml-auto flex gap-3">
          {stats && (
            <>
              <span className="bg-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                {stats.counts.research_snippets} snippets
              </span>
              <span className="bg-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                {stats.counts.comp_matrix} competitors
              </span>
              <span className="bg-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                {stats.counts.search_intent} queries
              </span>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b px-6">
        <div className="flex gap-0">
          {(['overview', 'snippets', 'add'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'overview' ? '📊 Overview' : tab === 'snippets' ? '📄 Snippets' : '➕ Add Finding'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Research Snippets', value: stats.counts.research_snippets, icon: '📄', target: 350, color: 'purple' },
                { label: 'Competitors Mapped', value: stats.counts.comp_matrix, icon: '🏢', target: 15, color: 'blue' },
                { label: 'Search Queries', value: stats.counts.search_intent, icon: '🔍', target: 50, color: 'green' },
                { label: 'Unique Themes', value: stats.topThemes.length, icon: '🎯', target: 5, color: 'yellow' },
              ].map(card => (
                <div key={card.label} className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100`}>
                  <div className="text-2xl mb-2">{card.icon}</div>
                  <div className="text-3xl font-bold text-gray-900">{card.value}</div>
                  <div className="text-sm text-gray-500">{card.label}</div>
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full">
                    <div
                      className="h-1.5 bg-purple-500 rounded-full"
                      style={{ width: `${Math.min(100, (card.value / card.target) * 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">target: {card.target}+</div>
                </div>
              ))}
            </div>

            {/* Top themes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Top Research Themes</h2>
              <div className="space-y-2">
                {stats.topThemes.map(({ tag, count }) => (
                  <div key={tag} className="flex items-center gap-3">
                    <div className="w-48 text-sm text-gray-600 truncate">{tag.replace(/_/g, ' ')}</div>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full relative">
                      <div
                        className="h-5 bg-purple-400 rounded-full"
                        style={{ width: `${(count / stats.topThemes[0].count) * 100}%` }}
                      />
                    </div>
                    <div className="text-sm font-medium text-gray-700 w-8">{count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { href: '/admin/define', icon: '🎯', label: 'Phase 2: Define', desc: 'POV · HMW · Assumptions · Schema v0 · v0.2' },
                { href: '/admin/flags', icon: '🎛️', label: 'Feature Flags', desc: '18 runtime flags · DB-backed · no-redeploy toggles' },
                { href: '/admin/experiments', icon: '🧪', label: 'A/B Experiments', desc: '3 iteration cycles · prompt UI · export CTA · page count' },
                { href: '/admin/paywall', icon: '💰', label: 'Paywall Analytics', desc: '3 price anchors · CTR by anchor · revenue projection · A/B layout test' },
                { href: '/admin/csat', icon: '😊', label: 'CSAT & Micro-Survey', desc: '1-click emoji CSAT + follow-up · 70%+ good · product insights' },
                { href: '/admin/safety', icon: '🛡️', label: 'Content Safety', desc: 'Filter v1.2 · prompt blocks · sanitize queue · COPPA compliance' },
                { href: '/admin/security', icon: '🔐', label: 'Security & Compliance', desc: 'Error logs · rate limits · abuse flags · COPPA consent · data requests' },
                { href: '/admin/rls', icon: '🔐', label: 'RLS & Auth', desc: 'Schema v4.0.0 · per-table policies · COPPA isolation · auth trigger' },
                              { href: '/admin/pricing-experiments', icon: '💰', label: 'Pricing Experiments', desc: 'pricing_v1: control $6.99 vs low $4.99 vs premium $9.99 vs anchor — live experiment' },
                { href: '/admin/cohorts', icon: '📊', label: 'Cohorts', desc: 'D1/D7 retention · activation funnel · conversion pipeline · unit economics · LTV' },
                { href: '/admin/distribution', icon: '📣', label: 'Distribution', desc: 'Zero-spend channels: PH, Reddit, TPT, gallery, SEO, referral — organic growth' },
                { href: '/admin/growth', icon: '📈', label: 'Growth (Phase 7)', desc: 'Conversion rate, NPS, repeat creation, activation funnel — OKR tracking' },
                { href: '/admin/observability', icon: '📡', label: 'Observability', desc: 'Error logs, API metrics, rate limit dashboard, health check' },
  { href: '/admin/payments', icon: '💳', label: 'Payments', desc: 'Stripe test-mode · per-book + subscription · receipts · revenue analytics' },
                { href: '/admin/tradeoffs', icon: '🧭', label: 'Trade-Off Analysis & Concept Selection', desc: 'Quality × Cost × Safety matrix · 3 concepts · provider selection · 6-risk register · final decision' },
                { href: '/admin/sandbox', icon: '📊', label: 'Sandbox Dashboard', desc: '112 tests · p50/p95 latency · failure rates · style×concept heatmap · cost vs quality' },
                { href: '/sandbox', icon: '🎨', label: 'Generation Sandbox', desc: 'Live prompt tester · Pollinations.ai free tier · logs to Supabase gen_tests' },
                { href: '/admin/spike', icon: '🧪', label: 'Phase 3 · Tech Spike', desc: '57 tests · 8 providers · latency/cost/quality dashboard · model selection' },
                { href: '/admin/analytics', icon: '📊', label: 'Analytics & Events', desc: '8 core events · 5 funnels · props reference · session tracking' },
                { href: '/admin/schema', icon: '🗄️', label: 'Domain Model & Schema', desc: 'generation_jobs · moderation_events · view aliases · RLS · migrations' },
                { href: '/admin/guardrails', icon: '🛡️', label: 'Guardrails', desc: 'Parent accounts · Data minimization · Deletion flows · COPPA' },
                { href: '/admin/storyboards', icon: '🎭', label: 'Persona Storyboards', desc: '3 personas · 14 scenes · evidence-linked' },
                { href: '/admin/competitors', icon: '🏢', label: 'Competitor Matrix', desc: '20 products · screenshots · teardowns' },
                { href: '/dashboard', icon: '📊', label: 'Research Dashboard', desc: 'Full data explorer' },
              ].map(link => (
                <a key={link.href} href={link.href}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-purple-300 hover:shadow-md transition-all group flex items-start gap-3">
                  <span className="text-2xl">{link.icon}</span>
                  <div>
                    <div className="font-semibold text-gray-900 group-hover:text-purple-700 text-sm">{link.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{link.desc}</div>
                  </div>
                  <span className="ml-auto text-gray-300 group-hover:text-purple-400 text-lg">→</span>
                </a>
              ))}
            </div>

            {/* Sentiment distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Sentiment Distribution</h2>
              <div className="flex gap-4 flex-wrap">
                {Object.entries(stats.sentimentFreq).map(([s, count]) => (
                  <div key={s} className={`px-4 py-3 rounded-xl ${SENTIMENT_COLORS[s] || 'bg-gray-100 text-gray-700'}`}>
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm capitalize">{s}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SNIPPETS TAB */}
        {activeTab === 'snippets' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
              <input
                type="text"
                placeholder="Filter by theme tag..."
                value={filterTheme}
                onChange={e => { setFilterTheme(e.target.value); setPage(0) }}
                className="border rounded-lg px-3 py-2 text-sm flex-1 max-w-xs"
              />
              <select
                value={filterSentiment}
                onChange={e => { setFilterSentiment(e.target.value); setPage(0) }}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All sentiments</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
                <option value="neutral">Neutral</option>
                <option value="mixed">Mixed</option>
              </select>
              <button onClick={fetchSnippets} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm">
                Apply
              </button>
              <span className="text-sm text-gray-500 self-center">{total} results</span>
            </div>

            {/* Snippet list */}
            <div className="space-y-3">
              {snippets.map(s => (
                <div key={s.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                          {s.source}
                        </span>
                        {s.product && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            {s.product}
                          </span>
                        )}
                        {s.sentiment && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${SENTIMENT_COLORS[s.sentiment] || ''}`}>
                            {s.sentiment}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">&ldquo;{s.snippet}&rdquo;</p>
                      <div className="flex gap-1 flex-wrap mt-2">
                        {s.theme_tags?.map(tag => (
                          <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    {s.url && (
                      <a href={s.url} target="_blank" rel="noopener noreferrer"
                        className="text-gray-400 hover:text-purple-600 text-xs shrink-0">
                        ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 bg-white border rounded-lg text-sm disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="px-4 py-2 text-sm text-gray-500">
                Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * PAGE_SIZE >= total}
                className="px-4 py-2 bg-white border rounded-lg text-sm disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ADD TAB */}
        {activeTab === 'add' && (
          <div className="max-w-2xl bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Add Research Finding</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Source *</label>
                <input
                  type="text"
                  value={newSnippet.source}
                  onChange={e => setNewSnippet(s => ({ ...s, source: e.target.value }))}
                  placeholder="Reddit r/Parenting, BabyCenter, etc."
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Product (optional)</label>
                <input
                  type="text"
                  value={newSnippet.product}
                  onChange={e => setNewSnippet(s => ({ ...s, product: e.target.value }))}
                  placeholder="Crayola, Wonderbly, etc."
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Snippet / Finding *</label>
                <textarea
                  rows={4}
                  value={newSnippet.snippet}
                  onChange={e => setNewSnippet(s => ({ ...s, snippet: e.target.value }))}
                  placeholder="Exact quote or paraphrased finding..."
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Theme Tags (comma-separated)</label>
                <input
                  type="text"
                  value={newSnippet.theme_tags}
                  onChange={e => setNewSnippet(s => ({ ...s, theme_tags: e.target.value }))}
                  placeholder="personalization, engagement, screen_time"
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Sentiment</label>
                <select
                  value={newSnippet.sentiment}
                  onChange={e => setNewSnippet(s => ({ ...s, sentiment: e.target.value }))}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                  <option value="neutral">Neutral</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">URL</label>
                <input
                  type="url"
                  value={newSnippet.url}
                  onChange={e => setNewSnippet(s => ({ ...s, url: e.target.value }))}
                  placeholder="https://..."
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleAdd}
                  disabled={saving || !newSnippet.source || !newSnippet.snippet}
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
                >
                  {saving ? 'Saving...' : 'Add Finding'}
                </button>
                {saveMsg && <span className="text-sm">{saveMsg}</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
