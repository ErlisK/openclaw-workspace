'use client'
/**
 * /admin/distribution
 *
 * Zero-spend distribution dashboard.
 * Tracks organic channels: Product Hunt, Reddit, TPT, gallery, SEO, direct.
 */
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface DistributionData {
  period:       { days: number }
  sessions:     { total: number; activated: number; activationRate: number }
  orders:       { total: number; totalRevenue: number; conversionRate: number; paidConvertRate: number }
  channels:     Record<string, number>
  teacherPacks: { downloads: number; bySrc: Record<string, number> }
  gallery:      { items: number; totalViews: number }
  okr:          { signups: { target: number; actual: number; pct: number }; conversion: { target: number; actual: number; met: boolean } }
}

const CHANNEL_META: Record<string, { emoji: string; label: string; color: string }> = {
  producthunt: { emoji: '🚀', label: 'Product Hunt',   color: 'bg-orange-100 text-orange-700' },
  reddit:      { emoji: '🤖', label: 'Reddit',          color: 'bg-red-100 text-red-700' },
  twitter:     { emoji: '🐦', label: 'Twitter/X',       color: 'bg-sky-100 text-sky-700' },
  tpt:         { emoji: '🍎', label: 'Teachers Pay Teachers', color: 'bg-green-100 text-green-700' },
  gallery:     { emoji: '🎨', label: 'Gallery',          color: 'bg-violet-100 text-violet-700' },
  seo:         { emoji: '🔍', label: 'SEO/Organic',      color: 'bg-blue-100 text-blue-700' },
  direct:      { emoji: '📎', label: 'Direct',           color: 'bg-gray-100 text-gray-600' },
  email:       { emoji: '📧', label: 'Email',            color: 'bg-yellow-100 text-yellow-700' },
  referral:    { emoji: '🎁', label: 'Referral',         color: 'bg-pink-100 text-pink-700' },
}

function getChannel(key: string) {
  return CHANNEL_META[key] ?? { emoji: '🔗', label: key, color: 'bg-gray-100 text-gray-600' }
}

