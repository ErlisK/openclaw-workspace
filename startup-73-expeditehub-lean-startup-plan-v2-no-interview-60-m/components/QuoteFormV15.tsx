'use client'
import { useState } from 'react'

export interface QuotePayload {
  quote_amount: number
  timeline_days: number | null
  scope: string
  notes: string
  packet_review_notes: string
  quote_type: 'flat' | 'milestone'
  checklist_complete: boolean
}

interface Props {
  projectId: string
  proEmail: string
  autofillScore?: number | null
  onSubmit: (payload: QuotePayload) => Promise<void>
  submitting: boolean
  submitted: boolean
}

const SCOPE_PRESETS = [
  {
    label: 'Standard Permit Expediting',
    amount: 2200,
    days: 45,
    scope: 'Full Austin DSD permit expediting for detached ADU. Includes: BP-001 form review and submission, DSD pre-application meeting if needed, City of Austin portal submissions (EL, S, M, P trades), corrections management through permit issuance. Does not include architectural drawings or engineering stamps.',
  },
  {
    label: 'Plan Review + Expediting',
    amount: 3500,
    days: 60,
    scope: 'Comprehensive package: AI-generated packet review and corrections, coordination with structural/MEP engineers, BP-001 submission, all DSD trade permits, corrections management. 60-day timeline to permit issuance.',
  },
  {
    label: 'Code Consult Only',
    amount: 750,
    days: 5,
    scope: '2-hour Austin LDC code review for your specific lot: setback analysis, impervious cover calculation, ADU sizing limits, Title 25 compliance check. Written report delivered within 5 business days.',
  },
  {
    label: 'Milestone Package (3-phase)',
    amount: 2800,
    days: 50,
    scope: 'Milestone 1 (40%, ~$1,120): Packet review, corrections, DSD pre-app. Milestone 2 (40%, ~$1,120): All trade permit submissions. Milestone 3 (20%, ~$560): Permit issuance and final walkthrough.',
  },
]

const PACKET_CHECKLIST = [
  { key: 'address', label: 'Address and zoning district confirmed' },
  { key: 'sqft', label: 'ADU square footage within zoning limits' },
  { key: 'setbacks', label: 'Setbacks correct for this lot (checked survey if available)' },
  { key: 'impervious', label: 'Impervious cover within 45% SF-3 limit' },
  { key: 'utilities', label: 'Utility connection approach noted' },
  { key: 'forms', label: 'BP-001 fields complete or noted as needed' },
]

const QUOTE_CHECKLIST = [
  { key: 'reviewed_packet', label: 'I have reviewed the AI packet' },
  { key: 'priced_accurately', label: 'My quote reflects actual scope for this ADU' },
  { key: 'timeline_realistic', label: 'Timeline is realistic (typical DSD: 30–90 days)' },
  { key: 'available', label: 'I am available to take this project' },
]

