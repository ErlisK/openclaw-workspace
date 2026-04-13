'use client'
import { useState, useEffect, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface CorrectionLetter {
  id: string
  created_at: string
  project_id: string
  quote_id: string | null
  uploaded_by: string
  uploader_role: string
  file_url: string
  file_name: string
  file_size_bytes: number | null
  mime_type: string | null
  correction_date: string | null
  case_number: string | null
  status: string
  raw_text: string | null
  extraction_model: string | null
  extracted_at: string | null
  notes: string | null
}

interface FieldTag {
  id: string
  created_at: string
  correction_letter_id: string
  project_id: string
  field_key: string
  field_label: string
  original_value: string | null
  corrected_value: string | null
  correction_note: string
  severity: 'required' | 'advisory'
  source: string
  resolved: boolean
  resolved_at: string | null
  resolved_by: string | null
}

const STATUS_COLORS: Record<string, string> = {
  pending_review: 'bg-yellow-100 text-yellow-800',
  extracting:     'bg-blue-100 text-blue-800',
  extracted:      'bg-purple-100 text-purple-800',
  tagged:         'bg-indigo-100 text-indigo-800',
  resolved:       'bg-green-100 text-green-800',
}

const KNOWN_FIELDS = [
  { key: 'impervious_cover_pct', label: 'Impervious Cover %' },
  { key: 'setback_front',        label: 'Front Setback' },
  { key: 'setback_rear',         label: 'Rear Setback' },
  { key: 'setback_side',         label: 'Side Setback' },
  { key: 'lot_area_sqft',        label: 'Lot Area (sq ft)' },
  { key: 'proposed_sqft',        label: 'ADU Sq Ft' },
  { key: 'max_height_ft',        label: 'Max Height (ft)' },
  { key: 'utility_connection',   label: 'Utility Connection' },
  { key: 'zoning',               label: 'Zoning District' },
  { key: 'site_plan',            label: 'Site Plan' },
  { key: 'floor_plan',           label: 'Floor Plan' },
  { key: 'elevation',            label: 'Elevations' },
  { key: 'tree_survey',          label: 'Tree Survey' },
  { key: 'drainage',             label: 'Drainage' },
  { key: 'owner_name',           label: 'Owner Name' },
  { key: 'contractor_license',   label: 'Contractor License' },
  { key: 'unknown',              label: 'Other / Unknown' },
]

interface Props {
  projectId: string
  userEmail: string
  userRole?: string
  quoteId?: string
}

export default function CorrectionCapture({ projectId, userEmail, userRole = 'pro', quoteId }: Props) {
  const [letters, setLetters]     = useState<CorrectionLetter[]>([])
  const [tags, setTags]           = useState<FieldTag[]>([])
  const [loading, setLoading]     = useState(true)
  const [expanded, setExpanded]   = useState<string | null>(null)

  // Upload form state
  const [showUpload, setShowUpload]     = useState(false)
  const [file, setFile]                 = useState<File | null>(null)
  const [rawText, setRawText]           = useState('')
  const [caseNumber, setCaseNumber]     = useState('')
  const [uploading, setUploading]       = useState(false)
  const [uploadMsg, setUploadMsg]       = useState('')

  // Manual tag form state
  const [addTagForLetter, setAddTagForLetter] = useState<string | null>(null)
  const [tagField, setTagField]   = useState(KNOWN_FIELDS[0].key)
  const [tagNote, setTagNote]     = useState('')
  const [tagOrig, setTagOrig]     = useState('')
  const [tagFixed, setTagFixed]   = useState('')
  const [tagSev, setTagSev]       = useState<'required' | 'advisory'>('required')
  const [savingTag, setSavingTag] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/corrections?project_id=${projectId}`)
      const d = await res.json()
      setLetters(d.letters ?? [])
      setTags(d.tags ?? [])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const upload = async () => {
    setUploading(true)
    setUploadMsg('')
    try {
      const fd = new FormData()
      fd.append('project_id', projectId)
      fd.append('uploaded_by', userEmail)
      fd.append('uploader_role', userRole)
      if (quoteId) fd.append('quote_id', quoteId)
      if (caseNumber) fd.append('case_number', caseNumber)
      if (rawText) fd.append('raw_text', rawText)
      if (file) fd.append('file', file)

      const res = await fetch('/api/corrections', { method: 'POST', body: fd })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)

      setUploadMsg(`✅ Uploaded. ${d.extracted} field tags auto-extracted.`)
      setFile(null); setRawText(''); setCaseNumber(''); setShowUpload(false)
      load()
    } catch (e: unknown) {
      setUploadMsg(`❌ ${(e as Error).message}`)
    } finally {
      setUploading(false)
    }
  }

  const resolveTag = async (tagId: string) => {
    await fetch('/api/corrections', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resolve_tag', tag_id: tagId, resolved_by: userEmail }),
    })
    setTags(prev => prev.map(t => t.id === tagId ? { ...t, resolved: true } : t))
  }

  const addManualTag = async () => {
    if (!addTagForLetter || !tagNote) return
    setSavingTag(true)
    try {
      const field = KNOWN_FIELDS.find(f => f.key === tagField)
      const res = await fetch('/api/corrections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_tag',
          letter_id: addTagForLetter,
          project_id: projectId,
          field_key: tagField,
          field_label: field?.label ?? tagField,
          correction_note: tagNote,
          severity: tagSev,
          original_value: tagOrig || null,
          corrected_value: tagFixed || null,
        }),
      })
      const d = await res.json()
      setTags(prev => [...prev, d])
      setAddTagForLetter(null)
      setTagNote(''); setTagOrig(''); setTagFixed('')
    } finally {
      setSavingTag(false)
    }
  }

  const openTags  = tags.filter(t => !t.resolved)
  const closedTags = tags.filter(t => t.resolved)

  if (loading) return <div className="text-sm text-gray-400 py-4">Loading corrections…</div>

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <span className="text-sm font-semibold text-gray-800">Correction Letters ({letters.length})</span>
          {openTags.length > 0 && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
              {openTags.length} open issue{openTags.length > 1 ? 's' : ''}
            </span>
          )}
          {closedTags.length > 0 && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              {closedTags.length} resolved
            </span>
          )}
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium"
        >
          + Upload Correction Letter
        </button>
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="bg-gray-50 border-2 border-dashed border-blue-300 rounded-xl p-5 space-y-3">
          <div className="font-semibold text-gray-800 text-sm">Upload DSD Correction Letter</div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">PDF / Image File</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.txt"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-xs text-gray-600 file:mr-2 file:text-xs file:border file:rounded file:px-2 file:py-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">DSD Case Number (optional)</label>
              <input
                value={caseNumber}
                onChange={e => setCaseNumber(e.target.value)}
                placeholder="e.g. 2026-123456"
                className="mt-1 w-full border rounded px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">
              Paste correction letter text (for AI extraction)
              <span className="text-gray-400 font-normal ml-1">— copy-paste from DSD email or PDF</span>
            </label>
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              rows={6}
              placeholder="Paste the full text of the correction notice here. The system will automatically identify which form fields need correction…"
              className="mt-1 w-full border rounded px-3 py-2 text-sm font-mono resize-none focus:ring-2 focus:ring-blue-400 outline-none"
            />
            {rawText && (
              <p className="text-xs text-blue-600 mt-1">
                ✨ Auto-extraction enabled — {rawText.split('\n').filter(l => l.trim()).length} lines to analyze
              </p>
            )}
          </div>

          <div className="flex gap-2 items-center">
            <button
              onClick={upload}
              disabled={uploading || (!file && !rawText)}
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {uploading ? 'Uploading…' : 'Upload & Extract'}
            </button>
            <button onClick={() => setShowUpload(false)} className="text-sm text-gray-500 hover:text-gray-700 px-2">Cancel</button>
            {uploadMsg && <span className="text-xs text-gray-700">{uploadMsg}</span>}
          </div>
        </div>
      )}

      {/* Open issues summary */}
      {openTags.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="font-semibold text-red-800 text-sm mb-2">⚠️ Open Correction Items ({openTags.length})</div>
          <div className="space-y-2">
            {openTags.map(tag => (
              <div key={tag.id} className="flex items-start gap-3 bg-white border border-red-100 rounded-lg p-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-800">{tag.field_label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${tag.severity === 'required' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {tag.severity}
                    </span>
                    <span className="text-xs text-gray-400">{tag.source}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{tag.correction_note}</p>
                  {(tag.original_value || tag.corrected_value) && (
                    <div className="flex gap-3 mt-1 text-xs">
                      {tag.original_value && <span className="text-red-600">Was: <code>{tag.original_value}</code></span>}
                      {tag.corrected_value && <span className="text-green-700">Should be: <code>{tag.corrected_value}</code></span>}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => resolveTag(tag.id)}
                  className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 shrink-0"
                >
                  Resolve ✓
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Letters list */}
      {letters.length > 0 ? (
        <div className="space-y-3">
          {letters.map(letter => {
            const letterTags = tags.filter(t => t.correction_letter_id === letter.id)
            const openCount = letterTags.filter(t => !t.resolved).length
            const isExpanded = expanded === letter.id
            return (
              <div key={letter.id} className="bg-white border rounded-xl overflow-hidden">
                {/* Letter header */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
                  onClick={() => setExpanded(isExpanded ? null : letter.id)}
                >
                  <span className="text-2xl">📄</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-800">{letter.file_name}</span>
                      {letter.case_number && (
                        <span className="text-xs text-gray-500 font-mono">#{letter.case_number}</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[letter.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {letter.status.replace('_', ' ')}
                      </span>
                      {openCount > 0 && (
                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">{openCount} open</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {letter.uploader_role} · {new Date(letter.created_at).toLocaleDateString()}
                      {letter.file_url && (
                        <a href={letter.file_url} target="_blank" rel="noopener" className="ml-2 text-blue-500 hover:underline">
                          View file ↗
                        </a>
                      )}
                    </div>
                  </div>
                  <span className="text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                </button>

                {/* Expanded: tags + add tag form */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-3 space-y-3">
                    {/* Extracted text preview */}
                    {letter.raw_text && (
                      <div>
                        <div className="text-xs font-semibold text-gray-600 mb-1">
                          Correction Letter Text
                          {letter.extraction_model && <span className="text-gray-400 font-normal ml-1">(extracted by {letter.extraction_model})</span>}
                        </div>
                        <pre className="text-xs text-gray-700 bg-gray-50 rounded p-3 whitespace-pre-wrap max-h-40 overflow-y-auto border">
                          {letter.raw_text}
                        </pre>
                      </div>
                    )}

                    {/* Tagged fields */}
                    {letterTags.length > 0 ? (
                      <div>
                        <div className="text-xs font-semibold text-gray-600 mb-2">
                          Tagged Fields ({letterTags.length})
                        </div>
                        <div className="space-y-2">
                          {letterTags.map(tag => (
                            <div key={tag.id} className={`flex items-start gap-2 rounded-lg p-2.5 border text-xs ${tag.resolved ? 'bg-green-50 border-green-200 opacity-60' : 'bg-white border-gray-200'}`}>
                              <span>{tag.resolved ? '✅' : tag.severity === 'required' ? '🔴' : '🟡'}</span>
                              <div className="flex-1">
                                <span className="font-semibold">{tag.field_label}</span>
                                <span className="text-gray-400 ml-2 font-mono text-xs">{tag.field_key}</span>
                                <p className="text-gray-600 mt-0.5">{tag.correction_note}</p>
                                {(tag.original_value || tag.corrected_value) && (
                                  <div className="flex gap-3 mt-0.5">
                                    {tag.original_value && <span className="text-red-600">Was: <code>{tag.original_value}</code></span>}
                                    {tag.corrected_value && <span className="text-green-700">Fix: <code>{tag.corrected_value}</code></span>}
                                  </div>
                                )}
                              </div>
                              {!tag.resolved && (
                                <button onClick={() => resolveTag(tag.id)} className="shrink-0 text-xs text-green-600 hover:text-green-800 border border-green-300 rounded px-1.5 py-0.5">✓</button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 italic">No field tags yet. Add one below.</div>
                    )}

                    {/* Add manual tag */}
                    {addTagForLetter === letter.id ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                        <div className="text-xs font-semibold text-blue-800">Add Field Tag</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-600">Field</label>
                            <select value={tagField} onChange={e => setTagField(e.target.value)} className="mt-0.5 w-full border rounded px-2 py-1.5 text-xs">
                              {KNOWN_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Severity</label>
                            <select value={tagSev} onChange={e => setTagSev(e.target.value as 'required' | 'advisory')} className="mt-0.5 w-full border rounded px-2 py-1.5 text-xs">
                              <option value="required">Required fix</option>
                              <option value="advisory">Advisory</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Original value</label>
                            <input value={tagOrig} onChange={e => setTagOrig(e.target.value)} placeholder="What was submitted" className="mt-0.5 w-full border rounded px-2 py-1.5 text-xs" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Corrected value</label>
                            <input value={tagFixed} onChange={e => setTagFixed(e.target.value)} placeholder="What it should be" className="mt-0.5 w-full border rounded px-2 py-1.5 text-xs" />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">DSD comment / note *</label>
                          <textarea value={tagNote} onChange={e => setTagNote(e.target.value)} rows={2} placeholder="Paste the DSD comment about this field…" className="mt-0.5 w-full border rounded px-2 py-1.5 text-xs resize-none" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={addManualTag} disabled={savingTag || !tagNote} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50 font-medium">
                            {savingTag ? 'Saving…' : 'Add Tag'}
                          </button>
                          <button onClick={() => setAddTagForLetter(null)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAddTagForLetter(letter.id); setTagNote(''); setTagOrig(''); setTagFixed('') }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        + Tag a field manually
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        !showUpload && (
          <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
            <div className="text-3xl mb-2">📋</div>
            <div className="text-sm font-medium text-gray-500">No correction letters yet</div>
            <div className="text-xs text-gray-400 mt-1">Upload a DSD correction letter to tag fields and track issues</div>
          </div>
        )
      )}

      {/* Resolved items collapsed */}
      {closedTags.length > 0 && (
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer hover:text-gray-700 font-medium">
            {closedTags.length} resolved item{closedTags.length > 1 ? 's' : ''}
          </summary>
          <div className="mt-2 space-y-1">
            {closedTags.map(tag => (
              <div key={tag.id} className="flex items-center gap-2 py-1 opacity-50">
                <span>✅</span>
                <span className="font-medium">{tag.field_label}</span>
                <span className="text-gray-400">— {tag.correction_note.substring(0, 80)}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
