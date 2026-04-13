'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Section {
  id?: string
  section_key: string
  title?: string
  section_title?: string
  req_type: string
  word_limit?: number | null
  scoring_points?: number | null
  sort_order: number
}

interface Narrative {
  id: string
  section_key: string
  section_title: string
  content_md: string
  word_count: number
  version: number
  status: string
  qa_status?: string
  qa_score?: number
  qa_notes?: string
  ai_generated?: boolean
}

interface Version {
  id: string
  version: number
  word_count: number
  change_type: string
  change_summary: string
  created_at: string
  content_md: string
}

interface QAResult {
  score: number
  grade: string
  issues: string[]
  suggestions: string[]
  strengths: string[]
  alignment_notes: string
}

interface Props {
  applicationId: string
  rfpDocumentId: string | null
  sections: Section[]
  existingNarratives: Narrative[]
  pilotConfig: Record<string, unknown> | null
  rfpContext: {
    title: string
    funder_name: string | null
    deadline: string | null
    funder_type?: string | null
    scoring_rubric: { criterion: string; points: number }[]
    max_award_usd?: number | null
  }
}

// ─── Word counter ─────────────────────────────────────────────────────────────
const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  empty:     'text-gray-400',
  draft:     'text-yellow-700',
  reviewed:  'text-blue-700',
  approved:  'text-green-700',
}
const QA_COLORS: Record<string, string> = {
  pass:    'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  fail:    'bg-red-100 text-red-800',
}

