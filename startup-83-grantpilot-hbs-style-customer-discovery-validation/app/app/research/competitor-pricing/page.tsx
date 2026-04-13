import { createAdminClient } from '@/lib/supabase'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface PricingRow {
  id: string
  competitor_name: string
  competitor_url: string | null
  plan_name: string
  target_segment: string | null
  price_usd_monthly: number | null
  price_usd_annually: number | null
  price_usd_per_application: number | null
  price_usd_hourly_min: number | null
  price_usd_hourly_max: number | null
  price_model: string
  billing_cycle: string | null
  features: string[]
  limitations: string | null
  category: string
  data_source: string | null
  data_quality: string | null
  notes: string | null
  scraped_at: string
}

const CATEGORY_META: Record<string, { label: string; color: string; icon: string }> = {
  grant_prospecting:          { label: 'Grant Prospecting',        color: 'bg-blue-100 text-blue-800',    icon: '🔍' },
  grant_management_grantmakers:{ label: 'Grant Management (Funders)', color: 'bg-purple-100 text-purple-800', icon: '🏛️' },
  grant_management_seekers:   { label: 'Grant Management (Seekers)', color: 'bg-teal-100 text-teal-800',   icon: '📋' },
  ai_grant_writing:           { label: 'AI Writing Tools',          color: 'bg-indigo-100 text-indigo-800', icon: '🤖' },
  freelance_writer:           { label: 'Freelance Writers',         color: 'bg-orange-100 text-orange-800', icon: '✍️' },
  our_product:                { label: 'GrantPilot (us)',           color: 'bg-green-100 text-green-800',   icon: '🚀' },
}

const QUALITY_BADGES: Record<string, { label: string; color: string }> = {
  public_website:    { label: 'From website',      color: 'bg-green-50 text-green-700' },
  third_party_review:{ label: 'Review site',       color: 'bg-yellow-50 text-yellow-700' },
  industry_survey:   { label: 'Industry survey',   color: 'bg-blue-50 text-blue-700' },
  internal:          { label: 'Internal data',     color: 'bg-gray-100 text-gray-600' },
}

function formatPrice(row: PricingRow): string {
  if (row.price_model === 'free_tier') return 'FREE'
  if (row.price_model === 'custom_quote') return 'Quote only'
  if (row.price_usd_monthly !== null) return `$${row.price_usd_monthly.toLocaleString()}/mo`
  if (row.price_usd_per_application !== null) return `$${row.price_usd_per_application.toLocaleString()}/app`
  if (row.price_usd_hourly_min !== null && row.price_usd_hourly_max !== null)
    return `$${row.price_usd_hourly_min}–$${row.price_usd_hourly_max}/hr`
  return '—'
}

function formatAnnual(row: PricingRow): string | null {
  if (row.price_usd_annually) return `$${row.price_usd_annually.toLocaleString()}/yr`
  if (row.price_usd_monthly) return `~$${(row.price_usd_monthly * 12).toLocaleString()}/yr`
  return null
}

