import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin'
import { getAllPartners, getPartnerStats } from '@/lib/partners'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function PartnersAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  if (!isAdmin(user.id)) redirect('/dashboard')

  const partners = await getAllPartners()
  const statsMap: Record<string, Awaited<ReturnType<typeof getPartnerStats>>> = {}

  await Promise.all(
    partners.map(async p => {
      statsMap[p.slug] = await getPartnerStats(p.slug)
    })
  )

  const totalSignups   = partners.reduce((s, p) => s + p.stats.signups, 0)
  const totalClicks    = partners.reduce((s, p) => s + p.stats.clicks, 0)
  const totalSessions  = partners.reduce((s, p) => s + p.stats.sessions, 0)
  const totalPaid      = partners.reduce((s, p) => s + p.stats.paid, 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span>🤝</span> Partnership Pilots
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {partners.filter(p => p.status === 'active').length} active pilots · Phase 6 attribution tracking
          </p>
        </div>
      </div>

      {/* Aggregate stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Partner Clicks',  value: totalClicks,   color: 'text-white' },
          { label: 'Partner Signups', value: totalSignups,  color: 'text-[#ff6600]' },
          { label: 'Sessions Run',    value: totalSessions, color: 'text-blue-400' },
          { label: 'Paid Converts',   value: totalPaid,     color: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-xs text-gray-500 mb-0.5">{s.label}</div>
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Partner cards */}
      <div className="space-y-4">
        {partners.map(partner => {
          const stats = statsMap[partner.slug]
          const pilotDaysLeft = partner.pilotEndsAt
            ? Math.max(0, Math.ceil((new Date(partner.pilotEndsAt).getTime() - Date.now()) / 86400000))
            : null

          return (
            <div key={partner.id}
              className="bg-white/5 border border-white/10 rounded-2xl p-6"
              style={{ borderLeftColor: partner.accentColor, borderLeftWidth: '3px' }}>

              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-white">{partner.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      partner.status === 'active' ? 'bg-green-500/15 text-green-400' :
                      partner.status === 'paused' ? 'bg-yellow-500/15 text-yellow-400' :
                      'bg-gray-500/15 text-gray-400'
                    }`}>{partner.status}</span>
                    {pilotDaysLeft !== null && pilotDaysLeft < 30 && (
                      <span className="text-xs text-gray-500">{pilotDaysLeft}d left</span>
                    )}
                  </div>
                  {partner.websiteUrl && (
                    <a href={partner.websiteUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                      {partner.websiteUrl}
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link href={`/partners/${partner.slug}`} target="_blank"
                    className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/8 transition-colors text-gray-400">
                    View Page ↗
                  </Link>
                  <span className="text-xs font-mono px-2 py-1 rounded bg-white/5 text-gray-500">
                    ?utm_source={partner.utmSource}
                  </span>
                </div>
              </div>

              {/* Funnel */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
                {[
                  { label: 'Clicks',   value: partner.stats.clicks,   color: 'text-white' },
                  { label: 'Signups',  value: partner.stats.signups,  color: 'text-[#ff6600]' },
                  { label: 'Sessions', value: partner.stats.sessions, color: 'text-blue-400' },
                  { label: 'Paid',     value: partner.stats.paid,     color: 'text-green-400' },
                  { label: 'Conv %',   value: stats?.signupRate ?? '—',   color: 'text-purple-400' },
                  { label: 'Activ %',  value: stats?.activationRate ?? '—', color: 'text-yellow-400' },
                ].map(s => (
                  <div key={s.label} className="bg-white/5 rounded-lg p-2 text-center">
                    <div className="text-xs text-gray-600 mb-0.5">{s.label}</div>
                    <div className={`font-bold text-sm ${s.color}`}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Feature flags */}
              <div className="flex flex-wrap gap-1.5">
                {partner.flags.extended_trial_days && partner.flags.extended_trial_days > 14 && (
                  <span className="text-xs px-2 py-0.5 rounded bg-white/8 text-gray-400">
                    {partner.flags.extended_trial_days}d trial
                  </span>
                )}
                {partner.flags.partner_credits && (
                  <span className="text-xs px-2 py-0.5 rounded bg-white/8 text-gray-400">
                    ${(partner.flags.partner_credits / 100).toFixed(0)} credits
                  </span>
                )}
                {Object.entries(partner.flags)
                  .filter(([k, v]) => typeof v === 'boolean' && v && !['show_partner_badge', 'hide_pricing'].includes(k))
                  .map(([k]) => (
                    <span key={k} className="text-xs px-2 py-0.5 rounded bg-white/8 text-gray-400">
                      {k.replace(/_/g, ' ')}
                    </span>
                  ))
                }
              </div>
            </div>
          )
        })}
      </div>

      {/* Attribution legend */}
      <div className="bg-white/3 border border-white/8 rounded-xl p-4 text-xs text-gray-500 leading-relaxed">
        <strong className="text-gray-400">Attribution model:</strong> Users are attributed to a partner when they arrive
        via <code className="bg-black/30 px-1 rounded">/partners/[slug]</code>, a referral code matching a partner campaign,
        or a UTM parameter. Events tracked: page_view → signup → first_session → paid_conversion.
        Signup rate = signups / page_views. Activation rate = first_session / signup.
        All data stored in <code className="bg-black/30 px-1 rounded">partner_events</code> table.
      </div>
    </div>
  )
}
