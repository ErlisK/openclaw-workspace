'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Badge = {
  id: string
  title: string
  description: string
  badge_type: string
  skill_tags: string[]
  region_name: string
  code_standard: string
  issued_by: string
  issued_at: string
  is_revoked: boolean
  metadata: any
  trade: { name: string; slug: string } | null
  clip: { title: string; duration_seconds: number } | null
}

type Profile = {
  full_name: string
  email: string
  role: string
  years_experience: number
  bio: string
}

const badgeColors = ['from-blue-500 to-indigo-600', 'from-green-500 to-emerald-600', 'from-orange-500 to-red-600', 'from-purple-500 to-violet-600', 'from-yellow-500 to-amber-600']
const tradeEmoji: Record<string, string> = { electrician: '⚡', plumber: '🔧', 'hvac-technician': '❄️', welder: '🔥', pipefitter: '🔩' }

export default function WalletPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [searchEmail, setSearchEmail] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [filter, setFilter] = useState<'all' | 'skill' | 'jurisdiction'>('all')

  const loadWallet = async (email: string) => {
    setLoading(true)
    const { data: p } = await supabase
      .from('profiles')
      .select('id,full_name,email,role,years_experience,bio')
      .eq('email', email)
      .single()

    if (!p) { setLoading(false); return }
    setProfile(p as any)
    setProfileId(p.id)

    const { data: b } = await supabase
      .from('badges')
      .select(`
        id, title, description, badge_type, skill_tags, region_name, code_standard,
        issued_by, issued_at, is_revoked, metadata,
        trade:trades(name, slug),
        clip:clips(title, duration_seconds)
      `)
      .eq('profile_id', p.id)
      .eq('is_revoked', false)
      .order('issued_at', { ascending: false })

    setBadges((b as any) || [])
    setShareUrl(`${window.location.origin}/wallet?email=${encodeURIComponent(email)}`)
    setLoading(false)
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const email = params.get('email')
    if (email) { setSearchEmail(email); setSearchInput(email); loadWallet(email) }
    else setLoading(false)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchEmail(searchInput)
    loadWallet(searchInput)
  }

  const copyShare = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filteredBadges = badges.filter(b => filter === 'all' || b.badge_type === filter)

  const stats = {
    total: badges.length,
    trades: [...new Set(badges.map(b => (b.trade as any)?.slug).filter(Boolean))].length,
    regions: [...new Set(badges.map(b => b.region_name).filter(Boolean))].length,
    avgRating: badges.length ? (badges.reduce((s, b) => s + (b.metadata?.overall_rating || 0), 0) / badges.length).toFixed(1) : '—',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur border-b border-white/10 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏅</span>
            <div>
              <h1 className="text-white font-bold text-lg">CertClip Wallet</h1>
              <p className="text-blue-300 text-xs">Verified Trade Credentials</p>
            </div>
          </div>
          <nav className="flex gap-4 text-sm text-blue-300">
            <a href="/search" className="hover:text-white">Search Portfolios</a>
            <a href="/issue-badge" className="hover:text-white">Issue Badge</a>
          </nav>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Search */}
        {!profile && !loading && (
          <div className="text-center mb-12">
            <p className="text-blue-200 text-lg mb-6">Enter a tradesperson's email to view their credential wallet</p>
            <form onSubmit={handleSearch} className="flex gap-3 max-w-md mx-auto">
              <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="tradesperson@example.com" type="email"
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <button type="submit" className="bg-blue-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-600">View</button>
            </form>
            <p className="text-blue-400 text-sm mt-4">Try: <button onClick={() => { setSearchInput('trade1@certclip-pilot.dev'); loadWallet('trade1@certclip-pilot.dev') }} className="underline hover:text-blue-300">trade1@certclip-pilot.dev</button></p>
          </div>
        )}

        {loading && (
          <div className="text-center py-20">
            <div className="animate-spin text-4xl">⏳</div>
            <p className="text-blue-300 mt-4">Loading credential wallet…</p>
          </div>
        )}

        {profile && !loading && (
          <>
            {/* Profile card */}
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6 border border-white/20">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">{profile.full_name}</h2>
                  <p className="text-blue-300 capitalize">{profile.role} · {profile.years_experience} years experience</p>
                  {profile.bio && <p className="text-blue-200 text-sm mt-2 max-w-xl">{profile.bio}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button onClick={copyShare} className="bg-white/20 hover:bg-white/30 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                    {copied ? '✓ Copied!' : '🔗 Share Wallet'}
                  </button>
                  <a href={`/search?email=${encodeURIComponent(searchEmail)}`} className="text-blue-300 text-xs hover:text-white">View as employer →</a>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
                {[
                  { label: 'Verified Badges', value: stats.total },
                  { label: 'Trades', value: stats.trades },
                  { label: 'Jurisdictions', value: stats.regions },
                  { label: 'Avg Rating', value: stats.avgRating },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div className="text-2xl font-bold text-white">{s.value}</div>
                    <div className="text-blue-400 text-xs mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 mb-6">
              {(['all', 'skill', 'jurisdiction'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-blue-500 text-white' : 'bg-white/10 text-blue-300 hover:bg-white/20'}`}>
                  {f === 'all' ? `All (${badges.length})` : f}
                </button>
              ))}
            </div>

            {/* Badge grid */}
            {filteredBadges.length === 0 ? (
              <div className="text-center py-12 text-blue-400">No badges found</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBadges.map((badge, i) => {
                  const tradeSlug = (badge.trade as any)?.slug || ''
                  const emoji = tradeEmoji[tradeSlug] || '🔨'
                  const color = badgeColors[i % badgeColors.length]
                  return (
                    <div key={badge.id} className="bg-white/10 backdrop-blur rounded-xl border border-white/20 overflow-hidden hover:border-white/40 transition-colors">
                      {/* Badge header */}
                      <div className={`bg-gradient-to-r ${color} p-4`}>
                        <div className="flex items-start justify-between">
                          <span className="text-3xl">{emoji}</span>
                          <div className="text-right">
                            <div className="text-white/80 text-xs">{'★'.repeat(badge.metadata?.overall_rating || 0)}</div>
                            <div className="text-white/70 text-xs capitalize">{badge.metadata?.skill_level}</div>
                          </div>
                        </div>
                        <h3 className="text-white font-semibold text-sm mt-2 leading-tight">{badge.title}</h3>
                      </div>

                      {/* Badge body */}
                      <div className="p-4">
                        {badge.region_name && (
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-blue-400 text-xs">📍</span>
                            <span className="text-blue-200 text-xs">{badge.region_name}</span>
                            {badge.code_standard && <span className="text-blue-400 text-xs">· {badge.code_standard}</span>}
                          </div>
                        )}

                        {badge.clip && (
                          <div className="text-blue-300 text-xs mb-2">
                            📹 {(badge.clip as any).title?.slice(0, 40)}{(badge.clip as any).title?.length > 40 ? '…' : ''}
                          </div>
                        )}

                        {badge.skill_tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {badge.skill_tags.slice(0, 4).map(t => (
                              <span key={t} className="text-xs bg-white/10 text-blue-300 px-2 py-0.5 rounded-full">#{t}</span>
                            ))}
                            {badge.skill_tags.length > 4 && <span className="text-xs text-blue-400">+{badge.skill_tags.length - 4}</span>}
                          </div>
                        )}

                        <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                          <div>
                            <p className="text-blue-400 text-xs">Reviewed by</p>
                            <p className="text-white text-xs font-medium">{badge.issued_by}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-blue-400 text-xs">{new Date(badge.issued_at).toLocaleDateString()}</p>
                            <p className={`text-xs font-medium mt-0.5 ${badge.metadata?.code_compliance_pass !== false ? 'text-green-400' : 'text-red-400'}`}>
                              {badge.metadata?.code_compliance_pass !== false ? '✓ Code compliant' : '⚠ Compliance issue'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