export default async function CompetitorPricingPage() {
  const admin = createAdminClient()
  const { data } = await admin.from('competitor_pricing')
    .select('*')
    .order('category')
    .order('price_usd_monthly', { ascending: true, nullsFirst: false })

  const rows = (data || []) as PricingRow[]

  const grouped: Record<string, PricingRow[]> = {}
  for (const row of rows) {
    if (!grouped[row.category]) grouped[row.category] = []
    grouped[row.category].push(row)
  }

  const lastScraped = rows[0]?.scraped_at ? new Date(rows[0].scraped_at).toLocaleDateString() : 'unknown'

  // Competitive positioning stats
  const subscriptionCompetitors = rows.filter(r => r.price_model === 'subscription' && r.price_usd_monthly && r.category !== 'our_product')
  const avgSubPrice = subscriptionCompetitors.length
    ? Math.round(subscriptionCompetitors.reduce((s, r) => s + (r.price_usd_monthly || 0), 0) / subscriptionCompetitors.length)
    : 0
  const minSub = Math.min(...subscriptionCompetitors.map(r => r.price_usd_monthly || 9999))
  const maxSub = Math.max(...subscriptionCompetitors.map(r => r.price_usd_monthly || 0))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/dashboard" className="hover:text-indigo-600">Dashboard</Link>
            <span>›</span>
            <Link href="/research" className="hover:text-indigo-600">Research</Link>
            <span>›</span>
            <span>Competitor Pricing</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Competitor Pricing Research</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {rows.length} pricing data points across {Object.keys(grouped).length} categories · Last scraped {lastScraped}
              </p>
            </div>
            <Link href="/pricing" className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
              View Our Pricing →
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Avg SaaS price/mo', value: `$${avgSubPrice}`, sub: 'across subscription tiers', color: 'text-gray-900' },
            { label: 'Price range', value: `$${minSub}–$${maxSub}`, sub: 'subscription/mo', color: 'text-gray-900' },
            { label: 'Freelancer cost', value: '$1.2K–$15K', sub: 'per application', color: 'text-orange-700' },
            { label: 'GrantPilot entry', value: 'FREE', sub: 'vs $49–$299 competitors', color: 'text-green-700' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs font-medium text-gray-700 mt-0.5">{s.label}</div>
              <div className="text-xs text-gray-400">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Key insight box */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
          <h3 className="font-semibold text-indigo-900 mb-2">💡 Pricing Strategy Insight</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-indigo-800">
            <div>
              <strong>Positioning gap:</strong> Existing SaaS tools ($75–$899/mo) are grant <em>tracking</em> tools, not grant <em>writing</em> tools. AI writing tools ($49–$199/mo) lack RFP parsing, budgets, compliance, and human QA. Freelancers ($1.2K–$15K/application) are expensive and slow.
            </div>
            <div>
              <strong>GrantPilot advantage:</strong> $0 free tier undercuts every subscription. $299/application Deliverable Pack delivers full AI+human output at ~6–50× lower cost than freelancers. No other tool combines parsing + AI writing + budget + PDF forms + checklist + timeline in one workflow.
            </div>
          </div>
        </div>

        {/* By category */}
        {Object.entries(grouped).map(([cat, catRows]) => {
          const meta = CATEGORY_META[cat] || { label: cat, color: 'bg-gray-100 text-gray-700', icon: '📦' }
          return (
            <div key={cat} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                <span className="text-lg">{meta.icon}</span>
                <span className="font-semibold text-sm text-gray-900">{meta.label}</span>
                <span className="text-xs text-gray-400">({catRows.length} plans)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      <th className="px-5 py-3">Competitor / Plan</th>
                      <th className="px-5 py-3">Price</th>
                      <th className="px-5 py-3">Annual</th>
                      <th className="px-5 py-3">Top Features</th>
                      <th className="px-5 py-3">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {catRows.map(row => {
                      const qmeta = QUALITY_BADGES[row.data_quality || ''] || QUALITY_BADGES.internal
                      const isUs = row.category === 'our_product'
                      return (
                        <tr key={row.id} className={`hover:bg-gray-50 ${isUs ? 'bg-green-50/30' : ''}`}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1.5">
                              {isUs && <span className="text-xs">🚀</span>}
                              <div>
                                <div className="font-medium text-gray-900">
                                  {row.competitor_url && !isUs ? (
                                    <a href={row.competitor_url} target="_blank" rel="noopener noreferrer"
                                      className="hover:text-indigo-600 hover:underline">{row.competitor_name}</a>
                                  ) : row.competitor_name}
                                </div>
                                <div className="text-xs text-gray-500">{row.plan_name}</div>
                                {row.target_segment && <div className="text-xs text-gray-400">{row.target_segment.replace(/_/g, ' ')}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`font-semibold ${isUs ? 'text-green-700' : 'text-gray-900'}`}>
                              {formatPrice(row)}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-500 text-xs">{formatAnnual(row) || '—'}</td>
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap gap-1">
                              {(row.features || []).slice(0, 3).map(f => (
                                <span key={f} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{f}</span>
                              ))}
                              {(row.features || []).length > 3 && (
                                <span className="text-xs text-gray-400">+{row.features.length - 3} more</span>
                              )}
                            </div>
                            {row.limitations && <div className="text-xs text-red-500 mt-1">⚠ {row.limitations}</div>}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${qmeta.color}`}>{qmeta.label}</span>
                            <div className="text-xs text-gray-400 mt-1">{new Date(row.scraped_at).toLocaleDateString()}</div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}

        {/* Methodology note */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500">
          <strong className="text-gray-700">Data sources & methodology:</strong> Pricing scraped from public websites and third-party review sites (Capterra, ITQlick, FinancesOnline) on {lastScraped}. Subscription prices shown as monthly cost on annual plan unless otherwise noted. Freelance rates from 2024 industry surveys and published rate cards. Quote-based products show estimates from public reviews. Stored in Supabase <code>competitor_pricing</code> table for ongoing tracking.
        </div>
      </div>
    </div>
  )
}
