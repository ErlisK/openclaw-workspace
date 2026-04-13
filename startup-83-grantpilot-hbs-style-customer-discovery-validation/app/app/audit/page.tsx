import { createAdminClient, createClient } from '@/lib/supabase'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

const EVENT_META: Record<string, { icon: string; label: string; color: string }> = {
  narrative_edit:     { icon: '✍️', label: 'Narrative Edit',      color: 'bg-blue-100 text-blue-700' },
  ai_narrative_save:  { icon: '🤖', label: 'AI Draft Saved',      color: 'bg-indigo-100 text-indigo-700' },
  budget_edit:        { icon: '💰', label: 'Budget Edit',          color: 'bg-green-100 text-green-700' },
  export_zip:         { icon: '📦', label: 'ZIP Export',           color: 'bg-orange-100 text-orange-700' },
  order_placed:       { icon: '📋', label: 'Order Placed',         color: 'bg-purple-100 text-purple-700' },
  qa_run:             { icon: '🛡️', label: 'QA Review',            color: 'bg-teal-100 text-teal-700' },
  ai_draft_generate:  { icon: '✨', label: 'AI Generation',        color: 'bg-violet-100 text-violet-700' },
  rfp_import:         { icon: '📄', label: 'RFP Import',           color: 'bg-cyan-100 text-cyan-700' },
  narrative_qa_review:{ icon: '🔍', label: 'Narrative QA',        color: 'bg-yellow-100 text-yellow-700' },
  checklist_update:   { icon: '✅', label: 'Checklist Update',     color: 'bg-gray-100 text-gray-700' },
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ application_id?: string; event_type?: string; page?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: member } = await admin.from('organization_members').select('organization_id').eq('user_id', user.id).single()

  const page = Number(sp.page || 1)
  const perPage = 50
  const offset = (page - 1) * perPage

  let query = admin.from('audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  if (member) query = query.eq('organization_id', member.organization_id)
  if (sp.application_id) query = query.eq('application_id', sp.application_id)
  if (sp.event_type) query = query.eq('event_type', sp.event_type)

  const { data: logs, count } = await query
  const totalPages = Math.ceil((count || 0) / perPage)

  // Unique event types for filter
  const allEventTypes = Object.keys(EVENT_META)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/dashboard" className="hover:text-indigo-600">Dashboard</Link>
            <span>›</span><span>Audit Log</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Audit Log</h1>
              <p className="text-sm text-gray-500 mt-0.5">Immutable record of all edits, generation runs, and exports.</p>
            </div>
            <div className="text-sm text-gray-400">{count?.toLocaleString()} total events</div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-medium text-gray-500">Filter by event:</span>
          <Link href="/audit" className={`text-xs px-3 py-1.5 rounded-full transition-colors ${!sp.event_type ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            All
          </Link>
          {allEventTypes.map(et => {
            const meta = EVENT_META[et]
            return (
              <Link key={et} href={`/audit?event_type=${et}`}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${sp.event_type === et ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {meta.icon} {meta.label}
              </Link>
            )
          })}
        </div>

        {/* Log entries */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {!logs || logs.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400">
              <div className="text-3xl mb-2">📋</div>
              <div className="font-medium">No audit entries yet</div>
              <p className="text-sm mt-1">Activity appears here as you use GrantPilot.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {logs.map((log: Record<string, unknown>) => {
                const eventType = log.event_type as string || 'unknown'
                const meta = EVENT_META[eventType] || { icon: '📝', label: eventType, color: 'bg-gray-100 text-gray-600' }
                const newVal = log.new_value as Record<string, unknown> | null
                const oldVal = log.old_value as Record<string, unknown> | null

                return (
                  <div key={log.id as string} className="px-5 py-3.5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <span className="text-lg flex-shrink-0 mt-0.5">{meta.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.color}`}>{meta.label}</span>
                          {log.table_name && (
                            <span className="text-xs text-gray-400">{log.table_name as string}</span>
                          )}
                          {log.record_id && (
                            <span className="text-xs font-mono text-gray-300">{(log.record_id as string).slice(0, 8)}…</span>
                          )}
                        </div>
                        {newVal && Object.keys(newVal).length > 0 && (
                          <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                            {Object.entries(newVal).slice(0, 4).map(([k, v]) => (
                              <span key={k} className="inline-flex items-center gap-1 mr-3">
                                <span className="text-gray-400">{k}:</span>
                                <span className="text-gray-700 font-medium">{typeof v === 'object' ? JSON.stringify(v).slice(0, 40) : String(v).slice(0, 60)}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-xs text-gray-400 text-right whitespace-nowrap">
                        <div>{timeAgo(log.created_at as string)}</div>
                        <div className="mt-0.5">{new Date(log.created_at as string).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            {page > 1 && (
              <Link href={`/audit?page=${page - 1}${sp.event_type ? `&event_type=${sp.event_type}` : ''}`}
                className="text-sm px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">← Prev</Link>
            )}
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            {page < totalPages && (
              <Link href={`/audit?page=${page + 1}${sp.event_type ? `&event_type=${sp.event_type}` : ''}`}
                className="text-sm px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Next →</Link>
            )}
          </div>
        )}

        {/* Immutability notice */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500 flex gap-2 items-start">
          <span className="text-base">🔒</span>
          <div>
            <strong className="text-gray-700">Immutable audit trail</strong> — All entries are append-only and cannot be edited or deleted. This log provides a complete record for compliance, dispute resolution, and SLA verification. Each entry captures the event type, affected record, user, organization, and before/after values.
          </div>
        </div>
      </div>
    </div>
  )
}
