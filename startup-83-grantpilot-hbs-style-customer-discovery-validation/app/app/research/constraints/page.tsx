import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface Constraint {
  id: string
  capability: string
  constraint_title: string
  constraint_description: string
  input_spec: Record<string, unknown>
  output_spec: Record<string, unknown>
  measurable_threshold: string
  test_method: string
  pass_criteria: string
  fail_criteria: string
  priority: number
  feature_ref: string
  status: string
}

async function getData() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('mvp_constraints')
    .select('*')
    .order('capability')
    .order('priority')
  return { constraints: (data || []) as Constraint[] }
}

const CAPABILITY_META: Record<string, { label: string; emoji: string; description: string; color: string }> = {
  input_handling: {
    label: 'PDF/URL Input Handling',
    emoji: '📥',
    description: 'Ingest RFPs from PDF uploads, live URLs, and DOCX files. Extract structured data within performance thresholds.',
    color: 'blue',
  },
  narrative_generation: {
    label: 'Funder-Tailored Narrative',
    emoji: '✏️',
    description: 'Generate all required narrative sections using funder language and scoring criteria. Beat generic AI output.',
    color: 'purple',
  },
  budget_generation: {
    label: 'Itemized Budget + Assumptions',
    emoji: '💰',
    description: 'Auto-generate itemized grant budgets with written assumptions, correct indirect cost method, and export to SF-424A.',
    color: 'green',
  },
  compliance_checklist: {
    label: 'Forms & Compliance Checklist',
    emoji: '📋',
    description: 'Extract compliance requirements from any RFP, auto-populate SF-424 family, and validate format requirements.',
    color: 'orange',
  },
  export: {
    label: 'DOCX / PDF / ICS Export',
    emoji: '📤',
    description: 'Produce submission-ready DOCX, PDF/A, and .ics calendar files. Assemble complete portal-compliant package.',
    color: 'red',
  },
  audit_trail: {
    label: 'Audit Trail',
    emoji: '🔒',
    description: 'Immutable append-only change log, cryptographic submission snapshot, and specialist review trail for insurance SLA.',
    color: 'gray',
  },
}

const COLOR_MAP: Record<string, { bg: string; border: string; header: string; badge: string; num: string }> = {
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   header: 'bg-gradient-to-r from-blue-50 to-white',   badge: 'bg-blue-100 text-blue-800',   num: 'bg-blue-600 text-white' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', header: 'bg-gradient-to-r from-purple-50 to-white', badge: 'bg-purple-100 text-purple-800', num: 'bg-purple-600 text-white' },
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  header: 'bg-gradient-to-r from-green-50 to-white',  badge: 'bg-green-100 text-green-800',  num: 'bg-green-600 text-white' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', header: 'bg-gradient-to-r from-orange-50 to-white', badge: 'bg-orange-100 text-orange-800', num: 'bg-orange-600 text-white' },
  red:    { bg: 'bg-red-50',    border: 'border-red-200',    header: 'bg-gradient-to-r from-red-50 to-white',    badge: 'bg-red-100 text-red-800',    num: 'bg-red-600 text-white' },
  gray:   { bg: 'bg-gray-50',   border: 'border-gray-200',   header: 'bg-gradient-to-r from-gray-50 to-white',   badge: 'bg-gray-100 text-gray-800',   num: 'bg-gray-600 text-white' },
}

