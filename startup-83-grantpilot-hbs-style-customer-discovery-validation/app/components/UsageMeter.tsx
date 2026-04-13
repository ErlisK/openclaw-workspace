'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface EntitlementData {
  tier: string
  pack_credits: number
  status: string
  limits: {
    exports_per_month: number
    active_applications: number
    rfp_parse_per_month: number
    narrative_generate_per_month: number
  }
  usage: Record<string, number>
  can: {
    export: boolean
    parse_rfp: boolean
    generate_narrative: boolean
    place_order: boolean
  }
}

const TIER_DISPLAY: Record<string, { label: string; color: string; icon: string }> = {
  free:             { label: 'Free', color: 'text-gray-500 bg-gray-100',         icon: '🌱' },
  deliverable_pack: { label: 'Deliverable Pack', color: 'text-indigo-700 bg-indigo-50', icon: '📦' },
  pipeline_pro:     { label: 'Pipeline Pro', color: 'text-violet-700 bg-violet-50',     icon: '🚀' },
}

function MeterBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const unlimited = limit >= 999
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100))
  const warning = pct >= 80
  const exhausted = pct >= 100

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-600">{label}</span>
        <span className={`text-xs font-medium ${exhausted ? 'text-red-600' : warning ? 'text-amber-600' : 'text-gray-500'}`}>
          {unlimited ? `${used} / ∞` : `${used} / ${limit}`}
        </span>
      </div>
      {!unlimited && (
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${
              exhausted ? 'bg-red-500' : warning ? 'bg-amber-400' : 'bg-indigo-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {unlimited && (
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className="h-1.5 rounded-full bg-green-400 w-full opacity-30" />
        </div>
      )}
    </div>
  )
}

export default function UsageMeter({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<EntitlementData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/entitlements')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="animate-pulse h-20 bg-gray-100 rounded-xl" />
  }

  if (!data) return null

  const tierMeta = TIER_DISPLAY[data.tier] || TIER_DISPLAY.free
  const isLimited = data.tier === 'free'

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tierMeta.color}`}>
          {tierMeta.icon} {tierMeta.label}
        </span>
        {isLimited && (
          <span className="text-xs text-gray-400">
            {data.usage['export'] || 0}/{data.limits.exports_per_month} exports
          </span>
        )}
        {data.pack_credits > 0 && (
          <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
            {data.pack_credits} credit{data.pack_credits !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tierMeta.color}`}>
            {tierMeta.icon} {tierMeta.label}
          </span>
          {data.pack_credits > 0 && (
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
              {data.pack_credits} pack credit{data.pack_credits !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {isLimited && (
          <Link href="/pricing" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
            Upgrade →
          </Link>
        )}
      </div>

      <div className="space-y-2.5">
        <MeterBar
          used={data.usage['export'] || 0}
          limit={data.limits.exports_per_month}
          label="Exports this month"
        />
        <MeterBar
          used={data.usage['rfp_parse'] || 0}
          limit={data.limits.rfp_parse_per_month}
          label="RFP parses this month"
        />
        <MeterBar
          used={data.usage['narrative_generate'] || 0}
          limit={data.limits.narrative_generate_per_month}
          label="AI narrative generations"
        />
      </div>

      {/* Gate warnings */}
      {!data.can.export && (
        <div className="mt-3 flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <span className="text-xs text-red-700 font-medium">📦 Export limit reached</span>
          <Link href="/pricing" className="text-xs text-red-700 underline font-semibold">Upgrade</Link>
        </div>
      )}
      {!data.can.generate_narrative && (
        <div className="mt-2 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span className="text-xs text-amber-700 font-medium">✍️ Generation limit reached</span>
          <Link href="/pricing" className="text-xs text-amber-700 underline font-semibold">Upgrade</Link>
        </div>
      )}

      {isLimited && data.can.export && data.can.generate_narrative && (
        <p className="text-xs text-gray-400 mt-3">
          Free plan resets monthly. <Link href="/pricing" className="text-indigo-500 hover:underline">Upgrade for unlimited access</Link>.
        </p>
      )}
    </div>
  )
}
