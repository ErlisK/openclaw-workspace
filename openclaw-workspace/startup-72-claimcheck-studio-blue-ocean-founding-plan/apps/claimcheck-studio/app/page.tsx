'use client'
import { useState } from 'react'

type Step = 'upload' | 'claims' | 'evidence' | 'generate' | 'export'

interface Claim {
  index: number
  text: string
  claimType: string
  confidence: number
  evidenceCount?: number
  confidenceScore?: number
  confidenceBand?: string
}

interface GeneratedOutput {
  format: string
  audienceLevel: string
  content: string
  wordCount: number
  complianceFlags: Array<{
    ruleCode: string
    severity: string
    matchedText: string
    suggestion: string
    sentenceIndex: number
  }>
  complianceClean?: boolean
  attributionCount?: number
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'text-emerald-400',
  moderate: 'text-amber-400',
  low: 'text-red-400',
  none: 'text-gray-600',
}

const CONFIDENCE_BANDS: Record<string, string> = {
  high: '🟢 High',
  moderate: '🟡 Moderate',
  low: '🔴 Low',
  none: '⚫ No Evidence',
}

const FORMAT_LABELS: Record<string, string> = {
  twitter_thread: 'Twitter/X Thread',
  linkedin_post: 'LinkedIn Post',
  blog_section: 'Blog Section',
  slide_copy: 'Slide Copy',
  patient_faq: 'Patient FAQ',
  policy_brief: 'Policy Brief',
  press_release: 'Press Release',
}

