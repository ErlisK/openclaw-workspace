import { supabase } from '@/lib/supabase'
import Link from 'next/link'

async function getStats() {
  const [competitors, factors, scores, interviews, painPoints] = await Promise.all([
    supabase.from('claimcheck_competitors').select('id', { count: 'exact', head: true }),
    supabase.from('claimcheck_factors').select('id', { count: 'exact', head: true }),
    supabase.from('claimcheck_scores').select('competitor_id', { count: 'exact', head: true }),
    supabase.from('claimcheck_interviews').select('id', { count: 'exact', head: true }),
    supabase.from('claimcheck_pain_points').select('id', { count: 'exact', head: true }),
  ])
  return {
    competitors: competitors.count ?? 0,
    factors: factors.count ?? 0,
    scores: scores.count ?? 0,
    interviews: interviews.count ?? 0,
    painPoints: painPoints.count ?? 0,
  }
}

const STAT_CARDS = [
  { key: 'competitors', label: 'Competitors Mapped', target: 38, href: '/competitors', color: 'blue' },
  { key: 'factors', label: 'Competing Factors', target: 22, href: '/factors', color: 'purple' },
  { key: 'scores', label: 'Evidence-Linked Scores', target: 25, href: '/canvas', color: 'green' },
  { key: 'interviews', label: 'User Interviews', target: 15, href: '/interviews', color: 'amber' },
  { key: 'painPoints', label: 'Pain Points', target: 10, href: '/pain-points', color: 'red' },
] as const

const colorMap: Record<string, string> = {
  blue:   'from-blue-600 to-blue-800',
  purple: 'from-purple-600 to-purple-800',
  green:  'from-emerald-600 to-emerald-800',
  amber:  'from-amber-600 to-amber-800',
  red:    'from-red-600 to-red-800',
}

const INSIGHTS = [
  {
    icon: '◎',
    title: 'Blue Ocean Identified',
    body: 'The upper-right quadrant of High Evidence Rigor × High Content Production Ease is completely unoccupied across all 38 competitors mapped.',
    color: 'border-blue-500/40',
  },
  {
    icon: '⚠',
    title: 'Hallucination Trust Crisis',
    body: '10 of 15 interviews reveal AI tools are widely used but actively distrusted for health/science claims. Legal teams are banning AI adoption.',
    color: 'border-red-500/40',
  },
  {
    icon: '💸',
    title: 'Compliance Accessibility Gap',
    body: 'Veeva PromoMats costs $150k–500k/yr and takes 14 months to implement. Mid-market pharma, med device, and CME agencies have zero viable compliance tool.',
    color: 'border-amber-500/40',
  },
  {
    icon: '📦',
    title: 'Citation Bundle Validated',
    body: '7 of 15 interviewees independently described needing a "citation bundle" (claim + DOI + excerpt + summary). This is a validated, user-derived product concept.',
    color: 'border-emerald-500/40',
  },
]

export default async function DashboardPage() {
  const stats = await getStats()

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-blue-400 text-sm font-medium mb-1">Phase 1 — Blue Ocean Strategy</p>
            <h1 className="text-3xl font-bold text-white mb-2">ClaimCheck Studio</h1>
            <p className="text-gray-400 max-w-2xl">
              Research capture tool for the Phase 1 Strategy Canvas & Market Mapping. 
              Browse competitors, factors, scores, user interviews, and pain points — 
              all backed by live evidence from 20+ source fetches.
            </p>
          </div>
          <a
            href="https://citebundle.com"
            className="text-xs text-gray-500 hover:text-blue-400 transition-colors border border-gray-700 rounded-lg px-3 py-1.5"
          >
            citebundle.com ↗
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {STAT_CARDS.map(({ key, label, target, href, color }) => {
          const val = stats[key as keyof typeof stats]
          const pct = Math.min(100, Math.round((val / target) * 100))
          return (
            <Link
              key={key}
              href={href}
              className="group rounded-xl border border-gray-800 bg-gray-900 p-5 hover:border-gray-700 transition-all"
            >
              <div className={`text-3xl font-bold bg-gradient-to-br ${colorMap[color]} bg-clip-text text-transparent`}>
                {val}
              </div>
              <div className="text-xs text-gray-400 mt-1 leading-snug">{label}</div>
              <div className="mt-3 h-1 rounded-full bg-gray-800">
                <div
                  className={`h-1 rounded-full bg-gradient-to-r ${colorMap[color]}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-xs text-gray-600 mt-1">Target: {target}</div>
            </Link>
          )
        })}
      </div>

      {/* Key Insights */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Key Strategic Findings</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {INSIGHTS.map(({ icon, title, body, color }) => (
            <div key={title} className={`rounded-xl border ${color} bg-gray-900/60 p-5`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{icon}</span>
                <span className="font-medium text-white text-sm">{title}</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Four Actions */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Four Actions Framework</h2>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            {
              action: 'Eliminate',
              color: 'border-red-500/30 bg-red-950/20',
              badge: 'bg-red-900/60 text-red-300',
              items: ['Generic marketing copy', 'Social scheduling', 'Pure doc editing'],
            },
            {
              action: 'Reduce',
              color: 'border-orange-500/30 bg-orange-950/20',
              badge: 'bg-orange-900/60 text-orange-300',
              items: ['Brand voice customization', 'Social analytics', 'General-purpose AI chat'],
            },
            {
              action: 'Raise',
              color: 'border-green-500/30 bg-green-950/20',
              badge: 'bg-green-900/60 text-green-300',
              items: ['Hallucination mitigation', 'Provenance scoring', 'Citation bundle quality', 'Audit trail'],
            },
            {
              action: 'Create',
              color: 'border-blue-500/30 bg-blue-950/20',
              badge: 'bg-blue-900/60 text-blue-300',
              items: ['Claim→Evidence pipeline', 'Expert microtask community', 'Retraction monitoring', 'Mid-market compliance ($499/mo)'],
            },
          ].map(({ action, color, badge, items }) => (
            <div key={action} className={`rounded-xl border ${color} p-4`}>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge}`}>{action}</span>
              <ul className="mt-3 space-y-1.5">
                {items.map((item) => (
                  <li key={item} className="text-gray-400 text-xs flex items-start gap-1.5">
                    <span className="mt-0.5 shrink-0">·</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Phase 2 Next Steps</h2>
        <div className="grid md:grid-cols-3 gap-3 text-sm text-gray-400">
          <div className="flex items-start gap-2"><span className="text-blue-400">1.</span> 15 live user interviews (total → 30)</div>
          <div className="flex items-start gap-2"><span className="text-blue-400">2.</span> Pre-submission claim check v0 prototype</div>
          <div className="flex items-start gap-2"><span className="text-blue-400">3.</span> Citation bundle v0 → test with med-ed agency</div>
          <div className="flex items-start gap-2"><span className="text-blue-400">4.</span> Waitlist page at citebundle.com</div>
          <div className="flex items-start gap-2"><span className="text-blue-400">5.</span> 20–30 expert reviewer community seeds</div>
          <div className="flex items-start gap-2"><span className="text-blue-400">6.</span> Technical architecture decision (evidence graph)</div>
        </div>
      </div>
    </div>
  )
}
