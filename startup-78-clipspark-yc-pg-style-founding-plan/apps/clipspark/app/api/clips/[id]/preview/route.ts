import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/clips/[id]/preview — get or refresh preview URL
// If preview_url is expired or not set, returns render_status
// POST /api/clips/[id]/preview — request a re-render (resets to pending)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: clip, error } = await supabase
    .from('clip_outputs')
    .select('id, render_status, preview_url, preview_path, export_url, resolution, file_size_kb, render_duration_sec')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !clip) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // If we have a preview_path but no URL (or URL expired), refresh the signed URL
  if (clip.preview_path && !clip.preview_url) {
    const { data: signedData } = await supabase.storage
      .from('previews')
      .createSignedUrl(clip.preview_path, 7 * 24 * 3600)

    if (signedData?.signedUrl) {
      await supabase
        .from('clip_outputs')
        .update({ preview_url: signedData.signedUrl })
        .eq('id', id)
      return NextResponse.json({ ...clip, preview_url: signedData.signedUrl })
    }
  }

  return NextResponse.json(clip)
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Reset to pending to trigger re-render
  const { data, error } = await supabase
    .from('clip_outputs')
    .update({
      render_status: 'pending',
      preview_url: null,
      preview_path: null,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, render_status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, ...data })
}
