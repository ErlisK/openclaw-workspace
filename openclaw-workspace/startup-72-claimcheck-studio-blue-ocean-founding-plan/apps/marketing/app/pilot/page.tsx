'use client'
import { useState } from 'react'

const PILOT_TIERS = [
  { name: 'Team Pilot', price: '$1,500', duration: '3 months', includes: ['Full Pro access', '5 users', 'Dedicated onboarding call', 'Weekly check-ins', 'Compliance report export', '20 peer reviewer microtasks/mo', 'SLA: 72h review turnaround'] },
  { name: 'Agency Pilot', price: '$3,000', duration: '3 months', includes: ['Everything in Team', '15 users', 'Custom compliance rule pack (1)', 'Client-facing citation bundle branding', '50 microtasks/mo', 'SLA: 48h review turnaround', 'Co-authored case study'], highlight: true },
  { name: 'Enterprise Pilot', price: 'Custom', duration: '3–6 months', includes: ['Unlimited users', 'Custom compliance packs', 'SOC 2-aligned audit trail', 'SSO / SAML', 'Unlimited microtasks', 'SLA: 24h response', 'Dedicated account manager', 'Quarterly compliance review'] },
]

export default function PilotPage() {
  const [form, setForm] = useState({
    name: '', email: '', orgName: '', segment: '', useCase: '',
    teamSize: '', monthlyContentPieces: '', budgetRange: '',
  })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/pilot', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pt-14">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-700/40 bg-emerald-950/30 text-emerald-300 text-xs font-medium mb-6">
            3 pilot spots remaining
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Paid Pilot Program</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Get production-ready ClaimCheck Studio for your team with hands-on onboarding,
            custom compliance configuration, and SLA-backed reviewer sign-offs. Pilots start at $1,500 for 3 months.
          </p>
        </div>

        {/* Pilot tiers */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {PILOT_TIERS.map(({ name, price, duration, includes, highlight }) => (
            <div key={name} className={`rounded-2xl border p-6 ${highlight ? 'border-blue-600 bg-blue-950/15' : 'border-gray-700 bg-gray-900'}`}>
              {highlight && <div className="text-xs text-blue-400 font-semibold mb-2 uppercase tracking-wider">Most chosen</div>}
              <h3 className="text-lg font-bold text-white mb-1">{name}</h3>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-2xl font-bold text-white">{price}</span>
                {price !== 'Custom' && <span className="text-gray-500 text-sm pb-0.5">/ {duration}</span>}
              </div>
              {price !== 'Custom' && <div className="text-xs text-gray-500 mb-4">{duration}</div>}
              <ul className="space-y-2 mt-4">
                {includes.map(f => (
                  <li key={f} className="flex gap-2 text-xs text-gray-300">
                    <span className="text-blue-400 shrink-0 mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Application form */}
        <div className="max-w-2xl mx-auto">
          <div className="rounded-2xl border border-gray-700 bg-gray-900 p-8">
            {done ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🚀</div>
                <h3 className="text-xl font-bold text-white mb-3">Application received!</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  We review all pilot applications within 2 business days.
                  If your team is a fit, we'll schedule a 30-minute qualification call to
                  scope the pilot and confirm pricing.
                </p>
                <p className="text-xs text-gray-500 mt-4">
                  Questions? <a href="mailto:hello@citebundle.com" className="text-blue-400">hello@citebundle.com</a>
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-white mb-1">Apply for a pilot</h2>
                <p className="text-sm text-gray-400 mb-6">Takes 3 minutes. We'll respond within 2 business days.</p>
                <form onSubmit={submit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Full name *</label>
                      <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required
                        className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-600" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Work email *</label>
                      <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required
                        className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-600" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Organization *</label>
                      <input value={form.orgName} onChange={e => setForm(p => ({ ...p, orgName: e.target.value }))} required
                        className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-600" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Team type</label>
                      <select value={form.segment} onChange={e => setForm(p => ({ ...p, segment: e.target.value }))}
                        className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-600">
                        <option value="">Select…</option>
                        <option value="pharma">Pharma / Biotech</option>
                        <option value="health_media">Health media</option>
                        <option value="agency">Content agency</option>
                        <option value="hospital">Hospital / health system</option>
                        <option value="researcher">Academic / research</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">What would you use ClaimCheck for? *</label>
                    <textarea value={form.useCase} onChange={e => setForm(p => ({ ...p, useCase: e.target.value }))} required rows={3}
                      placeholder="e.g. Verify claims in press releases and patient education materials before FDA submission review..."
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-600 resize-none" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Team size</label>
                      <select value={form.teamSize} onChange={e => setForm(p => ({ ...p, teamSize: e.target.value }))}
                        className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-600">
                        <option value="">…</option>
                        {['1–2','3–5','6–10','11–25','25+'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Pieces/month</label>
                      <select value={form.monthlyContentPieces} onChange={e => setForm(p => ({ ...p, monthlyContentPieces: e.target.value }))}
                        className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-600">
                        <option value="">…</option>
                        {['1–5','6–20','21–50','50+'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Budget / 3 months</label>
                      <select value={form.budgetRange} onChange={e => setForm(p => ({ ...p, budgetRange: e.target.value }))}
                        className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-600">
                        <option value="">…</option>
                        {['<$1,500','$1,500–$3,000','$3,000–$10,000','$10,000+'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  {error && <p className="text-xs text-red-400">{error}</p>}
                  <button type="submit" disabled={loading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors">
                    {loading ? 'Submitting…' : 'Apply for pilot →'}
                  </button>
                  <p className="text-xs text-gray-600 text-center">
                    Reviewed within 2 business days · hello@citebundle.com
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
