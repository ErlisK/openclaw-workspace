'use client'
import { useState } from 'react'

interface Props {
  code: string
  referralUrl: string
  shareText: string
  rewardValue: number
}

export default function ReferralShareBox({ code, referralUrl, shareText, rewardValue }: Props) {
  const [copied, setCopied] = useState<'url' | 'code' | null>(null)

  async function copy(text: string, type: 'url' | 'code') {
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const rewardDollars = (rewardValue / 100).toFixed(0)

  return (
    <div className="bg-gradient-to-br from-[#ff6600]/10 to-transparent border border-[#ff6600]/20 rounded-2xl p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-[#ff6600] font-semibold uppercase tracking-wide mb-1">Your Referral Link</div>
          <div className="text-sm text-gray-400">
            Share this link — you both get <strong className="text-white">${rewardDollars} in credits</strong> when they join.
          </div>
        </div>
        <div className="text-3xl">🎁</div>
      </div>

      {/* URL copy */}
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 font-mono text-sm text-gray-300 truncate">
          {referralUrl}
        </div>
        <button
          onClick={() => copy(referralUrl, 'url')}
          className="bg-[#ff6600] hover:bg-[#e55a00] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex-shrink-0"
        >
          {copied === 'url' ? '✓ Copied!' : 'Copy'}
        </button>
      </div>

      {/* Code copy */}
      <div className="flex items-center gap-3">
        <div className="text-xs text-gray-500">Or share your code:</div>
        <button
          onClick={() => copy(code, 'code')}
          className="bg-white/8 hover:bg-white/12 border border-white/15 text-white px-3 py-1.5 rounded-lg font-mono text-sm font-bold transition-colors"
        >
          {code}
        </button>
        {copied === 'code' && <span className="text-xs text-green-400">Copied!</span>}
      </div>

      {/* Share options */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-white/8">
        <div className="text-xs text-gray-500 w-full mb-1">Share to:</div>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-xs text-gray-300 transition-colors"
        >
          𝕏 Twitter / X
        </a>
        <a
          href={`https://discord.com/channels/@me`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-xs text-gray-300 transition-colors"
        >
          Discord
        </a>
        <a
          href={`mailto:?subject=Join+PlaytestFlow&body=${encodeURIComponent(shareText)}`}
          className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-xs text-gray-300 transition-colors"
        >
          Email
        </a>
        <button
          onClick={() => copy(shareText, 'url')}
          className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-xs text-gray-300 transition-colors"
        >
          Copy message
        </button>
      </div>
    </div>
  )
}
