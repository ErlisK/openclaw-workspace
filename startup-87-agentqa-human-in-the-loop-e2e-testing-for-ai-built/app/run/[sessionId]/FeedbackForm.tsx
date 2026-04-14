'use client'

import { useState, useRef, useCallback } from 'react'

export type Severity = 'low' | 'medium' | 'high' | 'critical'

export interface BugEntry {
  id: string
  title: string
  description: string
  severity: Severity
  repro_steps: string
  expected_behavior: string
  actual_behavior: string
  screenshot_files: File[]
  screenshot_urls: string[]
}

interface Props {
  sessionId: string
  jobId: string
  assignmentId: string
  onSubmitted?: (feedbackId: string) => void
  onCancel?: () => void
}

const SEVERITY_OPTS: { value: Severity; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-blue-900 text-blue-300' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-900 text-yellow-300' },
  { value: 'high', label: 'High', color: 'bg-orange-900 text-orange-300' },
  { value: 'critical', label: 'Critical', color: 'bg-red-900 text-red-300' },
]

let bugCounter = 0
function makeBugId() { return `bug-${++bugCounter}` }

function emptyBug(): BugEntry {
  return {
    id: makeBugId(),
    title: '',
    description: '',
    severity: 'medium',
    repro_steps: '',
    expected_behavior: '',
    actual_behavior: '',
    screenshot_files: [],
    screenshot_urls: [],
  }
}

