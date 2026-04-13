'use client'

import { useState } from 'react'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    badge: null,
    price_monthly: 149,
    price_per_assessment: 25,
    tagline: 'For small contractors who hire 1–10 tradespeople/month',
    color: 'border-gray-300',
    headerBg: 'bg-gray-50',
    accent: 'text-gray-700',
    btnClass: 'bg-gray-800 hover:bg-gray-900 text-white',
    checkColor: 'text-gray-600',
    features: [
      '5 portfolio views/month included',
      '$25 per assessment (video review)',
      '3 active job postings',
      'Search by trade + region',
      'Badge verification on profiles',
      'Email support',
    ],
    limits: '5 portfolio views / mo',
    best_for: 'Small GC or specialty contractor with occasional hires',
  },
  {
    id: 'professional',
    name: 'Professional',
    badge: 'Most Popular',
    price_monthly: 0,
    price_per_assessment: 45,
    tagline: 'Pay-per-use for staffing agencies and active hirers',
    color: 'border-blue-500 ring-2 ring-blue-400',
    headerBg: 'bg-blue-600',
    accent: 'text-blue-600',
    btnClass: 'bg-blue-600 hover:bg-blue-700 text-white',
    checkColor: 'text-blue-600',
    features: [
      'No monthly subscription fee',
      '$45 per assessment (video review)',
      'Unlimited portfolio views',
      'Full search: skill + code + region',
      'Timestamped review reports',
      'ATS export (CSV)',
      'Priority support',
    ],
    limits: 'Unlimited views, pay per assessment',
    best_for: 'Staffing agencies, project-based contractors with variable volume',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    badge: 'Best Value at Scale',
    price_monthly: 599,
    price_per_assessment: 0,
    tagline: 'Unlimited assessments for high-volume hirers',
    color: 'border-purple-400',
    headerBg: 'bg-gradient-to-r from-purple-700 to-indigo-700',
    accent: 'text-purple-700',
    btnClass: 'bg-purple-700 hover:bg-purple-800 text-white',
    checkColor: 'text-purple-600',
    features: [
      'Unlimited portfolio views',
      'Unlimited assessments included',
      'Multi-user team access (up to 10)',
      'API / ATS integration',
      'Custom skill tag categories',
      'Dedicated account manager',
      'Quarterly mentor calibration reports',
      'White-label option available',
    ],
    limits: 'Unlimited everything',
    best_for: 'ENR 400 GCs, large staffing networks, MSPs with 50+ hires/year',
  },
]

const TRADE_OPTIONS = ['Electrician', 'Plumber', 'HVAC Technician', 'Welder', 'Pipefitter', 'Carpenter', 'Ironworker', 'Other']
const REGION_OPTIONS = ['California', 'Texas', 'Illinois', 'New York', 'Florida', 'Arizona', 'Washington', 'Other']
const COMPANY_SIZES = ['1–10 employees', '11–50', '51–200', '201–500', '500+']
const ROLES = [
  { value: 'hiring_manager', label: 'Hiring Manager' },
  { value: 'owner', label: 'Business Owner / GC' },
  { value: 'staffing', label: 'Staffing Agency' },
  { value: 'operations', label: 'Operations / Superintendent' },
  { value: 'hr', label: 'HR / Talent Acquisition' },
]

