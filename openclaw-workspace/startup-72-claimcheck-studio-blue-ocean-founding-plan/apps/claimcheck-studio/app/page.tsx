'use client'
import { useState, useCallback } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────

type Step = 'upload' | 'review' | 'generate' | 'export'
type Territory = 'general' | 'fda_us' | 'ema_eu' | 'fda_ema'
type AudienceLevel = 'patient' | 'journalist' | 'clinician' | 'policymaker'

interface ClaimSpan { start: number; end: number; text: string }

interface Claim {
  id?: string
  index: number
  text: string
  claimType: string
  confidence: number
  span: ClaimSpan
  extractedByLLM: boolean
  earlyRiskFlags: string[]
  // After evidence search:
  evidenceCount?: number
  confidenceScore?: number
  confidenceBand?: 'high' | 'moderate' | 'low' | 'none'
  scoreBreakdown?: string
  riskFlags?: RiskFlag[]
  overallRisk?: string | null
  sources?: EvidenceSource[]
  // UI state
  excluded?: boolean
  expanded?: boolean
}

interface RiskFlag {
  type: string
  severity: 'critical' | 'error' | 'warning' | 'info'
  detail: string
  suggestion?: string
}

interface EvidenceSource {
  doi?: string
  title: string
  authors?: string[]
  year?: number
  journal?: string
  pmid?: string
  sourceDb: string
  studyType?: string
  citationCount?: number
  oaFullTextUrl?: string
  accessStatus?: string
  sciteSupport?: number
  sciteContrast?: number
  isPreprint?: boolean
  isAnimalStudy?: boolean
  isRetracted?: boolean
  journalCredibility?: string
  // UI state
  excluded?: boolean
}

interface GeneratedOutput {
  format: string
  audienceLevel: string
  content: string
  wordCount: number
  complianceFlags: Array<{ ruleCode: string; severity: string; matchedText: string; suggestion: string }>
  complianceClean?: boolean
  attributionCount?: number
}

interface ExportBundle {
  summary: { totalClaims: number; totalSources: number; highConfidence: number; moderateConfidence: number }
  bundle: { csv: string; bibtex: string; vancouver: string; confidenceReport: string }
}

// ── Constants ─────────────────────────────────────────────────────────────

const CONFIDENCE_BAND_STYLES: Record<string, { dot: string; badge: string; label: string }> = {
  high:     { dot: 'bg-emerald-400', badge: 'bg-emerald-950/60 text-emerald-300 border-emerald-700/40', label: '🟢 High' },
  moderate: { dot: 'bg-amber-400',   badge: 'bg-amber-950/60 text-amber-300 border-amber-700/40',     label: '🟡 Moderate' },
  low:      { dot: 'bg-red-400',     badge: 'bg-red-950/60 text-red-300 border-red-700/40',            label: '🔴 Low' },
  none:     { dot: 'bg-gray-600',    badge: 'bg-gray-800 text-gray-500 border-gray-700',               label: '⚫ No Evidence' },
}

const RISK_SEVERITY_STYLES: Record<string, { bar: string; text: string; bg: string; icon: string }> = {
  critical: { bar: 'bg-red-500',    text: 'text-red-300',    bg: 'bg-red-950/40 border-red-700/30',     icon: '🚨' },
  error:    { bar: 'bg-orange-500', text: 'text-orange-300', bg: 'bg-orange-950/40 border-orange-700/30', icon: '⛔' },
  warning:  { bar: 'bg-amber-500',  text: 'text-amber-300',  bg: 'bg-amber-950/40 border-amber-700/30',  icon: '⚠️' },
  info:     { bar: 'bg-blue-500',   text: 'text-blue-300',   bg: 'bg-blue-950/40 border-blue-700/30',    icon: 'ℹ️' },
}

const STUDY_TYPE_LABELS: Record<string, string> = {
  meta_analysis: 'Meta-analysis', rct: 'RCT', cohort: 'Cohort study',
  review: 'Review', case_study: 'Case study', preprint: 'Preprint', other: 'Study'
}

