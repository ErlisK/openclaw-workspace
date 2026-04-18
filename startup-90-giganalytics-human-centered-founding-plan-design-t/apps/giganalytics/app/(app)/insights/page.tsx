import { createClient } from '@/lib/supabase/server'
import InsightsPanel from './InsightsPanel'
import Link from 'next/link'

export default async function InsightsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Check data availability (for context in page)
  const { count: txCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const { count: teCount } = await supabase
    .from('time_entries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const hasData = (txCount ?? 0) > 0

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Insights</h1>
          <p className="text-sm text-gray-400">
            Weekly summary · price refinement · schedule optimization
          </p>
        </div>
        <Link href="/dashboard" className="text-sm border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50">
          ← Dashboard
        </Link>
      </div>

      {!hasData && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <div className="font-medium text-amber-800 text-sm">No income data yet</div>
            <div className="text-xs text-amber-700 mt-0.5">
              Import a CSV to unlock AI-powered insights grounded in your real numbers.
              Without data, insights fall back to onboarding suggestions.
            </div>
            <Link href="/import" className="inline-block mt-2 text-xs font-medium text-amber-800 hover:underline">
              Import CSV →
            </Link>
          </div>
        </div>
      )}

      {/* Data context badges */}
      <div className="flex gap-2 mb-5 text-xs">
        <span className={`px-2 py-1 rounded-full border ${(txCount ?? 0) > 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
          {txCount ?? 0} transactions
        </span>
        <span className={`px-2 py-1 rounded-full border ${(teCount ?? 0) > 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
          {teCount ?? 0} time entries
        </span>
        <span className="px-2 py-1 rounded-full border bg-blue-50 border-blue-200 text-blue-700">
          claude-haiku-4-5 via AI Gateway
        </span>
      </div>

      <InsightsPanel initialDays={30} />

      {/* How it works */}
      <div className="mt-8 bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs text-gray-500 space-y-1.5">
        <div className="font-medium text-gray-700 mb-2">How AI insights work</div>
        <div>📊 <strong>Weekly summary</strong> — synthesizes your revenue, hours, and effective rate trends</div>
        <div>💡 <strong>Price suggestion</strong> — uses your actual data + what-if modelling to recommend a specific rate adjustment</div>
        <div>🗓️ <strong>Schedule suggestion</strong> — uses heatmap patterns to identify your highest-value windows</div>
        <div>⚡ <strong>Fallback mode</strong> — when data is sparse or AI is unavailable, rule-based deterministic suggestions are shown instead</div>
        <div>🔒 <strong>Privacy</strong> — only aggregate metrics (totals, averages, counts) are sent to the AI — no transaction IDs, names, or amounts beyond your own aggregates</div>
      </div>
    </div>
  )
}
