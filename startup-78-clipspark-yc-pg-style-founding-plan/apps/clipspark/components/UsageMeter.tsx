'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface UsageData {
  plan: string
  is_alpha: boolean
  clips: { used: number; quota: number | null; credits: number; remaining: number | null; pct_used: number }
  minutes: { uploaded: number; processed: number; quota: number | null; remaining: number | null; per_clip_limit: number; pct_used: number }
  time_accounting: { asr_seconds: number; render_seconds: number; ingest_seconds: number; total_seconds: number }
  costs: { asr_usd: number; render_usd: number; ingest_usd: number; total_usd: number; avg_per_min: number }
  credit_packs: Array<{ clips: number; price_usd: number; price_id: string; label: string }>
  credit_history: Array<{ amount: number; reason: string; created_at: string }>
}

function UsageBar({ pct, color = 'indigo', label, detail }: { pct: number; color?: string; label: string; detail: string }) {
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : color === 'indigo' ? 'bg-indigo-500' : 'bg-emerald-500'
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className={pct >= 90 ? 'text-red-400 font-medium' : pct >= 70 ? 'text-yellow-400' : 'text-gray-400'}>{detail}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  )
}

export function UsageMeter({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<UsageData | null>(null)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCostDetail, setShowCostDetail] = useState(false)

  useEffect(() => {
    fetch('/api/usage').then(r => r.ok ? r.json() : null).then(d => { if (d) setData(d) }).finally(() => setLoading(false))
  }, [])

  async function buyCredits(priceId: string) {
    setPurchasing(priceId)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price_id: priceId, mode: 'payment' }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch { /* ignore */ }
    setPurchasing(null)
  }

  if (loading) return <div className="h-24 bg-gray-900 rounded-2xl animate-pulse" />
  if (!data) return null
  if (data.is_alpha) return null  // Alpha users don't see quota

  const clipsNearLimit = (data.clips.pct_used || 0) >= 70
  const minutesNearLimit = (data.minutes.pct_used || 0) >= 70

  if (compact) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
        <UsageBar
          pct={data.clips.pct_used}
          label="Clips"
          detail={`${data.clips.used}/${data.clips.quota ?? '∞'} used${data.clips.credits > 0 ? ` · +${data.clips.credits} credits` : ''}`}
        />
        <UsageBar
          pct={data.minutes.pct_used}
          color="emerald"
          label="Minutes"
          detail={`${data.minutes.uploaded.toFixed(0)}/${data.minutes.quota ?? '∞'} min`}
        />
        {(clipsNearLimit || minutesNearLimit) && (
          <Link href="/settings#credits" className="block text-center text-xs text-indigo-400 hover:text-indigo-300 pt-1">
            Running low — buy credits →
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-5">
      {/* Plan badge */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Usage this month</h3>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${
            data.plan === 'pro' ? 'bg-indigo-900/30 border-indigo-700/40 text-indigo-300' : 'bg-gray-800 border-gray-700 text-gray-400'
          }`}>{data.plan === 'pro' ? 'Pro' : 'Free'}</span>
          {data.plan !== 'pro' && (
            <Link href="/pricing" className="text-xs text-indigo-400 hover:text-indigo-300">Upgrade →</Link>
          )}
        </div>
      </div>

      {/* Bars */}
      <div className="space-y-3">
        <UsageBar
          pct={data.clips.pct_used}
          label="Clips"
          detail={`${data.clips.used} used · ${data.clips.remaining ?? '∞'} remaining${data.clips.credits > 0 ? ` · ${data.clips.credits} credits` : ''}`}
        />
        <UsageBar
          pct={data.minutes.pct_used}
          color="emerald"
          label="Minutes uploaded"
          detail={`${data.minutes.uploaded.toFixed(1)} / ${data.minutes.quota ?? '∞'} min · ${data.minutes.remaining?.toFixed(0) ?? '∞'} left`}
        />
      </div>

      {/* Time accounting toggle */}
      <button
        onClick={() => setShowCostDetail(c => !c)}
        className="text-xs text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1"
      >
        {showCostDetail ? '▲' : '▼'} Time &amp; cost detail
      </button>

      {showCostDetail && (
        <div className="bg-gray-800/40 rounded-xl p-4 space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'ASR (transcription)', sec: data.time_accounting.asr_seconds, cost: data.costs.asr_usd },
              { label: 'Render', sec: data.time_accounting.render_seconds, cost: data.costs.render_usd },
              { label: 'Ingest / transfer', sec: data.time_accounting.ingest_seconds, cost: data.costs.ingest_usd },
              { label: 'Total', sec: data.time_accounting.total_seconds, cost: data.costs.total_usd },
            ].map(r => (
              <div key={r.label} className="flex justify-between items-center col-span-2">
                <span className="text-gray-500">{r.label}</span>
                <div className="text-right">
                  <span className="text-gray-400 font-mono">{r.sec > 0 ? `${Math.round(r.sec / 60)}m ${r.sec % 60}s` : '—'}</span>
                  <span className="ml-3 text-gray-600">${r.cost.toFixed(4)}</span>
                </div>
              </div>
            ))}
          </div>
          {data.credit_history.length > 0 && (
            <div className="pt-2 border-t border-gray-700/50">
              <div className="text-gray-500 mb-1">Credit history</div>
              {data.credit_history.slice(0, 5).map((t, i) => (
                <div key={i} className="flex justify-between text-gray-600">
                  <span>{t.reason.replace(/_/g, ' ')}</span>
                  <span className={t.amount > 0 ? 'text-green-400' : 'text-red-400'}>
                    {t.amount > 0 ? '+' : ''}{t.amount} clips
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Credit pack CTAs */}
      {(clipsNearLimit || data.clips.credits === 0) && (
        <div id="credits">
          <p className="text-xs text-gray-400 mb-3">
            {data.clips.remaining === 0 ? '⚠️ You\'ve used all your clips this month.' : '🔋 Running low? Top up your clips:'}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {data.credit_packs.map(pack => (
              <button
                key={pack.price_id}
                onClick={() => buyCredits(pack.price_id)}
                disabled={purchasing === pack.price_id}
                className="py-2.5 text-xs border border-gray-700 hover:border-indigo-600 hover:bg-indigo-950/30 text-gray-300 hover:text-white rounded-xl transition-all disabled:opacity-50 text-center"
              >
                <div className="font-semibold">{pack.clips} clips</div>
                <div className="text-gray-500">${pack.price_usd.toFixed(2)}</div>
                {purchasing === pack.price_id && <div className="text-indigo-400">...</div>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
