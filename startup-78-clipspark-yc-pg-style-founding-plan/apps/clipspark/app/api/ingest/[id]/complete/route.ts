import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/ingest/[id]/complete
// Called by client after successful PUT to Supabase Storage
// Body: { storage_path, file_size_bytes?, duration_sec?, mime_type? }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { storage_path, file_size_bytes, duration_sec, mime_type } = body

  if (!storage_path) {
    return NextResponse.json({ error: 'storage_path required' }, { status: 400 })
  }

  // Verify asset belongs to user
  const { data: asset } = await supabase
    .from('media_assets')
    .select('id, user_id, title')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Update asset: mark upload complete
  const { error: updateErr } = await supabase
    .from('media_assets')
    .update({
      storage_path,
      file_size_bytes: file_size_bytes || null,
      duration_sec: duration_sec || null,
      mime_type: mime_type || null,
      transcript_status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Advance job to 'ingested' so proxy worker can pick it up
  const { error: jobErr } = await supabase
    .from('processing_jobs')
    .update({ status: 'ingested', updated_at: new Date().toISOString() })
    .eq('media_asset_id', id)
    .eq('user_id', user.id)
    .in('status', ['queued'])

  if (jobErr) console.error('job update error:', jobErr.message)

  return NextResponse.json({ ok: true, asset_id: id })
}
