import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/transcript/[id] — get transcript for a media asset
// [id] can be either transcript.id or media_asset.id
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Try by transcript id first, then by media_asset_id
  let { data, error } = await supabase
    .from('transcripts')
    .select('id, full_text, language, model_name, word_count, duration_sec, segments, word_timings, created_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!data) {
    // Try by media_asset_id
    const res = await supabase
      .from('transcripts')
      .select('id, full_text, language, model_name, word_count, duration_sec, segments, word_timings, created_at')
      .eq('media_asset_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    data = res.data
    error = res.error
  }

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
