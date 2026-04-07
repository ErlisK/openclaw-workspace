import { createClient, createServiceClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { getCreditBalance, getCreditTransactions, getTopupPackages } from '@/lib/credits'
import { getUserPlan, getUserUsage } from '@/lib/billing'
import BillingActions from './BillingActions'
import CancelButton from './CancelButton'

function PlanBadge({ plan, status }: { plan: string; status: string }) {
  const colors: Record<string, string> = {
    free: 'bg-gray-500/20 text-gray-400 border-gray-500/20',
    pro: 'bg-orange-500/20 text-orange-300 border-orange-500/20',
    studio: 'bg-purple-500/20 text-purple-300 border-purple-500/20',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colors[plan] ?? colors.free}`}>
      {plan === 'pro' ? '⚡' : plan === 'studio' ? '🏢' : '🆓'} {plan.charAt(0).toUpperCase() + plan.slice(1)}
      {status === 'trialing' && <span className="text-yellow-400">(trial)</span>}
      {status === 'past_due' && <span className="text-red-400">(past due)</span>}
    </span>
  )
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="bg-white/4 border border-white/10 rounded-xl p-5">
      <div className={`text-2xl font-black mb-0.5 ${accent ?? 'text-white'}`}>{value}</div>
      <div className="text-xs font-medium text-gray-400">{label}</div>
      {sub && <div className="text-[11px] text-gray-600 mt-0.5">{sub}</div>}
    </div>
  )
}

const TXN_ICONS: Record<string, string> = {
  topup_stripe: '💳',
  plan_grant: '🎁',
  session_reward: '🎮',
  refund: '↩️',
  adjustment: '⚙️',
}

export default async function BillingPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [userPlan, usage, credits, transactions, packages] = await Promise.all([
    getUserPlan(user.id),
    getUserUsage(user.id),
    getCreditBalance(user.id),
    getCreditTransactions(user.id, 15),
    getTopupPackages(),
  ])

  // Usage percentages for progress bars
  const sessionPct = userPlan.maxSessionsMo ? Math.min(100, (usage.sessionsUsed / userPlan.maxSessionsMo) * 100) : 0
  const projectPct = userPlan.maxProjects ? Math.min(100, (usage.projectsActive / userPlan.maxProjects) * 100) : 0

  const successMsg = sp.success ? `🎉 Welcome to ${sp.plan ? sp.plan.charAt(0).toUpperCase() + sp.plan.slice(1) : 'paid'} plan! Your 14-day trial has started.` : null
  const topupMsg = sp.topup === 'success' ? `✅ Top-up successful! ${sp.credits} credits added to your wallet.` : null

  return (
    <div className="space-y-8">
      {/* Alerts */}
      {(successMsg || topupMsg) && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-4 text-sm text-green-300">
          {successMsg || topupMsg}
        </div>
      )}

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Billing & Credits</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your plan, usage, and tester reward credits.</p>
        </div>
        <PlanBadge plan={userPlan.planId} status={userPlan.status} />
      </div>

      {/* Trial banner */}
      {userPlan.isTrialing && userPlan.trialEnd && (
        <div className="bg-yellow-500/8 border border-yellow-500/20 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="text-sm text-yellow-300">
            ⏳ Trial ends {userPlan.trialEnd.toLocaleDateString()} — add a payment method to keep your plan active.
          </div>
          <BillingActions action="portal" label="Manage billing →" variant="outline-yellow" />
        </div>
      )}

      {/* Plan + usage */}
      <div className="grid sm:grid-cols-2 gap-5">
        {/* Plan card */}
        <div className="bg-white/4 border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Current Plan</h2>
            <PlanBadge plan={userPlan.planId} status={userPlan.status} />
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-gray-300">
              <span>Sessions / month</span>
              <span className="font-semibold">{userPlan.maxSessionsMo ?? '∞'}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Active projects</span>
              <span className="font-semibold">{userPlan.maxProjects ?? '∞'}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Team seats</span>
              <span className="font-semibold">{userPlan.teamSeats}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {userPlan.isFree ? (
              <BillingActions action="upgrade" label="Upgrade to Pro \u2192" variant="primary" />
            ) : (
              <>
                <BillingActions action="portal" label="Manage subscription" variant="outline" />
                <CancelButton planId={userPlan.planId} />
              </>
            )}
          </div>
        </div>

        {/* Usage card */}
        <div className="bg-white/4 border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="font-bold">This Month's Usage</h2>

          {userPlan.maxSessionsMo !== null ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-300">
                <span>Sessions used</span>
                <span className={usage.sessionsUsed >= (userPlan.maxSessionsMo ?? 999) ? 'text-red-400 font-semibold' : 'font-semibold'}>
                  {usage.sessionsUsed} / {userPlan.maxSessionsMo}
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${sessionPct >= 90 ? 'bg-red-400' : sessionPct >= 70 ? 'bg-yellow-400' : 'bg-orange-400'}`} style={{ width: `${sessionPct}%` }} />
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400">Sessions: <span className="text-white font-semibold">Unlimited</span></div>
          )}

          {userPlan.maxProjects !== null ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-300">
                <span>Projects active</span>
                <span className="font-semibold">{usage.projectsActive} / {userPlan.maxProjects}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${projectPct >= 90 ? 'bg-red-400' : 'bg-blue-400'}`} style={{ width: `${projectPct}%` }} />
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400">Projects: <span className="text-white font-semibold">Unlimited</span></div>
          )}

          {usage.limitHit && (
            <div className="text-xs text-red-400 bg-red-500/8 border border-red-500/15 rounded-lg px-3 py-2">
              ⚠️ You've hit a usage limit this period. Upgrade to continue.
            </div>
          )}
        </div>
      </div>

      {/* Credit wallet */}
      <div className="bg-white/4 border border-white/10 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-bold">Tester Reward Credits</h2>
            <p className="text-xs text-gray-500 mt-0.5">1 credit = $1 tester reward. Testers earn 1 credit per completed session.</p>
          </div>
          <div className="text-3xl font-black text-orange-400">{credits.balance} <span className="text-base font-normal text-gray-400">credits</span></div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div className="bg-white/3 rounded-xl py-3">
            <div className="font-bold text-lg">{credits.balance}</div>
            <div className="text-gray-500 text-xs">Available</div>
          </div>
          <div className="bg-white/3 rounded-xl py-3">
            <div className="font-bold text-lg">{credits.totalEarned}</div>
            <div className="text-gray-500 text-xs">Total earned</div>
          </div>
          <div className="bg-white/3 rounded-xl py-3">
            <div className="font-bold text-lg">{credits.totalSpent}</div>
            <div className="text-gray-500 text-xs">Paid to testers</div>
          </div>
        </div>

        {/* Top-up packages */}
        <div>
          <div className="text-sm font-medium text-gray-300 mb-3">Top up your credits</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {packages.map(pkg => (
              <div key={pkg.id} className={`relative border rounded-xl p-3 text-center ${pkg.popular ? 'border-orange-500/40 bg-orange-500/5' : 'border-white/10 bg-white/3'}`}>
                {pkg.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Best value</div>
                )}
                <div className="text-xl font-black">{pkg.credits}</div>
                <div className="text-xs text-gray-500 mb-2">credits</div>
                <div className="text-sm font-bold">${(pkg.priceCents / 100).toFixed(0)}</div>
                <div className="text-[10px] text-gray-600">${(pkg.priceCents / pkg.credits / 100).toFixed(2)}/credit</div>
                <BillingActions action="topup" packageId={pkg.id} label="Buy" variant="small" className="mt-2 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction history */}
      {transactions.length > 0 && (
        <div className="bg-white/4 border border-white/10 rounded-2xl p-6">
          <h2 className="font-bold mb-4">Credit History</h2>
          <div className="space-y-2">
            {transactions.map(txn => (
              <div key={txn.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{TXN_ICONS[txn.type] ?? '•'}</span>
                  <div>
                    <div className="text-sm text-white">{txn.description ?? txn.type}</div>
                    <div className="text-[11px] text-gray-600">{new Date(txn.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className={`font-bold text-sm ${txn.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {txn.amount > 0 ? '+' : ''}{txn.amount} cr
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
