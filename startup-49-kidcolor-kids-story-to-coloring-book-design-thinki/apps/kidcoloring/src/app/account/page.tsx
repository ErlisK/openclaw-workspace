'use client'

/**
 * /account — Parent account dashboard
 *
 * Sections:
 *   1. COPPA consent gate (shown first-time; required before adding children)
 *   2. Parent profile (display name, email, stats)
 *   3. Children profiles (add/edit/delete; max 5)
 *   4. My books (trial sessions owned by this parent)
 *   5. Sign out
 *
 * COPPA compliance notes:
 *   - No child login credentials ever created
 *   - Children are nicknames + age + interests only
 *   - Parent must explicitly consent before any child data is stored
 *   - "Right to erasure" — delete child profile removes all associated data
 */

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient, signOut } from '@/lib/auth-client'

// ── Types ────────────────────────────────────────────────────────────────────
interface Child {
  id: string
  nickname: string
  age_years: number
  interests: string[]
}
interface TrialPage { id: string; image_url: string | null; sort_order: number; status: string }
interface Session {
  id: string; concept: string; status: string; page_count: number
  share_slug: string; preview_image_url: string | null
  config: Record<string, unknown>; created_at: string; exported_at: string | null
  trial_pages: TrialPage[]
}
interface Profile {
  display_name: string | null
  coppa_agreed: boolean
  coppa_agreed_at: string | null
  books_created: number
  is_subscribed: boolean
}
interface AccountStats { childCount: number; sessionCount: number; exportCount: number }

// ── Helpers ───────────────────────────────────────────────────────────────────
const INTEREST_EMOJIS: Record<string, string> = {
  dinosaurs:'🦖', unicorns:'🦄', space:'🚀', robots:'🤖', dragons:'🐉',
  mermaids:'🧜', puppies:'🐶', kittens:'🐱', princesses:'👸',
  superheroes:'🦸', butterflies:'🦋', ocean:'🌊', fairies:'🧚',
  wizards:'🧙', trains:'🚂', cars:'🚗',
}
const INTERESTS_ALL = Object.keys(INTEREST_EMOJIS)
const AGE_OPTIONS = [
  { value: 3, label: '3 years' }, { value: 4, label: '4 years' },
  { value: 5, label: '5 years' }, { value: 6, label: '6 years' },
  { value: 7, label: '7 years' }, { value: 8, label: '8 years' },
  { value: 9, label: '9 years' }, { value: 10, label: '10 years' },
  { value: 11, label: '11 years' }, { value: 12, label: '12 years' },
]

// ── COPPA Consent Modal ───────────────────────────────────────────────────────
function CoppaGate({ onAgree }: { onAgree: () => void }) {
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleAgree = async () => {
    if (!agreed) return
    setLoading(true)
    await fetch('/api/v1/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coppaAgreed: true }),
    })
    setLoading(false)
    onAgree()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 space-y-6">
        <div className="text-center">
          <span className="text-5xl">👨‍👩‍👧‍👦</span>
          <h2 className="text-2xl font-extrabold text-gray-900 mt-3 mb-1">
            Parent / Guardian Consent
          </h2>
          <p className="text-gray-500 text-sm">Required before managing child profiles</p>
        </div>

        <div className="bg-blue-50 rounded-2xl p-4 text-sm text-blue-800 space-y-2 border border-blue-100">
          <p className="font-bold">🛡️ COPPA Compliance Notice</p>
          <p>KidColoring is designed for children under 13. As a parent or guardian, you confirm:</p>
          <ul className="list-disc list-inside space-y-1 text-blue-700">
            <li>You are at least 18 years old</li>
            <li>You have authority to create profiles for your children</li>
            <li>No child will have their own login account</li>
            <li>Child profiles store only a nickname, age, and interests</li>
            <li>No child&apos;s email address or personal info is collected</li>
            <li>You can delete child profiles at any time</li>
          </ul>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 border border-gray-100">
          <p>We comply with the Children&apos;s Online Privacy Protection Act (COPPA) and
          do not collect personal information from children under 13 without verifiable
          parental consent. See our <a href="/privacy" className="text-violet-600 underline">Privacy Policy</a> for details.</p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
            className="mt-0.5 w-5 h-5 rounded accent-violet-600 flex-shrink-0" />
          <span className="text-sm text-gray-700">
            I am a parent or guardian, I am at least 18, and I consent to
            KidColoring&apos;s use of child profile data as described above.
          </span>
        </label>

        <button onClick={handleAgree} disabled={!agreed || loading}
          className="w-full bg-violet-600 text-white font-extrabold py-4 rounded-2xl
                     hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg">
          {loading ? 'Saving…' : 'I Agree — Continue'}
        </button>
      </div>
    </div>
  )
}

