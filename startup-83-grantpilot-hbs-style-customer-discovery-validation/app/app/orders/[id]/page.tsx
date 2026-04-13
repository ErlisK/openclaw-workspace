import { createClient, createAdminClient } from '@/lib/supabase'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import EscrowPanel from './EscrowPanel'

export const dynamic = 'force-dynamic'

const STEP_META: Record<string, { icon: string; label: string }> = {
  rfp_parse:  { icon: '📄', label: 'RFP Analysis' },
  narrative:  { icon: '✍️', label: 'Narrative Draft' },
  budget:     { icon: '💰', label: 'Budget Build' },
  forms:      { icon: '📋', label: 'Forms & Checklist' },
  qa:         { icon: '🔍', label: 'QA Review' },
  export:     { icon: '📦', label: 'Submission Package' },
  complete:   { icon: '✅', label: 'Complete' },
}

const ESCROW_META: Record<string, { label: string; color: string; icon: string; desc: string }> = {
  pending:  { label: 'Held in Escrow', icon: '🔒', color: 'bg-amber-50 border-amber-200 text-amber-800', desc: 'Funds held until QA passes and submission package is generated.' },
  released: { label: 'Escrow Released', icon: '✅', color: 'bg-green-50 border-green-200 text-green-800', desc: 'Both QA and export conditions were met. Funds released to provider.' },
  refunded: { label: 'Refunded', icon: '↩️', color: 'bg-gray-50 border-gray-200 text-gray-600', desc: 'Order was refunded.' },
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: order } = await admin.from('orders')
    .select('*, providers(name, display_name, is_ai_pilot, avg_rating, badges), grant_applications(title, funder_name, deadline, id)')
    .eq('id', id)
    .single()

  if (!order) notFound()

  const deliverables = (order.deliverables as Array<{ key: string; label: string; status: string }>) || []
  const statusHistory = (order.status_history as Array<{ status?: string; step?: string; timestamp: string; note?: string; actor?: string }>) || []
  const escrowConditions = (order.escrow_conditions as { qa_passed: boolean; export_generated: boolean }) || { qa_passed: false, export_generated: false }
  const escrowMeta = ESCROW_META[order.escrow_status as string] || ESCROW_META.pending
  const provider = order.providers as { name: string; display_name: string; is_ai_pilot: boolean; avg_rating: number; badges?: string[] } | null
  const app = order.grant_applications as { title: string; funder_name: string; deadline: string; id: string } | null

  const completedDeliverables = deliverables.filter(d => d.status === 'complete').length
  const progressPct = order.progress_pct as number || 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/dashboard" className="hover:text-indigo-600">Dashboard</Link>
            <span>›</span>
            <Link href="/orders" className="hover:text-indigo-600">Orders</Link>
            <span>›</span>
            <span>#{id.slice(0, 8)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Order #{id.slice(0, 8)}
                {order.order_type === 'deliverable_pack' && (
                  <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">Deliverable Pack</span>
                )}
              </h1>
              {app && (
                <p className="text-sm text-gray-500 mt-0.5">
                  For: <Link href={`/application/${app.id}`} className="hover:text-indigo-600">{app.title}</Link>
                  {app.funder_name && ` · ${app.funder_name}`}
                </p>
              )}
            </div>
            {app && (
              <Link href={`/application/${app.id}`} className="text-sm text-indigo-600 hover:text-indigo-800 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50">
                View Application →
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Summary row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Status', value: (order.status as string || 'pending').replace('_', ' '), sub: null },
            { label: 'Amount', value: `$${order.price_usd || 0}`, sub: order.price_model === 'fixed' ? 'fixed price' : order.price_model as string },
            { label: 'Provider', value: provider?.is_ai_pilot ? '🤖 AI Pilot' : (provider?.display_name || 'Unassigned'), sub: provider?.avg_rating ? `⭐ ${provider.avg_rating}` : null },
            { label: 'SLA Deadline', value: order.sla_deadline ? new Date(order.sla_deadline as string).toLocaleDateString() : '—', sub: order.sla_met ? '✓ Met' : null },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs text-gray-400 mb-1">{s.label}</div>
              <div className="font-semibold text-gray-900 capitalize">{s.value}</div>
              {s.sub && <div className="text-xs text-gray-400">{s.sub}</div>}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm">Deliverables Progress</h3>
            <span className="text-xs text-gray-400">{completedDeliverables}/{deliverables.length} complete · {progressPct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-5">
            <div
              className={`h-2 rounded-full transition-all ${progressPct === 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {deliverables.map(d => {
              const meta = STEP_META[d.key] || { icon: '📌', label: d.label }
              const isCurrent = (order.current_step as string) === d.key
              return (
                <div key={d.key} className={`text-center p-2 rounded-lg border ${
                  d.status === 'complete' ? 'bg-green-50 border-green-200' :
                  isCurrent ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-100'
                }`}>
                  <div className="text-xl mb-1">{d.status === 'complete' ? '✅' : isCurrent ? '⏳' : meta.icon}</div>
                  <div className="text-xs font-medium text-gray-700">{meta.label}</div>
                  <div className={`text-xs mt-0.5 ${
                    d.status === 'complete' ? 'text-green-600' :
                    isCurrent ? 'text-indigo-600' : 'text-gray-400'
                  }`}>
                    {d.status === 'complete' ? 'Done' : isCurrent ? 'In progress' : 'Pending'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Escrow Panel */}
        <div className={`rounded-xl border-2 p-5 ${escrowMeta.color}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{escrowMeta.icon}</span>
              <div>
                <div className="font-bold text-base">{escrowMeta.label}</div>
                <p className="text-sm mt-0.5 opacity-80">{escrowMeta.desc}</p>
                {order.escrow_status === 'released' && order.escrow_released_at && (
                  <p className="text-xs mt-1 opacity-70">Released: {new Date(order.escrow_released_at as string).toLocaleString()}</p>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-bold text-lg">${order.price_usd || 0}</div>
              <div className="text-xs opacity-60">held</div>
            </div>
          </div>

          {/* Conditions checklist */}
          <div className="mt-4 pt-4 border-t border-current border-opacity-20 grid grid-cols-2 gap-3">
            {[
              { key: 'qa_passed', label: 'QA Review Passed', met: escrowConditions.qa_passed },
              { key: 'export_generated', label: 'Submission Package Exported', met: escrowConditions.export_generated },
            ].map(c => (
              <div key={c.key} className={`flex items-center gap-2 text-sm ${c.met ? 'opacity-100' : 'opacity-50'}`}>
                <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs flex-shrink-0 ${
                  c.met ? 'bg-current border-current text-white' : 'border-current'
                }`}>{c.met ? '✓' : ''}</span>
                <span className="font-medium">{c.label}</span>
              </div>
            ))}
          </div>

          {/* Manual release button (for testing) */}
          {order.escrow_status !== 'released' && (
            <EscrowPanel orderId={id} />
          )}
        </div>

        {/* Status history */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Order Timeline</h3>
          <div className="space-y-3">
            {[...statusHistory].reverse().map((h, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-1 w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {h.step ? STEP_META[h.step]?.label || h.step : h.status || 'Update'}
                    {h.status && <span className="ml-2 text-xs text-gray-400 capitalize">({h.status})</span>}
                  </div>
                  {h.note && <p className="text-xs text-gray-500 mt-0.5">{h.note}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(h.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
