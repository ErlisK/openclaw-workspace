'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ── Types ──────────────────────────────────────────────────────────────────
type Badge = {
  id: string; title: string; badge_type: string; skill_tags: string[]
  region_name: string; code_standard: string; issued_at: string
  trade: { name: string; slug: string } | null
  region: { name: string; region_code: string } | null
  review: { overall_rating: number; skill_level: string; code_compliance_pass: boolean; feedback_text: string; timestamped_notes: any[]; completed_at: string } | null
}

type Profile = {
  id: string; full_name: string; years_experience: number; bio: string
  badges: Badge[]; clips: any[]; badge_count: number; reviewed_clip_count: number
  avg_rating: number | null; trades: string[]; regions: string[]; skill_tags: string[]
  compliance_pass_rate: number; top_skill_level: string
}

// ── Constants ──────────────────────────────────────────────────────────────
const TRADES = [
  { slug: '', label: 'All Trades', emoji: '🔍' },
  { slug: 'electrician', label: 'Electrician', emoji: '⚡' },
  { slug: 'plumber', label: 'Plumber', emoji: '🔧' },
  { slug: 'hvac-technician', label: 'HVAC Technician', emoji: '❄️' },
  { slug: 'welder', label: 'Welder', emoji: '🔥' },
  { slug: 'pipefitter', label: 'Pipefitter', emoji: '🔩' },
]

const REGIONS = [
  { code: '', label: 'All Regions' },
  { code: 'US-TX', label: '🤠 Texas (NEC 2020)' },
  { code: 'US-CA', label: '🌴 California (CEC 2022)' },
  { code: 'US-IL', label: '🌽 Illinois (NEC 2020)' },
  { code: 'US-NY', label: '🗽 New York (NYC Code)' },
  { code: 'US-FL', label: '☀️ Florida (NEC 2020 + FBC)' },
]

const SKILL_LEVELS = [
  { value: '', label: 'Any Level' },
  { value: 'apprentice', label: 'Apprentice' },
  { value: 'journeyman', label: 'Journeyman' },
  { value: 'master', label: 'Master' },
]

const SORT_OPTIONS = [
  { value: 'badges', label: 'Most Badges' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'experience', label: 'Most Experience' },
  { value: 'recent', label: 'Most Active' },
]

