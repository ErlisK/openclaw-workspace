'use client'

import { useState } from 'react'

interface FormData {
  email: string
  org_name: string
  org_type: string
  region: string
  grants_per_year: string
  referral_source: string
}

export default function WaitlistForm() {
  const [step, setStep] = useState<'form' | 'success' | 'duplicate'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState<FormData>({
    email: '',
    org_name: '',
    org_type: '',
    region: '',
    grants_per_year: '',
    referral_source: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.email) { setError('Email is required'); return }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()

      if (res.status === 409) {
        setStep('duplicate')
      } else if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
      } else {
        setStep('success')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'success') {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-4">🎉</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">You&apos;re on the list!</h3>
        <p className="text-gray-600 text-sm">
          We&apos;ll reach out when GrantSnap opens in your region. You&apos;ll get early access + founder pricing.
        </p>
        <p className="text-green-600 text-xs mt-3 font-medium">
          ✓ Confirmation sent to {formData.email}
        </p>
      </div>
    )
  }

  if (step === 'duplicate') {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">👋</div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">You&apos;re already registered!</h3>
        <p className="text-gray-600 text-sm">
          {formData.email} is already on the waitlist. We&apos;ll be in touch soon.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Work email <span className="text-green-600">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={formData.email}
          onChange={handleChange}
          placeholder="you@yourorg.org"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="org_name" className="block text-sm font-medium text-gray-700 mb-1">
          Organization name
        </label>
        <input
          id="org_name"
          name="org_name"
          type="text"
          value={formData.org_name}
          onChange={handleChange}
          placeholder="Bay Area Youth Arts Collective"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="org_type" className="block text-sm font-medium text-gray-700 mb-1">
            Org type
          </label>
          <select
            id="org_type"
            name="org_type"
            value={formData.org_type}
            onChange={handleChange}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="">Select...</option>
            <option value="501c3">501(c)(3) nonprofit</option>
            <option value="fiscal_sponsor">Fiscally sponsored project</option>
            <option value="grassroots">Grassroots / unincorporated</option>
            <option value="tribal">Tribal organization</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="grants_per_year" className="block text-sm font-medium text-gray-700 mb-1">
            Grants applied / yr
          </label>
          <select
            id="grants_per_year"
            name="grants_per_year"
            value={formData.grants_per_year}
            onChange={handleChange}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="">Select...</option>
            <option value="1-5">1–5</option>
            <option value="6-15">6–15</option>
            <option value="16-30">16–30</option>
            <option value="30+">30+</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-1">
          Primary region
        </label>
        <select
          id="region"
          name="region"
          value={formData.region}
          onChange={handleChange}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">Select your region...</option>
          <option value="bay_area_ca">Bay Area, CA</option>
          <option value="los_angeles_ca">Los Angeles, CA</option>
          <option value="new_york_ny">New York City, NY</option>
          <option value="chicago_il">Chicago, IL</option>
          <option value="seattle_wa">Seattle, WA</option>
          <option value="austin_tx">Austin, TX</option>
          <option value="denver_co">Denver, CO</option>
          <option value="boston_ma">Boston, MA</option>
          <option value="other_us">Other US</option>
        </select>
      </div>

      <div>
        <label htmlFor="referral_source" className="block text-sm font-medium text-gray-700 mb-1">
          How did you hear about us?
        </label>
        <select
          id="referral_source"
          name="referral_source"
          value={formData.referral_source}
          onChange={handleChange}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">Select...</option>
          <option value="peer_referral">Colleague / peer org</option>
          <option value="social_media">Social media</option>
          <option value="google">Google / search</option>
          <option value="community_foundation">Community foundation</option>
          <option value="newsletter">Newsletter / blog</option>
          <option value="other">Other</option>
        </select>
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-sm"
      >
        {loading ? 'Joining waitlist...' : 'Join the Waitlist →'}
      </button>

      <p className="text-xs text-gray-400 text-center">
        No spam. Early access + founder pricing when we launch.
      </p>
    </form>
  )
}
