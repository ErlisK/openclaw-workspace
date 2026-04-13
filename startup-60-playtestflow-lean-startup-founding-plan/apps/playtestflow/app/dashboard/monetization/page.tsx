import { createClient, createServiceClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin'

interface StatRow { label: string; value: string | number; sub?: string; color?: string }

function KPI({ label, value, sub, color }: StatRow) {
  return (
    <div className="bg-white/4 border border-white/10 rounded-xl p-5 text-center">
      <div className={`text-3xl font-black mb-0.5 ${color ?? 'text-white'}`}>{value}</div>
      <div className="text-xs font-medium text-gray-400">{label}</div>
      {sub && <div className="text-[10px] text-gray-600 mt-0.5">{sub}</div>}
    </div>
  )
}

function PlanBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-xs text-gray-400 text-right shrink-0">{label}</div>
      <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-8 text-xs text-gray-400 text-right">{count}</div>
      <div className="w-10 text-xs text-gray-500 text-right">{pct.toFixed(0)}%</div>
    </div>
  )
}

export default async function MonetizationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  if (!isAdmin(user.id)) redirect('/dashboard')

  const svc = createServiceClient()

  // ── Subscription metrics ───────────────────────────────────────────────────
  const { data: planBreakdown } = await svc
    .from('subscriptions')
    .select('plan_id, status')

  const all = planBreakdown ?? []
  const total = all.length
  const proActive = all.filter(r => r.plan_id === 'pro' && r.status === 'active').length
  const proTrial = all.filter(r => r.plan_id === 'pro' && r.status === 'trialing').length
  const studioActive = all.filter(r => r.plan_id === 'studio' && r.status === 'active').length
  const studioTrial = all.filter(r => r.plan_id === 'studio' && r.status === 'trialing').length
  const freeCount = all.filter(r => r.plan_id === 'free').length
  const canceled = all.filter(r => r.status === 'canceled').length
  const trialing = all.filter(r => r.status === 'trialing').length
  const active = all.filter(r => r.status === 'active' && r.plan_id !== 'free').length

  // MRR: count active + trialing paid subs
  const mrrPro = (proActive + proTrial) * 39
  const mrrStudio = (studioActive + studioTrial) * 99
  const mrr = mrrPro + mrrStudio
  const arr = mrr * 12

  // Conversion: trial_starts vs upgrades
  const { data: events } = await svc
    .from('subscription_events')
    .select('event_type, amount_cents, created_at')

  const evts = events ?? []
  const trialStarts = evts.filter(e => e.event_type === 'trial_start').length
  const upgrades = evts.filter(e => e.event_type === 'upgraded').length
  const churned = evts.filter(e => e.event_type === 'churned').length
  const convRate = trialStarts > 0 ? ((upgrades / trialStarts) * 100).toFixed(1) : '0'
  const churnRate = trialStarts > 0 ? ((churned / trialStarts) * 100).toFixed(1) : '0'

  // Revenue from paid upgrades
  const totalRevenue = evts
    .filter(e => e.event_type === 'upgraded')
    .reduce((s, e) => s + (e.amount_cents ?? 0), 0) / 100

  // Credit metrics
  const { data: creditStats } = await svc
    .from('credit_balances')
    .select('total_earned, total_spent')

  const creditRows = creditStats ?? []
  const totalCreditsEarned = creditRows.reduce((s, r) => s + (r.total_earned ?? 0), 0)
  const totalCreditsSold = creditRows.reduce((s, r) => s + (r.total_earned ?? 0), 0)
  const totalRewardsPaid = creditRows.reduce((s, r) => s + (r.total_spent ?? 0), 0)

  const { data: topupRevRows } = await svc
    .from('credit_transactions')
    .select('amount')
    .eq('type', 'topup_stripe')

  const topupRevenue = (topupRevRows ?? []).reduce((s, r) => s + r.amount, 0)
  // $1 per credit sold via topup, net
  const creditRevenue = (topupRevRows ?? []).length > 0 ? topupRevenue : 0

  // Recent events timeline
  const { data: recentEvents } = await svc
    .from('subscription_events')
    .select('event_type, plan_id, amount_cents, created_at')
    .order('created_at', { ascending: false })
    .limit(12)

  const EVENT_ICONS: Record<string, string> = {
    trial_start: '🚀',
    upgraded: '💳',
    churned: '❌',
    payment_succeeded: '✅',
    payment_failed: '⚠️',
    checkout_initiated: '🛒',
    trial_ending_soon: '⏳',
  }

  const mrrColor = mrr >= 1500 ? 'text-green-400' : mrr >= 1000 ? 'text-yellow-400' : 'text-white'
  const convColor = parseFloat(convRate) >= 15 ? 'text-green-400' : parseFloat(convRate) >= 10 ? 'text-yellow-400' : 'text-red-400'
  const churnColor = parseFloat(churnRate) <= 30 ? 'text-green-400' : 'text-red-400'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Monetization Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Subscriptions · MRR · Credits · Conversion</p>
      </div>

      {/* MRR targets */}
      <div className="bg-white/3 border border-white/8 rounded-xl px-5 py-3 flex flex-wrap gap-4 text-sm">
        <span className={`font-semibold ${mrr >= 1500 ? 'text-green-400' : 'text-yellow-400'}`}>
          MRR ${mrr.toLocaleString()} / $1,500 target {mrr >= 1500 ? '✅' : `(${((mrr/1500)*100).toFixed(0)}%)`}
        </span>
        <span className="text-gray-500">|</span>
        <span className={`font-semibold ${parseFloat(convRate) >= 15 ? 'text-green-400' : 'text-yellow-400'}`}>
          Trial→Paid {convRate}% / 15% target {parseFloat(convRate) >= 15 ? '✅' : ''}
        </span>
        <span className="text-gray-500">|</span>
        <span className={`font-semibold ${parseFloat(churnRate) <= 30 ? 'text-green-400' : 'text-red-400'}`}>
          Churn-in-trial {churnRate}% / ≤30% target {parseFloat(churnRate) <= 30 ? '✅' : '❌'}
        </span>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="Monthly MRR" value={`$${mrr.toLocaleString()}`} sub={`ARR $${arr.toLocaleString()}`} color={mrrColor} />
        <KPI label="Trial → Paid" value={`${convRate}%`} sub={`${upgrades} of ${trialStarts} trials`} color={convColor} />
        <KPI label="Active Paid" value={active} sub="Pro + Studio active" color="text-orange-400" />
        <KPI label="In Trial" value={trialing} sub="14-day free trial" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="Churn-in-trial" value={`${churnRate}%`} sub={`${churned} churned`} color={churnColor} />
        <KPI label="Total Revenue" value={`$${totalRevenue.toFixed(0)}`} sub="Paid upgrades" />
        <KPI label="Credits Sold" value={creditRevenue} sub="via top-ups" />
        <KPI label="Rewards Paid" value={totalRewardsPaid} sub="to testers" />
      </div>

      {/* Plan breakdown */}
      <div className="bg-white/4 border border-white/10 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-bold">Subscription Breakdown</h2>
          <div className="text-sm text-gray-500">{total} total accounts</div>
        </div>

        <div className="space-y-2.5">
          <PlanBar label="Pro active" count={proActive} total={total} color="bg-orange-400" />
          <PlanBar label="Pro trial" count={proTrial} total={total} color="bg-orange-400/50" />
          <PlanBar label="Studio active" count={studioActive} total={total} color="bg-purple-400" />
          <PlanBar label="Studio trial" count={studioTrial} total={total} color="bg-purple-400/50" />
          <PlanBar label="Free" count={freeCount} total={total} color="bg-gray-500" />
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/5 text-sm">
          <div className="text-center">
            <div className="text-lg font-bold text-orange-400">${mrrPro.toLocaleString()}</div>
            <div className="text-gray-500 text-xs">Pro MRR</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-400">${mrrStudio.toLocaleString()}</div>
            <div className="text-gray-500 text-xs">Studio MRR</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${mrrColor}`}>${mrr.toLocaleString()}</div>
            <div className="text-gray-500 text-xs">Total MRR</div>
          </div>
        </div>
      </div>

      {/* Credit economy */}
      <div className="bg-white/4 border border-white/10 rounded-2xl p-6 space-y-4">
        <h2 className="font-bold">Credit Economy</h2>
        <div className="grid sm:grid-cols-4 gap-3 text-sm">
          {[
            { label: 'Total credits issued', value: totalCreditsEarned, sub: 'plan grants + top-ups' },
            { label: 'Credits from top-ups', value: creditRevenue, sub: `~$${(creditRevenue * 0.85).toFixed(0)} net revenue` },
            { label: 'Rewards paid to testers', value: totalRewardsPaid, sub: '$1 each' },
            { label: 'Credits in wallets', value: totalCreditsSold - totalRewardsPaid, sub: 'unused' },
          ].map(c => (
            <div key={c.label} className="bg-white/3 rounded-xl p-3 text-center">
              <div className="text-xl font-bold">{c.value}</div>
              <div className="text-gray-400 text-xs mt-0.5">{c.label}</div>
              <div className="text-gray-600 text-[10px] mt-0.5">{c.sub}</div>
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-600 bg-white/2 border border-white/5 rounded-lg p-3">
          Credit margin: Designers buy at ~$0.85–$0.75/credit (bulk discount). Testers receive $1 in gift card value. Net credit cost = ~$0.15–$0.25/reward, covered by plan subscription margins.
        </div>
      </div>

      {/* Event timeline */}
      {(recentEvents ?? []).length > 0 && (
        <div className="bg-white/4 border border-white/10 rounded-2xl p-6">
          <h2 className="font-bold mb-4">Recent Billing Events</h2>
          <div className="space-y-2">
            {(recentEvents ?? []).map((e, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0">
                <span className="text-base">{EVENT_ICONS[e.event_type] ?? '•'}</span>
                <div className="flex-1">
                  <span className="text-sm text-white capitalize">{e.event_type.replace(/_/g, ' ')}</span>
                  {e.plan_id && <span className="ml-2 text-xs text-gray-500">{e.plan_id}</span>}
                </div>
                {e.amount_cents != null && e.amount_cents > 0 && (
                  <span className="text-sm font-semibold text-green-400">${(e.amount_cents / 100).toFixed(0)}</span>
                )}
                <span className="text-xs text-gray-600">{new Date(e.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Setup checklist */}
      <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
        <h2 className="font-bold mb-4">Stripe Setup Checklist</h2>
        <div className="space-y-2 text-sm">
          {[
            { done: false, step: 'Create Stripe account at stripe.com', key: 'stripe_account' },
            { done: false, step: 'Add STRIPE_SECRET_KEY to Vercel environment variables', key: 'secret_key' },
            { done: false, step: 'Add STRIPE_PUBLISHABLE_KEY to Vercel environment variables', key: 'pub_key' },
            { done: false, step: 'Create Pro product ($39/mo) → copy price ID → set STRIPE_PRICE_PRO_MONTHLY', key: 'pro_price' },
            { done: false, step: 'Create Studio product ($99/mo) → copy price ID → set STRIPE_PRICE_STUDIO_MONTHLY', key: 'studio_price' },
            { done: false, step: 'Create 4 credit top-up products ($5/$18/$40/$75) → update stripe_price_id in credit_topup_packages table', key: 'credit_prices' },
            { done: false, step: 'Configure webhook → /api/billing/webhook → add STRIPE_WEBHOOK_SECRET', key: 'webhook' },
            { done: false, step: 'Enable Billing Portal in Stripe Dashboard → Customer Portal settings', key: 'portal' },
          ].map(item => (
            <div key={item.key} className="flex items-start gap-3">
              <div className="w-4 h-4 mt-0.5 rounded border border-white/20 bg-white/5 shrink-0" />
              <span className="text-gray-300">{item.step}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-gray-600 bg-white/2 rounded-lg p-3">
          All billing code is production-ready. The only requirement is adding real Stripe keys + price IDs. Checkout, portal, webhooks, and credit top-ups will all work immediately after configuration.
        </div>
      </div>
    </div>
  )
}