const BADGE_COLORS = ['from-blue-500 to-indigo-600', 'from-green-500 to-emerald-600', 'from-orange-500 to-red-600', 'from-purple-500 to-violet-600', 'from-yellow-500 to-amber-600']
const TRADE_EMOJI: Record<string, string> = { electrician: '⚡', plumber: '🔧', 'hvac-technician': '❄️', welder: '🔥', pipefitter: '🔩', carpenter: '🪚' }
const LEVEL_COLOR: Record<string, string> = { apprentice: 'bg-green-100 text-green-700', journeyman: 'bg-blue-100 text-blue-700', master: 'bg-purple-100 text-purple-700' }

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => <span key={s} className={`text-xs ${s <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>)}
    </div>
  )
}

// ── Profile card ─────────────────────────────────────────────────────────
function ProfileCard({ profile, onView, onBook }: { profile: Profile; onView: () => void; onBook: () => void }) {
  const tradeEmojis = profile.trades.slice(0, 3).map(t => TRADE_EMOJI[t] || '🔧').join(' ')
  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:shadow-md hover:border-blue-200 transition-all p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900">{profile.full_name}</h3>
            {profile.top_skill_level && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${LEVEL_COLOR[profile.top_skill_level] || 'bg-gray-100 text-gray-600'}`}>
                {profile.top_skill_level}
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500 mt-0.5">
            {tradeEmojis} {profile.years_experience}yr exp
            {profile.avg_rating && <> · <span className="text-yellow-600">★ {profile.avg_rating}</span></>}
          </div>
          {profile.bio && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{profile.bio}</p>}
        </div>
        <div className="flex-shrink-0 text-center ml-4">
          <div className="text-2xl font-bold text-blue-600">{profile.badge_count}</div>
          <div className="text-xs text-gray-400">badge{profile.badge_count !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Badges mini row */}
      {profile.badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {profile.badges.slice(0, 3).map((b, i) => (
            <div key={b.id} className={`text-white text-xs px-2 py-1 rounded-full bg-gradient-to-r ${BADGE_COLORS[i % BADGE_COLORS.length]} font-medium max-w-[160px] truncate`}
              title={b.title}>
              🏅 {b.trade?.name || 'Trade'}{b.region ? ` · ${b.region.region_code}` : ''}
            </div>
          ))}
          {profile.badges.length > 3 && (
            <span className="text-xs text-gray-400 self-center">+{profile.badges.length - 3} more</span>
          )}
        </div>
      )}

      {/* Stats row */}
      <div className="flex gap-3 text-xs text-gray-500 mb-3 flex-wrap">
        <span className="flex items-center gap-1">🎬 {profile.reviewed_clip_count} clip{profile.reviewed_clip_count !== 1 ? 's' : ''}</span>
        {profile.compliance_pass_rate > 0 && (
          <span className={`flex items-center gap-1 font-medium ${profile.compliance_pass_rate >= 80 ? 'text-green-600' : 'text-amber-600'}`}>
            📋 {profile.compliance_pass_rate}% code pass
          </span>
        )}
        {profile.regions.length > 0 && (
          <span>📍 {profile.regions.slice(0, 2).join(', ')}</span>
        )}
      </div>

      {/* Skill tags */}
      {profile.skill_tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {profile.skill_tags.filter(t => t.length < 40).slice(0, 5).map(tag => (
            <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{tag.trim()}</span>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <button onClick={onView} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
          View Portfolio →
        </button>
        <button onClick={onBook} className="px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors">
          📅 Book Verification
        </button>
      </div>
    </div>
  )
}

// ── Portfolio drawer / modal ───────────────────────────────────────────────
function PortfolioDrawer({ profileId, onClose, onBook }: { profileId: string; onClose: () => void; onBook: () => void }) {
  const [data, setData] = useState<{ profile: any; badges: Badge[]; clips: any[]; ledger: any[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'badges' | 'clips' | 'ledger'>('badges')

  useEffect(() => {
    fetch(`/api/search?profile_id=${profileId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [profileId])

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-2xl bg-white shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">{data?.profile?.full_name || '…'}</h2>
            <p className="text-gray-500 text-sm">{data?.profile?.years_experience}yr · {data?.profile?.bio?.slice(0, 60)}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onBook} className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
              📅 Book Verification
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl px-2">✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          {(['badges', 'clips', 'ledger'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`py-3 px-4 text-sm font-medium border-b-2 capitalize transition-colors ${tab === t ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t === 'badges' ? `🏅 Badges (${data?.badges?.length || 0})` : t === 'clips' ? `🎬 Work Clips (${data?.clips?.length || 0})` : `🔐 Audit Log (${data?.ledger?.length || 0})`}
            </button>
          ))}
        </div>

        <div className="flex-1 p-6">
          {loading ? (
            <div className="text-center text-gray-400 py-12 animate-pulse">Loading portfolio…</div>
          ) : (
            <>
              {/* Badges tab */}
              {tab === 'badges' && (
                <div className="space-y-4">
                  {data?.badges?.length === 0 && <p className="text-gray-400 text-center py-8">No badges yet</p>}
                  {data?.badges?.map((badge, i) => (
                    <div key={badge.id} className="border border-gray-200 rounded-xl p-4">
                      <div className={`inline-flex items-center gap-2 text-white text-xs px-3 py-1.5 rounded-full bg-gradient-to-r ${BADGE_COLORS[i % BADGE_COLORS.length]} font-medium mb-3`}>
                        🏅 {badge.badge_type?.replace(/_/g, ' ')}
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">{badge.title}</h3>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
                        {badge.trade && <span>{TRADE_EMOJI[badge.trade.slug] || '🔧'} {badge.trade.name}</span>}
                        {badge.region && <span>📍 {badge.region.region_code}</span>}
                        {badge.region_name && <span>📋 {badge.code_standard}</span>}
                        <span>📅 {new Date(badge.issued_at).toLocaleDateString()}</span>
                      </div>

                      {badge.review && (
                        <div className="bg-gray-50 rounded-lg p-3 mt-2">
                          <div className="flex items-center gap-2 mb-1.5">
                            <StarRating rating={badge.review.overall_rating} />
                            <span className="text-xs text-gray-500">{badge.review.overall_rating}/5</span>
                            {badge.review.skill_level && (
                              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${LEVEL_COLOR[badge.review.skill_level] || 'bg-gray-100 text-gray-600'}`}>
                                {badge.review.skill_level}
                              </span>
                            )}
                            <span className={`text-xs font-medium ${badge.review.code_compliance_pass ? 'text-green-600' : 'text-red-500'}`}>
                              {badge.review.code_compliance_pass ? '✓ Code Compliant' : '✗ Non-Compliant'}
                            </span>
                          </div>
                          {badge.review.feedback_text && (
                            <p className="text-xs text-gray-600 italic">"{badge.review.feedback_text.slice(0, 150)}{badge.review.feedback_text.length > 150 ? '…' : ''}"</p>
                          )}
                          {badge.review.timestamped_notes?.length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs font-medium text-gray-500 mb-1">Timestamped mentor notes:</div>
                              <div className="space-y-1">
                                {badge.review.timestamped_notes.slice(0, 3).map((n: any, j: number) => (
                                  <div key={j} className="flex gap-2 text-xs">
                                    <span className="bg-blue-100 text-blue-700 font-mono px-1.5 rounded flex-shrink-0">{n.time}</span>
                                    <span className="text-gray-600">{n.note}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {badge.skill_tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {badge.skill_tags.filter((t: string) => t.trim()).slice(0, 5).map((t: string) => (
                            <span key={t} className="bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded-full">{t.trim()}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Clips tab */}
              {tab === 'clips' && (
                <div className="space-y-3">
                  {data?.clips?.length === 0 && <p className="text-gray-400 text-center py-8">No reviewed clips yet</p>}
                  {data?.clips?.map((clip: any) => {
                    const review = Array.isArray(clip.review) ? clip.review[0] : clip.review
                    return (
                      <div key={clip.id} className="border border-gray-200 rounded-xl p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-sm">{clip.title}</div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {clip.trade?.name} · {clip.region?.region_code} · {clip.duration_seconds}s
                            </div>
                          </div>
                          {review && (
                            <div className="flex-shrink-0 ml-3 text-right">
                              <StarRating rating={review.overall_rating} />
                              <div className={`text-xs mt-0.5 font-medium ${review.code_compliance_pass ? 'text-green-600' : 'text-red-500'}`}>
                                {review.code_compliance_pass ? '✓ Compliant' : '✗ Non-Compliant'}
                              </div>
                            </div>
                          )}
                        </div>
                        {clip.challenge_prompt && (
                          <div className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mb-2 line-clamp-2">
                            🎯 {clip.challenge_prompt.slice(0, 100)}…
                          </div>
                        )}
                        {clip.skill_tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {clip.skill_tags.slice(0, 5).map((t: string) => <span key={t} className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">{t}</span>)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Ledger tab */}
              {tab === 'ledger' && (
                <div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 mb-4">
                    🔐 <strong>Append-only audit ledger.</strong> Every badge issuance, verification, export, and revocation is recorded here permanently. Rows cannot be deleted or modified.
                  </div>
                  {data?.ledger?.length === 0 && <p className="text-gray-400 text-center py-8">No ledger entries yet</p>}
                  <div className="space-y-2">
                    {data?.ledger?.map((entry: any) => (
                      <div key={entry.id} className="flex gap-3 items-start bg-gray-50 rounded-lg p-3 text-xs">
                        <div className={`flex-shrink-0 px-2 py-0.5 rounded-full font-medium text-xs ${
                          entry.event_type === 'issued' ? 'bg-green-100 text-green-700' :
                          entry.event_type === 'verified' ? 'bg-blue-100 text-blue-700' :
                          entry.event_type === 'exported' ? 'bg-purple-100 text-purple-700' :
                          entry.event_type === 'revoked' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{entry.event_type}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-gray-600">{entry.notes?.slice(0, 100)}</div>
                          <div className="text-gray-400 mt-0.5">{entry.actor_type} · {new Date(entry.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
function SearchPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [q, setQ] = useState(searchParams.get('q') || '')
  const [trade, setTrade] = useState(searchParams.get('trade') || '')
  const [region, setRegion] = useState(searchParams.get('region') || '')
  const [skillLevel, setSkillLevel] = useState(searchParams.get('skill_level') || '')
  const [compliance, setCompliance] = useState(searchParams.get('compliance') || 'any')
  const [skillTag, setSkillTag] = useState(searchParams.get('skill_tag') || '')
  const [sort, setSort] = useState(searchParams.get('sort') || 'badges')
  const [minBadges, setMinBadges] = useState(0)

  const [results, setResults] = useState<Profile[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)

  const runSearch = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (trade) params.set('trade', trade)
    if (region) params.set('region', region)
    if (skillLevel) params.set('skill_level', skillLevel)
    if (compliance !== 'any') params.set('compliance', compliance)
    if (skillTag) params.set('skill_tag', skillTag)
    if (sort) params.set('sort', sort)
    if (minBadges > 0) params.set('min_badges', String(minBadges))
    params.set('limit', '20')

    const res = await fetch(`/api/search?${params}`)
    const data = await res.json()
    setResults(data.results || [])
    setTotal(data.total || 0)
    setSearched(true)
    setLoading(false)
  }, [q, trade, region, skillLevel, compliance, skillTag, sort, minBadges])

  // Auto-search on mount
  useEffect(() => { runSearch() }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Portfolio drawer */}
      {selectedProfileId && (
        <PortfolioDrawer
          profileId={selectedProfileId}
          onClose={() => setSelectedProfileId(null)}
          onBook={() => { setSelectedProfileId(null); router.push('/verify') }}
        />
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-5">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Search Verified Portfolios</h1>
          <p className="text-gray-500 text-sm">Filter by trade, jurisdiction, skill, and code compliance. View auditable credential wallets.</p>

          {/* Main search bar */}
          <div className="mt-4 flex gap-2">
            <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && runSearch()}
              placeholder="Search by name, skill, or badge keyword…"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
            <button onClick={runSearch} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700">
              Search
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* ── Filters sidebar ── */}
          <div className="space-y-4">
            {/* Trade */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-800 text-sm mb-2">Trade</h3>
              <div className="space-y-1">
                {TRADES.map(t => (
                  <button key={t.slug} onClick={() => { setTrade(t.slug); setTimeout(runSearch, 50) }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${trade === t.slug ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}>
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Region */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-800 text-sm mb-2">Jurisdiction</h3>
              <div className="space-y-1">
                {REGIONS.map(r => (
                  <button key={r.code} onClick={() => { setRegion(r.code); setTimeout(runSearch, 50) }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${region === r.code ? 'bg-green-50 text-green-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Skill level */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-800 text-sm mb-2">Skill Level</h3>
              <div className="space-y-1">
                {SKILL_LEVELS.map(l => (
                  <button key={l.value} onClick={() => { setSkillLevel(l.value); setTimeout(runSearch, 50) }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${skillLevel === l.value ? 'bg-purple-50 text-purple-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Code compliance */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-800 text-sm mb-2">Code Compliance</h3>
              <div className="space-y-1">
                {[['any', 'Any'], ['pass', '✓ Pass Only']].map(([v, l]) => (
                  <button key={v} onClick={() => { setCompliance(v); setTimeout(runSearch, 50) }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${compliance === v ? 'bg-amber-50 text-amber-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Skill tag search */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-800 text-sm mb-2">Skill Tag</h3>
              <input value={skillTag} onChange={e => setSkillTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && runSearch()}
                placeholder="e.g. NEC 690, EPA 608…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Sort */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-800 text-sm mb-2">Sort By</h3>
              <div className="space-y-1">
                {SORT_OPTIONS.map(s => (
                  <button key={s.value} onClick={() => { setSort(s.value); setTimeout(runSearch, 50) }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${sort === s.value ? 'bg-gray-100 text-gray-800 font-medium' : 'hover:bg-gray-50 text-gray-600'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Results ── */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-500">
                {searched && !loading && (
                  <span><strong className="text-gray-900">{total}</strong> verified professional{total !== 1 ? 's' : ''} found</span>
                )}
              </div>
              {/* Active filters */}
              <div className="flex gap-1.5 flex-wrap">
                {[
                  trade && { label: TRADES.find(t => t.slug === trade)?.label, key: 'trade' },
                  region && { label: REGIONS.find(r => r.code === region)?.label, key: 'region' },
                  skillLevel && { label: skillLevel, key: 'skill_level' },
                  compliance === 'pass' && { label: 'Code Pass', key: 'compliance' },
                  skillTag && { label: skillTag, key: 'skill_tag' },
                ].filter(Boolean).map((f: any) => (
                  <span key={f.key} className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    {f.label}
                    <button onClick={() => {
                      if (f.key === 'trade') setTrade('')
                      if (f.key === 'region') setRegion('')
                      if (f.key === 'skill_level') setSkillLevel('')
                      if (f.key === 'compliance') setCompliance('any')
                      if (f.key === 'skill_tag') setSkillTag('')
                      setTimeout(runSearch, 50)
                    }} className="hover:text-blue-900">✕</button>
                  </span>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-48" />)}
              </div>
            ) : results.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-gray-600 font-medium">No results match your filters</p>
                <p className="text-gray-400 text-sm mt-1">Try removing a filter or searching by keyword</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {results.map(profile => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    onView={() => setSelectedProfileId(profile.id)}
                    onBook={() => router.push(`/verify?profile_id=${profile.id}&trade=${profile.trades[0] || ''}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 animate-pulse">Loading…</div>}>
      <SearchPageInner />
    </Suspense>
  )
}
