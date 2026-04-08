'use client'
import { useState } from 'react'

const AGENDA = [
  { time: '0:00', item: 'Welcome + context: why evidence-grounded content matters' },
  { time: '5:00', item: 'Live demo: manuscript → claim extraction → evidence search → output' },
  { time: '20:00', item: 'Design partner spotlight: real workflows, real results' },
  { time: '30:00', item: 'Compliance deep-dive: FTC, FDA, EMA rule packs in action' },
  { time: '40:00', item: 'Pricing + pilot program overview' },
  { time: '45:00', item: 'Q&A' },
]

export default function WebinarPage() {
  const [form, setForm] = useState({ name: '', email: '', orgName: '', segment: '' })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/webinar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        {/* Header */}
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-700/40 bg-blue-950/30 text-blue-300 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Live webinar · Free · Recording available
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Evidence-Backed Health Content at Scale
            </h1>
            <p className="text-gray-400 leading-relaxed mb-6">
              Join the ClaimCheck Studio launch webinar — a 60-minute live session for medical writers,
              health content teams, and compliance-conscious communicators.
            </p>
            <p className="text-gray-400 leading-relaxed mb-8">
              We'll demo how ClaimCheck turns a raw manuscript into a compliance-graded, citation-bundled,
              channel-ready package in a single session — and show why the teams that couldn't use AI tools
              before are now our most enthusiastic users.
            </p>

            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-blue-400">📅</span>
                <span className="text-gray-300">Date: <strong>TBD — register to be notified</strong></span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-blue-400">⏱</span>
                <span className="text-gray-300">Duration: 60 minutes + Q&A</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-blue-400">🎯</span>
                <span className="text-gray-300">Capacity: 100 registrants max</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-blue-400">🎬</span>
                <span className="text-gray-300">Recording: sent to all registrants</span>
              </div>
            </div>

            {/* Agenda */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Session agenda</h3>
              <div className="space-y-3">
                {AGENDA.map(({ time, item }) => (
                  <div key={time} className="flex gap-3">
                    <span className="text-xs text-gray-600 font-mono w-12 shrink-0 pt-0.5">{time}</span>
                    <span className="text-xs text-gray-400">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Registration form */}
          <div>
            <div className="rounded-2xl border border-gray-700 bg-gray-900 p-6 sticky top-20">
              {done ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🎉</div>
                  <h3 className="text-lg font-bold text-white mb-2">You're registered!</h3>
                  <p className="text-gray-400 text-sm">
                    We'll email you the webinar link and a calendar invite as soon as the date is confirmed.
                    You'll also receive a recording link after the session.
                  </p>
                  <div className="mt-4 text-xs text-gray-500">
                    Questions? <a href="mailto:hello@citebundle.com" className="text-blue-400">hello@citebundle.com</a>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-bold text-white mb-1">Register free</h3>
                  <p className="text-sm text-gray-400 mb-5">
                    Secure your spot — recording sent to all registrants even if you can't make it live.
                  </p>
                  <form onSubmit={submit} className="space-y-4">
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
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Organization</label>
                      <input value={form.orgName} onChange={e => setForm(p => ({ ...p, orgName: e.target.value }))}
                        placeholder="Hospital, agency, publisher..."
                        className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-600" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">I work in…</label>
                      <select value={form.segment} onChange={e => setForm(p => ({ ...p, segment: e.target.value }))}
                        className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-600">
                        <option value="">Select…</option>
                        <option value="pharma">Pharma / Biotech</option>
                        <option value="health_media">Health journalism / media</option>
                        <option value="agency">Health content agency</option>
                        <option value="researcher">Academic / research</option>
                        <option value="hospital">Hospital / health system</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    {error && <p className="text-xs text-red-400">{error === 'Already registered' ? '✓ You\'re already registered!' : error}</p>}
                    <button type="submit" disabled={loading}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors">
                      {loading ? 'Registering…' : 'Reserve my seat →'}
                    </button>
                    <p className="text-xs text-gray-600 text-center">
                      Free. No spam. Unsubscribe anytime.
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Who should attend */}
        <div className="mt-16">
          <h2 className="text-xl font-bold text-white mb-6 text-center">Who should attend?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { role: 'Medical Writers', desc: 'Who need to verify citations fast without compromising accuracy' },
              { role: 'Compliance Teams', desc: 'Who pre-clear content for FDA/FTC/EMA before publication' },
              { role: 'Health Agencies', desc: 'Who deliver citation-graded content to pharma clients' },
              { role: 'Health Journalists', desc: 'Who publish fast under accuracy expectations' },
            ].map(({ role, desc }) => (
              <div key={role} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <div className="text-sm font-semibold text-white mb-1">{role}</div>
                <div className="text-xs text-gray-500">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
