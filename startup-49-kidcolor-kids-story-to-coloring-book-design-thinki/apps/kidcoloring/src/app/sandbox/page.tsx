'use client'

import { useState } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────
interface GenResult {
  id:              string | null
  success:         boolean
  latency_ms:      number
  image_url:       string | null
  prompt:          string
  provider:        string
  file_size_bytes: number
  message:         string
  error?:          string | null
}

// ── Config ─────────────────────────────────────────────────────────────────────
const STYLES = [
  { id: 'coloring-book-thick',    label: '🖊️ Thick Outlines',   desc: 'Best for ages 4–6, largest regions' },
  { id: 'coloring-book-standard', label: '✏️ Standard Outlines', desc: 'Good all-round quality' },
  { id: 'sketch-outline',         label: '🖋️ Sketch Style',      desc: 'Lighter, looser lines' },
  { id: 'manga-simple',           label: '⛩️ Manga Simple',       desc: 'Anime-inspired thick outlines' },
]
const CONCEPTS = [
  { id: 'story-to-book',     label: '📖 Story-to-Book',     desc: 'Narrative scene from child\'s story' },
  { id: 'interest-packs',    label: '🎯 Interest Pack',      desc: 'Themed pack: dinos, space, etc.' },
  { id: 'adventure-builder', label: '⚔️ Adventure Builder',  desc: 'Quest or mission scene' },
]
const AGES = [
  { id: '4-6',  label: '🐣 Ages 4–6',  desc: 'Very simple, large regions' },
  { id: '6-8',  label: '🎨 Ages 6–8',  desc: 'Moderate detail' },
  { id: '8-11', label: '🖌️ Ages 8–11', desc: 'More detail + patterns' },
]
const EXAMPLE_SUBJECTS = [
  'cute dinosaur and unicorn exploring outer space',
  'friendly dragon and brave knight at a magical castle',
  'little mermaid swimming with colorful fish',
  'robot building a rocket ship in a workshop',
  'happy astronaut floating near the moon',
  'wizard casting a rainbow spell in enchanted forest',
  'brave fox on a mountain adventure',
  'spaceship landing on a colorful alien planet',
]

