'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { useState } from 'react'

const INTERESTS = [
  { id: 'dinosaurs',   emoji: '🦖', label: 'Dinosaurs' },
  { id: 'unicorns',    emoji: '🦄', label: 'Unicorns' },
  { id: 'space',       emoji: '🚀', label: 'Space' },
  { id: 'robots',      emoji: '🤖', label: 'Robots' },
  { id: 'dragons',     emoji: '🐉', label: 'Dragons' },
  { id: 'mermaids',    emoji: '🧜', label: 'Mermaids' },
  { id: 'puppies',     emoji: '🐶', label: 'Puppies' },
  { id: 'kittens',     emoji: '🐱', label: 'Kittens' },
  { id: 'princesses',  emoji: '👸', label: 'Princesses' },
  { id: 'superheroes', emoji: '🦸', label: 'Heroes' },
  { id: 'butterflies', emoji: '🦋', label: 'Butterflies' },
  { id: 'ocean',       emoji: '🌊', label: 'Ocean' },
  { id: 'fairies',     emoji: '🧚', label: 'Fairies' },
  { id: 'wizards',     emoji: '🧙', label: 'Wizards' },
  { id: 'trains',      emoji: '🚂', label: 'Trains' },
  { id: 'cars',        emoji: '🚗', label: 'Cars' },
]

const AGES = [
  { id: '2-4',  label: '2–4', desc: 'Very simple' },
  { id: '4-6',  label: '4–6', desc: 'Simple' },
  { id: '6-8',  label: '6–8', desc: 'Moderate' },
  { id: '8-11', label: '8–11', desc: 'Detailed' },
]

export default function InterestsPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])
  const [age, setAge]           = useState('4-6')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      setSelected(s => s.filter(x => x !== id))
    } else if (selected.length < 3) {
      setSelected(s => [...s, id])
    }
  }

  const handleGenerate = async () => {
    if (selected.length < 2) return
    setLoading(true)
    setError('')

    // Track event
    await fetch('/api/v1/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'configure_complete', props: { concept: 'interest-packs', interests: selected, age } }),
    })

    try {
      const resp = await fetch('/api/v1/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept: 'interest-packs',
          config: { interests: selected, ageRange: age },
        }),
      })
      const data = await resp.json() as { sessionId?: string; error?: string }
      if (!resp.ok || !data.sessionId) throw new Error(data.error || 'Failed to create session')
      router.push(`/create/preview/${data.sessionId}`)
    } catch (e) {
      setError(String(e))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Back */}
        <Link href="/create" className="flex items-center gap-2 text-gray-400 hover:text-gray-600 text-sm mb-8">
          ← Back
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            What does your child love? 🎨
          </h1>
          <p className="text-gray-500">Pick 2 or 3 things — we&apos;ll make their book</p>
        </div>

        {/* Interest grid */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {INTERESTS.map(interest => {
            const isSelected = selected.includes(interest.id)
            const isDisabled = !isSelected && selected.length >= 3
            return (
              <button
                key={interest.id}
                onClick={() => toggle(interest.id)}
                disabled={isDisabled}
                className={`relative flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all
                  ${isSelected
                    ? 'border-violet-500 bg-violet-50 shadow-md scale-105'
                    : isDisabled
                    ? 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
                    : 'border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50 cursor-pointer'
                  }`}>
                {isSelected && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow">
                    {selected.indexOf(interest.id) + 1}
                  </span>
                )}
                <span className="text-3xl">{interest.emoji}</span>
                <span className="text-xs font-medium text-gray-700 text-center leading-tight">{interest.label}</span>
              </button>
            )
          })}
        </div>

        {/* Selection status */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            {[0, 1, 2].map(i => (
              <div key={i} className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center text-xl transition-all ${
                selected[i] ? 'border-violet-400 bg-violet-50' : 'border-dashed border-gray-200 bg-gray-50'
              }`}>
                {selected[i] ? INTERESTS.find(x => x.id === selected[i])?.emoji : '?'}
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500">
            {selected.length === 0 ? 'Pick at least 2 things'
            : selected.length === 1 ? 'Pick 1 more to continue'
            : `${selected.length} selected — ${3 - selected.length > 0 ? `you can add ${3 - selected.length} more` : 'all set!'}`}
          </p>
        </div>

        {/* Age */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-3">How old is your child?</p>
          <div className="grid grid-cols-4 gap-2">
            {AGES.map(a => (
              <button key={a.id} onClick={() => setAge(a.id)}
                className={`text-center py-2 px-2 rounded-xl border-2 transition-all ${
                  age === a.id ? 'border-violet-500 bg-violet-50' : 'border-gray-100 hover:border-violet-200'
                }`}>
                <p className="font-bold text-sm text-gray-900">{a.label}</p>
                <p className="text-xs text-gray-400">{a.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleGenerate}
          disabled={selected.length < 2 || loading}
          className={`w-full py-5 rounded-2xl font-extrabold text-xl transition-all ${
            selected.length >= 2 && !loading
              ? 'bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-lg hover:shadow-xl hover:from-violet-600 hover:to-violet-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Setting up your book…
            </span>
          ) : (
            selected.length >= 2 ? '✨ Make My Book!' : 'Pick 2+ interests to continue'
          )}
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          Free trial · 4 coloring pages · No account required
        </p>
      </div>
    </div>
  )
}