const STUDY_TYPE_BADGE: Record<string, string> = {
  meta_analysis: 'text-emerald-300 bg-emerald-950/50 border-emerald-700/40',
  rct:           'text-blue-300 bg-blue-950/50 border-blue-700/40',
  cohort:        'text-sky-300 bg-sky-950/50 border-sky-700/40',
  review:        'text-purple-300 bg-purple-950/50 border-purple-700/40',
  preprint:      'text-amber-300 bg-amber-950/50 border-amber-700/40',
  case_study:    'text-gray-300 bg-gray-800 border-gray-600',
  other:         'text-gray-400 bg-gray-800 border-gray-700',
}

const FORMAT_LABELS: Record<string, string> = {
  twitter_thread: 'Twitter/X Thread', linkedin_post: 'LinkedIn Post',
  blog_section: 'Blog Section', slide_copy: 'Slide Copy',
  patient_faq: 'Patient FAQ', policy_brief: 'Policy Brief', press_release: 'Press Release',
}

// ── Helpers ───────────────────────────────────────────────────────────────

function claimTypeColor(t: string) {
  const map: Record<string, string> = {
    quantitative: 'text-blue-400', causal: 'text-purple-400', comparative: 'text-cyan-400',
    epidemiological: 'text-teal-400', treatment: 'text-emerald-400', safety: 'text-red-400',
    mechanistic: 'text-violet-400', general: 'text-gray-400',
  }
  return map[t] || 'text-gray-400'
}

function downloadText(content: string, filename: string, type = 'text/plain') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── Main Component ────────────────────────────────────────────────────────

