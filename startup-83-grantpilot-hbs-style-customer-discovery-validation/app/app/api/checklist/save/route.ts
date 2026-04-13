import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const body = await req.json()
    const { application_id, items } = body
    if (!application_id) return NextResponse.json({ error: 'application_id required' }, { status: 400 })

    const { data: member } = await admin.from('organization_members').select('organization_id').eq('user_id', user.id).single()
    if (!member) return NextResponse.json({ error: 'No organization' }, { status: 400 })

    const { data: existing } = await admin.from('checklists').select('id').eq('application_id', application_id).single()

    if (existing) {
      await admin.from('checklists').update({ items, updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await admin.from('checklists').insert({
        application_id,
        organization_id: member.organization_id,
        items,
        created_by: user.id,
      })
    }

    return NextResponse.json({ saved: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
