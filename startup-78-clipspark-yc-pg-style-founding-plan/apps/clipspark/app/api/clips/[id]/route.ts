import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/clips/[id] — get clip detail + signals
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('clip_outputs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

// PATCH /api/clips/[id] — fine-trim: update start/end, title, hashtags
// Body: { source_start_sec?, source_end_sec?, title?, hashtags? }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { source_start_sec, source_end_sec, title, hashtags, is_approved, is_posted, posted_url } = body

  // Validate trim bounds
  if (source_start_sec !== undefined && source_end_sec !== undefined) {
    const dur = source_end_sec - source_start_sec
    if (dur < 5) return NextResponse.json({ error: 'Clip must be at least 5 seconds' }, { status: 400 })
    if (dur > 180) return NextResponse.json({ error: 'Clip cannot exceed 3 minutes' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (source_start_sec !== undefined) update.source_start_sec = source_start_sec
  if (source_end_sec !== undefined) {
    update.source_end_sec = source_end_sec
    if (source_start_sec !== undefined) update.duration_sec = source_end_sec - source_start_sec
  }
  if (title !== undefined) update.title = title
  if (hashtags !== undefined) update.hashtags = Array.isArray(hashtags) ? JSON.stringify(hashtags) : hashtags
  if (is_approved !== undefined) update.is_approved = is_approved
  if (is_posted !== undefined) update.is_posted = is_posted
  if (posted_url !== undefined) update.posted_url = posted_url

  // If trim changed, reset render_status to pending so re-render is triggered
  if (source_start_sec !== undefined || source_end_sec !== undefined) {
    update.render_status = 'pending'
    update.preview_url = null
    update.export_url = null
  }

  const { data, error } = await supabase
    .from('clip_outputs')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark onboarding checklist steps
  if (is_approved) {
    supabase.from('onboarding_checklist').upsert(
      { user_id: user.id, step: 'approve_captions', completed_at: new Date().toISOString() },
      { onConflict: 'user_id,step' }
    ).then(() => {})
    supabase.from('onboarding_checklist').upsert(
      { user_id: user.id, step: 'preview_clip', completed_at: new Date().toISOString() },
      { onConflict: 'user_id,step' }
    ).then(() => {})
  }
  if (is_posted) {
    supabase.from('onboarding_checklist').upsert(
      { user_id: user.id, step: 'publish_clip', completed_at: new Date().toISOString() },
      { onConflict: 'user_id,step' }
    ).then(() => {})
  }

  return NextResponse.json(data)
}
