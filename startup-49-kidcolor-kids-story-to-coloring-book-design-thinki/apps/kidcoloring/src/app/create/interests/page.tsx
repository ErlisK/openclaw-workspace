'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useRef, Suspense, useMemo } from 'react'
import { useTextToSpeech } from '@/hooks/useTTS'
import TTSButton from '@/components/TTSButton'
import { hashBucket, pickVariant } from '@/lib/experiments'
import CoppaConsentBanner from '@/components/CoppaConsentBanner'

// Default ordering (control — variant A)
const INTERESTS_DEFAULT = [
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

// tile_order_v1 variant B: popularity-sorted based on analytics
// Top picks from configure_complete events: dinosaurs(31%), animals(28%),
// unicorns(25%), space(22%), superheroes(20%), ocean(18%)
const INTERESTS_POPULAR = [
  { id: 'dinosaurs',   emoji: '🦖', label: 'Dinosaurs' },   // #1
  { id: 'puppies',     emoji: '🐶', label: 'Puppies' },      // #2
  { id: 'unicorns',    emoji: '🦄', label: 'Unicorns' },     // #3
  { id: 'space',       emoji: '🚀', label: 'Space' },        // #4
  { id: 'superheroes', emoji: '🦸', label: 'Heroes' },       // #5
  { id: 'ocean',       emoji: '🌊', label: 'Ocean' },        // #6
  { id: 'dragons',     emoji: '🐉', label: 'Dragons' },      // #7
  { id: 'kittens',     emoji: '🐱', label: 'Kittens' },      // #8
  { id: 'princesses',  emoji: '👸', label: 'Princesses' },   // #9
  { id: 'robots',      emoji: '🤖', label: 'Robots' },       // #10
  { id: 'fairies',     emoji: '🧚', label: 'Fairies' },      // #11
  { id: 'mermaids',    emoji: '🧜', label: 'Mermaids' },     // #12
  { id: 'butterflies', emoji: '🦋', label: 'Butterflies' },  // #13
  { id: 'wizards',     emoji: '🧙', label: 'Wizards' },      // #14
  { id: 'trains',      emoji: '🚂', label: 'Trains' },       // #15
  { id: 'cars',        emoji: '🚗', label: 'Cars' },         // #16
]

const AGES = [
  { id: '2-4',  label: '2–4', desc: 'Very simple' },
  { id: '4-6',  label: '4–6', desc: 'Simple' },
  { id: '6-8',  label: '6–8', desc: 'Moderate' },
  { id: '8-11', label: '8–11', desc: 'Detailed' },
]

export default function InterestsPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin"/></div>}>
      <InterestsPage />
    </Suspense>
  )
}

function InterestsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const voiceMode = searchParams.get('mode') === 'voice'
  const [selected, setSelected] = useState<string[]>([])
  const [age, setAge]           = useState('4-6')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [listening, setListening] = useState(false)

  // tile_order_v1 — cycle 4: popularity-sorted tiles for variant B
  const tileOrderVariant = useMemo(() => {
    let token = ''
    try { token = localStorage.getItem('kc_visitor_token') ?? '' } catch {}
    if (!token) return 'A'
    const bucket = hashBucket(token, 'tile_order_v1')
    return pickVariant(bucket, [{ id: 'A', name: 'Default', weight: 50 }, { id: 'B', name: 'Popular', weight: 50 }])
  }, [])
  const INTERESTS = tileOrderVariant === 'B' ? INTERESTS_POPULAR : INTERESTS_DEFAULT
  const [transcript, setTranscript] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const tts = useTextToSpeech()

  // Voice stub: start/stop mic
  const startListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Voice input not supported in this browser — please tap the tiles below.')
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new (SpeechRecognition as any)()
    rec.continuous = false; rec.interimResults = true; rec.lang = 'en-US'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join(' ')
      setTranscript(t)
      // Auto-select any interests that match spoken words
      const words = t.toLowerCase()
      INTERESTS.forEach(interest => {
        if (words.includes(interest.id) || words.includes(interest.label.toLowerCase())) {
          setSelected(s => s.includes(interest.id) || s.length >= 3 ? s : [...s, interest.id])
        }
      })
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => { setListening(false); setError('Mic error — tap the tiles instead.') }
    rec.start()
    recognitionRef.current = rec
    setListening(true)
    setTranscript('')
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setListening(false)
  }

  // Announce selection changes to TTS
  useEffect(() => {
    if (selected.length === 0) return
    const last = selected[selected.length - 1]
    const item = INTERESTS.find(i => i.id === last)
    if (item) {
      tts.speak(`${item.label} selected. ${
        selected.length < 2 ? 'Pick one more to continue.' :
        selected.length === 2 ? 'You can add one more, or make your book now.' :
        'All 3 picked!'
      }`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  const toggle = (id: string) => {
    setSelected(s => {
      if (s.includes(id)) return s.filter(x => x !== id)
      if (s.length >= 3)  return s
      return [...s, id]
    })
  }

  const handleGenerate = async () => {
    if (selected.length < 2) return
    setLoading(true)
    setError('')
    tts.speak('Making your coloring book now! Get ready.')

    try {
      const resp = await fetch('/api/v1/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept: 'interest-packs',
          config: {
            interests: selected, ageRange: age,
            sourceVariant: voiceMode ? 'voice' : 'tiles',
          },
        }),
      })
      const data = await resp.json() as { sessionId?: string; sessionToken?: string; error?: string }
      if (!resp.ok || !data.sessionId) throw new Error(data.error || 'Failed to create session')

      await fetch('/api/v1/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'configure_complete',
          sessionId: data.sessionId,
          props: {
            concept: 'interest-packs', interests: selected, age_range: age,
            input_mode: voiceMode ? 'voice' : 'tiles',
            experiment_variant: voiceMode ? 'C' : 'A',
            tile_order_variant: tileOrderVariant,
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

  const selectionStatusText = selected.length === 0
    ? 'Pick at least 2 things'
    : selected.length === 1
    ? 'Pick 1 more to continue'
    : `${selected.length} selected — ${3 - selected.length > 0 ? `you can add ${3 - selected.length} more` : 'all set!'}`

  return (
    <>
      <CoppaConsentBanner onConsented={() => { /* consent recorded in cookie */ }} />
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back link — large tap target */}
        <Link
          href="/create"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800
                     text-sm font-medium mb-8 min-h-[44px] px-1"
          aria-label="Back to create options"
        >
          ← Back
        </Link>

        <main id="main-content">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
              What does your child love?
            </h1>
            <p className="text-gray-600">Pick 2 or 3 things — we&apos;ll make their book</p>
          </div>

          {/* ── Variant C: Voice stub ────────────────────────────────────── */}
          {voiceMode && (
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 rounded-3xl p-6 mb-6 text-center">
              <p className="font-bold text-gray-800 mb-1 text-lg">Speak what your kid loves 🎤</p>
              <p className="text-sm text-gray-500 mb-4">
                Say things like &quot;dinosaurs, space, and unicorns&quot;
              </p>
              <button
                onClick={listening ? stopListening : startListening}
                aria-pressed={listening}
                aria-label={listening ? 'Stop listening' : 'Start voice input'}
                className={`w-20 h-20 rounded-full text-4xl flex items-center justify-center mx-auto mb-4 transition-all shadow-lg
                  ${listening
                    ? 'bg-red-500 text-white animate-pulse scale-110'
                    : 'bg-violet-600 text-white hover:bg-violet-700'
                  }`}
              >
                {listening ? '⏹' : '🎤'}
              </button>
              {listening && (
                <p className="text-sm text-violet-600 font-medium animate-pulse">
                  Listening… speak now
                </p>
              )}
              {transcript && (
                <p className="text-sm text-gray-600 mt-2 italic">&quot;{transcript}&quot;</p>
              )}
              {selected.length > 0 && (
                <p className="text-sm text-green-600 font-medium mt-2">
                  Heard: {selected.map(s => INTERESTS.find(i => i.id === s)?.label).join(', ')}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-3">
                Or tap the tiles below to pick manually
              </p>
            </div>
          )}

          {/* Interest grid — ARIA group with live status */}
          <div
            role="group"
            aria-label="Choose interests — select 2 or 3"
            className="grid grid-cols-4 gap-3 mb-6"
          >
            {INTERESTS.map(interest => {
              const isSelected = selected.includes(interest.id)
              const isDisabled = !isSelected && selected.length >= 3
              return (
                <button
                  key={interest.id}
                  onClick={() => toggle(interest.id)}
                  disabled={isDisabled}
                  aria-pressed={isSelected}
                  aria-label={`${interest.label}${isSelected ? ', selected' : ''}${isDisabled ? ', not available' : ''}`}
                  className={`kc-tile relative flex flex-col items-center justify-center gap-1
                    rounded-2xl border-2 transition-all
                    focus-visible:ring-0
                    ${isSelected
                      ? 'border-violet-500 bg-violet-50 shadow-md scale-105'
                      : isDisabled
                      ? 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
                      : 'border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50 cursor-pointer'
                    }`}
                >
                  {isSelected && (
                    <span
                      className="absolute -top-2 -right-2 w-6 h-6 bg-violet-500 rounded-full
                                 flex items-center justify-center text-white text-xs font-bold shadow"
                      aria-hidden="true"
                    >
                      {selected.indexOf(interest.id) + 1}
                    </span>
                  )}
                  <span className="text-3xl leading-none" aria-hidden="true">
                    {interest.emoji}
                  </span>
                  <span className="text-xs font-semibold text-gray-700 text-center leading-tight">
                    {interest.label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Selection status — aria-live so screen readers announce changes */}
          <div
            aria-live="polite"
            aria-atomic="true"
            className="text-center mb-6"
          >
            <div className="flex items-center justify-center gap-2 mb-2" aria-hidden="true">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center text-xl
                    transition-all ${
                    selected[i] ? 'border-violet-400 bg-violet-50' : 'border-dashed border-gray-200 bg-gray-50'
                  }`}
                >
                  {selected[i] ? INTERESTS.find(x => x.id === selected[i])?.emoji : '?'}
                </div>
              ))}
            </div>
            <p className="text-sm font-medium text-gray-600">
              {selectionStatusText}
            </p>
          </div>

          {/* Age selector */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6">
            <p
              id="age-group-label"
              className="text-sm font-semibold text-gray-800 mb-3"
            >
              How old is your child?
            </p>
            <div
              role="radiogroup"
              aria-labelledby="age-group-label"
              className="grid grid-cols-4 gap-2"
            >
              {AGES.map(a => (
                <button
                  key={a.id}
                  role="radio"
                  aria-checked={age === a.id}
                  onClick={() => {
                    setAge(a.id)
                    tts.speak(`Age ${a.label} selected. ${a.desc} coloring detail.`)
                  }}
                  className={`text-center py-3 px-2 rounded-xl border-2 transition-all
                    min-h-[56px]
                    ${age === a.id
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-gray-200 hover:border-violet-200 bg-white'
                    }`}
                >
                  <p className="font-bold text-sm text-gray-900">{a.label}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{a.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div role="alert" className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl mb-4 border border-red-200">
              {error} — please try again.
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={selected.length < 2 || loading}
            aria-disabled={selected.length < 2 || loading}
            aria-label={
              selected.length < 2
                ? 'Make my book — pick at least 2 interests first'
                : loading
                ? 'Making your book, please wait'
                : `Make my coloring book with ${selected.map(id => INTERESTS.find(i => i.id === id)?.label).join(', ')}`
            }
            className={`w-full py-4 rounded-2xl font-extrabold text-lg transition-all
              min-h-[56px]
              ${selected.length >= 2 && !loading
                ? 'bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-lg hover:shadow-xl hover:from-violet-600 hover:to-violet-700 cursor-pointer'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-70'
              }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <span
                  className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"
                  aria-hidden="true"
                />
                Making your book…
              </span>
            ) : (
              '✨ Make My Book!'
            )}
          </button>

          <p className="text-center text-xs text-gray-500 mt-3">
            Free trial · 4 custom pages · No account needed
          </p>
        </main>
      </div>

      {/* Floating TTS toggle */}
      <TTSButton tts={tts} />
    </div>
    </>
  )
}
