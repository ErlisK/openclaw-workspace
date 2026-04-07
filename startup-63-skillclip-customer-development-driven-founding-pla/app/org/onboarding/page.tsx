'use client'

import { useState } from 'react'

const STEPS = ['Org Info', 'Team & Trades', 'Payment Plan', 'Done']

const PLAN_OPTIONS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$149/mo + $25/assessment',
    monthly: 149,
    tagline: 'For small contractors with occasional hiring needs',
    features: ['5 portfolio views/month', '$25/assessment', '3 active job postings', 'Email support'],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '$45/assessment only',
    monthly: 0,
    tagline: 'Pay-per-use for variable hiring volume',
    features: ['Unlimited portfolio views', '$45/assessment', 'CSV/ATS export', 'Priority support'],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$599/mo unlimited',
    monthly: 599,
    tagline: 'Unlimited assessments for high-volume hirers',
    features: ['Unlimited everything', 'Up to 10 team seats', 'API integration', 'Dedicated account manager'],
  },
]

const TRADE_OPTIONS = ['Electrician', 'Plumber', 'HVAC Technician', 'Welder', 'Pipefitter', 'Carpenter', 'Other']
const REGION_OPTIONS = ['California', 'Texas', 'Illinois', 'New York', 'Florida', 'Arizona', 'Other']

export default function OrgOnboardingPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    name: '', domain: '', industry: 'contractor', company_size: '',
    hires_per_year: '', billing_email: '', owner_email: '',
    trades: [] as string[], regions: [] as string[],
    plan: 'professional', ats_integration: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [org, setOrg] = useState<any>(null)

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const toggleArr = (k: 'trades' | 'regions', v: string) =>
    set(k, (form[k] as string[]).includes(v) ? (form[k] as string[]).filter(x => x !== v) : [...(form[k] as string[]), v])

  const handleNext = async () => {
    if (step < STEPS.length - 2) { setStep(s => s + 1); return }
    // Final step: submit
    setLoading(true); setError('')
    const res = await fetch('/api/org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        hires_per_year: parseInt(form.hires_per_year) || 0,
        primary_trades: form.trades,
        primary_regions: form.regions,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setOrg(data.org)
    setStep(STEPS.length - 1)
    setLoading(false)
  }

  if (step === STEPS.length - 1 && org) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to CertClip!</h1>
          <p className="text-gray-600 mb-6"><strong>{org.name}</strong> is set up on the <strong className="capitalize">{org.plan}</strong> plan.</p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Organization</span><span className="font-medium">{org.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Plan</span><span className="font-medium capitalize">{org.plan}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">API Key</span><span className="font-mono text-xs text-gray-400">{org.api_key?.slice(0, 16)}…</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <a href="/search" className="bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 text-center text-sm">
              Search Portfolios →
            </a>
            <a href="/verify" className="bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 text-center text-sm">
              Book Verification
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Set Up Your CertClip Account</h1>
          <p className="text-gray-500 mt-1">Takes about 3 minutes. Start searching verified portfolios today.</p>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.slice(0, -1).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full text-xs flex items-center justify-center font-bold transition-colors ${
                step > i ? 'bg-green-500 text-white' : step === i ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>{step > i ? '✓' : i + 1}</div>
              <span className={`text-sm ${step === i ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>{s}</span>
              {i < STEPS.length - 2 && <div className="w-8 h-0.5 bg-gray-200" />}
            </div>
          ))}
        </div>

        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Step 0: Org info */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Tell us about your company</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Acme Electrical Contractors"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Website</label>
                  <input value={form.domain} onChange={e => set('domain', e.target.value)} placeholder="acmeelectrical.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Type</label>
                  <select value={form.industry} onChange={e => set('industry', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="contractor">Electrical/Mechanical Contractor</option>
                    <option value="gc">General Contractor</option>
                    <option value="staffing">Staffing Agency</option>
                    <option value="industrial">Industrial / Manufacturing</option>
                    <option value="facility">Facility Management</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
                  <select value={form.company_size} onChange={e => set('company_size', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="">— Select —</option>
                    {['1–10','11–50','51–200','201–500','500+'].map(s => <option key={s} value={s}>{s} employees</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trade hires per year</label>
                  <input value={form.hires_per_year} onChange={e => set('hires_per_year', e.target.value)} type="number" min="0" placeholder="25"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billing Email *</label>
                  <input value={form.billing_email} onChange={e => set('billing_email', e.target.value)} type="email" placeholder="billing@company.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Work Email</label>
                  <input value={form.owner_email} onChange={e => set('owner_email', e.target.value)} type="email" placeholder="you@company.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Trades & Regions */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900 mb-4">What trades and regions do you hire in?</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trades you hire for</label>
                <div className="flex flex-wrap gap-2">
                  {TRADE_OPTIONS.map(t => (
                    <button key={t} type="button" onClick={() => toggleArr('trades', t)}
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                        form.trades.includes(t) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}>{t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary hiring regions</label>
                <div className="flex flex-wrap gap-2">
                  {REGION_OPTIONS.map(r => (
                    <button key={r} type="button" onClick={() => toggleArr('regions', r)}
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                        form.regions.includes(r) ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}>{r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ATS / HR System (optional)</label>
                <input value={form.ats_integration} onChange={e => set('ats_integration', e.target.value)}
                  placeholder="e.g. Greenhouse, Workday, BambooHR, or custom"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-gray-400 mt-1">We'll prioritize your integration in our API roadmap.</p>
              </div>
            </div>
          )}

          {/* Step 2: Plan */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Choose your plan</h2>
              <div className="space-y-3">
                {PLAN_OPTIONS.map(p => (
                  <div key={p.id} onClick={() => set('plan', p.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      form.plan === p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{p.name}</span>
                          {p.popular && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Most Popular</span>}
                        </div>
                        <div className="text-blue-700 font-medium text-sm mt-0.5">{p.price}</div>
                        <div className="text-gray-500 text-xs mt-0.5">{p.tagline}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                        form.plan === p.id ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                      }`}>
                        {form.plan === p.id && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                    </div>
                    {form.plan === p.id && (
                      <ul className="mt-3 space-y-1">
                        {p.features.map(f => <li key={f} className="text-xs text-gray-600 flex items-center gap-1.5"><span className="text-blue-500">✓</span>{f}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                🧪 <strong>Free 90-day pilot:</strong> No payment required now. We'll reach out to confirm pilot access.
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200">
                ← Back
              </button>
            )}
            <button onClick={handleNext} disabled={loading || (step === 0 && (!form.name || !form.billing_email))}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors">
              {loading ? 'Setting up…' : step === STEPS.length - 2 ? '🚀 Create Account' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
