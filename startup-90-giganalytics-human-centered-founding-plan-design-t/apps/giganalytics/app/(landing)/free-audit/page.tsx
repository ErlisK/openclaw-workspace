'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function FreeAuditPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    streams: '',
    platforms: '',
    hourlyRate: '',
    message: '',
  })
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [file, setFile] = useState<File | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')
    try {
      const res = await fetch('/api/free-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, fileName: file?.name }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('success')
      } else {
        setStatus('error')
        setErrorMsg(data.message ?? 'Something went wrong. Please try again.')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Network error. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="font-bold text-gray-900 text-lg">GigAnalytics</Link>
        <div className="flex gap-4 text-sm text-gray-500">
          <Link href="/demo" className="hover:text-gray-700">Demo</Link>
          <Link href="/pricing" className="hover:text-gray-700">Pricing</Link>
          <Link href="/signup" className="bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700">Get started free</Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            🎯 Limited — accepting 10 audit requests at a time
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
            Get your free<br />
            <span className="text-blue-600">True Hourly Rate Audit</span>
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed">
            Tell us about your income streams. We&apos;ll personally analyze your data and show you 
            which gig actually pays best per hour — after fees, ad spend, and real time spent.
          </p>
        </div>

        {/* Value props */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { icon: '⏱️', label: 'Takes 5 min', sub: 'to fill out' },
            { icon: '📊', label: 'Personal analysis', sub: 'by our team' },
            { icon: '📬', label: 'Results in 24–48h', sub: 'via email' },
          ].map((item) => (
            <div key={item.label} className="text-center p-4 bg-gray-50 rounded-xl">
              <div className="text-2xl mb-1">{item.icon}</div>
              <div className="text-sm font-semibold text-gray-800">{item.label}</div>
              <div className="text-xs text-gray-500">{item.sub}</div>
            </div>
          ))}
        </div>

        {status === 'success' ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-6">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Audit request received!</h2>
            <p className="text-gray-500 mb-6 leading-relaxed">
              We&apos;ll analyze your income streams and send you a personalized True Hourly Rate 
              breakdown within 24–48 hours. Check your inbox at <strong>{form.email}</strong>.
            </p>
            <p className="text-sm text-gray-400 mb-8">
              While you wait — explore the demo to see exactly what your audit will look like.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/demo" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 text-sm">
                See a demo dashboard →
              </Link>
              <Link href="/signup" className="border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 text-sm">
                Sign up free (no card needed)
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Your name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Alex Johnson"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="alex@example.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                How many income streams do you have?
              </label>
              <select
                required
                value={form.streams}
                onChange={e => setForm({ ...form, streams: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
              >
                <option value="">Select...</option>
                <option value="2">2 streams</option>
                <option value="3">3 streams</option>
                <option value="4">4 streams</option>
                <option value="5+">5 or more</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Which platforms/tools do you use? <span className="text-gray-400">(check all that apply)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  'Upwork', 'Fiverr', 'Stripe', 'PayPal', 'Etsy', 'eBay',
                  'Shopify', 'Gumroad', 'DoorDash', 'Uber', 'TaskRabbit', 'Other',
                ].map(p => (
                  <label key={p} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      value={p}
                      onChange={e => {
                        const current = form.platforms ? form.platforms.split(',') : []
                        const updated = e.target.checked
                          ? [...current, p]
                          : current.filter(x => x !== p)
                        setForm({ ...form, platforms: updated.join(',') })
                      }}
                      className="rounded border-gray-300"
                    />
                    {p}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                What do you <em>think</em> your best-paying stream is right now?
              </label>
              <input
                type="text"
                value={form.hourlyRate}
                onChange={e => setForm({ ...form, hourlyRate: e.target.value })}
                placeholder='e.g. "Upwork clients at ~$75/hr" or "not sure"'
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
              />
              <p className="text-xs text-gray-400 mt-1">
                We&apos;ll tell you if you&apos;re right (most people are surprised 🙃)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Anything else? <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })}
                placeholder="Specific questions, unusual income sources, context that might help us..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Upload a payment CSV <span className="text-gray-400">(optional but recommended)</span>
              </label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-400 mt-1">
                Stripe export, PayPal CSV, or any payment history. All data is kept private and 
                deleted after analysis. <Link href="/privacy" className="underline hover:text-gray-600">Privacy policy →</Link>
              </p>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-4 rounded-xl text-base transition-colors"
            >
              {status === 'sending' ? 'Submitting...' : 'Request my free audit →'}
            </button>

            <p className="text-center text-xs text-gray-400">
              🔒 Your data is private, never sold, deleted after analysis. 
              No spam — just your audit results.
            </p>
          </form>
        )}

        {/* Social proof */}
        <div className="mt-16 border-t border-gray-100 pt-10">
          <p className="text-center text-sm font-semibold text-gray-700 mb-6">What people discover</p>
          <div className="space-y-4">
            {[
              {
                quote: "Turns out my Upwork clients paid $22/hr after I counted revision rounds. My Gumroad course pays $67/hr. I was working backwards.",
                name: "Freelance designer, 3 income streams",
              },
              {
                quote: "I thought DoorDash was my worst gig. It's actually my best per hour when I work 11am–2pm in my area. The heatmap showed me why.",
                name: "Gig worker, 4 platforms",
              },
              {
                quote: "My Etsy 'bestseller' nets $4.80 after materials and 2h of fulfillment time. I had no idea. Now I focus on digital downloads.",
                name: "Etsy seller, 2 income streams",
              },
            ].map((t) => (
              <div key={t.name} className="bg-gray-50 rounded-xl p-5">
                <p className="text-sm text-gray-700 italic mb-3">&ldquo;{t.quote}&rdquo;</p>
                <p className="text-xs text-gray-400">— {t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-6 px-6 text-center text-xs text-gray-400">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-4">
          <span>© {new Date().getFullYear()} GigAnalytics</span>
          <Link href="/pricing" className="hover:text-gray-600">Pricing</Link>
          <Link href="/demo" className="hover:text-gray-600">Demo</Link>
          <Link href="/privacy" className="hover:text-gray-600">Privacy</Link>
          <Link href="/terms" className="hover:text-gray-600">Terms</Link>
          <Link href="/contact" className="hover:text-gray-600">Contact</Link>
        </div>
      </footer>
    </div>
  )
}