// ─── QA reviewer (client-side heuristic when no LLM available) ────────────────
function runHeuristicQA(text: string, section: Section, rfpContext: Props['rfpContext']): QAResult {
  const wc = countWords(text)
  const issues: string[] = []
  const suggestions: string[] = []
  const strengths: string[] = []

  // Word limit
  const limit = section.word_limit
  if (limit) {
    if (wc > limit * 1.05) issues.push(`Over word limit: ${wc} words (limit: ${limit})`)
    else if (wc < limit * 0.5) suggestions.push(`Section is short (${wc}/${limit} words) — consider expanding`)
    else strengths.push(`Word count is within range (${wc}/${limit})`)
  }

  // Placeholder detection
  const placeholders = (text.match(/\[[^\]]{3,60}\]/g) as string[] || []).filter((p: string) => !p.includes('http'))
  if (placeholders.length > 0) {
    issues.push(`${placeholders.length} unfilled placeholder(s): ${placeholders.slice(0, 3).join(', ')}`)
  }

  // Data/evidence signals
  if (/\d+%|\$[\d,]+|per 100,000|\d{1,3}(,\d{3})+ (people|residents|individuals|families|clients)/.test(text)) {
    strengths.push('Contains quantitative evidence')
  } else {
    suggestions.push('Add statistics or data to strengthen the case')
  }

  // Source citations
  if (/\(source:|census|ACS|BLS|state|CDC|HHS|according to/i.test(text)) {
    strengths.push('References external data sources')
  } else if (section.section_key === 'problem_statement' || section.section_key === 'community_needs') {
    suggestions.push('Cite data sources (Census, state health data, etc.) for credibility')
  }

  // Funder priority alignment
  if (rfpContext.funder_name) {
    const funder = rfpContext.funder_name.toLowerCase()
    if (funder.includes('hud') || funder.includes('cdbg')) {
      if (!/lmi|low.?.?moderate|50th percentile|51%/.test(text)) suggestions.push('Mention LMI percentage or low/moderate income qualification')
    }
    if (funder.includes('samhsa')) {
      if (!/evidence.?based|CARF|licensed|medication.?assisted|MAT/.test(text)) suggestions.push('Reference evidence-based treatment models or clinical credentials')
    }
    if (funder.includes('rwjf') || funder.includes('robert wood johnson')) {
      if (!/equity|structural|disparit|community.?led|lived experience/.test(text.toLowerCase())) suggestions.push('Strengthen equity framing and community voice')
    }
  }

  // Passive voice warning
  const passiveCount = (text.match(/\b(is|are|was|were|be|been|being)\s+\w+ed\b/g) || []).length
  if (passiveCount > 5) suggestions.push(`Heavy passive voice (${passiveCount} instances) — try active voice for stronger prose`)

  // Vague language
  if (/will try to|hope to|intend to|aim to/i.test(text)) suggestions.push('Replace tentative language ("will try to") with confident commitments')

  // Calculate score
  let score = 70
  score -= issues.length * 10
  score += strengths.length * 5
  score -= suggestions.length * 3
  score = Math.max(0, Math.min(100, score))

  const grade = score >= 80 ? 'pass' : score >= 60 ? 'warning' : 'fail'
  const alignment_notes = `${rfpContext.funder_name || 'General funder'} — ${placeholders.length === 0 ? 'No unfilled placeholders' : `${placeholders.length} placeholder(s) remaining`}`

  return { score, grade, issues, suggestions, strengths, alignment_notes }
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function NarrativeWorkspace({ applicationId, rfpDocumentId, sections, existingNarratives, pilotConfig, rfpContext }: Props) {
  const [activeSection, setActiveSection] = useState<string>(sections[0]?.section_key || '')
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const n of existingNarratives) {
      if (!init[n.section_key] || n.version > (existingNarratives.find(x => x.section_key === n.section_key && x.version > n.version) ? 0 : -1)) {
        init[n.section_key] = n.content_md || ''
      }
    }
    return init
  })
  const [narrativeIds, setNarrativeIds] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const n of existingNarratives) init[n.section_key] = n.id
    return init
  })
  const [versions, setVersions] = useState<Record<string, Version[]>>({})
  const [qaResults, setQaResults] = useState<Record<string, QAResult>>({})
  const [generating, setGenerating] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Record<string, number>>({})
  const [showVersions, setShowVersions] = useState(false)
  const [showQA, setShowQA] = useState(false)
  const [qaRunning, setQaRunning] = useState(false)
  const [generatedNotice, setGeneratedNotice] = useState<string | null>(null)
  const [enhancing, setEnhancing] = useState(false)
  const [showEnhanceMenu, setShowEnhanceMenu] = useState(false)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const currentSection = sections.find(s => s.section_key === activeSection)
  const currentText = drafts[activeSection] || ''
  const wordCount = countWords(currentText)
  const wordLimit = currentSection?.word_limit
  const wordPct = wordLimit ? Math.min((wordCount / wordLimit) * 100, 110) : null

  // Auto-save on typing (2s debounce)
  const scheduleAutoSave = useCallback((sectionKey: string, text: string) => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(() => { saveDraft(sectionKey, text, 'autosave') }, 2000)
  }, [])

  const onTextChange = (value: string) => {
    setDrafts(prev => ({ ...prev, [activeSection]: value }))
    scheduleAutoSave(activeSection, value)
  }

  // Save draft to DB
  const saveDraft = async (sectionKey: string, text: string, changeType = 'edit') => {
    setSaving(sectionKey)
    const section = sections.find(s => s.section_key === sectionKey)
    const existingId = narrativeIds[sectionKey]
    const body = {
      application_id: applicationId,
      section_key: sectionKey,
      section_title: section?.title || section?.section_title || sectionKey,
      content_md: text,
      word_count: countWords(text),
      word_limit: section?.word_limit || null,
      change_type: changeType,
      narrative_id: existingId || null,
    }
    const r = await fetch('/api/narrative/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (r.ok) {
      const d = await r.json()
      if (d.id) setNarrativeIds(prev => ({ ...prev, [sectionKey]: d.id }))
      setSavedAt(prev => ({ ...prev, [sectionKey]: Date.now() }))
    }
    setSaving(null)
  }

  // Generate via streaming narrative endpoint
  const generate = async () => {
    if (!currentSection) return
    setGenerating(activeSection)
    setGeneratedNotice(null)
    try {
      const r = await fetch('/api/narrative/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_key: activeSection,
          section_title: currentSection.title || currentSection.section_title,
          rfp_document_id: rfpDocumentId,
          application_id: applicationId,
          tone: 'professional',
          streaming: true,
        }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        setGeneratedNotice(`❌ Generation failed: ${err.error || r.statusText}`)
        setGenerating(null)
        return
      }
      // Stream the response
      const reader = r.body?.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      setDrafts(prev => ({ ...prev, [activeSection]: '' }))
      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setDrafts(prev => ({ ...prev, [activeSection]: accumulated }))
      }
      if (accumulated) {
        await saveDraft(activeSection, accumulated, 'ai_generate')
        setGeneratedNotice(`✓ Generated via Grant Pilot AI — ${accumulated.split(/\s+/).length} words`)
      }
    } catch (err) {
      setGeneratedNotice(`❌ Error: ${String(err)}`)
    }
    setGenerating(null)
  }

  // QA reviewer pass
  const runQA = async () => {
    if (!currentText || !currentSection) return
    setQaRunning(true)
    const existingId = narrativeIds[activeSection]

    // Call server-side dual-pass QA
    const r = await fetch('/api/narrative/qa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        narrative_id: existingId || null,
        content: currentText,
        section_key: activeSection,
        section_title: currentSection.title,
        word_limit: currentSection.word_limit,
        funder_type: rfpContext?.funder_type || 'federal',
      }),
    })

    if (r.ok) {
      const { result } = await r.json()
      // Map dual-pass result to local QAResult format
      const mapped: QAResult = {
        score: result.combined_score,
        grade: result.combined_grade === 'A' || result.combined_grade === 'B' ? 'pass' : result.combined_grade === 'C' ? 'warning' : 'fail',
        issues: [
          ...result.style.issues.map((i: { type: string; message: string; suggestion?: string }) => ({ type: i.type, message: `[Style] ${i.message}`, fix: i.suggestion })),
          ...result.compliance.issues.map((i: { type: string; message: string; suggestion?: string }) => ({ type: i.type, message: `[Compliance] ${i.message}`, fix: i.suggestion })),
        ],
        suggestions: [...result.style.suggestions, ...result.compliance.suggestions],
        strengths: [
          ...result.style.strengths.map((s: { message: string }) => s.message),
          ...result.compliance.strengths.map((s: { message: string }) => s.message),
        ],
        alignment_notes: [
          `Style: ${result.style.score}/100 (${result.style.grade}) — ${result.style.checks_passed}/${result.style.checks_run} checks passed`,
          `Compliance: ${result.compliance.score}/100 (${result.compliance.grade}) — ${result.compliance.checks_passed}/${result.compliance.checks_run} checks passed`,
          result.ready_for_submission ? '✅ Ready for submission' : `⚠️ ${result.blocking_issues.length} blocking issue(s) must be resolved`,
        ].join(' | '),
      }
      setQaResults(prev => ({ ...prev, [activeSection]: mapped }))
    } else {
      // Fallback to client heuristic
      const result = runHeuristicQA(currentText, currentSection, rfpContext)
      setQaResults(prev => ({ ...prev, [activeSection]: result }))
    }
    setShowQA(true)
    setQaRunning(false)
  }

  // Load version history
  // AI Enhance narrative
  const enhance = async (enhancementType = 'full') => {
    if (!currentText || currentText.length < 50) return
    setEnhancing(true)
    setShowEnhanceMenu(false)
    try {
      const nid = narrativeIds[activeSection]
      const res = await fetch('/api/narrative/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          narrative_id: nid || undefined,
          content: currentText,
          section_key: activeSection,
          section_title: currentSection?.title || currentSection?.section_title,
          rfp_document_id: rfpDocumentId,
          application_id: applicationId,
          enhancement_type: enhancementType,
          word_limit: wordLimit,
          streaming: true,
        }),
      })
      if (!res.ok || !res.body) throw new Error('Enhance failed')
      // Stream the enhanced text
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let enhanced = ''
      setDrafts(prev => ({ ...prev, [activeSection]: '' }))
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        enhanced += decoder.decode(value, { stream: true })
        setDrafts(prev => ({ ...prev, [activeSection]: enhanced }))
      }
      // Save final version
      if (enhanced.length > 10) {
        await saveDraft(activeSection, enhanced, 'ai_enhance')
      }
    } catch (e) {
      console.error('Enhance error:', e)
    } finally {
      setEnhancing(false)
    }
  }

  const loadVersions = async () => {
    const nid = narrativeIds[activeSection]
    if (!nid) return
    const r = await fetch(`/api/narrative/versions?narrative_id=${nid}`)
    if (r.ok) {
      const d = await r.json()
      setVersions(prev => ({ ...prev, [activeSection]: d.versions || [] }))
      setShowVersions(true)
    }
  }

  const restoreVersion = (v: Version) => {
    setDrafts(prev => ({ ...prev, [activeSection]: v.content_md }))
    setShowVersions(false)
    scheduleAutoSave(activeSection, v.content_md)
  }

  const qaResult = qaResults[activeSection]
  const sectionStatus = (sectionKey: string) => {
    const text = drafts[sectionKey] || ''
    if (!text) return 'empty'
    const wc = countWords(text)
    const section = sections.find(s => s.section_key === sectionKey)
    if (section?.word_limit && wc < section.word_limit * 0.3) return 'draft'
    return qaResults[sectionKey]?.grade === 'pass' ? 'approved' : 'draft'
  }

  const completedCount = sections.filter(s => sectionStatus(s.section_key) !== 'empty').length
  const completionPct = Math.round((completedCount / sections.length) * 100)

  return (
    <div className="max-w-6xl mx-auto flex gap-0">
      {/* Section sidebar */}
      <div className="w-64 flex-shrink-0 bg-white border-r border-gray-200 min-h-[calc(100vh-120px)] p-4">
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Sections complete</span>
            <span className="font-medium">{completedCount}/{sections.length}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${completionPct}%` }} />
          </div>
        </div>

        <nav className="space-y-1">
          {sections.map(s => {
            const status = sectionStatus(s.section_key)
            const isActive = s.section_key === activeSection
            const wc = countWords(drafts[s.section_key] || '')
            return (
              <button
                key={s.section_key}
                onClick={() => { setActiveSection(s.section_key); setShowVersions(false); setShowQA(false) }}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-indigo-50 text-indigo-900 border border-indigo-200' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-medium truncate">{s.title || s.section_title || s.section_key}</span>
                  <span className={`text-xs flex-shrink-0 ${STATUS_COLORS[status]}`}>
                    {status === 'empty' ? '○' : status === 'approved' ? '✓' : '●'}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-gray-400">{s.req_type}</span>
                  <span className="text-xs text-gray-400">
                    {wc > 0 ? `${wc}w` : ''}
                    {s.word_limit ? `/${s.word_limit}` : ''}
                  </span>
                </div>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Editor main area */}
      <div className="flex-1 flex flex-col">
        {/* Section header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-gray-900">
              {currentSection?.title || currentSection?.section_title || activeSection.replace(/_/g, ' ')}
            </h2>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
              {wordLimit && (
                <span className={wordCount > wordLimit * 1.05 ? 'text-red-600 font-medium' : wordCount > wordLimit * 0.9 ? 'text-yellow-700' : 'text-gray-500'}>
                  {wordCount.toLocaleString()} / {wordLimit.toLocaleString()} words
                </span>
              )}
              {!wordLimit && wordCount > 0 && <span>{wordCount.toLocaleString()} words</span>}
              {currentSection?.scoring_points && <span className="text-green-700 font-medium">{currentSection.scoring_points} pts</span>}
              {saving === activeSection && <span className="text-gray-400">Saving...</span>}
              {savedAt[activeSection] && saving !== activeSection && (
                <span className="text-gray-400">Saved {Math.round((Date.now() - savedAt[activeSection]) / 1000)}s ago</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadVersions} className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50">
              History
            </button>
            <button
              onClick={runQA}
              disabled={qaRunning || !currentText}
              className="text-xs border border-blue-300 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 disabled:opacity-40"
            >
              {qaRunning ? '⟳ Reviewing...' : '🔍 QA Review'}
            </button>
            {/* AI Enhance button with dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowEnhanceMenu(prev => !prev)}
                disabled={enhancing || !currentText}
                className="text-xs border border-purple-300 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-50 disabled:opacity-40 flex items-center gap-1"
              >
                {enhancing ? '✨ Enhancing...' : '✨ Enhance'}
                {!enhancing && <span className="text-purple-400">▾</span>}
              </button>
              {showEnhanceMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-44 py-1">
                  {[
                    { key: 'full', label: '✨ Full Enhancement' },
                    { key: 'tone', label: '🗣️ Improve Tone' },
                    { key: 'evidence', label: '📊 Strengthen Evidence' },
                    { key: 'structure', label: '📋 Improve Structure' },
                    { key: 'concise', label: '✂️ Make Concise' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => enhance(opt.key)}
                      className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-purple-50 hover:text-purple-800"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={generate}
              disabled={!!generating}
              className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {generating === activeSection ? (
                <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />Generating...</>
              ) : (
                <>⚡ Generate</>
              )}
            </button>
          </div>
        </div>

        {/* Word limit bar */}
        {wordPct !== null && (
          <div className="bg-white border-b border-gray-100 px-6 py-1">
            <div className="w-full bg-gray-100 rounded-full h-1">
              <div
                className={`h-1 rounded-full transition-all ${wordPct > 105 ? 'bg-red-500' : wordPct > 90 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(wordPct, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Generated notice */}
        {generatedNotice && (
          <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-2 text-xs text-indigo-700 flex items-center justify-between">
            <span>{generatedNotice}</span>
            <button onClick={() => setGeneratedNotice(null)} className="text-indigo-400 hover:text-indigo-600">×</button>
          </div>
        )}

        <div className="flex flex-1 gap-0">
          {/* Editor */}
          <div className="flex-1 p-6">
            <textarea
              ref={textareaRef}
              value={currentText}
              onChange={e => onTextChange(e.target.value)}
              className="w-full h-full min-h-[60vh] resize-none text-sm text-gray-800 leading-relaxed focus:outline-none bg-transparent font-serif"
              placeholder={`Write the ${currentSection?.title || activeSection.replace(/_/g, ' ')} section here, or click ⚡ Generate to let the AI Pilot create a first draft...`}
              style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '14px', lineHeight: '1.8' }}
            />
          </div>

          {/* Side panels */}
          {(showVersions || showQA) && (
            <div className="w-80 border-l border-gray-200 bg-white p-4 overflow-y-auto max-h-[calc(100vh-200px)]">
              {showVersions && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm text-gray-900">Version History</h3>
                    <button onClick={() => setShowVersions(false)} className="text-gray-400 hover:text-gray-600">×</button>
                  </div>
                  {(versions[activeSection] || []).length === 0 ? (
                    <p className="text-xs text-gray-400">No saved versions yet</p>
                  ) : (
                    <div className="space-y-2">
                      {(versions[activeSection] || []).map(v => (
                        <div key={v.id} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-900">v{v.version}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${v.change_type === 'ai_generate' ? 'bg-purple-50 text-purple-700' : v.change_type === 'autosave' ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-700'}`}>
                              {v.change_type}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{v.word_count} words · {new Date(v.created_at).toLocaleString()}</div>
                          {v.change_summary && <div className="text-xs text-gray-400 mt-1">{v.change_summary}</div>}
                          <button
                            onClick={() => restoreVersion(v)}
                            className="text-xs text-indigo-600 hover:underline mt-1"
                          >
                            Restore this version
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {showQA && qaResult && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm text-gray-900">QA Review</h3>
                    <button onClick={() => setShowQA(false)} className="text-gray-400 hover:text-gray-600">×</button>
                  </div>

                  {/* Score */}
                  <div className={`rounded-xl p-4 mb-3 text-center ${QA_COLORS[qaResult.grade]}`}>
                    <div className="text-3xl font-bold">{qaResult.score}</div>
                    <div className="text-sm font-medium capitalize">{qaResult.grade === 'pass' ? '✓ Looks good' : qaResult.grade === 'warning' ? '~ Needs polish' : '✗ Needs work'}</div>
                  </div>

                  <div className="text-xs text-gray-500 mb-3 pb-3 border-b border-gray-100">{qaResult.alignment_notes}</div>

                  {qaResult.issues.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-red-700 mb-1">Issues ({qaResult.issues.length})</div>
                      {qaResult.issues.map((issue, i) => (
                        <div key={i} className="text-xs text-red-600 mb-1 flex gap-1.5"><span>✗</span><span>{issue}</span></div>
                      ))}
                    </div>
                  )}

                  {qaResult.suggestions.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-yellow-700 mb-1">Suggestions ({qaResult.suggestions.length})</div>
                      {qaResult.suggestions.map((s, i) => (
                        <div key={i} className="text-xs text-yellow-700 mb-1 flex gap-1.5"><span>→</span><span>{s}</span></div>
                      ))}
                    </div>
                  )}

                  {qaResult.strengths.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-green-700 mb-1">Strengths</div>
                      {qaResult.strengths.map((s, i) => (
                        <div key={i} className="text-xs text-green-700 mb-1 flex gap-1.5"><span>✓</span><span>{s}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom status bar */}
        <div className="bg-white border-t border-gray-200 px-6 py-2 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-4">
            <span>{sections.filter(s => sectionStatus(s.section_key) !== 'empty').length}/{sections.length} sections started</span>
            {qaResult && (
              <span className={QA_COLORS[qaResult.grade] + ' px-2 py-0.5 rounded-full'}>
                QA: {qaResult.score}/100
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => saveDraft(activeSection, currentText, 'manual_save')}
              disabled={!currentText || saving === activeSection}
              className="text-gray-500 hover:text-indigo-600"
            >
              Save
            </button>
            <span>·</span>
            <span>Auto-saves every 2s</span>
          </div>
        </div>
      </div>
    </div>
  )
}