function SpecBlock({ label, spec }: { label: string; spec: Record<string, unknown> }) {
  return (
    <div className="text-xs">
      <div className="font-medium text-gray-600 mb-1">{label}</div>
      <div className="bg-gray-900 text-green-400 rounded p-2 font-mono overflow-x-auto">
        {Object.entries(spec).map(([k, v]) => (
          <div key={k}>
            <span className="text-gray-400">{k}: </span>
            <span className="text-green-300">
              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function ConstraintsPage() {
  const { constraints } = await getData()

  const byCapability = constraints.reduce((acc, c) => {
    if (!acc[c.capability]) acc[c.capability] = []
    acc[c.capability].push(c)
    return acc
  }, {} as Record<string, Constraint[]>)

  const capOrder = ['input_handling', 'narrative_generation', 'budget_generation', 'compliance_checklist', 'export', 'audit_trail']

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <a href="/research" className="hover:text-blue-600">Research</a>
                <span>›</span>
                <a href="/research/mvp" className="hover:text-blue-600">MVP Scope</a>
                <span>›</span>
                <span>Constraints</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Measurable MVP Constraints</h1>
              <p className="text-gray-500 mt-1">
                {constraints.length} testable constraints across {Object.keys(byCapability).length} capabilities — each with numeric threshold, test method, and pass/fail criteria
              </p>
            </div>
            <div className="flex gap-5">
              {capOrder.map(cap => {
                const meta = CAPABILITY_META[cap]
                return (
                  <a key={cap} href={`#cap-${cap}`} className="text-center hover:opacity-80">
                    <div className="text-lg">{meta?.emoji}</div>
                    <div className="text-xs text-gray-500">{(byCapability[cap] || []).length}</div>
                  </a>
                )
              })}
            </div>
          </div>

          {/* Summary bar */}
          <div className="mt-5 grid grid-cols-6 gap-2">
            {capOrder.map(cap => {
              const meta = CAPABILITY_META[cap]
              const color = COLOR_MAP[meta?.color || 'gray']
              const n = (byCapability[cap] || []).length
              return (
                <a
                  key={cap}
                  href={`#cap-${cap}`}
                  className={`rounded-lg border ${color.border} ${color.bg} p-2 text-center hover:opacity-90 transition-opacity`}
                >
                  <div className="text-lg mb-0.5">{meta?.emoji}</div>
                  <div className="text-xs font-semibold text-gray-800 leading-tight">{meta?.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{n} constraints</div>
                </a>
              )
            })}
          </div>
        </div>
      </div>

      {/* Capability sections */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        {capOrder.map(capKey => {
          const capConstraints = byCapability[capKey] || []
          const meta = CAPABILITY_META[capKey]
          const color = COLOR_MAP[meta?.color || 'gray']
          return (
            <div id={`cap-${capKey}`} key={capKey}>
              {/* Capability header */}
              <div className={`rounded-t-xl border ${color.border} ${color.header} px-6 py-4 flex items-start gap-3`}>
                <span className="text-2xl">{meta?.emoji}</span>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{meta?.label}</h2>
                  <p className="text-sm text-gray-600">{meta?.description}</p>
                </div>
                <span className={`ml-auto text-sm font-bold px-2.5 py-1 rounded-full ${color.badge}`}>
                  {capConstraints.length} constraints
                </span>
              </div>

              {/* Constraints */}
              <div className={`border-l border-r border-b ${color.border} rounded-b-xl overflow-hidden divide-y ${color.border}`}>
                {capConstraints.map((c, idx) => (
                  <div key={c.id} className="bg-white">
                    {/* Constraint header */}
                    <div className={`px-6 py-4 ${color.header} border-b ${color.border}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${color.num}`}>
                            {idx + 1}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{c.constraint_title}</h3>
                            <p className="text-sm text-gray-500 mt-0.5">{c.constraint_description}</p>
                            {c.feature_ref && (
                              <div className="mt-1 text-xs text-gray-400">
                                Feature: <span className="font-medium text-gray-600">{c.feature_ref}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded font-medium flex-shrink-0 ${
                          c.priority === 1 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          P{c.priority}
                        </span>
                      </div>
                    </div>

                    {/* Measurable threshold — the key field */}
                    <div className="px-6 py-3 bg-yellow-50 border-b border-yellow-100">
                      <div className="text-xs font-semibold text-yellow-800 mb-1">📏 MEASURABLE THRESHOLD</div>
                      <div className="text-sm font-medium text-yellow-900">{c.measurable_threshold}</div>
                    </div>

                    {/* Pass / Fail / Test method */}
                    <div className="grid grid-cols-3 gap-0 text-xs border-b border-gray-100">
                      <div className="px-4 py-3 border-r border-gray-100">
                        <div className="font-semibold text-green-700 mb-1.5">✅ PASS</div>
                        <div className="text-gray-600">{c.pass_criteria}</div>
                      </div>
                      <div className="px-4 py-3 border-r border-gray-100">
                        <div className="font-semibold text-red-700 mb-1.5">❌ FAIL</div>
                        <div className="text-gray-600">{c.fail_criteria}</div>
                      </div>
                      <div className="px-4 py-3">
                        <div className="font-semibold text-blue-700 mb-1.5">🔬 TEST METHOD</div>
                        <div className="text-gray-600">{c.test_method}</div>
                      </div>
                    </div>

                    {/* Input/Output spec (collapsed by default in static render) */}
                    {(c.input_spec || c.output_spec) && (
                      <div className="px-6 py-3 grid grid-cols-2 gap-4 bg-gray-50">
                        {c.input_spec && (
                          <SpecBlock label="Input Spec" spec={c.input_spec as Record<string, unknown>} />
                        )}
                        {c.output_spec && (
                          <SpecBlock label="Output Spec" spec={c.output_spec as Record<string, unknown>} />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="max-w-5xl mx-auto px-6 pb-12 text-xs text-gray-400">
        {constraints.length} constraints defined · P1 = required for MVP · P2 = required before GA
      </div>
    </div>
  )
}
