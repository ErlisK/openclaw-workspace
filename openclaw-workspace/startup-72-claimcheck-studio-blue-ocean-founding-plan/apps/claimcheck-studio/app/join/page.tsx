'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function JoinForm() {
  const searchParams = useSearchParams()
  const code = searchParams.get('code') || ''

  const [type, setType] = useState<'beta_user' | 'reviewer'>('beta_user')
  const [form, setForm] = useState({
    name: '', email: '', orgName: '', orgType: 'other', role: '',
    useCase: '', referralSource: '', inviteCode: code,
    // Reviewer fields
    specialty: '', orcidId: '', institution: '', yearsExperience: '',
    publicationCount: '', highestDegree: '', motivation: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ inviteCode?: string; message?: string } | null>(null)

  function update(field: string, value: string) {
    setForm(p => ({ ...p, [field]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email) { setError('Name and email are required'); return }
    setLoading(true); setError(null)

    const payload: Record<string, unknown> = {
      type, name: form.name, email: form.email,
      orgName: form.orgName, orgType: form.orgType,
      role: form.role, useCase: form.useCase,
      referralSource: form.referralSource || 'organic',
    }

    if (type === 'reviewer') {
      payload.specialty = form.specialty
      payload.orcidId = form.orcidId
      payload.institution = form.institution
      payload.yearsExperience = form.yearsExperience ? parseInt(form.yearsExperience) : undefined
      payload.publicationCount = form.publicationCount ? parseInt(form.publicationCount) : undefined
      payload.highestDegree = form.highestDegree
      payload.motivation = form.motivation
    }

    try {
      const res = await fetch('/api/beta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      setSubmitted(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  if (submitted && result) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-6">
        <div className="text-5xl">🎉</div>
        <h2 className="text-2xl font-bold text-white">
          {type === 'reviewer' ? "Reviewer Application Received" : "You're on the list!"}
        </h2>
        <p className="text-gray-400">{result.message}</p>
        {result.inviteCode && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-center">
            <div className="text-xs text-gray-500 mb-1">Your invite code</div>
            <div className="text-xl font-mono font-bold text-blue-400">{result.inviteCode}</div>
            <div className="text-xs text-gray-600 mt-2">Save this — you'll need it to activate your account</div>
          </div>
        )}
        <div className="text-xs text-gray-500">
          Questions? Email <a href="mailto:hello@citebundle.com" className="text-blue-400">hello@citebundle.com</a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-blue-400 text-3xl">◈</span>
          <span className="text-2xl font-bold text-white">ClaimCheck Studio</span>
        </div>
        <h1 className="text-xl font-bold text-white mb-2">
          {code ? 'Activate your beta access' : 'Join the closed beta'}
        </h1>
        <p className="text-gray-400 text-sm">
          The evidence-grounded content studio — every claim earns its citation.
        </p>
        {code && (
          <div className="mt-3 px-3 py-2 bg-blue-950/40 border border-blue-700/40 rounded-lg text-xs text-blue-300">
            Invite code: <span className="font-mono font-bold">{code}</span>
          </div>
        )}
      </div>

      {/* Type selector */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { value: 'beta_user' as const, label: 'Beta User', icon: '👤', desc: 'Content creator, writer, or researcher' },
          { value: 'reviewer' as const, label: 'Peer Reviewer', icon: '🔬', desc: 'Vetted expert reviewing claims for pay' },
        ].map(opt => (
          <button key={opt.value} onClick={() => setType(opt.value)}
            className={`rounded-xl border p-4 text-left transition-colors ${
              type === opt.value ? 'border-blue-600 bg-blue-950/30' : 'border-gray-800 bg-gray-900 hover:border-gray-700'
            }`}>
            <div className="text-lg mb-1">{opt.icon}</div>
            <div className="text-sm font-medium text-white">{opt.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        {/* Common fields */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Full name *</label>
            <input value={form.name} onChange={e => update('name', e.target.value)} required
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-600" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Email *</label>
            <input type="email" value={form.email} onChange={e => update('email', e.target.value)} required
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-600" />
          </div>
        </div>

        {type === 'beta_user' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Organization</label>
                <input value={form.orgName} onChange={e => update('orgName', e.target.value)}
                  placeholder="Hospital, publisher, agency..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-600" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Org type</label>
                <select value={form.orgType} onChange={e => update('orgType', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-600">
                  {['pharma','biotech','hospital','university','media','agency','independent','other'].map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Role / title</label>
              <input value={form.role} onChange={e => update('role', e.target.value)}
                placeholder="Medical Writer, Health Journalist, Research Scientist..."
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-600" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">How will you use ClaimCheck?</label>
              <textarea value={form.useCase} onChange={e => update('useCase', e.target.value)} rows={2}
                placeholder="e.g. Verify claims in press releases before publishing..."
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-600 resize-none" />
            </div>
          </>
        )}

        {type === 'reviewer' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Institution</label>
                <input value={form.institution} onChange={e => update('institution', e.target.value)}
                  placeholder="University / Hospital"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-600" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Specialty *</label>
                <input value={form.specialty} onChange={e => update('specialty', e.target.value)} required
                  placeholder="oncology, cardiology..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-600" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Degree</label>
                <select value={form.highestDegree} onChange={e => update('highestDegree', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-600">
                  {['', 'MD', 'PhD', 'MD PhD', 'PharmD', 'Other'].map(d => <option key={d} value={d}>{d || 'Select…'}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Years experience</label>
                <input type="number" min="0" max="50" value={form.yearsExperience} onChange={e => update('yearsExperience', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-600" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Publications</label>
                <input type="number" min="0" value={form.publicationCount} onChange={e => update('publicationCount', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-600" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                ORCID iD <span className="text-gray-600">(required — e.g. 0000-0001-2345-6789)</span>
              </label>
              <input value={form.orcidId} onChange={e => update('orcidId', e.target.value)}
                placeholder="0000-0000-0000-0000"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-gray-600 focus:outline-none focus:border-blue-600" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Why do you want to join? (optional)</label>
              <textarea value={form.motivation} onChange={e => update('motivation', e.target.value)} rows={2}
                placeholder="Your motivation for joining as a paid reviewer..."
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-600 resize-none" />
            </div>
            <div className="text-xs bg-blue-950/20 border border-blue-700/30 rounded-lg p-3 text-blue-300">
              💰 <strong>Reviewer pay:</strong> $0.50–$1.50 per task, paid via Stripe Connect. Minimum PhD/MD required + ORCID verification. We review all applications within 5 business days.
            </div>
          </>
        )}

        <div>
          <label className="text-xs text-gray-500 mb-1 block">How did you hear about us?</label>
          <input value={form.referralSource} onChange={e => update('referralSource', e.target.value)}
            placeholder="Twitter, LinkedIn, colleague, conference..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-600" />
        </div>

        {error && <div className="text-sm text-red-300 bg-red-950/30 border border-red-700/40 rounded px-3 py-2">{error}</div>}

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-xl font-medium text-sm transition-colors">
          {loading ? 'Submitting…' : type === 'reviewer' ? 'Apply as Reviewer →' : 'Request Beta Access →'}
        </button>

        <p className="text-xs text-gray-600 text-center">
          By applying, you agree to our <a href="#" className="text-gray-500 hover:text-gray-400">terms</a>.
          We'll never share your information.
          Questions: <a href="mailto:hello@citebundle.com" className="text-blue-500">hello@citebundle.com</a>
        </p>
      </form>
    </div>
  )
}

export default function JoinPage() {
  return (
    <div className="min-h-screen bg-gray-950 py-16 px-4">
      <Suspense fallback={<div className="text-gray-500 text-sm text-center">Loading…</div>}>
        <JoinForm />
      </Suspense>
    </div>
  )
}