export default function HomePage() {
  const [step, setStep] = useState<Step>('upload')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Upload state
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [audienceLevel, setAudienceLevel] = useState<'patient' | 'journalist' | 'clinician' | 'policymaker'>('journalist')

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [claims, setClaims] = useState<Claim[]>([])

  // Evidence state
  const [evidenceResults, setEvidenceResults] = useState<Array<{
    claimId: string; text: string; sourcesFound: number; confidenceScore: number; confidenceBand: string
  }>>([])

  // Generate state
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['twitter_thread', 'linkedin_post'])
  const [territory, setTerritory] = useState<string>('general')
  const [outputs, setOutputs] = useState<GeneratedOutput[]>([])
  const [activeOutput, setActiveOutput] = useState(0)

  // Export state
  const [exportData, setExportData] = useState<{
    summary: { totalClaims: number; totalSources: number; highConfidence: number; moderateConfidence: number }
    bundle: { csv: string; bibtex: string; vancouver: string; confidenceReport: string }
  } | null>(null)

  async function handleUpload() {
    if (!text.trim()) { setError('Please paste some text to analyze'); return }
    setLoading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('text', text)
      fd.append('title', title || 'Untitled Document')
      fd.append('audienceLevel', audienceLevel)

      const res = await fetch('/api/sessions', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setSessionId(data.session.id)
      setClaims(data.claims)
      setStep('claims')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSearchEvidence() {
    if (!sessionId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/evidence`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEvidenceResults(data.results || [])
      setStep('evidence')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Evidence search failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerate() {
    if (!sessionId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formats: selectedFormats, audienceLevel, territory }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOutputs(data.outputs || [])
      setStep('generate')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleExport() {
    if (!sessionId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/export`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setExportData(data)
      setStep('export')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setLoading(false)
    }
  }

  function downloadText(content: string, filename: string, type = 'text/plain') {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const STEPS: { key: Step; label: string }[] = [
    { key: 'upload', label: '1. Upload' },
    { key: 'claims', label: '2. Claims' },
    { key: 'evidence', label: '3. Evidence' },
    { key: 'generate', label: '4. Generate' },
    { key: 'export', label: '5. Export' },
  ]

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold text-white mb-2">ClaimCheck Studio</h1>
        <p className="text-gray-400 text-lg">The only content studio where every claim earns its citation.</p>
        <p className="text-sm text-gray-600 mt-1">Upload research &rarr; extract claims &rarr; find evidence &rarr; generate content &rarr; export CiteBundle</p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map(({ key, label }, i) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              step === key ? 'bg-blue-600 text-white' :
              STEPS.findIndex(s => s.key === step) > i ? 'bg-emerald-800/50 text-emerald-300' :
              'bg-gray-800 text-gray-500'
            }`}>{label}</div>
            {i < STEPS.length - 1 && <span className="text-gray-700">&#8594;</span>}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-700/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Upload Document</h2>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Document Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. COVID-19 Vaccine Efficacy Review"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Target Audience</label>
            <select
              value={audienceLevel}
              onChange={e => setAudienceLevel(e.target.value as typeof audienceLevel)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-600"
            >
              <option value="patient">Patient (plain language)</option>
              <option value="journalist">Journalist (general public)</option>
              <option value="clinician">Clinician (professional)</option>
              <option value="policymaker">Policymaker (executive summary)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Paste Document Text</label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste the text of your manuscript, abstract, research paper, or any scientific document here..."
              rows={10}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-600 font-mono resize-y"
            />
            <p className="text-xs text-gray-600 mt-1">{text.split(/\s+/).filter(Boolean).length} words</p>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600">Tip: Try pasting an abstract or executive summary for a quick demo</div>
            <button
              onClick={handleUpload}
              disabled={loading || !text.trim()}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? 'Extracting claims...' : 'Extract Claims →'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Claims */}
      {step === 'claims' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">{claims.length} Claims Extracted</h2>
                <p className="text-xs text-gray-500 mt-0.5">Review extracted claims before searching for evidence</p>
              </div>
              <button
                onClick={handleSearchEvidence}
                disabled={loading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {loading ? 'Searching...' : `Search Evidence for ${Math.min(claims.length, 10)} Claims →`}
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {claims.map((claim, i) => (
                <div key={i} className="border border-gray-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-gray-600 font-mono shrink-0 mt-0.5">#{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-300 leading-relaxed">{claim.text}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">{claim.claimType}</span>
                        <span className="text-xs text-gray-600">extraction confidence: {(claim.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Evidence */}
      {step === 'evidence' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Evidence Search Results</h2>
                <p className="text-xs text-gray-500 mt-0.5">PubMed + CrossRef searched for each claim</p>
              </div>
              <button
                onClick={() => setStep('generate')}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium"
              >
                Configure Output →
              </button>
            </div>
            <div className="space-y-2">
              {evidenceResults.map((r, i) => (
                <div key={i} className="border border-gray-800 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <span className={`text-sm shrink-0 font-bold ${CONFIDENCE_COLORS[r.confidenceBand] || 'text-gray-500'}`}>
                      {CONFIDENCE_BANDS[r.confidenceBand] || r.confidenceBand}
                    </span>
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 leading-relaxed">{r.text}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs">
                        <span className="text-gray-600">{r.sourcesFound} sources found</span>
                        <span className="text-gray-600">score: {r.confidenceScore?.toFixed(3)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Generate config + outputs */}
      {(step === 'evidence' || step === 'generate') && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Generate Content</h2>

          {step === 'evidence' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Output Formats</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(FORMAT_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedFormats(prev =>
                        prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
                      )}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                        selectedFormats.includes(key)
                          ? 'border-blue-600 bg-blue-950/50 text-blue-300'
                          : 'border-gray-700 text-gray-500 hover:border-gray-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Compliance Territory</label>
                  <select
                    value={territory}
                    onChange={e => setTerritory(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="general">General Health Claims</option>
                    <option value="fda_us">FDA (US)</option>
                    <option value="ema_eu">EMA (EU)</option>
                    <option value="fda_ema">FDA + EMA</option>
                  </select>
                </div>
                <div className="mt-5">
                  <button
                    onClick={handleGenerate}
                    disabled={loading || selectedFormats.length === 0}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {loading ? 'Generating...' : `Generate ${selectedFormats.length} Format${selectedFormats.length !== 1 ? 's' : ''} →`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'generate' && outputs.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {outputs.map((o, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveOutput(i)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                      activeOutput === i
                        ? 'border-blue-600 bg-blue-950/50 text-blue-300'
                        : 'border-gray-700 text-gray-500'
                    }`}
                  >
                    {FORMAT_LABELS[o.format] || o.format}
                    {!o.complianceClean && <span className="ml-1 text-amber-500">⚠</span>}
                  </button>
                ))}
                <button
                  onClick={handleExport}
                  disabled={loading}
                  className="ml-auto px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium"
                >
                  {loading ? 'Exporting...' : 'Export CiteBundle →'}
                </button>
              </div>

              {outputs[activeOutput] && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed font-sans">
                      {outputs[activeOutput].content}
                    </pre>
                  </div>

                  {outputs[activeOutput].complianceFlags.length > 0 && (
                    <div className="rounded-lg border border-amber-700/30 bg-amber-950/20 p-3">
                      <div className="text-xs font-semibold text-amber-300 mb-2">
                        {outputs[activeOutput].complianceFlags.length} Compliance Flag{outputs[activeOutput].complianceFlags.length !== 1 ? 's' : ''} Detected
                      </div>
                      {outputs[activeOutput].complianceFlags.map((f, i) => (
                        <div key={i} className="mb-2 text-xs">
                          <span className={`font-medium ${f.severity === 'error' ? 'text-red-400' : 'text-amber-400'}`}>
                            [{f.severity.toUpperCase()}] {f.ruleCode}
                          </span>
                          <span className="text-gray-500 ml-1">&mdash; matched: &ldquo;{f.matchedText}&rdquo;</span>
                          <p className="text-gray-500 mt-0.5">{f.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-xs text-gray-600">
                    {outputs[activeOutput].wordCount} words &middot; {outputs[activeOutput].attributionCount} claim attributions &middot;
                    {outputs[activeOutput].complianceClean ? ' ✅ Compliance clean' : ' ⚠️ Compliance flags present'}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 5: Export */}
      {step === 'export' && exportData && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h2 className="text-lg font-semibold text-white mb-4">CiteBundle Ready</h2>
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Total Claims', value: exportData.summary.totalClaims, color: 'text-white' },
                { label: 'Total Sources', value: exportData.summary.totalSources, color: 'text-white' },
                { label: 'High Confidence', value: exportData.summary.highConfidence, color: 'text-emerald-400' },
                { label: 'Moderate Confidence', value: exportData.summary.moderateConfidence, color: 'text-amber-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="border border-gray-800 rounded-lg p-3 text-center">
                  <div className={`text-2xl font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'citations.csv', content: exportData.bundle.csv, filename: 'citations.csv', type: 'text/csv' },
                { label: 'citations.bib (BibTeX)', content: exportData.bundle.bibtex, filename: 'citations.bib', type: 'text/plain' },
                { label: 'citations_vancouver.txt', content: exportData.bundle.vancouver, filename: 'citations_vancouver.txt', type: 'text/plain' },
                { label: 'confidence_report.txt', content: exportData.bundle.confidenceReport, filename: 'confidence_report.txt', type: 'text/plain' },
              ].map(({ label, content, filename, type }) => (
                <button
                  key={label}
                  onClick={() => downloadText(content, filename, type)}
                  className="flex items-center justify-between border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-300 hover:border-gray-600 hover:text-white transition-colors text-left"
                >
                  <span>{label}</span>
                  <span className="text-blue-400 text-xs">↓ Download</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => { setStep('upload'); setText(''); setTitle(''); setClaims([]); setSessionId(null); setOutputs([]); setExportData(null) }}
              className="mt-4 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              ← Process another document
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
