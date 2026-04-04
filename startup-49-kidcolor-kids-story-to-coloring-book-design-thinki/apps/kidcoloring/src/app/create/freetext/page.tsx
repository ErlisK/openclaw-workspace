'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * /create/freetext — Variant B of prompt_ui_v1
 *
 * Free-text input: "Tell us what your kid loves"
 * Parses the text into interests and redirects to session creation.
 */
export default function FreetextPage() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [age,  setAge]  = useState('6-8')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  /** Extract up to 4 interest keywords from free-form text */
  function parseInterests(input: string): string[] {
    const cleaned = input
      .toLowerCase()
      .replace(/[^\w\s,&+]/g, ' ')
      .replace(/\b(and|or|also|plus|with|the|a|an|my|kid|child|loves?|likes?|enjoys?|into)\b/g, ' ')
      .trim()
    const parts = cleaned
      .split(/[\s,&+]+/)
      .map(s => s.trim())
      .filter(s => s.length > 2)
    // Deduplicate and take first 4
    return [...new Set(parts)].slice(0, 4)
  }

  const handleSubmit = async () => {
    const interests = parseInterests(text)
    if (interests.length === 0) {
      setError('Please describe something your kid loves — e.g. "dinosaurs and outer space"')
      return
    }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/v1/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept: 'interest-packs',
          config: {
            interests,
            ageRange: age,
            heroName: name || '',
            sourceVariant: 'freetext',
            rawInput: text.slice(0, 200),
          },
        }),
      })
      const data = await res.json() as { sessionId?: string; sessionToken?: string; error?: string }
      if (!data.sessionId) throw new Error(data.error || 'Session creation failed')

      await fetch('/api/v1/event', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'configure_complete',
          sessionId: data.sessionId,
          props: {
            concept: 'interest-packs', interests, age_range: age,
            input_mode: 'freetext', char_count: text.length,
            experiment_variant: 'B',
          },
        }),
      }).catch(() => {})

      // Log experiment assignments
      if (data.sessionToken) {
        fetch('/api/v1/assign', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: data.sessionId, sessionToken: data.sessionToken }),
        }).catch(() => {})
      }

      router.push(`/create/preview/${data.sessionId}`)
    } catch (e) {
      setError(String(e))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white flex flex-col items-center justify-center px-4 py-12">
      <button onClick={() => router.back()}
        className="self-start mb-6 text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1">
        ← Back
      </button>

      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">✏️</div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            What does your kid love?
          </h1>
          <p className="text-gray-500">
            Describe anything — interests, characters, hobbies, favourite things.
            We&apos;ll build their coloring book from it.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
          {/* Main text input */}
          <div>
            <label htmlFor="kc-freetext" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Describe what they love ✨
            </label>
            <textarea
              ref={inputRef}
              id="kc-freetext"
              rows={3}
              value={text}
              onChange={e => { setText(e.target.value); setError('') }}
              placeholder='e.g. "Loves dinosaurs, outer space, and anything pink"'
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-base focus:outline-none focus:border-violet-400 resize-none"
            />
            {text && (
              <p className="text-xs text-violet-500 mt-1 font-medium">
                Topics we found: {parseInterests(text).join(', ') || '—'}
              </p>
            )}
          </div>

          {/* Optional: name + age */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="kc-name" className="block text-xs font-semibold text-gray-600 mb-1">
                Kid&apos;s name (optional)
              </label>
              <input
                id="kc-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Alex"
                maxLength={20}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400"
              />
            </div>
            <div>
              <label htmlFor="kc-age" className="block text-xs font-semibold text-gray-600 mb-1">
                Age range
              </label>
              <select
                id="kc-age"
                value={age}
                onChange={e => setAge(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400 bg-white"
              >
                <option value="2-4">2–4 years</option>
                <option value="4-6">4–6 years</option>
                <option value="6-8">6–8 years</option>
                <option value="8-11">8–11 years</option>
              </select>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !text.trim()}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:text-gray-400
                       text-white font-extrabold py-4 rounded-2xl text-lg transition-all
                       disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading
              ? <><span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"/> Creating your book…</>
              : 'Make my coloring book →'
            }
          </button>

          <p className="text-center text-xs text-gray-400">
            Free · 4 pages · No account needed · ~60s to generate
          </p>
        </div>
      </div>
    </div>
  )
}
