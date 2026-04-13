import { createAdminClient } from '@/lib/supabase'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Provider {
  id: string; slug: string; name: string; display_name: string; tagline: string
  bio: string; provider_type: string; is_ai_pilot: boolean; is_default_provider: boolean
  specializations: string[]; funder_types: string[]; states: string[]
  years_experience: number | null; grants_won: number; total_funded_usd: number
  win_rate_pct: number | null; avg_turnaround_days: number | null
  base_price_usd: number | null; fixed_price_usd: number | null; price_model: string
  badges: string[]; avg_rating: number | null; rating_count: number; availability: string
  verified: boolean; is_active: boolean
}

const TYPE_BADGES: Record<string, string> = {
  ai_pilot:   'bg-indigo-100 text-indigo-800',
  specialist: 'bg-blue-100 text-blue-800',
  agency:     'bg-purple-100 text-purple-800',
}

const AVAIL_COLORS: Record<string, string> = {
  available:    'bg-green-100 text-green-700',
  limited:      'bg-yellow-100 text-yellow-700',
  unavailable:  'bg-red-100 text-red-700',
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5 text-yellow-400 text-sm">
      {[1,2,3,4,5].map(i => (
        <span key={i}>{i <= Math.round(rating) ? '★' : '☆'}</span>
      ))}
    </span>
  )
}

export default async function ProvidersPage() {
  const admin = createAdminClient()
  const { data: providers } = await admin.from('providers')
    .select('*')
    .eq('is_active', true)
    .order('is_default_provider', { ascending: false })

  const all = (providers || []) as Provider[]
  const aiPilot = all.find(p => p.is_ai_pilot)
  const specialists = all.filter(p => !p.is_ai_pilot)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                <Link href="/dashboard" className="hover:text-indigo-600">Dashboard</Link>
                <span>›</span><span>Providers</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Grant Specialists & AI Pilot</h1>
              <p className="text-gray-500 mt-1">Choose who helps with your application — or let us assign automatically.</p>
            </div>
          </div>
          {/* Filter tabs */}
          <div className="flex gap-2 mt-4">
            {['All', 'AI Pilot', 'Specialists', 'Federal', 'Foundation', 'Municipal'].map(f => (
              <span key={f} className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer ${f === 'All' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{f}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* AI Pilot — featured card */}
        {aiPilot && (
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">🤖</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold">{aiPilot.name}</h2>
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Default</span>
                      <span className="text-xs bg-green-400/30 text-green-100 px-2 py-0.5 rounded-full">● Available</span>
                    </div>
                    <p className="text-indigo-100 text-sm">{aiPilot.tagline}</p>
                  </div>
                </div>
                <p className="text-indigo-100 text-sm leading-relaxed max-w-xl">{aiPilot.bio}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {(aiPilot.badges || []).map(b => (
                    <span key={b} className="text-xs bg-white/15 px-2 py-0.5 rounded-full">{b}</span>
                  ))}
                </div>
              </div>
              <div className="flex-shrink-0 text-center">
                <div className="bg-white/10 rounded-xl p-4 min-w-[130px]">
                  <div className="text-3xl font-bold">FREE</div>
                  <div className="text-indigo-100 text-xs mt-0.5">with every application</div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-center">
                    <div className="bg-white/10 rounded-lg p-2">
                      <div className="font-bold text-base">{aiPilot.grants_won.toLocaleString()}</div>
                      <div className="text-indigo-200">drafts</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2">
                      <div className="font-bold text-base">{aiPilot.avg_turnaround_days ?? 3}d</div>
                      <div className="text-indigo-200">avg. turn</div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm font-medium">{aiPilot.avg_rating}★ ({aiPilot.rating_count})</div>
                </div>
                <Link href="/rfp/new" className="block mt-3 bg-white text-indigo-700 font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-indigo-50 text-center">
                  Start with AI Pilot →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Human Specialists */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Vetted Specialists</h2>
          <div className="grid gap-4">
            {specialists.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-200 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-xl font-bold text-indigo-600">
                    {(p.name || p.display_name || '?').slice(0, 1)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{p.name || p.display_name}</h3>
                          {p.verified && <span className="text-xs text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">✓ Verified</span>}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${AVAIL_COLORS[p.availability] || AVAIL_COLORS.available}`}>
                            {p.availability === 'available' ? '● Available' : p.availability}
                          </span>
                        </div>
                        <p className="text-sm text-indigo-600 mt-0.5">{p.tagline}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-lg font-bold text-gray-900">
                          {p.fixed_price_usd ? `$${p.fixed_price_usd.toLocaleString()}` : p.base_price_usd ? `$${p.base_price_usd.toLocaleString()}` : 'Quote'}
                        </div>
                        <div className="text-xs text-gray-400">per application</div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{p.bio}</p>

                    {/* Stats row */}
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
                      {p.years_experience && <span>🕐 {p.years_experience} yrs exp</span>}
                      {p.grants_won > 0 && <span>🏆 {p.grants_won} grants won</span>}
                      {p.total_funded_usd > 0 && <span>💰 ${(p.total_funded_usd / 1e6).toFixed(1)}M funded</span>}
                      {p.win_rate_pct && <span>📈 {p.win_rate_pct}% win rate</span>}
                      {p.avg_turnaround_days && <span>⚡ {p.avg_turnaround_days}d turnaround</span>}
                    </div>

                    {/* Specializations */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {(p.specializations || []).slice(0, 5).map(s => (
                        <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                      {(p.states || []).slice(0, 3).map(s => (
                        <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>

                    {/* Badges + Rating */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex flex-wrap gap-1">
                        {(p.badges || []).slice(0, 3).map(b => (
                          <span key={b} className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{b}</span>
                        ))}
                      </div>
                      {p.avg_rating && (
                        <div className="flex items-center gap-1.5">
                          <Stars rating={Number(p.avg_rating)} />
                          <span className="text-xs text-gray-500">{Number(p.avg_rating).toFixed(1)} ({p.rating_count})</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                  <Link href={`/providers/${p.slug || p.id}`} className="flex-1 text-center text-sm border border-indigo-300 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-50">
                    View Profile
                  </Link>
                  <Link href={`/orders/new?provider=${p.id}`} className="flex-1 text-center text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                    Request Specialist
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">How GrantPilot Marketplace Works</h3>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { n: '1', title: 'Import RFP', desc: 'Upload or paste your RFP. AI parses requirements in seconds.' },
              { n: '2', title: 'AI Pilot Assigned', desc: 'GrantPilot AI auto-assigns to your application and starts drafting.' },
              { n: '3', title: 'Human QA Review', desc: 'Request a specialist for review, editing, or full application management.' },
              { n: '4', title: 'Submit & Track', desc: 'Submit through our portal connectors. Track status and renewal dates.' },
            ].map(step => (
              <div key={step.n} className="text-center">
                <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center mx-auto mb-2">{step.n}</div>
                <div className="font-medium text-sm text-gray-900">{step.title}</div>
                <p className="text-xs text-gray-500 mt-1">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
