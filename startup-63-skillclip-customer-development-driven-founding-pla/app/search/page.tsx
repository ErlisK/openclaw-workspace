'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Profile = {
  id: string
  full_name: string
  email: string
  role: string
  years_experience: number
  bio: string
  badge_count?: number
  badges?: any[]
}

const tradeEmoji: Record<string, string> = { electrician: '⚡', plumber: '🔧', 'hvac-technician': '❄️', welder: '🔥', pipefitter: '🔩' }

export default function SearchPage() {
  const [tradeFilter, setTradeFilter] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [skillFilter, setSkillFilter] = useState('')
  const [trades, setTrades] = useState<any[]>([])
  const [regions, setRegions] = useState<any[]>([])
  const [results, setResults] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [showLOI, setShowLOI] = useState(false)

  useEffect(() => {
    supabase.from('trades').select('id,name,slug').order('name').then(({ data }) => setTrades(data || []))
    supabase.from('regions').select('id,name,region_code').eq('active', true).order('name').then(({ data }) => setRegions(data || []))
    // Auto-load on first visit
    handleSearch()
  }, [])

  const handleSearch = async () => {
    setLoading(true); setSearched(true)
    // Get all tradesperson profiles with badge counts
    let query = supabase
      .from('profiles')
      .select('id,full_name,email,role,years_experience,bio')
      .eq('role', 'tradesperson')
      .eq('onboarding_completed', true)
      .order('years_experience', { ascending: false })

    const { data: profiles } = await query
    if (!profiles) { setLoading(false); return }

    // Get badges for each profile
    const profilesWithBadges = await Promise.all(profiles.map(async p => {
      let badgeQuery = supabase
        .from('badges')
        .select('id,title,region_name,code_standard,skill_tags,issued_at,metadata,trade:trades(name,slug)')
        .eq('profile_id', p.id)
        .eq('is_revoked', false)

      if (regionFilter) {
        const region = regions.find(r => r.id === regionFilter)
        if (region) badgeQuery = badgeQuery.eq('region_name', region.name)
      }
      if (skillFilter) {
        badgeQuery = badgeQuery.contains('skill_tags', [skillFilter])
      }

      const { data: badges } = await badgeQuery
      const filteredBadges = (badges || []).filter(b => {
        if (tradeFilter) return (b.trade as any)?.id === tradeFilter || (b.trade as any)?.slug === tradeFilter
        return true
      })

      return { ...p, badges: filteredBadges, badge_count: filteredBadges.length }
    }))

    const filtered = profilesWithBadges.filter(p => {
      if (tradeFilter || regionFilter || skillFilter) return p.badge_count > 0
      return true
    }).sort((a, b) => b.badge_count - a.badge_count)

    setResults(filtered)
    setLoading(false)
  }

  const tradeOptions = [
    { slug: 'electrician', label: '⚡ Electrician' },
    { slug: 'plumber', label: '🔧 Plumber' },
    { slug: 'hvac-technician', label: '❄️ HVAC Technician' },
    { slug: 'welder', label: '🔥 Welder' },
    { slug: 'pipefitter', label: '🔩 Pipefitter' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">CertClip — Verified Talent Search</h1>
            <p className="text-gray-500 text-sm">Search verified tradesperson portfolios by skill, region, and code compliance</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowLOI(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              Get Early Access
            </button>
            <a href="/wallet" className="text-gray-500 text-sm py-2 hover:text-gray-700">Credential Wallet</a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Search filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select value={tradeFilter} onChange={e => setTradeFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">All Trades</option>
              {tradeOptions.map(t => <option key={t.slug} value={t.slug}>{t.label}</option>)}
            </select>
            <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">All Regions</option>
              {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <input value={skillFilter} onChange={e => setSkillFilter(e.target.value)} placeholder="Skill tag (e.g. solar, gfci, pex)"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            <button onClick={handleSearch} disabled={loading}
              className="bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Searching…' : '🔍 Search Portfolios'}
            </button>
          </div>
        </div>

        {/* Results */}
        {searched && (
          <div className="mb-4 flex items-center justify-between">
            <p className="text-gray-600 text-sm">{results.length} verified tradesperson{results.length !== 1 ? 's' : ''} found</p>
            <p className="text-gray-400 text-xs">Sorted by most verified credentials</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {results.map(p => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedProfile(p)}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{p.full_name}</h3>
                  <p className="text-gray-500 text-sm">{p.years_experience} years experience</p>
                </div>
                <div className="text-right">
                  <div className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
                    {p.badge_count} badge{p.badge_count !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {p.bio && <p className="text-gray-600 text-sm mb-3 line-clamp-2">{p.bio}</p>}

              {/* Badge preview */}
              {(p.badges || []).length > 0 && (
                <div className="space-y-2">
                  {(p.badges || []).slice(0, 3).map((b: any) => (
                    <div key={b.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                      <span className="text-sm">{tradeEmoji[(b.trade as any)?.slug] || '🔨'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{b.title}</p>
                        <p className="text-xs text-gray-500">{b.region_name} · {b.code_standard}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {b.metadata?.overall_rating && (
                          <span className="text-xs text-yellow-500">{'★'.repeat(b.metadata.overall_rating)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {(p.badges || []).length > 3 && (
                    <p className="text-xs text-blue-600 text-center">+{(p.badges || []).length - 3} more badges</p>
                  )}
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <a href={`/wallet?email=${encodeURIComponent(p.email)}`} onClick={e => e.stopPropagation()}
                  className="flex-1 text-center bg-blue-50 text-blue-700 text-xs py-2 rounded-lg font-medium hover:bg-blue-100">
                  View Full Wallet
                </a>
                <button onClick={e => { e.stopPropagation(); setShowLOI(true) }}
                  className="flex-1 bg-green-50 text-green-700 text-xs py-2 rounded-lg font-medium hover:bg-green-100">
                  Commission Assessment
                </button>
              </div>
            </div>
          ))}
        </div>

        {searched && results.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-3">🔍</div>
            <p>No verified tradespeople found matching your filters.</p>
          </div>
        )}
      </div>

      {/* LOI Modal */}
      {showLOI && <LOIModal onClose={() => setShowLOI(false)} />}
    </div>
  )
}

function LOIModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    company_name: '', contact_name: '', email: '', phone: '', role: 'hiring_manager',
    use_case: '', trades: [] as string[], wtp_monthly: '', wtp_per_assessment: '',
    headcount: '', notes: '', terms_accepted: false,
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const toggleTrade = (t: string) => set('trades', form.trades.includes(t) ? form.trades.filter(x => x !== t) : [...form.trades, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.terms_accepted) { setError('Please accept the pilot terms'); return }
    setLoading(true); setError('')

    const res = await fetch('/api/loi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setSubmitted(true); setLoading(false)
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">LOI Received!</h2>
          <p className="text-gray-600 mb-6">We'll be in touch within 24 hours to confirm your pilot access and onboarding details.</p>
          <button onClick={onClose} className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 my-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Letter of Intent — Early Access Pilot</h2>
            <p className="text-gray-500 text-sm mt-1">Join the CertClip employer pilot. No payment required now.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
              <input value={form.company_name} onChange={e => set('company_name', e.target.value)} required placeholder="Acme Electrical Contractors"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name *</label>
              <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} required placeholder="Jane Smith"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Email *</label>
              <input value={form.email} onChange={e => set('email', e.target.value)} required type="email" placeholder="jane@acmeelec.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 555-0100"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select value={form.role} onChange={e => set('role', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="hiring_manager">Hiring Manager</option>
              <option value="operations">Operations / Superintendent</option>
              <option value="hr">HR / Talent Acquisition</option>
              <option value="owner">Business Owner</option>
              <option value="staffing">Staffing Agency</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">What trades do you hire for? (select all)</label>
            <div className="flex flex-wrap gap-2">
              {[['electrician','⚡ Electrician'],['plumber','🔧 Plumber'],['hvac-technician','❄️ HVAC'],['welder','🔥 Welder'],['pipefitter','🔩 Pipefitter']].map(([v,l]) => (
                <button key={v} type="button" onClick={() => toggleTrade(v)}
                  className={`px-3 py-1.5 rounded-lg text-sm border-2 font-medium transition-colors ${form.trades.includes(v) ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary use case</label>
            <textarea value={form.use_case} onChange={e => set('use_case', e.target.value)} rows={2}
              placeholder="e.g. Pre-screening candidates before interview, verifying skills for field assignments, reducing bad hires in commercial electrical"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hires/year</label>
              <input value={form.headcount} onChange={e => set('headcount', e.target.value)} placeholder="25"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WTP monthly ($)</label>
              <input value={form.wtp_monthly} onChange={e => set('wtp_monthly', e.target.value)} placeholder="99–299"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WTP per assessment ($)</label>
              <input value={form.wtp_per_assessment} onChange={e => set('wtp_per_assessment', e.target.value)} placeholder="25–50"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Pilot terms */}
          <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
            <p className="font-semibold mb-2">Pilot Program Terms</p>
            <ul className="space-y-1 text-blue-700">
              <li>✓ Free access for 90 days during the pilot period</li>
              <li>✓ Search unlimited verified tradesperson portfolios</li>
              <li>✓ Commission up to 3 paid assessments at $30 each</li>
              <li>✓ Provide feedback to shape the product</li>
              <li>✓ No commitment to purchase after pilot</li>
            </ul>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={form.terms_accepted} onChange={e => set('terms_accepted', e.target.checked)} className="mt-0.5 accent-blue-600" />
            <span className="text-sm text-gray-600">I agree to the pilot terms above and intend to evaluate CertClip for our hiring process. I understand no payment is required to join the pilot.</span>
          </label>

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? 'Submitting…' : 'Submit Letter of Intent'}
          </button>
        </form>
      </div>
    </div>
  )
}