export default function DistributionDashboard() {
  const [data,    setData]    = useState<DistributionData | null>(null)
  const [days,    setDays]    = useState(14)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/distribution?view=summary&days=${days}`)
      setData(await r.json() as DistributionData)
    } finally { setLoading(false) }
  }, [days])

  useEffect(() => { void load() }, [load])

  const totalChannelVisits = Object.values(data?.channels ?? {}).reduce((s, v) => s + v, 0)
  const sortedChannels = Object.entries(data?.channels ?? {})
    .sort(([, a], [, b]) => b - a)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/admin" className="text-sm text-violet-600 hover:underline">← Admin</Link>
            <h1 className="text-2xl font-extrabold text-gray-900 mt-1">Distribution Dashboard</h1>
            <p className="text-sm text-gray-500">Zero-spend organic growth tracking</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={days} onChange={e => setDays(Number(e.target.value))}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm">
              {[7, 14, 30, 60].map(d => <option key={d} value={d}>Last {d}d</option>)}
            </select>
            <button onClick={() => void load()}
              className="bg-violet-600 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-violet-700">
              {loading ? '…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* OKR Status */}
        {data && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
            <p className="font-bold text-gray-800 mb-3">📊 Phase 7 OKRs</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Signups */}
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-2">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3"/>
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#7c3aed" strokeWidth="3"
                      strokeDasharray={`${data.okr.signups.pct} ${100 - data.okr.signups.pct}`}
                      strokeLinecap="round"/>
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
                    {data.okr.signups.pct}%
                  </span>
                </div>
                <p className="text-xs font-semibold text-gray-700">Signups</p>
                <p className="text-xs text-gray-400">{data.sessions.total}/{data.okr.signups.target}</p>
              </div>
              {/* Paid conversion */}
              <div className="text-center">
                <div className={`w-16 h-16 mx-auto mb-2 rounded-full flex items-center justify-center text-xl font-extrabold ${
                  data.okr.conversion.met ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {data.okr.conversion.met ? '✅' : '⏳'}
                </div>
                <p className="text-xs font-semibold text-gray-700">Conversion</p>
                <p className="text-xs text-gray-400">{data.orders.paidConvertRate}% / {data.okr.conversion.target}%</p>
              </div>
              {/* Teacher packs */}
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-2 bg-blue-50 rounded-full flex items-center justify-center text-2xl">🎒</div>
                <p className="text-xs font-semibold text-gray-700">Teacher Packs</p>
                <p className="text-xs text-gray-400">{data.teacherPacks.downloads} downloads</p>
              </div>
              {/* Gallery */}
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-2 bg-violet-50 rounded-full flex items-center justify-center text-2xl">🎨</div>
                <p className="text-xs font-semibold text-gray-700">Gallery</p>
                <p className="text-xs text-gray-400">{data.gallery.items} pages · {data.gallery.totalViews} views</p>
              </div>
            </div>
          </div>
        )}

        {/* Key metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total sessions',   value: data?.sessions.total ?? 0,            color: 'text-gray-900' },
            { label: 'Activated',        value: data?.sessions.activated ?? 0,         color: 'text-violet-700', sub: `${data?.sessions.activationRate ?? 0}% rate` },
            { label: 'Paid orders',      value: data?.orders.total ?? 0,               color: 'text-green-700' },
            { label: 'Revenue',          value: `$${((data?.orders.totalRevenue ?? 0) / 100).toFixed(2)}`, color: 'text-green-700' },
          ].map(m => (
            <div key={m.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
              <p className={`text-3xl font-extrabold ${m.color}`}>{m.value}</p>
              <p className="text-xs text-gray-500 mt-1">{m.label}</p>
              {m.sub && <p className="text-xs text-gray-400">{m.sub}</p>}
            </div>
          ))}
        </div>

        {/* Channel breakdown */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-4">Traffic by channel</h3>
            {sortedChannels.length === 0 ? (
              <p className="text-sm text-gray-400">No channel data yet. UTM params tracked from links.</p>
            ) : (
              <div className="space-y-3">
                {sortedChannels.map(([key, count]) => {
                  const ch  = getChannel(key)
                  const pct = totalChannelVisits > 0 ? Math.round((count / totalChannelVisits) * 100) : 0
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ch.color}`}>
                            {ch.emoji} {ch.label}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-gray-700">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Distribution tasks */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-4">Distribution channels</h3>
            <div className="space-y-3">
              {[
                { emoji: '🚀', channel: 'Product Hunt', status: 'ready', link: 'https://www.producthunt.com/posts/kidcoloring', desc: 'Launch page prepared', href: '/admin/distribution' },
                { emoji: '🤖', channel: 'Reddit', status: 'ready', link: 'https://reddit.com/r/Teachers', desc: 'r/Teachers, r/Parenting, r/KidsActivities', href: '/admin/distribution' },
                { emoji: '🍎', channel: 'Teachers Pay Teachers', status: 'ready', link: 'https://teacherspayteachers.com', desc: '$0 listing — teacher starter pack', href: '/teachers' },
                { emoji: '🎨', channel: 'Gallery', status: 'live', link: '/gallery', desc: 'Public gallery with watermark', href: '/gallery' },
                { emoji: '🔍', channel: 'SEO pages', status: 'live', link: '/coloring-books/dinosaurs', desc: '16 theme landing pages indexed', href: '/coloring-books/dinosaurs' },
                { emoji: '🎁', channel: 'Referral program', status: 'live', link: '/account', desc: 'Refer-a-friend for free book', href: '/account' },
              ].map(ch => (
                <div key={ch.channel} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{ch.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{ch.channel}</p>
                      <p className="text-xs text-gray-400">{ch.desc}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    ch.status === 'live' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {ch.status === 'live' ? '✅ Live' : '🔜 Ready'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Launch posts links */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
          <p className="font-bold text-blue-800 mb-3">📣 Launch assets</p>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <Link href="/admin/distribution/launch-kit" className="bg-white rounded-xl p-3 border border-blue-100 hover:border-blue-300 transition-colors">
              <p className="font-semibold text-gray-800">🚀 Product Hunt kit</p>
              <p className="text-xs text-gray-400 mt-0.5">Tagline, description, first comment</p>
            </Link>
            <Link href="/admin/distribution/reddit-posts" className="bg-white rounded-xl p-3 border border-blue-100 hover:border-blue-300 transition-colors">
              <p className="font-semibold text-gray-800">🤖 Reddit post templates</p>
              <p className="text-xs text-gray-400 mt-0.5">r/Teachers, r/Parenting, r/SideProject</p>
            </Link>
            <Link href="/teachers" className="bg-white rounded-xl p-3 border border-blue-100 hover:border-blue-300 transition-colors">
              <p className="font-semibold text-gray-800">🍎 Teacher pack page</p>
              <p className="text-xs text-gray-400 mt-0.5">Free pack landing page with download</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
