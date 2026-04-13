import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase'
import { generateMilestonesFromDeadline } from '@/lib/timeline-engine'

// GET — list milestones for an application
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('application_id')
  if (!id) return NextResponse.json({ error: 'application_id required' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('timeline_milestones').select('*').eq('application_id', id).order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ milestones: data })
}

// POST — create a new milestone
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const body = await req.json()
  const { application_id, title, due_date, due_time, milestone_type, description, reminder_days_before } = body

  if (!application_id || !title) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const { data: member } = await admin.from('organization_members').select('organization_id').eq('user_id', user.id).single()

  // Get current max sort_order
  const { data: existing } = await admin.from('timeline_milestones').select('sort_order').eq('application_id', application_id).order('sort_order', { ascending: false }).limit(1).single()
  const sort_order = (existing?.sort_order ?? -1) + 1

  const { data, error } = await admin.from('timeline_milestones').insert({
    application_id, title, due_date, due_time, milestone_type: milestone_type || 'custom',
    description, reminder_days_before: reminder_days_before || [7, 3, 1],
    organization_id: member?.organization_id, sort_order,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ milestone: data })
}

// PATCH — update completed_at or other fields
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const body = await req.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data, error } = await admin.from('timeline_milestones')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ milestone: data })
}

// PUT — regenerate milestones (delete existing + reinsert)
export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { application_id, deadline, has_board_approval, has_partner_loi, has_intent_to_apply } = await req.json()

  if (!application_id || !deadline) return NextResponse.json({ error: 'application_id and deadline required' }, { status: 400 })

  const { data: member } = await admin.from('organization_members').select('organization_id').eq('user_id', user.id).single()

  // Delete custom milestones too — user confirmed regeneration
  await admin.from('timeline_milestones').delete().eq('application_id', application_id)

  const generated = generateMilestonesFromDeadline({
    application_id, deadline,
    has_board_approval: !!has_board_approval,
    has_partner_loi: !!has_partner_loi,
    has_intent_to_apply: !!has_intent_to_apply,
  })

  const { data, error } = await admin.from('timeline_milestones')
    .insert(generated.map(m => ({ ...m, organization_id: member?.organization_id })))
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ milestones: data })
}

// DELETE — remove a milestone
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await admin.from('timeline_milestones').delete().eq('id', id)
  return NextResponse.json({ deleted: true })
}
