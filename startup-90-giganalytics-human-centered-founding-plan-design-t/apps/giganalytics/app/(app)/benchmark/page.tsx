import { createClient } from '@/lib/supabase/server'
import { computeROI } from '@/lib/roi'
import OptInToggle from './OptInToggle'
import Link from 'next/link'

function fmt$(n: number | null | undefined) {
  if (!n) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function PercentileBar({ p25, p50, p75, p90, userRate, label }: {
  p25: number | null; p50: number | null; p75: number | null; p90: number | null
  userRate?: number; label: string
}) {
  const max = Math.max(p90 ?? 0, userRate ?? 0) * 1.1 || 200
  const pct = (v: number | null) => v ? Math.min((v / max) * 100, 100) : 0

  return (
    <div className="mb-4">
      <div className="text-xs font-medium text-gray-600 mb-2 capitalize">{label}</div>
      <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
        {/* IQR fill p25–p75 */}
        <div className="absolute h-full bg-blue-200 rounded-full"
          style={{ left: `${pct(p25)}%`, width: `${pct(p75) - pct(p25)}%` }} />
        {/* p50 line */}
        <div className="absolute h-full w-1 bg-blue-600 rounded"
          style={{ left: `${pct(p50)}%` }} />
        {/* p90 dot */}
        <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-400"
          style={{ left: `${pct(p90)}%` }} />
        {/* User rate marker */}
        {userRate && userRate > 0 && (
          <div className="absolute h-full w-1.5 bg-orange-500 rounded"
            style={{ left: `${pct(userRate)}%` }} />
        )}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>p25: {fmt$(p25)}</span>
        <span className="text-blue-600 font-medium">p50: {fmt$(p50)}</span>
        <span>p75: {fmt$(p75)}</span>
        <span>p90: {fmt$(p90)}</span>
        {userRate && userRate > 0 && (
          <span className="text-orange-600 font-medium">you: {fmt$(userRate)}</span>
        )}
      </div>
    </div>
  )
}

export default async function BenchmarkPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const days = 90
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - days)

  const [
    { data: streams },
    { data: transactions },
    { data: timeEntries },
    { data: optIn },
    { data: snapshots },
  ] = await Promise.all([
    supabase.from('streams').select('id, name, color, platform').eq('user_id', user.id),
    supabase.from('transactions').select('stream_id, net_amount, amount, fee_amount, transaction_date')
      .eq('user_id', user.id).gte('transaction_date', fromDate.toISOString().split('T')[0]),
    supabase.from('time_entries').select('stream_id, duration_minutes, entry_type, started_at')
      .eq('user_id', user.id).gte('started_at', fromDate.toISOString()),
    supabase.from('benchmark_opt_ins').select('opted_in, service_category, consent_version')
      .eq('user_id', user.id).single(),
    supabase.from('benchmark_snapshots')
      .select('snapshot_month, service_category, platform, p25_hourly_rate, p50_hourly_rate, p75_hourly_rate, p90_hourly_rate, sample_size, is_synthetic')
      .is('user_id', null)
      .order('snapshot_month', { ascending: false })
      .limit(200),
  ])

  const roi = computeROI(streams ?? [], transactions ?? [], timeEntries ?? [], [], { from: fromDate.toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] })
  const userHourlyRate = roi.aggregate.trueHourlyRate

  // Group snapshots by service_category + platform → most recent month per group
  const snapshotGroups = new Map<string, typeof snapshots extends Array<infer T> | null ? NonNullable<typeof snapshots>[number] : never>()
  for (const s of snapshots ?? []) {
    const key = `${s.service_category}__${s.platform}`
    if (!snapshotGroups.has(key)) snapshotGroups.set(key, s)
  }
  const latestSnapshots = Array.from(snapshotGroups.values())
    .sort((a, b) => (a.service_category ?? '').localeCompare(b.service_category ?? ''))

  // Categories available
  const categories = Array.from(new Set((snapshots ?? []).map(s => s.service_category))).sort()

  // Match user's category to benchmark
  const userCategory = optIn?.service_category ?? 'general'
  const matchingBenchmarks = latestSnapshots.filter(s => s.service_category === userCategory)

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rate Benchmarks</h1>
          <p className="text-sm text-gray-400">
            Privacy-first, anonymized market rates — k-anonymity threshold: ≥10 contributors per bucket
          </p>
        </div>
        <Link href="/dashboard" className="text-sm border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50">
          ← Dashboard
        </Link>
      </div>

      {/* Opt-in toggle */}
      <div className="mb-6">
        <OptInToggle
          initial={optIn ?? { opted_in: false }}
          userHourlyRate={userHourlyRate}
        />
      </div>

      {/* Your rate vs benchmarks */}
      {userHourlyRate > 0 && matchingBenchmarks.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
          <h2 className="font-semibold text-gray-800 mb-1">Your rate vs. {userCategory} market</h2>
          <p className="text-xs text-gray-400 mb-4">
            Orange bar = your effective rate ({fmt$(userHourlyRate)}/hr) · Blue = market range
          </p>
          {matchingBenchmarks.map(b => (
            <PercentileBar
              key={`${b.service_category}_${b.platform}`}
              label={`${b.service_category} · ${b.platform}`}
              p25={b.p25_hourly_rate}
              p50={b.p50_hourly_rate}
              p75={b.p75_hourly_rate}
              p90={b.p90_hourly_rate}
              userRate={userHourlyRate}
            />
          ))}

          {/* Percentile insight */}
          {(() => {
            const match = matchingBenchmarks[0]
            if (!match) return null
            const rate = userHourlyRate
            const p50 = match.p50_hourly_rate ?? 0
            const p75 = match.p75_hourly_rate ?? 0
            const p90 = match.p90_hourly_rate ?? 0
            let insight = ''
            if (rate >= p90) insight = `You're in the top 10% 🎉 — consider raising rates further.`
            else if (rate >= p75) insight = `You're in the top 25% — strong positioning.`
            else if (rate >= p50) insight = `You're above median — room to grow into the top quartile.`
            else insight = `You're below median — pricing optimization could unlock more revenue.`
            return (
              <div className="mt-2 pt-3 border-t text-sm text-gray-600">
                <strong className="text-blue-700">💡</strong> {insight}
              </div>
            )
          })()}
        </div>
      )}

      {/* All benchmark data */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Market rate benchmarks</h2>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-2 h-2 rounded-full bg-blue-200 inline-block" /> IQR (p25–p75)
            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block ml-2" /> Median
          </div>
        </div>

        {categories.map(cat => {
          const catSnaps = latestSnapshots.filter(s => s.service_category === cat)
          return (
            <div key={cat} className="px-5 py-4 border-b last:border-0">
              <div className="font-medium text-gray-700 capitalize mb-3">{cat}</div>
              {catSnaps.map(b => (
                <PercentileBar
                  key={`${b.service_category}_${b.platform}`}
                  label={`${b.platform}${b.is_synthetic ? ' (synthetic demo data ✧)' : ` · ${b.sample_size ?? '?'} contributors`}`}
                  p25={b.p25_hourly_rate}
                  p50={b.p50_hourly_rate}
                  p75={b.p75_hourly_rate}
                  p90={b.p90_hourly_rate}
                  userRate={userCategory === cat ? userHourlyRate : undefined}
                />
              ))}
            </div>
          )
        })}

        {latestSnapshots.length === 0 && (
          <div className="p-8 text-center text-gray-400 text-sm">
            No benchmark data yet — showing synthetic demo data once loaded.
          </div>
        )}
      </div>

      {/* Privacy footnote */}
      <div className="mt-5 bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs text-gray-500 space-y-1">
        <div className="font-medium text-gray-700 mb-1">Privacy architecture</div>
        <div>🔐 <strong>Opt-in only:</strong> Only users who explicitly consent contribute to benchmarks</div>
        <div>🔢 <strong>k-anonymity (k≥10):</strong> Buckets with fewer than 10 contributors are suppressed entirely</div>
        <div>📊 <strong>Aggregate only:</strong> Only percentile statistics (p25/p50/p75/p90) are stored and served — never individual rates</div>
        <div>✧ <strong>Synthetic demo data:</strong> Rows labeled "(synthetic demo data ✧)" are generated for illustration only — not from real users</div>
        <div>🗑️ <strong>Right to withdraw:</strong> Toggle off to remove your data from future aggregations</div>
      </div>
    </div>
  )
}
