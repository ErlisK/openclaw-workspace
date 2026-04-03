import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// GET /api/v1/session/[id] — poll session status + pages
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sb = getAdmin()

  const [{ data: session }, { data: pages }] = await Promise.all([
    sb.from('trial_sessions')
      .select('id,session_token,share_slug,concept,config,status,page_count,preview_image_url,created_at,started_generating_at,first_page_at,complete_at,exported_at')
      .eq('id', id)
      .single(),
    sb.from('trial_pages')
      .select('id,page_number,sort_order,subject,image_url,status,latency_ms')
      .eq('session_id', id)
      .order('sort_order'),
  ])

  if (!session) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ session, pages: pages || [] })
}

// PATCH /api/v1/session/[id] — update session status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json().catch(() => ({})) as {
    status?: string
    preview_image_url?: string
    started_generating_at?: string
    first_page_at?: string
    complete_at?: string
    preview_opened_at?: string
    exported_at?: string
    share_clicked_at?: string
  }

  const sb = getAdmin()
  const update: Record<string, unknown> = {}

  if (body.status) update.status = body.status
  if (body.preview_image_url) update.preview_image_url = body.preview_image_url
  if (body.started_generating_at !== undefined)
    update.started_generating_at = body.started_generating_at || new Date().toISOString()
  if (body.first_page_at !== undefined)
    update.first_page_at = body.first_page_at || new Date().toISOString()
  if (body.complete_at !== undefined)
    update.complete_at = body.complete_at || new Date().toISOString()
  if (body.preview_opened_at !== undefined)
    update.preview_opened_at = body.preview_opened_at || new Date().toISOString()
  if (body.exported_at !== undefined)
    update.exported_at = body.exported_at || new Date().toISOString()
  if (body.share_clicked_at !== undefined)
    update.share_clicked_at = body.share_clicked_at || new Date().toISOString()

  const { error } = await sb.from('trial_sessions').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