// ── Child Form ────────────────────────────────────────────────────────────────
function ChildForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Child>
  onSave: (data: { nickname: string; ageYears: number; interests: string[] }) => Promise<void>
  onCancel: () => void
}) {
  const [nickname, setNickname]   = useState(initial?.nickname ?? '')
  const [age, setAge]             = useState(initial?.age_years ?? 6)
  const [interests, setInterests] = useState<string[]>(initial?.interests ?? [])
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  const toggleInterest = (id: string) => {
    setInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id].slice(0, 6)
    )
  }

  const handleSubmit = async () => {
    const trimmed = nickname.trim()
    if (!trimmed) { setError('Please enter a nickname'); return }
    setSaving(true)
    setError('')
    try {
      await onSave({ nickname: trimmed, ageYears: age, interests })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    }
    setSaving(false)
  }

  return (
    <div className="bg-violet-50 rounded-2xl border border-violet-200 p-5 space-y-4">
      <h3 className="font-bold text-violet-800">
        {initial?.id ? 'Edit child profile' : 'Add a child'}
      </h3>

      {/* Nickname */}
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">
          Nickname <span className="text-gray-400">(shown on book covers)</span>
        </label>
        <input
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          maxLength={24}
          placeholder="E.g. Lily, Max, Little Star…"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-violet-300"
        />
        <p className="text-xs text-gray-400 mt-1">Use a nickname, not their full name.</p>
      </div>

      {/* Age */}
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Age</label>
        <select value={age} onChange={e => setAge(Number(e.target.value))}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white">
          {AGE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Interests */}
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-2">
          Favourite themes <span className="text-gray-400">(pick up to 6)</span>
        </label>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {INTERESTS_ALL.map(id => {
            const sel = interests.includes(id)
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleInterest(id)}
                disabled={!sel && interests.length >= 6}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 text-xs font-medium
                            transition-all min-h-[56px] touch-manipulation
                            ${sel
                              ? 'border-violet-500 bg-violet-100 text-violet-700'
                              : 'border-gray-200 bg-white text-gray-500 hover:border-violet-200 disabled:opacity-40'
                            }`}
              >
                <span className="text-lg">{INTEREST_EMOJIS[id]}</span>
                <span className="leading-tight capitalize">{id}</span>
              </button>
            )
          })}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={saving}
          className="flex-1 bg-violet-600 text-white font-bold py-3 rounded-xl
                     hover:bg-violet-700 disabled:opacity-60 transition-colors">
          {saving ? 'Saving…' : (initial?.id ? 'Save changes' : 'Add child')}
        </button>
        <button onClick={onCancel}
          className="px-4 py-3 border border-gray-200 rounded-xl text-gray-600
                     hover:bg-gray-50 transition-colors font-semibold">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── ChildCard ─────────────────────────────────────────────────────────────────
function ChildCard({
  child,
  onEdit,
  onDelete,
}: {
  child: Child
  onEdit: () => void
  onDelete: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">
          {INTEREST_EMOJIS[child.interests[0]] ?? '🎨'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900">{child.nickname}</p>
          <p className="text-xs text-gray-500">{child.age_years} years old</p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={onEdit}
            className="text-xs bg-gray-100 hover:bg-violet-100 text-gray-600 hover:text-violet-700
                       px-2 py-1.5 rounded-lg font-semibold transition-colors">
            Edit
          </button>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="text-xs bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-600
                         px-2 py-1.5 rounded-lg transition-colors">
              ✕
            </button>
          ) : (
            <div className="flex gap-1">
              <button onClick={onDelete}
                className="text-xs bg-red-500 text-white px-2 py-1.5 rounded-lg font-bold">
                Delete
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="text-xs bg-gray-100 text-gray-500 px-2 py-1.5 rounded-lg">
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
      {child.interests.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {child.interests.map(i => (
            <span key={i} className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">
              {INTEREST_EMOJIS[i] ?? '•'} {i}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── BookCard ──────────────────────────────────────────────────────────────────
function BookCard({ session }: { session: Session }) {
  const pages = (session.trial_pages ?? []).filter(p => p.status === 'complete')
    .sort((a, b) => a.sort_order - b.sort_order)
  const thumb = pages[0]?.image_url ?? session.preview_image_url
  const interests = (session.config?.interests as string[]) ?? []
  const heroName  = (session.config?.heroName as string) ?? ''
  const title = heroName
    ? `${heroName}'s Book`
    : interests.length ? `${interests.slice(0, 2).join(' + ')} Book` : 'My Coloring Book'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
      <div className="aspect-[3/4] bg-gray-50 relative overflow-hidden">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🎨</div>
        )}
        {session.exported_at && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            ✓ Printed
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="font-bold text-sm text-gray-900 truncate">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {pages.length}/{session.page_count} pages · {new Date(session.created_at).toLocaleDateString()}
        </p>
        <Link href={`/create/preview/${session.id}`}
          className="mt-2 block w-full text-center py-2 bg-violet-600 text-white text-xs
                     font-bold rounded-xl hover:bg-violet-700 transition-colors">
          Open book →
        </Link>
      </div>
    </div>
  )
}

