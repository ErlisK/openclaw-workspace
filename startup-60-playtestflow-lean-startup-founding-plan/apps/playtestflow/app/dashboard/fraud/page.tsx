import { createClient, createServiceClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

const FLAG_LABELS: Record<string, { label: string; color: string }> = {
  duplicate_email: { label: 'Duplicate Email', color: 'text-red-400' },
  duplicate_ip: { label: 'Duplicate IP', color: 'text-red-400' },
  signup_too_fast: { label: 'Signup Too Fast', color: 'text-orange-400' },
  bot_user_agent: { label: 'Bot UA', color: 'text-orange-400' },
  completion_time_outlier: { label: 'Time Outlier', color: 'text-yellow-400' },
  attention_check_failed: { label: 'Attn Check Failed', color: 'text-yellow-400' },
  low_rating_no_explanation: { label: 'Low Rating / No Text', color: 'text-blue-400' },
  empty_feedback: { label: 'Empty Feedback', color: 'text-blue-400' },
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 90 ? 'bg-green-400' : score >= 70 ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <div className="w-full bg-white/5 rounded-full h-1.5">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${score}%` }} />
    </div>
  )
}

export default async function FraudPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const svc = createServiceClient()

  // Global summary
  const { data: summary } = await svc.from('global_fraud_summary').select('*').single()

  // Per-session breakdown
  const { data: sessions } = await svc
    .from('fraud_quality_summary')
    .select('*')
    .order('flagged_count', { ascending: false })
    .limit(30)

  // Flagged entries detail
  const { data: flaggedRows } = await svc
    .from('session_quality_scores')
    .select('id, signup_id, session_id, quality_score, flag_reasons, duplicate_email_flag, duplicate_ip_flag, completion_time_flag, attention_check_flag, computed_at')
    .eq('flagged', true)
    .order('quality_score', { ascending: true })
    .limit(25)

  // Flag breakdown
  const flagBreakdown = [
    { key: 'dup_email_flags', label: 'Duplicate Email', value: summary?.dup_email_flags ?? 0 },
    { key: 'dup_ip_flags', label: 'Duplicate IP', value: summary?.dup_ip_flags ?? 0 },
    { key: 'time_outlier_flags', label: 'Time Outliers', value: summary?.time_outlier_flags ?? 0 },
    { key: 'attn_check_flags', label: 'Attention Check Fails', value: summary?.attn_check_flags ?? 0 },
    { key: 'low_rating_flags', label: 'Low Rating / No Text', value: summary?.low_rating_flags ?? 0 },
    { key: 'short_feedback_flags', label: 'Empty Feedback', value: summary?.short_feedback_flags ?? 0 },
  ].sort((a, b) => b.value - a.value)

  const total = summary?.total_scores ?? 0
  const flagPct = Number(summary?.flag_pct ?? 0)
  const avgQ = Number(summary?.avg_quality ?? 0)
  const statusColor = flagPct <= 10 ? 'text-green-400' : flagPct <= 20 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Fraud & Quality Scoring</h1>
        <p className="text-gray-400 text-sm mt-1">
          Scoring version: v2 · {total} responses scored · Last run: real-time
        </p>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/4 border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold">{total}</div>
          <div className="text-xs text-gray-500 mt-0.5">Responses scored</div>
        </div>
        <div className="bg-white/4 border border-white/10 rounded-xl p-4">
          <div className={`text-2xl font-bold ${statusColor}`}>{flagPct}%</div>
          <div className="text-xs text-gray-500 mt-0.5">Flagged rate</div>
          <div className={`text-[10px] mt-1 ${flagPct <= 10 ? 'text-green-500' : 'text-yellow-500'}`}>
            {flagPct <= 10 ? '✓ Within target ≤10%' : '⚠ Above target'}
          </div>
        </div>
        <div className="bg-white/4 border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold">{avgQ}</div>
          <div className="text-xs text-gray-500 mt-0.5">Avg quality score</div>
        </div>
        <div className="bg-white/4 border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-red-400">{summary?.total_flagged ?? 0}</div>
          <div className="text-xs text-gray-500 mt-0.5">Flagged responses</div>
        </div>
      </div>

      {/* Flag breakdown */}
      <div className="bg-white/4 border border-white/10 rounded-2xl p-6">
        <h2 className="font-bold mb-4">Flag Breakdown</h2>
        <div className="space-y-3">
          {flagBreakdown.map(f => (
            <div key={f.key} className="flex items-center gap-3">
              <div className="w-36 text-xs text-gray-400 flex-shrink-0">{f.label}</div>
              <div className="flex-1 bg-white/5 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-orange-400/70"
                  style={{ width: total > 0 ? `${(f.value / total) * 100}%` : '0%' }}
                />
              </div>
              <div className="w-16 text-right text-xs text-gray-400">
                {f.value} <span className="text-gray-600">({total > 0 ? ((f.value / total) * 100).toFixed(1) : 0}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Flagged entries */}
      <div className="bg-white/4 border border-white/10 rounded-2xl p-6">
        <h2 className="font-bold mb-4">Flagged Responses (lowest quality first)</h2>
        <div className="space-y-2">
          {(flaggedRows ?? []).length === 0 && (
            <p className="text-gray-500 text-sm">No flagged responses.</p>
          )}
          {(flaggedRows ?? []).map(row => (
            <div key={row.id} className="flex items-center gap-3 text-xs bg-white/2 border border-white/6 rounded-xl px-4 py-3">
              <div className="w-8 text-center">
                <span className={`font-bold text-sm ${Number(row.quality_score) < 70 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {row.quality_score}
                </span>
              </div>
              <div className="flex-1 flex flex-wrap gap-1.5">
                {(row.flag_reasons ?? []).map((flag: string) => {
                  const meta = FLAG_LABELS[flag]
                  return (
                    <span key={flag} className={`px-2 py-0.5 rounded-full bg-white/5 border border-white/10 ${meta?.color ?? 'text-gray-400'}`}>
                      {meta?.label ?? flag}
                    </span>
                  )
                })}
              </div>
              <div className="text-gray-600 font-mono text-[10px]">
                {row.signup_id.slice(0, 8)}…
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-session table */}
      <div className="bg-white/4 border border-white/10 rounded-2xl p-6">
        <h2 className="font-bold mb-4">Per-Session Summary</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-white/8">
                <th className="text-left pb-2 font-medium pr-4">Session</th>
                <th className="text-right pb-2 font-medium pr-3">Scored</th>
                <th className="text-right pb-2 font-medium pr-3">Flagged</th>
                <th className="text-right pb-2 font-medium pr-3">Flag%</th>
                <th className="text-right pb-2 font-medium pr-3">Avg Q</th>
                <th className="text-right pb-2 font-medium">Dup IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(sessions ?? []).map((s: any) => (
                <tr key={s.session_id} className="hover:bg-white/2">
                  <td className="py-2 pr-4 text-gray-300 truncate max-w-48">{s.title ?? s.session_id?.slice(0, 12)}</td>
                  <td className="py-2 pr-3 text-right text-gray-400">{s.flagged_count !== null ? s.feedback_count : '—'}</td>
                  <td className="py-2 pr-3 text-right">
                    <span className={Number(s.flagged_count) > 0 ? 'text-red-400' : 'text-green-400'}>
                      {s.flagged_count ?? 0}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <span className={Number(s.flag_pct) > 10 ? 'text-yellow-400' : 'text-gray-400'}>
                      {s.flag_pct ?? '0'}%
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right text-gray-400">{s.avg_quality ?? '—'}</td>
                  <td className="py-2 text-right text-gray-500">{s.dup_ip ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Methodology */}
      <div className="text-xs text-gray-600 bg-white/2 border border-white/5 rounded-xl p-4 space-y-1">
        <div className="font-medium text-gray-500 mb-2">Scoring Methodology (v2)</div>
        <div>Scores start at 100 and deduct per flag. Score &lt;70 or ≥2 flags → flagged.</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 mt-2">
          <span>Duplicate email: −25</span>
          <span>Duplicate IP: −20</span>
          <span>Signup too fast: −20</span>
          <span>Attn check fail: −20</span>
          <span>Bot user agent: −15</span>
          <span>Time outlier: −15</span>
          <span>Low rating/no text: −10</span>
          <span>Empty feedback: −10</span>
        </div>
        <div className="mt-2">Completion time thresholds use IQR×1.5 (lower) / IQR×3.0 (upper).</div>
      </div>
    </div>
  )
}
