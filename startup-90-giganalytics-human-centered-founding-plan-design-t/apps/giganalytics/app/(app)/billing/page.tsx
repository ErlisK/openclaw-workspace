import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UpgradeButton from './UpgradeButton'

const PRO_FEATURES = [
  { icon: '🤖', title: 'AI Insights', desc: 'Weekly summaries, price suggestions, and schedule recommendations powered by Claude' },
  { icon: '🧪', title: 'Pricing Experiments', desc: 'Sweet-spot price detection, A/B rate analysis, what-if income scenarios' },
  { icon: '📊', title: 'Benchmark Layer', desc: 'See anonymous p25–p90 rates for your service category and region' },
  { icon: '⚡', title: 'Priority processing', desc: 'Faster imports, larger CSV files, and more AI calls per month' },
]

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single()

  const tier = profile?.tier ?? 'free'
  const isPro = tier === 'pro'

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-block bg-blue-50 border border-blue-200 rounded-full px-3 py-1 text-sm font-medium text-blue-700 mb-3">
          {isPro ? '✓ Pro Plan Active' : 'Free Plan'}
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isPro ? 'Manage Your Pro Subscription' : 'Unlock Pro Features'}
        </h1>
        <p className="text-gray-500">
          {isPro
            ? 'You have full access to all Pro features below.'
            : 'Upgrade to access AI insights, pricing experiments, and rate benchmarks.'}
        </p>
      </div>

      {/* Feature list */}
      <div className="grid gap-3 mb-8">
        {PRO_FEATURES.map((f, i) => (
          <div key={i} className={`flex items-start gap-3 rounded-xl border p-4 ${isPro ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
            <span className="text-xl">{f.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-800 text-sm">{f.title}</span>
                {isPro && <span className="text-xs text-green-600 font-medium">Active</span>}
                {!isPro && <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">Pro only</span>}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Upgrade CTA */}
      <UpgradeButton currentTier={tier} />

      {/* Included in Free */}
      {!isPro && (
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center font-medium mb-3">Free plan includes</p>
          <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
            {['CSV import', 'Timer', 'ROI dashboard', 'Heatmap', 'Unlimited streams'].map(f => (
              <span key={f} className="bg-gray-50 border border-gray-200 rounded px-2 py-1">✓ {f}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
