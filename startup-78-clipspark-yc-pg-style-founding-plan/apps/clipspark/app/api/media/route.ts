import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/media — list user's assets
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('media_assets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/media — create asset record
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { title, source_type, source_url, file_name, file_size_bytes, mime_type, duration_sec } = body

  if (!source_type || !['upload', 'url_import'].includes(source_type)) {
    return NextResponse.json({ error: 'Invalid source_type' }, { status: 400 })
  }
  if (source_type === 'url_import' && !source_url) {
    return NextResponse.json({ error: 'source_url required for url_import' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('media_assets')
    .insert({
      user_id: user.id,
      title: title || (source_type === 'url_import' ? 'URL Import' : file_name || 'Untitled'),
      source_type,
      source_url: source_url || null,
      file_name: file_name || null,
      file_size_bytes: file_size_bytes || null,
      mime_type: mime_type || null,
      duration_sec: duration_sec || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
