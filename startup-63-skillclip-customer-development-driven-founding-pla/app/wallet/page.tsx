'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

type Badge = {
  id: string; title: string; badge_type: string; skill_tags: string[]
  region_name: string; code_standard: string; issued_at: string; is_revoked: boolean; metadata: any
  trade: { name: string; slug: string } | null
  region: { name: string; region_code: string } | null
  review: { overall_rating: number; skill_level: string; feedback_text: string; timestamped_notes: any[]; code_compliance_pass: boolean; jurisdiction_notes: string; completed_at: string } | null
  clip: { title: string; duration_seconds: number; challenge_prompt: string } | null
}
type LedgerEntry = { id: string; event_type: string; actor_type: string; created_at: string; notes: string; metadata: any }

const BADGE_GRADIENTS = ['from-blue-500 to-indigo-600', 'from-green-500 to-emerald-600', 'from-orange-500 to-red-600', 'from-purple-500 to-violet-600', 'from-yellow-500 to-amber-600', 'from-cyan-500 to-blue-600']
const TRADE_EMOJI: Record<string, string> = { electrician: '⚡', plumber: '🔧', 'hvac-technician': '❄️', welder: '🔥', pipefitter: '🔩', carpenter: '🪚' }
const EVENT_STYLE: Record<string, string> = {
  issued:     'bg-green-100 text-green-700',
  verified:   'bg-blue-100 text-blue-700',
  exported:   'bg-purple-100 text-purple-700',
  revoked:    'bg-red-100 text-red-700',
  expired:    'bg-gray-100 text-gray-500',
  reinstated: 'bg-amber-100 text-amber-700',
  api_accessed: 'bg-indigo-100 text-indigo-700',
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">{[1,2,3,4,5].map(s => <span key={s} className={`text-sm ${s <= rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>)}</span>
  )
}

