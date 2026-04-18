import { createClient } from '@/lib/supabase/server'
import { computeStreamPricing } from '@/lib/pricing'
import WhatIfCalculator from './WhatIfCalculator'
import Link from 'next/link'

function fmt$(n: number, digits = 0) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n)
}

function BucketBar({ bucket, maxRevPerHour, isSweetSpot }: {
  bucket: { label: string; txCount: number; totalRevenue: number; avgRevenue: number; revenuePerHour: number; conversionProxy: number }
  maxRevPerHour: number
  isSweetSpot: boolean
}) {
  const pct = maxRevPerHour > 0 ? (bucket.revenuePerHour / maxRevPerHour) * 100 : 0
  return (
    <div className={`rounded-xl border p-3 ${isSweetSpot ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-800 text-sm">{bucket.label}</span>
          {isSweetSpot && (
            <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded font-medium">Sweet spot ⭐</span>
          )}
        </div>
        <span className="text-xs text-gray-400">{bucket.txCount} tx</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full mb-2 overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-gray-400">Avg price</div>
          <div className="font-medium text-gray-800">{fmt$(bucket.avgRevenue)}</div>
        </div>
        <div>
          <div className="text-gray-400">Revenue/hr</div>
          <div className={`font-medium ${bucket.revenuePerHour > 0 ? 'text-blue-700' : 'text-gray-400'}`}>
            {bucket.revenuePerHour > 0 ? `${fmt$(bucket.revenuePerHour)}/hr` : '—'}
          </div>
        </div>
        <div>
          <div className="text-gray-400">Conversion proxy</div>
          <div className="font-medium text-gray-700">
            {bucket.conversionProxy > 0 ? `${bucket.conversionProxy.toFixed(2)} tx/hr` : '—'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function PricingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const days = 90
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - days)
  const from = fromDate.toISOString().split('T')[0]

  const [
    { data: streams },
    { data: transactions },
    { data: timeEntries },
    { data: goals },
  ] = await Promise.all([
    supabase.from('streams').select('id, name, color').eq('user_id', user.id),
    supabase.from('transactions')
      .select('stream_id, net_amount, amount, transaction_date')
      .eq('user_id', user.id).gte('transaction_date', from),
    supabase.from('time_entries')
      .select('stream_id, duration_minutes, entry_type, started_at')
      .eq('user_id', user.id).gte('started_at', fromDate.toISOString()),
    supabase.from('user_goals').select('monthly_target, hourly_target').eq('user_id', user.id).single(),
  ])

  const streamPricings = (streams ?? []).map(s =>
    computeStreamPricing(s, transactions ?? [], timeEntries ?? [])
  ).filter(s => s.txCount > 0)

  const hasData = streamPricings.length > 0
  const defaultTarget = goals?.monthly_target ?? 5000

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pricing Optimizer</h1>
          <p className="text-sm text-gray-400">Price bucket analysis + what-if calculator · last {days} days</p>
        </div>
        <Link href="/dashboard" className="text-sm border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50">
          ← Dashboard
        </Link>
      </div>

      {!hasData && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center mb-6">
          <div className="text-3xl mb-2">💡</div>
          <h2 className="font-semibold text-gray-800 mb-1">No transaction data yet</h2>
          <p className="text-sm text-gray-500 mb-4">Import income data first to see price bucket analysis.</p>
          <Link href="/import" className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium">
            Import CSV
          </Link>
        </div>
      )}

      {/* Per-stream bucket analysis */}
      {streamPricings.map(sp => {
        const maxRevPerHour = Math.max(...sp.buckets.map(b => b.revenuePerHour), 1)
        return (
          <div key={sp.streamId} className="bg-white rounded-xl border border-gray-200 mb-5">
            <div className="px-5 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sp.color || '#6b7280' }} />
                <h2 className="font-semibold text-gray-800">{sp.name}</h2>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                <span><strong className="text-gray-800">{fmt$(sp.currentHourlyRate)}/hr</strong> effective rate</span>
                <span><strong className="text-gray-800">{fmt$(sp.currentAvgRate)}</strong> avg transaction</span>
                <span><strong className="text-gray-800">{sp.txCount}</strong> transactions · <strong className="text-gray-800">{sp.totalBillableHours.toFixed(1)}h</strong> logged</span>
              </div>
            </div>

            <div className="p-4">
              {sp.buckets.length === 0 && (
                <p className="text-sm text-gray-400">No price buckets (need more varied transaction amounts)</p>
              )}

              {sp.buckets.length > 0 && (
                <div className="space-y-2">
                  {sp.buckets.map((bucket, i) => (
                    <BucketBar
                      key={i}
                      bucket={bucket}
                      maxRevPerHour={maxRevPerHour}
                      isSweetSpot={sp.sweetSpotBucket?.label === bucket.label}
                    />
                  ))}
                </div>
              )}

              {sp.sweetSpotBucket && (
                <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                  <strong className="text-blue-700">💡 Recommendation:</strong>{' '}
                  Price projects in the <strong>{sp.sweetSpotBucket.label}</strong> range for best revenue/hour
                  ({fmt$(sp.sweetSpotBucket.revenuePerHour > 0 ? sp.sweetSpotBucket.revenuePerHour : sp.sweetSpotBucket.avgRevenue)}/hr effective rate).
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* What-if calculator (client component) */}
      <WhatIfCalculator
        streams={(streams ?? []).map(s => ({ id: s.id, name: s.name }))}
      />

      {/* How it works */}
      <div className="mt-5 bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500 space-y-1">
        <div className="font-medium text-gray-700 mb-2">How this works</div>
        <div>📦 <strong>Price buckets</strong> group your transactions by amount range (e.g. $0–$500, $500–$1000)</div>
        <div>⏱️ <strong>Revenue/hour</strong> = net revenue from that bucket ÷ hours logged during the same period</div>
        <div>🔄 <strong>Conversion proxy</strong> = transactions per billable hour (higher = more volume efficiency)</div>
        <div>⭐ <strong>Sweet spot</strong> = price range with highest observed revenue/hour for this stream</div>
        <div>🎯 <strong>What-if scenarios</strong> use rule-based math on your last 3 months of averages</div>
      </div>
    </div>
  )
}
