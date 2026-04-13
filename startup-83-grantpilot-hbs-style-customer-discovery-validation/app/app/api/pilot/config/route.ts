import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: member } = await admin.from('organization_members').select('organization_id').eq('user_id', user.id).single()
  if (!member) return NextResponse.json({ configs: [] })

  const { data } = await admin.from('pilot_configs').select('*').eq('organization_id', member.organization_id).order('created_at')
  return NextResponse.json({ configs: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: member } = await admin.from('organization_members').select('organization_id').eq('user_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  const body = await req.json()
  const { data, error } = await admin.from('pilot_configs').insert({
    ...body,
    organization_id: member.organization_id,
    created_by: user.id,
  }).select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If this is default, clear others
  if (body.is_default) {
    await admin.from('pilot_configs')
      .update({ is_default: false })
      .eq('organization_id', member.organization_id)
      .neq('id', data.id)
  }

  return NextResponse.json({ config: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data, error } = await admin.from('pilot_configs').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: data })
}
