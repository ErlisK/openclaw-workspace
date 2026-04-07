'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ConsentForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/dashboard'

  const [tosChecked, setTosChecked] = useState(false)
  const [piiChecked, setPiiChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAccept() {
    if (!tosChecked || !piiChecked) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tos_version: '1.0' }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to save consent')
      }
      router.replace(redirect)
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-3xl">🎲</span>
          <h1 className="text-2xl font-bold mt-2">PlaytestFlow</h1>
          <p className="text-gray-400 text-sm mt-1">Before you continue, please review and accept our terms.</p>
        </div>

        <div className="bg-white/4 border border-white/10 rounded-2xl p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold mb-1">Terms of Service & Privacy</h2>
            <p className="text-gray-400 text-sm">PlaytestFlow v1.0 · Last updated April 2025</p>
          </div>

          {/* TOS summary */}
          <div className="bg-white/3 border border-white/5 rounded-xl p-5 space-y-3 text-sm text-gray-300 max-h-52 overflow-y-auto">
            <p><strong className="text-white">1. Service</strong> — PlaytestFlow is a platform for recruiting and running remote game playtests. You may use it only for lawful game design and testing purposes.</p>
            <p><strong className="text-white">2. Data you provide</strong> — You may upload rules documents, create sessions, and collect tester feedback. You are responsible for the content you upload and for obtaining appropriate consent from your testers.</p>
            <p><strong className="text-white">3. Tester privacy</strong> — Tester email addresses and names are stored to enable session coordination. Email addresses are also stored in a one-way hashed form (SHA-256) for analytics to minimize PII exposure.</p>
            <p><strong className="text-white">4. Data retention</strong> — Session data is retained for 12 months after a session ends. You may request deletion at any time by contacting support@playtestflow.com.</p>
            <p><strong className="text-white">5. Cookies</strong> — We use session cookies for authentication only. No third-party tracking cookies.</p>
            <p><strong className="text-white">6. Changes</strong> — We may update these terms. You will be notified by email and required to re-accept material changes.</p>
          </div>

          {/* Checkboxes */}
          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-colors ${
                tosChecked ? 'bg-orange-500 border-orange-500' : 'border-white/20 bg-white/5'
              }`}>
                {tosChecked && <span className="text-white text-xs">✓</span>}
              </div>
              <input
                type="checkbox"
                className="sr-only"
                checked={tosChecked}
                onChange={e => setTosChecked(e.target.checked)}
              />
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors" onClick={() => setTosChecked(!tosChecked)}>
                I have read and agree to the <strong className="text-white">Terms of Service</strong> and understand that my session data will be stored and processed as described above.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-colors ${
                piiChecked ? 'bg-orange-500 border-orange-500' : 'border-white/20 bg-white/5'
              }`}>
                {piiChecked && <span className="text-white text-xs">✓</span>}
              </div>
              <input
                type="checkbox"
                className="sr-only"
                checked={piiChecked}
                onChange={e => setPiiChecked(e.target.checked)}
              />
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors" onClick={() => setPiiChecked(!piiChecked)}>
                I understand that tester email addresses are stored in hashed form for privacy, and I will obtain appropriate consent from any testers I recruit through this platform.
              </span>
            </label>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            onClick={handleAccept}
            disabled={!tosChecked || !piiChecked || loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/30 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Saving…' : 'Accept & Continue to Dashboard'}
          </button>

          <p className="text-xs text-gray-600 text-center">
            You can review your acceptance at any time in account settings.
            Questions? <a href="mailto:support@playtestflow.com" className="text-orange-400 hover:underline">support@playtestflow.com</a>
          </p>
        </div>
      </div>
    </div>
  )
}