export default function QuoteFormV15({ projectId, proEmail, autofillScore, onSubmit, submitting, submitted }: Props) {
  const [quoteAmount, setQuoteAmount] = useState('')
  const [quoteDays, setQuoteDays] = useState('')
  const [quoteScope, setQuoteScope] = useState('')
  const [quoteNotes, setQuoteNotes] = useState('')
  const [packetNotes, setPacketNotes] = useState('')
  const [quoteType, setQuoteType] = useState<'flat' | 'milestone'>('flat')
  const [packetChecks, setPacketChecks] = useState<Record<string, boolean>>({})
  const [quoteChecks, setQuoteChecks] = useState<Record<string, boolean>>({})
  const [showPresets, setShowPresets] = useState(true)
  const [showPacketChecklist, setShowPacketChecklist] = useState(false)
  const [error, setError] = useState('')

  const packetChecksDone = PACKET_CHECKLIST.every(c => packetChecks[c.key])
  const quoteChecksDone = QUOTE_CHECKLIST.every(c => quoteChecks[c.key])
  const canSubmit = !!quoteAmount && quoteChecksDone && !submitting

  const applyPreset = (p: typeof SCOPE_PRESETS[0]) => {
    setQuoteAmount(String(p.amount))
    setQuoteDays(String(p.days))
    setQuoteScope(p.scope)
    setQuoteType(p.label.includes('Milestone') ? 'milestone' : 'flat')
    setShowPresets(false)
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setError('')
    try {
      await onSubmit({
        quote_amount: Number(quoteAmount),
        timeline_days: quoteDays ? Number(quoteDays) : null,
        scope: quoteScope,
        notes: quoteNotes,
        packet_review_notes: packetNotes,
        quote_type: quoteType,
        checklist_complete: quoteChecksDone,
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to submit quote')
    }
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
        <div className="text-3xl mb-2">✅</div>
        <p className="text-green-800 font-semibold">Quote submitted!</p>
        <p className="text-xs text-green-600 mt-2">Homeowner will be notified. Use messaging to answer questions.</p>
        <div className="mt-4 p-3 bg-white rounded-lg text-sm text-gray-700 text-left">
          <div className="font-medium text-gray-900 text-lg">${Number(quoteAmount).toLocaleString()}</div>
          {quoteDays && <div className="text-gray-500 text-xs">{quoteDays}-day timeline</div>}
          {quoteScope && <div className="text-xs text-gray-600 mt-2 line-clamp-3">{quoteScope}</div>}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Submit a Quote</h3>
        <span className="text-xs text-gray-400">v1.5</span>
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {/* Scope Presets */}
      <div>
        <button
          onClick={() => setShowPresets(!showPresets)}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          {showPresets ? '▼' : '▶'} Quick presets {showPresets ? '(click to hide)' : ''}
        </button>
        {showPresets && (
          <div className="mt-2 space-y-2">
            {SCOPE_PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800 group-hover:text-blue-700">{p.label}</span>
                  <span className="text-sm font-bold text-gray-900">${p.amount.toLocaleString()}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{p.days} days · {p.scope.substring(0, 70)}…</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quote type toggle */}
      <div className="flex gap-2">
        {(['flat', 'milestone'] as const).map(t => (
          <button key={t} onClick={() => setQuoteType(t)}
            className={`flex-1 text-sm py-2 rounded-lg font-medium transition-all ${
              quoteType === t ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {t === 'flat' ? '💳 Flat Fee' : '📋 Milestones'}
          </button>
        ))}
      </div>

      {quoteType === 'milestone' && (
        <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 space-y-1">
          <p className="font-medium">Suggested milestone split:</p>
          <p>M1 (40%): Forms + packet review complete</p>
          <p>M2 (40%): Submitted to Austin DSD</p>
          <p>M3 (20%): Permit issued</p>
        </div>
      )}

      {/* Amount + timeline */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Amount ($) *</label>
          <input
            type="number" value={quoteAmount} onChange={e => setQuoteAmount(e.target.value)}
            placeholder="e.g. 2800" min="100"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Days to permit</label>
          <input
            type="number" value={quoteDays} onChange={e => setQuoteDays(e.target.value)}
            placeholder="e.g. 45"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Scope */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Scope of work *</label>
        <textarea
          value={quoteScope} onChange={e => setQuoteScope(e.target.value)}
          rows={3} placeholder="What's included — be specific about what you will and won't do."
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Packet review checklist */}
      <div>
        <button
          onClick={() => setShowPacketChecklist(!showPacketChecklist)}
          className={`text-xs font-medium flex items-center gap-1 ${packetChecksDone ? 'text-green-600' : 'text-amber-600'}`}
        >
          {showPacketChecklist ? '▼' : '▶'}
          {packetChecksDone ? '✅ Packet review complete' : `⚠️ Packet checklist (${Object.values(packetChecks).filter(Boolean).length}/${PACKET_CHECKLIST.length})`}
          {autofillScore !== null && autofillScore !== undefined && (
            <span className="ml-2 bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs">{autofillScore}% pre-filled</span>
          )}
        </button>
        {showPacketChecklist && (
          <div className="mt-2 border border-amber-100 bg-amber-50 rounded-lg p-3 space-y-2">
            {PACKET_CHECKLIST.map(c => (
              <label key={c.key} className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!packetChecks[c.key]}
                  onChange={e => setPacketChecks(p => ({ ...p, [c.key]: e.target.checked }))}
                  className="mt-0.5"
                />
                <span className="text-xs text-amber-900">{c.label}</span>
              </label>
            ))}
            <div>
              <label className="block text-xs font-medium text-amber-800 mb-1">Notes on packet (optional)</label>
              <textarea
                value={packetNotes} onChange={e => setPacketNotes(e.target.value)}
                rows={2} placeholder="Any issues or gaps in the AI packet…"
                className="w-full border border-amber-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none bg-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Additional notes */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Notes for homeowner</label>
        <textarea
          value={quoteNotes} onChange={e => setQuoteNotes(e.target.value)}
          rows={2} placeholder="Questions, availability, what you need from them…"
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Pre-submit checklist */}
      <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
        <p className="text-xs font-medium text-gray-700">Before you submit:</p>
        {QUOTE_CHECKLIST.map(c => (
          <label key={c.key} className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!quoteChecks[c.key]}
              onChange={e => setQuoteChecks(p => ({ ...p, [c.key]: e.target.checked }))}
              className="mt-0.5"
            />
            <span className="text-xs text-gray-700">{c.label}</span>
          </label>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={`w-full font-semibold py-3 rounded-xl transition-all ${
          canSubmit
            ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {submitting ? 'Submitting…' : canSubmit ? 'Submit Quote →' : `Complete checklist to submit (${Object.values(quoteChecks).filter(Boolean).length}/${QUOTE_CHECKLIST.length})`}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Homeowner will be notified. Payment held in escrow until milestones approved.
      </p>
    </div>
  )
}
