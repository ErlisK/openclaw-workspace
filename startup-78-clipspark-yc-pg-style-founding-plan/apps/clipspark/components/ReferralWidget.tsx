'use client'
import { useState, useEffect } from 'react'

interface ReferralData {
  referral_code: string
  referral_url: string
  credits: { you_earn: number; they_get: number }
  stats: {
    total: number
    pending: number
    activated: number
    credited: number
    credits_earned: number
  }
}

export function ReferralWidget() {
  const [data, setData] = useState<ReferralData | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/referral')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .finally(() => setLoading(false))
  }, [])

  async function copyLink() {
    if (!data?.referral_url) return
    await navigator.clipboard.writeText(data.referral_url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="h-32 bg-gray-900 rounded-2xl animate-pulse" />
  if (!data) return null

  return (
    <div id="referral" className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
      <div>
        <h3 className="font-semibold text-white">🎁 Refer a creator, earn free clips</h3>
        <p className="text-sm text-gray-400 mt-1">
          Share your link. When they make their first clip, you get{' '}
          <strong className="text-white">{data.credits.you_earn} free clips</strong>{' '}
          and they get{' '}
          <strong className="text-white">{data.credits.they_get} bonus clips</strong>{' '}
          just for signing up.
        </p>
      </div>

      {/* Referral link */}
      <div className="flex gap-2">
        <div className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-300 font-mono truncate">
          {data.referral_url}
        </div>
        <button
          onClick={copyLink}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            copied
              ? 'bg-green-700 text-green-200'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          }`}
        >
          {copied ? '✓ Copied!' : 'Copy link'}
        </button>
      </div>

      {/* Referral code badge */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>Your code:</span>
        <code className="bg-gray-800 border border-gray-700 text-indigo-300 px-2 py-0.5 rounded font-mono text-sm">
          {data.referral_code}
        </code>
      </div>

      {/* Stats */}
      {data.stats.total > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Invited', value: data.stats.total },
            { label: 'Activated', value: data.stats.activated },
            { label: 'Clips earned', value: data.stats.credits_earned, highlight: true },
          ].map(s => (
            <div key={s.label} className="bg-gray-800/50 rounded-xl p-3 text-center">
              <div className={`text-2xl font-bold ${s.highlight ? 'text-indigo-300' : 'text-white'}`}>
                {s.value}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-sm text-gray-600">
          No referrals yet — share your link to start earning!
        </div>
      )}

      {/* Share shortcuts */}
      <div className="flex gap-2 pt-1">
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I've been using ClipSpark to turn my podcast episodes into short clips in 10 minutes. Sign up with my link and get ${data.credits.they_get} bonus clips: ${data.referral_url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center text-xs border border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white py-2 rounded-xl transition-colors"
        >
          Share on X
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(data.referral_url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center text-xs border border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white py-2 rounded-xl transition-colors"
        >
          Share on LinkedIn
        </a>
      </div>
    </div>
  )
}