export default function WorkbenchPage() {
  const [step, setStep] = useState<Step>('upload')
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Upload
  const [docText, setDocText] = useState('')
  const [docTitle, setDocTitle] = useState('')
  const [audienceLevel, setAudienceLevel] = useState<AudienceLevel>('journalist')
  const [territory, setTerritory] = useState<Territory>('general')

  // Session
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [claims, setClaims] = useState<Claim[]>([])
  const [evidenceSearched, setEvidenceSearched] = useState(false)

  // Active claim for right panel
  const [activeClaim, setActiveClaim] = useState<number | null>(null)

  // Generate
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['twitter_thread', 'linkedin_post'])
  const [outputs, setOutputs] = useState<GeneratedOutput[]>([])
  const [activeOutput, setActiveOutput] = useState(0)

  // Export
  const [exportData, setExportData] = useState<ExportBundle | null>(null)

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleUpload() {
    if (!docText.trim()) { setError('Paste document text to continue'); return }
    setLoading(true); setLoadingMsg('Extracting claims with Claude…'); setError(null)
    try {
      const fd = new FormData()
      fd.append('text', docText)
      fd.append('title', docTitle || 'Untitled')
      fd.append('audienceLevel', audienceLevel)
      fd.append('territory', territory)
      const res = await fetch('/api/sessions', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSessionId(data.session.id)
      setClaims(data.claims.map((c: Claim) => ({ ...c, expanded: false, excluded: false })))
      setEvidenceSearched(false)
      setActiveClaim(0)
      setStep('review')
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed') }
    finally { setLoading(false) }
  }

  async function handleSearchEvidence() {
    if (!sessionId) return
    setLoading(true); setLoadingMsg('Searching PubMed, CrossRef, Unpaywall, Scite…'); setError(null)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/evidence`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Fetch full enriched claim data (with sources + risk flags)
      const claimsRes = await fetch(`/api/sessions/${sessionId}/claims`)
      const claimsData = await claimsRes.json()
      if (claimsRes.ok && claimsData.claims) {
        // Preserve UI state (excluded, expanded) from previous claims
        setClaims(prev => claimsData.claims.map((c: Claim, i: number) => ({
          ...c,
          index: i,
          excluded: prev[i]?.excluded || false,
          expanded: false,
        })))
      }
      setEvidenceSearched(true)
    } catch (e) { setError(e instanceof Error ? e.message : 'Evidence search failed') }
    finally { setLoading(false) }
  }

  async function handleGenerate() {
    if (!sessionId) return
    setLoading(true); setLoadingMsg('Generating content…'); setError(null)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formats: selectedFormats, audienceLevel, territory }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOutputs(data.outputs || [])
      setActiveOutput(0)
      setStep('generate')
    } catch (e) { setError(e instanceof Error ? e.message : 'Generation failed') }
    finally { setLoading(false) }
  }

  async function handleExport() {
    if (!sessionId) return
    setLoading(true); setLoadingMsg('Building CiteBundle…'); setError(null)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/export`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setExportData(data)
      setStep('export')
    } catch (e) { setError(e instanceof Error ? e.message : 'Export failed') }
    finally { setLoading(false) }
  }

  const toggleClaimExcluded = useCallback((index: number) => {
    setClaims(prev => prev.map((c, i) => i === index ? { ...c, excluded: !c.excluded } : c))
  }, [])

  const resetAll = () => {
    setStep('upload'); setDocText(''); setDocTitle(''); setClaims([])
    setSessionId(null); setOutputs([]); setExportData(null); setEvidenceSearched(false)
    setActiveClaim(null); setError(null)
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const includedClaims = claims.filter(c => !c.excluded)
  const highRiskClaims = claims.filter(c => c.overallRisk === 'critical' || c.overallRisk === 'error')
  const activeClaimData = activeClaim !== null ? claims[activeClaim] : null

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Workbench</h1>
          <p className="text-xs text-gray-500 mt-0.5">Upload → extract claims → find evidence → generate → export CiteBundle</p>
        </div>
        {step !== 'upload' && (
          <button onClick={resetAll} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            ← New document
          </button>
        )}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-1.5">
        {(['upload','review','generate','export'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={`h-1.5 w-12 rounded-full transition-colors ${
              step === s ? 'bg-blue-500' :
              ['upload','review','generate','export'].indexOf(step) > i ? 'bg-emerald-600' : 'bg-gray-800'
            }`} />
          </div>
        ))}
        <span className="text-xs text-gray-600 ml-1 capitalize">{step}</span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-700/50 bg-red-950/30 px-3 py-2.5 text-sm text-red-300 flex items-start gap-2">
          <span className="shrink-0">⛔</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-300">✕</button>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="rounded-lg border border-blue-700/30 bg-blue-950/20 px-3 py-2.5 text-sm text-blue-300 flex items-center gap-2">
          <span className="animate-spin">⟳</span>
          <span>{loadingMsg}</span>
        </div>
      )}

      {/* ── STEP: UPLOAD ── */}
      {step === 'upload' && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-5">
          <h2 className="text-base font-semibold text-white">Upload Document</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Title</label>
              <input type="text" value={docTitle} onChange={e => setDocTitle(e.target.value)}
                placeholder="e.g. COVID-19 Vaccine White Paper"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-600" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Audience</label>
                <select value={audienceLevel} onChange={e => setAudienceLevel(e.target.value as AudienceLevel)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-600">
                  <option value="patient">Patient</option>
                  <option value="journalist">Journalist</option>
                  <option value="clinician">Clinician</option>
                  <option value="policymaker">Policymaker</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Territory</label>
                <select value={territory} onChange={e => setTerritory(e.target.value as Territory)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-600">
                  <option value="general">General</option>
                  <option value="fda_us">FDA (US)</option>
                  <option value="ema_eu">EMA (EU)</option>
                  <option value="fda_ema">FDA + EMA</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
              Document Text
              <span className="normal-case text-gray-600 ml-2">— manuscript, abstract, transcript, or slide notes</span>
            </label>
            <textarea value={docText} onChange={e => setDocText(e.target.value)} rows={11}
              placeholder="Paste the full text of your document here…

Example: Statins reduce LDL cholesterol by 30–50% at standard doses. A meta-analysis of 26 randomized trials with 174,149 patients showed a 22% relative reduction in major cardiovascular events per 1 mmol/L LDL reduction. Adverse effects including myopathy occurred in fewer than 0.1% of participants…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-blue-600 font-mono resize-y leading-relaxed" />
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-gray-600">{docText.split(/\s+/).filter(Boolean).length} words</span>
              <span className="text-xs text-gray-600">LLM extraction via AWS Bedrock · fallback to rule-based</span>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={handleUpload} disabled={loading || !docText.trim()}
              className="px-7 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors">
              {loading ? 'Extracting…' : 'Extract Claims →'}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: REVIEW (claims + evidence) ── */}
      {step === 'review' && (
        <div className="grid grid-cols-5 gap-4" style={{ minHeight: '70vh' }}>

          {/* Left panel: claim list */}
          <div className="col-span-2 flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {claims.length} Claims Extracted
              </div>
              <div className="flex items-center gap-2">
                {!evidenceSearched ? (
                  <button onClick={handleSearchEvidence} disabled={loading}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg text-xs font-medium transition-colors">
                    {loading ? 'Searching…' : 'Search Evidence'}
                  </button>
                ) : (
                  <span className="text-xs text-emerald-400">✓ Evidence scored</span>
                )}
              </div>
            </div>

            {/* Summary bar when evidence searched */}
            {evidenceSearched && (
              <div className="rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2 grid grid-cols-3 gap-2 text-center text-xs mb-1">
                {[
                  { label: 'High', count: claims.filter(c => c.confidenceBand === 'high').length, color: 'text-emerald-400' },
                  { label: 'Moderate', count: claims.filter(c => c.confidenceBand === 'moderate').length, color: 'text-amber-400' },
                  { label: 'Flagged', count: highRiskClaims.length, color: 'text-red-400' },
                ].map(({ label, count, color }) => (
                  <div key={label}>
                    <div className={`text-lg font-bold ${color}`}>{count}</div>
                    <div className="text-gray-600">{label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Claim cards */}
            <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 120px)' }}>
              {claims.map((claim, i) => {
                const band = claim.confidenceBand || 'none'
                const styles = CONFIDENCE_BAND_STYLES[band]
                const topFlag = claim.riskFlags?.[0]
                const flagStyle = topFlag ? RISK_SEVERITY_STYLES[topFlag.severity] : null
                const isActive = activeClaim === i

                return (
                  <div key={i}
                    onClick={() => setActiveClaim(i)}
                    className={`rounded-lg border p-3 cursor-pointer transition-all ${
                      claim.excluded ? 'opacity-40 border-gray-800 bg-gray-900/30' :
                      isActive ? 'border-blue-600/60 bg-blue-950/20' :
                      'border-gray-800 bg-gray-900 hover:border-gray-700'
                    }`}>
                    <div className="flex items-start gap-2">
                      {/* Confidence dot */}
                      <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${styles.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-300 leading-relaxed line-clamp-2">{claim.text}</p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {/* Claim type */}
                          <span className={`text-xs font-medium ${claimTypeColor(claim.claimType)}`}>
                            {claim.claimType}
                          </span>
                          {/* Confidence band */}
                          {claim.confidenceBand && (
                            <span className={`text-xs px-1.5 py-0.5 rounded border ${styles.badge}`}>
                              {claim.confidenceScore?.toFixed(2)} {styles.label.split(' ')[1]}
                            </span>
                          )}
                          {/* LLM badge */}
                          {claim.extractedByLLM && (
                            <span className="text-xs text-purple-400 bg-purple-950/30 border border-purple-700/30 px-1.5 py-0.5 rounded">
                              LLM
                            </span>
                          )}
                          {/* Source count */}
                          {claim.evidenceCount !== undefined && (
                            <span className="text-xs text-gray-500">{claim.evidenceCount} src</span>
                          )}
                          {/* Risk badge */}
                          {topFlag && (
                            <span className={`text-xs px-1.5 py-0.5 rounded border ${flagStyle?.bg} ${flagStyle?.text}`}>
                              {flagStyle?.icon} {topFlag.type.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Exclude toggle */}
                      <button
                        onClick={e => { e.stopPropagation(); toggleClaimExcluded(i) }}
                        title={claim.excluded ? 'Re-include claim' : 'Exclude claim'}
                        className={`shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs transition-colors ${
                          claim.excluded ? 'bg-gray-700 text-gray-400' : 'hover:bg-gray-700 text-gray-600 hover:text-gray-300'
                        }`}>
                        {claim.excluded ? '↩' : '✕'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Continue CTA */}
            {evidenceSearched && (
              <div className="pt-2 border-t border-gray-800">
                <button onClick={() => setStep('generate')}
                  className="w-full px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors">
                  Continue to Generate →
                </button>
                <p className="text-xs text-gray-600 mt-1 text-center">
                  {includedClaims.length} of {claims.length} claims included
                  {highRiskClaims.length > 0 && ` · ${highRiskClaims.length} high-risk flags`}
                </p>
              </div>
            )}
          </div>

          {/* Right panel: active claim detail */}
          <div className="col-span-3">
            {activeClaimData ? (
              <ClaimDetailPanel
                claim={activeClaimData}
                docText={docText}
                evidenceSearched={evidenceSearched}
                onExcludeSource={() => {}}
              />
            ) : (
              <div className="rounded-xl border border-gray-800 bg-gray-900/40 h-full flex items-center justify-center">
                <p className="text-sm text-gray-600">Select a claim to see details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP: GENERATE ── */}
      {step === 'generate' && (
        <div className="space-y-4">
          {/* Format selector + generate button */}
          {outputs.length === 0 && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
              <h2 className="text-base font-semibold text-white">Generate Content</h2>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Output Formats</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(FORMAT_LABELS).map(([key, label]) => (
                    <button key={key}
                      onClick={() => setSelectedFormats(prev =>
                        prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
                      )}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                        selectedFormats.includes(key)
                          ? 'border-blue-600 bg-blue-950/50 text-blue-300'
                          : 'border-gray-700 text-gray-500 hover:border-gray-600'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setStep('review')} className="text-xs text-gray-500 hover:text-gray-300">← Back to Claims</button>
                <button onClick={handleGenerate} disabled={loading || selectedFormats.length === 0}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors">
                  {loading ? 'Generating…' : `Generate ${selectedFormats.length} Format${selectedFormats.length !== 1 ? 's' : ''} →`}
                </button>
              </div>
            </div>
          )}

          {/* Generated outputs */}
          {outputs.length > 0 && (
            <div className="space-y-3">
              {/* Tab bar */}
              <div className="flex items-center gap-2 flex-wrap">
                {outputs.map((o, i) => (
                  <button key={i} onClick={() => setActiveOutput(i)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                      activeOutput === i
                        ? 'border-blue-600 bg-blue-950/50 text-blue-300'
                        : 'border-gray-700 text-gray-500 hover:border-gray-600'
                    }`}>
                    {FORMAT_LABELS[o.format] || o.format}
                    {!o.complianceClean && <span className="ml-1 text-amber-400">⚠</span>}
                  </button>
                ))}
                <button onClick={handleExport} disabled={loading}
                  className="ml-auto px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium">
                  {loading ? 'Exporting…' : 'Export CiteBundle →'}
                </button>
              </div>

              {/* Active output */}
              {outputs[activeOutput] && (
                <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                      <span>{outputs[activeOutput].wordCount} words</span>
                      {outputs[activeOutput].attributionCount !== undefined && (
                        <span>{outputs[activeOutput].attributionCount} attribution{outputs[activeOutput].attributionCount !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                    <span className={outputs[activeOutput].complianceClean ? 'text-emerald-400' : 'text-amber-400'}>
                      {outputs[activeOutput].complianceClean ? '✅ Compliance clean' : `⚠️ ${outputs[activeOutput].complianceFlags.length} flag${outputs[activeOutput].complianceFlags.length !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <pre className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed font-sans bg-gray-800/40 rounded-lg p-4">
                    {outputs[activeOutput].content}
                  </pre>
                  {/* Compliance flags */}
                  {outputs[activeOutput].complianceFlags.length > 0 && (
                    <div className="rounded-lg border border-amber-700/30 bg-amber-950/20 p-3 space-y-2">
                      <div className="text-xs font-semibold text-amber-300">Compliance Flags</div>
                      {outputs[activeOutput].complianceFlags.map((f, i) => (
                        <div key={i} className="text-xs">
                          <span className={`font-medium ${f.severity === 'error' ? 'text-red-400' : 'text-amber-400'}`}>
                            [{f.severity.toUpperCase()}] {f.ruleCode}
                          </span>
                          <span className="text-gray-500"> — &ldquo;{f.matchedText}&rdquo;</span>
                          <p className="text-gray-500 mt-0.5 pl-2">{f.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── STEP: EXPORT ── */}
      {step === 'export' && exportData && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="text-base font-semibold text-white mb-4">CiteBundle Ready</h2>
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Claims', value: exportData.summary.totalClaims, color: 'text-white' },
                { label: 'Sources', value: exportData.summary.totalSources, color: 'text-white' },
                { label: 'High confidence', value: exportData.summary.highConfidence, color: 'text-emerald-400' },
                { label: 'Moderate', value: exportData.summary.moderateConfidence, color: 'text-amber-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="border border-gray-800 rounded-lg p-3 text-center">
                  <div className={`text-2xl font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '📄 citations.csv', content: exportData.bundle.csv, fn: 'citations.csv', type: 'text/csv' },
                { label: '📚 citations.bib (BibTeX)', content: exportData.bundle.bibtex, fn: 'citations.bib', type: 'text/plain' },
                { label: '📋 citations_vancouver.txt', content: exportData.bundle.vancouver, fn: 'citations_vancouver.txt', type: 'text/plain' },
                { label: '📊 confidence_report.txt', content: exportData.bundle.confidenceReport, fn: 'confidence_report.txt', type: 'text/plain' },
              ].map(({ label, content, fn, type }) => (
                <button key={label} onClick={() => downloadText(content, fn, type)}
                  className="flex items-center justify-between border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-300 hover:border-gray-500 hover:text-white transition-colors">
                  <span>{label}</span>
                  <span className="text-blue-400 text-xs">↓ Download</span>
                </button>
              ))}
            </div>
            <button onClick={resetAll} className="mt-5 text-sm text-gray-500 hover:text-gray-300 transition-colors">
              ← Process another document
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Claim Detail Panel ─────────────────────────────────────────────────────

interface ClaimDetailPanelProps {
  claim: Claim
  docText: string
  evidenceSearched: boolean
  onExcludeSource: (sourceIdx: number) => void
}

function ClaimDetailPanel({ claim, docText, evidenceSearched }: ClaimDetailPanelProps) {
  const [sourcesPage, setSourcesPage] = useState(0)
  const SOURCES_PER_PAGE = 3

  // Highlight span in document
  const SpanHighlight = () => {
    if (!claim.span || claim.span.start < 0 || !docText) return (
      <p className="text-sm text-gray-300 leading-relaxed">{claim.text}</p>
    )
    const { start, end } = claim.span
    const before = docText.slice(Math.max(0, start - 120), start)
    const highlighted = docText.slice(start, end)
    const after = docText.slice(end, end + 120)
    const showEllipsisBefore = start > 120
    const showEllipsisAfter = end + 120 < docText.length
    return (
      <p className="text-xs text-gray-400 leading-relaxed font-mono">
        {showEllipsisBefore && <span className="text-gray-600">…</span>}
        {before}
        <mark className="bg-blue-500/25 text-blue-100 rounded px-0.5 not-italic">{highlighted}</mark>
        {after}
        {showEllipsisAfter && <span className="text-gray-600">…</span>}
      </p>
    )
  }

  const band = claim.confidenceBand || 'none'
  const styles = CONFIDENCE_BAND_STYLES[band]

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 h-full overflow-y-auto" style={{ maxHeight: '70vh' }}>
      {/* Claim header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-start gap-2 mb-3">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${styles.dot}`} />
          <div className="flex-1">
            <p className="text-sm text-white leading-relaxed">{claim.text}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-xs font-semibold ${claimTypeColor(claim.claimType)}`}>{claim.claimType}</span>
              {claim.extractedByLLM && (
                <span className="text-xs text-purple-300 bg-purple-950/30 border border-purple-700/30 px-1.5 py-0.5 rounded">
                  LLM · conf {(claim.confidence * 100).toFixed(0)}%
                </span>
              )}
              {!claim.extractedByLLM && (
                <span className="text-xs text-gray-400 bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded">
                  Rule-based · conf {(claim.confidence * 100).toFixed(0)}%
                </span>
              )}
              {claim.confidenceBand && (
                <span className={`text-xs px-1.5 py-0.5 rounded border ${styles.badge}`}>
                  {styles.label} · {claim.confidenceScore?.toFixed(3)}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Span in context */}
        <div className="rounded-lg bg-gray-800/50 border border-gray-700/50 px-3 py-2">
          <div className="text-xs text-gray-600 mb-1 font-mono">Span ({claim.span?.start}:{claim.span?.end}) in document</div>
          <SpanHighlight />
        </div>
      </div>

      {/* Early risk signals */}
      {claim.earlyRiskFlags && claim.earlyRiskFlags.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-800">
          <div className="text-xs text-gray-600 mb-1.5">Early risk signals (at extraction)</div>
          <div className="flex flex-wrap gap-1.5">
            {claim.earlyRiskFlags.map(f => (
              <span key={f} className="text-xs bg-amber-950/30 border border-amber-700/30 text-amber-300 px-1.5 py-0.5 rounded">
                ⚑ {f.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Provenance score breakdown */}
      {evidenceSearched && claim.scoreBreakdown && (
        <div className="px-4 py-3 border-b border-gray-800">
          <div className="text-xs text-gray-600 mb-2">Provenance Score v2</div>
          <div className="text-xs text-gray-400 font-mono bg-gray-800/50 rounded p-2 leading-relaxed break-all">
            {claim.scoreBreakdown}
          </div>
        </div>
      )}

      {/* Risk flags */}
      {evidenceSearched && claim.riskFlags && claim.riskFlags.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-800 space-y-2">
          <div className="text-xs text-gray-600 mb-1">Risk Flags ({claim.riskFlags.length})</div>
          {claim.riskFlags.map((f, i) => {
            const fs = RISK_SEVERITY_STYLES[f.severity]
            return (
              <div key={i} className={`rounded-lg border p-3 ${fs.bg}`}>
                <div className="flex items-start gap-2">
                  <span className="shrink-0">{fs.icon}</span>
                  <div>
                    <div className={`text-xs font-semibold ${fs.text}`}>
                      [{f.severity.toUpperCase()}] {f.type.replace(/_/g, ' ')}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{f.detail}</p>
                    {f.suggestion && (
                      <p className="text-xs text-gray-500 mt-1 border-t border-gray-700/50 pt-1">
                        💡 {f.suggestion}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Sources */}
      {evidenceSearched && (
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-600">
              Evidence Sources {claim.evidenceCount !== undefined && `(${claim.evidenceCount} found)`}
            </div>
            {claim.evidenceCount !== undefined && claim.evidenceCount === 0 && (
              <span className="text-xs text-red-400">No peer-reviewed sources found</span>
            )}
          </div>
          {claim.sources && claim.sources.length > 0 ? (
            <div className="space-y-2">
              {claim.sources.slice(sourcesPage * SOURCES_PER_PAGE, (sourcesPage + 1) * SOURCES_PER_PAGE).map((s, i) => (
                <SourceCard key={i} source={s} />
              ))}
              {claim.sources.length > SOURCES_PER_PAGE && (
                <div className="flex items-center gap-2 text-xs text-gray-600 mt-2">
                  <button disabled={sourcesPage === 0} onClick={() => setSourcesPage(p => p - 1)}
                    className="disabled:opacity-30 hover:text-gray-300">← Prev</button>
                  <span>{sourcesPage + 1} / {Math.ceil(claim.sources.length / SOURCES_PER_PAGE)}</span>
                  <button disabled={(sourcesPage + 1) * SOURCES_PER_PAGE >= claim.sources.length}
                    onClick={() => setSourcesPage(p => p + 1)}
                    className="disabled:opacity-30 hover:text-gray-300">Next →</button>
                </div>
              )}
            </div>
          ) : evidenceSearched ? (
            <div className="text-xs text-gray-600 text-center py-4">
              Sources displayed after evidence search
            </div>
          ) : null}
          {!evidenceSearched && (
            <div className="text-xs text-gray-600 text-center py-4 border border-dashed border-gray-800 rounded-lg">
              Click &ldquo;Search Evidence&rdquo; to find peer-reviewed sources
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Source Card ───────────────────────────────────────────────────────────

function SourceCard({ source }: { source: EvidenceSource }) {
  const studyBadge = STUDY_TYPE_BADGE[source.studyType || 'other'] || STUDY_TYPE_BADGE.other
  const studyLabel = STUDY_TYPE_LABELS[source.studyType || 'other'] || 'Study'

  return (
    <div className={`rounded-lg border p-3 text-xs ${
      source.isRetracted ? 'border-red-700/50 bg-red-950/20' :
      source.isPreprint ? 'border-amber-700/30 bg-amber-950/10' :
      'border-gray-800 bg-gray-800/40'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-gray-200 leading-snug font-medium line-clamp-2 flex-1">
          {source.isRetracted && <span className="text-red-400 mr-1">⚠ RETRACTED —</span>}
          {source.title}
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          {source.oaFullTextUrl && (
            <a href={source.oaFullTextUrl} target="_blank" rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 px-1.5 py-0.5 border border-blue-700/30 rounded"
              onClick={e => e.stopPropagation()}>
              OA PDF ↗
            </a>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 text-gray-500 flex-wrap">
        {source.authors?.[0] && <span>{source.authors[0].split(',')[0]} et al.</span>}
        {source.year && <span>·{source.year}</span>}
        {source.journal && <span className="text-gray-600 truncate max-w-[150px]">· {source.journal}</span>}
        {source.doi && <span className="text-blue-500 truncate max-w-[100px]">· {source.doi}</span>}
      </div>
      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
        {/* Study type */}
        <span className={`px-1.5 py-0.5 rounded border text-xs ${studyBadge}`}>{studyLabel}</span>
        {/* Preprint badge */}
        {source.isPreprint && <span className="px-1.5 py-0.5 rounded border border-amber-700/40 bg-amber-950/30 text-amber-300 text-xs">Preprint</span>}
        {/* Animal study badge */}
        {source.isAnimalStudy && <span className="px-1.5 py-0.5 rounded border border-orange-700/30 bg-orange-950/20 text-orange-300 text-xs">Animal study</span>}
        {/* Journal credibility */}
        {source.journalCredibility === 'high' && <span className="px-1.5 py-0.5 rounded border border-emerald-700/30 bg-emerald-950/20 text-emerald-300 text-xs">High-impact journal</span>}
        {source.journalCredibility === 'low' && <span className="px-1.5 py-0.5 rounded border border-red-700/30 bg-red-950/20 text-red-300 text-xs">Low credibility</span>}
        {/* Scite */}
        {(source.sciteSupport || source.sciteContrast) ? (
          <span className="text-gray-600">
            Scite: {source.sciteSupport}↑ {source.sciteContrast}↓
          </span>
        ) : null}
        {/* Citation count */}
        {source.citationCount ? <span className="text-gray-600">{source.citationCount} citations</span> : null}
        {/* DB source */}
        <span className={`ml-auto text-xs ${source.sourceDb === 'pubmed' ? 'text-teal-500' : 'text-violet-500'}`}>
          {source.sourceDb === 'pubmed' ? 'PubMed' : source.sourceDb === 'crossref' ? 'CrossRef' : source.sourceDb}
        </span>
      </div>
    </div>
  )
}
