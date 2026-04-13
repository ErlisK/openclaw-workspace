'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Region = { id: string; name: string; region_code: string; code_standard: string }
type Trade = { id: string; name: string; slug: string }
type CodeRef = { id: string; code_standard: string; section: string; title: string; description: string; severity: string; skill_tags: string[] }
type Clip = { id: string; title: string; duration_seconds: number; uploader_id: string; status: string; challenge_prompt: string; trade: { name: string; slug: string } }

const severityColor: Record<string, string> = {
  violation: 'bg-red-100 text-red-700 border-red-300',
  warning: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  informational: 'bg-blue-100 text-blue-700 border-blue-300',
}

export default function IssueBadgePage() {
  const [regions, setRegions] = useState<Region[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [codeRefs, setCodeRefs] = useState<CodeRef[]>([])
  const [clips, setClips] = useState<Clip[]>([])

  const [selectedRegion, setSelectedRegion] = useState('')
  const [selectedTrade, setSelectedTrade] = useState('')
  const [selectedClip, setSelectedClip] = useState('')
  const [selectedRefs, setSelectedRefs] = useState<string[]>([])
  const [skillLevel, setSkillLevel] = useState('journeyman')
  const [rating, setRating] = useState(4)
  const [feedback, setFeedback] = useState('')
  const [timestampedNotes, setTimestampedNotes] = useState([{ time: '', note: '' }])
  const [codeCompliancePass, setCodeCompliancePass] = useState(true)
  const [issuedBy, setIssuedBy] = useState('')

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<{ badge_id: string; title: string; region: string } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('regions').select('id,name,region_code,code_standard').eq('active', true).order('name')
      .then(({ data }) => setRegions(data || []))
    supabase.from('trades').select('id,name,slug').order('name')
      .then(({ data }) => setTrades(data || []))
    supabase.from('clips').select('id,title,duration_seconds,uploader_id,status,challenge_prompt,trade:trades(name,slug)')
      .in('status', ['pending', 'under_review']).order('created_at', { ascending: false })
      .then(({ data }) => setClips((data as any) || []))
  }, [])

  const loadCodeRefs = useCallback(async () => {
    if (!selectedRegion && !selectedTrade) { setCodeRefs([]); return }
    const params = new URLSearchParams()
    if (selectedRegion) params.set('region_id', selectedRegion)
    if (selectedTrade) params.set('trade_id', selectedTrade)
    const res = await fetch(`/api/code-references?${params}`)
    const data = await res.json()
    setCodeRefs(Array.isArray(data) ? data : [])
  }, [selectedRegion, selectedTrade])

  useEffect(() => { loadCodeRefs() }, [loadCodeRefs])

  const toggleRef = (id: string) =>
    setSelectedRefs(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])

  const addNote = () => setTimestampedNotes(n => [...n, { time: '', note: '' }])
  const updateNote = (i: number, k: 'time' | 'note', v: string) =>
    setTimestampedNotes(n => n.map((x, idx) => idx === i ? { ...x, [k]: v } : x))
  const removeNote = (i: number) => setTimestampedNotes(n => n.filter((_, idx) => idx !== i))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClip || !selectedRegion) { setError('Select a clip and region'); return }
    setLoading(true); setError('')

    // First save the review
    const clip = clips.find(c => c.id === selectedClip)
    const { data: review, error: reviewErr } = await supabase.from('reviews').insert({
      clip_id: selectedClip,
      status: 'completed',
      overall_rating: rating,
      skill_level: skillLevel,
      feedback_text: feedback,
      code_compliance_pass: codeCompliancePass,
      timestamped_notes: timestampedNotes.filter(n => n.time && n.note),
      is_public: true,
      assigned_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    }).select().single()

    if (reviewErr) { setError(reviewErr.message); setLoading(false); return }

    // Issue the badge
    const res = await fetch('/api/badges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clip_id: selectedClip,
        review_id: review.id,
        region_id: selectedRegion,
        trade_id: selectedTrade || undefined,
        code_reference_ids: selectedRefs,
        skill_level: skillLevel,
        overall_rating: rating,
        issued_by: issuedBy || 'CertClip Mentor',
      }),
    })
    const result = await res.json()
    if (!res.ok) { setError(result.error); setLoading(false); return }

    const region = regions.find(r => r.id === selectedRegion)
    setSuccess({ badge_id: result.badge.id, title: result.badge.title, region: region?.name || '' })
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🏅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Badge Issued!</h1>
          <p className="text-gray-600 mb-4">{success.title}</p>
          <div className="bg-green-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-green-700"><strong>Region:</strong> {success.region}</p>
            <p className="text-sm text-green-700 mt-1"><strong>Badge ID:</strong> {success.badge_id.slice(0, 8)}…</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setSuccess(null); setSelectedClip(''); setSelectedRefs([]); setFeedback(''); setTimestampedNotes([{ time: '', note: '' }]) }}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700">
              Review Another
            </button>
            <a href="/wallet" className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 text-center">
              View Wallet
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Issue Jurisdiction Badge</h1>
          <p className="text-gray-600 mt-1">Review a clip and issue a region + code-tagged micro-badge to the tradesperson's credential wallet.</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Select Clip */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Step 1 — Select Clip to Review</h2>
            <select value={selectedClip} onChange={e => { setSelectedClip(e.target.value); const c = clips.find(x => x.id === e.target.value); if (c) setSelectedTrade('') }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">— Select a pending clip —</option>
              {clips.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.duration_seconds}s) — {(c.trade as any)?.name}
                </option>
              ))}
            </select>
            {selectedClip && (() => {
              const c = clips.find(x => x.id === selectedClip)
              return c ? (
                <div className="mt-3 bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-blue-700"><strong>Challenge prompt given to uploader:</strong></p>
                  <p className="text-sm text-blue-600 italic mt-1">"{c.challenge_prompt}"</p>
                </div>
              ) : null
            })()}
          </div>

          {/* Step 2: Region + Trade */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Step 2 — Jurisdiction & Trade</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region / Jurisdiction</label>
                <select value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">— Select region —</option>
                  {regions.map(r => <option key={r.id} value={r.id}>{r.name} ({r.code_standard})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trade</label>
                <select value={selectedTrade} onChange={e => setSelectedTrade(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">— Select trade —</option>
                  {trades.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Step 3: Code References */}
          {codeRefs.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Step 3 — Tag Code References</h2>
              <p className="text-sm text-gray-500 mb-4">Select all code sections that apply to this clip. These will be embedded in the badge.</p>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {codeRefs.map(ref => (
                  <label key={ref.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedRefs.includes(ref.id) ? 'bg-blue-50 border-blue-400' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input type="checkbox" checked={selectedRefs.includes(ref.id)} onChange={() => toggleRef(ref.id)} className="mt-0.5 accent-blue-600" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-900">{ref.code_standard} §{ref.section}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${severityColor[ref.severity]}`}>{ref.severity}</span>
                      </div>
                      <p className="text-sm text-gray-700 mt-0.5">{ref.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{ref.description}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {ref.skill_tags?.map((t: string) => (
                          <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">#{t}</span>
                        ))}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              {selectedRefs.length > 0 && (
                <p className="mt-3 text-sm text-blue-700 font-medium">{selectedRefs.length} reference{selectedRefs.length > 1 ? 's' : ''} selected</p>
              )}
            </div>
          )}

          {/* Step 4: Assessment */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Step 4 — Assessment</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Skill Level</label>
                <select value={skillLevel} onChange={e => setSkillLevel(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="apprentice">Apprentice</option>
                  <option value="journeyman">Journeyman</option>
                  <option value="master">Master</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Overall Rating (1–5)</label>
                <div className="flex gap-2 mt-1">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button" onClick={() => setRating(n)}
                      className={`w-9 h-9 rounded-full text-sm font-medium border-2 transition-colors ${
                        rating >= n ? 'bg-yellow-400 border-yellow-400 text-white' : 'bg-white border-gray-300 text-gray-400'
                      }`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Code Compliance</label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setCodeCompliancePass(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${codeCompliancePass ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300 text-gray-600'}`}>
                  ✅ Pass
                </button>
                <button type="button" onClick={() => setCodeCompliancePass(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${!codeCompliancePass ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-gray-300 text-gray-600'}`}>
                  ❌ Fail
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Written Feedback</label>
              <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={4} placeholder="Describe what you observed. Reference specific code sections. Include at least one positive observation and one improvement."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              <p className="text-xs text-gray-400 mt-1">{feedback.length} chars (target 100–300)</p>
            </div>
          </div>

          {/* Step 5: Timestamped Notes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Step 5 — Timestamped Notes</h2>
              <button type="button" onClick={addNote} className="text-sm text-blue-600 hover:text-blue-700 font-medium">+ Add note</button>
            </div>
            <div className="space-y-3">
              {timestampedNotes.map((n, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <input value={n.time} onChange={e => updateNote(i, 'time', e.target.value)} placeholder="0:22"
                    className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono" />
                  <input value={n.note} onChange={e => updateNote(i, 'note', e.target.value)} placeholder="Observation with code reference (e.g. NEC 312.5 knockout not deburred)"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  {timestampedNotes.length > 1 && (
                    <button type="button" onClick={() => removeNote(i)} className="text-red-400 hover:text-red-600 text-lg leading-none mt-2">×</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step 6: Reviewer Info + Submit */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Step 6 — Reviewer Info</h2>
            <input value={issuedBy} onChange={e => setIssuedBy(e.target.value)} placeholder="Your name (e.g. Robert Tran, IBEW Local 6)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>

          <button type="submit" disabled={loading || !selectedClip || !selectedRegion}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {loading ? 'Issuing Badge…' : '🏅 Issue Jurisdiction Badge'}
          </button>
        </form>
      </div>
    </div>
  )
}
