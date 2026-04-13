import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminAuthed } from '@/lib/admin-auth'

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// PATCH /api/admin/projects/[id] — update status, publish/unpublish, regenerate packet
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const { action, status, notes } = body

  const supabase = db()

  if (action === 'publish') {
    const { error } = await supabase.from('projects').update({ status: 'submitted', updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, action: 'published' })
  }

  if (action === 'unpublish') {
    const { error } = await supabase.from('projects').update({ status: 'draft', updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, action: 'unpublished' })
  }

  if (action === 'generate_packet') {
    // Fire packet generation (non-blocking)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://startup-73-expeditehub-lean-startup.vercel.app'
    const res = await fetch(`${baseUrl}/api/projects/${id}/packet`, { method: 'POST' })
    const data = await res.json()
    return NextResponse.json({ success: true, action: 'packet_generated', ...data })
  }

  if (action === 'set_status' && status) {
    const allowed = ['draft', 'submitted', 'quoted', 'active', 'completed', 'cancelled']
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: `status must be one of: ${allowed.join(', ')}` }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('projects')
      .update({ status, ...(notes ? { notes } : {}), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, project: data })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

// GET /api/admin/projects/[id] — full project detail with packet versions
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const supabase = db()

  const [projectRes, filesRes, quotesRes, messagesRes] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase.from('project_files').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('quotes').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('messages').select('*').eq('project_id', id).order('created_at', { ascending: true }),
  ])

  return NextResponse.json({
    project:  projectRes.data,
    files:    filesRes.data ?? [],
    quotes:   quotesRes.data ?? [],
    messages: messagesRes.data ?? [],
  })
}
