import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const project_id = req.nextUrl.searchParams.get('project_id')
  if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('project_id', project_id)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { project_id, sender_email, sender_role, body, quote_id } = await req.json()
  if (!project_id || !sender_email || !body) {
    return NextResponse.json({ error: 'project_id, sender_email, body required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({ project_id, sender_email, sender_role: sender_role ?? 'homeowner', body, quote_id: quote_id ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit: log message sent (trigger also fires but this captures actor context)
  await supabase.rpc('log_audit_event', {
    p_action: 'message.sent',
    p_entity_type: 'message',
    p_entity_id: data.id,
    p_actor_email: sender_email,
    p_actor_role: sender_role ?? 'homeowner',
    p_meta: { project_id, quote_id: quote_id ?? null }
  })

  return NextResponse.json({ message: data })
}