type FormState = {
  email: string; full_name: string; company_name: string; company_size: string; role: string
  monthly_volume: number; trades: string[]; regions: string[]
  top_use_case: string; biggest_pain: string; current_solution: string
  signed_loi: boolean; notes: string
}

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [monthlyVolume, setMonthlyVolume] = useState(10)
  const [form, setForm] = useState<FormState>({
    email: '', full_name: '', company_name: '', company_size: '', role: '',
    monthly_volume: 10, trades: [], regions: [],
    top_use_case: '', biggest_pain: '', current_solution: '',
    signed_loi: false, notes: '',
  })
  const [submitted, setSubmitted] = useState<{ plan: string; cost: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof FormState, v: any) => setForm(f => ({ ...f, [k]: v }))
  const toggleArr = (k: 'trades' | 'regions', v: string) =>
    set(k, (form[k] as string[]).includes(v) ? (form[k] as string[]).filter(x => x !== v) : [...(form[k] as string[]), v])

  const plan = PLANS.find(p => p.id === selectedPlan)

  // Monthly cost preview
  const calcCost = (planId: string, vol: number) => {
    const p = PLANS.find(x => x.id === planId)
    if (!p) return 0
    return p.price_monthly + (p.price_per_assessment * vol)
  }

  const handleSelectPlan = (id: string) => {
    setSelectedPlan(id)
    setShowForm(true)
    setTimeout(() => document.getElementById('loi-form')?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlan) return
    setLoading(true); setError('')

    const p = PLANS.find(x => x.id === selectedPlan)!
    const res = await fetch('/api/pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        plan_selected: selectedPlan,
        plan_price_monthly: p.price_monthly,
        plan_price_per_assessment: p.price_per_assessment,
        monthly_assessments_estimate: monthlyVolume,
        signed_loi: form.signed_loi,
        loi_terms_accepted: form.signed_loi,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Submission failed'); setLoading(false); return }
    setSubmitted({ plan: p.name, cost: data.monthly_cost_estimate })
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-lg w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">You're in!</h1>
          <p className="text-gray-600 mb-2">
            <strong>{submitted.plan}</strong> plan — est. <strong>${submitted.cost}/mo</strong>
          </p>
          <p className="text-gray-500 text-sm mb-8">
            We'll reach out within 24 hours to confirm your pilot terms and set up access.
          </p>
          <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left text-sm text-blue-800">
            <p className="font-semibold mb-1">What happens next:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>We confirm your plan and pilot terms via email</li>
              <li>You get access to search verified tradesperson portfolios</li>
              <li>Commission your first assessment free (on us)</li>
            </ol>
          </div>
          <div className="flex gap-3">
            <a href="/search" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 text-center">
              Browse Portfolios →
            </a>
            <a href="/" className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 text-center">
              Home
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-4 py-1.5 text-sm text-blue-300 mb-6">
            🧪 Early Access Pricing — Pilot Program
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Stop Hiring Blind.<br />
            <span className="text-blue-400">Verify Skills Before the Interview.</span>
          </h1>
          <p className="text-xl text-blue-200 mb-8 max-w-2xl mx-auto">
            CertClip lets you search verified tradesperson portfolios, review jurisdiction-tagged micro-badges, and commission expert video assessments — before you waste a day on the wrong hire.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-blue-300">
            {['12 verified tradespeople in the pilot', '5 trades covered', '35 code reference tags', 'TX · CA · IL · NY · AZ jurisdictions'].map(s => (
              <span key={s} className="flex items-center gap-1.5"><span className="text-green-400">✓</span>{s}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Volume calculator strip */}
      <div className="bg-blue-600 text-white px-4 py-5">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-4">
          <p className="font-medium text-lg">How many trade hires do you make per month?</p>
          <div className="flex items-center gap-4">
            <input type="range" min={1} max={100} value={monthlyVolume} onChange={e => setMonthlyVolume(Number(e.target.value))}
              className="w-48 accent-white" />
            <span className="text-2xl font-bold w-12 text-center">{monthlyVolume}</span>
          </div>
          <div className="flex gap-6 text-sm ml-auto">
            {PLANS.map(p => (
              <div key={p.id} className="text-center">
                <div className="font-bold text-xl">${calcCost(p.id, monthlyVolume)}<span className="text-xs font-normal text-blue-200">/mo</span></div>
                <div className="text-blue-200 text-xs">{p.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing cards */}
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Simple, Transparent Pricing</h2>
          <p className="text-gray-600 max-w-xl mx-auto">Pick the plan that fits your hiring volume. No hidden fees. Cancel anytime.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {PLANS.map(p => (
            <div key={p.id} className={`rounded-2xl border-2 overflow-hidden flex flex-col ${p.color} ${selectedPlan === p.id ? 'scale-105 shadow-2xl' : 'hover:shadow-lg'} transition-all`}>
              {/* Card header */}
              <div className={`${p.headerBg} p-6`}>
                <div className="flex items-start justify-between mb-3">
                  <h3 className={`text-xl font-bold ${p.id === 'professional' || p.id === 'enterprise' ? 'text-white' : 'text-gray-900'}`}>{p.name}</h3>
                  {p.badge && (
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${p.id === 'professional' ? 'bg-white text-blue-600' : 'bg-white/20 text-white'}`}>
                      {p.badge}
                    </span>
                  )}
                </div>
                <div className={`flex items-baseline gap-1 mb-3 ${p.id === 'professional' || p.id === 'enterprise' ? 'text-white' : 'text-gray-900'}`}>
                  {p.price_monthly > 0 ? (
                    <>
                      <span className="text-3xl font-bold">${p.price_monthly}</span>
                      <span className="text-sm opacity-70">/mo</span>
                      {p.price_per_assessment > 0 && (
                        <span className="text-sm opacity-70 ml-1">+ ${p.price_per_assessment}/assessment</span>
                      )}
                    </>
                  ) : p.price_per_assessment > 0 ? (
                    <>
                      <span className="text-3xl font-bold">${p.price_per_assessment}</span>
                      <span className="text-sm opacity-70">/assessment</span>
                      <span className="text-sm opacity-70 ml-1">no monthly fee</span>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl font-bold">${p.price_monthly}</span>
                      <span className="text-sm opacity-70">/mo</span>
                      <span className="text-sm opacity-70 ml-1">unlimited</span>
                    </>
                  )}
                </div>
                <div className={`text-sm ${p.id === 'professional' || p.id === 'enterprise' ? 'text-blue-100' : 'text-gray-500'}`}>{p.tagline}</div>
              </div>

              {/* Cost preview for current volume */}
              <div className={`px-6 py-3 border-b ${p.color.split(' ')[0]} bg-gray-50 flex items-center justify-between`}>
                <span className="text-xs text-gray-500">At {monthlyVolume} assessments/mo:</span>
                <span className={`font-bold text-sm ${p.accent}`}>${calcCost(p.id, monthlyVolume)}/mo</span>
              </div>

              {/* Features */}
              <div className="p-6 flex-1">
                <ul className="space-y-2.5">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className={`${p.checkColor} font-bold mt-0.5`}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 text-xs text-gray-400 italic">Best for: {p.best_for}</div>
              </div>

              <div className="px-6 pb-6">
                <button onClick={() => handleSelectPlan(p.id)}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${p.btnClass} ${selectedPlan === p.id ? 'ring-4 ring-offset-2 ring-blue-300' : ''}`}>
                  {selectedPlan === p.id ? '✓ Selected — Fill Details Below' : `Get Started with ${p.name}`}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div className="mb-16 overflow-x-auto">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Compare Plans</h3>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 pr-6 text-gray-500 font-medium">Feature</th>
                {PLANS.map(p => <th key={p.id} className="text-center py-3 px-4 font-bold text-gray-900">{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['Monthly fee', '$149', '$0', '$599'],
                ['Per-assessment fee', '$25', '$45', '$0 (unlimited)'],
                ['Portfolio views', '5/mo', 'Unlimited', 'Unlimited'],
                ['Assessments included', 'Pay per use', 'Pay per use', 'Unlimited'],
                ['Team seats', '1', '1', 'Up to 10'],
                ['ATS/API export', '—', 'CSV', 'Full API'],
                ['Dedicated account manager', '—', '—', '✓'],
                ['White-label option', '—', '—', '✓'],
              ].map(([feat, ...vals]) => (
                <tr key={feat} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 pr-6 text-gray-600">{feat}</td>
                  {vals.map((v, i) => <td key={i} className="text-center py-3 px-4 text-gray-800">{v}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* LOI Form */}
        <div id="loi-form" className={`transition-all ${showForm ? 'opacity-100' : 'opacity-0 pointer-events-none h-0 overflow-hidden'}`}>
          {plan && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg">✓</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">You selected: <span className="text-blue-600">{plan.name}</span></h3>
                  <p className="text-gray-500 text-sm">
                    Est. cost at {monthlyVolume} assessments/month: <strong className="text-blue-700">${calcCost(plan.id, monthlyVolume)}/mo</strong>
                  </p>
                </div>
                <button onClick={() => setSelectedPlan(null)} className="ml-auto text-gray-400 hover:text-gray-600 text-sm underline">Change plan</button>
              </div>

              {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Work Email *</label>
                    <input value={form.email} onChange={e => set('email', e.target.value)} required type="email" placeholder="you@company.com"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input value={form.full_name} onChange={e => set('full_name', e.target.value)} required placeholder="Jane Smith"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                    <input value={form.company_name} onChange={e => set('company_name', e.target.value)} required placeholder="Acme Electrical Contractors"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Role *</label>
                    <select value={form.role} onChange={e => set('role', e.target.value)} required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="">— Select —</option>
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
                    <select value={form.company_size} onChange={e => set('company_size', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="">— Select —</option>
                      {COMPANY_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assessments/month (your estimate)</label>
                    <div className="flex items-center gap-3">
                      <input type="range" min={1} max={100} value={monthlyVolume} onChange={e => setMonthlyVolume(Number(e.target.value))}
                        className="flex-1 accent-blue-600" />
                      <span className="font-bold text-blue-700 w-8 text-right">{monthlyVolume}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Estimated monthly cost: <strong>${calcCost(plan.id, monthlyVolume)}</strong></p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Trades you hire for</label>
                  <div className="flex flex-wrap gap-2">
                    {TRADE_OPTIONS.map(t => (
                      <button key={t} type="button" onClick={() => toggleArr('trades', t)}
                        className={`px-3 py-1.5 rounded-lg text-xs border-2 font-medium transition-colors ${form.trades.includes(t) ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-gray-300 text-gray-600 hover:border-gray-400 bg-white'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary hiring regions</label>
                  <div className="flex flex-wrap gap-2">
                    {REGION_OPTIONS.map(r => (
                      <button key={r} type="button" onClick={() => toggleArr('regions', r)}
                        className={`px-3 py-1.5 rounded-lg text-xs border-2 font-medium transition-colors ${form.regions.includes(r) ? 'bg-green-50 border-green-400 text-green-700' : 'border-gray-300 text-gray-600 hover:border-gray-400 bg-white'}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary use case</label>
                    <textarea value={form.top_use_case} onChange={e => set('top_use_case', e.target.value)} rows={2}
                      placeholder="e.g. Pre-screen electricians before site visit"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Biggest hiring pain today</label>
                    <textarea value={form.biggest_pain} onChange={e => set('biggest_pain', e.target.value)} rows={2}
                      placeholder="e.g. Candidates overstate experience; no way to verify before hire"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current solution (if any)</label>
                    <textarea value={form.current_solution} onChange={e => set('current_solution', e.target.value)} rows={2}
                      placeholder="e.g. Phone screen + reference check; nothing systematic"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                </div>

                {/* LOI terms */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h4 className="font-semibold text-gray-800 mb-3">Pilot Terms (no payment required now)</h4>
                  <ul className="text-sm text-gray-600 space-y-1.5 mb-4">
                    <li className="flex items-start gap-2"><span className="text-green-500 font-bold mt-0.5">✓</span>Free full access for 90 days during the pilot</li>
                    <li className="flex items-start gap-2"><span className="text-green-500 font-bold mt-0.5">✓</span>Commission up to 3 assessments at no cost (we cover it)</li>
                    <li className="flex items-start gap-2"><span className="text-green-500 font-bold mt-0.5">✓</span>Provide 1 feedback call (30 min) during the pilot period</li>
                    <li className="flex items-start gap-2"><span className="text-green-500 font-bold mt-0.5">✓</span>Pricing locks in at pilot rates if you convert — no increases for 12 months</li>
                    <li className="flex items-start gap-2"><span className="text-blue-400 font-bold mt-0.5">→</span>Your intent: evaluate <strong>{plan.name}</strong> at est. <strong>${calcCost(plan.id, monthlyVolume)}/mo</strong> based on {monthlyVolume} assessments/month</li>
                  </ul>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.signed_loi} onChange={e => set('signed_loi', e.target.checked)} className="mt-0.5 accent-blue-600 w-4 h-4" />
                    <span className="text-sm text-gray-700">I agree to the pilot terms and express intent to evaluate CertClip's <strong>{plan.name}</strong> plan. I understand no payment is due until I convert after the pilot.</span>
                  </label>
                </div>

                <button type="submit" disabled={loading || !form.signed_loi || !form.email || !form.full_name || !form.company_name}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  {loading ? 'Submitting…' : `🚀 Sign Letter of Intent — ${plan.name} Plan`}
                </button>
                <p className="text-center text-xs text-gray-400">No payment. No commitment. Just your intent to evaluate. We'll follow up within 24 hours.</p>
              </form>
            </div>
          )}
        </div>

        {/* Social proof */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { quote: '"We hire 30-40 electricians per year. Need to verify NEC 2020 and 3-phase panel work before calling candidates."', company: 'Nexus Electrical Contractors', role: 'Hiring Manager', plan: 'Starter' },
            { quote: '"We place 200+ tradespeople per year. This would replace our manual skills screening for 60% of placements."', company: 'Reliable Staffing Group', role: 'Staffing Agency', plan: 'Enterprise' },
            { quote: '"Lost a CA project penalty due to a sub not knowing Title 24. Risk reduction is worth $30/assessment."', company: 'Sunstate Builders LLC', role: 'GC Owner', plan: 'Professional' },
          ].map(t => (
            <div key={t.company} className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <p className="text-gray-700 text-sm italic mb-4">"{t.quote}"</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{t.company}</p>
                  <p className="text-gray-500 text-xs">{t.role}</p>
                </div>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">{t.plan}</span>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h3>
          <div className="space-y-4">
            {[
              { q: 'What exactly is an "assessment"?', a: 'An assessment is when a vetted journeyman mentor watches a tradesperson\'s 10–90 second work-sample video, rates their technique, tags applicable code references (NEC, ASME, Title 24, etc.), and writes timestamped feedback. The result is a jurisdiction-tagged micro-badge on the tradesperson\'s profile.' },
              { q: 'How is this different from just checking certifications?', a: 'Certifications tell you someone passed a test years ago. CertClip shows you what they can actually do right now, in their jurisdiction, on the specific task you care about — with a journeyman\'s expert eye on it.' },
              { q: 'Who are the mentor reviewers?', a: 'All mentors are vetted journeymen or master tradespeople recruited through union training centers (IBEW, UA) and certification bodies (NATE, AWS). Each reviewer has 12–31 years of field experience and jurisdiction-specific code knowledge.' },
              { q: 'What if I need a jurisdiction you don\'t cover yet?', a: 'Currently covering TX, CA, IL, NY, and AZ. We\'re adding jurisdictions based on employer demand — tell us where you hire and we\'ll prioritize it.' },
              { q: 'Can I try before I commit?', a: 'Yes. The pilot gives you 90 days free with 3 complimentary assessments. No payment until you decide to convert after the pilot.' },
            ].map(({ q, a }) => (
              <details key={q} className="border border-gray-200 rounded-xl p-5 group">
                <summary className="font-semibold text-gray-800 cursor-pointer list-none flex items-center justify-between">
                  {q}
                  <span className="text-gray-400 text-xl group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-gray-600 text-sm mt-3">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