// ── Referral Credits Section ─────────────────────────────────────────────────
function ReferralCreditsSection({ userId }: { userId?: string }) {
  const [data, setData] = useState<{
    credits: number; invitesNeeded: number; stats: { conversions: number; clicks: number }; referralCode?: string
  } | null>(null)

  useEffect(() => {
    if (!userId) return
    fetch(`/api/v1/referral-credits?userId=${userId}`)
      .then(r => r.json())
      .then((d: { credits?: number; invitesNeeded?: number; stats?: { conversions: number; clicks: number }; referralCode?: string }) => {
        setData({
          credits: d.credits ?? 0,
          invitesNeeded: d.invitesNeeded ?? 3,
          stats: d.stats ?? { conversions: 0, clicks: 0 },
          referralCode: d.referralCode,
        })
      })
      .catch(() => {})
  }, [userId])

  if (!userId || !data) return null

  const referralUrl = data.referralCode
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://kidcoloring-research.vercel.app'}/refer/${data.referralCode}`
    : null

  const progress = data.invitesNeeded === 0 ? 100 : Math.round(((3 - data.invitesNeeded) / 3) * 100)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-800">Referral credits</h2>
        {data.credits > 0 && (
          <span className="bg-violet-100 text-violet-700 font-extrabold text-sm px-3 py-1 rounded-full">
            {data.credits} free {data.credits === 1 ? 'book' : 'books'}
          </span>
        )}
      </div>

      <p className="text-sm text-gray-500">
        Invite 3 families and get 1 free book download. Every 3 conversions = 1 credit.
      </p>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>{3 - data.invitesNeeded}/3 successful invites</span>
          <span>{data.invitesNeeded} more needed</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div className="h-2.5 bg-violet-500 rounded-full transition-all" style={{ width: `${progress}%` }}/>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-gray-50 rounded-xl p-2">
          <p className="font-extrabold text-gray-800">{data.stats.clicks}</p>
          <p className="text-gray-400">Link clicks</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2">
          <p className="font-extrabold text-gray-800">{data.stats.conversions}</p>
          <p className="text-gray-400">Joined</p>
        </div>
        <div className="bg-violet-50 rounded-xl p-2">
          <p className="font-extrabold text-violet-700">{data.credits}</p>
          <p className="text-violet-500">Credits</p>
        </div>
      </div>

      {referralUrl && (
        <p className="text-xs text-gray-400">
          Share: <span className="font-mono text-violet-600">{referralUrl}</span>
        </p>
      )}
    </div>
  )
}