// ── Component ──────────────────────────────────────────────────────────────────
export default function SandboxPage() {
  const [subject,   setSubject]   = useState('')
  const [concept,   setConcept]   = useState('story-to-book')
  const [style,     setStyle]     = useState('coloring-book-thick')
  const [age,       setAge]       = useState('6-8')
  const [loading,   setLoading]   = useState(false)
  const [result,    setResult]    = useState<GenResult | null>(null)
  const [history,   setHistory]   = useState<GenResult[]>([])
  const [elapsed,   setElapsed]   = useState(0)

  const generate = async () => {
    if (!subject.trim()) return
    setLoading(true)
    setResult(null)
    const t0 = Date.now()
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 250)

    try {
      const resp = await fetch('/api/sandbox/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          concept, style, age_range: age,
          provider: 'pollinations', model: 'flux',
          test_run: 'sandbox-live',
        }),
      })
      const data = await resp.json() as GenResult
      setResult(data)
      if (data.success) setHistory(h => [data, ...h].slice(0, 8))
    } catch (e) {
      setResult({ id: null, success: false, latency_ms: Date.now() - t0,
        image_url: null, prompt: '', provider: 'pollinations/flux',
        file_size_bytes: 0, message: 'Network error', error: String(e) })
    } finally {
      clearInterval(timer)
      setElapsed(0)
      setLoading(false)
    }
  }

  const styleObj  = STYLES.find(s => s.id === style)!
  const conceptObj = CONCEPTS.find(c => c.id === concept)!

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-blue-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎨</span>
            <div>
              <h1 className="font-bold text-gray-900 text-lg leading-tight">KidColoring — Generation Sandbox</h1>
              <p className="text-xs text-gray-500">Test coloring-book line-art quality, latency &amp; style · Provider: Pollinations.ai (free)</p>
            </div>
          </div>
          <div className="flex gap-2 text-xs">
            <a href="/admin/sandbox" className="text-violet-600 hover:text-violet-800 font-medium px-3 py-1.5 bg-violet-50 rounded-lg">📊 Dashboard →</a>
            <a href="/admin" className="text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg bg-gray-50">Admin</a>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* ── LEFT: Controls ── */}
          <div className="space-y-5">

            {/* Subject input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📝 Describe your scene
              </label>
              <textarea
                className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-800 
                           focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none min-h-[80px]"
                placeholder="e.g. cute dinosaur and unicorn exploring outer space"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                maxLength={200}
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {EXAMPLE_SUBJECTS.map(ex => (
                  <button key={ex} onClick={() => setSubject(ex)}
                    className="text-xs px-2 py-1 bg-violet-50 text-violet-700 rounded-md hover:bg-violet-100 transition-colors">
                    {ex.slice(0, 35)}…
                  </button>
                ))}
              </div>
            </div>

            {/* Concept */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Concept</label>
              <div className="grid grid-cols-1 gap-2">
                {CONCEPTS.map(c => (
                  <button key={c.id} onClick={() => setConcept(c.id)}
                    className={`text-left px-3 py-2.5 rounded-xl border-2 transition-all ${
                      concept === c.id ? 'border-violet-400 bg-violet-50' : 'border-gray-100 hover:border-gray-200 bg-white'
                    }`}>
                    <span className="text-sm font-medium text-gray-800">{c.label}</span>
                    <span className="text-xs text-gray-400 block">{c.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Style */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Outline Style</label>
              <div className="grid grid-cols-2 gap-2">
                {STYLES.map(s => (
                  <button key={s.id} onClick={() => setStyle(s.id)}
                    className={`text-left px-3 py-2 rounded-xl border-2 transition-all ${
                      style === s.id ? 'border-blue-400 bg-blue-50' : 'border-gray-100 hover:border-gray-200 bg-white'
                    }`}>
                    <span className="text-sm font-medium text-gray-800">{s.label}</span>
                    <span className="text-xs text-gray-400 block leading-tight">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Age */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Target Age</label>
              <div className="grid grid-cols-3 gap-2">
                {AGES.map(a => (
                  <button key={a.id} onClick={() => setAge(a.id)}
                    className={`text-center px-2 py-2 rounded-xl border-2 transition-all ${
                      age === a.id ? 'border-green-400 bg-green-50' : 'border-gray-100 hover:border-gray-200 bg-white'
                    }`}>
                    <span className="text-sm font-medium text-gray-800 block">{a.label}</span>
                    <span className="text-xs text-gray-400">{a.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={generate}
              disabled={loading || !subject.trim()}
              className={`w-full py-4 rounded-2xl font-bold text-white text-base transition-all ${
                loading || !subject.trim()
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 shadow-lg hover:shadow-xl'
              }`}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Generating… {elapsed}s
                </span>
              ) : '✨ Generate Coloring Page'}
            </button>

            {/* Prompt preview */}
            {subject && (
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-1">Assembled prompt preview</p>
                <p className="text-xs text-gray-600 leading-relaxed font-mono">
                  {subject}, {styleObj.id} coloring book, {conceptObj.id}, age {age}…
                </p>
              </div>
            )}
          </div>

          {/* ── RIGHT: Result ── */}
          <div className="space-y-5">

            {/* Current result */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm min-h-[380px] flex flex-col">
              {!result && !loading && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
                  <span className="text-5xl mb-3">🖼️</span>
                  <p className="font-medium text-gray-500">Your generated page will appear here</p>
                  <p className="text-sm mt-1">Pick a scene, choose a style, hit Generate</p>
                  <div className="mt-4 text-xs space-y-1 text-gray-400 text-left">
                    <p>✅ Free (Pollinations.ai, no API key)</p>
                    <p>✅ Logs to Supabase gen_tests automatically</p>
                    <p>✅ ~20–45s generation time typical</p>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 rounded-full border-4 border-violet-200 border-t-violet-500 animate-spin mb-4"/>
                  <p className="font-semibold text-gray-700">Generating coloring page…</p>
                  <p className="text-sm text-gray-400 mt-1">{elapsed}s elapsed · typical 20–50s</p>
                  <div className="mt-4 w-full max-w-xs bg-gray-100 rounded-full h-1.5">
                    <div className="bg-violet-400 h-1.5 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(95, (elapsed / 50) * 100)}%` }}/>
                  </div>
                </div>
              )}

              {result && !loading && (
                <div className="flex-1 flex flex-col">
                  {result.success && result.image_url ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={result.image_url}
                        alt="Generated coloring page"
                        className="w-full rounded-t-2xl object-contain bg-white"
                        style={{ maxHeight: '320px' }}
                      />
                      <div className="p-4 border-t border-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-green-600 font-semibold text-sm">✅ Generated successfully</span>
                          <span className="text-xs text-gray-400">{(result.latency_ms / 1000).toFixed(1)}s · {(result.file_size_bytes / 1024).toFixed(0)}KB</span>
                        </div>
                        <p className="text-xs text-gray-500 font-mono leading-relaxed line-clamp-3">{result.prompt}</p>
                        <div className="flex gap-2 mt-3">
                          <a href={result.image_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg font-medium">
                            Open full size ↗
                          </a>
                          <button onClick={generate}
                            className="text-xs bg-violet-100 hover:bg-violet-200 text-violet-700 px-3 py-1.5 rounded-lg font-medium">
                            Regenerate
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                      <span className="text-4xl mb-3">⚠️</span>
                      <p className="font-semibold text-red-600">Generation failed</p>
                      <p className="text-sm text-gray-500 mt-1 max-w-xs">{result.error || result.message}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        Pollinations rate-limits free-tier IPs. Retry in 60s, or{' '}
                        <a href="/admin/sandbox" className="text-violet-500 underline">view dashboard data</a>.
                      </p>
                      <button onClick={generate}
                        className="mt-3 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium">
                        Try again
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* History strip */}
            {history.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">Recent generations (this session)</p>
                <div className="flex gap-2 flex-wrap">
                  {history.map((h, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 cursor-pointer"
                      onClick={() => setResult(h)}>
                      {h.image_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={h.image_url} alt="" className="w-full h-full object-cover"/>
                        : <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xl">✗</div>
                      }
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info box */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 text-sm">
              <p className="font-semibold text-blue-800 mb-2">📊 How results are scored</p>
              <ul className="text-blue-700 text-xs space-y-1">
                <li>• <strong>Line quality (45%):</strong> clean closed outlines, no gaps</li>
                <li>• <strong>Print suitability (35%):</strong> 300dpi-ready, appropriate contrast</li>
                <li>• <strong>Age suitability (20%):</strong> complexity matches target age</li>
                <li>• <strong>Pass threshold:</strong> overall ≥ 0.80 → printable</li>
              </ul>
              <p className="text-xs text-blue-500 mt-2">
                All results logged to <code className="bg-blue-100 px-1 rounded">gen_tests</code> · 
                <a href="/admin/sandbox" className="ml-1 underline">View dashboard →</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
