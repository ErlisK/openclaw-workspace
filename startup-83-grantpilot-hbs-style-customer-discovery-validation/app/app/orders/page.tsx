import { createAdminClient, createClient } from '@/lib/supabase'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Pending',     color: 'bg-gray-100 text-gray-600' },
  active:     { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  qa_review:  { label: 'QA Review',   color: 'bg-yellow-100 text-yellow-700' },
  complete:   { label: 'Complete',    color: 'bg-green-100 text-green-700' },
  cancelled:  { label: 'Cancelled',   color: 'bg-red-100 text-red-700' },
}

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: member } = await admin.from('organization_members').select('organization_id').eq('user_id', user.id).single()

  const { data: orders } = member ? await admin.from('orders')
    .select('*, providers(name, display_name, is_ai_pilot, avg_rating, badges), grant_applications(title, funder_name, deadline)')
    .eq('organization_id', member.organization_id)
    .order('created_at', { ascending: false }) : { data: [] }

  const all = orders || []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/dashboard" className="hover:text-indigo-600">Dashboard</Link>
            <span>›</span><span>Orders</span>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">My Orders</h1>
            <Link href="/providers" className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Browse Providers</Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {all.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <div className="text-4xl mb-3">📦</div>
            <h2 className="text-lg font-semibold text-gray-900">No orders yet</h2>
            <p className="text-gray-500 mt-2 mb-6">Start a new application to auto-assign GrantPilot AI, or browse specialists.</p>
            <div className="flex gap-3 justify-center">
              <Link href="/rfp/new" className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 text-sm font-medium">Start New Application</Link>
              <Link href="/providers" className="border border-indigo-300 text-indigo-700 px-5 py-2.5 rounded-lg hover:bg-indigo-50 text-sm font-medium">Browse Specialists</Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {all.map((order: Record<string, unknown>) => {
              const provider = order.providers as Record<string, unknown> | null
              const app = order.grant_applications as Record<string, unknown> | null
              const deliverables = (order.deliverables as Array<{ key: string; label: string; status: string }>) || []
              const statusMeta = STATUS_META[order.status as string] || STATUS_META.pending
              const progress = Number(order.progress_pct) || 0

              return (
                <div key={order.id as string} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-gray-900">{app?.title as string || 'Application'}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusMeta.color}`}>{statusMeta.label}</span>
                        {provider?.is_ai_pilot && <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">🤖 AI Pilot</span>}
                      </div>
                      <div className="text-sm text-gray-500 flex gap-3 flex-wrap">
                        {app?.funder_name && <span>{app.funder_name as string}</span>}
                        {app?.deadline && <span>⏰ {app.deadline as string}</span>}
                        <span>Assigned: <strong>{provider?.display_name as string || provider?.name as string || 'GrantPilot AI'}</strong></span>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">{order.current_step ? `Step: ${(order.current_step as string).replace(/_/g, ' ')}` : 'In progress'}</span>
                          <span className="text-xs font-medium text-indigo-700">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
                        </div>
                      </div>

                      {/* Deliverables */}
                      {deliverables.length > 0 && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {deliverables.map(d => (
                            <span key={d.key} className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                              d.status === 'complete' ? 'bg-green-50 text-green-700' :
                              d.status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                              'bg-gray-100 text-gray-400'
                            }`}>
                              {d.status === 'complete' ? '✓' : d.status === 'in_progress' ? '⟳' : '○'} {d.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex-shrink-0 flex flex-col gap-2 text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {order.price_model === 'free_tier' ? 'FREE' : order.price_usd ? `$${Number(order.price_usd).toLocaleString()}` : '—'}
                      </div>
                      {/* Escrow badge */}
                      {order.order_type === 'deliverable_pack' && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          order.escrow_status === 'released' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {order.escrow_status === 'released' ? '✅ Escrow Released' : '🔒 Escrow Pending'}
                        </span>
                      )}
                      <Link href={`/orders/${order.id as string}`} className="text-xs text-indigo-600 hover:underline">View Order →</Link>
                      {order.application_id && (
                        <Link href={`/application/${order.application_id as string}`} className="text-xs text-indigo-600 hover:underline">View Application →</Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
