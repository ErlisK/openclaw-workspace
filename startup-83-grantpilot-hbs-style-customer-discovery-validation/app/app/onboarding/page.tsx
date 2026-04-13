'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Tooltip from '@/components/Tooltip'

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)
}

const ORG_TYPES = [
  { value: 'nonprofit', label: '501(c)(3) Nonprofit', icon: '🏛️' },
  { value: 'neighborhood_assoc', label: 'Neighborhood Association', icon: '🏘️' },
  { value: 'municipal', label: 'City / County Government', icon: '🏙️' },
  { value: 'tribal', label: 'Tribal Government', icon: '🪶' },
  { value: 'school', label: 'School / School District', icon: '🏫' },
  { value: 'consultant', label: 'Grant Consultant / Freelancer', icon: '💼' },
  { value: 'other', label: 'Other', icon: '🔹' },
]

const BUDGET_RANGES = [
  { value: '0', label: 'Under $50K' },
  { value: '50000', label: '$50K – $250K' },
  { value: '250000', label: '$250K – $1M' },
  { value: '1000000', label: '$1M – $5M' },
  { value: '5000000', label: 'Over $5M' },
]

const FUNDER_TYPES = [
  { value: 'federal', label: 'Federal (HUD, USDA, SAMHSA…)', icon: '🏛️' },
  { value: 'state', label: 'State Government', icon: '🗺️' },
  { value: 'foundation', label: 'Private Foundations', icon: '💎' },
  { value: 'community', label: 'Community Foundations', icon: '🌳' },
  { value: 'corporate', label: 'Corporate / CSR', icon: '🏢' },
  { value: 'cdbg', label: 'CDBG / HUD Entitlement', icon: '🏠' },
]

const GRANT_FOCUSES = [
  'Housing & Homelessness', 'Economic Development', 'Youth & Education',
  'Health & Mental Health', 'Environment & Climate', 'Arts & Culture',
  'Food Security', 'Public Safety', 'Workforce Development', 'Infrastructure',
]

