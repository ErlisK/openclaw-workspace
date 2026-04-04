'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTextToSpeech } from '@/hooks/useTTS'
import TTSButton from '@/components/TTSButton'

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
  { id: 'outer space',      emoji: '🌌', label: 'Space' },
  { id: 'magical castle',   emoji: '🏰', label: 'Castle' },
  { id: 'underwater ocean', emoji: '🌊', label: 'Ocean' },
  { id: 'enchanted forest', emoji: '🌲', label: 'Forest' },
  { id: 'volcano island',   emoji: '🌋', label: 'Island' },
  { id: 'snowy mountains',  emoji: '🏔️', label: 'Mountains' },
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

const STEP_PROMPTS: Record<number, string> = {
  0: 'Who is in your story? Pick 1 or 2 characters.',
  1: 'Where do they go? Pick the world for your story.',
  2: 'What do they do? Pick the adventure.',
  3: "What is your hero's name? Say it or type it below.",
}

export default function StoryPage() {
  const router = useRouter()
  const [step, setStep]         = useState(0)
  const [chars, setChars]       = useState<string[]>([])
  const [setting, setSetting]   = useState('')
  const [action, setAction]     = useState('')
  const [heroName, setHeroName] = useState('')
  const [listening, setListening] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const nameRef = useRef<HTMLInputElement>(null)
  const tts = useTextToSpeech()

  // Announce step changes
  useEffect(() => {
    tts.speak(STEP_PROMPTS[step] ?? '')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const toggleChar = (id: string) => {
    setChars(s => {
      if (s.includes(id)) { tts.speak(`${CHARACTERS.find(c => c.id === id)?.label} removed.`); return s.filter(x => x !== id) }
      if (s.length >= 2) return s
      const updated = [...s, id]
      tts.speak(`${CHARACTERS.find(c => c.id === id)?.label} selected.`)
      return updated
    })
  }

  const canNext: Record<number, boolean> = {
    0: chars.length >= 1,
    1: !!setting,
    2: !!action,
    3: heroName.trim().length >= 1,
  }

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
    recognition.onresult = // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ev: any) => {
      const name = ev.results[0][0].transcript.trim()
      const cleaned = name.charAt(0).toUpperCase() + name.slice(1).replace(/[^a-zA-Z\s'-]/g, '')
      setHeroName(cleaned)
      setListening(false)
      tts.speak(`I heard: ${cleaned}. Is that right?`)
    }
    recognition.onerror = () => setListening(false)
    recognition.onend   = () => setListening(false)
    recognition.start()
  }

  const handleGenerate = async () => {
    if (!canNext[3]) return
    setLoading(true)
    setError('')
    tts.speak(`Making the book for ${heroName}. Get ready!`)

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

  // ── Tile grid helpers ──────────────────────────────────────────────────────
  const CharTile = ({ c }: { c: typeof CHARACTERS[0] }) => {
    const isSelected = chars.includes(c.id)
    const isDisabled = !isSelected && chars.length >= 2
    return (
      <button
        onClick={() => toggleChar(c.id)}
        disabled={isDisabled}
        aria-pressed={isSelected}
        aria-label={`${c.label}${isSelected ? ', selected' : ''}${isDisabled ? ', not available' : ''}`}
        className={`kc-tile flex flex-col items-center justify-center gap-1 rounded-2xl border-2 transition-all
          ${isSelected
            ? 'border-blue-400 bg-blue-50 shadow-md scale-105'
            : isDisabled
            ? 'border-gray-100 opacity-50 cursor-not-allowed'
            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
          }`}
      >
        <span className="text-3xl leading-none" aria-hidden="true">{c.emoji}</span>
        <span className="text-xs font-semibold text-gray-700">{c.label}</span>
      </button>
    )
  }

  const SelectionTile = <T extends { id: string; emoji: string; label: string }>({
    item, isSelected, onSelect,
  }: { item: T; isSelected: boolean; onSelect: () => void }) => (
    <button
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-label={`${item.label}${isSelected ? ', selected' : ''}`}
      className={`kc-tile flex flex-col items-center justify-center gap-2 rounded-2xl border-2 transition-all
        ${isSelected
          ? 'border-blue-400 bg-blue-50 shadow-md'
          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
        }`}
    >
      <span className="text-4xl leading-none" aria-hidden="true">{item.emoji}</span>
      <span className="text-sm font-semibold text-gray-800">{item.label}</span>
    </button>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-10 px-4">
      <div className="max-w-xl mx-auto">
        <Link
          href="/create"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800
                     text-sm font-medium mb-8 min-h-[44px] px-1"
          aria-label="Back to create options"
        >
          ← Back
        </Link>

        <main id="main-content">
          {/* Progress bar */}
          <div
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-valuenow={step + 1}
            aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}
            className="flex gap-2 mb-3"
          >
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`flex-1 rounded-full h-2.5 transition-all ${i <= step ? 'bg-blue-500' : 'bg-gray-200'}`}
                aria-hidden="true"
              />
            ))}
          </div>
          <p className="text-xs text-center text-gray-600 mb-8 font-medium">
            Step {step + 1} of {STEPS.length}: <strong>{STEPS[step]}</strong>
          </p>

          {/* ── Step 0: Characters ── */}
          {step === 0 && (
            <section aria-labelledby="char-heading">
              <h2 id="char-heading" className="text-2xl font-bold text-center text-gray-900 mb-2">
                Who&apos;s in your story?
              </h2>
              <p className="text-gray-600 text-center text-sm mb-6">Pick 1 or 2 characters</p>
              <div
                role="group"
                aria-label="Choose characters"
                className="grid grid-cols-4 gap-3 mb-8"
              >
                {CHARACTERS.map(c => <CharTile key={c.id} c={c} />)}
              </div>
            </section>
          )}

          {/* ── Step 1: Setting ── */}
          {step === 1 && (
            <section aria-labelledby="setting-heading">
              <h2 id="setting-heading" className="text-2xl font-bold text-center text-gray-900 mb-2">
                Where do they go?
              </h2>
              <p className="text-gray-600 text-center text-sm mb-6">Pick the world for your story</p>
              <div
                role="group"
                aria-label="Choose a setting"
                className="grid grid-cols-3 gap-4 mb-8"
              >
                {SETTINGS.map(s => (
                  <SelectionTile
                    key={s.id}
                    item={s}
                    isSelected={setting === s.id}
                    onSelect={() => {
                      setSetting(s.id)
                      tts.speak(`${s.label} selected.`)
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Step 2: Action ── */}
          {step === 2 && (
            <section aria-labelledby="action-heading">
              <h2 id="action-heading" className="text-2xl font-bold text-center text-gray-900 mb-2">
                What do they do?
              </h2>
              <p className="text-gray-600 text-center text-sm mb-6">What&apos;s the adventure?</p>
              <div
                role="group"
                aria-label="Choose an action"
                className="grid grid-cols-3 gap-4 mb-8"
              >
                {ACTIONS.map(a => (
                  <SelectionTile
                    key={a.id}
                    item={a}
                    isSelected={action === a.id}
                    onSelect={() => {
                      setAction(a.id)
                      tts.speak(`${a.label} selected.`)
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Step 3: Hero name ── */}
          {step === 3 && (
            <section aria-labelledby="name-heading">
              <h2 id="name-heading" className="text-2xl font-bold text-center text-gray-900 mb-2">
                What&apos;s your hero&apos;s name?
              </h2>
              <p className="text-gray-600 text-center text-sm mb-6">Say it or type it below</p>

              <div className="flex gap-3 mb-4">
                <label htmlFor="hero-name" className="sr-only">Hero name</label>
                <input
                  id="hero-name"
                  ref={nameRef}
                  type="text"
                  value={heroName}
                  onChange={e => setHeroName(e.target.value)}
                  placeholder="e.g. Sparkle, Max, Luna…"
                  maxLength={20}
                  autoCapitalize="words"
                  autoComplete="off"
                  className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-medium
                             text-gray-800 min-h-[52px]
                             focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  onClick={startListening}
                  aria-label={listening ? 'Listening for name…' : 'Say the name (voice input)'}
                  aria-pressed={listening}
                  className={`px-4 rounded-xl border-2 transition-all min-h-[52px] min-w-[52px]
                    ${listening
                      ? 'border-red-400 bg-red-50 text-red-600 animate-pulse'
                      : 'border-gray-200 hover:border-blue-300 text-gray-600'
                    }`}
                >
                  <span aria-hidden="true">🎤</span>
                </button>
              </div>

              {listening && (
                <p
                  role="status"
                  aria-live="polite"
                  className="text-center text-sm text-blue-600 animate-pulse mb-4 font-medium"
                >
                  Listening… say the name!
                </p>
              )}

              {heroName && (
                <div
                  aria-live="polite"
                  className="bg-blue-50 rounded-xl p-4 mb-4 text-center border border-blue-100"
                >
                  <p className="text-sm text-blue-600 mb-1 font-medium">Your hero:</p>
                  <p className="text-2xl font-extrabold text-blue-800">
                    {heroName}{chars[0] ? ` the ${chars[0]}` : ''}
                  </p>
                  {setting && <p className="text-sm text-blue-600 mt-1">in {setting}</p>}
                </div>
              )}
            </section>
          )}

          {/* Error */}
          {error && (
            <div role="alert" className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl mb-4 border border-red-200">
              {error} — please try again.
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 py-4 border-2 border-gray-200 rounded-2xl font-bold text-gray-700
                           hover:border-gray-300 min-h-[56px] bg-white"
                aria-label={`Go back to step ${step}: ${STEPS[step - 1]}`}
              >
                ← Back
              </button>
            )}

            {step < 3 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext[step]}
                aria-disabled={!canNext[step]}
                aria-label={
                  canNext[step]
                    ? `Continue to ${STEPS[step + 1]}`
                    : `Make a selection to continue to ${STEPS[step + 1]}`
                }
                className={`flex-1 py-4 rounded-2xl font-bold text-lg transition-all min-h-[56px]
                  ${canNext[step]
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={!canNext[3] || loading}
                aria-disabled={!canNext[3] || loading}
                aria-label={loading ? 'Making your book, please wait' : `Make a coloring book for ${heroName || 'your hero'}`}
                className={`flex-1 py-4 rounded-2xl font-extrabold text-lg transition-all min-h-[56px]
                  ${canNext[3] && !loading
                    ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true"/>
                    Setting up…
                  </span>
                ) : '✨ Make My Book!'}
              </button>
            )}
          </div>
        </main>
      </div>

      <TTSButton tts={tts} />
    </div>
  )
}
