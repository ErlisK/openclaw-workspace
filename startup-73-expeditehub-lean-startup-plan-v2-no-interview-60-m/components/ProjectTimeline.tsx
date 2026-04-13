'use client'

interface Quote {
  id: string
  pro_name: string
  pro_email: string
  quote_amount: number
  timeline_days: number | null
  scope: string | null
  notes: string | null
  packet_review_notes: string | null
  status: string
  created_at: string
}

interface Project {
  id: string
  address: string
  proposed_adu_type: string
  proposed_adu_sqft: number | null
  zoning: string | null
  status: string
  packet_status: string
  autofill_score: number | null
  file_urls: string[] | null
  created_at: string
  homeowner_email: string
}

// Austin ADU permit review milestones (city calendar days, based on DSD published targets)
const AUSTIN_ADU_MILESTONES = [
  {
    id: 'submit',
    label: 'Application Submitted',
    desc: 'BP-001 form + site plan packet submitted to Austin DSD',
    daysFromStart: 0,
    icon: '📬',
    color: 'blue',
  },
  {
    id: 'intake_review',
    label: 'DSD Intake Review',
    desc: 'DSD checks completeness. Typical: 5–10 business days',
    daysFromStart: 10,
    icon: '🔍',
    color: 'indigo',
  },
  {
    id: 'plan_review',
    label: 'Plan Review',
    desc: 'Structural, zoning, MEP reviews. Austin target: 21 business days (commercial) / 15 days (ADU)',
    daysFromStart: 30,
    icon: '📐',
    color: 'purple',
  },
  {
    id: 'corrections',
    label: 'Corrections (if any)',
    desc: 'DSD issues correction letter. Pro has 90 days to resubmit. ~1–2 cycles typical.',
    daysFromStart: 45,
    icon: '📋',
    color: 'amber',
    optional: true,
  },
  {
    id: 'resubmit',
    label: 'Resubmit & Re-review',
    desc: 'Corrected plans re-reviewed. Target: 10 business days',
    daysFromStart: 60,
    icon: '🔄',
    color: 'orange',
    optional: true,
  },
  {
    id: 'permit_issued',
    label: 'Permit Issued',
    desc: 'Permit approved. Pick up permit placard. Construction may begin.',
    daysFromStart: 75,
    icon: '✅',
    color: 'green',
  },
]

// Which project status maps to which milestone id
function activeMilestoneId(project: Project): string {
  switch (project.status) {
    case 'draft':      return 'submit'
    case 'submitted':  return 'intake_review'
    case 'quoted':     return 'intake_review'
    case 'active':     return 'plan_review'
    case 'correction': return 'corrections'
    case 'completed':  return 'permit_issued'
    default:           return 'submit'
  }
}

// Packet completeness fields (mirrors PACKET_PREVIEW_FIELDS)
const COMPLETENESS_FIELDS = [
  { key: 'address',               label: 'Project Address',         source: 'GIS',          required: true },
  { key: 'zoning',                label: 'Zoning District',         source: 'GIS',          required: true },
  { key: 'adu_type',              label: 'ADU Type',                source: 'Your input',   required: true },
  { key: 'proposed_sqft',         label: 'ADU Square Footage',      source: 'Your input',   required: true },
  { key: 'lot_area_sqft',         label: 'Lot Area',                source: 'GIS',          required: true },
  { key: 'existing_sqft',         label: 'Existing Structure Sq Ft',source: null,           required: true },
  { key: 'impervious_cover_pct',  label: 'Impervious Cover %',      source: 'Calculated',   required: true },
  { key: 'setback_front',         label: 'Front Setback',           source: 'LDC rule',     required: true },
  { key: 'setback_rear',          label: 'Rear Setback',            source: 'LDC rule',     required: true },
  { key: 'setback_side',          label: 'Side Setback',            source: 'LDC rule',     required: true },
  { key: 'utility_connection',    label: 'Utility Connection',      source: null,           required: true },
  { key: 'owner_name',            label: 'Owner Name',              source: 'Account',      required: true },
  { key: 'owner_phone',           label: 'Owner Phone',             source: null,           required: false },
  { key: 'site_plan',             label: 'Site Plan Uploaded',      source: null,           required: true },
]

function computeCompleteness(project: Project): { pct: number; filled: number; total: number; missing: string[] } {
  const score = project.autofill_score ?? 0
  const hasFiles = (project.file_urls?.length ?? 0) > 0
  // Use autofill_score as proxy for GIS/rule fields; add site plan check
  const autoFields = COMPLETENESS_FIELDS.filter(f => f.source !== null)
  const manualFields = COMPLETENESS_FIELDS.filter(f => f.source === null && f.required)
  const filledAuto = Math.round(autoFields.length * (score / 100))
  const filledManual = hasFiles ? manualFields.length - 1 : 0 // crude: if files, most manual fields ok
  const total = COMPLETENESS_FIELDS.filter(f => f.required).length
  const filled = Math.min(filledAuto + filledManual, total)
  const pct = Math.round((filled / total) * 100)
  const missing = COMPLETENESS_FIELDS
    .filter(f => f.required && f.source === null)
    .map(f => f.label)
  return { pct, filled, total, missing: hasFiles ? [] : missing }
}