const STEPS = [
  { num: 1, label: 'Org Profile' },
  { num: 2, label: 'Location' },
  { num: 3, label: 'Funder Focus' },
  { num: 4, label: 'Ready!' },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  // Step 1
  const [orgName, setOrgName] = useState('')
  const [orgType, setOrgType] = useState('nonprofit')
  const [budgetRange, setBudgetRange] = useState('250000')
  // Step 2
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [ein, setEin] = useState('')
  // Step 3
  const [funderTypes, setFunderTypes] = useState<string[]>([])
  const [grantFocuses, setGrantFocuses] = useState<string[]>([])
  const [annualGoal, setAnnualGoal] = useState('3')
  // Meta
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  function toggleFunderType(v: string) {
    setFunderTypes(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }
  function toggleFocus(v: string) {
    setGrantFocuses(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }

  async function handleCreate() {
    setLoading(true); setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const slug = slugify(orgName) + '-' + Math.random().toString(36).slice(2, 6)

      const onboardRes = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName,
          slug,
          org_type: orgType,
          annual_budget_usd: parseInt(budgetRange),
          city,
          state,
          ein: ein || null,
          funder_types: funderTypes,
          grant_focus_areas: grantFocuses,
          annual_grant_goal: parseInt(annualGoal),
        }),
      })

      if (!onboardRes.ok) {
        const errData = await onboardRes.json()
        throw new Error(errData.error || 'Failed to create organization')
      }

      // Track analytics
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'onboarding_complete',
          properties: {
            org_type: orgType,
            org_name: orgName,
            funder_types: funderTypes,
            grant_focuses: grantFocuses,
            annual_goal: annualGoal,
            has_ein: !!ein,
            has_location: !!(city && state),
          },
        }),
      }).catch(() => {})

      setStep(4)
      setTimeout(() => router.push('/dashboard?welcome=1'), 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-xl mb-4">
            <span className="text-white font-bold text-lg">GP</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {step < 4 ? 'Set up your organization' : 'You\'re all set! 🎉'}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {step < 4 ? 'Takes 2 minutes. Update anything later.' : 'Taking you to your dashboard…'}
          </p>
        </div>

        {/* Step progress */}
        {step < 4 && (
          <div className="mb-6">
            <div className="flex gap-1 mb-2">
              {STEPS.filter(s => s.num < 4).map(s => (
                <div
                  key={s.num}
                  className={`flex-1 h-1.5 rounded-full transition-colors ${step >= s.num ? 'bg-indigo-600' : 'bg-gray-200'}`}
                />
              ))}
            </div>
            <div className="flex justify-between">
              {STEPS.filter(s => s.num < 4).map(s => (
                <span key={s.num} className={`text-xs ${step >= s.num ? 'text-indigo-600 font-medium' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* ── Step 1: Org Profile ──────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-gray-900 text-lg">Organization profile</h2>

              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-sm font-medium text-gray-700">Organization name *</label>
                </div>
                <input
                  type="text" required value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="e.g. Riverside Community Foundation"
                  autoFocus
                />
              </div>

              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-sm font-medium text-gray-700">Organization type *</label>
                  <Tooltip text="Determines which grant types and form templates we pre-load for you">
                    <span className="text-gray-400 cursor-help text-xs">ⓘ</span>
                  </Tooltip>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ORG_TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setOrgType(t.value)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors ${orgType === t.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-900 font-medium'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <span>{t.icon}</span> {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-sm font-medium text-gray-700">Annual operating budget</label>
                  <Tooltip text="Helps us match you with grants appropriate for your org size and capacity">
                    <span className="text-gray-400 cursor-help text-xs">ⓘ</span>
                  </Tooltip>
                </div>
                <select
                  value={budgetRange} onChange={e => setBudgetRange(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  {BUDGET_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!orgName.trim()}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-40 text-sm"
              >
                Continue →
              </button>
            </div>
          )}

          {/* ── Step 2: Location & Compliance ───────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-gray-900 text-lg">Location & compliance</h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text" value={city} onChange={e => setCity(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Portland"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text" maxLength={2} value={state} onChange={e => setState(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="OR"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-sm font-medium text-gray-700">EIN</label>
                  <span className="text-gray-400 text-xs">(optional)</span>
                  <Tooltip text="Required for federal grants (SF-424). You can add this later.">
                    <span className="text-gray-400 cursor-help text-xs">ⓘ</span>
                  </Tooltip>
                </div>
                <input
                  type="text" value={ein} onChange={e => setEin(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="12-3456789"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button" onClick={() => setStep(1)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 text-sm"
                >
                  ← Back
                </button>
                <button
                  type="button" onClick={() => setStep(3)}
                  className="flex-grow-[2] bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 text-sm"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Funder Focus ─────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-semibold text-gray-900 text-lg">Funder focus</h2>
                <p className="text-sm text-gray-400 mt-0.5">Personalizes your RFP feed and template library.</p>
              </div>

              <div>
                <div className="flex items-center gap-1 mb-2">
                  <label className="text-sm font-medium text-gray-700">Which funders do you target?</label>
                  <Tooltip text="Select all that apply. We pre-load matching RFP templates and compliance forms for each type.">
                    <span className="text-gray-400 cursor-help text-xs">ⓘ</span>
                  </Tooltip>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {FUNDER_TYPES.map(f => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => toggleFunderType(f.value)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors ${funderTypes.includes(f.value)
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-900 font-medium'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <span>{f.icon}</span>
                      <span className="leading-tight">{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1 mb-2">
                  <label className="text-sm font-medium text-gray-700">Program focus areas</label>
                  <Tooltip text="Pick up to 4. Used to match your org with relevant open grants.">
                    <span className="text-gray-400 cursor-help text-xs">ⓘ</span>
                  </Tooltip>
                </div>
                <div className="flex flex-wrap gap-2">
                  {GRANT_FOCUSES.map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => toggleFocus(f)}
                      disabled={!grantFocuses.includes(f) && grantFocuses.length >= 4}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${grantFocuses.includes(f)
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-800 font-medium'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 disabled:opacity-40'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-sm font-medium text-gray-700">Annual grant goal</label>
                  <Tooltip text="How many grants do you want to apply for this year? Sets your pipeline target.">
                    <span className="text-gray-400 cursor-help text-xs">ⓘ</span>
                  </Tooltip>
                </div>
                <div className="flex gap-2">
                  {['1', '2', '3', '5', '8', '10+'].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAnnualGoal(n)}
                      className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${annualGoal === n
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-800 font-semibold'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button" onClick={() => setStep(2)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 text-sm"
                >
                  ← Back
                </button>
                <button
                  type="button" onClick={handleCreate} disabled={loading}
                  className="flex-grow-[2] bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 text-sm"
                >
                  {loading ? 'Creating org…' : 'Finish setup →'}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Success ──────────────────────────────────── */}
          {step === 4 && (
            <div className="text-center py-6 space-y-4">
              <div className="text-5xl">🎉</div>
              <h2 className="text-xl font-bold text-gray-900">Organization created!</h2>
              <p className="text-sm text-gray-500">
                Your workspace is ready. Redirecting to your dashboard…
              </p>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4 overflow-hidden">
                <div className="h-1.5 bg-indigo-500 rounded-full animate-[progress_2s_linear_forwards]" style={{ width: '100%', animationFillMode: 'forwards' }} />
              </div>
            </div>
          )}
        </div>

        {/* Skip link */}
        {step < 4 && (
          <p className="text-center mt-4 text-xs text-gray-400">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="hover:text-gray-600 underline underline-offset-2"
            >
              Skip for now
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
