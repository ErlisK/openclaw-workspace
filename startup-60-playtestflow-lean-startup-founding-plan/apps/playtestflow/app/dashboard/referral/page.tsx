import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { ensureReferralCode, getConversionStats, getConversions } from '@/lib/referral'
import ReferralShareBox from './ReferralShareBox'

export const dynamic = 'force-dynamic'

export default async function ReferralPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('designer_profiles')
    .select('display_name')
    .eq('user_id', user.id)
    .single()

  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'USER'
  const [code, stats, conversions] = await Promise.all([
    ensureReferralCode(user.id, displayName),
    getConversionStats(user.id),
    getConversions(user.id, 30),
  ])

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://playtestflow.vercel.app'
  const referralUrl = code ? `${APP_URL}/r/${code.code}` : ''
  const shareText = code
    ? `Join me on PlaytestFlow — the best way to run playtests for indie games. Use my link for $5 in free credits: ${referralUrl}`
    : ''

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span>🎁</span> Referral Program
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Share your link. Earn $5 in credits for every designer who joins.
        </p>
      </div>

      {/* How it works */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { step: '1', icon: '🔗', title: 'Share your link', desc: 'Send your unique referral URL to game designer friends, Discord servers, or communities.' },
          { step: '2', icon: '✅', title: 'They sign up', desc: 'When someone creates a PlaytestFlow account using your link, we track the referral.' },
          { step: '3', icon: '💰', title: 'Both get rewarded', desc: 'You get $5 in credits. They get $5 in credits as a welcome bonus. Win-win.' },
        ].map(s => (
          <div key={s.step} className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-[#ff6600]/20 text-[#ff6600] text-xs font-bold flex items-center justify-center">{s.step}</span>
              <span className="text-lg">{s.icon}</span>
            </div>
            <div className="font-semibold text-sm mb-1">{s.title}</div>
            <div className="text-xs text-gray-500 leading-relaxed">{s.desc}</div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Referrals',    value: stats.totalConversions,     color: 'text-white' },
          { label: 'Converted',          value: stats.convertedConversions, color: 'text-green-400' },
          { label: 'Pending',            value: stats.pendingConversions,   color: 'text-yellow-400' },
          { label: 'Credits Earned',     value: `$${(stats.totalCreditsEarned / 100).toFixed(0)}`, color: 'text-[#ff6600]' },
        ].map(s => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-xs text-gray-500 mb-0.5">{s.label}</div>
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Share box */}
      {code && (
        <ReferralShareBox
          code={code.code}
          referralUrl={referralUrl}
          shareText={shareText}
          rewardValue={code.referrerRewardValue}
        />
      )}

      {/* Conversions table */}
      {conversions.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Recent Referrals</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-white/8">
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Source</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Reward</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {conversions.map(conv => (
                  <tr key={conv.id}>
                    <td className="py-2.5 text-gray-300 max-w-[180px] truncate">
                      {conv.referred_email ?? '—'}
                    </td>
                    <td className="py-2.5">
                      <span className="text-xs bg-white/8 px-2 py-0.5 rounded text-gray-400">
                        {conv.source ?? 'direct'}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        conv.status === 'converted'
                          ? 'bg-green-500/15 text-green-400'
                          : conv.status === 'pending'
                          ? 'bg-yellow-500/15 text-yellow-400'
                          : 'bg-gray-500/15 text-gray-400'
                      }`}>
                        {conv.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-gray-500 text-xs">
                      {new Date(conv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-2.5">
                      {conv.referrer_rewarded ? (
                        <span className="text-xs text-[#ff6600]">+$5 ✓</span>
                      ) : (
                        <span className="text-xs text-gray-600">pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Terms */}
      <div className="text-xs text-gray-600 leading-relaxed border-t border-white/5 pt-4">
        <strong className="text-gray-500">Terms:</strong> Referral credits are granted when the referred designer
        creates an account and verifies their email. Self-referral is not permitted. Credits never expire and can be
        used to reward testers. One referral reward per new account.
      </div>
    </div>
  )
}