function BadgeCard({ badge, idx, expanded, onExpand }: { badge: Badge; idx: number; expanded: boolean; onExpand: () => void }) {
  const emoji = badge.trade ? TRADE_EMOJI[badge.trade.slug] || '🏅' : '🏅'
  const grad = BADGE_GRADIENTS[idx % BADGE_GRADIENTS.length]

  return (
    <div className={`rounded-xl overflow-hidden border-2 transition-all ${badge.is_revoked ? 'opacity-50 border-red-200' : expanded ? 'border-blue-300 shadow-lg' : 'border-gray-200 hover:border-blue-200 hover:shadow-md cursor-pointer'}`}
      onClick={!expanded ? onExpand : undefined}>
      {/* Badge header */}
      <div className={`bg-gradient-to-r ${grad} p-4 text-white`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-2xl mb-1">{emoji}</div>
            <div className="text-xs font-medium opacity-80 uppercase tracking-wide">{badge.badge_type?.replace(/_/g, ' ')}</div>
          </div>
          <div className="text-right text-xs opacity-80">
            {badge.region?.region_code && <div>{badge.region.region_code}</div>}
            {badge.code_standard && <div>{badge.code_standard}</div>}
            {badge.is_revoked && <div className="font-bold text-red-200">REVOKED</div>}
          </div>
        </div>
        <h3 className="font-bold mt-2 leading-tight text-sm">{badge.title}</h3>
      </div>

      {/* Badge body */}
      <div className="p-4 bg-white">
        <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
          {badge.trade && <span>{emoji} {badge.trade.name}</span>}
          <span>📅 {new Date(badge.issued_at).toLocaleDateString()}</span>
          {badge.review && (
            <>
              <span className="flex items-center gap-1"><StarRow rating={badge.review.overall_rating} /> {badge.review.overall_rating}/5</span>
              {badge.review.skill_level && <span className={`px-2 py-0.5 rounded-full capitalize font-medium ${badge.review.skill_level === 'master' ? 'bg-purple-100 text-purple-700' : badge.review.skill_level === 'journeyman' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{badge.review.skill_level}</span>}
              <span className={`font-medium ${badge.review.code_compliance_pass ? 'text-green-600' : 'text-red-500'}`}>{badge.review.code_compliance_pass ? '✓ Code Compliant' : '✗ Non-Compliant'}</span>
            </>
          )}
        </div>

        {badge.skill_tags?.filter(t => t.trim()).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {badge.skill_tags.filter(t => t.trim()).slice(0, 5).map(t => (
              <span key={t} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{t.trim()}</span>
            ))}
          </div>
        )}

        {!expanded && <button className="text-xs text-blue-500 hover:underline">View details →</button>}

        {/* Expanded detail */}
        {expanded && (
          <div className="mt-3 space-y-3" onClick={e => e.stopPropagation()}>
            {/* Clip info */}
            {badge.clip && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs font-semibold text-gray-700 mb-1">📹 Work Sample</div>
                <div className="text-xs text-gray-600 font-medium">{badge.clip.title}</div>
                <div className="text-xs text-gray-400">{badge.clip.duration_seconds}s</div>
                {badge.clip.challenge_prompt && (
                  <div className="mt-1.5 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 line-clamp-2">
                    🎯 {badge.clip.challenge_prompt.slice(0, 100)}…
                  </div>
                )}
              </div>
            )}

            {/* Review feedback */}
            {badge.review && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs font-semibold text-gray-700 mb-1">💬 Mentor Feedback</div>
                {badge.review.feedback_text && (
                  <p className="text-xs text-gray-600 italic mb-2">"{badge.review.feedback_text}"</p>
                )}
                {badge.review.jurisdiction_notes && (
                  <div className="text-xs text-gray-500 mb-2">📋 {badge.review.jurisdiction_notes}</div>
                )}
                {badge.review.timestamped_notes?.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Timestamped notes:</div>
                    <div className="space-y-1">
                      {badge.review.timestamped_notes.map((n: any, i: number) => (
                        <div key={i} className="flex gap-2 text-xs">
                          <span className="bg-blue-100 text-blue-700 font-mono px-1.5 rounded flex-shrink-0">{n.time}</span>
                          <span className="text-gray-600">{n.note}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <button onClick={onExpand} className="text-xs text-gray-400 hover:underline">Collapse</button>
          </div>
        )}
      </div>
    </div>
  )
}

function WalletPageInner() {
  const searchParams = useSearchParams()
  const initialEmail = searchParams.get('email') || ''

  const [email, setEmail] = useState(initialEmail)
  const [inputEmail, setInputEmail] = useState(initialEmail)
  const [profile, setProfile] = useState<any>(null)
  const [badges, setBadges] = useState<Badge[]>([])
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [expandedBadgeId, setExpandedBadgeId] = useState<string | null>(null)
  const [tab, setTab] = useState<'badges' | 'ledger' | 'share'>('badges')
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const loadByEmail = async (e: string) => {
    if (!e) return
    setLoading(true); setNotFound(false)
    // Look up profile by email, then load portfolio
    const res = await fetch(`/api/search?profile_id=lookup&email=${encodeURIComponent(e)}`)
    // Fallback: load by searching profiles table directly
    const srk = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!srk || !base) { setLoading(false); return }
    const profRes = await fetch(`${base}/rest/v1/profiles?email=eq.${encodeURIComponent(e)}&select=id,full_name,email,years_experience,bio`, {
      headers: { apikey: srk, Authorization: `Bearer ${srk}` }
    })
    const profiles = await profRes.json()
    if (!profiles?.[0]) { setNotFound(true); setLoading(false); return }
    await loadByProfileId(profiles[0].id)
    setLoading(false)
  }

  const loadByProfileId = async (id: string) => {
    const res = await fetch(`/api/search?profile_id=${id}`)
    const data = await res.json()
    if (data.error || !data.profile) { setNotFound(true); return }
    setProfile(data.profile)
    setBadges(data.badges || [])
    setLedger(data.ledger || [])
    setShareUrl(`https://certclip.com/wallet?profile_id=${id}`)
  }

  useEffect(() => {
    const pid = searchParams.get('profile_id')
    if (pid) { setLoading(true); loadByProfileId(pid).then(() => setLoading(false)) }
    else if (initialEmail) loadByEmail(initialEmail)
    else {
      // Load own wallet (logged-in user)
      const srk = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (!srk || !base) return
      fetch(`${base}/auth/v1/user`, { headers: { apikey: srk, Authorization: `Bearer ${srk}` } })
        .then(r => r.json())
        .then(user => {
          if (user?.email) { setEmail(user.email); loadByEmail(user.email) }
        })
        .catch(() => {})
    }
  }, [])

  const activeBadges = badges.filter(b => !b.is_revoked)
  const revokedBadges = badges.filter(b => b.is_revoked)
  const avgRating = badges.length > 0 && badges[0]?.review ? (
    badges.filter(b => b.review?.overall_rating).reduce((s, b) => s + (b.review?.overall_rating || 0), 0) /
    badges.filter(b => b.review?.overall_rating).length
  ) : null

  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Credential Wallet</h1>
          <p className="text-gray-500 text-sm mt-1">Verified skill badges with auditable issuance ledger</p>
        </div>

        {/* Email lookup */}
        {!profile && !loading && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="font-semibold text-gray-800 mb-3">View a wallet</h2>
            <div className="flex gap-2">
              <input value={inputEmail} onChange={e => setInputEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadByEmail(inputEmail)}
                type="email" placeholder="tradesperson@example.com"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
              <button onClick={() => loadByEmail(inputEmail)} className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700">
                Load Wallet
              </button>
            </div>
            {notFound && <p className="text-red-500 text-sm mt-2">No profile found for that email.</p>}
          </div>
        )}

        {loading && <div className="text-center text-gray-400 py-12 animate-pulse">Loading wallet…</div>}

        {profile && !loading && (
          <>
            {/* Profile header */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{profile.full_name}</h2>
                  <p className="text-gray-500 text-sm mt-0.5">{profile.years_experience} years experience</p>
                  {profile.bio && <p className="text-gray-400 text-xs mt-1">{profile.bio}</p>}
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-600">{activeBadges.length}</div>
                  <div className="text-gray-400 text-xs">active badge{activeBadges.length !== 1 ? 's' : ''}</div>
                  {avgRating && <div className="text-yellow-600 text-sm font-medium mt-1">★ {avgRating.toFixed(1)} avg</div>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[...new Set(activeBadges.map(b => b.trade?.name).filter(Boolean))].map(t => (
                  <span key={t} className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium">{TRADE_EMOJI[activeBadges.find(b => b.trade?.name === t)?.trade?.slug || ''] || ''} {t}</span>
                ))}
                {[...new Set(activeBadges.map(b => b.region?.region_code).filter(Boolean))].map(r => (
                  <span key={r} className="bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-full font-medium">📍 {r}</span>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-white rounded-t-xl mb-0">
              {[
                ['badges', `🏅 Badges (${activeBadges.length})`],
                ['ledger', `🔐 Audit Log (${ledger.length})`],
                ['share', '🔗 Share'],
              ].map(([t, l]) => (
                <button key={t} onClick={() => setTab(t as any)}
                  className={`py-3 px-5 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {l}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-b-xl border border-t-0 border-gray-200 p-5">
              {/* Badges */}
              {tab === 'badges' && (
                <div>
                  {activeBadges.length === 0 && <p className="text-gray-400 text-center py-8">No active badges yet</p>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeBadges.map((badge, i) => (
                      <BadgeCard key={badge.id} badge={badge} idx={i}
                        expanded={expandedBadgeId === badge.id}
                        onExpand={() => setExpandedBadgeId(expandedBadgeId === badge.id ? null : badge.id)} />
                    ))}
                  </div>
                  {revokedBadges.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-gray-400 mb-2">Revoked Badges</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {revokedBadges.map((badge, i) => (
                          <BadgeCard key={badge.id} badge={badge} idx={i}
                            expanded={false} onExpand={() => {}} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Ledger */}
              {tab === 'ledger' && (
                <div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 mb-4">
                    🔐 <strong>Append-only audit ledger.</strong> Every credential event is permanently recorded here with actor identity, timestamp, and metadata. Rows cannot be modified or deleted — this provides a tamper-proof issuance history for employers, ATS systems, and compliance audits.
                  </div>
                  {ledger.length === 0 && <p className="text-gray-400 text-center py-8">No ledger entries yet</p>}
                  <div className="space-y-2">
                    {ledger.map(entry => (
                      <div key={entry.id} className="flex gap-3 items-start border border-gray-100 rounded-lg p-3">
                        <div className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${EVENT_STYLE[entry.event_type] || 'bg-gray-100 text-gray-600'}`}>
                          {entry.event_type}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-700">{entry.notes?.slice(0, 120) || '—'}</div>
                          <div className="text-xs text-gray-400 mt-0.5 flex gap-2">
                            <span className="capitalize">{entry.actor_type}</span>
                            <span>·</span>
                            <span>{new Date(entry.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Share */}
              {tab === 'share' && (
                <div className="max-w-md mx-auto py-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Share this wallet</h3>
                  <p className="text-gray-500 text-sm mb-4">Share a read-only link to this credential wallet with employers or include it in your resume.</p>
                  <div className="flex gap-2 mb-4">
                    <input readOnly value={shareUrl} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 font-mono text-xs" />
                    <button onClick={copyShareUrl} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${copied ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-sm">
                    <div className="font-semibold text-gray-800 mb-2">What employers see:</div>
                    <ul className="space-y-1 text-gray-600 text-xs">
                      <li>✅ All active badges with trade + jurisdiction tags</li>
                      <li>✅ Mentor ratings and timestamped feedback</li>
                      <li>✅ Code compliance pass/fail per clip</li>
                      <li>✅ Full audit ledger (issued/verified/exported events)</li>
                      <li>🔒 Private info (email, full contact) hidden</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function WalletPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 animate-pulse">Loading…</div>}>
      <WalletPageInner />
    </Suspense>
  )
}
