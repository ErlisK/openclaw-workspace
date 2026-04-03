'use client'

import Link from 'next/link'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const CHARACTERS = [
  { id: 'dinosaur',  emoji: '🦖', label: 'Dinosaur' },
  { id: 'unicorn',   emoji: '🦄', label: 'Unicorn' },
  { id: 'robot',     emoji: '🤖', label: 'Robot' },
  { id: 'princess',  emoji: '👸', label: 'Princess' },
  { id: 'dragon',    emoji: '🐉', label: 'Dragon' },
  { id: 'mermaid',   emoji: '🧜', label: 'Mermaid' },
  { id: 'lion',      emoji: '🦁', label: 'Lion' },
  { id: 'wizard',    emoji: '🧙', label: 'Wizard' },
]
const SETTINGS = [
  { id: 'outer space',          emoji: '🌌', label: 'Space' },
  { id: 'magical castle',       emoji: '🏰', label: 'Castle' },
  { id: 'underwater ocean',     emoji: '🌊', label: 'Ocean' },
  { id: 'enchanted forest',     emoji: '🌲', label: 'Forest' },
  { id: 'volcano island',       emoji: '🌋', label: 'Island' },
  { id: 'snowy mountains',      emoji: '🏔️', label: 'Mountains' },
]
const ACTIONS = [
  { id: 'explore and discover', emoji: '🗺️', label: 'Explore' },
  { id: 'fly and soar',         emoji: '🪁', label: 'Fly' },
  { id: 'sing and dance',       emoji: '🎵', label: 'Sing' },
  { id: 'build and create',     emoji: '🔨', label: 'Build' },
  { id: 'rescue and help',      emoji: '🦸', label: 'Rescue' },
  { id: 'quest for treasure',   emoji: '💎', label: 'Quest' },
]

const STEPS = ['Characters', 'Setting', 'Action', 'Name']

export default function StoryPage() {
  const router = useRouter()
  const [step, setStep]       = useState(0)
  const [chars, setChars]     = useState<string[]>([])
  const [setting, setSetting] = useState('')
  const [action, setAction]   = useState('')
  const [heroName, setHeroName] = useState('')
  const [listening, setListening] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      nameRef.current?.focus()
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    setListening(true)
    recognition.start()
    recognition.onresult = (e: { results: { [x: number]: { [x: number]: { transcript: string } } } }) => {
      const transcript = e.results[0][0].transcript
      setHeroName(transcript.split(' ')[0] || transcript)
      setListening(false)
    }
    recognition.onerror = () => setListening(false)
    recognition.onend   = () => setListening(false)
  }

  const toggleChar = (id: string) => {
    if (chars.includes(id))     setChars(c => c.filter(x => x !== id))
    else if (chars.length < 2)  setChars(c => [...c, id])
  }

  const canNext = [
    chars.length >= 1,
    !!setting,
    !!action,
    heroName.trim().length >= 1,
  ]

  const handleGenerate = async () => {
    if (!canNext[3]) return
    setLoading(true)
    setError('')

    await fetch('/api/v1/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'configure_complete', props: { concept: 'story-to-book', chars, setting, action, heroName } }),
    })

    try {
      const resp = await fetch('/api/v1/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept: 'story-to-book',
          config: { characters: chars, setting, action, heroName: heroName.trim(), ageRange: '6-8' },
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-10 px-4">
      <div className="max-w-xl mx-auto">
        <Link href="/create" className="flex items-center gap-2 text-gray-400 hover:text-gray-600 text-sm mb-8">← Back</Link>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className={`flex-1 rounded-full h-2 transition-all ${i <= step ? 'bg-blue-500' : 'bg-gray-200'}`}/>
          ))}
        </div>
        <p className="text-xs text-center text-gray-400 -mt-6 mb-8">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>

        {/* Step 0: Characters */}
        {step === 0 && (
          <div>
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Who&apos;s in your story?</h2>
            <p className="text-gray-500 text-center text-sm mb-6">Pick 1 or 2 characters</p>
            <div className="grid grid-cols-4 gap-3 mb-8">
              {CHARACTERS.map(c => (
                <button key={c.id} onClick={() => toggleChar(c.id)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all ${
                    chars.includes(c.id)
                      ? 'border-blue-400 bg-blue-50 shadow-md scale-105'
                      : chars.length >= 2
                      ? 'border-gray-100 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}>
                  <span className="text-3xl">{c.emoji}</span>
                  <span className="text-xs text-gray-700">{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Setting */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Where do they go?</h2>
            <p className="text-gray-500 text-center text-sm mb-6">Pick the world for your story</p>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {SETTINGS.map(s => (
                <button key={s.id} onClick={() => setSetting(s.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    setting === s.id ? 'border-blue-400 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}>
                  <span className="text-4xl">{s.emoji}</span>
                  <span className="text-sm font-medium text-gray-800">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Action */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">What do they do?</h2>
            <p className="text-gray-500 text-center text-sm mb-6">What&apos;s the adventure?</p>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {ACTIONS.map(a => (
                <button key={a.id} onClick={() => setAction(a.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    action === a.id ? 'border-blue-400 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}>
                  <span className="text-4xl">{a.emoji}</span>
                  <span className="text-sm font-medium text-gray-800">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Name */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">What&apos;s your hero&apos;s name?</h2>
            <p className="text-gray-500 text-center text-sm mb-6">Say it or type it below</p>

            <div className="flex gap-3 mb-4">
              <input
                ref={nameRef}
                type="text"
                value={heroName}
                onChange={e => setHeroName(e.target.value)}
                placeholder="e.g. Sparkle, Max, Luna…"
                maxLength={20}
                className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-medium text-gray-800 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <button
                onClick={startListening}
                className={`px-4 py-3 rounded-xl border-2 transition-all ${
                  listening ? 'border-red-400 bg-red-50 text-red-600 animate-pulse' : 'border-gray-200 hover:border-blue-300 text-gray-500'
                }`}
                title="Tap and say the name">
                🎤
              </button>
            </div>

            {listening && <p className="text-center text-sm text-blue-600 animate-pulse mb-4">Listening… say the name!</p>}

            {heroName && (
              <div className="bg-blue-50 rounded-xl p-4 mb-4 text-center border border-blue-100">
                <p className="text-sm text-blue-600 mb-1">Your hero:</p>
                <p className="text-2xl font-extrabold text-blue-800">{heroName} {chars[0] ? `the ${chars[0]}` : ''}</p>
                {setting && <p className="text-sm text-blue-500 mt-1">in {setting}</p>}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}

        <div className="flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex-1 py-4 border-2 border-gray-200 rounded-2xl font-bold text-gray-600 hover:border-gray-300">
              ← Back
            </button>
          )}

          {step < 3 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canNext[step]}
              className={`flex-1 py-4 rounded-2xl font-bold text-lg transition-all ${
                canNext[step] ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}>
              Next →
            </button>
          ) : (
            <button onClick={handleGenerate} disabled={!canNext[3] || loading}
              className={`flex-1 py-4 rounded-2xl font-extrabold text-lg transition-all ${
                canNext[3] && !loading ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-lg hover:shadow-xl' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}>
              {loading ? 'Setting up…' : '✨ Make My Book!'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
