import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase'

// POST — place an order (auto-assigns to AI Pilot)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const body = await req.json()
    const { application_id, order_type, provider_id, notes } = body

    // Get org
    const { data: member } = await admin.from('organization_members').select('organization_id').eq('user_id', user.id).single()
    if (!member) return NextResponse.json({ error: 'No organization' }, { status: 400 })

    // Auto-assign to AI Pilot if no provider specified
    let assignedProviderId = provider_id
    if (!assignedProviderId) {
      const { data: aiPilot } = await admin.from('providers').select('id').eq('is_default_provider', true).eq('is_ai_pilot', true).single()
      assignedProviderId = aiPilot?.id
    }

    // Determine initial steps
    const deliverables = [
      { key: 'rfp_parse', label: 'RFP Analysis', status: 'complete' },
      { key: 'narrative', label: 'Narrative Draft', status: 'pending' },
      { key: 'budget', label: 'Budget Build', status: 'pending' },
      { key: 'forms', label: 'Forms & Checklist', status: 'pending' },
      { key: 'qa', label: 'QA Review', status: 'pending' },
      { key: 'export', label: 'Submission Package', status: 'pending' },
    ]

    const statusHistory = [{
      status: 'active',
      step: 'rfp_parse',
      timestamp: new Date().toISOString(),
      note: 'Order placed. AI Pilot assigned and starting RFP analysis.',
      actor: 'system',
    }]

    const { data: order, error } = await admin.from('orders').insert({
      application_id,
      organization_id: member.organization_id,
      provider_id: assignedProviderId,
      ordered_by: user.id,
      created_by: user.id,
      order_type: order_type || 'full_application',
      status: 'active',
      status_history: statusHistory,
      current_step: 'rfp_parse',
      progress_pct: 15,
      deliverables,
      notes,
      price_usd: 0,
      price_model: 'free_tier',
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Audit log
    await admin.from('audit_log').insert({
      organization_id: member.organization_id, user_id: user.id,
      event_type: 'order_placed', table_name: 'orders', record_id: order.id,
      metadata: { provider_id: assignedProviderId, order_type, application_id },
    }).catch(() => {})

    return NextResponse.json({ order })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// GET — list orders for current user's org
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: member } = await admin.from('organization_members').select('organization_id').eq('user_id', user.id).single()
  if (!member) return NextResponse.json({ orders: [] })

  const appId = req.nextUrl.searchParams.get('application_id')
  let query = admin.from('orders')
    .select('*, providers(name, display_name, is_ai_pilot, avg_rating), grant_applications(title)')
    .eq('organization_id', member.organization_id)
    .order('created_at', { ascending: false })

  if (appId) query = query.eq('application_id', appId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data })
}

// PATCH — update order status/progress
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const body = await req.json()
  const { id, status, current_step, progress_pct, deliverables, note } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data: existing } = await admin.from('orders').select('status_history').eq('id', id).single()
  const history = (existing?.status_history || []) as unknown[]
  if (status || current_step) {
    history.push({
      status: status || undefined,
      step: current_step,
      timestamp: new Date().toISOString(),
      note: note || null,
      actor: user.id,
    })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString(), status_history: history }
  if (status) updates.status = status
  if (current_step) updates.current_step = current_step
  if (progress_pct !== undefined) updates.progress_pct = progress_pct
  if (deliverables) updates.deliverables = deliverables

  const { data, error } = await admin.from('orders').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ order: data })
}