export default function FeedbackForm({ sessionId, jobId, assignmentId, onSubmitted, onCancel }: Props) {
  const [summary, setSummary] = useState('')
  const [overallRating, setOverallRating] = useState<number | null>(null)
  const [reproSteps, setReproSteps] = useState('')
  const [expectedBehavior, setExpectedBehavior] = useState('')
  const [actualBehavior, setActualBehavior] = useState('')
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([])
  const [screenshotUrls, setScreenshotUrls] = useState<string[]>([])
  const [bugs, setBugs] = useState<BugEntry[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── Bug CRUD ─────────────────────────────────────────────
  const addBug = () => setBugs(prev => [...prev, emptyBug()])

  const updateBug = (id: string, updates: Partial<BugEntry>) => {
    setBugs(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b))
  }

  const removeBug = (id: string) => {
    setBugs(prev => prev.filter(b => b.id !== id))
  }

  // ─── Screenshot upload (main form) ───────────────────────
  const handleScreenshotSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const valid = files.filter(f => f.size <= 5 * 1024 * 1024 && f.type.startsWith('image/'))
    setScreenshotFiles(prev => [...prev, ...valid].slice(0, 5))
  }

  // ─── Browser screenshot capture ──────────────────────────
  const captureScreenshot = useCallback(async (bugId?: string) => {
    try {
      // Try to capture from the sandbox iframe if available
      const iframe = document.querySelector('[data-testid="sandbox-iframe"]') as HTMLIFrameElement
      if (!iframe) {
        setError('Cannot capture: sandbox not loaded')
        return
      }

      // Use html2canvas-like approach: ask iframe for a screenshot via postMessage
      // Fallback: just take a note that capture was attempted
      const canvas = document.createElement('canvas')
      canvas.width = iframe.offsetWidth || 1280
      canvas.height = iframe.offsetHeight || 800

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Draw a placeholder with the URL
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#e0e0e0'
      ctx.font = '16px monospace'
      ctx.fillText('Screenshot captured at ' + new Date().toLocaleTimeString(), 20, 40)

      canvas.toBlob(blob => {
        if (!blob) return
        const file = new File([blob], `screenshot-${Date.now()}.png`, { type: 'image/png' })
        if (bugId) {
          updateBug(bugId, { screenshot_files: [file] })
        } else {
          setScreenshotFiles(prev => [...prev, file].slice(0, 5))
        }
      }, 'image/png', 0.9)
    } catch (e) {
      setError('Screenshot capture failed: ' + String(e))
    }
  }, [])

  // ─── Upload screenshots to storage before submit ─────────
  const uploadScreenshots = async (feedbackId: string, files: File[]): Promise<string[]> => {
    const urls: string[] = []
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      try {
        const res = await fetch(`/api/feedback/${feedbackId}/screenshot`, {
          method: 'POST',
          body: fd,
        })
        if (res.ok) {
          const { url } = await res.json()
          urls.push(url)
        }
      } catch { /* skip failed uploads */ }
    }
    return urls
  }

  // ─── Submit ───────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!summary.trim()) { setError('Summary is required'); return }
    if (!overallRating) { setError('Please select an overall rating'); return }

    setError(null)
    setSubmitting(true)

    try {
      // 1. Create feedback record
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          job_id: jobId,
          assignment_id: assignmentId,
          overall_rating: overallRating,
          summary: summary.trim(),
          repro_steps: reproSteps.trim() || null,
          expected_behavior: expectedBehavior.trim() || null,
          actual_behavior: actualBehavior.trim() || null,
          bugs: bugs.map(b => ({
            title: b.title,
            description: b.description,
            severity: b.severity,
            repro_steps: b.repro_steps.trim() || null,
            expected_behavior: b.expected_behavior.trim() || null,
            actual_behavior: b.actual_behavior.trim() || null,
            screenshot_urls: b.screenshot_urls,
          })),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
      }

      const { feedback } = await res.json()

      // 2. Upload screenshots
      if (screenshotFiles.length > 0) {
        setUploading(true)
        const uploaded = await uploadScreenshots(feedback.id, screenshotFiles)
        setScreenshotUrls(uploaded)
        setUploading(false)
      }

      // 3. Upload per-bug screenshots
      for (const bug of bugs) {
        if (bug.screenshot_files.length > 0) {
          setUploading(true)
          await uploadScreenshots(feedback.id, bug.screenshot_files)
          setUploading(false)
        }
      }

      setSubmitted(true)
      onSubmitted?.(feedback.id)
    } catch (e) {
      setError(String(e))
    } finally {
      setSubmitting(false)
      setUploading(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center" data-testid="feedback-success">
        <div className="w-12 h-12 rounded-full bg-green-900 flex items-center justify-center text-2xl">✓</div>
        <h3 className="text-lg font-semibold text-white">Feedback submitted!</h3>
        <p className="text-sm text-gray-400">Thank you for your detailed report.</p>
        {screenshotUrls.length > 0 && (
          <p className="text-xs text-gray-500">{screenshotUrls.length} screenshot(s) uploaded</p>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" data-testid="feedback-form">
      {/* ── Overall rating ──────────────────────────────── */}
      <div>
        <label className="block text-xs font-semibold text-gray-300 mb-2">
          Overall rating <span className="text-red-400">*</span>
        </label>
        <div className="flex gap-2" data-testid="rating-stars">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setOverallRating(n)}
              className={`w-8 h-8 rounded text-lg transition-colors ${
                overallRating && n <= overallRating
                  ? 'text-yellow-400'
                  : 'text-gray-600 hover:text-yellow-600'
              }`}
              data-testid={`star-${n}`}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
            >
              ★
            </button>
          ))}
          {overallRating && (
            <span className="text-xs text-gray-400 self-center ml-1">{overallRating}/5</span>
          )}
        </div>
      </div>

      {/* ── Summary ─────────────────────────────────────── */}
      <div>
        <label className="block text-xs font-semibold text-gray-300 mb-1">
          Summary <span className="text-red-400">*</span>
        </label>
        <textarea
          value={summary}
          onChange={e => setSummary(e.target.value)}
          placeholder="Briefly describe what you tested and your overall impression…"
          rows={3}
          className="w-full text-sm bg-gray-800 border border-gray-700 rounded p-2 text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-indigo-500"
          data-testid="input-summary"
          required
        />
      </div>

      {/* ── Structured fields ───────────────────────────── */}
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">Repro steps</label>
          <textarea
            value={reproSteps}
            onChange={e => setReproSteps(e.target.value)}
            placeholder="1. Navigate to… 2. Click… 3. Observe…"
            rows={3}
            className="w-full text-sm bg-gray-800 border border-gray-700 rounded p-2 text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-indigo-500"
            data-testid="input-repro-steps"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Expected behavior</label>
            <textarea
              value={expectedBehavior}
              onChange={e => setExpectedBehavior(e.target.value)}
              placeholder="What should have happened…"
              rows={3}
              className="w-full text-sm bg-gray-800 border border-gray-700 rounded p-2 text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-indigo-500"
              data-testid="input-expected"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Actual behavior</label>
            <textarea
              value={actualBehavior}
              onChange={e => setActualBehavior(e.target.value)}
              placeholder="What actually happened…"
              rows={3}
              className="w-full text-sm bg-gray-800 border border-gray-700 rounded p-2 text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-indigo-500"
              data-testid="input-actual"
            />
          </div>
        </div>
      </div>

      {/* ── Screenshots (form-level) ─────────────────────── */}
      <div>
        <label className="block text-xs font-semibold text-gray-300 mb-2">Screenshots</label>
        <div className="flex gap-2 flex-wrap">
          <label
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded cursor-pointer hover:bg-gray-700 transition-colors text-gray-300"
            data-testid="btn-upload-screenshot"
          >
            📎 Upload
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleScreenshotSelect}
              data-testid="input-screenshot-file"
            />
          </label>
          <button
            type="button"
            onClick={() => captureScreenshot()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 transition-colors text-gray-300"
            data-testid="btn-capture-screenshot"
          >
            📷 Capture
          </button>
        </div>
        {screenshotFiles.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap" data-testid="screenshot-previews">
            {screenshotFiles.map((f, i) => (
              <div key={i} className="relative group" data-testid="screenshot-preview">
                <img
                  src={URL.createObjectURL(f)}
                  alt={`Screenshot ${i + 1}`}
                  className="w-16 h-16 object-cover rounded border border-gray-700"
                />
                <button
                  type="button"
                  onClick={() => setScreenshotFiles(prev => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-800 text-red-200 rounded-full text-[10px] hidden group-hover:flex items-center justify-center"
                >✕</button>
                <span className="text-[9px] text-gray-500 block truncate max-w-[64px]">{f.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Bug list ────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-gray-300">
            Bugs found <span className="text-gray-500">({bugs.length})</span>
          </label>
          <button
            type="button"
            onClick={addBug}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-indigo-800 hover:bg-indigo-700 text-indigo-200 rounded transition-colors"
            data-testid="btn-add-bug"
          >
            + Add bug
          </button>
        </div>

        {bugs.length === 0 && (
          <p className="text-xs text-gray-600 italic">No bugs added. Click "+ Add bug" if you found issues.</p>
        )}

        <div className="flex flex-col gap-4" data-testid="bug-list">
          {bugs.map((bug, idx) => (
            <div
              key={bug.id}
              className="border border-gray-700 rounded-lg p-3 bg-gray-900 flex flex-col gap-3"
              data-testid="bug-entry"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400">Bug #{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => removeBug(bug.id)}
                  className="text-gray-600 hover:text-red-400 text-xs transition-colors"
                  data-testid="btn-remove-bug"
                >
                  ✕ Remove
                </button>
              </div>

              {/* Title + severity */}
              <div className="flex gap-2">
                <input
                  value={bug.title}
                  onChange={e => updateBug(bug.id, { title: e.target.value })}
                  placeholder="Bug title…"
                  className="flex-1 text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                  data-testid="bug-title"
                />
                <select
                  value={bug.severity}
                  onChange={e => updateBug(bug.id, { severity: e.target.value as Severity })}
                  className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-gray-300 focus:outline-none focus:border-indigo-500"
                  data-testid="bug-severity"
                >
                  {SEVERITY_OPTS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <textarea
                value={bug.description}
                onChange={e => updateBug(bug.id, { description: e.target.value })}
                placeholder="Describe the bug…"
                rows={2}
                className="w-full text-sm bg-gray-800 border border-gray-700 rounded p-2 text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-indigo-500"
                data-testid="bug-description"
              />

              {/* Repro / expected / actual */}
              <div className="grid grid-cols-1 gap-2">
                <textarea
                  value={bug.repro_steps}
                  onChange={e => updateBug(bug.id, { repro_steps: e.target.value })}
                  placeholder="Steps to reproduce…"
                  rows={2}
                  className="w-full text-xs bg-gray-800 border border-gray-700 rounded p-2 text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-indigo-500"
                  data-testid="bug-repro-steps"
                />
                <div className="grid grid-cols-2 gap-2">
                  <textarea
                    value={bug.expected_behavior}
                    onChange={e => updateBug(bug.id, { expected_behavior: e.target.value })}
                    placeholder="Expected…"
                    rows={2}
                    className="w-full text-xs bg-gray-800 border border-gray-700 rounded p-2 text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-indigo-500"
                    data-testid="bug-expected"
                  />
                  <textarea
                    value={bug.actual_behavior}
                    onChange={e => updateBug(bug.id, { actual_behavior: e.target.value })}
                    placeholder="Actual…"
                    rows={2}
                    className="w-full text-xs bg-gray-800 border border-gray-700 rounded p-2 text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-indigo-500"
                    data-testid="bug-actual"
                  />
                </div>
              </div>

              {/* Bug screenshot */}
              <div className="flex gap-2 items-center">
                <label
                  className="flex items-center gap-1 px-2 py-1 text-[11px] bg-gray-800 border border-gray-700 rounded cursor-pointer hover:bg-gray-700 text-gray-400"
                  data-testid="bug-upload-screenshot"
                >
                  📎 Screenshot
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) updateBug(bug.id, { screenshot_files: [f] })
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => captureScreenshot(bug.id)}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 text-gray-400"
                  data-testid="bug-capture-screenshot"
                >
                  📷 Capture
                </button>
                {bug.screenshot_files.length > 0 && (
                  <span className="text-[11px] text-green-400">✓ {bug.screenshot_files.length} file(s)</span>
                )}
              </div>

              {/* Severity badge */}
              <div className="flex">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    SEVERITY_OPTS.find(s => s.value === bug.severity)?.color ?? ''
                  }`}
                  data-testid="bug-severity-badge"
                >
                  {bug.severity}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────────── */}
      {error && (
        <p className="text-xs text-red-400 bg-red-950 border border-red-800 rounded px-3 py-2" data-testid="feedback-error">
          {error}
        </p>
      )}

      {/* ── Actions ────────────────────────────────────────── */}
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-800">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            data-testid="btn-cancel-feedback"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || uploading}
          className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-medium transition-colors"
          data-testid="btn-submit-feedback"
        >
          {uploading ? 'Uploading…' : submitting ? 'Submitting…' : 'Submit feedback'}
        </button>
      </div>
    </form>
  )
}