interface Props {
  project: Project
  quotes: Quote[]
  onAcceptQuote: (quoteId: string, amount: number) => void
  acceptingQuote: string | null
}

export default function ProjectTimeline({ project, quotes, onAcceptQuote, acceptingQuote }: Props) {
  const activeMilestone = activeMilestoneId(project)
  const activeIdx = AUSTIN_ADU_MILESTONES.findIndex(m => m.id === activeMilestone)
  const { pct: complPct, filled, total, missing } = computeCompleteness(project)

  // Estimate dates from project created_at
  const createdAt = new Date(project.created_at)
  function estimateDate(daysFromStart: number): string {
    const d = new Date(createdAt)
    d.setDate(d.getDate() + daysFromStart)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const milestoneColors: Record<string, { dot: string; line: string; badge: string }> = {
    blue:   { dot: 'bg-blue-500',   line: 'bg-blue-200',   badge: 'bg-blue-50 text-blue-800 border-blue-200' },
    indigo: { dot: 'bg-indigo-500', line: 'bg-indigo-200', badge: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
    purple: { dot: 'bg-purple-500', line: 'bg-purple-200', badge: 'bg-purple-50 text-purple-800 border-purple-200' },
    amber:  { dot: 'bg-amber-400',  line: 'bg-amber-200',  badge: 'bg-amber-50 text-amber-800 border-amber-200' },
    orange: { dot: 'bg-orange-400', line: 'bg-orange-200', badge: 'bg-orange-50 text-orange-800 border-orange-200' },
    green:  { dot: 'bg-green-500',  line: 'bg-green-200',  badge: 'bg-green-50 text-green-800 border-green-200' },
  }

  return (
    <div className="space-y-6">

      {/* ── Packet completeness bar ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">📄 Packet Completeness</h2>
          <div className={`text-2xl font-bold ${complPct >= 75 ? 'text-green-600' : complPct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
            {complPct}%
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-4 mb-3 overflow-hidden">
          <div
            className={`h-4 rounded-full transition-all duration-700 ${
              complPct >= 75 ? 'bg-green-500' : complPct >= 50 ? 'bg-amber-400' : 'bg-red-400'
            }`}
            style={{ width: `${complPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <span>{filled} of {total} required fields ready</span>
          <span className={complPct >= 75 ? 'text-green-600 font-medium' : 'text-amber-600'}>
            {complPct >= 75 ? '✅ Ready for pro review' : complPct >= 50 ? '⚠️ Nearly ready' : '❌ Needs more info'}
          </span>
        </div>

        {/* Field-by-field mini status */}
        <div className="grid grid-cols-2 gap-1.5">
          {COMPLETENESS_FIELDS.filter(f => f.required).map(f => {
            const isAuto = f.source !== null
            const hasPct = (project.autofill_score ?? 0) >= 70
            const isFilled = isAuto ? hasPct : (project.file_urls?.length ?? 0) > 0
            return (
              <div key={f.key} className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg ${
                isFilled ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'
              }`}>
                <span>{isFilled ? '✓' : '○'}</span>
                <span className="truncate">{f.label}</span>
                {f.source && <span className="shrink-0 text-gray-400">{f.source}</span>}
              </div>
            )
          })}
        </div>

        {missing.length > 0 && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
            <span className="font-semibold">⚠️ Still needed: </span>{missing.join(' · ')}
          </div>
        )}
      </div>

      {/* ── Two-column: Timeline + Quotes ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Austin ADU milestone timeline */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold text-gray-900">🗓 Austin ADU Review Timeline</h2>
          </div>
          <p className="text-xs text-gray-400 mb-5">
            Based on Austin DSD published targets · {AUSTIN_ADU_MILESTONES[AUSTIN_ADU_MILESTONES.length - 1].daysFromStart} days typical total
          </p>

          <div className="relative">
            {AUSTIN_ADU_MILESTONES.map((m, i) => {
              const colors = milestoneColors[m.color]
              const isPast = i < activeIdx
              const isCurrent = i === activeIdx
              const isFuture = i > activeIdx
              const isLast = i === AUSTIN_ADU_MILESTONES.length - 1

              return (
                <div key={m.id} className="flex gap-4">
                  {/* Dot + line */}
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 border-2 transition-all ${
                      isPast    ? 'bg-green-500 border-green-500 text-white' :
                      isCurrent ? `${colors.dot} border-transparent text-white shadow-lg ring-2 ring-offset-1 ring-current` :
                                  'bg-white border-gray-200 text-gray-300'
                    }`}>
                      {isPast ? '✓' : m.icon}
                    </div>
                    {!isLast && (
                      <div className={`w-0.5 flex-1 min-h-[32px] my-1 ${
                        isPast ? 'bg-green-300' : colors.line
                      }`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`pb-6 flex-1 ${isLast ? 'pb-0' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className={`text-sm font-semibold ${
                          isCurrent ? 'text-gray-900' : isPast ? 'text-green-700' : 'text-gray-400'
                        }`}>
                          {m.label}
                          {m.optional && <span className="text-xs font-normal text-gray-400 ml-1">(if needed)</span>}
                        </div>
                        {(isCurrent || isPast) && (
                          <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-xs ${isPast ? 'text-green-600' : isCurrent ? 'text-blue-600 font-semibold' : 'text-gray-300'}`}>
                          {estimateDate(m.daysFromStart)}
                        </div>
                        {isCurrent && (
                          <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${colors.badge}`}>
                            ← Current
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
            Estimated permit issuance: <span className="font-semibold text-gray-600">{estimateDate(75)}</span>
            <span className="ml-1">(with no corrections)</span>
          </div>
        </div>

        {/* Quotes panel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">💼 Pro Quotes</h2>
            {quotes.length > 0 && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                {quotes.length} received
              </span>
            )}
          </div>

          {quotes.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <div className="text-4xl mb-3">⏳</div>
              <p className="text-sm font-medium text-gray-500">Waiting for quotes</p>
              <p className="text-xs mt-1">Your project is live on the pro board.<br />Quotes typically arrive within 24 hours.</p>
              <div className="mt-4 text-xs text-gray-300">
                Tip: a complete packet ({complPct}% now) gets quoted faster.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {quotes.map((q, qi) => {
                const isLowest = q.quote_amount === Math.min(...quotes.map(x => x.quote_amount))
                const isFastest = q.timeline_days === Math.min(...quotes.filter(x => x.timeline_days).map(x => x.timeline_days!))
                return (
                  <div key={q.id} className={`border rounded-xl p-4 transition-all ${
                    isLowest ? 'border-green-300 bg-green-50/30' : 'border-gray-100 hover:border-gray-200'
                  }`}>
                    {/* Badges */}
                    {(isLowest || isFastest) && (
                      <div className="flex gap-2 mb-2">
                        {isLowest && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">💚 Best price</span>}
                        {isFastest && quotes.filter(x => x.timeline_days).length > 1 && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">⚡ Fastest</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{q.pro_name || q.pro_email.split('@')[0]}</p>
                        <p className="text-gray-400 text-xs">{q.pro_email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-blue-700">${Number(q.quote_amount).toLocaleString()}</p>
                        {q.timeline_days && (
                          <p className="text-xs text-gray-400">{q.timeline_days} days</p>
                        )}
                      </div>
                    </div>

                    {q.scope && (
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">{q.scope}</p>
                    )}

                    {q.packet_review_notes && (
                      <div className="bg-blue-50 rounded-lg px-3 py-2 mb-2">
                        <p className="text-xs text-blue-700"><strong>Pro notes on packet:</strong> {q.packet_review_notes}</p>
                      </div>
                    )}

                    {/* Timeline estimate from this quote */}
                    {q.timeline_days && (
                      <div className="text-xs text-gray-400 mb-3">
                        Est. completion: {(() => {
                          const d = new Date()
                          d.setDate(d.getDate() + q.timeline_days)
                          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        })()}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => onAcceptQuote(q.id, Number(q.quote_amount))}
                        disabled={acceptingQuote === q.id}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all"
                      >
                        {acceptingQuote === q.id ? 'Starting checkout…' : '✓ Accept & Pay Deposit'}
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* Compare bar */}
              {quotes.length > 1 && (
                <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600">
                  <div className="font-semibold mb-1 text-gray-700">Quick compare</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Price range</span>
                      <span className="font-medium">${Math.min(...quotes.map(q => q.quote_amount)).toLocaleString()} – ${Math.max(...quotes.map(q => q.quote_amount)).toLocaleString()}</span>
                    </div>
                    {quotes.some(q => q.timeline_days) && (
                      <div className="flex justify-between">
                        <span>Timeline range</span>
                        <span className="font-medium">
                          {Math.min(...quotes.filter(q => q.timeline_days).map(q => q.timeline_days!))}–
                          {Math.max(...quotes.filter(q => q.timeline_days).map(q => q.timeline_days!))} days
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
