import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPartnerBySlug, logPartnerEvent } from '@/lib/partners'
import PartnerSignupForm from './PartnerSignupForm'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | undefined>>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const partner = await getPartnerBySlug(slug)
  if (!partner) return { title: 'Not Found' }
  return {
    title: `${partner.heroHeadline} | PlaytestFlow`,
    description: partner.heroSub,
    openGraph: {
      title: partner.heroHeadline,
      description: partner.heroSub,
      url: `https://playtestflow.vercel.app/partners/${slug}`,
    },
  }
}

const FEATURES = [
  { icon: '🎲', title: 'Recruit testers in minutes', desc: 'Embed a signup widget anywhere or share an invite link. Testers join with one click — no account needed.' },
  { icon: '📋', title: 'Structured sessions', desc: 'Upload versioned rules, assign roles, set timing. Every session follows your repeatable pipeline.' },
  { icon: '📊', title: 'Automated feedback', desc: 'Consent forms, post-session surveys, and rule-diff feedback sent automatically. You get structured data.' },
  { icon: '💰', title: 'Reward your testers', desc: 'Send reward codes or micropayments directly through the platform. Keep testers coming back.' },
]

export default async function PartnerLandingPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams

  const partner = await getPartnerBySlug(slug)
  if (!partner) notFound()

  // Log page view (fire-and-forget)
  logPartnerEvent({
    partnerSlug: partner.slug,
    partnerId: partner.id,
    eventType: 'page_view',
    metadata: {
      utm_source: sp.utm_source ?? partner.utmSource,
      utm_campaign: sp.utm_campaign ?? partner.utmCampaign,
      ref: sp.ref,
    },
  })

  const accent = partner.accentColor
  const trialDays = partner.flags.extended_trial_days ?? 14
  const bonusCredits = partner.flags.partner_credits
  const signupUrl = `/auth/login?ref=${encodeURIComponent(slug)}&utm_source=${encodeURIComponent(partner.utmSource ?? slug)}&utm_campaign=${encodeURIComponent(partner.utmCampaign ?? 'partner')}&partner=${slug}`

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#f0f6fc]">
      {/* Partner badge bar */}
      <div style={{ background: `${accent}18`, borderBottom: `1px solid ${accent}30` }}
        className="px-6 py-2.5 flex items-center justify-center gap-3">
        <span className="text-xs text-gray-400">Official partnership</span>
        <span className="text-xs font-bold" style={{ color: accent }}>
          {partner.name}
        </span>
        <span className="text-gray-600">×</span>
        <span className="text-xs font-bold text-[#ff6600]">PlaytestFlow</span>
        {trialDays > 14 && (
          <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: `${accent}25`, color: accent }}>
            {trialDays}-day free trial
          </span>
        )}
      </div>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-12 text-center">
        {/* Logos */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {partner.logoUrl ? (
            <img src={partner.logoUrl} alt={partner.name}
              className="h-10 object-contain max-w-[160px] opacity-90" />
          ) : (
            <div className="text-sm font-bold px-3 py-1.5 rounded-lg border"
              style={{ color: accent, borderColor: `${accent}40`, background: `${accent}15` }}>
              {partner.name}
            </div>
          )}
          <span className="text-gray-600 text-lg">×</span>
          <div className="flex items-center gap-1.5">
            <span className="text-2xl">🎲</span>
            <span className="font-black text-lg text-[#ff6600]">PlaytestFlow</span>
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-5 leading-tight max-w-3xl mx-auto">
          {partner.heroHeadline}
        </h1>
        <p className="text-[#8b949e] text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
          {partner.heroSub}
        </p>

        {/* Bonus callout */}
        {bonusCredits && (
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-xl border text-sm font-medium"
            style={{ background: `${accent}12`, borderColor: `${accent}30`, color: accent }}>
            🎁 {partner.name} members get ${(bonusCredits / 100).toFixed(0)} in free credits + {trialDays}-day Pro trial
          </div>
        )}

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href={signupUrl}
            className="px-8 py-4 rounded-2xl font-bold text-base text-white transition-opacity hover:opacity-90"
            style={{ background: accent }}>
            {partner.heroCta}
          </Link>
          <Link href="/docs/embed"
            className="px-8 py-4 rounded-2xl font-bold text-base bg-white/5 hover:bg-white/8 border border-white/10 transition-colors">
            See How It Works →
          </Link>
        </div>

        <p className="text-gray-600 text-xs mt-4">
          No credit card required · {trialDays}-day free trial · Cancel anytime
        </p>
      </section>

      {/* Social proof */}
      <section className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { value: `${partner.stats.signups}+`, label: 'designers from this community' },
            { value: `${partner.stats.sessions}+`, label: 'playtests run' },
            { value: trialDays + '-day', label: 'free trial for members' },
            { value: bonusCredits ? `$${(bonusCredits / 100).toFixed(0)}` : 'Free', label: 'welcome credits' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
              <div className="text-2xl font-black mb-1" style={{ color: accent }}>{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-black text-center mb-8">
          Everything you need to run great playtests
        </h2>
        <div className="grid sm:grid-cols-2 gap-5">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="text-2xl mb-3">{f.icon}</div>
              <div className="font-semibold text-white mb-1.5">{f.title}</div>
              <div className="text-sm text-[#8b949e] leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Partner-specific feature callout */}
      {partner.flags.ttrpg_mode && (
        <section className="max-w-5xl mx-auto px-6 py-6">
          <div className="bg-white/3 border rounded-2xl p-6" style={{ borderColor: `${accent}30` }}>
            <div className="font-semibold mb-2" style={{ color: accent }}>🎭 Built for TTRPG designers</div>
            <p className="text-sm text-gray-400">
              PlaytestFlow supports open-table and structured one-shot sessions, versioned rule PDFs,
              GM and player role assignments, and post-session rule-diff surveys — everything the indie TTRPG community needs.
            </p>
          </div>
        </section>
      )}

      {partner.flags.print_workflow && (
        <section className="max-w-5xl mx-auto px-6 py-6">
          <div className="bg-white/3 border rounded-2xl p-6" style={{ borderColor: `${accent}30` }}>
            <div className="font-semibold mb-2" style={{ color: accent }}>🖨️ Design → Playtest → Print workflow</div>
            <p className="text-sm text-gray-400">
              Upload your latest print-and-play file, run structured feedback sessions,
              and iterate your design before your next Game Crafter print run.
              Version every rules change and track which feedback led to improvements.
            </p>
          </div>
        </section>
      )}

      {/* Signup form */}
      <section className="max-w-xl mx-auto px-6 py-12">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-center mb-2">
            Start your free {trialDays}-day trial
          </h2>
          {bonusCredits && (
            <p className="text-center text-sm text-gray-400 mb-6">
              + ${(bonusCredits / 100).toFixed(0)} in free credits when you join via {partner.name}
            </p>
          )}
          <PartnerSignupForm
            partnerSlug={partner.slug}
            partnerName={partner.name}
            accentColor={accent}
            signupUrl={signupUrl}
            ctaText={partner.heroCta}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-8 border-t border-white/8 text-center">
        <div className="text-xs text-gray-600 space-y-1">
          <div>
            <Link href="/" className="text-[#ff6600] hover:underline">PlaytestFlow</Link>
            {' · '}
            <Link href="/docs/embed" className="hover:text-gray-400">Docs</Link>
            {' · '}
            <a href={partner.websiteUrl ?? '#'} target="_blank" rel="noopener noreferrer" className="hover:text-gray-400">{partner.name}</a>
          </div>
          <div>Partnership pilot · Attribution tracked · {trialDays}-day free trial</div>
        </div>
      </footer>
    </div>
  )
}