// ── Referral Section ─────────────────────────────────────────────────────────
function ReferralSection({ userId }: { userId?: string }) {
  const [code, setCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!userId) return
    fetch(`/api/v1/referral?userId=${userId}`)
      .then(r => r.json())
      .then((d: { referral?: { referral_code: string } }) => {
        if (d.referral?.referral_code) setCode(d.referral.referral_code)
      })
      .catch(() => {})
  }, [userId])

  const referralUrl = code
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://kidcoloring-research.vercel.app'}/refer/${code}`
    : null

  const copyLink = async () => {
    if (!referralUrl) return
    await navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!userId) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
      <div>
        <h2 className="font-bold text-gray-800">Share with friends</h2>
        <p className="text-xs text-gray-500 mt-0.5">Send your unique link — friends get a personalized welcome</p>
      </div>
      {referralUrl ? (
        <div className="flex gap-2">
          <input
            readOnly value={referralUrl}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-600 bg-gray-50 font-mono overflow-hidden"
          />
          <button onClick={copyLink}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
              copied ? 'bg-green-100 text-green-700' : 'bg-violet-100 text-violet-700 hover:bg-violet-200'
            }`}>
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
      ) : (
        <div className="h-8 bg-gray-100 rounded-xl animate-pulse"/>
      )}
    </div>
  )
}

// ── Main Account Page ─────────────────────────────────────────────────────────
export default function AccountPage() {
  const [user, setUser]           = useState<{ id: string; email: string } | null>(null)
  const [profile, setProfile]     = useState<Profile | null>(null)
  const [stats, setStats]         = useState<AccountStats | null>(null)
  const [children, setChildren]   = useState<Child[]>([])
  const [sessions, setSessions]   = useState<Session[]>([])
  const [loading, setLoading]     = useState(true)
  const [showCoppa, setShowCoppa] = useState(false)
  const [editingChild, setEditingChild] = useState<Child | null | 'new'>(null)
  const [displayName, setDisplayName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [activeTab, setActiveTab] = useState<'books' | 'children' | 'profile'>('books')

  const loadAccount = useCallback(async () => {
    setLoading(true)
    try {
      const [profileRes, childrenRes] = await Promise.all([
        fetch('/api/v1/profile'),
        fetch('/api/v1/children'),
      ])

      if (profileRes.ok) {
        const pd = await profileRes.json() as {
          user: { id: string; email: string }
          profile: Profile | null
          stats: AccountStats
        }
        setUser(pd.user)
        setProfile(pd.profile)
        setStats(pd.stats)
        setDisplayName(pd.profile?.display_name ?? '')
        if (!pd.profile?.coppa_agreed) setShowCoppa(true)
      }

      if (childrenRes.ok) {
        const cd = await childrenRes.json() as { children: Child[] }
        setChildren(cd.children)
      }

      // Load sessions
      const supabase = createClient()
      const { data: { user: sbUser } } = await supabase.auth.getUser()
      if (sbUser) {
        const { data: sessData } = await supabase
          .from('trial_sessions')
          .select('id, concept, status, page_count, share_slug, preview_image_url, config, created_at, exported_at, trial_pages(id, image_url, sort_order, status)')
          .eq('user_id', sbUser.id)
          .order('created_at', { ascending: false })
          .limit(20)
        setSessions((sessData ?? []) as Session[])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { loadAccount() }, [loadAccount])

  const handleCoppaAgree = () => {
    setShowCoppa(false)
    setProfile(prev => prev ? { ...prev, coppa_agreed: true } : null)
  }

  const handleSaveDisplayName = async () => {
    if (!displayName.trim()) return
    setSavingName(true)
    await fetch('/api/v1/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName }),
    })
    setSavingName(false)
  }

  const handleAddChild = async (data: { nickname: string; ageYears: number; interests: string[] }) => {
    const res = await fetch('/api/v1/children', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json() as { message?: string; error?: string }
      throw new Error(err.message ?? err.error ?? 'Failed to add child')
    }
    const { child } = await res.json() as { child: Child }
    setChildren(prev => [...prev, child])
    setEditingChild(null)
  }

  const handleEditChild = async (id: string, data: { nickname: string; ageYears: number; interests: string[] }) => {
    const res = await fetch(`/api/v1/children?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to update child')
    const { child } = await res.json() as { child: Child }
    setChildren(prev => prev.map(c => c.id === id ? child : c))
    setEditingChild(null)
  }

  const handleDeleteChild = async (id: string) => {
    await fetch(`/api/v1/children?id=${id}`, { method: 'DELETE' })
    setChildren(prev => prev.filter(c => c.id !== id))
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin mx-auto"/>
          <p className="text-sm text-gray-500">Loading your account…</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'books',    label: `📚 My Books (${stats?.sessionCount ?? 0})` },
    { id: 'children', label: `👧 Children (${children.length})` },
    { id: 'profile',  label: '⚙️ Profile' },
  ] as const

  return (
    <>
      {showCoppa && <CoppaGate onAgree={handleCoppaAgree} />}

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← Home</Link>
            <div className="flex-1">
              <h1 className="text-lg font-extrabold text-gray-900">
                {profile?.display_name ? `${profile.display_name}'s Account` : 'My Account'}
              </h1>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
            <button onClick={handleSignOut}
              className="text-sm text-gray-400 hover:text-gray-600 font-medium">
              Sign out
            </button>
          </div>

          {/* Tabs */}
          <div className="max-w-2xl mx-auto mt-3 flex gap-1">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex-1 ${
                  activeTab === t.id
                    ? 'bg-violet-100 text-violet-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Books made', value: stats?.sessionCount ?? 0 },
              { label: 'Printed', value: stats?.exportCount ?? 0 },
              { label: 'Children', value: stats?.childCount ?? 0 },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
                <p className="text-2xl font-extrabold text-violet-700">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* ── BOOKS TAB ──────────────────────────────────────────────────── */}
          {activeTab === 'books' && (
            <div className="space-y-4">
              {sessions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                  <p className="text-4xl mb-3">🎨</p>
                  <p className="font-bold text-gray-800 mb-1">No books yet</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Make your first personalized coloring book — free, no credit card.
                  </p>
                  <Link href="/create/interests"
                    className="inline-block bg-violet-600 text-white font-bold px-6 py-3 rounded-2xl
                               hover:bg-violet-700 transition-colors">
                    Make a book →
                  </Link>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {sessions.map(s => <BookCard key={s.id} session={s} />)}
                  </div>
                  <div className="text-center pt-2">
                    <Link href="/create/interests"
                      className="inline-flex items-center gap-2 bg-violet-600 text-white font-bold px-6 py-3 rounded-2xl hover:bg-violet-700 transition-colors">
                      ✨ Make another book
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── CHILDREN TAB ───────────────────────────────────────────────── */}
          {activeTab === 'children' && (
            <div className="space-y-4">
              {!profile?.coppa_agreed ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
                  <p className="text-2xl mb-2">⚠️</p>
                  <p className="font-bold text-amber-800 mb-1">Parental consent required</p>
                  <p className="text-sm text-amber-700 mb-3">
                    You need to agree to our COPPA terms before adding child profiles.
                  </p>
                  <button onClick={() => setShowCoppa(true)}
                    className="bg-amber-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-amber-700 transition-colors">
                    Review &amp; agree →
                  </button>
                </div>
              ) : (
                <>
                  {/* Existing children */}
                  {children.map(child => (
                    editingChild && typeof editingChild === 'object' && editingChild.id === child.id
                      ? <ChildForm
                          key={child.id}
                          initial={child}
                          onSave={data => handleEditChild(child.id, data)}
                          onCancel={() => setEditingChild(null)}
                        />
                      : <ChildCard
                          key={child.id}
                          child={child}
                          onEdit={() => setEditingChild(child)}
                          onDelete={() => handleDeleteChild(child.id)}
                        />
                  ))}

                  {/* Add child form or button */}
                  {editingChild === 'new' ? (
                    <ChildForm
                      onSave={handleAddChild}
                      onCancel={() => setEditingChild(null)}
                    />
                  ) : children.length < 5 && (
                    <button
                      onClick={() => profile.coppa_agreed ? setEditingChild('new') : setShowCoppa(true)}
                      className="w-full py-4 border-2 border-dashed border-violet-200 text-violet-600
                                 rounded-2xl font-semibold hover:border-violet-400 hover:bg-violet-50
                                 transition-all flex items-center justify-center gap-2">
                      + Add a child
                    </button>
                  )}

                  {children.length >= 5 && (
                    <p className="text-xs text-center text-gray-400">
                      Maximum of 5 child profiles per account.
                    </p>
                  )}

                  <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 border border-gray-100">
                    <p className="font-semibold mb-1">🛡️ Privacy reminder</p>
                    <p>Child profiles contain only a nickname, age, and interests.
                    No email, last name, or school is stored.
                    You can delete any profile at any time from this page.</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── PROFILE TAB ────────────────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {/* Display name */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <h2 className="font-bold text-gray-800">Your display name</h2>
                <div className="flex gap-2">
                  <input
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    maxLength={48}
                    placeholder="E.g. Sarah's Household"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                               focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                  <button onClick={handleSaveDisplayName} disabled={savingName || !displayName.trim()}
                    className="bg-violet-600 text-white font-bold px-4 py-2.5 rounded-xl
                               hover:bg-violet-700 disabled:opacity-50 transition-colors text-sm">
                    {savingName ? '…' : 'Save'}
                  </button>
                </div>
              </div>

              {/* Account details */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <h2 className="font-bold text-gray-800">Account details</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-500">Email</span>
                    <span className="text-gray-800 font-medium">{user?.email}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-500">COPPA consent</span>
                    <span className={profile?.coppa_agreed ? 'text-green-600 font-semibold' : 'text-amber-600'}>
                      {profile?.coppa_agreed ? `✅ Agreed ${profile.coppa_agreed_at ? new Date(profile.coppa_agreed_at).toLocaleDateString() : ''}` : '⚠️ Not yet agreed'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-500">Plan</span>
                    <span className="text-gray-800 font-medium">
                      {profile?.is_subscribed ? '⭐ Premium' : 'Free trial'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Referral credits */}
              <ReferralCreditsSection userId={user?.id} />
              {/* Referral link */}
              <ReferralSection userId={user?.id} />

              {/* Danger zone */}
              <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5 space-y-3">
                <h2 className="font-bold text-red-700">Account actions</h2>
                <div className="space-y-2">
                  <button onClick={handleSignOut}
                    className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl
                               text-sm font-semibold hover:bg-gray-50 transition-colors">
                    Sign out of this device
                  </button>
                  <p className="text-xs text-gray-400 text-center">
                    To delete your account and all data, contact{' '}
                    <a href="mailto:privacy@kidcoloring.app" className="text-violet-600 underline">
                      privacy@kidcoloring.app
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
